import type { Pool } from "pg";

export type FamilySession = { sub: string; role: "parent" | "teacher" | "super_admin" | "student"; studentId?: string; focusSessionId?: string };
export function accessError(error: string, statusCode = 403) {
  return Object.assign(new Error(error), { statusCode, code: error });
}
export function assertSession(value: unknown): asserts value is FamilySession {
  const session = value as Partial<FamilySession> | null;
  if (!session || typeof session.sub !== "string" || !session.sub ||
      !["parent", "teacher", "super_admin", "student"].includes(session.role ?? "") ||
      (session.role === "student" && (typeof session.studentId !== "string" || !session.studentId))) {
    throw accessError("SESSION_EXPIRED", 401);
  }
}
export function assertParent(session: FamilySession) {
  if (session.role !== "parent") throw accessError("PARENT_ACCESS_REQUIRED");
}
export function assertSuperAdmin(session: FamilySession) {
  if (session.role !== "super_admin") throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
}
export function assertTeacher(session: FamilySession) {
  if (session.role !== "teacher") throw accessError("TEACHER_ACCESS_REQUIRED");
}
export function assertStudentScope(session: FamilySession, studentId: unknown) {
  if (session.role === "student" && studentId !== session.studentId) throw accessError("STUDENT_ACCESS_DENIED");
}
export const normalizeStudentName = (name: string) => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ms");
export const sameStudentIdentity = (a: { name: string; levelId: string }, b: { name: string; levelId: string }) =>
  normalizeStudentName(a.name) === normalizeStudentName(b.name) && a.levelId === b.levelId;

export async function saveStudent(pool: Pool, parentId: string, id: string, input: { name?: string; levelId?: string }, create: boolean) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE", [parentId]);
    if (account.rows[0]?.role !== "parent") throw accessError("PARENT_ACCESS_REQUIRED", 403);
    // Serialize create/update within this family, including simultaneous identical submissions.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [parentId]);
    const { rows } = await client.query("SELECT id,name,level_id FROM students WHERE parent_id=$1", [parentId]);
    const current = rows.find((row) => row.id === id);
    if (!create && !current) throw accessError("STUDENT_NOT_FOUND", 404);
    const identity = { name: input.name ?? current?.name, levelId: input.levelId ?? current?.level_id };
    if (!identity.name || !identity.levelId) throw accessError("INVALID_INPUT", 400);
    const unchanged = current && sameStudentIdentity(identity, { name: current.name, levelId: current.level_id });
    if (!unchanged && rows.some((row) => row.id !== id && sameStudentIdentity(identity, { name: row.name, levelId: row.level_id }))) {
      throw accessError("DUPLICATE_STUDENT", 409);
    }
    const saved = create
      ? await client.query("INSERT INTO students(id,parent_id,name,level_id) VALUES($1,$2,$3,$4) RETURNING id,name,level_id,created_at,updated_at", [id,parentId,identity.name,identity.levelId])
      : await client.query("UPDATE students SET name=$1,level_id=$2,updated_at=now() WHERE id=$3 AND parent_id=$4 RETURNING id,name,level_id,created_at,updated_at", [identity.name,identity.levelId,id,parentId]);
    await client.query("COMMIT");
    return saved.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
