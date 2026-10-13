import { describe, it, expect } from "vitest";
import { assertSession, assertParent, assertTeacher, assertSuperAdmin, assertStudentScope, sameStudentIdentity, saveStudent } from "./familyAccess.js";
import type { Pool } from "pg";

describe("family access boundary", () => {
  const parent = { sub: "family", role: "parent" as const };
  const superAdmin = { sub: "admin", role: "super_admin" as const };
  const teacher = { sub: "teacher", role: "teacher" as const };
  const student = { sub: "family", role: "student" as const, studentId: "arif" };
  it("forces legacy and malformed sessions to authenticate again", () => {
    for (const value of [{ sub: "family" }, { sub: "family", role: "admin" }, { sub: "family", role: "student" }, null]) {
      expect(() => assertSession(value)).toThrow("SESSION_EXPIRED");
    }
    expect(() => assertSession(parent)).not.toThrow();
    expect(() => assertSession(superAdmin)).not.toThrow();
    expect(() => assertSession(teacher)).not.toThrow();
    expect(() => assertSession(student)).not.toThrow();
  });
  it("prevents a student from entering parent actions and sibling records", () => {
    expect(() => assertParent(student)).toThrow("PARENT_ACCESS_REQUIRED");
    expect(() => assertStudentScope(student, "aila")).toThrow("STUDENT_ACCESS_DENIED");
    expect(() => assertStudentScope(student, "arif")).not.toThrow();
    expect(() => assertParent(parent)).not.toThrow();
    expect(() => assertParent(superAdmin)).toThrow("PARENT_ACCESS_REQUIRED");
    expect(() => assertSuperAdmin(parent)).toThrow("SUPER_ADMIN_ACCESS_REQUIRED");
    expect(() => assertSuperAdmin(superAdmin)).not.toThrow();
    expect(() => assertTeacher(teacher)).not.toThrow();
    expect(() => assertTeacher(parent)).toThrow("TEACHER_ACCESS_REQUIRED");
    expect(() => assertParent(teacher)).toThrow("PARENT_ACCESS_REQUIRED");
    expect(() => assertSuperAdmin(teacher)).toThrow("SUPER_ADMIN_ACCESS_REQUIRED");
    expect(() => assertStudentScope(parent, "aila")).not.toThrow();
  });
  it("normalizes casing, whitespace and Unicode but preserves year distinctions", () => {
    expect(sameStudentIdentity({ name: "  ＡＲＩＦ  Ali ", levelId: "d2" }, { name: "arif ali", levelId: "d2" })).toBe(true);
    expect(sameStudentIdentity({ name: "ARIF", levelId: "d2" }, { name: "arif", levelId: "d3" })).toBe(false);
  });
});

describe("student identity transaction", () => {
  function database(rows: Array<{ id: string; name: string; level_id: string }>, role = "parent") {
    const calls: string[] = [];
    const client = { query: async (sql: string) => {
      calls.push(sql);
      if (sql.startsWith("SELECT role")) return { rows: [{ role }] };
      if (sql.startsWith("SELECT id")) return { rows };
      return { rows: [{ id: "saved" }] };
    }, release: () => calls.push("RELEASE") };
    return { pool: { connect: async () => client } as unknown as Pool, calls };
  }
  it("locks before reading and rolls back duplicate creation without a write", async () => {
    const db = database([{ id: "existing", name: "Arif", level_id: "d2" }]);
    await expect(saveStudent(db.pool, "family", "new", { name: " ARIF ", levelId: "d2" }, true)).rejects.toMatchObject({ code: "DUPLICATE_STUDENT", statusCode: 409 });
    expect(db.calls[0]).toBe("BEGIN");
    expect(db.calls[1]).toContain("SELECT role");
    expect(db.calls[2]).toContain("pg_advisory_xact_lock");
    expect(db.calls.some(sql => /^(INSERT|UPDATE)/.test(sql))).toBe(false);
    expect(db.calls.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
  });
  it("allows existing duplicate identity to stay unchanged without deleting history", async () => {
    const db = database([{ id: "first", name: "ARIF", level_id: "d2" }, { id: "second", name: "Arif", level_id: "d2" }]);
    await saveStudent(db.pool, "family", "first", { name: "Arif" }, false);
    expect(db.calls.some(sql => sql.startsWith("UPDATE"))).toBe(true);
    expect(db.calls.some(sql => sql.startsWith("DELETE"))).toBe(false);
    expect(db.calls.slice(-2)).toEqual(["COMMIT", "RELEASE"]);
  });
  it("blocks renaming another student into an existing identity", async () => {
    const db = database([{ id: "first", name: "Arif", level_id: "d2" }, { id: "second", name: "Aila", level_id: "d2" }]);
    await expect(saveStudent(db.pool, "family", "second", { name: "ARIF" }, false)).rejects.toMatchObject({ code: "DUPLICATE_STUDENT" });
  });
  it("rejects a stale parent request after the account becomes a teacher", async () => {
    const db = database([], "teacher");
    await expect(saveStudent(db.pool, "family", "new", { name: "Arif", levelId: "d1" }, true)).rejects.toMatchObject({ code: "PARENT_ACCESS_REQUIRED", statusCode: 403 });
    expect(db.calls.some((sql) => /^(INSERT|UPDATE)/.test(sql))).toBe(false);
    expect(db.calls.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
  });
});
