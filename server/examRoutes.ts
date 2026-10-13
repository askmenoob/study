import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import type { ExamPrivatePaper } from "./examContracts.js";
import { EXAM_PAPERS } from "./examCatalog.js";
import { accessError, assertSession } from "./familyAccess.js";
import { ExamService } from "./examStore.js";

const uuid = z.string().uuid();
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/).refine(v => !["constructor", "prototype", "__proto__"].includes(v));
const revision = z.number().int().min(0).max(2147483646);
const answer = z.object({ value: z.string().max(200), unit: z.string().max(40).optional(), working: z.string().max(12000).optional() }).strict();
const answers = z.record(id, answer).refine(v => Object.keys(v).length <= 100);
const create = z.object({ studentId: uuid, paperId: id, paperVersion: z.number().int().positive(), mode: z.enum(["guided", "simulation"]), clientAttemptId: uuid, retryOfAttemptId: uuid.optional() }).strict();
const save = z.object({ expectedRevision: revision, answers }).strict();
const check = z.object({ expectedRevision: revision, questionId: id, answer }).strict();
const submit = z.object({ expectedRevision: revision }).strict();
const selfMark = z.object({ expectedRevision: revision, marks: z.record(id, z.record(id, z.boolean()).refine(v => Object.keys(v).length <= 20)).refine(v => Object.keys(v).length > 0 && Object.keys(v).length <= 100) }).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw accessError("INVALID_INPUT", 400); return result.data; }

export function registerExamRoutes(app: FastifyInstance, pool: Pool, auth: (request: any) => Promise<void>, options: { papers?: ExamPrivatePaper[]; preview?: boolean; clock?: () => number } = {}) {
  const service = new ExamService(pool, options.papers ?? EXAM_PAPERS, options.preview ?? process.env.EXAM_PREVIEW === "true", options.clock);
  const guard = async (request: any) => { await auth(request); assertSession(request.user); };
  app.get("/api/exam/papers", { preHandler: guard }, async (request: any) => service.catalogue(request.user, parse(z.object({ studentId: uuid }).strict(), request.query).studentId));
  app.post("/api/exam/attempts", { preHandler: guard }, async (request: any, reply) => {
    const attempt = await service.create(request.user, parse(create, request.body));
    return reply.code(201).send({ attempt });
  });
  app.get("/api/exam/attempts/:attemptId", { preHandler: guard }, async (request: any) => ({ attempt: await service.get(request.user, parse(uuid, request.params.attemptId)) }));
  app.put("/api/exam/attempts/:attemptId", { preHandler: guard }, async (request: any) => ({ attempt: await service.mutate(request.user, parse(uuid, request.params.attemptId), { kind: "save", ...parse(save, request.body) }) }));
  app.post("/api/exam/attempts/:attemptId/check", { preHandler: guard }, async (request: any) => ({ attempt: await service.mutate(request.user, parse(uuid, request.params.attemptId), { kind: "check", ...parse(check, request.body) }) }));
  app.post("/api/exam/attempts/:attemptId/submit", { preHandler: guard }, async (request: any) => ({ attempt: await service.mutate(request.user, parse(uuid, request.params.attemptId), { kind: "submit", ...parse(submit, request.body) }) }));
  app.post("/api/exam/attempts/:attemptId/self-mark", { preHandler: guard }, async (request: any) => ({ attempt: await service.mutate(request.user, parse(uuid, request.params.attemptId), { kind: "self-mark", ...parse(selfMark, request.body) }) }));
  return service;
}
