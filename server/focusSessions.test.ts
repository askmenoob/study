import { describe, it, expect, vi } from "vitest";
import type { Pool } from "pg";
import { canLearn, enforceFocusSession, focusStatus, focusView, hashStudyCode } from "./focusSessions.js";

describe("focus deadline and visibility", () => {
  const end = "2026-09-08T15:00:00.000Z";
  const deadline = Date.parse(end);
  it("ends exactly at the deadline, including requested exits", () => {
    for (const state of ["active", "exit_requested"] as const) {
      expect(focusStatus(state, end, deadline - 1)).toBe(state);
      expect(focusStatus(state, end, deadline)).toBe("expired");
      expect(focusStatus(state, end, deadline + 1)).toBe("expired");
    }
  });
  it("never reopens an approved, revoked or expired session", () => {
    for (const state of ["approved", "revoked", "expired"] as const) {
      expect(focusStatus(state, end, deadline - 1)).toBe(state);
      expect(focusStatus(state, end, deadline + 1)).toBe(state);
      expect(canLearn(state)).toBe(false);
    }
    expect(canLearn("active")).toBe(true);
    expect(canLearn("exit_requested")).toBe(true);
  });
  it("serializes only permitted session fields", () => {
    const view = focusView({ id: "session", status: "approved", ends_at: end, created_at: end, exit_requested_at: null, parent_id: "secret-parent", student_id: "student", code_hash: "secret-hash", email: "private@example.test" });
    expect(Object.keys(view).sort()).toEqual(["createdAt","endsAt","exitRequestedAt","id","status"]);
    expect(JSON.stringify(view)).not.toContain("secret");
    expect(JSON.stringify(view)).not.toContain("private");
  });
  it("stores a SHA256 digest, never the invite code", () => {
    expect(hashStudyCode("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashStudyCode("A".repeat(43))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("focus authorization", () => {
  const user = { sub: "parent-id", role: "student" as const, studentId: "student-id", focusSessionId: "56da110e-ab81-4eeb-94c8-c2f30a1d814b" };
  function db(rows: any[]) {
    const query = vi.fn().mockResolvedValue({ rows });
    return { pool: { query } as unknown as Pool, query };
  }
  it("requires stored session, student, and parent to match even when status is readable", async () => {
    const missing = db([]);
    await expect(enforceFocusSession(missing.pool, user, true)).rejects.toMatchObject({ code: "SESSION_ENDED", statusCode: 401 });
    const [sql, parameters] = missing.query.mock.calls[0];
    expect(sql).toContain("f.student_id=$2 AND s.parent_id=$3");
    expect(parameters).toEqual([user.focusSessionId, user.studentId, user.sub]);
  });
  it("blocks terminal learning while allowing its own status to be read", async () => {
    for (const status of ["approved", "revoked", "expired"]) {
      const instance = db([{ status, ends_at: "2099-01-01T00:00:00Z" }]);
      await expect(enforceFocusSession(instance.pool, user)).rejects.toMatchObject({ code: "SESSION_ENDED", statusCode: 401 });
      await expect(enforceFocusSession(instance.pool, user, true)).resolves.toBeUndefined();
    }
  });
  it("permits learning while parent approval is pending, but not after deadline", async () => {
    await expect(enforceFocusSession(db([{ status: "exit_requested", ends_at: "2099-01-01T00:00:00Z" }]).pool, user)).resolves.toBeUndefined();
    await expect(enforceFocusSession(db([{ status: "active", ends_at: "2000-01-01T00:00:00Z" }]).pool, user)).rejects.toMatchObject({ code: "SESSION_ENDED" });
  });
  it("retains non-focus sessions without querying focus records", async () => {
    const instance = db([]);
    await enforceFocusSession(instance.pool, { sub: "parent", role: "parent" });
    await enforceFocusSession(instance.pool, { sub: "parent", role: "student", studentId: "student" });
    expect(instance.query).not.toHaveBeenCalled();
  });
});
