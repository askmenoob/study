import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { markVerifiedAccessIdentity } from "./accessLogging.js";
import { accessError, type FamilySession } from "./familyAccess.js";

export type FocusStatus = "active" | "exit_requested" | "approved" | "revoked" | "expired";
export const hashStudyCode = (code: string) => createHash("sha256").update(code).digest("hex");
export function focusStatus(status: FocusStatus, endsAt: Date | string, now = Date.now()): FocusStatus {
  return (status === "active" || status === "exit_requested") && new Date(endsAt).getTime() <= now ? "expired" : status;
}
export const canLearn = (status: FocusStatus) => status === "active" || status === "exit_requested";
export const focusView = (row: any) => ({
  id: row.id, status: focusStatus(row.status, row.ends_at), endsAt: row.ends_at,
  createdAt: row.created_at, exitRequestedAt: row.exit_requested_at,
});
export async function getFocusSession(pool: Pool, user: FamilySession) {
  if (user.role !== "student" || !user.focusSessionId || !z.string().uuid().safeParse(user.focusSessionId).success) {
    throw accessError("FOCUS_SESSION_NOT_FOUND", 404);
  }
  const { rows } = await pool.query(
    "SELECT f.* FROM focus_sessions f JOIN students s ON s.id=f.student_id WHERE f.id=$1 AND f.student_id=$2 AND s.parent_id=$3",
    [user.focusSessionId, user.studentId, user.sub],
  );
  if (!rows[0]) throw accessError("SESSION_ENDED", 401);
  return rows[0];
}
export async function enforceFocusSession(pool: Pool, user: FamilySession, allowEnded = false) {
  if (user.role !== "student" || !user.focusSessionId) return;
  const row = await getFocusSession(pool, user);
  if (!allowEnded && !canLearn(focusStatus(row.status, row.ends_at))) throw accessError("SESSION_ENDED", 401);
}
type Guard = (request: any) => Promise<void>;
export function registerFocusRoutes(app: FastifyInstance, pool: Pool, auth: Guard, parentAuth: Guard) {
  const ownedStudent = async (request: any) => {
    const result = await pool.query("SELECT id FROM students WHERE id=$1 AND parent_id=$2", [request.params.id, request.user.sub]);
    if (!result.rows[0]) throw accessError("STUDENT_NOT_FOUND", 404);
  };
  const checkId = (value: unknown) => {
    if (!z.string().uuid().safeParse(value).success) throw accessError("INVALID_INPUT", 400);
  };
  app.post("/api/students/:id/study-links", { preHandler: parentAuth }, async (request: any, reply) => {
    await ownedStudent(request);
    const parsed = z.object({ durationMinutes: z.number().int().min(15).max(180).default(30) }).safeParse(request.body ?? {});
    if (!parsed.success) throw accessError("INVALID_INPUT", 400);
    const code = randomBytes(32).toString("base64url");
    const id = randomUUID();
    const { rows } = await pool.query(
      "INSERT INTO study_links(id,student_id,code_hash,duration_minutes,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours') RETURNING id,expires_at",
      [id, request.params.id, hashStudyCode(code), parsed.data.durationMinutes],
    );
    return reply.code(201).send({ link: { id, expiresAt: rows[0].expires_at }, code });
  });
  app.get("/api/students/:id/study-links", { preHandler: parentAuth }, async (request: any) => {
    await ownedStudent(request);
    const { rows } = await pool.query("SELECT id,expires_at,created_at,redeemed_at,revoked_at FROM study_links WHERE student_id=$1 ORDER BY created_at DESC", [request.params.id]);
    return { links: rows.map(row => ({ id: row.id, expiresAt: row.expires_at, createdAt: row.created_at, redeemedAt: row.redeemed_at, revokedAt: row.revoked_at })) };
  });
  app.delete("/api/students/:id/study-links/:linkId", { preHandler: parentAuth }, async (request: any, reply) => {
    checkId(request.params.linkId);
    await ownedStudent(request);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Same link-row lock as redemption: revocation cannot miss a concurrently created session.
      const found = await client.query("SELECT id FROM study_links WHERE id=$1 AND student_id=$2 FOR UPDATE", [request.params.linkId, request.params.id]);
      if (!found.rows[0]) throw accessError("LINK_NOT_FOUND", 404);
      await client.query("UPDATE study_links SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1", [request.params.linkId]);
      await client.query("UPDATE focus_sessions SET status=CASE WHEN ends_at<=now() THEN 'expired' ELSE 'revoked' END WHERE link_id=$1 AND status IN ('active','exit_requested')", [request.params.linkId]);
      await client.query("COMMIT");
      return reply.code(204).send();
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  });
  app.post("/api/auth/redeem-study-link", async (request, reply) => {
    const parsed = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).safeParse(request.body);
    if (!parsed.success) throw accessError("INVALID_INPUT", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT l.*,s.name,s.parent_id,u.plan FROM study_links l JOIN students s ON s.id=l.student_id JOIN users u ON u.id=s.parent_id WHERE l.code_hash=$1 FOR UPDATE OF l",
        [hashStudyCode(parsed.data.code)],
      );
      const link = rows[0];
      if (!link || link.revoked_at || link.redeemed_at || new Date(link.expires_at).getTime() <= Date.now()) throw accessError("LINK_UNAVAILABLE", 410);
      const id = randomUUID();
      const saved = await client.query(
        "INSERT INTO focus_sessions(id,student_id,link_id,ends_at) VALUES($1,$2,$3,now()+$4*interval '1 minute') RETURNING *",
        [id,link.student_id,link.id,link.duration_minutes],
      );
      await client.query("UPDATE study_links SET redeemed_at=now() WHERE id=$1", [link.id]);
      const token = app.jwt.sign({ sub: link.parent_id, role: "student", studentId: link.student_id, focusSessionId: id }, { expiresIn: "7d" });
      await client.query("COMMIT");
      markVerifiedAccessIdentity(request, { sub: link.parent_id });
      return { token, user: { id: link.student_id, displayName: link.name, plan: link.plan, role: "student", studentId: link.student_id, focusSessionId: id }, session: focusView(saved.rows[0]) };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  });
  app.get("/api/focus-session", { preHandler: auth }, async (request: any) => {
    return { session: focusView(await getFocusSession(pool, request.user)) };
  });
  app.post("/api/focus-session/exit-request", { preHandler: auth }, async (request: any) => {
    const row = await getFocusSession(pool, request.user);
    await pool.query(
      "UPDATE focus_sessions SET status='exit_requested',exit_requested_at=COALESCE(exit_requested_at,now()) WHERE id=$1 AND status='active' AND ends_at>now()",
      [row.id],
    );
    return { session: focusView(await getFocusSession(pool, request.user)) };
  });
  app.get("/api/students/:id/focus-sessions", { preHandler: parentAuth }, async (request: any) => {
    await ownedStudent(request);
    const { rows } = await pool.query("SELECT * FROM focus_sessions WHERE student_id=$1 ORDER BY created_at DESC", [request.params.id]);
    return { sessions: rows.map(focusView) };
  });
  app.post("/api/students/:id/focus-sessions/:sessionId/approve-exit", { preHandler: parentAuth }, async (request: any) => {
    checkId(request.params.sessionId);
    await ownedStudent(request);
    const { rows } = await pool.query(
      "UPDATE focus_sessions SET status=CASE WHEN status IN ('active','exit_requested') THEN CASE WHEN ends_at<=now() THEN 'expired' ELSE 'approved' END ELSE status END WHERE id=$1 AND student_id=$2 RETURNING *",
      [request.params.sessionId, request.params.id],
    );
    if (!rows[0]) throw accessError("FOCUS_SESSION_NOT_FOUND", 404);
    return { session: focusView(rows[0]) };
  });
}
