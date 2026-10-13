import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export const feedbackCategories = ["suggestion", "problem", "other"] as const;
export type FeedbackCategory = typeof feedbackCategories[number];

export type FeedbackInput = {
  clientRequestId: string;
  category: FeedbackCategory;
  message: string;
  pagePath?: string;
  allowReply: boolean;
};

export type FeedbackRecord = {
  id: string;
  parentId: string;
  parentEmail: string;
  parentDisplayName: string;
  clientRequestId: string;
  category: FeedbackCategory;
  message: string;
  pagePath?: string;
  allowReply: boolean;
  createdAt: string;
};

export type CreatedFeedback = { feedback: FeedbackRecord; created: boolean };

export interface FeedbackRepository {
  createOrGet(parentId: string, input: FeedbackInput): Promise<CreatedFeedback>;
  list(limit: number): Promise<FeedbackRecord[]>;
}

export class FeedbackRequestConflictError extends Error {
  readonly code = "FEEDBACK_REQUEST_CONFLICT";
  readonly statusCode = 409;
}

export class FeedbackRateLimitError extends Error {
  readonly code = "FEEDBACK_RATE_LIMIT";
  readonly statusCode = 429;
  readonly retryAfterSeconds = 3600;
}

export function feedbackReferenceId(id: string) {
  return `FB-${id}`;
}

export async function migrateFeedback(target: Pick<Pool, "query">) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS feedback_submissions (
      id uuid PRIMARY KEY,
      parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_request_id uuid NOT NULL,
      category text NOT NULL CHECK (category IN ('suggestion','problem','other')),
      message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
      page_path text CHECK (page_path IS NULL OR (char_length(page_path) <= 300 AND page_path LIKE '/%')),
      allow_reply boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(parent_id, client_request_id)
    );
    CREATE INDEX IF NOT EXISTS feedback_submissions_created_idx
      ON feedback_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS feedback_submissions_parent_created_idx
      ON feedback_submissions(parent_id, created_at DESC);
  `);
}

const selectedColumns = `
  SELECT f.id,f.parent_id,f.client_request_id,f.category,f.message,f.page_path,
    f.allow_reply,f.created_at,
    u.email AS parent_email,u.display_name AS parent_display_name
  FROM feedback_submissions f JOIN users u ON u.id=f.parent_id`;

function mapRow(row: any): FeedbackRecord {
  return {
    id: row.id,
    parentId: row.parent_id,
    parentEmail: row.parent_email,
    parentDisplayName: row.parent_display_name,
    clientRequestId: row.client_request_id,
    category: row.category,
    message: row.message,
    ...(row.page_path ? { pagePath: row.page_path } : {}),
    allowReply: row.allow_reply,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function sameRequest(record: FeedbackRecord, input: FeedbackInput) {
  return record.category === input.category &&
    record.message === input.message &&
    record.pagePath === input.pagePath &&
    record.allowReply === input.allowReply;
}

export class PostgresFeedbackRepository implements FeedbackRepository {
  constructor(private readonly pool: Pool) {}

  async createOrGet(parentId: string, input: FeedbackInput): Promise<CreatedFeedback> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`feedback:${parentId}`]);
      const existing = await client.query(
        `${selectedColumns} WHERE f.parent_id=$1 AND f.client_request_id=$2`,
        [parentId, input.clientRequestId],
      );
      if (existing.rows[0]) {
        const feedback = mapRow(existing.rows[0]);
        if (!sameRequest(feedback, input)) throw new FeedbackRequestConflictError();
        await client.query("COMMIT");
        return { feedback, created: false };
      }

      const identity = await client.query("SELECT email,display_name FROM users WHERE id=$1 FOR SHARE", [parentId]);
      if (!identity.rows[0]) throw Object.assign(new Error("SESSION_EXPIRED"), { code: "SESSION_EXPIRED", statusCode: 401 });
      const counts = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour')::int AS hourly,
          COUNT(*)::int AS daily
         FROM feedback_submissions
         WHERE parent_id=$1 AND created_at >= now() - interval '1 day'`,
        [parentId],
      );
      if (Number(counts.rows[0]?.hourly ?? 0) >= 5 || Number(counts.rows[0]?.daily ?? 0) >= 20) {
        throw new FeedbackRateLimitError();
      }

      const id = randomUUID();
      const saved = await client.query(
        `INSERT INTO feedback_submissions(
          id,parent_id,client_request_id,category,message,page_path,allow_reply
        ) VALUES($1,$2,$3,$4,$5,$6,$7)
        RETURNING id,parent_id,client_request_id,category,message,page_path,allow_reply,created_at`,
        [id, parentId, input.clientRequestId, input.category, input.message, input.pagePath ?? null, input.allowReply],
      );
      await client.query("COMMIT");
      return {
        created: true,
        feedback: mapRow({
          ...saved.rows[0],
          parent_email: identity.rows[0].email,
          parent_display_name: identity.rows[0].display_name,
        }),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(limit: number): Promise<FeedbackRecord[]> {
    const result = await this.pool.query(`${selectedColumns} ORDER BY f.created_at DESC,f.id DESC LIMIT $1`, [limit]);
    return result.rows.map(mapRow);
  }
}
