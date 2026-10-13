import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { bootstrapSuperAdmin } from "./bootstrapSuperAdmin.js";

function database(existing: any[] = []) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  return {
    calls,
    target: {
      async query(sql: string, values?: unknown[]) {
        calls.push({ sql, values });
        if (sql.startsWith("SELECT id,role")) return { rows: existing };
        return { rows: [], rowCount: 1 };
      },
    },
  };
}

describe("super-admin bootstrap", () => {
  it("creates a new account with a bcrypt hash and never puts the password in SQL", async () => {
    const db = database();
    const readPassword = vi.fn(async () => "SYNTHETIC_PRIVATE_PASSWORD");
    await expect(bootstrapSuperAdmin(db.target, {
      email: " ADMIN@EXAMPLE.TEST ", mode: "create", readPassword,
    })).resolves.toBe("created");
    const insert = db.calls.find(call => call.sql.startsWith("INSERT INTO users"));
    expect(insert).toBeDefined();
    expect(insert?.sql).not.toContain("SYNTHETIC_PRIVATE_PASSWORD");
    expect(insert?.values?.[1]).toBe("admin@example.test");
    expect(insert?.values?.[3]).toBe("Super Admin");
    expect(await bcrypt.compare("SYNTHETIC_PRIVATE_PASSWORD", String(insert?.values?.[2]))).toBe(true);
    expect(db.calls.some(call => call.sql.includes("INSERT INTO user_roles"))).toBe(true);
    expect(db.calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("fails on an existing account before reading a password", async () => {
    const db = database([{ id: "existing", role: "parent" }]);
    const readPassword = vi.fn(async () => "SHOULD_NOT_BE_READ");
    await expect(bootstrapSuperAdmin(db.target, {
      email: "admin@example.test", mode: "create", readPassword,
    })).rejects.toThrow("Account already exists");
    expect(readPassword).not.toHaveBeenCalled();
    expect(db.calls.some(call => call.sql.startsWith("UPDATE") || call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("promotes an existing account without reading or replacing its password", async () => {
    const db = database([{ id: "existing", role: "parent" }]);
    const readPassword = vi.fn(async () => "SHOULD_NOT_BE_READ");
    await expect(bootstrapSuperAdmin(db.target, {
      email: "admin@example.test", mode: "promote", readPassword,
    })).resolves.toBe("promoted");
    expect(readPassword).not.toHaveBeenCalled();
    expect(db.calls.find(call => call.sql.startsWith("UPDATE users"))).toEqual({
      sql: "UPDATE users SET role='super_admin',updated_at=now() WHERE id=$1",
      values: ["existing"],
    });
    expect(db.calls.some(call => call.sql.includes("INSERT INTO user_roles"))).toBe(true);
    expect(db.calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("repairs a missing active role for an account already marked as super admin", async () => {
    const db = database([{ id: "existing", role: "super_admin" }]);
    await expect(bootstrapSuperAdmin(db.target, {
      email: "admin@example.test", mode: "promote", readPassword: vi.fn(),
    })).resolves.toBe("already_super_admin");
    expect(db.calls.some(call => call.sql.startsWith("UPDATE users"))).toBe(false);
    expect(db.calls.some(call => call.sql.includes("INSERT INTO user_roles"))).toBe(true);
    expect(db.calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("does not create an account when promotion mode has no match", async () => {
    const db = database();
    await expect(bootstrapSuperAdmin(db.target, {
      email: "missing@example.test", mode: "promote", readPassword: vi.fn(),
    })).rejects.toThrow("Promotion mode requires an existing account");
    expect(db.calls).toHaveLength(1);
  });
});
