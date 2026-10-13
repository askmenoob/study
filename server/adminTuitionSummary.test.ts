import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";
import { PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";

const metrics = { pendingApplications: 3, needsInfoApplications: 1, imaiTeachers: 4,
  externalTeachers: 7, suspendedTeachers: 2, activeClasses: 8,
  activeEnrollments: 23, pendingEnrollments: 5, problemFeedback: 10 };

describe("admin tuition summary", () => {
  it("returns safe aggregated numeric counts, with no contact details or join codes", async () => {
    const query = vi.fn(async (sql: string) => {
      expect(sql).toContain("FROM teacher_applications WHERE status='pending'");
      expect(sql).toContain("p.tuition_affiliation='imai'");
      expect(sql).toContain("p.tuition_affiliation='external'");
      expect(sql).toContain("e.status='active' AND c.status='active' AND p.status='active'");
      expect(sql).toContain("feedback_submissions WHERE category='problem'");
      return { rows: [{
        pending_applications: "3", needs_info_applications: "1", imai_teachers: "4",
        external_teachers: "7", suspended_teachers: "2", active_classes: "8",
        active_enrollments: "23", pending_enrollments: "5", problem_feedback: "10",
        parent_email: "secret@example.com", join_code: "SECRET123",
      }] };
    });
    const repository = new PostgresTeacherNetworkRepository({ query } as any, "safe-test-secret");
    const result = await repository.getTuitionAdminSummary();
    expect(result).toEqual(metrics);
    expect(JSON.stringify(result)).not.toMatch(/email|secret|joinCode|studentId/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("restricts summary to super admin and disables shared caching", async () => {
    const app = Fastify();
    const getTuitionAdminSummary = vi.fn(async () => metrics);
    registerTeacherNetworkRoutes(app, { getTuitionAdminSummary } as any, {
      auth: async () => {}, parentAuth: async () => {}, teacherAuth: async () => {},
      superAdminAuth: async (request: any) => {
        if (request.headers.authorization !== "Bearer admin")
          throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
        request.user = { sub: "admin", role: "super_admin" };
      },
    });
    const url = "/api/admin/tuition/summary";
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer parent" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: url + "?private=true", headers: { authorization: "Bearer admin" } })).statusCode).toBe(400);
    expect(getTuitionAdminSummary).not.toHaveBeenCalled();
    const response = await app.inject({ method: "GET", url, headers: { authorization: "Bearer admin" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ summary: metrics });
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toBe("Authorization");
    expect(getTuitionAdminSummary).toHaveBeenCalledTimes(1);
    await app.close();
  });
});
