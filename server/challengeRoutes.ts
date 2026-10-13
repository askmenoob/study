import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import type { ChallengeGenerator } from "./challengeContracts.js";
import { accessError, assertSession } from "./familyAccess.js";
import { ChallengeService, type ChallengeSubject } from "./challengeStore.js";
import { generateChallenge, challengeSubjects } from "./challengeGenerator.js";
const uuid = z.string().uuid();
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/).refine(v => !["constructor","prototype","__proto__"].includes(v));
const revision = z.number().int().min(0).max(2147483646), index = z.number().int().min(0).max(39);
const studentQuery = z.object({ studentId: uuid }).strict();
const create = z.object({ studentId: uuid, subjectId: id, requestId: uuid }).strict();
const answer = z.object({ expectedRevision: revision, index, selected: z.number().int().min(0).max(3), requestId: uuid }).strict();
const hint = z.object({ expectedRevision: revision, index, requestId: uuid }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw accessError("INVALID_INPUT",400); return result.data; }
export function registerChallengeRoutes(app: FastifyInstance, pool: Pool, auth: (request: any) => Promise<void>, options: { generator?: ChallengeGenerator; subjects?: ChallengeSubject[]; clock?: () => number } = {}) {
  const service = new ChallengeService(pool, options.generator ?? generateChallenge, options.subjects ?? challengeSubjects(), options.clock);
  const guard = async (request: any) => { await auth(request); assertSession(request.user); };
  app.get("/api/challenges", { preHandler: guard }, async (request: any) => service.overview(request.user,parse(studentQuery,request.query).studentId));
  app.get("/api/challenges/ranking", { preHandler: guard }, async (request: any) => { const q = parse(z.object({ studentId: uuid, subjectId: id }).strict(),request.query); return service.ranking(request.user,q.studentId,q.subjectId); });
  app.get("/api/challenges/report", { preHandler: guard }, async (request: any) => service.report(request.user,parse(studentQuery,request.query).studentId));
  app.post("/api/challenges", { preHandler: guard }, async (request: any, reply) => reply.code(201).send({ session: await service.create(request.user,parse(create,request.body)) }));
  app.get("/api/challenges/:sessionId", { preHandler: guard }, async (request: any) => ({ session: await service.get(request.user,parse(uuid,request.params.sessionId)) }));
  app.post("/api/challenges/:sessionId/answer", { preHandler: guard }, async (request: any) => ({ session: await service.mutate(request.user,parse(uuid,request.params.sessionId),{ kind: "answer", ...parse(answer,request.body) }) }));
  app.post("/api/challenges/:sessionId/hint", { preHandler: guard }, async (request: any) => ({ session: await service.mutate(request.user,parse(uuid,request.params.sessionId),{ kind: "hint", ...parse(hint,request.body) }) }));
  return service;
}
