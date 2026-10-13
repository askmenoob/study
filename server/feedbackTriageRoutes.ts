import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FeedbackTriageError, type PostgresFeedbackTriageRepository } from "./feedbackTriageStore.js";

type Guard = (request: any) => Promise<void>;
const statuses = ["open","in_review","resolved"] as const;
const reviewBody = z.object({
  status: z.enum(statuses),
  expectedVersion: z.number().int().min(0).max(2147483646),
  note: z.string().trim().max(500).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "resolved" && (!value.note || value.note.length < 5))
    ctx.addIssue({ code: "custom", path: ["note"], message: "Resolution note required" });
});
export function registerFeedbackTriageRoutes(
  app: FastifyInstance, repository: PostgresFeedbackTriageRepository, superAdminAuth: Guard,
) {
  app.get("/api/admin/feedback-triage", { preHandler: superAdminAuth }, async (request: any, reply) => {
    const parsed = z.object({ status: z.enum(statuses).optional() }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    reply.header("Cache-Control","private, no-store").header("Vary","Authorization");
    try { return { feedback: await repository.list(parsed.data.status) }; }
    catch (error) { request.log.error({ err: error },"Feedback triage list failed"); return reply.code(500).send({ error: "INTERNAL_ERROR" }); }
  });
  app.patch("/api/admin/feedback-triage/:id", { preHandler: superAdminAuth }, async (request: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).strict().safeParse(request.params);
    const body = reviewBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    reply.header("Cache-Control","private, no-store").header("Vary","Authorization");
    try {
      const feedback = await repository.update(params.data.id,request.user.sub,body.data.status,body.data.expectedVersion,body.data.note);
      return { feedback };
    } catch (error) {
      if (error instanceof FeedbackTriageError) return reply.code(error.statusCode).send({ error: error.code });
      request.log.error({ err: error },"Feedback triage update failed");
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    }
  });
}
