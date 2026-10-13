import type { Pool } from "pg";

export const accountRoles = ["parent", "teacher", "super_admin"] as const;
export type AccountRole = typeof accountRoles[number];

export async function migrateAccountRoles(target: Pick<Pool, "query">) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('parent','teacher','super_admin')),
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
      granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      PRIMARY KEY (user_id, role)
    );
    CREATE INDEX IF NOT EXISTS user_roles_active_idx ON user_roles(user_id, role) WHERE status='active';
    INSERT INTO user_roles(user_id,role,status)
      SELECT id,role,'active' FROM users
      WHERE role IN ('parent','teacher','super_admin')
      ON CONFLICT(user_id,role) DO NOTHING;
  `);
}

export async function listActiveRoles(target: Pick<Pool, "query">, userId: string): Promise<AccountRole[]> {
  const { rows } = await target.query(
    `SELECT role FROM user_roles WHERE user_id=$1 AND status='active'
     ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'parent' THEN 2 ELSE 3 END`,
    [userId],
  );
  return rows.map((row: { role: AccountRole }) => row.role);
}

export async function hasActiveRole(target: Pick<Pool, "query">, userId: string, role: AccountRole) {
  const { rows } = await target.query(
    "SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2 AND status='active'",
    [userId, role],
  );
  return Boolean(rows[0]);
}

export function defaultAccountRole(roles: AccountRole[]): AccountRole {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("parent")) return "parent";
  if (roles.includes("teacher")) return "teacher";
  return "parent";
}
