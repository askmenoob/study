import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { registerExamRoutes } from "./examRoutes.js";
import { migrateExams } from "./examStore.js";
import { examFixture } from "./examFixtures.js";
import { assertSession, assertStudentScope, type FamilySession } from "./familyAccess.js";
import { enforceFocusSession } from "./focusSessions.js";
import type { ExamPrivatePaper } from "./examContracts.js";

const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("exam API against disposable PostgreSQL", () => {
  let admin: Pool, pool: Pool, app: FastifyInstance;
  const apps: FastifyInstance[] = [];
  const schema = `exam_qa_${randomUUID().replaceAll("-", "")}`;
  const parentId = randomUUID(), otherParentId = randomUUID();
  const parent: FamilySession = { sub: parentId, role: "parent" };
  const papers = [examFixture()];
  async function makeApp(content: ExamPrivatePaper[] = papers, preview = true, clock?: () => number) {
    const instance = Fastify();
    await instance.register(jwt, { secret: randomUUID() + randomUUID() });
    const auth = async (req: any) => { await req.jwtVerify(); assertSession(req.user); await enforceFocusSession(pool, req.user); if (req.body?.studentId) assertStudentScope(req.user, req.body.studentId); };
    instance.setErrorHandler((err: any, _request, reply) => reply.code(err.statusCode ?? 500).send({ error: err.code ?? "SERVER_ERROR" }));
    registerExamRoutes(instance, pool, auth, { papers: content, preview, clock });
    await instance.ready(); apps.push(instance); return instance;
  }
  async function student(level = "d4", owner = parentId) {
    const id = randomUUID(); await pool.query("INSERT INTO students(id,parent_id,level_id) VALUES($1,$2,$3)", [id, owner, level]); return id;
  }
  const input = (studentId: string, changes = {}) => ({ studentId, paperId: "fixture-d4", paperVersion: 1, mode: "guided", clientAttemptId: randomUUID(), ...changes });
  async function request(method: "GET" | "POST" | "PUT", url: string, payload?: unknown, user: FamilySession | null = parent, instance = app) {
    return instance.inject({ method, url, ...(payload === undefined ? {} : { payload: payload as any }), headers: user ? { authorization: `Bearer ${instance.jwt.sign(user)}` } : {} });
  }
  async function create(studentId: string, changes = {}, instance = app) {
    const body = input(studentId, changes), response = await request("POST", "/api/exam/attempts", body, parent, instance);
    expect(response.statusCode, response.body).toBe(201); return response.json().attempt;
  }
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !url.pathname.startsWith("/exam_qa")) throw new Error("Disposable loopback exam_qa database required");
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: databaseUrl, max: 12, options: `-c search_path=${schema}` });
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);
      CREATE TABLE students(id uuid PRIMARY KEY,parent_id uuid REFERENCES users(id),level_id text NOT NULL);
      CREATE TABLE focus_sessions(id uuid PRIMARY KEY,student_id uuid REFERENCES students(id),status text NOT NULL,ends_at timestamptz NOT NULL);`);
    await pool.query("INSERT INTO users(id) VALUES($1),($2)", [parentId, otherParentId]);
    await migrateExams(pool); await migrateExams(pool);
    app = await makeApp();
  }, 20000);
  afterAll(async () => {
    await Promise.all(apps.map(a => a.close()));
    if (pool) await pool.end();
    if (admin) { await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); }
  });
  it("authenticates catalogue/get/write and enforces actual stored level and family scope", async () => {
    const own = await student(), sibling = await student(), foreign = await student("d4", otherParentId), lower = await student("d3");
    expect((await request("GET", `/api/exam/papers?studentId=${own}`, undefined, null)).statusCode).toBe(401);
    expect((await request("GET", `/api/exam/papers?studentId=${foreign}`)).statusCode).toBe(404);
    const kid: FamilySession = { sub: parentId, role: "student", studentId: own };
    expect((await request("GET", `/api/exam/papers?studentId=${sibling}`, undefined, kid)).statusCode).toBe(403);
    expect((await request("GET", `/api/exam/papers?studentId=${lower}`)).json().papers).toEqual([]);
    expect((await request("POST", "/api/exam/attempts", input(lower))).json().error).toBe("PAPER_UNAVAILABLE");
    const attempt = await create(own);
    expect((await request("GET", `/api/exam/attempts/${attempt.id}`, undefined, { sub: otherParentId, role: "parent" })).statusCode).toBe(404);
    expect((await request("GET", `/api/exam/attempts/${attempt.id}`, undefined, { ...kid, studentId: sibling })).statusCode).toBe(403);
    const catalogue = await request("GET", `/api/exam/papers?studentId=${own}`);
    expect(catalogue.body).not.toMatch(/PRIVATE_|"key"|"solution"|"rubric"/);
    expect(JSON.stringify(attempt)).not.toMatch(/PRIVATE_|"key"|"retry"/);
  });
  it("keeps pending material and its previous preview attempts unavailable by default", async () => {
    const id = await student(), attempt = await create(id), production = await makeApp(papers, false);
    expect((await request("GET", `/api/exam/papers?studentId=${id}`, undefined, parent, production)).json()).toMatchObject({ papers: [], attempts: [], preview: false });
    expect((await request("GET", `/api/exam/attempts/${attempt.id}`, undefined, parent, production)).json().error).toBe("PAPER_UNAVAILABLE");
    const unknown = examFixture(); unknown.source.rights = "unknown";
    const blocked = await makeApp([unknown]);
    expect((await request("POST", "/api/exam/attempts", input(id), parent, blocked)).json().error).toBe("PAPER_UNAVAILABLE");
  });
  it("creates one attempt for concurrent identical keys and rejects changed payloads", async () => {
    const id = await student(), body = input(id);
    const responses = await Promise.all([request("POST", "/api/exam/attempts", body), request("POST", "/api/exam/attempts", body)]);
    expect(responses.map(r => r.statusCode)).toEqual([201, 201]);
    expect(responses[0].json().attempt.id).toBe(responses[1].json().attempt.id);
    expect((await pool.query("SELECT count(*) FROM exam_attempts WHERE student_id=$1", [id])).rows[0].count).toBe("1");
    const conflict = await request("POST", "/api/exam/attempts", { ...body, mode: "simulation" });
    expect(conflict.statusCode).toBe(409); expect(conflict.json().error).toBe("REQUEST_KEY_CONFLICT");
  });
  it("serializes concurrent revisions, freezes checked answers and rejects client score tampering", async () => {
    const attempt = await create(await student()), url = `/api/exam/attempts/${attempt.id}`;
    const races = await Promise.all(["0.5", "0.25"].map(value => request("PUT", url, { expectedRevision: 0, answers: { q1: { value } } })));
    expect(races.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(races.find(r => r.statusCode === 409)!.json().error).toBe("REVISION_CONFLICT");
    expect((await request("PUT", url, { expectedRevision: 1, answers: { unknown: { value: "0.5" } } })).statusCode).toBe(400);
    expect((await request("PUT", url, { expectedRevision: 1, answers: {}, score: 100 })).statusCode).toBe(400);
    const checked = await request("POST", `${url}/check`, { expectedRevision: 1, questionId: "q1", answer: { value: "0.5" } });
    expect(checked.json().attempt).toMatchObject({ revision: 2, autoScore: 1 });
    expect(checked.json().attempt.reviews.map((r: any) => r.questionId)).toEqual(["q1"]);
    expect((await request("PUT", url, { expectedRevision: 2, answers: {} })).json().error).toBe("CHECKED_ANSWER_LOCKED");
    const anotherProcess = await makeApp();
    expect((await request("GET", url, undefined, parent, anotherProcess)).json().attempt.answers.q1.value).toBe("0.5");
  });
  it("makes submission idempotent and never trusts submitted marks", async () => {
    const attempt = await create(await student()), url = `/api/exam/attempts/${attempt.id}`;
    await request("PUT", url, { expectedRevision: 0, answers: { q1: { value: "2/4" }, q2: { value: "0.5", unit: "cm" } } });
    const responses = await Promise.all([request("POST", `${url}/submit`, { expectedRevision: 1 }), request("POST", `${url}/submit`, { expectedRevision: 1 })]);
    expect(responses.map(r => r.statusCode)).toEqual([200, 200]);
    expect(responses[0].json().attempt).toEqual(responses[1].json().attempt);
    expect(responses[0].json().attempt).toMatchObject({ status: "submitted", revision: 2, autoScore: 1, autoMarks: 2, manualScore: 0, needsSelfMark: true });
    expect((await request("PUT", url, { expectedRevision: 2, answers: {} })).json().error).toBe("ATTEMPT_SUBMITTED");
  });
  it("preserves immutable private snapshots when catalogue changes or SQL tries to replace them", async () => {
    const content = [examFixture()], instance = await makeApp(content), attempt = await create(await student(), {}, instance);
    content[0].questions[0].key.numeric = 9; content[0].questions[0].solution = ["CHANGED_CONTENT"];
    const response = await request("POST", `/api/exam/attempts/${attempt.id}/check`, { expectedRevision: 0, questionId: "q1", answer: { value: "0.5" } }, parent, instance);
    expect(response.json().attempt.autoScore).toBe(1); expect(response.body).not.toContain("CHANGED_CONTENT");
    await expect(pool.query("UPDATE exam_attempts SET snapshot='{}'::jsonb WHERE id=$1", [attempt.id])).rejects.toThrow("IMMUTABLE_EXAM_ATTEMPT");
    expect((await request("GET", `/api/exam/attempts/${attempt.id}`, undefined, parent, instance)).json().attempt.paper.questions).toHaveLength(2);
  });
  it("simulation conceals hints and scores, freezes at its deadline and submits last saved state", async () => {
    let now = Date.now(); const instance = await makeApp(papers, true, () => now);
    const attempt = await create(await student(), { mode: "simulation" }, instance), url = `/api/exam/attempts/${attempt.id}`;
    const saved = await request("PUT", url, { expectedRevision: 0, answers: { q1: { value: "0.5" } } }, parent, instance);
    expect(saved.json().attempt).toMatchObject({ reviews: [], autoScore: 0 });
    expect(saved.body).not.toContain("PRIVATE_");
    expect((await request("POST", `${url}/check`, { expectedRevision: 1, questionId: "q1", answer: { value: "0.5" } }, parent, instance)).json().error).toBe("SIMULATION_NO_HINTS");
    now = Date.parse(attempt.endsAt);
    expect((await request("PUT", url, { expectedRevision: 1, answers: { q2: { value: "0.5", unit: "m" } } }, parent, instance)).json().error).toBe("TIME_EXPIRED");
    const submitted = await request("POST", `${url}/submit`, { expectedRevision: 1 }, parent, instance);
    expect(submitted.json().attempt).toMatchObject({ autoScore: 1, status: "submitted", answers: { q1: { value: "0.5" } } });
    expect(submitted.json().attempt.answers.q2).toBeUndefined();
  });
  it("self-marks only exposed structured rubrics and retries the authored alternative", async () => {
    const id = await student(), attempt = await create(id), url = `/api/exam/attempts/${attempt.id}`;
    expect((await request("POST", `${url}/self-mark`, { expectedRevision: 0, marks: { q2: { method: true } } })).statusCode).toBe(400);
    await request("PUT", url, { expectedRevision: 0, answers: { q1: { value: "0.5" }, q2: { value: "0", unit: "m" } } });
    await request("POST", `${url}/submit`, { expectedRevision: 1 });
    expect((await request("POST", `${url}/self-mark`, { expectedRevision: 2, marks: { q2: { invented: true } } })).statusCode).toBe(400);
    expect((await request("POST", `${url}/self-mark`, { expectedRevision: 2, marks: { q2: { method: 50 } } })).statusCode).toBe(400);
    const marked = await request("POST", `${url}/self-mark`, { expectedRevision: 2, marks: { q2: { method: true, steps: false } } });
    expect(marked.json().attempt).toMatchObject({ autoScore: 1, manualScore: 1, needsSelfMark: false });
    const retry = await create(id, { retryOfAttemptId: attempt.id });
    expect(retry.paper.questions.map((q: any) => q.id)).toEqual(["r2"]);
    expect(JSON.stringify(retry)).not.toMatch(/PRIVATE_|"key"/);
    expect((await request("POST", "/api/exam/attempts", input(id, { retryOfAttemptId: attempt.id, mode: "simulation" }))).json().error).toBe("SIMULATION_NO_HINTS");
  });
  it("opens one authored retry under concurrent keys and replays it even at the draft cap", async () => {
    const id = await student(), attempt = await create(id);
    await request("POST", `/api/exam/attempts/${attempt.id}/submit`, { expectedRevision: 0 });
    const bodies = [input(id, { retryOfAttemptId: attempt.id }), input(id, { retryOfAttemptId: attempt.id })];
    const races = await Promise.all(bodies.map(body => request("POST", "/api/exam/attempts", body)));
    expect(races.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(races.find(r => r.statusCode === 409)!.json().error).toBe("RETRY_ALREADY_EXISTS");
    const winner = races.findIndex(r => r.statusCode === 201), retry = races[winner].json().attempt;
    expect((await pool.query("SELECT count(*) FROM exam_attempts WHERE retry_of_attempt_id=$1", [attempt.id])).rows[0].count).toBe("1");
    await expect(pool.query(`INSERT INTO exam_attempts(id,student_id,client_attempt_id,request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at,retry_of_attempt_id)
      SELECT gen_random_uuid(),student_id,gen_random_uuid(),request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at,retry_of_attempt_id
      FROM exam_attempts WHERE id=$1`, [retry.id])).rejects.toMatchObject({ code: "23505", constraint: "exam_attempts_one_retry_idx" });
    await pool.query(`INSERT INTO exam_attempts(id,student_id,client_attempt_id,request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at)
      SELECT gen_random_uuid(),student_id,gen_random_uuid(),request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at
      FROM exam_attempts CROSS JOIN generate_series(1,99) WHERE id=$1`, [retry.id]);
    const replay = await request("POST", "/api/exam/attempts", bodies[winner]);
    expect(replay.statusCode).toBe(201); expect(replay.json().attempt.id).toBe(retry.id);
    const repeated = await request("POST", "/api/exam/attempts", input(id, { retryOfAttemptId: attempt.id }));
    expect(repeated.statusCode).toBe(409); expect(repeated.json().error).toBe("RETRY_ALREADY_EXISTS");
  });
  it("blocks expired and revoked focus credentials at read/write routes", async () => {
    const id = await student(), attempt = await create(id), focusId = randomUUID();
    await pool.query("INSERT INTO focus_sessions(id,student_id,status,ends_at) VALUES($1,$2,'active',now()-interval '1 second')", [focusId, id]);
    const user: FamilySession = { sub: parentId, role: "student", studentId: id, focusSessionId: focusId };
    expect((await request("GET", `/api/exam/attempts/${attempt.id}`, undefined, user)).json().error).toBe("SESSION_ENDED");
    await pool.query("UPDATE focus_sessions SET status='revoked',ends_at=now()+interval '1 hour' WHERE id=$1", [focusId]);
    expect((await request("PUT", `/api/exam/attempts/${attempt.id}`, { expectedRevision: 0, answers: {} }, user)).json().error).toBe("SESSION_ENDED");
    expect((await pool.query("SELECT revision FROM exam_attempts WHERE id=$1", [attempt.id])).rows[0].revision).toBe(0);
  });
  it("rechecks expiry after waiting for a focus lock instead of using the pre-lock clock", async () => {
    const id = await student(), attempt = await create(id), focusId = randomUUID();
    await pool.query("INSERT INTO focus_sessions(id,student_id,status,ends_at) VALUES($1,$2,'active',now()+interval '1 hour')", [focusId, id]);
    const blocker = await pool.connect();
    let pending: ReturnType<typeof request> | undefined;
    try {
      await blocker.query("BEGIN"); await blocker.query("SELECT id FROM focus_sessions WHERE id=$1 FOR UPDATE", [focusId]);
      pending = request("PUT", `/api/exam/attempts/${attempt.id}`, { expectedRevision: 0, answers: { q1: { value: "0.5" } } }, { sub: parentId, role: "student", studentId: id, focusSessionId: focusId });
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const blocked = await admin.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'SELECT f.status,f.ends_at FROM focus_sessions%' AND cardinality(pg_blocking_pids(pid))>0");
        if (blocked.rows.length) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await blocker.query("UPDATE focus_sessions SET ends_at=clock_timestamp() WHERE id=$1", [focusId]);
      await blocker.query("COMMIT");
      expect((await pending).json().error).toBe("SESSION_ENDED");
      expect((await pool.query("SELECT revision FROM exam_attempts WHERE id=$1", [attempt.id])).rows[0].revision).toBe(0);
    } finally { await blocker.query("ROLLBACK"); blocker.release(); if (pending) await pending; }
  });
  it("atomically caps active drafts at 100 while preserving identical replays", async () => {
    const id = await student(), body = input(id), first = await request("POST", "/api/exam/attempts", body);
    await pool.query(`INSERT INTO exam_attempts(id,student_id,client_attempt_id,request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at)
      SELECT gen_random_uuid(),student_id,gen_random_uuid(),request_fingerprint,snapshot,state,mode,status,revision,started_at,updated_at,ends_at,submitted_at
      FROM exam_attempts CROSS JOIN generate_series(1,98) WHERE id=$1`, [first.json().attempt.id]);
    const races = await Promise.all([request("POST", "/api/exam/attempts", input(id)), request("POST", "/api/exam/attempts", input(id))]);
    expect(races.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(races.find(r => r.statusCode === 409)!.json().error).toBe("ATTEMPT_LIMIT_REACHED");
    const replay = await request("POST", "/api/exam/attempts", body);
    expect(replay.statusCode).toBe(201); expect(replay.json().attempt.id).toBe(first.json().attempt.id);
    expect((await pool.query("SELECT count(*) FROM exam_attempts WHERE student_id=$1", [id])).rows[0].count).toBe("100");
  });
});
