import { describe, expect, it } from "vitest";
import { PostgresAdminUserRepository } from "./adminUserStore.js";

describe("Postgres super-admin user directory", () => {
  it("selects only safe account fields with stable pagination", async () => {
    const query = async (sql: string, values?: unknown[]) => {
      expect(sql).toContain("SELECT id,email,role,created_at");
      expect(sql).not.toContain("password_hash");
      expect(sql).toContain("ORDER BY created_at DESC,id DESC");
      expect(values).toEqual([26]);
      return { rows: [{ id: "11111111-1111-4111-8111-111111111111", email: "parent@example.test", role: "parent", created_at: "2026-09-12T00:00:00Z", total: 4 }] };
    };
    const repository = new PostgresAdminUserRepository({ query } as any);

    await expect(repository.list(25)).resolves.toEqual({
      users: [{ email: "parent@example.test", role: "parent", createdAt: "2026-09-12T00:00:00.000Z" }],
      total: 4,
      nextCursor: null,
    });
  });

  it("uses the last visible tuple as the cursor without skipping equal timestamps", async () => {
    let call = 0;
    const rows = [
      { id: "33333333-3333-4333-8333-333333333333", email: "newest@example.test", role: "parent", created_at: "2026-09-12T01:00:00Z", total: 3 },
      { id: "22222222-2222-4222-8222-222222222222", email: "same-time@example.test", role: "parent", created_at: "2026-09-12T01:00:00Z", total: 3 },
      { id: "11111111-1111-4111-8111-111111111111", email: "older@example.test", role: "parent", created_at: "2026-09-11T01:00:00Z", total: 3 },
    ];
    const query = async (sql: string, values?: unknown[]) => {
      call += 1;
      if (call === 1) {
        expect(values).toEqual([3]);
        return { rows };
      }
      expect(sql).toContain("WHERE (created_at,id) < ($2::timestamptz,$3::uuid)");
      expect(values).toEqual([3, "2026-09-12T01:00:00.000Z", "22222222-2222-4222-8222-222222222222"]);
      return { rows: [rows[2]] };
    };
    const repository = new PostgresAdminUserRepository({ query } as any);

    const first = await repository.list(2);
    expect(first.users.map((user) => user.email)).toEqual(["newest@example.test", "same-time@example.test"]);
    expect(first.nextCursor).not.toBeNull();
    const cursor = JSON.parse(Buffer.from(first.nextCursor!, "base64url").toString("utf8"));
    expect(cursor).toEqual({ createdAt: "2026-09-12T01:00:00.000Z", id: "22222222-2222-4222-8222-222222222222" });

    const second = await repository.list(2, cursor);
    expect(second.users.map((user) => user.email)).toEqual(["older@example.test"]);
    expect(second.nextCursor).toBeNull();
  });
});
