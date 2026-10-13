import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { FamilySession } from "./familyAccess.js";
import {
  FeedbackRateLimitError,
  FeedbackRequestConflictError,
  feedbackCategories,
  feedbackReferenceId,
  type FeedbackRecord,
  type FeedbackRepository,
} from "./feedbackStore.js";

type Guard = (request: any) => Promise<void>;

const feedbackBody = z.object({
  clientRequestId: z.string().uuid(),
  category: z.enum(feedbackCategories),
  message: z.string().trim().min(10).max(2000),
  pagePath: z.string().trim().max(300).regex(/^\/(?!\/)/u).optional(),
  allowReply: z.boolean(),
}).strict();

function receipt(feedback: FeedbackRecord) {
  return {
    id: feedback.id,
    referenceId: feedbackReferenceId(feedback.id),
  };
}

function adminView(feedback: FeedbackRecord) {
  return {
    id: feedback.id,
    referenceId: feedbackReferenceId(feedback.id),
    category: feedback.category,
    message: feedback.message,
    pagePath: feedback.pagePath,
    allowReply: feedback.allowReply,
    parentEmail: feedback.parentEmail,
    parentDisplayName: feedback.parentDisplayName,
    createdAt: feedback.createdAt,
  };
}

export function registerFeedbackRoutes(
  app: FastifyInstance,
  repository: FeedbackRepository,
  parentAuth: Guard,
  superAdminAuth: Guard,
) {
  app.post("/api/feedback", { preHandler: parentAuth }, async (request, reply) => {
    const parsed = feedbackBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", details: parsed.error.flatten() });

    let saved;
    try {
      saved = await repository.createOrGet((request.user as FamilySession).sub, parsed.data);
    } catch (error) {
      if (error instanceof FeedbackRequestConflictError) {
        return reply.code(409).send({ error: error.code });
      }
      if (error instanceof FeedbackRateLimitError) {
        return reply.header("Retry-After", String(error.retryAfterSeconds)).code(429).send({ error: error.code });
      }
      throw error;
    }

    return reply.code(saved.created ? 201 : 200).send({ feedback: receipt(saved.feedback) });
  });

  app.get("/api/admin/feedback", { preHandler: superAdminAuth }, async (request, reply) => {
    const parsed = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    return { feedback: (await repository.list(parsed.data.limit)).map(adminView) };
  });
}
