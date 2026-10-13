import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { accessError } from "./familyAccess.js";
import { registerTeacherContentRoutes } from "./teacherContentRoutes.js";
import type { TeacherContentRepository, TeacherLevelId, TeacherMaterialInput, TeacherMaterialRecord, TeacherMaterialReviewFilter, TeacherMaterialStatus, TeacherSummary } from "./teacherContentStore.js";

const teacher: TeacherSummary = { id: "11111111-1111-4111-8111-111111111111", email: "guru@example.test", displayName: "Cikgu Siti", levelIds: ["d1"] };
const material: TeacherMaterialRecord = {
  id: "22222222-2222-4222-8222-222222222222", clientRequestId: "33333333-3333-4333-8333-333333333333",
  classId: "66666666-6666-4666-8666-666666666666", className: "1 Bestari BM", schoolName: "SK Bestari",
  teacherId: teacher.id, teacherName: teacher.displayName, teacherEmail: teacher.email, levelId: "d1", subjectId: "bm", kind: "note",
  title: "Mengenal suku kata", summary: "Nota ringkas untuk murid Darjah 1.", body: "Baca suku kata ini dengan perlahan dan jelas.",
  rightsAttested: true, privacyAttested: true, status: "pending", createdAt: "2026-09-12T00:00:00.000Z",
};

class MemoryTeacherRepository implements TeacherContentRepository {
  created: TeacherMaterialInput[] = [];
  reviewed: Array<{ id: string; decision: string; note?: string }> = [];
  filters: Array<TeacherMaterialReviewFilter | undefined> = [];
  fail = false;
  async assignTeacher(_email: string, levelIds: TeacherLevelId[]) { return { ...teacher, levelIds }; }
  async listTeachers() { if (this.fail) throw new Error("private database details"); return [teacher]; }
  async getTeacher() { return teacher; }
  async createMaterial(_teacherId: string, input: TeacherMaterialInput) { this.created.push(input); return { ...material, ...input, status: "published" as const, publicationSource: "verified_teacher_auto" as const, publishedAt: "2026-09-12T00:00:00.000Z" }; }
  async listOwnMaterials() { return [material]; }
  async listForReview(status?: TeacherMaterialReviewFilter) { this.filters.push(status); return [material]; }
  async reviewMaterial(id: string, _adminId: string, decision: "approve" | "reject" | "withdraw", reviewNote?: string) {
    const status: TeacherMaterialStatus = decision === "approve" ? "published" : decision === "reject" ? "rejected" : "withdrawn";
    this.reviewed.push({ id, decision, note: reviewNote }); return { ...material, status, reviewNote };
  }
  async listPublishedForStudent(studentId: string, _parentId: string): Promise<TeacherMaterialRecord[] | null> {
    return studentId === "44444444-4444-4444-8444-444444444444" ? [{ ...material, status: "published", publishedAt: "2026-09-12T01:00:00.000Z", reviewNote: "internal" }] : null;
  }
}

function buildApi(repository = new MemoryTeacherRepository()) {
  const app = Fastify({ logger: false });
  const guard = (role: string) => async (request: any) => {
    if (request.headers["x-test-role"] !== role) throw accessError(role === "teacher" ? "TEACHER_ACCESS_REQUIRED" : role === "super_admin" ? "SUPER_ADMIN_ACCESS_REQUIRED" : "SESSION_EXPIRED");
    request.user = { sub: role === "teacher" ? teacher.id : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role };
  };
  registerTeacherContentRoutes(app, repository, { auth: guard("student"), teacherAuth: guard("teacher"), superAdminAuth: guard("super_admin") });
  return { app, repository };
}

describe("teacher content routes", () => {
  it("auto-publishes original plain text only for a verified teacher", async () => {
    const { app, repository } = buildApi();
    const payload = { clientRequestId: material.clientRequestId, classId: material.classId, levelId: "d1", subjectId: "bm", kind: "note", title: material.title, summary: material.summary, body: material.body, rightsAttested: true, privacyAttested: true };
    const response = await app.inject({ method: "POST", url: "/api/teacher/materials", headers: { "x-test-role": "teacher" }, payload });
    expect(response.statusCode).toBe(201);
    expect(response.json().material).toMatchObject({ status: "published", publicationSource: "verified_teacher_auto" });
    expect(response.json().material.publishedAt).toBeTruthy();
    expect(repository.created).toEqual([payload]);
    expect((await app.inject({ method: "POST", url: "/api/teacher/materials", headers: { "x-test-role": "parent" }, payload })).statusCode).toBe(403);
    await app.close();
  });

  it("exposes the post-publication queue to super admin", async () => {
    const { app, repository } = buildApi();
    const response = await app.inject({ method: "GET", url: "/api/admin/teacher-materials?status=unreviewed", headers: { "x-test-role": "super_admin" } });
    expect(response.statusCode).toBe(200);
    expect(repository.filters).toEqual(["unreviewed"]);
    await app.close();
  });

  it("rejects missing confirmations and invalid Darjah 1 History", async () => {
    const { app, repository } = buildApi();
    const base = { clientRequestId: material.clientRequestId, levelId: "d1", subjectId: "bm", kind: "note", title: material.title, summary: material.summary, body: material.body };
    expect((await app.inject({ method: "POST", url: "/api/teacher/materials", headers: { "x-test-role": "teacher" }, payload: base })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/teacher/materials", headers: { "x-test-role": "teacher" }, payload: { ...base, rightsAttested: true } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/teacher/materials", headers: { "x-test-role": "teacher" }, payload: { ...base, subjectId: "history", rightsAttested: true, privacyAttested: true } })).statusCode).toBe(400);
    expect(repository.created).toEqual([]);
    await app.close();
  });

  it("disables legacy direct assignment and keeps review behind the super-admin guard", async () => {
    const { app, repository } = buildApi();
    const assignment = { email: teacher.email, levelIds: ["d1", "d2"] };
    expect((await app.inject({ method: "PUT", url: "/api/admin/teachers/assignment", headers: { "x-test-role": "super_admin" }, payload: assignment })).statusCode).toBe(404);
    const rejectedWithoutReason = await app.inject({ method: "PATCH", url: `/api/admin/teacher-materials/${material.id}`, headers: { "x-test-role": "super_admin" }, payload: { decision: "reject" } });
    expect(rejectedWithoutReason.statusCode).toBe(400);
    const approved = await app.inject({ method: "PATCH", url: `/api/admin/teacher-materials/${material.id}`, headers: { "x-test-role": "super_admin" }, payload: { decision: "approve" } });
    expect(approved.statusCode).toBe(200);
    expect(repository.reviewed).toEqual([{ id: material.id, decision: "approve", note: undefined }]);
    const withdrawnWithoutReason = await app.inject({ method: "PATCH", url: `/api/admin/teacher-materials/${material.id}`, headers: { "x-test-role": "super_admin" }, payload: { decision: "withdraw" } });
    expect(withdrawnWithoutReason.statusCode).toBe(400);
    await app.close();
  });

  it("returns approved grade-scoped student fields without internal moderation or email", async () => {
    const { app } = buildApi();
    const response = await app.inject({ method: "GET", url: "/api/students/44444444-4444-4444-8444-444444444444/teacher-materials", headers: { "x-test-role": "student" } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.materials[0]).toMatchObject({ title: material.title, levelId: "d1" });
    expect(body.materials[0]).toMatchObject({ teacherName: teacher.displayName, className: material.className, schoolName: material.schoolName });
    expect(JSON.stringify(body)).not.toContain(teacher.email);
    expect(JSON.stringify(body)).not.toContain("internal");
    expect(JSON.stringify(body)).not.toContain("rightsAttested");
    expect(JSON.stringify(body)).not.toContain("privacyAttested");
    expect((await app.inject({ method: "GET", url: "/api/students/55555555-5555-4555-8555-555555555555/teacher-materials", headers: { "x-test-role": "student" } })).statusCode).toBe(404);
    await app.close();
  });

  it("hides unexpected repository details from the client", async () => {
    const { app, repository } = buildApi();
    repository.fail = true;
    const response = await app.inject({ method: "GET", url: "/api/admin/teachers", headers: { "x-test-role": "super_admin" } });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(response.body).not.toContain("private database details");
    await app.close();
  });
});
