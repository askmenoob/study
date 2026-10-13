import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminUserRepository } from "./adminUserStore.js";

type Guard = (request: any) => Promise<void>;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).max(512).optional(),
}).strict();

const cursorSchema = z.object({ createdAt: z.string().datetime({ offset: true }), id: z.string().uuid() }).strict();

function decodeCursor(value?: string) {
  if (!value) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export function registerAdminUserRoutes(
  app: FastifyInstance,
  repository: AdminUserRepository,
  superAdminAuth: Guard,
) {
  app.get("/api/admin/users", { preHandler: superAdminAuth }, async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const cursor = decodeCursor(parsed.data.cursor);
    if (cursor === null) return reply.code(400).send({ error: "INVALID_INPUT" });
    try {
      return await repository.list(parsed.data.limit, cursor);
    } catch (error) {
      request.log.error({ err: error }, "Super-admin user directory failed");
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    }
  });
}
