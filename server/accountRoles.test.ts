import { describe, expect, it } from "vitest";
import { listActiveRoles, migrateAccountRoles } from "./accountRoles.js";

describe("account roles", () => {
  it("backfills a multi-role compatibility table without storing credentials", async () => {
    let sql = "";
    await migrateAccountRoles({ query: async (value: string) => { sql = value; return { rows: [] }; } } as any);
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS user_roles");
    expect(sql).toContain("PRIMARY KEY (user_id, role)");
    expect(sql).toContain("SELECT id,role,'active' FROM users");
    expect(sql).not.toContain("password_hash");
  });

  it("returns only live roles from the database", async () => {
    const target = { query: async (_sql: string, values: unknown[]) => {
      expect(values).toEqual(["user-id"]); return { rows: [{ role: "parent" }, { role: "teacher" }] };
    } } as any;
    await expect(listActiveRoles(target,"user-id")).resolves.toEqual(["parent","teacher"]);
  });
});
