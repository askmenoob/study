import { describe, expect, it } from "vitest";
import { isTeacherSubjectForLevel, migrateTeacherContent, PostgresTeacherContentRepository } from "./teacherContentStore.js";

describe("teacher content policy", () => {
  it("keeps primary subject combinations aligned with the current curriculum", () => {
    expect(isTeacherSubjectForLevel("d1", "bm")).toBe(true);
    expect(isTeacherSubjectForLevel("d1", "history")).toBe(false);
    expect(isTeacherSubjectForLevel("d4", "history")).toBe(true);
  });

  it("creates immutable, idempotent, moderated and grade-indexed storage", async () => {
    let sql = "";
    await migrateTeacherContent({ query: async (value: string) => { sql = value; return { rows: [] }; } } as any);
    expect(sql).toContain("UNIQUE(teacher_id, client_request_id)");
    expect(sql).toContain("CHECK (rights_attested)");
    expect(sql).toContain("CHECK (privacy_attested)");
    expect(sql).toContain("status IN ('pending','published','rejected','withdrawn')");
    expect(sql).toContain("verified_teacher_auto");
    expect(sql).toContain("publication_source");
    expect(sql).toContain("WHERE status='published'");
    expect(sql).not.toContain("password_hash");
  });

  it("rejects a teacher without a live verified class before inserting", async () => {
    const calls: string[] = [];
    const client = { query: async (sql: string) => {
      calls.push(sql);
      if (sql.startsWith("SELECT display_name")) return { rows: [{ display_name: "Cikgu", email: "guru@example.test" }] };
      return { rows: [] };
    }, release() { calls.push("RELEASE"); } };
    const pool = { connect: async () => client } as any;
    const repository = new PostgresTeacherContentRepository(pool);
    await expect(repository.createMaterial("teacher", {
      clientRequestId: "33333333-3333-4333-8333-333333333333", levelId: "d2", subjectId: "math", kind: "note",
      title: "Tambah nombor mudah", summary: "Nota ringkas nombor untuk murid.", body: "Mulakan dengan nilai tempat sebelum menambah nombor.", rightsAttested: true, privacyAttested: true,
    })).rejects.toMatchObject({ code: "TEACHER_SCOPE_REQUIRED", statusCode: 403 });
    expect(calls.some((sql) => sql.includes("teacher_profiles"))).toBe(true);
    expect(calls.some((sql) => sql.startsWith("INSERT"))).toBe(false);
    expect(calls.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
  });

  it("limits hourly or unreviewed submissions before inserting", async () => {
    const calls: string[] = [];
    const client = { query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes("FROM users u JOIN teacher_profiles")) return { rows: [{ display_name: "Cikgu", public_name: "Cikgu", email: "guru@example.test", class_name: "2 Bestari", school_name: "SK Bestari", level_id: "d2", subject_id: "math" }] };
      if (sql.startsWith("SELECT * FROM teacher_materials")) return { rows: [] };
      if (sql.includes("hourly_count")) return { rows: [{ hourly_count: 20, unreviewed_count: 3 }] };
      return { rows: [] };
    }, release() { calls.push("RELEASE"); } };
    const repository = new PostgresTeacherContentRepository({ connect: async () => client } as any);
    await expect(repository.createMaterial("teacher", {
      clientRequestId: "33333333-3333-4333-8333-333333333333", classId: "44444444-4444-4444-8444-444444444444", levelId: "d2", subjectId: "math", kind: "note",
      title: "Tambah nombor mudah", summary: "Nota ringkas nombor untuk murid.", body: "Mulakan dengan nilai tempat sebelum menambah nombor.", rightsAttested: true, privacyAttested: true,
    })).rejects.toMatchObject({ code: "MATERIAL_RATE_LIMIT", statusCode: 429 });
    expect(calls.some((sql) => sql.startsWith("INSERT"))).toBe(false);
  });

  it("auto-publishes once for an active verified teacher and keeps retries idempotent", async () => {
    const calls: Array<{ sql: string; values?: unknown[] }> = [];
    const input = {
      clientRequestId: "33333333-3333-4333-8333-333333333333", classId: "44444444-4444-4444-8444-444444444444", levelId: "d1" as const, subjectId: "bm" as const, kind: "note" as const,
      title: "Mengenal suku kata", summary: "Nota ringkas untuk murid Darjah 1.", body: "Baca suku kata ini dengan perlahan dan jelas.", rightsAttested: true as const, privacyAttested: true as const,
    };
    let stored: any;
    const client = { query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes("FROM users u JOIN teacher_profiles")) return { rows: [{ display_name: "Guru", public_name: "Cikgu Siti", email: "guru@example.test", class_name: "1 Bestari", school_name: "SK Bestari", level_id: "d1", subject_id: "bm" }] };
      if (sql.startsWith("SELECT * FROM teacher_materials")) return { rows: stored ? [stored] : [] };
      if (sql.includes("hourly_count")) return { rows: [{ hourly_count: 0, unreviewed_count: 0 }] };
      if (sql.includes("INSERT INTO teacher_materials")) {
        stored = { id: "22222222-2222-4222-8222-222222222222", teacher_id: "teacher", class_id: input.classId, client_request_id: input.clientRequestId,
          level_id: input.levelId, subject_id: input.subjectId, kind: input.kind, title: input.title, summary: input.summary, body: input.body,
          rights_attested: true, privacy_attested: true, status: "published", publication_source: "verified_teacher_auto",
          created_at: "2026-09-12T00:00:00.000Z", published_at: "2026-09-12T00:00:00.000Z" };
        return { rows: [stored] };
      }
      return { rows: [] };
    }, release() {} };
    const repository = new PostgresTeacherContentRepository({ connect: async () => client } as any);
    const first = await repository.createMaterial("teacher", input);
    const replay = await repository.createMaterial("teacher", input);
    expect(first).toMatchObject({ id: replay.id, status: "published", publicationSource: "verified_teacher_auto" });
    expect(first.publishedAt).toBeTruthy();expect(first.reviewedAt).toBeUndefined();
    expect(calls.filter(({ sql }) => sql.includes("INSERT INTO teacher_network_audit")).length).toBe(1);
    expect(calls.filter(({ sql }) => sql.includes("INSERT INTO teacher_materials")).length).toBe(1);
  });

  it("derives the published material level from the owned student row", async () => {
    const calls: Array<{ sql: string; values?: unknown[] }> = [];
    const pool = { query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (calls.length === 1) return { rows: [{ level_id: "d1" }] };
      return { rows: [{
        id: "22222222-2222-4222-8222-222222222222", teacher_id: "teacher", client_request_id: "33333333-3333-4333-8333-333333333333",
        teacher_name: "Cikgu", teacher_email: "private@example.test", level_id: "d1", subject_id: "bm", kind: "note",
        title: "Mengenal suku kata", summary: "Nota ringkas untuk murid Darjah 1.", body: "Baca suku kata dengan perlahan dan jelas.",
        rights_attested: true, privacy_attested: true, status: "published", created_at: "2026-09-12T00:00:00Z", published_at: "2026-09-12T01:00:00Z",
      }] };
    } } as any;
    const repository = new PostgresTeacherContentRepository(pool);
    const result = await repository.listPublishedForStudent("student-id", "parent-id");
    expect(calls[0].values).toEqual(["student-id", "parent-id"]);
    expect(calls[1].values).toEqual(["student-id"]);
    expect(calls[1].sql).toContain("m.status='published'");
    expect(calls[1].sql).toContain("class_enrollments");
    expect(result?.[0]).toMatchObject({ levelId: "d1", status: "published" });
  });
});
