import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { mkdtemp,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use a dedicated loopback exam_qa database. Each run creates and removes its own
// schema; the real API process runs migrations only inside that schema.
const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("practice history API against disposable PostgreSQL", () => {
  const schema = `practice_history_qa_${randomUUID().replaceAll("-", "")}`;
  const parentId = randomUUID(), otherParentId = randomUUID();
  const jwtSecret = randomUUID() + randomUUID();
  let admin: Pool, pool: Pool, api: ChildProcess;
  let created = false, base = "", output = "";
  let apiExited: Promise<void>;
  let keyDirectory="";

  function token(user: Record<string, string> = { sub: parentId, role: "parent" }) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
    const payload = `${header}.${body}`;
    return `${payload}.${createHmac("sha256", jwtSecret).update(payload).digest("base64url")}`;
  }
  async function request(studentId: string, credential: string | null = token()) {
    const response = await fetch(`${base}/api/students/${studentId}/attempts`, {
      headers: credential ? { authorization: `Bearer ${credential}` } : {},
    });
    return { status: response.status, body: await response.json() as any };
  }
  async function student(owner = parentId) {
    const id = randomUUID();
    await pool.query("INSERT INTO students(id,parent_id,name,level_id) VALUES($1,$2,'QA student','d4')", [id, owner]);
    return id;
  }
  async function attempt(studentId: string, answers: unknown, options: { id?: string; date?: string; level?: string; subject?: string; topic?: string } = {}) {
    await pool.query(`INSERT INTO attempts(id,student_id,level_id,subject_id,topic_id,score,total,answers,created_at)
      VALUES($1,$2,$3,$4,$5,0,1,$6::jsonb,$7)`,
    [options.id ?? randomUUID(), studentId, options.level ?? "d4", options.subject ?? "math", options.topic ?? "fractions", JSON.stringify(answers), options.date ?? "2026-01-01T00:00:00.000Z"]);
  }

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !url.pathname.startsWith("/exam_qa") || url.searchParams.has("options")) {
      throw new Error("Dedicated loopback exam_qa database without search-path options required");
    }
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA ${schema}`); created = true;
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    url.searchParams.set("options", `-c search_path=${schema}`);
    keyDirectory=await mkdtemp(join(tmpdir(),"practice-qa-key-"));
    const keyFile=join(keyDirectory,"key");await writeFile(keyFile,"synthetic-practice-qa-join-code-secret",{mode:0o600});
    api = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { PATH: process.env.PATH, DATABASE_URL: url.toString(), JWT_SECRET: jwtSecret,
        API_HOST: "127.0.0.1", PORT: "0", GEMINI_API_KEY: "", GEMINI_API_KEY_FILE: "", JOIN_CODE_ENCRYPTION_KEY_FILE:keyFile },
      stdio: ["ignore", "pipe", "pipe"],
    });
    apiExited = new Promise(resolve => api.once("exit", () => resolve()));
    api.stdout!.on("data", data => { output += String(data); });
    api.stderr!.on("data", data => { output += String(data); });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && api.exitCode === null) {
      const match = output.match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { base = match[1]; break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!base) throw new Error(`Isolated API did not start: ${output}`);
    await pool.query(`INSERT INTO users(id,email,password_hash,display_name) VALUES($1,'practice-qa@example.test','unused','QA parent'),($2,'other-qa@example.test','unused','Other parent')`, [parentId, otherParentId]);
  }, 20000);
  afterAll(async () => {
    if (api && api.exitCode === null) {
      api.kill("SIGTERM");
      const force = setTimeout(() => api.kill("SIGKILL"), 5000);
      await apiExited; clearTimeout(force);
    }
    if (pool) await pool.end();
    if (admin) {
      if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
    if(keyDirectory)await rm(keyDirectory,{recursive:true,force:true});
  }, 10000);

  it("retains questions older than the 1000-attempt response cap", async () => {
    const id = await student();
    await attempt(id, [{ questionId: "oldest-question", correct: true }]);
    await pool.query(`INSERT INTO attempts(id,student_id,level_id,subject_id,topic_id,score,total,answers,created_at)
      SELECT gen_random_uuid(),$1,'d4','math','fractions',1,1,
        jsonb_build_array(jsonb_build_object('questionId','fresh-' || n,'correct',true)),
        '2026-01-02'::timestamptz + n * interval '1 second' FROM generate_series(1,1001) n`, [id]);
    const { status, body } = await request(id);
    expect(status).toBe(200);
    expect(body.attempts).toHaveLength(1000);
    expect(body.attempts.flatMap((row: any) => row.answers).some((answer: any) => answer.questionId === "oldest-question")).toBe(false);
    expect(body.questionHistory).toHaveLength(1002);
    expect(body.questionHistory).toContainEqual({ levelId: "d4", subjectId: "math", topicId: "fractions", questionId: "oldest-question", correct: true, completedAt: "2026-01-01T00:00:00.000Z" });
    expect(body.attempts[0]).toHaveProperty("created_at");
  });

  it("uses the latest correct or incorrect answer with a stable timestamp and ID tie-break", async () => {
    const id = await student();
    await attempt(id, [{ questionId: "improved", correct: false }, { questionId: "regressed", correct: true }]);
    await attempt(id, [{ questionId: "improved", correct: true }, { questionId: "regressed", correct: false }], { date: "2026-02-01T00:00:00.000Z" });
    await attempt(id, [{ questionId: "tie", correct: true }], { id: "ffffffff-ffff-4fff-8fff-ffffffffffff" });
    await attempt(id, [{ questionId: "tie", correct: false }], { id: "00000000-0000-4000-8000-000000000000" });
    await attempt(id, [{ questionId: "duplicate", correct: false }, { questionId: "duplicate", correct: true }]);
    const { body } = await request(id);
    const byId = Object.fromEntries(body.questionHistory.map((entry: any) => [entry.questionId, entry]));
    expect(body.questionHistory).toHaveLength(4);
    expect(byId.improved).toMatchObject({ correct: true, completedAt: "2026-02-01T00:00:00.000Z" });
    expect(byId.regressed).toMatchObject({ correct: false, completedAt: "2026-02-01T00:00:00.000Z" });
    expect(byId.tie.correct).toBe(true);
    expect(byId.duplicate.correct).toBe(true);
    expect((await request(id)).body.questionHistory).toEqual(body.questionHistory);
  });

  it("keeps question identity scoped by level, subject and topic, and isolates students", async () => {
    const id = await student(), sibling = await student();
    await attempt(id, [{ questionId: "shared-id", correct: true }]);
    await attempt(id, [{ questionId: "shared-id", correct: false }], { level: "d5" });
    await attempt(id, [{ questionId: "shared-id", correct: false }], { subject: "science" });
    await attempt(id, [{ questionId: "shared-id", correct: false }], { topic: "decimals" });
    await attempt(sibling, [{ questionId: "sibling-only", correct: true }]);
    const { body } = await request(id);
    expect(body.questionHistory).toHaveLength(4);
    expect(body.questionHistory.map((entry: any) => [entry.levelId, entry.subjectId, entry.topicId, entry.correct])).toEqual([
      ["d4", "math", "decimals", false], ["d4", "math", "fractions", true], ["d4", "science", "fractions", false], ["d5", "math", "fractions", false],
    ]);
    const asStudent = token({ sub: parentId, role: "student", studentId: id });
    expect((await request(id, asStudent)).body.questionHistory).toEqual(body.questionHistory);
    expect((await request(sibling, asStudent)).status).toBe(403);
    expect((await request(id, null)).status).toBe(401);
    expect((await request(id, token({ sub: otherParentId, role: "parent" }))).status).toBe(404);
  });

  it("returns empty history and ignores malformed legacy answers without masking a valid answer", async () => {
    const empty = await student();
    expect((await request(empty)).body).toEqual({ attempts: [], questionHistory: [] });
    const id = await student();
    await attempt(id, [{ questionId: "valid", correct: true }]);
    for (const malformed of [null, {}, "not-an-array", 42, true, []]) await attempt(id, malformed);
    await attempt(id, [null, "bad", 8, false, [], {}, { questionId: 7, correct: true }, { questionId: "", correct: true },
      { questionId: "  ", correct: false }, { questionId: "missing-correct" }, { questionId: "null-correct", correct: null },
      { questionId: "valid", correct: "false" }, { questionId: "number-correct", correct: 1 }, { correct: true }],
    { date: "2026-03-01T00:00:00.000Z" });
    const result = await request(id);
    expect(result.status).toBe(200);
    expect(result.body.questionHistory).toEqual([{ levelId: "d4", subjectId: "math", topicId: "fractions", questionId: "valid", correct: true, completedAt: "2026-01-01T00:00:00.000Z" }]);
  });
});
