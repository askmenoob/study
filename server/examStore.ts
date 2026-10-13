import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ExamCatalogue, ExamMode, ExamPrivatePaper } from "./examContracts.js";
import { accessError, assertSession, assertStudentScope, type FamilySession } from "./familyAccess.js";
import { canLearn, focusStatus } from "./focusSessions.js";
import { attemptSummary, createSnapshot, makeAttempt, mutateAttempt, paperSummary, presentAttempt, publicationFor, retrySnapshot, type ExamMutation, type ExamStoredAttempt } from "./examDomain.js";

export async function migrateExams(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      client_attempt_id uuid NOT NULL,
      request_fingerprint text NOT NULL,
      snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
      state jsonb NOT NULL CHECK (jsonb_typeof(state)='object'),
      mode text NOT NULL CHECK (mode IN ('guided','simulation')),
      status text NOT NULL CHECK (status IN ('draft','submitted')),
      revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
      started_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      ends_at timestamptz,
      submitted_at timestamptz,
      retry_of_attempt_id uuid REFERENCES exam_attempts(id) ON DELETE SET NULL,
      UNIQUE(student_id, client_attempt_id),
      CHECK ((mode='guided' AND ends_at IS NULL) OR (mode='simulation' AND ends_at>started_at)),
      CHECK ((status='draft' AND submitted_at IS NULL) OR (status='submitted' AND submitted_at IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS exam_attempts_student_updated_idx ON exam_attempts(student_id,updated_at DESC);
    CREATE INDEX IF NOT EXISTS exam_attempts_active_student_idx ON exam_attempts(student_id) WHERE status='draft';
    CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_one_retry_idx ON exam_attempts(retry_of_attempt_id) WHERE retry_of_attempt_id IS NOT NULL;
    CREATE OR REPLACE FUNCTION exam_preserve_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
        OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.client_attempt_id IS DISTINCT FROM OLD.client_attempt_id
        OR NEW.mode IS DISTINCT FROM OLD.mode OR NEW.started_at IS DISTINCT FROM OLD.started_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
      THEN RAISE EXCEPTION 'IMMUTABLE_EXAM_ATTEMPT'; END IF;
      RETURN NEW;
    END $$;
    CREATE OR REPLACE TRIGGER exam_preserve_snapshot_trigger BEFORE UPDATE ON exam_attempts
      FOR EACH ROW EXECUTE FUNCTION exam_preserve_snapshot();
  `);
}
export interface CreateExamInput {
  studentId: string; paperId: string; paperVersion: number; mode: ExamMode; clientAttemptId: string; retryOfAttemptId?: string;
}
const iso = (date: Date | string | null) => date === null ? null : new Date(date).toISOString();
function decode(row: any): ExamStoredAttempt {
  return { id: row.id, studentId: row.student_id, clientAttemptId: row.client_attempt_id,
    snapshot: row.snapshot, state: row.state, mode: row.mode, status: row.status, revision: row.revision,
    startedAt: iso(row.started_at)!, updatedAt: iso(row.updated_at)!, endsAt: iso(row.ends_at), submittedAt: iso(row.submitted_at), retryOfAttemptId: row.retry_of_attempt_id };
}

export class ExamService {
  constructor(private readonly pool: Pool, private readonly papers: ExamPrivatePaper[], private readonly preview = false, private readonly clock?: () => number) {}
  private async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='5s'");
      const value = await action(client);
      await client.query("COMMIT");
      return value;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  private async now(client: PoolClient) {
    return this.clock ? this.clock() : new Date((await client.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime();
  }
  private async focus(client: PoolClient, user: FamilySession) {
    assertSession(user);
    if (user.role !== "student" || !user.focusSessionId) return;
    // Recheck after the attempt row lock. A request that waited past expiry cannot write.
    // The shared lock also serializes with parent revocation until this transaction commits.
    const { rows } = await client.query("SELECT f.status,f.ends_at FROM focus_sessions f JOIN students s ON s.id=f.student_id WHERE f.id=$1 AND f.student_id=$2 AND s.parent_id=$3 FOR SHARE OF f", [user.focusSessionId, user.studentId, user.sub]);
    const now = await this.now(client);
    if (!rows[0] || !canLearn(focusStatus(rows[0].status, rows[0].ends_at, now))) throw accessError("SESSION_ENDED", 401);
  }
  private async student(client: PoolClient, user: FamilySession, studentId: string) {
    assertSession(user); assertStudentScope(user, studentId);
    const { rows } = await client.query("SELECT id,level_id FROM students WHERE id=$1 AND parent_id=$2 FOR KEY SHARE", [studentId, user.sub]);
    if (!rows[0]) throw accessError("STUDENT_NOT_FOUND", 404);
    return rows[0] as { id: string; level_id: string };
  }
  private available(row: ExamStoredAttempt) {
    if (row.snapshot.publication === "preview" && !this.preview) throw accessError("PAPER_UNAVAILABLE", 404);
  }
  private async attempt(client: PoolClient, user: FamilySession, id: string, lock: boolean) {
    assertSession(user);
    const { rows } = await client.query(`SELECT e.* FROM exam_attempts e JOIN students s ON s.id=e.student_id WHERE e.id=$1 AND s.parent_id=$2 ${lock ? "FOR UPDATE OF e" : ""}`, [id, user.sub]);
    if (!rows[0]) throw accessError("ATTEMPT_NOT_FOUND", 404);
    assertStudentScope(user, rows[0].student_id);
    const result = decode(rows[0]); this.available(result); return result;
  }
  async catalogue(user: FamilySession, studentId: string): Promise<ExamCatalogue> {
    return this.transaction(async client => {
      const student = await this.student(client, user, studentId);
      await this.focus(client, user);
      const papers = this.papers.filter(p => p.levelIds.includes(student.level_id as any) && publicationFor(p, this.preview)).map(p => paperSummary(createSnapshot(p, this.preview)));
      const { rows } = await client.query("SELECT * FROM exam_attempts WHERE student_id=$1 ORDER BY updated_at DESC,id DESC LIMIT 50", [studentId]);
      const attempts = rows.map(decode).filter(row => this.preview || row.snapshot.publication === "published").map(attemptSummary);
      return { papers, attempts, preview: this.preview, coverageNotice: this.preview
        ? "Preview bahan original. Belum disemak pendidik; bukan kertas peperiksaan tahun lepas, simulasi penuh atau gred rasmi."
        : "Hanya pack dengan bukti hak penggunaan dan semakan kandungan diluluskan tersedia. Liputan mengikut pack; bukan dakwaan silibus lengkap." };
    });
  }
  async create(user: FamilySession, input: CreateExamInput) {
    const fingerprint = createHash("sha256").update(JSON.stringify([input.paperId, input.paperVersion, input.mode, input.retryOfAttemptId ?? null])).digest("hex");
    return this.transaction(async client => {
      const student = await this.student(client, user, input.studentId);
      // Serialize creation per student: both idempotency and the active-draft cap are atomic.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`exam-create:${input.studentId}`]);
      const existing = await client.query("SELECT * FROM exam_attempts WHERE student_id=$1 AND client_attempt_id=$2", [input.studentId, input.clientAttemptId]);
      if (existing.rows[0]) {
        await this.focus(client, user);
        if (existing.rows[0].request_fingerprint !== fingerprint) throw accessError("REQUEST_KEY_CONFLICT", 409);
        const row = decode(existing.rows[0]); this.available(row); return presentAttempt(row);
      }
      let snapshot;
      if (input.retryOfAttemptId) {
        if (input.mode !== "guided") throw accessError("SIMULATION_NO_HINTS", 409);
        // Match the mutation lock order: attempt first, then focus. Each parent has
        // one authored alternative set; another request must resume that same set.
        const parent = await this.attempt(client, user, input.retryOfAttemptId, true);
        if (parent.studentId !== input.studentId || parent.snapshot.paper.id !== input.paperId || parent.snapshot.paper.version !== input.paperVersion) throw accessError("PAPER_UNAVAILABLE", 404);
        const retry = await client.query("SELECT id FROM exam_attempts WHERE retry_of_attempt_id=$1", [parent.id]);
        if (retry.rows.length) throw accessError("RETRY_ALREADY_EXISTS", 409);
        snapshot = retrySnapshot(parent);
      } else {
        const matches = this.papers.filter(p => p.id === input.paperId && p.version === input.paperVersion);
        if (matches.length !== 1) throw accessError("PAPER_UNAVAILABLE", 404);
        snapshot = createSnapshot(matches[0], this.preview);
      }
      if (!snapshot.paper.levelIds.includes(student.level_id as any)) throw accessError("PAPER_UNAVAILABLE", 404);
      const active = await client.query("SELECT id FROM exam_attempts WHERE student_id=$1 AND status='draft' LIMIT 100", [input.studentId]);
      if (active.rows.length >= 100) throw accessError("ATTEMPT_LIMIT_REACHED", 409);
      // Read the authoritative clock only after all potentially waiting locks.
      await this.focus(client, user); const now = await this.now(client);
      const row = makeAttempt(snapshot, { id: randomUUID(), studentId: input.studentId, clientAttemptId: input.clientAttemptId, mode: input.mode, retryOfAttemptId: input.retryOfAttemptId ?? null }, now);
      await client.query(`INSERT INTO exam_attempts(id,student_id,client_attempt_id,request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at,retry_of_attempt_id)
        VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [row.id, row.studentId, row.clientAttemptId, fingerprint, JSON.stringify(row.snapshot), JSON.stringify(row.state), row.mode, row.status, row.revision, row.startedAt, row.updatedAt, row.endsAt, row.submittedAt, row.retryOfAttemptId]);
      return presentAttempt(row);
    });
  }
  async get(user: FamilySession, id: string) {
    return this.transaction(async client => {
      const row = await this.attempt(client, user, id, false);
      await this.focus(client, user);
      return presentAttempt(row);
    });
  }
  async mutate(user: FamilySession, id: string, mutation: ExamMutation) {
    return this.transaction(async client => {
      const row = await this.attempt(client, user, id, true);
      await this.focus(client, user); const now = await this.now(client);
      const updated = mutateAttempt(row, mutation, now);
      if (updated !== row) await client.query("UPDATE exam_attempts SET state=$1::jsonb,status=$2,revision=$3,updated_at=$4,submitted_at=$5 WHERE id=$6", [JSON.stringify(updated.state), updated.status, updated.revision, updated.updatedAt, updated.submittedAt, updated.id]);
      return presentAttempt(updated);
    });
  }
}
