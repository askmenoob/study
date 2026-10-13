import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";
import { PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";

const teacherId = "11111111-1111-4111-8111-111111111111";

describe("IMAI Private Tuition teacher directory", () => {
  it("returns only approved active teachers with explicit safe fields and bound filters", async () => {
    const query = vi.fn(async (_sql: string, _params: unknown[]) => ({ rows: [{
      id: teacherId, public_name: "Cikgu Aina", tuition_affiliation: "external",
      level_ids: ["d4"], subject_ids: ["math"], position_title: "Guru Matematik",
      state: "Selangor", email: "PRIVATE@EXAMPLE.COM", full_name: "Private Name",
      join_code: "TOPSECRET", student_name: "Private Student",
    }] }));
    const repo = new PostgresTeacherNetworkRepository({ query } as any, "test-secret");
    const result = await repo.listTuitionTeachers("d4", "math");
    expect(query.mock.calls[0]?.[0]).toContain("p.status='active' AND a.status='approved'");
    expect(query.mock.calls[0]?.[0]).toContain("$1::text");
    expect(query.mock.calls[0]?.[1]).toEqual(["d4", "math"]);
    expect(result).toEqual([{ id: teacherId, publicName: "Cikgu Aina", affiliation: "external",
      levelIds: ["d4"], subjectIds: ["math"], positionTitle: "Guru Matematik", state: "Selangor" }]);
    expect(JSON.stringify(result)).not.toMatch(/email|PRIVATE|TOPSECRET|student_name/);
  });

  it("validates filters, guards directory and protects against shared caching", async () => {
    const app = Fastify();
    const listTuitionTeachers = vi.fn(async () => [{ id: teacherId, publicName: "Cikgu Aina", affiliation: "external" }]);
    const repo = { listTuitionTeachers } as any;
    registerTeacherNetworkRoutes(app, repo, {
      auth: async () => {},
      parentAuth: async (req: any) => { if (req.headers.authorization !== "Bearer family") throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); req.user = { sub: "parent" }; },
      teacherAuth: async () => {},
      superAdminAuth: async () => {},
    });
    expect((await app.inject({ method: "GET", url: "/api/tuition/teachers" })).statusCode).toBe(403);
    const bad = await app.inject({ method: "GET", url: "/api/tuition/teachers?subjectId=invalid", headers: { authorization: "Bearer family" } });
    expect(bad.statusCode).toBe(400);
    expect(listTuitionTeachers).not.toHaveBeenCalled();
    const good = await app.inject({ method: "GET", url: "/api/tuition/teachers?levelId=d4&subjectId=math", headers: { authorization: "Bearer family" } });
    expect(good.statusCode).toBe(200);
    expect(good.headers["cache-control"]).toBe("private, no-store");
    expect(good.headers.vary).toBe("Authorization");
    expect(listTuitionTeachers).toHaveBeenCalledWith("d4", "math");
    await app.close();
  });

  it("requires admin role to classify teachers and rejects invalid affiliation", async () => {
    const app = Fastify();
    const setTuitionAffiliation = vi.fn(async (_adminId: string, id: string, affiliation: string) => ({ teacherId: id, affiliation }));
    registerTeacherNetworkRoutes(app, { setTuitionAffiliation } as any, {
      auth: async () => {}, parentAuth: async () => {}, teacherAuth: async () => {},
      superAdminAuth: async (req: any) => { if (req.headers.authorization !== "Bearer admin") throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); req.user = { sub: "admin" }; },
    });
    const url = `/api/admin/teachers/${teacherId}/affiliation`;
    expect((await app.inject({ method: "PATCH", url, payload: { affiliation: "imai" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "PATCH", url, headers: { authorization: "Bearer admin" }, payload: { affiliation: "unknown" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "PATCH", url, headers: { authorization: "Bearer admin" }, payload: { affiliation: "imai" } })).statusCode).toBe(200);
    expect(setTuitionAffiliation).toHaveBeenCalledWith("admin", teacherId, "imai");
    await app.close();
  });
});
