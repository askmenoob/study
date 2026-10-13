import type { Pool } from "pg";

export type AdminUserSummary = {
  email: string;
  role: "parent" | "teacher" | "super_admin";
  createdAt: string;
};

export type AdminUserPage = {
  users: AdminUserSummary[];
  total: number;
  nextCursor: string | null;
};

export type AdminUserCursor = { createdAt: string; id: string };

export interface AdminUserRepository {
  list(limit: number, cursor?: AdminUserCursor): Promise<AdminUserPage>;
}

function encodeCursor(row: { created_at: unknown; id: unknown }) {
  return Buffer.from(JSON.stringify({ createdAt: new Date(row.created_at as any).toISOString(), id: row.id }), "utf8").toString("base64url");
}

export class PostgresAdminUserRepository implements AdminUserRepository {
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async list(limit: number, cursor?: AdminUserCursor): Promise<AdminUserPage> {
    const result = await this.pool.query(
      `WITH page AS (
         SELECT id,email,role,created_at
         FROM users
         ${cursor ? "WHERE (created_at,id) < ($2::timestamptz,$3::uuid)" : ""}
         ORDER BY created_at DESC,id DESC
         LIMIT $1
       ), totals AS (
         SELECT COUNT(*)::int AS total FROM users
       )
       SELECT page.id,page.email,page.role,page.created_at,totals.total
       FROM totals LEFT JOIN page ON true
       ORDER BY page.created_at DESC,page.id DESC`,
      cursor ? [limit + 1, cursor.createdAt, cursor.id] : [limit + 1],
    );
    const pageRows = result.rows.filter((row: any) => row.id);
    const visibleRows = pageRows.slice(0, limit);
    return {
      users: visibleRows.map((row: any) => ({
        email: row.email,
        role: row.role,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      total: Number(result.rows[0]?.total ?? 0),
      nextCursor: pageRows.length > limit && visibleRows.length ? encodeCursor(visibleRows[visibleRows.length - 1]) : null,
    };
  }
}
