import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { accessError } from "./familyAccess.js";

export const teacherLevelIds = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
export const teacherSubjectIds = ["bm", "en", "math", "science", "history", "islam", "moral"] as const;
export const teacherMaterialKinds = ["note", "reading"] as const;
export const teacherMaterialStatuses = ["pending", "published", "rejected", "withdrawn"] as const;

export type TeacherLevelId = typeof teacherLevelIds[number];
export type TeacherMaterialStatus = typeof teacherMaterialStatuses[number];
export type TeacherMaterialReviewFilter = TeacherMaterialStatus | "unreviewed";
export function isTeacherSubjectForLevel(levelId: TeacherLevelId, subjectId: typeof teacherSubjectIds[number]) {
  return subjectId !== "history" || Number(levelId.slice(1)) >= 4;
}
export type TeacherMaterialInput = {
  clientRequestId: string;
  classId?: string;
  levelId: TeacherLevelId;
  subjectId: typeof teacherSubjectIds[number];
  kind: typeof teacherMaterialKinds[number];
  title: string;
  summary: string;
  body: string;
  rightsAttested: true;
  privacyAttested: true;
};

export type TeacherMaterialRecord = TeacherMaterialInput & {
  id: string;
  teacherId: string;
  teacherName: string;
  className?: string;
  schoolName?: string;
  teacherEmail?: string;
  status: TeacherMaterialStatus;
  publicationSource?: "admin_review" | "verified_teacher_auto";
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  publishedAt?: string;
};

export type TeacherSummary = {
  id: string;
  email: string;
  displayName: string;
  levelIds: TeacherLevelId[];
};

export interface TeacherContentRepository {
  assignTeacher(email: string, levelIds: TeacherLevelId[], adminId: string): Promise<TeacherSummary>;
  listTeachers(): Promise<TeacherSummary[]>;
  getTeacher(teacherId: string): Promise<TeacherSummary | null>;
  createMaterial(teacherId: string, input: TeacherMaterialInput): Promise<TeacherMaterialRecord>;
  listOwnMaterials(teacherId: string): Promise<TeacherMaterialRecord[]>;
  listForReview(status?: TeacherMaterialReviewFilter): Promise<TeacherMaterialRecord[]>;
  reviewMaterial(materialId: string, adminId: string, decision: "approve" | "reject" | "withdraw", reviewNote?: string): Promise<TeacherMaterialRecord>;
  listPublishedForStudent(studentId: string, parentId: string): Promise<TeacherMaterialRecord[] | null>;
}

export async function migrateTeacherContent(target: Pick<Pool, "query">) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level_id text NOT NULL CHECK (level_id IN ('d1','d2','d3','d4','d5','d6')),
      assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (teacher_id, level_id)
    );
    CREATE INDEX IF NOT EXISTS teacher_assignments_level_idx ON teacher_assignments(level_id) WHERE active;
    CREATE TABLE IF NOT EXISTS teacher_materials (
      id uuid PRIMARY KEY,
      teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      class_id uuid REFERENCES teacher_classes(id) ON DELETE RESTRICT,
      client_request_id uuid NOT NULL,
      level_id text NOT NULL CHECK (level_id IN ('d1','d2','d3','d4','d5','d6')),
      subject_id text NOT NULL CHECK (subject_id IN ('bm','en','math','science','history','islam','moral')),
      kind text NOT NULL CHECK (kind IN ('note','reading')),
      title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
      summary text NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 300),
      body text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 10000),
      rights_attested boolean NOT NULL CHECK (rights_attested),
      privacy_attested boolean NOT NULL CHECK (privacy_attested),
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','withdrawn')),
      publication_source text CHECK (publication_source IN ('admin_review','verified_teacher_auto')),
      review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
      reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(teacher_id, client_request_id)
    );
    CREATE INDEX IF NOT EXISTS teacher_materials_teacher_created_idx ON teacher_materials(teacher_id, created_at DESC);
    ALTER TABLE teacher_materials ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES teacher_classes(id) ON DELETE RESTRICT;
    ALTER TABLE teacher_materials ADD COLUMN IF NOT EXISTS publication_source text;
    DO $$ BEGIN
      ALTER TABLE teacher_materials ADD CONSTRAINT teacher_materials_publication_source_check
        CHECK (publication_source IN ('admin_review','verified_teacher_auto'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    UPDATE teacher_materials SET publication_source='admin_review'
      WHERE status='published' AND reviewed_at IS NOT NULL AND publication_source IS NULL;
    CREATE INDEX IF NOT EXISTS teacher_materials_class_status_idx ON teacher_materials(class_id,status,published_at DESC);
    CREATE INDEX IF NOT EXISTS teacher_materials_teacher_status_idx ON teacher_materials(teacher_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS teacher_materials_review_idx ON teacher_materials(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS teacher_materials_published_level_idx ON teacher_materials(level_id, published_at DESC) WHERE status='published';
  `);
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}

function mapMaterial(row: any): TeacherMaterialRecord {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    ...(row.class_name ? { className: row.class_name } : {}),
    ...(row.school_name ? { schoolName: row.school_name } : {}),
    ...(row.teacher_email ? { teacherEmail: row.teacher_email } : {}),
    levelId: row.level_id,
    subjectId: row.subject_id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    body: row.body,
    classId: row.class_id,
    clientRequestId: row.client_request_id,
    rightsAttested: true,
    privacyAttested: true,
    status: row.status,
    ...(row.publication_source ? { publicationSource: row.publication_source } : {}),
    ...(optionalText(row.review_note) ? { reviewNote: row.review_note } : {}),
    createdAt: new Date(row.created_at).toISOString(),
    ...(row.reviewed_at ? { reviewedAt: new Date(row.reviewed_at).toISOString() } : {}),
    ...(row.published_at ? { publishedAt: new Date(row.published_at).toISOString() } : {}),
  };
}

const materialColumns = `
  SELECT m.*,COALESCE(p.public_name,u.display_name) AS teacher_name,u.email AS teacher_email,
    c.name AS class_name,s.display_name AS school_name
  FROM teacher_materials m JOIN users u ON u.id=m.teacher_id
  LEFT JOIN teacher_profiles p ON p.user_id=m.teacher_id
  LEFT JOIN teacher_classes c ON c.id=m.class_id
  LEFT JOIN schools s ON s.id=c.school_id`;

export class PostgresTeacherContentRepository implements TeacherContentRepository {
  constructor(private readonly pool: Pool) {}

  async assignTeacher(email: string, levelIds: TeacherLevelId[], adminId: string): Promise<TeacherSummary> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT id,email,display_name,role FROM users WHERE email=$1 FOR UPDATE", [email]);
      const user = found.rows[0];
      if (!user) throw accessError("USER_NOT_FOUND", 404);
      if (user.role === "super_admin") throw accessError("SUPER_ADMIN_ROLE_LOCKED", 409);
      await client.query(`INSERT INTO user_roles(user_id,role,status,granted_by,granted_at,revoked_at)
        VALUES($1,'teacher',$2,$3,now(),CASE WHEN $2='revoked' THEN now() ELSE NULL END)
        ON CONFLICT(user_id,role) DO UPDATE SET status=EXCLUDED.status,granted_by=EXCLUDED.granted_by,
        granted_at=CASE WHEN EXCLUDED.status='active' THEN now() ELSE user_roles.granted_at END,revoked_at=EXCLUDED.revoked_at`,
        [user.id,levelIds.length ? "active" : "revoked",adminId]);
      await client.query("UPDATE teacher_assignments SET active=false,updated_at=now() WHERE teacher_id=$1 AND NOT (level_id=ANY($2::text[]))", [user.id, levelIds]);
      for (const levelId of levelIds) {
        await client.query(`INSERT INTO teacher_assignments(teacher_id,level_id,assigned_by)
          VALUES($1,$2,$3) ON CONFLICT(teacher_id,level_id) DO UPDATE SET active=true,assigned_by=EXCLUDED.assigned_by,updated_at=now()`, [user.id, levelId, adminId]);
      }
      await client.query("COMMIT");
      return { id: user.id, email: user.email, displayName: user.display_name, levelIds };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listTeachers(): Promise<TeacherSummary[]> {
    const { rows } = await this.pool.query(`SELECT u.id,u.email,u.display_name,array_agg(a.level_id ORDER BY a.level_id) AS level_ids
      FROM users u JOIN user_roles r ON r.user_id=u.id AND r.role='teacher' AND r.status='active'
      JOIN teacher_assignments a ON a.teacher_id=u.id AND a.active
      GROUP BY u.id,u.email,u.display_name ORDER BY u.display_name,u.email`);
    return rows.map((row: any) => ({ id: row.id, email: row.email, displayName: row.display_name, levelIds: row.level_ids }));
  }

  async getTeacher(teacherId: string): Promise<TeacherSummary | null> {
    const { rows } = await this.pool.query(`SELECT u.id,u.email,u.display_name,array_agg(a.level_id ORDER BY a.level_id) FILTER (WHERE a.level_id IS NOT NULL) AS level_ids
      FROM users u JOIN user_roles r ON r.user_id=u.id AND r.role='teacher' AND r.status='active'
      LEFT JOIN teacher_assignments a ON a.teacher_id=u.id AND a.active
      WHERE u.id=$1 GROUP BY u.id,u.email,u.display_name`, [teacherId]);
    const row = rows[0];
    return row ? { id: row.id, email: row.email, displayName: row.display_name, levelIds: row.level_ids ?? [] } : null;
  }

  async createMaterial(teacherId: string, input: TeacherMaterialInput): Promise<TeacherMaterialRecord> {
    if (!isTeacherSubjectForLevel(input.levelId, input.subjectId)) throw accessError("INVALID_INPUT", 400);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`teacher-material:${teacherId}`]);
      const teacherResult = await client.query(`SELECT u.display_name,u.email,p.public_name,c.name AS class_name,s.display_name AS school_name,
        c.level_id,c.subject_id FROM users u JOIN teacher_profiles p ON p.user_id=u.id AND p.status='active'
        JOIN teacher_classes c ON c.teacher_id=p.user_id AND c.id=$2 AND c.status='active'
        JOIN schools s ON s.id=c.school_id WHERE u.id=$1 FOR SHARE`, [teacherId,input.classId]);
      const teacher = teacherResult.rows[0];
      if (!teacher || teacher.level_id !== input.levelId || teacher.subject_id !== input.subjectId) {
        throw accessError("TEACHER_SCOPE_REQUIRED", 403);
      }

      const existing = await client.query("SELECT * FROM teacher_materials WHERE teacher_id=$1 AND client_request_id=$2", [teacherId, input.clientRequestId]);
      let row = existing.rows[0];
      if (row) {
        if (row.class_id !== input.classId || row.level_id !== input.levelId || row.subject_id !== input.subjectId || row.kind !== input.kind ||
            row.title !== input.title || row.summary !== input.summary || row.body !== input.body ||
            row.rights_attested !== true || row.privacy_attested !== true) {
          throw accessError("MATERIAL_REQUEST_CONFLICT", 409);
        }
      } else {
        const quota = await client.query(`SELECT
          COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour')::int AS hourly_count,
          COUNT(*) FILTER (WHERE status='published' AND reviewed_at IS NULL)::int AS unreviewed_count
          FROM teacher_materials WHERE teacher_id=$1`, [teacherId]);
        if (Number(quota.rows[0]?.hourly_count ?? 0) >= 20 || Number(quota.rows[0]?.unreviewed_count ?? 0) >= 20) {
          throw accessError("MATERIAL_RATE_LIMIT", 429);
        }
        const inserted = await client.query(`INSERT INTO teacher_materials(
          id,teacher_id,class_id,client_request_id,level_id,subject_id,kind,title,summary,body,rights_attested,privacy_attested,
          status,publication_source,published_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true,'published','verified_teacher_auto',now())
          RETURNING *`, [randomUUID(), teacherId, input.classId, input.clientRequestId, input.levelId, input.subjectId, input.kind, input.title, input.summary, input.body]);
        row = inserted.rows[0];
        await client.query(`INSERT INTO teacher_network_audit(id,actor_user_id,action,entity_type,entity_id,details)
          VALUES($1,$2,'teacher_material_auto_published','teacher_material',$3,$4::jsonb)`,
          [randomUUID(),teacherId,row.id,JSON.stringify({policy:"verified-teacher-auto-publish-v1",classId:input.classId})]);
      }
      const material = mapMaterial({ ...row, teacher_name: teacher.public_name ?? teacher.display_name, teacher_email: teacher.email,
        class_name: teacher.class_name, school_name: teacher.school_name });
      await client.query("COMMIT");
      return material;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listOwnMaterials(teacherId: string): Promise<TeacherMaterialRecord[]> {
    const { rows } = await this.pool.query(`${materialColumns} WHERE m.teacher_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 100`, [teacherId]);
    return rows.map(mapMaterial);
  }

  async listForReview(status?: TeacherMaterialReviewFilter): Promise<TeacherMaterialRecord[]> {
    const where = status === "unreviewed" ? "WHERE m.status='published' AND m.reviewed_at IS NULL" : status ? "WHERE m.status=$1" : "";
    const { rows } = await this.pool.query(`${materialColumns} ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT 100`, status && status !== "unreviewed" ? [status] : []);
    return rows.map(mapMaterial);
  }

  async reviewMaterial(materialId: string, adminId: string, decision: "approve" | "reject" | "withdraw", reviewNote?: string): Promise<TeacherMaterialRecord> {
    if ((decision === "reject" || decision === "withdraw") && !reviewNote?.trim()) throw accessError("REVIEW_NOTE_REQUIRED", 400);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const target = decision === "approve" ? "published" : decision === "reject" ? "rejected" : "withdrawn";
      const eligible = decision === "withdraw"
        ? "status='published' AND reviewed_at IS NOT NULL"
        : "(status='pending' OR (status='published' AND reviewed_at IS NULL))";
      const { rows } = await client.query(`UPDATE teacher_materials SET status=$1,review_note=$2,reviewed_by=$3,reviewed_at=now(),
        publication_source=CASE WHEN $1='published' THEN COALESCE(publication_source,'admin_review') ELSE publication_source END,
        published_at=CASE WHEN $1='published' THEN COALESCE(published_at,now()) ELSE published_at END,updated_at=now()
        WHERE id=$4 AND ${eligible} RETURNING *`, [target,reviewNote?.trim() || null,adminId,materialId]);
      if (!rows[0]) throw accessError("MATERIAL_STATE_CONFLICT", 409);
      await client.query(`INSERT INTO teacher_network_audit(id,actor_user_id,action,entity_type,entity_id,details)
        VALUES($1,$2,$3,'teacher_material',$4,$5::jsonb)`, [randomUUID(),adminId,`teacher_material_${decision === "approve" ? "review_approved" : decision === "reject" ? "review_rejected" : "withdrawn"}`,materialId,JSON.stringify({reviewNote:reviewNote?.trim() || null})]);
      const detail = await client.query(`${materialColumns} WHERE m.id=$1`, [materialId]);
      await client.query("COMMIT");
      return mapMaterial(detail.rows[0] ?? { ...rows[0], teacher_name: "Guru" });
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }

  async listPublishedForStudent(studentId: string, parentId: string): Promise<TeacherMaterialRecord[] | null> {
    const student = await this.pool.query("SELECT level_id FROM students WHERE id=$1 AND parent_id=$2", [studentId, parentId]);
    if (!student.rows[0]) return null;
    const { rows } = await this.pool.query(`${materialColumns}
      JOIN class_enrollments e ON e.class_id=m.class_id AND e.student_id=$1 AND e.status='active'
      WHERE m.status='published' AND c.status='active' AND p.status='active'
      ORDER BY m.published_at DESC,m.id DESC LIMIT 100`, [studentId]);
    return rows.map(mapMaterial);
  }
}
