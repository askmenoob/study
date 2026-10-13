import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { accessError } from "./familyAccess.js";
import { teacherLevelIds, teacherSubjectIds } from "./teacherContentStore.js";
import { teacherApplicationStatuses, type PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";

type Guard = (request: any) => Promise<void>;

const applicationBody = z.object({
  fullName: z.string().trim().min(2).max(120),
  publicName: z.string().trim().min(2).max(80),
  schoolName: z.string().trim().min(3).max(160),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(100),
  positionTitle: z.string().trim().min(2).max(100),
  academicYear: z.number().int().min(2024).max(2100),
  levelIds: z.array(z.enum(teacherLevelIds)).min(1).max(6).transform((items) => [...new Set(items)]),
  subjectIds: z.array(z.enum(teacherSubjectIds)).min(1).max(7).transform((items) => [...new Set(items)]),
  identityAttested: z.literal(true),
  termsAttested: z.literal(true),
}).strict();

const reviewApplicationBody = z.object({
  decision: z.enum(["approve", "needs_info", "reject"]),
  reviewNote: z.string().trim().max(1000).optional(),
  schoolDisplayName: z.string().trim().min(3).max(160).optional(),
}).strict().superRefine((value, context) => {
  if (!value.reviewNote) {
    context.addIssue({ code: "custom", path: ["reviewNote"], message: "Review note is required" });
  }
});

const classBody = z.object({
  name: z.string().trim().min(2).max(80),
  academicYear: z.number().int().min(2024).max(2100),
  levelId: z.enum(teacherLevelIds),
  subjectId: z.enum(teacherSubjectIds),
}).strict();
const joinCode = z.string().trim().length(8).regex(/^[A-Za-z0-9]{8}$/).transform((value) => value.toUpperCase());
const codeBody = z.object({ joinCode }).strict();
const joinBody = codeBody.extend({
  replaceEnrollmentId: z.string().uuid().optional(),
  consentAttested: z.literal(true),
  consentVersion: z.literal("teacher-class-v1"),
  clientRequestId: z.string().uuid(),
}).strict();
const enrollmentDecisionBody = z.object({ decision: z.enum(["accept", "decline"]) }).strict();
const teacherStatusBody = z.object({ status: z.enum(["active", "suspended"]) }).strict();
const idParams = z.object({ id: z.string().uuid() }).strict();
const teacherDirectoryQuery = z.object({
  levelId: z.enum(teacherLevelIds).optional(),
  subjectId: z.enum(teacherSubjectIds).optional(),
}).strict();
const affiliationBody = z.object({ affiliation: z.enum(["imai", "external"]) }).strict();

async function call<T>(request: any, reply: any, operation: () => Promise<T>): Promise<T | undefined> {
  try { return await operation(); }
  catch (error: any) {
    if (error?.statusCode) throw error;
    request.log.error({ err: error }, "Teacher network request failed");
    reply.code(500).send({ error: "INTERNAL_ERROR" });
    return undefined;
  }
}

export function registerTeacherNetworkRoutes(
  app: FastifyInstance,
  repository: PostgresTeacherNetworkRepository,
  guards: { auth: Guard; parentAuth: Guard; teacherAuth: Guard; superAdminAuth: Guard },
) {
  // Family-facing directory: deliberately no child profiles, contact data, join codes or prices.
  app.get("/api/tuition/teachers", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const parsed = teacherDirectoryQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const teachers = await call(request, reply,
      () => repository.listTuitionTeachers(parsed.data.levelId, parsed.data.subjectId));
    if (teachers === undefined) return;
    reply.header("Cache-Control", "private, no-store").header("Vary", "Authorization");
    return { teachers };
  });

  app.get("/api/tuition/teachers/:id", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    reply.header("Cache-Control", "private, no-store").header("Vary", "Authorization");
    const teacher = await call(request, reply, () => repository.getTuitionTeacher(params.data.id));
    if (teacher === undefined) return;
    if (!teacher) return reply.code(404).send({ error: "TEACHER_NOT_FOUND" });
    return { teacher };
  });

  app.patch("/api/admin/teachers/:id/affiliation", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    const body = affiliationBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const teacher = await call(request, reply,
      () => repository.setTuitionAffiliation(request.user.sub, params.data.id, body.data.affiliation));
    if (!teacher) return;
    return { teacher };
  });
  app.get("/api/admin/teachers/:id/tuition-details",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    const p=idParams.safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});
    const teacher=await call(request,reply,()=>repository.getTuitionTeacher(p.data.id));if(teacher===undefined)return;if(!teacher)return reply.code(404).send({error:"TEACHER_NOT_FOUND"});
    reply.header("Cache-Control","private, no-store");return{teacher};
  });
  app.patch("/api/admin/teachers/:id/tuition-details",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    const p=idParams.safeParse(request.params),body=z.object({experienceYears:z.number().int().min(0).max(70).nullable(),qualifications:z.string().trim().min(3).max(300).nullable(),reviewNote:z.string().trim().min(10).max(1000)}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,()=>repository.setTuitionDetails(request.user.sub,p.data.id,body.data));
  });

  app.get("/api/teacher-application", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const application = await call(request, reply, () => repository.getApplication(request.user.sub));
    if (application === undefined) return;
    return { application };
  });

  app.post("/api/teacher-application", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const parsed = applicationBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", details: parsed.error.flatten() });
    const application = await call(request, reply, () => repository.submitApplication(request.user.sub, parsed.data));
    if (!application) return;
    return reply.code(201).send({ application });
  });

  app.get("/api/admin/tuition/summary", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    if (Object.keys(request.query ?? {}).length) return reply.code(400).send({ error: "INVALID_INPUT" });
    reply.header("Cache-Control", "private, no-store").header("Vary", "Authorization");
    const summary = await call(request, reply, () => repository.getTuitionAdminSummary());
    if (summary === undefined) return;
    return { summary };
  });

  app.get("/api/admin/teacher-applications", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    const parsed = z.object({ status: z.enum(teacherApplicationStatuses).default("pending") }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const applications = await call(request, reply, () => repository.listApplications(parsed.data.status));
    if (!applications) return;
    return { applications };
  });

  app.patch("/api/admin/teacher-applications/:id", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params); const body = reviewApplicationBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const application = await call(request, reply, () => repository.reviewApplication(params.data.id, request.user.sub,
      body.data.decision, body.data.reviewNote, body.data.schoolDisplayName));
    if (!application) return;
    return { application };
  });

  app.patch("/api/admin/teachers/:id/status", { preHandler: guards.superAdminAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params); const body = teacherStatusBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const teacher = await call(request, reply, () => repository.setTeacherStatus(request.user.sub, params.data.id, body.data.status));
    if (!teacher) return;
    return { teacher };
  });

  app.get("/api/teacher/network-profile", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const teacher = await call(request, reply, () => repository.getTeacherProfile(request.user.sub));
    if (teacher === undefined) return;
    if (!teacher || teacher.status !== "active") throw accessError("TEACHER_ACCESS_REQUIRED", 403);
    return { teacher };
  });

  app.get("/api/teacher/classes", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const classes = await call(request, reply, () => repository.listTeacherClasses(request.user.sub));
    if (!classes) return;
    reply.header("Cache-Control", "private, no-store").header("Pragma", "no-cache").header("Vary", "Authorization");
    return { classes };
  });

  app.post("/api/teacher/classes", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const parsed = classBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const teacherClass = await call(request, reply, () => repository.createClass(request.user.sub, parsed.data));
    if (!teacherClass) return;
    reply.header("Cache-Control", "private, no-store").header("Pragma", "no-cache").header("Vary", "Authorization");
    return reply.code(201).send({ class: teacherClass });
  });

  app.post("/api/teacher/classes/:id/rotate-code", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const code = await call(request, reply, () => repository.rotateJoinCode(request.user.sub, params.data.id));
    if (!code) return;
    reply.header("Cache-Control", "private, no-store").header("Pragma", "no-cache").header("Vary", "Authorization");
    return code;
  });

  app.get("/api/teacher/enrollments", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const enrollments = await call(request, reply, () => repository.listTeacherEnrollments(request.user.sub));
    if (!enrollments) return;
    return { enrollments };
  });

  app.patch("/api/teacher/enrollments/:id", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params); const body = enrollmentDecisionBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const enrollment = await call(request, reply, () => repository.decideEnrollment(request.user.sub, params.data.id, body.data.decision));
    if (!enrollment) return;
    return { enrollment };
  });

  app.get("/api/teacher/classes/:id/roster", { preHandler: guards.teacherAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const roster = await call(request, reply, () => repository.teacherRoster(request.user.sub, params.data.id));
    if (!roster) return;
    return { roster };
  });

  // Student and parent may only read a child's own class summary.
  // They cannot use this endpoint to manage/approve classes or view other children.
  app.get("/api/students/:id/tuition-classes", { preHandler: guards.auth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    if (request.user.role !== "student" && request.user.role !== "parent")
      return reply.code(403).send({ error: "ROLE_ACCESS_REQUIRED" });
    if (request.user.role === "student" && request.user.studentId !== params.data.id)
      return reply.code(403).send({ error: "STUDENT_SCOPE_REQUIRED" });
    reply.header("Cache-Control", "private, no-store").header("Vary", "Authorization");
    const classes = await call(request, reply,
      () => repository.listLearnerTuitionClasses(request.user.sub, params.data.id));
    if (classes === undefined) return;
    return { classes };
  });

  app.post("/api/students/:id/teacher-connections/preview", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params); const body = codeBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const preview = await call(request, reply, () => repository.previewClass(request.user.sub, params.data.id, body.data.joinCode));
    if (!preview) return;
    return preview;
  });

  app.post("/api/students/:id/teacher-connections", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params); const body = joinBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const enrollment = await call(request, reply, () => repository.requestJoin(request.user.sub, params.data.id,
      body.data.joinCode, body.data.consentVersion, body.data.clientRequestId, body.data.replaceEnrollmentId));
    if (!enrollment) return;
    return reply.code(201).send({ enrollment });
  });

  app.get("/api/students/:id/teacher-connections", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const enrollments = await call(request, reply, () => repository.listFamilyEnrollments(request.user.sub, params.data.id));
    if (!enrollments) return;
    return { enrollments };
  });

  app.delete("/api/students/:id/teacher-connections/:connectionId", { preHandler: guards.parentAuth }, async (request: any, reply) => {
    const parsed = z.object({ id: z.string().uuid(), connectionId: z.string().uuid() }).strict().safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    await call(request, reply, () => repository.endEnrollment(request.user.sub, parsed.data.id, parsed.data.connectionId));
    if (reply.sent) return;
    return reply.code(204).send();
  });
}
