import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";

const id = "99999999-9999-4999-8999-999999999999";
const safeTeacher = {
  id, publicName: "Cikgu Hana", affiliation: "imai", levelIds: ["d3"],
  subjectIds: ["math"], positionTitle: "Guru Matematik", state: "Johor",
};

describe("tuition teacher profile security", () => {
  it("returns a safe projection for one approved active teacher only", async () => {
    const query = vi.fn(async (_sql: string, _params: unknown[]) => ({
      rows: [{ id, public_name: "Cikgu Hana", tuition_affiliation: "imai",
        level_ids: ["d3"], subject_ids: ["math"], position_title: "Guru Matematik",
        state: "Johor", email: "secret@example.com", full_name: "Protected", join_code: "TOPSECRET" }],
    }));
    const repo = new PostgresTeacherNetworkRepository({ query } as any, "secret-for-tests");
    const profile = await repo.getTuitionTeacher(id);
    expect(query.mock.calls[0]?.[0]).toContain("p.status='active' AND a.status='approved'");
    expect(query.mock.calls[0]?.[0]).toContain("p.user_id=$1");
    expect(query.mock.calls[0]?.[1]).toEqual([id]);
    expect(profile).toEqual(safeTeacher);
    expect(JSON.stringify(profile)).not.toMatch(/email|secret|join_code|Protected/i);
  });

  it("keeps inactive or unapproved teachers hidden when not returned by database", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repo = new PostgresTeacherNetworkRepository({ query } as any, "secret-for-tests");
    expect(await repo.getTuitionTeacher(id)).toBeNull();
  });

  it("requires parent access, checks UUID, applies no-store and returns 404 for absent profiles", async () => {
    const app = Fastify();
    const getTuitionTeacher = vi.fn(async (teacherId: string) => teacherId === id ? safeTeacher : null);
    registerTeacherNetworkRoutes(app, { getTuitionTeacher } as any, {
      auth: async () => {},
      teacherAuth: async () => {},
      superAdminAuth: async () => {},
      parentAuth: async (request: any) => {
        if (request.headers.authorization !== "Bearer parent") throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
        request.user = { sub: "parent", role: "parent" };
      },
    });
    const uri = `/api/tuition/teachers/${id}`;
    expect((await app.inject({ method: "GET", url: uri })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/tuition/teachers/not-a-uuid", headers: { authorization: "Bearer parent" } })).statusCode).toBe(400);
    expect(getTuitionTeacher).not.toHaveBeenCalled();
    const missing = await app.inject({ method: "GET", url: "/api/tuition/teachers/88888888-8888-4888-8888-888888888888", headers: { authorization: "Bearer parent" } });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toBe("TEACHER_NOT_FOUND");
    const found = await app.inject({ method: "GET", url: uri, headers: { authorization: "Bearer parent" } });
    expect(found.statusCode).toBe(200);
    expect(found.json()).toEqual({ teacher: safeTeacher });
    expect(found.headers["cache-control"]).toBe("private, no-store");
    expect(found.headers.vary).toBe("Authorization");
    await app.close();
  });
});
