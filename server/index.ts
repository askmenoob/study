import {freeStudyPolicy,registerFreeStudyRoutes} from "./freeStudy.js";
import Fastify, { LogController } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { migrate, migrateFocusSessions, migrateExams, pool, closeDb } from "./db.js";
import { registerExamRoutes } from "./examRoutes.js";
import { loadPracticeQuestionHistory } from "./practiceHistory.js";
import { enforceFocusSession, registerFocusRoutes } from "./focusSessions.js";
import { guidedTutorReply } from "./tutorService.js";
import { tutorBody } from "./tutorRequest.js";
import { registerChallengeRoutes } from "./challengeRoutes.js";
import { migrateChallenges } from "./challengeStore.js";
import { generateGeminiSpeech, geminiConfigured, geminiStatus, classifyTtsError } from "./gemini.js";
import { createClientAddressResolver, markVerifiedAccessIdentity, registerUserAccessLogging } from "./accessLogging.js";
import { type FamilySession, assertSession, assertParent, assertTeacher, assertSuperAdmin, assertStudentScope, saveStudent } from "./familyAccess.js";
import { registerFeedbackRoutes } from "./feedbackRoutes.js";
import { migrateFeedback, PostgresFeedbackRepository } from "./feedbackStore.js";
import { migrateFeedbackTriage, PostgresFeedbackTriageRepository } from "./feedbackTriageStore.js";
import { registerFeedbackTriageRoutes } from "./feedbackTriageRoutes.js";
import { registerAdminUserRoutes } from "./adminUserRoutes.js";
import { PostgresAdminUserRepository } from "./adminUserStore.js";
import { registerTeacherContentRoutes } from "./teacherContentRoutes.js";
import { migrateTeacherContent, PostgresTeacherContentRepository } from "./teacherContentStore.js";
import { accountRoles, listActiveRoles, migrateAccountRoles, type AccountRole } from "./accountRoles.js";
import { migrateTeacherNetwork, PostgresTeacherNetworkRepository, verifyTeacherJoinCodeKey } from "./teacherNetworkStore.js";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";
import { migrateTuitionBooking, TuitionBookingRepository } from "./tuitionBookingStore.js";
import { registerTuitionBookingRoutes } from "./tuitionBookingRoutes.js";
import { migrateTuitionLearning, TuitionLearningRepository } from "./tuitionLearningStore.js";
import { registerTuitionLearningRoutes } from "./tuitionLearningRoutes.js";
import { migrateTeacherKyc, TeacherKycRepository } from "./teacherKyc.js";
import { registerTeacherKycRoutes } from "./teacherKycRoutes.js";
import { migrateTuitionCommerce } from "./tuitionCommerce.js";
import { migrateTuitionVideo,TuitionVideoRepository } from "./tuitionVideo.js";
import { registerTuitionVideoRoutes } from "./tuitionVideoRoutes.js";
import { migrateTuitionNotificationDelivery,TuitionNotificationDelivery } from "./tuitionNotificationDelivery.js";
import { registerTuitionNotificationRoutes } from "./tuitionNotificationRoutes.js";
import {migrateTuitionPayouts} from "./tuitionPayouts.js";
import {tuitionAdminReadiness} from "./tuitionReadiness.js";
import {registerTuitionReadinessRoutes} from "./tuitionReadinessRoutes.js";
import {migrateWhatsAppDeliveryReceipts,TuitionWhatsAppReceiptRepository} from "./tuitionWhatsAppReceipts.js";
import {registerWhatsAppReceiptRoutes} from "./tuitionWhatsAppReceiptRoutes.js";
import { migrateTuitionRetention,TuitionRetentionRepository,publicStudyPrivacy } from "./tuitionRetention.js";
import { registerTuitionRetentionRoutes } from "./tuitionRetentionRoutes.js";

const port = Number(process.env.PORT ?? 4181);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

const clientAddress = createClientAddressResolver(process.env.ACCESS_LOG_TRUSTED_PROXY_IPS);
const app = Fastify({
  logger: { redact: ["req.headers.authorization", "req.headers.cookie", "req.body", "res.body"] },
  logController: new LogController({ disableRequestLogging: true }),
  trustProxy: false,
});
registerUserAccessLogging(app, clientAddress);
await app.register(jwt, { secret: jwtSecret });
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173,http://192.168.0.102:4178")
  .split(",").map((v) => v.trim()).filter(Boolean);
await app.register(cors, {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Origin not allowed"), false);
  },
});

const authBuckets = new Map<string, { count: number; resetAt: number }>();
app.addHook("onRequest", async (request, reply) => {
  reply.header("Cache-Control", "no-store");
  if (!request.url.startsWith("/api/auth/")) return;
  const now = Date.now();
  const key = clientAddress(request).ip ?? "unknown";
  let bucket = authBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + 15 * 60_000 };
  bucket.count += 1; authBuckets.set(key, bucket);
  if (bucket.count > 20) return reply.code(429).send({ error: "TOO_MANY_AUTH_ATTEMPTS" });
});
const auth = async (request: any) => {
  await request.jwtVerify();
  assertSession(request.user);
  markVerifiedAccessIdentity(request, request.user);
  const focusStatusRoute = request.routeOptions.url === "/api/focus-session" || request.routeOptions.url === "/api/focus-session/exit-request";
  await enforceFocusSession(pool, request.user, focusStatusRoute);
  if (request.params?.id !== undefined) {
    assertStudentScope(request.user, request.params.id);
    if (!z.string().uuid().safeParse(request.params.id).success) {
      throw Object.assign(new Error("INVALID_INPUT"), { code: "INVALID_INPUT", statusCode: 400 });
    }
  }
  if (request.body?.studentId !== undefined) assertStudentScope(request.user, request.body.studentId);
};
const userId = (request: any) => (request.user as FamilySession).sub;
const requireLiveUserRole = async (request: any, role: "parent" | "teacher" | "super_admin", errorCode: string) => {
  const { rows } = await pool.query(`SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id
    WHERE u.id=$1 AND r.role=$2 AND r.status='active'`, [userId(request),role]);
  if (!rows[0]) throw Object.assign(new Error(errorCode), { code: errorCode, statusCode: 403 });
};
const parentAuth = async (request: any) => {
  await auth(request); assertParent(request.user);
  await requireLiveUserRole(request, "parent", "PARENT_ACCESS_REQUIRED");
};
const teacherAuth = async (request: any) => {
  await auth(request); assertTeacher(request.user);
  await requireLiveUserRole(request, "teacher", "TEACHER_ACCESS_REQUIRED");
};
const superAdminAuth = async (request: any) => {
  await auth(request);
  assertSuperAdmin(request.user);
  await requireLiveUserRole(request, "super_admin", "SUPER_ADMIN_ACCESS_REQUIRED");
};

async function ownsStudent(studentId: string, parentId: string) {
  const { rows } = await pool.query(
    "SELECT id, parent_id, name, level_id, created_at, updated_at FROM students WHERE id=$1 AND parent_id=$2",
    [studentId, parentId],
  );
  return rows[0] ?? null;
}

const levelNames: Record<string,string> = {
  d1:"Darjah 1",d2:"Darjah 2",d3:"Darjah 3",d4:"Darjah 4",d5:"Darjah 5",d6:"Darjah 6",
  t1:"Tingkatan 1",t2:"Tingkatan 2",t3:"Tingkatan 3",t4:"Tingkatan 4",t5:"Tingkatan 5",t6:"Tingkatan 6",
};
const subjectNames: Record<string,string> = { bm:"Bahasa Melayu",en:"English",math:"Matematik",science:"Sains",history:"Sejarah",geo:"Geografi",islam:"Pendidikan Islam",moral:"Pendidikan Moral" };
const stageFor = (levelId:string) => levelId.startsWith("d") ? "KSSR" : levelId === "t6" ? "STPM" : "KSSM";

const aiBuckets = new Map<string,{count:number;resetAt:number}>();
function allowAi(key:string, limit:number) {
  const now=Date.now(); let bucket=aiBuckets.get(key);
  if(!bucket || bucket.resetAt<=now) bucket={count:0,resetAt:now+15*60_000};
  bucket.count += 1; aiBuckets.set(key,bucket);
  return bucket.count <= limit;
}

app.get("/api/health", async () => {
  await pool.query("SELECT 1");
  return { service: "imai-study-api", status: "ok", version: "1.6.0", program: freeStudyPolicy, ai: geminiStatus(), checkedAt: new Date().toISOString() };
});

const registerBody = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(80),
});
app.post("/api/auth/register", async (request, reply) => {
  const parsed = registerBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  const { email, password, displayName } = parsed.data;
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO users(id,email,password_hash,display_name) VALUES($1,$2,$3,$4)", [id,email,passwordHash,displayName]);
    await client.query("INSERT INTO user_roles(user_id,role,status) VALUES($1,'parent','active')", [id]);
    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") return reply.code(409).send({ error: "EMAIL_EXISTS" });
    throw error;
  } finally { client.release(); }
  markVerifiedAccessIdentity(request, { sub: id, email });
  const token = app.jwt.sign({ sub: id, email, role: "parent" }, { expiresIn: "7d" });
  return reply.code(201).send({ token, user: { id, email, displayName, plan: "free", role: "parent", roles: ["parent"] } });
});

const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
app.post("/api/auth/login", async (request, reply) => {
  const parsed = loginBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const email = parsed.data.email.trim().toLowerCase();
  const { rows } = await pool.query(
    "SELECT id,email,password_hash,display_name,plan,role FROM users WHERE email=$1",
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
  }
  const roles = await listActiveRoles(pool, user.id);
  const role: AccountRole = roles.includes("super_admin") ? "super_admin" : roles.includes("parent") ? "parent" : roles.includes("teacher") ? "teacher" : "parent";
  markVerifiedAccessIdentity(request, { sub: user.id, email: user.email });
  const token = app.jwt.sign({ sub: user.id, email: user.email, role }, { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, displayName: user.display_name, plan: user.plan, role, roles } };
});

app.post("/api/auth/switch-role", { preHandler: auth }, async (request: any, reply) => {
  if (request.user.role === "student") return reply.code(403).send({ error: "STUDENT_ACCESS_DENIED" });
  if (request.user.role === "super_admin") return reply.code(403).send({ error: "SUPER_ADMIN_ROLE_LOCKED" });
  const parsed = z.object({ role: z.enum(accountRoles) }).strict().safeParse(request.body);
  if (!parsed.success || parsed.data.role === "super_admin") return reply.code(400).send({ error: "INVALID_INPUT" });
  const roles = await listActiveRoles(pool, userId(request));
  if (!roles.includes(parsed.data.role)) return reply.code(403).send({ error: "ROLE_ACCESS_REQUIRED" });
  const userResult = await pool.query("SELECT id,email,display_name,plan FROM users WHERE id=$1", [userId(request)]);
  const user = userResult.rows[0];
  if (!user) return reply.code(401).send({ error: "SESSION_EXPIRED" });
  const token = app.jwt.sign({ sub: user.id, email: user.email, role: parsed.data.role }, { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, displayName: user.display_name, plan: user.plan, role: parsed.data.role, roles } };
});

app.setErrorHandler((error: any, _request, reply) => {
  if (["CHALLENGE_COMPLETED", "CHALLENGE_CONTENT_INVALID", "CHALLENGE_CONTEXT_CHANGED", "CHALLENGE_LEVEL_CHANGED", "CHALLENGE_NOT_FOUND", "CHALLENGE_QUESTIONS_UNAVAILABLE", "ANSWER_LOCKED", "INDEX_OUT_OF_ORDER", "SUBJECT_UNAVAILABLE"].includes(error.code)) {
    return reply.code(error.statusCode ?? 400).send({ error: error.code });
  }
  if (["SESSION_EXPIRED", "PARENT_ACCESS_REQUIRED", "TEACHER_ACCESS_REQUIRED", "TEACHER_LEVEL_ACCESS_REQUIRED", "TEACHER_SCOPE_REQUIRED", "SUPER_ADMIN_ACCESS_REQUIRED", "SUPER_ADMIN_ROLE_LOCKED", "TEACHER_ACCOUNT_HAS_STUDENTS", "MATERIAL_REQUEST_CONFLICT", "MATERIAL_RATE_LIMIT", "MATERIAL_STATE_CONFLICT", "STUDENT_ACCESS_DENIED", "DUPLICATE_STUDENT", "STUDENT_NOT_FOUND", "USER_NOT_FOUND", "INVALID_INPUT", "ROLE_ACCESS_REQUIRED", "TEACHER_ALREADY_APPROVED", "TEACHER_KYC_REQUIRED", "TEACHER_APPLICATION_NOT_FOUND", "TEACHER_APPLICATION_STATE_CONFLICT", "REVIEW_NOTE_REQUIRED", "TEACHER_CLASS_NOT_FOUND", "CLASS_CODE_UNAVAILABLE", "CLASS_LEVEL_MISMATCH", "SUBJECT_CLASS_CONFLICT", "SUBJECT_CLASS_REQUEST_PENDING", "ENROLLMENT_NOT_FOUND", "ENROLLMENT_STATE_CONFLICT", "TEACHER_NOT_FOUND", "SESSION_ENDED", "FOCUS_SESSION_NOT_FOUND", "LINK_NOT_FOUND", "LINK_UNAVAILABLE",
    "PAPER_UNAVAILABLE", "ATTEMPT_NOT_FOUND", "REVISION_CONFLICT", "ATTEMPT_SUBMITTED", "CHECKED_ANSWER_LOCKED", "SIMULATION_NO_HINTS", "TIME_EXPIRED", "REQUEST_KEY_CONFLICT", "ATTEMPT_LIMIT_REACHED", "RETRY_ALREADY_EXISTS"].includes(error.code)) {
    return reply.code(error.statusCode).send({ error: error.code });
  }
  return reply.send(error);
});

app.post("/api/auth/student-session", { preHandler: parentAuth }, async (request, reply) => {
  const parsed = z.object({ studentId: z.string().uuid() }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const student = await ownsStudent(parsed.data.studentId, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  const { rows } = await pool.query("SELECT plan FROM users WHERE id=$1", [userId(request)]);
  if (!rows[0]) return reply.code(401).send({ error: "SESSION_EXPIRED" });
  const token = app.jwt.sign({ sub: userId(request), role: "student", studentId: student.id }, { expiresIn: "7d" });
  return { token, user: { id: student.id, displayName: student.name, plan: rows[0].plan, role: "student", studentId: student.id } };
});

app.get("/api/me", { preHandler: auth }, async (request, reply) => {
  const { rows } = await pool.query(
    "SELECT id,email,display_name,plan,subscription_status,created_at,role FROM users WHERE id=$1",
    [userId(request)],
  );
  if (!rows[0]) return reply.code(404).send({ error: "USER_NOT_FOUND" });
  const session = request.user as FamilySession;
  if (session.role === "student") {
    const student = await ownsStudent(session.studentId!, userId(request));
    if (!student) return reply.code(401).send({ error: "SESSION_EXPIRED" });
    return { user: { id: student.id, display_name: student.name, plan: rows[0].plan, role: "student", studentId: student.id, ...(session.focusSessionId ? { focusSessionId: session.focusSessionId } : {}) } };
  }
  const roles = await listActiveRoles(pool, userId(request));
  if (!roles.includes(session.role as AccountRole)) return reply.code(403).send({ error: "ROLE_ACCESS_REQUIRED" });
  return { user: { ...rows[0], role: session.role, roles } };
});

app.delete("/api/me", { preHandler: parentAuth }, async (request, reply) => {
  await pool.query("DELETE FROM users WHERE id=$1", [userId(request)]);
  return reply.code(204).send();
});

const studentBody = z.object({
  name: z.string().trim().min(1).max(80),
  levelId: z.enum(["d1","d2","d3","d4","d5","d6","t1","t2","t3","t4","t5","t6"]),
});
app.get("/api/students", { preHandler: auth }, async (request) => {
  const { rows } = await pool.query(
    "SELECT id,name,level_id,created_at,updated_at FROM students WHERE parent_id=$1 AND ($2::uuid IS NULL OR id=$2::uuid) ORDER BY created_at",
    [userId(request), (request.user as FamilySession).role === "student" ? (request.user as FamilySession).studentId : null],
  );
  return { students: rows };
});

app.post("/api/students", { preHandler: parentAuth }, async (request, reply) => {
  const parsed = studentBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const id = randomUUID();
  const student = await saveStudent(pool, userId(request), id, parsed.data, true);
  return reply.code(201).send({ student });
});

app.patch("/api/students/:id", { preHandler: parentAuth }, async (request: any, reply) => {
  const parsed = studentBody.partial().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const student = await saveStudent(pool, userId(request), request.params.id, parsed.data, false);
  return { student };
});

app.delete("/api/students/:id", { preHandler: parentAuth }, async (request: any, reply) => {
  const student = await ownsStudent(request.params.id, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  await pool.query("DELETE FROM students WHERE id=$1 AND parent_id=$2", [student.id, userId(request)]);
  return reply.code(204).send();
});

const attemptBody = z.object({
  clientAttemptId: z.string().uuid(),
  studentId: z.string().uuid(),
  levelId: z.string().min(2).max(8),
  subjectId: z.string().min(1).max(40),
  topicId: z.string().min(1).max(80),
  score: z.number().int().min(0),
  total: z.number().int().positive(),
  answers: z.array(z.object({ questionId: z.string(), selected: z.number().int(), correct: z.boolean() })).default([]),
}).refine((v) => v.score <= v.total, { message: "score cannot exceed total" });
app.post("/api/attempts", { preHandler: auth }, async (request, reply) => {
  const parsed = attemptBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  const body = parsed.data;
  const student = await ownsStudent(body.studentId, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  const id = randomUUID();
  const saved = await pool.query(
    `INSERT INTO attempts(id,client_attempt_id,student_id,level_id,subject_id,topic_id,score,total,answers)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT(client_attempt_id) DO UPDATE SET client_attempt_id=EXCLUDED.client_attempt_id
     RETURNING id,created_at`,
    [id, body.clientAttemptId, student.id, body.levelId, body.subjectId, body.topicId, body.score, body.total, JSON.stringify(body.answers)],
  );
  return reply.code(201).send({ attempt: { id: saved.rows[0].id, ...body, createdAt: saved.rows[0].created_at } });
});

app.get("/api/students/:id/attempts", { preHandler: auth }, async (request: any, reply) => {
  const student = await ownsStudent(request.params.id, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  const { rows } = await pool.query(
    `SELECT id,level_id,subject_id,topic_id,score,total,answers,created_at
     FROM attempts WHERE student_id=$1 ORDER BY created_at DESC LIMIT 1000`,
    [student.id],
  );
  const questionHistory = await loadPracticeQuestionHistory(pool, student.id);
  return { attempts: rows, questionHistory };
});
app.get("/api/students/:id/progress", { preHandler: parentAuth }, async (request: any, reply) => {
  const student = await ownsStudent(request.params.id, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  const { rows } = await pool.query(
    `SELECT subject_id,topic_id,
      COUNT(*)::int AS sessions,
      SUM(score)::int AS correct,
      SUM(total)::int AS total,
      ROUND((SUM(score)::numeric / NULLIF(SUM(total),0))*100)::int AS mastery,
      MAX(created_at) AS last_attempt_at
     FROM attempts WHERE student_id=$1
     GROUP BY subject_id,topic_id ORDER BY subject_id,topic_id`,
    [student.id],
  );
  const summary = await pool.query(
    `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(score),0)::int AS correct,
      COALESCE(SUM(total),0)::int AS total
     FROM attempts WHERE student_id=$1`, [student.id],
  );
  return { student, summary: summary.rows[0], topics: rows };
});

const activeTutorRequests = new Set<string>();
app.post("/api/tutor", { preHandler: auth }, async (request, reply) => {
  const parsed = tutorBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const body = parsed.data;
  const student = await ownsStudent(body.studentId, userId(request));
  if (!student) return reply.code(404).send({ error: "STUDENT_NOT_FOUND" });
  // Client level is only a compatibility field. The stored profile owns this context.
  const levelId = student.level_id as string;
  const homework = body.homeworkId ? await new TuitionLearningRepository(pool).detail(userId(request),student.id,body.homeworkId) : undefined;
  if(homework && body.subjectId && homework.subjectId!==body.subjectId)return reply.code(400).send({error:"HOMEWORK_SUBJECT_MISMATCH"});
  if(homework)body.subjectId=homework.subjectId;
  // Keep homework conversation history isolated from other sources without sending family identity.
  if(homework)body.resourceId=`homework:${body.homeworkId}`;
  if (!allowAi(`tutor:${userId(request)}`, 30)) return reply.code(429).send({ error: "AI_TUTOR_RATE_LIMIT" });
  const scope = [student.id, body.conversationId ?? "legacy", body.subjectId, body.topicId, body.resourceId].join(":");
  if (activeTutorRequests.has(scope)) return reply.code(429).send({error:"AI_TUTOR_BUSY"});
  activeTutorRequests.add(scope);
  try {
    const priorTutor = await pool.query(
      `SELECT question,answer,provider FROM tutor_logs
       WHERE student_id=$1 AND subject_id IS NOT DISTINCT FROM $2
       AND topic_id IS NOT DISTINCT FROM $3 AND resource_id IS NOT DISTINCT FROM $4
       AND conversation_id IS NOT DISTINCT FROM $5::uuid
       AND created_at > now() - interval '2 hours'
       ORDER BY created_at DESC,id DESC LIMIT 12`,
      [student.id, body.subjectId ?? null, body.topicId ?? null, body.resourceId ?? null, body.conversationId ?? null],
    );
    const recent = await pool.query(
      `SELECT score,total FROM attempts WHERE student_id=$1 AND level_id=$2
       AND ($3::text IS NULL OR subject_id=$3)
       AND ($4::text IS NULL OR topic_id=$4)
       ORDER BY created_at DESC LIMIT 5`,
      [student.id,levelId,body.subjectId ?? null,body.topicId ?? null],
    );
    const recentPerformance = recent.rows.length
      ? `Rekod latihan konteks ini (bukan diagnosis): ${recent.rows.map((r:any)=>`${r.score}/${r.total}`).join("; ")}`
      : "Belum ada latihan direkodkan untuk konteks ini";
    const result = await guidedTutorReply({
      levelId, levelLabel:levelNames[levelId] ?? levelId,
      subjectId:body.subjectId,
      subjectLabel:body.subjectId ? subjectNames[body.subjectId] ?? body.subjectId : undefined,
      topicId:body.topicId, resourceId:homework?undefined:body.resourceId,
      ...(homework ? {homework:{id:homework.id,title:homework.title,instructions:homework.instructions,rubric:homework.rubric}}:{}),
      message:body.message, history:priorTutor.rows, recentPerformance,
      studentName:student.name,
    });
    await pool.query(
      `INSERT INTO tutor_logs(id,student_id,subject_id,topic_id,question,answer,provider,conversation_id,resource_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [randomUUID(),student.id,body.subjectId ?? null,body.topicId ?? null,
       body.message,result.answer,result.provider,body.conversationId ?? null,body.resourceId ?? null],
    );
    return result;
  } finally { activeTutorRequests.delete(scope); }
});

const ttsBody = z.object({
  text: z.string().trim().min(2).max(6000),
  language: z.enum(["ms","en"]).default("ms"),
  style: z.enum(["lesson","reading"]).default("reading"),
});
app.post("/api/tts", { preHandler: auth }, async (request, reply) => {
  if (!allowAi(`tts:${userId(request)}`, 20)) return reply.header("Retry-After", "60").code(429).send({ error: "AI_TTS_RATE_LIMIT", retryAfterSeconds: 60 });
  const parsed = ttsBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  if (!geminiConfigured()) return reply.code(503).send({ error: "AI_FREE_NOT_CONFIGURED" });
  try {
    const result = await generateGeminiSpeech(parsed.data);
    reply
      .header("X-IMAI-AI-Model", result.model)
      .header("X-IMAI-AI-Voice", result.voice)
      .header("X-IMAI-AI-Cache", result.cached ? "hit" : "miss")
      .header("Cache-Control", "no-store");
    return reply.type("audio/wav").send(result.audio);
  } catch (error) {
    request.log.error({ geminiError: error instanceof Error ? error.message : String(error) }, "Gemini Free TTS failed");
    const failure = classifyTtsError(error);
    if (failure.retryAfterSeconds) reply.header("Retry-After", String(failure.retryAfterSeconds));
    const status = failure.retryAfterSeconds ? 429 : failure.code === "TTS_TIMEOUT" ? 504 : failure.code === "TTS_NOT_CONFIGURED" ? 503 : 502;
    return reply.code(status).send({ error: failure.code, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) });
  }
});

registerFocusRoutes(app, pool, auth, parentAuth);
registerExamRoutes(app, pool, auth);
registerChallengeRoutes(app, pool, auth);
await migrate();
await migrateAccountRoles(pool);
await migrateFocusSessions();
await migrateExams(pool);
await migrateChallenges(pool);
await migrateFeedback(pool);
await migrateFeedbackTriage(pool);
await migrateTeacherNetwork(pool);
await migrateTeacherKyc(pool);
registerTeacherKycRoutes(app,new TeacherKycRepository(pool),superAdminAuth);
await verifyTeacherJoinCodeKey(pool);
await migrateTeacherContent(pool);
registerFeedbackRoutes(
  app,
  new PostgresFeedbackRepository(pool),
  parentAuth,
  superAdminAuth,
);
registerFeedbackTriageRoutes(app, new PostgresFeedbackTriageRepository(pool), superAdminAuth);
registerAdminUserRoutes(app, new PostgresAdminUserRepository(pool), superAdminAuth);
registerTeacherContentRoutes(app, new PostgresTeacherContentRepository(pool), { auth, teacherAuth, superAdminAuth });
registerTeacherNetworkRoutes(app, new PostgresTeacherNetworkRepository(pool,undefined,{requireKycReview:true}), { auth, parentAuth, teacherAuth, superAdminAuth });
await migrateTuitionBooking(pool);
registerTuitionBookingRoutes(app, new TuitionBookingRepository(pool), { auth, parentAuth, teacherAuth });
await migrateTuitionLearning(pool);
await migrateTuitionCommerce(pool);
await migrateTuitionPayouts(pool);
await migrateTuitionVideo(pool);
await migrateTuitionNotificationDelivery(pool);
await migrateWhatsAppDeliveryReceipts(pool);
registerWhatsAppReceiptRoutes(app,new TuitionWhatsAppReceiptRepository(pool));
await migrateTuitionRetention(pool);
registerTuitionReadinessRoutes(app,actor=>tuitionAdminReadiness(pool,actor),superAdminAuth);
registerTuitionRetentionRoutes(app,new TuitionRetentionRepository(pool),superAdminAuth);
const tuitionAdapters=(_channel?:string)=>null;
const tuitionDelivery=new TuitionNotificationDelivery(pool,tuitionAdapters);
const tuitionWorkerEnabled=false;
registerTuitionNotificationRoutes(app,tuitionDelivery,{auth,superAdminAuth},()=>({workerEnabled:tuitionWorkerEnabled,providerConfigured:!!tuitionAdapters("email")||!!tuitionAdapters("whatsapp")}));
registerTuitionVideoRoutes(app,new TuitionVideoRepository(pool),{auth,teacherAuth,superAdminAuth});
registerFreeStudyRoutes(app,{parentAuth,teacherAuth,superAdminAuth},()=>publicStudyPrivacy(pool));
registerTuitionLearningRoutes(app, new TuitionLearningRepository(pool), { auth, teacherAuth });
await app.listen({ host: process.env.API_HOST ?? "0.0.0.0", port });
let deliveryTask:Promise<void>|undefined;
const deliveryTimer=tuitionWorkerEnabled?setInterval(()=>{
  if(deliveryTask)return;
  deliveryTask=(async()=>{await tuitionDelivery.enqueue();for(let count=0;count<5;count++){const result=await tuitionDelivery.runOne();if(result.status==="idle"||result.status==="provider_unconfigured")break;}})()
    .catch(()=>{app.log.error({event:"tuition_delivery_worker_error"},"Notification worker requires review");})
    .finally(()=>{deliveryTask=undefined;});
},5000):undefined;
deliveryTimer?.unref();

const stop = async () => {
  if(deliveryTimer)clearInterval(deliveryTimer);
  await app.close();
  await deliveryTask;
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
