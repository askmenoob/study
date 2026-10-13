import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { accessError } from "./familyAccess.js";
import {
  teacherLevelIds,
  teacherMaterialKinds,
  teacherMaterialStatuses,
  teacherSubjectIds,
  isTeacherSubjectForLevel,
  type TeacherContentRepository,
} from "./teacherContentStore.js";

type Guard = (request: any) => Promise<void>;

const materialBody = z.object({
  clientRequestId: z.string().uuid(),
  classId: z.string().uuid(),
  levelId: z.enum(teacherLevelIds),
  subjectId: z.enum(teacherSubjectIds),
  kind: z.enum(teacherMaterialKinds),
  title: z.string().trim().min(5).max(120),
  summary: z.string().trim().min(10).max(300),
  body: z.string().trim().min(20).max(10000),
  rightsAttested: z.literal(true),
  privacyAttested: z.literal(true),
}).strict().refine((value) => isTeacherSubjectForLevel(value.levelId, value.subjectId), { path: ["subjectId"], message: "Subject is not available for this level" });

const reviewBody = z.object({
  decision: z.enum(["approve", "reject", "withdraw"]),
  reviewNote: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, context) => {
  if (["reject", "withdraw"].includes(value.decision) && !value.reviewNote) {
    context.addIssue({ code: "custom", path: ["reviewNote"], message: "Review note is required" });
  }
});

const statusQuery = z.object({ status: z.enum([...teacherMaterialStatuses, "unreviewed"]).optional() }).strict();
const idParams = z.object({ id: z.string().uuid() }).strict();

function studentMaterialView(item: Awaited<ReturnType<TeacherContentRepository["listOwnMaterials"]>>[number]) {
  return {
    id: item.id,
    classId: item.classId,
    className: item.className,
    teacherName: item.teacherName,
    schoolName: item.schoolName,
    levelId: item.levelId,
    subjectId: item.subjectId,
    kind: item.kind,
    title: item.title,
    summary: item.summary,
    body: item.body,
    publishedAt: item.publishedAt,
  };
}

async function safeRepositoryCall<T>(request: any, reply: any, operation: () => Promise<T>): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error: any) {
    if (error?.statusCode) throw error;
    request.log.error({ err: error }, "Teacher content request failed");
    reply.code(500).send({ error: "INTERNAL_ERROR" });
    return undefined;
  }
}

export function registerTeacherContentRoutes(
  app: FastifyInstance,
  repository: TeacherContentRepository,
  guards: { auth: Guard; teacherAuth: Guard; superAdminAuth: Guard },
) {
  app.get("/api/admin/teachers", { preHandler: guards.superAdminAuth }, async (request, reply) => {
    const teachers = await safeRepositoryCall(request, reply, () => repository.listTeachers());
    if (!teachers) return;
    return { teachers };
  });

  app.get("/api/teacher/profile", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const teacher = await safeRepositoryCall(request, reply, () => repository.getTeacher(request.user.sub));
    if (teacher === undefined) return;
    if (!teacher) throw accessError("SESSION_EXPIRED", 401);
    return { teacher };
  });

  app.post("/api/teacher/materials", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const parsed = materialBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const material = await safeRepositoryCall(request, reply, () => repository.createMaterial(request.user.sub, parsed.data));
    if (!material) return;
    return reply.code(201).send({ material });
  });

  app.get("/api/teacher/materials", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const materials = await safeRepositoryCall(request, reply, () => repository.listOwnMaterials(request.user.sub));
    if (!materials) return;
    return { materials };
  });

  app.get("/api/admin/teacher-materials", { preHandler: guards.superAdminAuth }, async (request, reply) => {
    const parsed = statusQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const materials = await safeRepositoryCall(request, reply, () => repository.listForReview(parsed.data.status));
    if (!materials) return;
    return { materials };
  });

  app.patch("/api/admin/teacher-materials/:id", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    const body = reviewBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const material = await safeRepositoryCall(request, reply, () => repository.reviewMaterial(params.data.id, request.user.sub, body.data.decision, body.data.reviewNote));
    if (!material) return;
    return { material };
  });

  app.get("/api/students/:id/teacher-materials", { preHandler: guards.auth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    if (!["parent", "student"].includes(request.user.role)) throw accessError("STUDENT_ACCESS_DENIED", 403);
    const materials = await safeRepositoryCall(request, reply, () => repository.listPublishedForStudent(params.data.id, request.user.sub));
    if (materials === undefined) return;
    if (materials === null) throw accessError("STUDENT_NOT_FOUND", 404);
    return { materials: materials.map(studentMaterialView) };
  });
}
