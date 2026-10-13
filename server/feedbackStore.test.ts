import { describe, expect, it, vi } from "vitest";
import { migrateFeedback } from "./feedbackStore.js";

describe("feedback migration", () => {
  it("creates only the database-backed inbox fields and idempotency constraint", async () => {
    const statements: string[] = [];
    const query = vi.fn(async (sql: string) => { statements.push(sql); return { rows: [] }; });
    await migrateFeedback({ query } as any);
    const sql = statements[0] ?? "";
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS feedback_submissions");
    expect(sql).toContain("UNIQUE(parent_id, client_request_id)");
    expect(sql).toContain("CHECK (char_length(message) BETWEEN 10 AND 2000)");
    expect(sql).not.toMatch(/delivery|email(?:ed)?_at|smtp/iu);
  });
});
