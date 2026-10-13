import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";
import { PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";

const child = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const cls = "33333333-3333-4333-8333-333333333333";

describe("Student Private Tuition read-only access", () => {
  it("returns only safe projection of classes for a student owned by the parent", async () => {
    const query = vi.fn(async (sql: string, _params: unknown[]) => sql.startsWith("SELECT 1")
      ? { rows: [{ one: 1 }] }
      : { rows: [{ id: cls, class_name: "Matematik 4", teacher_public_name: "Cikgu Aina",
          subject_id: "math", status: "active", student_name: "Secret",
          parent_email: "private@example.com", join_code: "TOPSECRET" }] });
    const repo = new PostgresTeacherNetworkRepository({ query } as any, "secret-for-tests");
    const classes = await repo.listLearnerTuitionClasses("parent", child);
    expect(query.mock.calls[0][1]).toEqual([child, "parent"]);
    expect(query.mock.calls[1][0]).toContain("e.student_id=$1");
    expect(query.mock.calls[1][0]).toContain("p.status='active' AND a.status='approved'");
    expect(query.mock.calls[1][0]).toContain("c.status='active'");
    expect(classes).toEqual([{ id: cls, className: "Matematik 4",
      teacherPublicName: "Cikgu Aina", subjectId: "math", status: "active" }]);
    expect(JSON.stringify(classes)).not.toMatch(/Secret|email|join_code/);
  });

  it("rejects student IDs from another family, even with valid caller credentials", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repo = new PostgresTeacherNetworkRepository({ query } as any, "secret-for-tests");
    await expect(repo.listLearnerTuitionClasses("parent", other)).rejects.toMatchObject({
      code: "STUDENT_NOT_FOUND", statusCode: 404,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("enforces student-token scope, denies admins, and prevents shared caching", async () => {
    const app = Fastify();
    const listLearnerTuitionClasses = vi.fn(async () => [{ id: cls, className: "Matematik 4", status: "active" }]);
    registerTeacherNetworkRoutes(app, { listLearnerTuitionClasses } as any, {
      auth: async (request: any) => {
        const header = request.headers.authorization;
        if (header === "Bearer student") request.user = { role: "student", sub: "parent", studentId: child };
        else if (header === "Bearer parent") request.user = { role: "parent", sub: "parent" };
        else if (header === "Bearer admin") request.user = { role: "super_admin", sub: "admin" };
        else throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      },
      parentAuth: async () => {},
      teacherAuth: async () => {},
      superAdminAuth: async () => {},
    });
    const url = `/api/students/${child}/tuition-classes`;
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer admin" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/api/students/${other}/tuition-classes`, headers: { authorization: "Bearer student" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/students/invalid/tuition-classes", headers: { authorization: "Bearer student" } })).statusCode).toBe(400);
    expect(listLearnerTuitionClasses).not.toHaveBeenCalled();
    const own = await app.inject({ method: "GET", url, headers: { authorization: "Bearer student" } });
    expect(own.statusCode).toBe(200);
    expect(own.headers["cache-control"]).toBe("private, no-store");
    expect(own.headers.vary).toBe("Authorization");
    expect(listLearnerTuitionClasses).toHaveBeenCalledWith("parent", child);
    const family = await app.inject({ method: "GET", url, headers: { authorization: "Bearer parent" } });
    expect(family.statusCode).toBe(200);
    await app.close();
  });
});
