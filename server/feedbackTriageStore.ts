import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type TriageStatus = "open" | "in_review" | "resolved";
export type FeedbackTriageItem = {
  id: string; referenceId: string; message: string; createdAt: string;
  status: TriageStatus; version: number; note: string | null; reviewedAt: string | null;
};
export class FeedbackTriageError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number) { super(code); }
}

export async function migrateFeedbackTriage(pool: Pick<Pool,"query">) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback_triage (
      feedback_id uuid PRIMARY KEY REFERENCES feedback_submissions(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved')),
      version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
      note text CHECK (note IS NULL OR char_length(note) <= 500),
      reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS feedback_triage_events (
      id uuid PRIMARY KEY,
      feedback_id uuid NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
      actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status text NOT NULL CHECK (status IN ('open','in_review','resolved')),
      version integer NOT NULL,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS feedback_triage_events_feedback_idx ON feedback_triage_events(feedback_id,created_at);
  `);
}
function mapItem(row: any): FeedbackTriageItem {
  return {
    id: row.id, referenceId: `FB-${row.id}`, message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    status: (row.status ?? "open") as TriageStatus, version: Number(row.version ?? 0),
    note: row.note ?? null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
  };
}
export class PostgresFeedbackTriageRepository {
  constructor(private readonly pool: Pool) {}
  async list(status?: TriageStatus) {
    const { rows } = await this.pool.query(`
      SELECT f.id,f.message,f.created_at,COALESCE(t.status,'open') AS status,
        COALESCE(t.version,0) AS version,t.note,t.reviewed_at
      FROM feedback_submissions f
      LEFT JOIN feedback_triage t ON t.feedback_id=f.id
      WHERE f.category='problem' AND ($1::text IS NULL OR COALESCE(t.status,'open')=$1)
      ORDER BY f.created_at DESC,f.id DESC LIMIT 100
    `, [status ?? null]);
    return rows.map(mapItem);
  }
  async update(feedbackId: string, adminId: string, status: TriageStatus, expectedVersion: number, note?: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        "SELECT id FROM feedback_submissions WHERE id=$1 AND category='problem' FOR UPDATE", [feedbackId]);
      if (!found.rows[0]) throw new FeedbackTriageError("FEEDBACK_NOT_FOUND",404);
      const current = await client.query("SELECT version FROM feedback_triage WHERE feedback_id=$1 FOR UPDATE", [feedbackId]);
      if (Number(current.rows[0]?.version ?? 0) !== expectedVersion)
        throw new FeedbackTriageError("FEEDBACK_VERSION_CONFLICT",409);
      const nextVersion = expectedVersion + 1;
      await client.query(`
        INSERT INTO feedback_triage(feedback_id,status,version,note,reviewed_by,reviewed_at)
        VALUES($1,$2,$3,$4,$5,now())
        ON CONFLICT (feedback_id) DO UPDATE SET
          status=EXCLUDED.status,version=EXCLUDED.version,note=EXCLUDED.note,
          reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now(),updated_at=now()
      `, [feedbackId,status,nextVersion,note ?? null,adminId]);
      await client.query(`
        INSERT INTO feedback_triage_events(id,feedback_id,actor_id,status,version,note)
        VALUES($1,$2,$3,$4,$5,$6)
      `, [randomUUID(),feedbackId,adminId,status,nextVersion,note ?? null]);
      const saved = await client.query(`
        SELECT f.id,f.message,f.created_at,t.status,t.version,t.note,t.reviewed_at
        FROM feedback_submissions f JOIN feedback_triage t ON t.feedback_id=f.id
        WHERE f.id=$1
      `, [feedbackId]);
      await client.query("COMMIT");
      return mapItem(saved.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}
