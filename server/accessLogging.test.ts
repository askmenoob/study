import { afterEach, describe, expect, it } from "vitest";
import Fastify, { LogController, type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { Writable } from "node:stream";
import { assertSession } from "./familyAccess.js";
import { createClientAddressResolver, markVerifiedAccessIdentity, registerUserAccessLogging } from "./accessLogging.js";

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
async function fixture(trusted = "") {
  const events: any[] = [];
  const stream = new Writable({ write(chunk, _encoding, done) { events.push(JSON.parse(chunk.toString())); done(); } });
  const app = Fastify({ logger: { stream }, logController: new LogController({ disableRequestLogging: true }), trustProxy: false });
  apps.push(app);
  const address = createClientAddressResolver(trusted);
  registerUserAccessLogging(app, address);
  await app.register(jwt, { secret: "test-only-access-logging-secret-at-least-32" });
  app.get("/public", async () => ({ ok: true }));
  app.post("/private/:id", {
    preHandler: async request => {
      await request.jwtVerify();
      assertSession(request.user);
      markVerifiedAccessIdentity(request, request.user);
    },
  }, async (_request, reply) => reply.code(202).send({ token: "RESPONSE_SECRET" }));
  await app.ready();
  return { app, events, access: () => events.filter(event => event.event === "user_access") };
}
describe("user access log contract", () => {
  it("logs a verified signed identity, a route template, status and duration without secrets", async () => {
    const { app, events, access } = await fixture();
    const token = app.jwt.sign({ sub: "account-123", email: "member@example.test", role: "parent", unrelated: "CLAIM_SECRET" });
    const result = await app.inject({
      method: "POST", url: "/private/PATH_SECRET?password=QUERY_SECRET", remoteAddress: "192.0.2.40",
      headers: { authorization: "Bearer " + token, cookie: "session=COOKIE_SECRET", "x-private": "HEADER_SECRET" },
      payload: { password: "BODY_SECRET", email: "forged@example.test" },
    });
    expect(result.statusCode).toBe(202);
    expect(access()).toHaveLength(1);
    expect(access()[0]).toMatchObject({
      event: "user_access", app: "imai-study", method: "POST", route: "/private/:id", status: 202,
      user_id: "account-123", email: "member@example.test", ip: "192.0.2.40", ip_source: "socket",
    });
    expect(access()[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(Number.isFinite(access()[0].duration_ms)).toBe(true);
    expect(access()[0].duration_ms).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(events)).not.toMatch(/SECRET|forged@example|Bearer|authorization|cookie/);
    expect(JSON.stringify(events)).not.toContain(token);
  });
  it("leaves anonymous requests and unverifiable tokens anonymous", async () => {
    const { app, access } = await fixture();
    await app.inject({ url: "/public?email=forged@example.test", headers: { "x-user-email": "forged@example.test" } });
    const invalid = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJmb3JnZWQiLCJlbWFpbCI6ImZvcmdlZEBleGFtcGxlLnRlc3QifQ.";
    for (const token of [invalid, app.jwt.sign({ sub: "expired", email: "expired@example.test", role: "parent", exp: 1 })]) {
      const response = await app.inject({ method: "POST", url: "/private/123", headers: { authorization: "Bearer " + token } });
      expect(response.statusCode).toBe(401);
    }
    expect(access()).toHaveLength(3);
    for (const event of access()) expect(event).toMatchObject({ user_id: null, email: null });
  });
  it("supports verified student sessions without inventing an email", async () => {
    const { app, access } = await fixture();
    const token = app.jwt.sign({ sub: "parent-account", role: "student", studentId: "student-123" });
    await app.inject({ method: "POST", url: "/private/123", headers: { authorization: "Bearer " + token, "x-user-email": "forged@example.test" } });
    expect(access()[0]).toMatchObject({ user_id: "parent-account", email: null, status: 202 });
  });
  it("never writes the raw URL when a route is missing", async () => {
    const { app, events, access } = await fixture();
    const response = await app.inject("/MISSING_PATH_SECRET?token=QUERY_SECRET");
    expect(response.statusCode).toBe(404);
    expect(access()[0]).toMatchObject({ route: null, status: 404 });
    expect(JSON.stringify(events)).not.toContain("SECRET");
  });
  it("keeps simultaneous identities isolated", async () => {
    const { app, access } = await fixture();
    await Promise.all(["one", "two"].map(sub => app.inject({
      method: "POST", url: "/private/" + sub,
      headers: { authorization: "Bearer " + app.jwt.sign({ sub, email: sub + "@example.test", role: "parent" }) },
    })));
    expect(access().map(event => [event.user_id, event.email]).sort()).toEqual([["one", "one@example.test"], ["two", "two@example.test"]]);
  });
});
describe("trusted ingress", () => {
  it("ignores forged forwarding headers from direct callers", async () => {
    const { app, access } = await fixture("172.25.0.4");
    await app.inject({ url: "/public", remoteAddress: "192.0.2.41", headers: {
      "x-forwarded-for": "198.51.100.77", "cf-connecting-ip": "198.51.100.78", "x-real-ip": "198.51.100.79",
    } });
    expect(access()[0]).toMatchObject({ ip: "192.0.2.41", ip_source: "socket" });
  });
  it("accepts only a single validated address from the exact nginx peer", async () => {
    const { app, access } = await fixture("172.25.0.4");
    for (const value of ["198.51.100.44", "2001:db8::40"]) {
      await app.inject({ url: "/public", remoteAddress: "::ffff:172.25.0.4", headers: { "x-forwarded-for": value } });
      expect(access().at(-1)).toMatchObject({ ip: value, ip_source: "trusted_nginx" });
    }
    for (const value of ["forged", "198.51.100.44, 172.25.0.5", "198.51.100.44:443", "fe80::1%eth0", ""]) {
      await app.inject({ url: "/public", remoteAddress: "172.25.0.4", headers: { "x-forwarded-for": value } });
      expect(access().at(-1)).toMatchObject({ ip: "172.25.0.4", ip_source: "socket" });
    }
  });
  it("defaults to no forwarding trust and rejects broad or invalid configuration", async () => {
    const { app, access } = await fixture();
    await app.inject({ url: "/public", remoteAddress: "172.25.0.4", headers: { "x-forwarded-for": "198.51.100.44" } });
    expect(access()[0]).toMatchObject({ ip: "172.25.0.4", ip_source: "socket" });
    for (const value of ["*", "172.25.0.0/16", "web", "garbage"]) expect(() => createClientAddressResolver(value)).toThrow();
  });
});
