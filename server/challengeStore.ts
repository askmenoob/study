import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ChallengeGenerationInput, ChallengeGenerationResult, ChallengeGenerator, ChallengeHistory, ChallengeLeaderboard, ChallengeOverview, ChallengeParentReport, ChallengeSession, ChallengeSubjectProgress } from "./challengeContracts.js";
import { accessError, assertParent, assertSession, assertStudentScope, type FamilySession } from "./familyAccess.js";
import { canLearn, focusStatus } from "./focusSessions.js";
import { malaysiaWeek, mutateChallenge, presentChallenge, rankingAlias, validateSnapshot, type ChallengeMutation, type StoredChallenge } from "./challengeDomain.js";

export interface ChallengeSubject { levelId: string; levelName: string; subjectId: string; subjectName: string }
export async function migrateChallenges(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS challenge_sessions (
      id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      level_id text NOT NULL, subject_id text NOT NULL, stage integer NOT NULL CHECK(stage>=1),
      snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
      status text NOT NULL CHECK(status IN ('active','completed')), revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
      created_at timestamptz NOT NULL, completed_at timestamptz,
      ranking_points integer NOT NULL DEFAULT 0 CHECK(ranking_points>=0),
      CHECK((status='active' AND completed_at IS NULL) OR (status='completed' AND completed_at IS NOT NULL))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS challenge_one_active_idx ON challenge_sessions(student_id,level_id,subject_id) WHERE status='active';
    CREATE INDEX IF NOT EXISTS challenge_history_idx ON challenge_sessions(student_id,level_id,subject_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_ranking_idx ON challenge_sessions(level_id,subject_id,completed_at) WHERE status='completed';
    CREATE TABLE IF NOT EXISTS challenge_requests (
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, request_id uuid NOT NULL,
      fingerprint text NOT NULL, session_id uuid NOT NULL REFERENCES challenge_sessions(id) ON DELETE CASCADE,
      response jsonb, PRIMARY KEY(student_id,request_id)
    );
    CREATE TABLE IF NOT EXISTS challenge_history (
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, level_id text NOT NULL, subject_id text NOT NULL,
      fingerprint text NOT NULL, topic_id text NOT NULL, answered integer NOT NULL CHECK(answered>0), correct integer NOT NULL CHECK(correct>=0 AND correct<=answered),
      last_correct boolean NOT NULL, last_answered_at timestamptz NOT NULL, ranking_awarded boolean NOT NULL DEFAULT false,
      PRIMARY KEY(student_id,level_id,subject_id,fingerprint)
    );
    CREATE OR REPLACE FUNCTION challenge_preserve_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.level_id IS DISTINCT FROM OLD.level_id
        OR NEW.subject_id IS DISTINCT FROM OLD.subject_id OR NEW.stage IS DISTINCT FROM OLD.stage OR NEW.created_at IS DISTINCT FROM OLD.created_at
      THEN RAISE EXCEPTION 'IMMUTABLE_CHALLENGE_SNAPSHOT'; END IF;
      RETURN NEW;
    END $$;
    CREATE OR REPLACE TRIGGER challenge_preserve_snapshot_trigger BEFORE UPDATE ON challenge_sessions FOR EACH ROW EXECUTE FUNCTION challenge_preserve_snapshot();
  `);
}
const iso = (value: Date | string) => new Date(value).toISOString();
function decode(row: any): StoredChallenge {
  return { id: row.id, studentId: row.student_id, levelId: row.level_id, subjectId: row.subject_id, stage: row.stage,
    snapshot: row.snapshot, state: row.state, status: row.status, revision: row.revision, createdAt: iso(row.created_at), completedAt: row.completed_at ? iso(row.completed_at) : null };
}
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export class ChallengeService {
  constructor(private readonly pool: Pool, private readonly generator: ChallengeGenerator, private readonly subjects: ChallengeSubject[], private readonly clock?: () => number) {}
  private async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout='5s'"); const result = await fn(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  private async now(client: PoolClient) { return this.clock ? this.clock() : new Date((await client.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime(); }
  private async student(client: PoolClient, user: FamilySession, id: string, write = false) {
    assertSession(user); assertStudentScope(user,id);
    // The shared student lock prevents a grade/owner change while this request commits.
    const result = await client.query("SELECT id,level_id FROM students WHERE id=$1 AND parent_id=$2 FOR SHARE",[id,user.sub]);
    if (!result.rows[0]) throw accessError("STUDENT_NOT_FOUND",404);
    if (write) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`challenge:${id}`]);
    return result.rows[0] as { id: string; level_id: string };
  }
  private async focus(client: PoolClient, user: FamilySession) {
    if (user.role !== "student" || !user.focusSessionId) return;
    const result = await client.query("SELECT f.status,f.ends_at FROM focus_sessions f JOIN students s ON s.id=f.student_id WHERE f.id=$1 AND f.student_id=$2 AND s.parent_id=$3 FOR SHARE OF f",[user.focusSessionId,user.studentId,user.sub]);
    if (!result.rows[0] || !canLearn(focusStatus(result.rows[0].status,result.rows[0].ends_at,await this.now(client)))) throw accessError("SESSION_ENDED",401);
  }
  private subject(levelId: string, subjectId: string) {
    if (!this.subjects.some(s => s.levelId === levelId && s.subjectId === subjectId)) throw accessError("SUBJECT_UNAVAILABLE",404);
  }
  private async session(client: PoolClient, user: FamilySession, id: string, write = false) {
    assertSession(user);
    const found = await client.query("SELECT c.* FROM challenge_sessions c JOIN students s ON s.id=c.student_id WHERE c.id=$1 AND s.parent_id=$2",[id,user.sub]);
    if (!found.rows[0]) throw accessError("CHALLENGE_NOT_FOUND",404);
    const student = await this.student(client,user,found.rows[0].student_id,write);
    // Reread after serialization so a waiting writer observes the committed revision.
    const fresh = write ? (await client.query("SELECT * FROM challenge_sessions WHERE id=$1 FOR UPDATE",[id])).rows[0] : found.rows[0];
    if (fresh.level_id !== student.level_id) throw accessError("CHALLENGE_LEVEL_CHANGED",409);
    return decode(fresh);
  }
  private async history(client: PoolClient, studentId: string, levelId: string, subjectId: string): Promise<ChallengeHistory[]> {
    const { rows } = await client.query("SELECT * FROM challenge_history WHERE student_id=$1 AND level_id=$2 AND subject_id=$3 ORDER BY fingerprint",[studentId,levelId,subjectId]);
    return rows.map(r => ({ fingerprint: r.fingerprint, topicId: r.topic_id, answered: r.answered, correct: r.correct, lastCorrect: r.last_correct, lastAnsweredAt: iso(r.last_answered_at), rankingAwarded: r.ranking_awarded }));
  }
  private async stage(client: PoolClient, studentId: string, levelId: string, subjectId: string) {
    const { rows } = await client.query("SELECT * FROM challenge_sessions WHERE student_id=$1 AND level_id=$2 AND subject_id=$3 AND status='completed' ORDER BY stage DESC,completed_at DESC LIMIT 1",[studentId,levelId,subjectId]);
    return rows[0] ? presentChallenge(decode(rows[0])).result!.nextStage : 1;
  }
  private async replay(client: PoolClient, studentId: string, requestId: string, hash: string) {
    const result = await client.query("SELECT * FROM challenge_requests WHERE student_id=$1 AND request_id=$2",[studentId,requestId]);
    if (result.rows[0] && result.rows[0].fingerprint !== hash) throw accessError("REQUEST_KEY_CONFLICT",409);
    return result.rows[0];
  }
  private async record(client: PoolClient, studentId: string, requestId: string, hash: string, sessionId: string, response?: ChallengeSession) {
    await client.query("INSERT INTO challenge_requests(student_id,request_id,fingerprint,session_id,response) VALUES($1,$2,$3,$4,$5::jsonb)",[studentId,requestId,hash,sessionId,response ? JSON.stringify(response) : null]);
  }
  async create(user: FamilySession, input: { studentId: string; subjectId: string; requestId: string }): Promise<ChallengeSession> {
    const hash = fingerprint(["create",input.subjectId]);
    type Preparation = { session: ChallengeSession } | { input: ChallengeGenerationInput; token: string };
    const prepare = async (client: PoolClient): Promise<Preparation> => {
      const student = await this.student(client,user,input.studentId,true); this.subject(student.level_id,input.subjectId);
      await this.focus(client,user);
      const replay = await this.replay(client,input.studentId,input.requestId,hash);
      if (replay) return { session: presentChallenge(await this.session(client,user,replay.session_id)) };
      const active = await client.query("SELECT * FROM challenge_sessions WHERE student_id=$1 AND level_id=$2 AND subject_id=$3 AND status='active'",[input.studentId,student.level_id,input.subjectId]);
      if (active.rows[0]) { const row = decode(active.rows[0]); await this.record(client,input.studentId,input.requestId,hash,row.id); return { session: presentChallenge(row) }; }
      const history = await this.history(client,input.studentId,student.level_id,input.subjectId), stage = await this.stage(client,input.studentId,student.level_id,input.subjectId);
      const generation = { levelId: student.level_id, subjectId: input.subjectId, stage, seed: input.requestId, history };
      return { input: generation, token: fingerprint(generation) };
    };
    for (let retry = 0; retry < 3; retry++) {
      const prepared = await this.transaction(prepare); if ("session" in prepared) return prepared.session;
      // No database locks or connections are held while remote generation runs.
      const snapshot: ChallengeGenerationResult = await this.generator(prepared.input); validateSnapshot(snapshot);
      const committed = await this.transaction(async client => {
        const fresh = await prepare(client); if ("session" in fresh) return fresh.session;
        if (fresh.token !== prepared.token) return null;
        await this.focus(client,user);
        const row: StoredChallenge = { id: randomUUID(), studentId: input.studentId, levelId: fresh.input.levelId, subjectId: input.subjectId, stage: fresh.input.stage,
          snapshot, state: { answers: Array(snapshot.questions.length).fill(null), hints: Array(snapshot.questions.length).fill(false) }, status: "active", revision: 0, createdAt: new Date(await this.now(client)).toISOString(), completedAt: null };
        await client.query(`INSERT INTO challenge_sessions(id,student_id,level_id,subject_id,stage,snapshot,state,status,revision,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)`,[row.id,row.studentId,row.levelId,row.subjectId,row.stage,JSON.stringify(snapshot),JSON.stringify(row.state),row.status,row.revision,row.createdAt]);
        await this.record(client,input.studentId,input.requestId,hash,row.id); return presentChallenge(row);
      });
      if (committed) return committed;
    }
    throw accessError("CHALLENGE_CONTEXT_CHANGED",409);
  }
  async get(user: FamilySession, id: string) { return this.transaction(async client => { const row = await this.session(client,user,id); await this.focus(client,user); return presentChallenge(row); }); }
  async mutate(user: FamilySession, id: string, mutation: ChallengeMutation) {
    return this.transaction(async client => {
      const row = await this.session(client,user,id,true); await this.focus(client,user);
      const hash = fingerprint([id,mutation.kind,mutation.expectedRevision,mutation.index,mutation.kind === "answer" ? mutation.selected : null]);
      const replay = await this.replay(client,row.studentId,mutation.requestId,hash); if (replay) return replay.response as ChallengeSession;
      const q = row.snapshot.questions[mutation.index];
      const history = q ? (await this.history(client,row.studentId,row.levelId,row.subjectId)).find(h => h.fingerprint === q.fingerprint) : undefined;
      const next = mutateChallenge(row,mutation,history,await this.now(client));
      if (mutation.kind === "answer") {
        const a = next.state.answers[mutation.index]!;
        await client.query(`INSERT INTO challenge_history(student_id,level_id,subject_id,fingerprint,topic_id,answered,correct,last_correct,last_answered_at,ranking_awarded)
          VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9) ON CONFLICT(student_id,level_id,subject_id,fingerprint) DO UPDATE SET
          answered=challenge_history.answered+1,correct=challenge_history.correct+EXCLUDED.correct,last_correct=EXCLUDED.last_correct,
          last_answered_at=EXCLUDED.last_answered_at,ranking_awarded=challenge_history.ranking_awarded OR EXCLUDED.ranking_awarded`,
        [row.studentId,row.levelId,row.subjectId,q.fingerprint,q.topicId,a.correct ? 1 : 0,a.correct,a.answeredAt,a.points > 0]);
      }
      const response = presentChallenge(next);
      if (next !== row) await client.query("UPDATE challenge_sessions SET state=$1::jsonb,status=$2,revision=$3,completed_at=$4,ranking_points=$5 WHERE id=$6",[JSON.stringify(next.state),next.status,next.revision,next.completedAt,response.result?.rankingPoints ?? 0,id]);
      await this.record(client,row.studentId,mutation.requestId,hash,id,response); return response;
    });
  }
  private progress(rows: StoredChallenge[], levelId: string): ChallengeSubjectProgress[] {
    return this.subjects.filter(s => s.levelId === levelId).map(subject => {
      const sessions = rows.filter(r => r.subjectId === subject.subjectId), views = sessions.map(presentChallenge), completed = views.filter(s => s.status === "completed");
      const answered = views.reduce((n,s) => n+s.answeredCount,0), correct = views.reduce((n,s) => n+s.correctCount,0), active = views.find(s => s.status === "active");
      return { subjectId: subject.subjectId, subjectName: subject.subjectName, stage: Math.max(1,...completed.map(s => s.result!.nextStage)), completedSessions: completed.length, answered, accuracy: answered ? correct / answered * 100 : 0, ...(active ? { activeSessionId: active.id } : {}) };
    });
  }
  async overview(user: FamilySession, studentId: string): Promise<ChallengeOverview> {
    return this.transaction(async client => {
      const student = await this.student(client,user,studentId); await this.focus(client,user);
      const { rows } = await client.query("SELECT * FROM challenge_sessions WHERE student_id=$1 AND level_id=$2 ORDER BY created_at DESC",[studentId,student.level_id]);
      return { studentId, levelId: student.level_id, subjects: this.progress(rows.map(decode),student.level_id) };
    });
  }
  async ranking(user: FamilySession, studentId: string, subjectId: string): Promise<ChallengeLeaderboard> {
    return this.transaction(async client => {
      const student = await this.student(client,user,studentId); this.subject(student.level_id,subjectId); await this.focus(client,user);
      const week = malaysiaWeek(await this.now(client));
      const { rows } = await client.query(`WITH daily AS (
        SELECT c.student_id,c.ranking_points,row_number() OVER(PARTITION BY c.student_id,(c.completed_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date ORDER BY c.ranking_points DESC,c.id) AS position
        FROM challenge_sessions c JOIN students s ON s.id=c.student_id
        WHERE c.level_id=$1 AND s.level_id=c.level_id AND c.subject_id=$2 AND c.status='completed' AND c.completed_at>=$3 AND c.completed_at<$4
      ), totals AS (SELECT student_id,sum(ranking_points)::integer AS points,count(*)::integer AS sessions FROM daily WHERE position<=3 GROUP BY student_id)
      SELECT student_id,points,sessions,dense_rank() OVER(ORDER BY points DESC)::integer AS rank FROM totals ORDER BY points DESC,student_id`,[student.level_id,subjectId,week.weekStart,week.weekEnd]);
      const mine = rows.find(r => r.student_id === studentId);
      return { levelId: student.level_id, subjectId, ...week, dailySessionLimit: 3, yourPoints: mine?.points ?? 0,
        rows: rows.slice(0,100).map(r => ({ rank: r.rank, alias: rankingAlias(r.student_id,week.weekStart), points: r.points, sessions: r.sessions, isYou: r.student_id === studentId })) };
    });
  }
  async report(user: FamilySession, studentId: string): Promise<ChallengeParentReport> {
    assertSession(user); assertParent(user);
    return this.transaction(async client => {
      const student = await this.student(client,user,studentId);
      const { rows } = await client.query("SELECT * FROM challenge_sessions WHERE student_id=$1 AND level_id=$2 ORDER BY created_at DESC",[studentId,student.level_id]);
      const stored = rows.map(decode), views = stored.map(presentChallenge), progress = this.progress(stored,student.level_id);
      return { studentId, levelId: student.level_id, completedSessions: views.filter(v => v.status === "completed").length, answered: views.reduce((n,v) => n+v.answeredCount,0), correct: views.reduce((n,v) => n+v.correctCount,0), hintsUsed: views.reduce((n,v) => n+v.hintCount,0),
        subjects: progress.map(p => {
          const sessions = stored.filter(s => s.subjectId === p.subjectId), topics = new Map<string,{ topicId: string; topicName: string; answered: number; correct: number; mastery: number; repeatedErrors: number }>(), wrong = new Map<string,number>();
          for (const s of sessions) s.snapshot.questions.forEach((q,i) => {
            const a = s.state.answers[i]; if (!a) return;
            const t = topics.get(q.topicId) ?? { topicId: q.topicId, topicName: q.topicName, answered: 0, correct: 0, mastery: 0, repeatedErrors: 0 };
            t.answered++; t.correct += a.correct ? 1 : 0;
            if (!a.correct) { const count = wrong.get(q.fingerprint) ?? 0; if (count > 0) t.repeatedErrors++; wrong.set(q.fingerprint,count+1); }
            t.mastery = t.correct / t.answered * 100; topics.set(q.topicId,t);
          });
          return { ...p, hintsUsed: sessions.reduce((n,s) => n+s.state.hints.filter(Boolean).length,0), topics: [...topics.values()] };
        }),
        recentSessions: views.filter(v => v.status === "completed").sort((a,b) => b.completedAt!.localeCompare(a.completedAt!)).slice(0,20).map(v => ({ id: v.id, subjectId: v.subjectId, stage: v.stage, total: v.total, correct: v.correctCount, completedAt: v.completedAt!, passed: v.result!.passed })),
      };
    });
  }
}
