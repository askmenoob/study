import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  FeedbackRateLimitError,
  FeedbackRequestConflictError,
  PostgresFeedbackRepository,
  migrateFeedback,
  type FeedbackInput,
} from "./feedbackStore.js";

const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("feedback storage against disposable PostgreSQL", () => {
  const schema = `feedback_qa_${randomUUID().replaceAll("-", "")}`;
  const parentId = randomUUID();
  let admin: Pool;
  let pool: Pool;
  let closeDb: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !url.pathname.startsWith("/exam_qa") || url.searchParams.has("options")) {
      throw new Error("Dedicated loopback exam_qa database without search-path options required");
    }
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options", `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.toString();
    const database = await import("./db.js");
    closeDb = database.closeDb;
    await database.migrate();
    await database.migrate();
    pool = new Pool({ connectionString: url.toString() });
    await migrateFeedback(pool);
    await migrateFeedback(pool);
    await pool.query(
      `INSERT INTO users(id,email,password_hash,display_name)
       VALUES($1,'feedback-parent@example.test','unused','Feedback Parent')`,
      [parentId],
    );
  });

  afterAll(async () => {
    if (pool) await pool.end();
    if (closeDb) await closeDb();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });

  it("adds constrained parent/super-admin roles without changing the parent default", async () => {
    expect((await pool.query("SELECT role FROM users WHERE id=$1", [parentId])).rows[0].role).toBe("parent");
    await expect(pool.query("UPDATE users SET role='unknown' WHERE id=$1", [parentId])).rejects.toMatchObject({ code: "23514" });
    await pool.query("UPDATE users SET role='super_admin' WHERE id=$1", [parentId]);
    expect((await pool.query("SELECT role FROM users WHERE id=$1", [parentId])).rows[0].role).toBe("super_admin");
    await pool.query("UPDATE users SET role='parent' WHERE id=$1", [parentId]);
  });

  it("persists idempotently and rejects changed request-id reuse", async () => {
    const repository = new PostgresFeedbackRepository(pool);
    const input: FeedbackInput = {
      clientRequestId: randomUUID(), category: "suggestion", message: "Cadangan integration yang selamat.",
      pagePath: "/settings", allowReply: true,
    };
    const created = await repository.createOrGet(parentId, input);
    expect(created.created).toBe(true);
    expect((await repository.createOrGet(parentId, input))).toMatchObject({ created: false, feedback: { id: created.feedback.id } });
    await expect(repository.createOrGet(parentId, { ...input, message: "Mesej lain dengan id sama." })).rejects.toBeInstanceOf(FeedbackRequestConflictError);

    expect((await repository.list(10))[0]).toMatchObject({ id: created.feedback.id, parentEmail: "feedback-parent@example.test" });
  });

  it("enforces the persisted per-account submission limit", async () => {
    const repository = new PostgresFeedbackRepository(pool);
    for (let index = 0; index < 4; index++) {
      await repository.createOrGet(parentId, {
        clientRequestId: randomUUID(), category: "other", message: `Maklum balas tambahan bernombor ${index}.`, allowReply: false,
      });
    }
    await expect(repository.createOrGet(parentId, {
      clientRequestId: randomUUID(), category: "other", message: "Maklum balas yang melebihi had sejam.", allowReply: false,
    })).rejects.toBeInstanceOf(FeedbackRateLimitError);
  });
});
