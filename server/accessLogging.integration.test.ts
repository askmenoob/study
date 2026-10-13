import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import bcrypt from "bcryptjs";

const state = vi.hoisted(() => ({ app: null as FastifyInstance | null, events: [] as any[], passwordHash: "", query: null as any }));
vi.mock("fastify", async importOriginal => {
  const actual = await importOriginal<typeof import("fastify")>();
  const { Writable } = await import("node:stream");
  return { ...actual, default: (options: any) => {
    const stream = new Writable({ write(chunk, _encoding, done) { state.events.push(JSON.parse(chunk.toString())); done(); } });
    const app = actual.default({ ...options, logger: { ...options.logger, stream } } as FastifyServerOptions);
    vi.spyOn(app, "listen").mockImplementation(async () => { await app.ready(); return "test-only"; });
    state.app = app;
    return app;
  } };
});
vi.mock("./db.js", () => {
  const query = vi.fn(async (sql: string, values: any[] = []) => {
    if (sql.startsWith("SELECT id,email,password_hash")) {
      if (values[0] === "member@example.test") return { rows: [{ id: "11111111-1111-4111-8111-111111111111", email: "member@example.test", password_hash: state.passwordHash, display_name: "Member", plan: "free", role: "parent" }] };
      if (values[0] === "admin@example.test") return { rows: [{ id: "22222222-2222-4222-8222-222222222222", email: "admin@example.test", password_hash: state.passwordHash, display_name: "Admin", plan: "free", role: "super_admin" }] };
      if (values[0] === "teacher@example.test") return { rows: [{ id: "33333333-3333-4333-8333-333333333333", email: "teacher@example.test", password_hash: state.passwordHash, display_name: "Teacher", plan: "free", role: "teacher" }] };
      return { rows: [] };
    }
    if (sql.startsWith("SELECT id,email,display_name"))
      return { rows: [{ id: values[0], email: values[0].startsWith("2222") ? "admin@example.test" : values[0].startsWith("3333") ? "teacher@example.test" : "member@example.test", display_name: values[0].startsWith("3333") ? "Teacher" : "Member", plan: "free", role: values[0].startsWith("2222") ? "super_admin" : values[0].startsWith("3333") ? "teacher" : "parent" }] };
    if (sql.includes("SELECT 1 FROM users u JOIN user_roles r")) {
      const expected = values[0].startsWith("2222") ? "super_admin" : values[0].startsWith("3333") ? "teacher" : "parent";
      return { rows: values[1] === expected ? [{ "?column?": 1 }] : [] };
    }
    if (sql.startsWith("SELECT u.id,u.email,u.display_name,array_agg"))
      return { rows: [{ id: values[0], email: "teacher@example.test", display_name: "Teacher", level_ids: ["d1"] }] };
    if (sql === "SELECT COUNT(*)::int AS total FROM users") return { rows: [{ total: 3 }] };
    if (sql.includes("SELECT id,email,role,created_at")) return { rows: [
      { id: "22222222-2222-4222-8222-222222222222", email: "admin@example.test", role: "super_admin", created_at: "2026-09-12T01:00:00Z", total: 3 },
      { id: "33333333-3333-4333-8333-333333333333", email: "teacher@example.test", role: "teacher", created_at: "2026-09-12T00:30:00Z", total: 3 },
      { id: "11111111-1111-4111-8111-111111111111", email: "member@example.test", role: "parent", created_at: "2026-09-12T00:00:00Z", total: 3 },
    ] };
    if (sql.includes("FROM feedback_submissions f JOIN users u")) return { rows: [] };
    if (["BEGIN","COMMIT","ROLLBACK"].includes(sql) || sql.startsWith("INSERT INTO users") || sql.startsWith("INSERT INTO user_roles") || sql === "SELECT 1" || sql.includes("CREATE TABLE IF NOT EXISTS feedback_submissions") || sql.includes("CREATE TABLE IF NOT EXISTS feedback_triage") || sql.includes("CREATE TABLE IF NOT EXISTS teacher_assignments")) return { rows: [] };
    throw new Error("Unexpected test database query");
  });
  state.query=query;
  return { migrate:vi.fn(),migrateFocusSessions:vi.fn(),migrateExams:vi.fn(),closeDb:vi.fn(),pool:{query,connect:vi.fn(async()=>({query,release:vi.fn()}))} };
});
vi.mock("./accountRoles.js",()=>({
  accountRoles:["parent","teacher","super_admin"],migrateAccountRoles:vi.fn(),
  listActiveRoles:vi.fn(async(_pool:any,id:string)=>id.startsWith("2222")?["super_admin"]:id.startsWith("3333")?["teacher"]:["parent","teacher"]),
}));
vi.mock("./teacherNetworkStore.js",()=>({migrateTeacherNetwork:vi.fn(),verifyTeacherJoinCodeKey:vi.fn(),PostgresTeacherNetworkRepository:class{}}));
vi.mock("./teacherNetworkRoutes.js",()=>({registerTeacherNetworkRoutes:vi.fn()}));
vi.mock("./tuitionBookingStore.js",async importOriginal=>({...await importOriginal<typeof import("./tuitionBookingStore.js")>(),migrateTuitionBooking:vi.fn()}));
vi.mock("./tuitionLearningStore.js",async importOriginal=>({...await importOriginal<typeof import("./tuitionLearningStore.js")>(),migrateTuitionLearning:vi.fn()}));
vi.mock("./challengeStore.js", async importOriginal => ({ ...await importOriginal<typeof import("./challengeStore.js")>(), migrateChallenges: vi.fn() }));

const previousSignalListeners = { SIGINT: process.listeners("SIGINT"), SIGTERM: process.listeners("SIGTERM") };
const access = () => state.events.filter(event => event.event === "user_access");
beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "synthetic-access-log-test-secret-at-least-32");
  vi.stubEnv("ACCESS_LOG_TRUSTED_PROXY_IPS", "172.25.0.4");
  state.passwordHash = await bcrypt.hash("PASSWORD_SECRET", 4);
  await import("./index.js");
}, 30_000);
afterAll(async () => {
  await state.app?.close();
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    for (const listener of process.listeners(signal))
      if (!previousSignalListeners[signal].includes(listener)) process.removeListener(signal, listener);
  vi.unstubAllEnvs();
});

describe("production auth routes access logging", () => {
  it("does not leak unknown paths or queries through any default log record", async () => {
    const response = await state.app!.inject("/MISSING_PATH_SECRET?token=QUERY_SECRET");
    expect(response.statusCode).toBe(404);
    expect(access().at(-1)).toMatchObject({ route: null, status: 404 });
    expect(JSON.stringify(state.events)).not.toContain("SECRET");
  });
  it("logs the stored identity only after real bcrypt verification and preserves the token response", async () => {
    const app = state.app!;
    const response = await app.inject({ method: "POST", url: "/api/auth/login?extra=QUERY_SECRET", remoteAddress: "192.0.2.10",
      headers: { cookie: "session=COOKIE_SECRET", "x-forwarded-for": "198.51.100.99", "cf-connecting-ip": "198.51.100.99" },
      payload: { email: "member@example.test", password: "PASSWORD_SECRET" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("member@example.test");
    expect(app.jwt.verify(response.json().token)).toMatchObject({ sub: "11111111-1111-4111-8111-111111111111", email: "member@example.test", role: "parent" });
    expect(access().at(-1)).toMatchObject({ route: "/api/auth/login", user_id: "11111111-1111-4111-8111-111111111111", email: "member@example.test", ip: "192.0.2.10", ip_source: "socket", status: 200 });
    expect(JSON.stringify(access())).not.toMatch(/SECRET|password|cookie|authorization/);
    expect(JSON.stringify(access())).not.toContain(response.json().token);

    const me = await app.inject({ url: "/api/me", remoteAddress: "172.25.0.4",
      headers: { authorization: "Bearer " + response.json().token, "x-forwarded-for": "198.51.100.12" } });
    expect(me.statusCode).toBe(200);
    expect(access().at(-1)).toMatchObject({ route: "/api/me", email: "member@example.test", ip: "198.51.100.12", ip_source: "trusted_nginx" });
  });
  it("does not turn attempted login emails or invalid JWT claims into verified identity", async () => {
    const app = state.app!;
    for (const payload of [
      { email: "member@example.test", password: "wrong" },
      { email: "unknown@example.test", password: "PASSWORD_SECRET" },
    ]) {
      const response = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "192.0.2.11", payload });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "INVALID_CREDENTIALS" });
      expect(access().at(-1)).toMatchObject({ user_id: null, email: null, status: 401 });
    }
    const response = await app.inject({ url: "/api/me", headers: { authorization: "Bearer INVALID_TOKEN_SECRET" } });
    expect(response.statusCode).toBe(401);
    expect(access().at(-1)).toMatchObject({ user_id: null, email: null });
  });
  it("preserves a stored super-admin role through login and me", async () => {
    const app = state.app!;
    const response = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "192.0.2.20",
      payload: { email: "admin@example.test", password: "PASSWORD_SECRET" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.role).toBe("super_admin");
    expect(app.jwt.verify(response.json().token)).toMatchObject({ sub: "22222222-2222-4222-8222-222222222222", role: "super_admin" });
    const me = await app.inject({ url: "/api/me", headers: { authorization: `Bearer ${response.json().token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.role).toBe("super_admin");

    const inbox = await app.inject({ url: "/api/admin/feedback", headers: { authorization: `Bearer ${response.json().token}` } });
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json()).toEqual({ feedback: [] });

    const directory = await app.inject({ url: "/api/admin/users", headers: { authorization: `Bearer ${response.json().token}` } });
    expect(directory.statusCode).toBe(200);
    expect(directory.headers["cache-control"]).toBe("no-store");
    expect(directory.json()).toEqual({
      users: [
        { email: "admin@example.test", role: "super_admin", createdAt: "2026-09-12T01:00:00.000Z" },
        { email: "teacher@example.test", role: "teacher", createdAt: "2026-09-12T00:30:00.000Z" },
        { email: "member@example.test", role: "parent", createdAt: "2026-09-12T00:00:00.000Z" },
      ],
      total: 3,
      nextCursor: null,
    });
    expect(directory.body).not.toContain("password");

    const staleAdmin = app.jwt.sign({ sub: "11111111-1111-4111-8111-111111111111", role: "super_admin" });
    const denied = await app.inject({ url: "/api/admin/feedback", headers: { authorization: `Bearer ${staleAdmin}` } });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: "SUPER_ADMIN_ACCESS_REQUIRED" });
    const deniedDirectory = await app.inject({ url: "/api/admin/users", headers: { authorization: `Bearer ${staleAdmin}` } });
    expect(deniedDirectory.statusCode).toBe(403);
  });
  it("preserves a stored teacher role through login and me", async () => {
    const app = state.app!;
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "teacher@example.test", password: "PASSWORD_SECRET" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.role).toBe("teacher");
    expect(app.jwt.verify(response.json().token)).toMatchObject({ sub: "33333333-3333-4333-8333-333333333333", role: "teacher" });
    const me = await app.inject({ url: "/api/me", headers: { authorization: `Bearer ${response.json().token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.role).toBe("teacher");

    const profile = await app.inject({ url: "/api/teacher/profile", headers: { authorization: `Bearer ${response.json().token}` } });
    expect(profile.statusCode).toBe(200);
    expect(profile.json().teacher).toMatchObject({ email: "teacher@example.test", levelIds: ["d1"] });

    const staleTeacher = app.jwt.sign({ sub: "11111111-1111-4111-8111-111111111111", role: "teacher" });
    const denied = await app.inject({ url: "/api/teacher/profile", headers: { authorization: `Bearer ${staleTeacher}` } });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: "TEACHER_ACCESS_REQUIRED" });
  });
  it("switches a dual-role parent into a server-authorized teacher session", async () => {
    const app=state.app!;
    const login=await app.inject({method:"POST",url:"/api/auth/login",payload:{email:"member@example.test",password:"PASSWORD_SECRET"}});
    expect(login.json().user).toMatchObject({role:"parent",roles:["parent","teacher"]});
    const switched=await app.inject({method:"POST",url:"/api/auth/switch-role",headers:{authorization:`Bearer ${login.json().token}`},payload:{role:"teacher"}});
    expect(switched.statusCode).toBe(200);expect(switched.json().user).toMatchObject({role:"teacher",roles:["parent","teacher"]});
    expect(app.jwt.verify(switched.json().token)).toMatchObject({sub:"11111111-1111-4111-8111-111111111111",role:"teacher"});
  });
  it("never lets a student session switch back into a parent or teacher account", async () => {
    const app = state.app!;
    const studentToken = app.jwt.sign({
      sub: "11111111-1111-4111-8111-111111111111",
      role: "student",
      studentId: "44444444-4444-4444-8444-444444444444",
    });
    for (const role of ["parent", "teacher"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/switch-role",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { role },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "STUDENT_ACCESS_DENIED" });
      expect(response.body).not.toContain("token");
    }
  });
  it("keeps a super-admin session locked to the admin role", async () => {
    const app=state.app!;
    const token=app.jwt.sign({sub:"22222222-2222-4222-8222-222222222222",role:"super_admin"});
    const response=await app.inject({method:"POST",url:"/api/auth/switch-role",headers:{authorization:`Bearer ${token}`},payload:{role:"parent"}});
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({error:"SUPER_ADMIN_ROLE_LOCKED"});
    expect(response.body).not.toContain("token");
  });
  it("records successful registration without changing its response", async () => {
    const response = await state.app!.inject({ method: "POST", url: "/api/auth/register", remoteAddress: "192.0.2.12",
      payload: { email: "new@example.test", password: "NEW_PASSWORD_SECRET", displayName: "New Member" } });
    expect(response.statusCode).toBe(201);
    expect(access().at(-1)).toMatchObject({ user_id: response.json().user.id, email: "new@example.test", status: 201 });
    expect(JSON.stringify(access())).not.toMatch(/SECRET|password_hash/);
  });
  it("keeps the existing auth limit and prevents bypass with forged IP headers", async () => {
    for (let index = 0; index < 21; index++) {
      const response = await state.app!.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "192.0.2.13",
        headers: { "x-forwarded-for": "198.51.100." + index }, payload: {} });
      expect(response.statusCode).toBe(index < 20 ? 400 : 429);
    }
    expect(access().at(-1)).toMatchObject({ status: 429, user_id: null, email: null, ip: "192.0.2.13" });
  });
});
