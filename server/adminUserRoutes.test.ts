import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { accessError } from "./familyAccess.js";
import { registerAdminUserRoutes } from "./adminUserRoutes.js";
import type { AdminUserCursor, AdminUserPage, AdminUserRepository } from "./adminUserStore.js";

class MemoryAdminUserRepository implements AdminUserRepository {
  calls: Array<{ limit: number; cursor?: AdminUserCursor }> = [];
  fail = false;

  async list(limit: number, cursor?: AdminUserCursor): Promise<AdminUserPage> {
    this.calls.push({ limit, cursor });
    if (this.fail) throw new Error("database details must not reach the client");
    return {
      users: [{ email: "parent@example.test", role: "parent", createdAt: "2026-09-12T00:00:00.000Z" }],
      total: 1,
      nextCursor: null,
    };
  }
}

function buildApi(repository: MemoryAdminUserRepository) {
  const app = Fastify({ logger: false });
  const superAdminAuth = async (request: any) => {
    if (request.headers["x-test-role"] !== "super_admin") throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
  };
  registerAdminUserRoutes(app, repository, superAdminAuth);
  return app;
}

describe("super-admin user directory route", () => {
  it("returns only the paginated safe user summary to a super admin", async () => {
    const repository = new MemoryAdminUserRepository();
    const app = buildApi(repository);
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/users?limit=25",
      headers: { "x-test-role": "super_admin" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      users: [{ email: "parent@example.test", role: "parent", createdAt: "2026-09-12T00:00:00.000Z" }],
      total: 1,
      nextCursor: null,
    });
    expect(JSON.stringify(response.json())).not.toContain("password");
    expect(repository.calls).toEqual([{ limit: 25, cursor: undefined }]);
    await app.close();
  });

  it("rejects non-admin access and invalid pagination", async () => {
    const repository = new MemoryAdminUserRepository();
    const app = buildApi(repository);
    expect((await app.inject({ method: "GET", url: "/api/admin/users", headers: { "x-test-role": "parent" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/admin/users?limit=101", headers: { "x-test-role": "super_admin" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/admin/users?cursor=not-a-cursor", headers: { "x-test-role": "super_admin" } })).statusCode).toBe(400);
    expect(repository.calls).toEqual([]);
    await app.close();
  });

  it("decodes an opaque cursor and hides database error details", async () => {
    const repository = new MemoryAdminUserRepository();
    const app = buildApi(repository);
    const cursor = Buffer.from(JSON.stringify({ createdAt: "2026-09-12T00:00:00.000Z", id: "11111111-1111-4111-8111-111111111111" })).toString("base64url");
    const response = await app.inject({ method: "GET", url: `/api/admin/users?cursor=${cursor}`, headers: { "x-test-role": "super_admin" } });
    expect(response.statusCode).toBe(200);
    expect(repository.calls[0]).toEqual({ limit: 25, cursor: { createdAt: "2026-09-12T00:00:00.000Z", id: "11111111-1111-4111-8111-111111111111" } });

    repository.fail = true;
    const failed = await app.inject({ method: "GET", url: "/api/admin/users", headers: { "x-test-role": "super_admin" } });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(failed.body).not.toContain("database details");
    await app.close();
  });
});
