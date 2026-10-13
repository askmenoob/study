import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { migrateAccountRoles } from "./accountRoles.js";

type Queryable = { query(sql: string, values?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }> };
type BootstrapMode = "create" | "promote";

export type BootstrapOptions = {
  email: string;
  mode: BootstrapMode;
  readPassword: () => Promise<string>;
};

export async function bootstrapSuperAdmin(target: Queryable, options: BootstrapOptions) {
  const email = z.string().trim().email().transform(value => value.toLowerCase()).parse(options.email);
  const existing = await target.query(
    "SELECT id,role FROM users WHERE lower(email)=lower($1) ORDER BY id LIMIT 2",
    [email],
  );
  if (existing.rows.length > 1) throw new Error("More than one case-insensitive account matches this email; resolve it manually.");

  if (options.mode === "promote") {
    if (!existing.rows[0]) throw new Error("Promotion mode requires an existing account.");
    const alreadySuperAdmin = existing.rows[0].role === "super_admin";
    await target.query("BEGIN");
    try {
      if (!alreadySuperAdmin) {
        await target.query("UPDATE users SET role='super_admin',updated_at=now() WHERE id=$1", [existing.rows[0].id]);
      }
      await target.query(
        `INSERT INTO user_roles(user_id,role,status,granted_at,revoked_at)
         VALUES($1,'super_admin','active',now(),NULL)
         ON CONFLICT (user_id,role) DO UPDATE SET status='active',granted_at=now(),revoked_at=NULL`,
        [existing.rows[0].id],
      );
      await target.query("COMMIT");
    } catch (error) {
      await target.query("ROLLBACK");
      throw error;
    }
    return alreadySuperAdmin ? "already_super_admin" as const : "promoted" as const;
  }

  if (existing.rows[0]) {
    throw new Error("Account already exists. Use SUPER_ADMIN_PROMOTE_EXISTING=true to promote it without changing its password.");
  }
  const password = await options.readPassword();
  if (password.length < 8 || password.length > 128) throw new Error("Password must contain 8 to 128 characters.");
  const passwordHash = await bcrypt.hash(password, 12);
  const id = randomUUID();
  await target.query("BEGIN");
  try {
    await target.query(
      `INSERT INTO users(id,email,password_hash,display_name,role)
       VALUES($1,$2,$3,$4,'super_admin')`,
      [id, email, passwordHash, "Super Admin"],
    );
    await target.query(
      `INSERT INTO user_roles(user_id,role,status,granted_at,revoked_at)
       VALUES($1,'super_admin','active',now(),NULL)`,
      [id],
    );
    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  }
  return "created" as const;
}

async function passwordFromFile(path: string) {
  const absolutePath = resolve(path);
  const metadata = await stat(absolutePath);
  if (!metadata.isFile() || metadata.size > 1024) throw new Error("SUPER_ADMIN_PASSWORD_FILE must be a small regular file.");
  if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0) {
    throw new Error("SUPER_ADMIN_PASSWORD_FILE must not be readable or writable by group/other users.");
  }
  return (await readFile(absolutePath, "utf8")).replace(/\r?\n$/u, "");
}

async function hiddenPasswordPrompt() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Set SUPER_ADMIN_PASSWORD_FILE or run this script in a private interactive terminal.");
  }
  process.stderr.write("Super admin password (input hidden): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let password = "";
  try {
    return await new Promise<string>((resolvePassword, reject) => {
      const onData = (chunk: string) => {
        for (const character of chunk) {
          if (character === "\u0003") {
            cleanup();
            reject(new Error("Cancelled."));
            return;
          }
          if (character === "\r" || character === "\n") {
            cleanup();
            resolvePassword(password);
            return;
          }
          if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
          else password += character;
        }
      };
      const cleanup = () => process.stdin.off("data", onData);
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stderr.write("\n");
  }
}

async function main() {
  if (process.argv.length > 2) throw new Error("This script accepts no command-line arguments, especially no passwords.");
  if (process.env.SUPER_ADMIN_PASSWORD) throw new Error("SUPER_ADMIN_PASSWORD is not accepted; use a protected file or hidden input.");
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) throw new Error("SUPER_ADMIN_EMAIL is required.");
  const mode: BootstrapMode = process.env.SUPER_ADMIN_PROMOTE_EXISTING === "true" ? "promote" : "create";
  const passwordPath = process.env.SUPER_ADMIN_PASSWORD_FILE;
  const readPassword = () => passwordPath ? passwordFromFile(passwordPath) : hiddenPasswordPrompt();
  const database = await import("./db.js");
  try {
    await database.migrate();
    await migrateAccountRoles(database.pool);
    const outcome = await bootstrapSuperAdmin(database.pool, { email, mode, readPassword });
    process.stdout.write(`Super admin ${outcome}.\n`);
  } finally {
    await database.closeDb();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : "Bootstrap failed."}\n`);
    process.exitCode = 1;
  });
}
