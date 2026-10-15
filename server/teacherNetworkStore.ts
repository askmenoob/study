import {assertTeacherKycReviewed} from "./teacherKyc.js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { accessError } from "./familyAccess.js";
import { openJoinCode, sealJoinCode, teacherJoinCodeSecret } from "./joinCodeCrypto.js";
import { isTeacherSubjectForLevel, type TeacherLevelId, teacherLevelIds, teacherSubjectIds } from "./teacherContentStore.js";

export const teacherApplicationStatuses = ["pending", "needs_info", "approved", "rejected", "withdrawn"] as const;
export type TeacherApplicationStatus = typeof teacherApplicationStatuses[number];
export const enrollmentStatuses = ["pending_teacher", "active", "declined", "revoked"] as const;
export type EnrollmentStatus = typeof enrollmentStatuses[number];

export type TeacherApplicationInput = {
  fullName: string;
  publicName: string;
  schoolName: string;
  state: string;
  district: string;
  positionTitle: string;
  academicYear: number;
  levelIds: TeacherLevelId[];
  subjectIds: Array<typeof teacherSubjectIds[number]>;
  identityAttested: true;
  termsAttested: true;
};

export type TeacherApplicationRecord = TeacherApplicationInput & {
  id: string;
  userId: string;
  email?: string;
  status: TeacherApplicationStatus;
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
  teacherStatus?: "active" | "suspended" | "revoked";
  tuitionAffiliation?: "imai" | "external";
};

export type TeacherClassRecord = {
  id: string;
  teacherId: string;
  teacherPublicName: string;
  schoolName: string;
  name: string;
  academicYear: number;
  levelId: TeacherLevelId;
  subjectId: typeof teacherSubjectIds[number];
  status: "active" | "archived";
  codeHint?: string;
  joinCode?: string;
  activeStudents?: number;
  pendingStudents?: number;
};

export type EnrollmentRecord = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  teacherPublicName: string;
  schoolName: string;
  academicYear: number;
  levelId: TeacherLevelId;
  subjectId: string;
  status: EnrollmentStatus;
  teacherStatus: "active" | "suspended" | "revoked";
  parentApprovedAt?: string;
  teacherAcceptedAt?: string;
  activatedAt?: string;
  replacesEnrollmentId?: string;
};

export async function migrateTeacherNetwork(target: Pick<Pool, "query">) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id uuid PRIMARY KEY,
      display_name text NOT NULL,
      normalized_name text NOT NULL,
      state text NOT NULL,
      district text NOT NULL,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(normalized_name,state,district)
    );
    CREATE TABLE IF NOT EXISTS teacher_applications (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
      public_name text NOT NULL CHECK (char_length(public_name) BETWEEN 2 AND 80),
      school_name text NOT NULL CHECK (char_length(school_name) BETWEEN 3 AND 160),
      state text NOT NULL CHECK (char_length(state) BETWEEN 2 AND 80),
      district text NOT NULL CHECK (char_length(district) BETWEEN 2 AND 100),
      position_title text NOT NULL CHECK (char_length(position_title) BETWEEN 2 AND 100),
      academic_year integer NOT NULL CHECK (academic_year BETWEEN 2024 AND 2100),
      level_ids text[] NOT NULL CHECK (cardinality(level_ids) BETWEEN 1 AND 6),
      subject_ids text[] NOT NULL CHECK (cardinality(subject_ids) BETWEEN 1 AND 7),
      identity_attested boolean NOT NULL CHECK (identity_attested),
      terms_attested boolean NOT NULL CHECK (terms_attested),
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','needs_info','approved','rejected','withdrawn')),
      review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
      submitted_at timestamptz NOT NULL DEFAULT now(),
      reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS teacher_applications_active_user_uidx
      ON teacher_applications(user_id) WHERE status IN ('pending','needs_info','approved');
    CREATE INDEX IF NOT EXISTS teacher_applications_review_idx ON teacher_applications(status,submitted_at,id);
    CREATE TABLE IF NOT EXISTS teacher_application_events (
      id uuid PRIMARY KEY,
      application_id uuid NOT NULL REFERENCES teacher_applications(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS teacher_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      public_name text NOT NULL,
      school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      approved_application_id uuid NOT NULL REFERENCES teacher_applications(id) ON DELETE RESTRICT,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
      approved_at timestamptz NOT NULL DEFAULT now(),
      suspended_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS tuition_affiliation text NOT NULL DEFAULT 'external'
      CHECK (tuition_affiliation IN ('imai','external'));
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS tuition_experience_years integer CHECK(tuition_experience_years BETWEEN 0 AND 70);
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS tuition_qualifications text CHECK(char_length(tuition_qualifications)<=300);
    CREATE TABLE IF NOT EXISTS teacher_classes (
      id uuid PRIMARY KEY,
      teacher_id uuid NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE RESTRICT,
      school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
      academic_year integer NOT NULL CHECK (academic_year BETWEEN 2024 AND 2100),
      level_id text NOT NULL CHECK (level_id IN ('${teacherLevelIds.join("','")}')),
      subject_id text NOT NULL CHECK (subject_id IN ('${teacherSubjectIds.join("','")}')),
      join_code_digest text NOT NULL UNIQUE,
      join_code_hint text NOT NULL,
      join_code_ciphertext text,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(teacher_id,academic_year,name,subject_id)
    );
    ALTER TABLE teacher_classes ADD COLUMN IF NOT EXISTS join_code_ciphertext text;
    CREATE INDEX IF NOT EXISTS teacher_classes_teacher_idx ON teacher_classes(teacher_id,status,academic_year DESC);
    CREATE TABLE IF NOT EXISTS class_enrollments (
      id uuid PRIMARY KEY,
      class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE RESTRICT,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status text NOT NULL CHECK (status IN ('pending_teacher','active','declined','revoked')),
      parent_approved_at timestamptz NOT NULL,
      teacher_accepted_at timestamptz,
      activated_at timestamptz,
      ended_at timestamptz,
      ended_by uuid REFERENCES users(id) ON DELETE SET NULL,
      replaces_enrollment_id uuid REFERENCES class_enrollments(id) ON DELETE SET NULL,
      client_request_id uuid NOT NULL,
      consent_version text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(requested_by,client_request_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS class_enrollments_live_class_student_uidx
      ON class_enrollments(class_id,student_id) WHERE status IN ('pending_teacher','active');
    CREATE INDEX IF NOT EXISTS class_enrollments_student_idx ON class_enrollments(student_id,status,created_at DESC);
    CREATE INDEX IF NOT EXISTS class_enrollments_class_idx ON class_enrollments(class_id,status,created_at);
    CREATE TABLE IF NOT EXISTS teacher_network_audit (
      id uuid PRIMARY KEY,
      actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS teacher_network_audit_entity_idx ON teacher_network_audit(entity_type,entity_id,created_at DESC);
  `);
}

const normalizeSchool = (value: string) => value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ms-MY");
const iso = (value: unknown) => value ? new Date(value as string).toISOString() : undefined;
const optional = (value: unknown) => typeof value === "string" && value.length ? value : undefined;
const codeDigest = (code: string) => createHash("sha256").update(code.normalize("NFKC").trim().toUpperCase()).digest("hex");
const makeJoinCode = () => randomBytes(6).toString("base64url").toUpperCase().replace(/[-_]/g, "A").slice(0, 8);

function mapApplication(row: any): TeacherApplicationRecord {
  return {
    id: row.id, userId: row.user_id, ...(row.email ? { email: row.email } : {}),
    fullName: row.full_name, publicName: row.public_name, schoolName: row.school_name,
    state: row.state, district: row.district, positionTitle: row.position_title,
    academicYear: Number(row.academic_year), levelIds: row.level_ids, subjectIds: row.subject_ids,
    identityAttested: true, termsAttested: true, status: row.status,
    ...(optional(row.review_note) ? { reviewNote: row.review_note } : {}),
    submittedAt: iso(row.submitted_at)!, ...(row.reviewed_at ? { reviewedAt: iso(row.reviewed_at) } : {}),
    ...(row.teacher_status ? { teacherStatus: row.teacher_status } : {}),
    ...(row.teacher_affiliation ? { tuitionAffiliation: row.teacher_affiliation } : {}),
  };
}

function mapClass(row: any): TeacherClassRecord {
  return {
    id: row.id, teacherId: row.teacher_id, teacherPublicName: row.teacher_public_name,
    schoolName: row.school_name, name: row.name, academicYear: Number(row.academic_year),
    levelId: row.level_id, subjectId: row.subject_id, status: row.status,
    ...(row.join_code_hint ? { codeHint: row.join_code_hint } : {}),
    ...(row.join_code ? { joinCode: row.join_code } : {}),
    ...(row.active_students !== undefined ? { activeStudents: Number(row.active_students) } : {}),
    ...(row.pending_students !== undefined ? { pendingStudents: Number(row.pending_students) } : {}),
  };
}

function mapEnrollment(row: any): EnrollmentRecord {
  return {
    id: row.id, studentId: row.student_id, studentName: row.student_name,
    classId: row.class_id, className: row.class_name, teacherPublicName: row.teacher_public_name,
    schoolName: row.school_name, academicYear: Number(row.academic_year), levelId: row.level_id,
    subjectId: row.subject_id, status: row.status, teacherStatus: row.teacher_status,
    ...(row.parent_approved_at ? { parentApprovedAt: iso(row.parent_approved_at) } : {}),
    ...(row.teacher_accepted_at ? { teacherAcceptedAt: iso(row.teacher_accepted_at) } : {}),
    ...(row.activated_at ? { activatedAt: iso(row.activated_at) } : {}),
    ...(row.replaces_enrollment_id ? { replacesEnrollmentId: row.replaces_enrollment_id } : {}),
  };
}

const applicationColumns = `SELECT a.*,u.email,p.status AS teacher_status,p.tuition_affiliation AS teacher_affiliation FROM teacher_applications a JOIN users u ON u.id=a.user_id
  LEFT JOIN teacher_profiles p ON p.user_id=a.user_id`;
const classColumns = `SELECT c.*,p.public_name AS teacher_public_name,s.display_name AS school_name
  FROM teacher_classes c JOIN teacher_profiles p ON p.user_id=c.teacher_id JOIN schools s ON s.id=c.school_id`;
const enrollmentColumns = `SELECT e.*,st.name AS student_name,c.name AS class_name,c.academic_year,c.level_id,c.subject_id,
  p.public_name AS teacher_public_name,p.status AS teacher_status,s.display_name AS school_name
  FROM class_enrollments e JOIN students st ON st.id=e.student_id JOIN teacher_classes c ON c.id=e.class_id
  JOIN teacher_profiles p ON p.user_id=c.teacher_id JOIN schools s ON s.id=c.school_id`;

async function audit(client: Pick<PoolClient, "query">, actorId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
  await client.query(`INSERT INTO teacher_network_audit(id,actor_user_id,action,entity_type,entity_id,details)
    VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [randomUUID(), actorId, action, entityType, entityId, JSON.stringify(details)]);
}

export class PostgresTeacherNetworkRepository {
  constructor(private readonly pool: Pool, private readonly joinCodeSecret = teacherJoinCodeSecret(), private readonly options:{requireKycReview?:boolean}={}) {}

  async submitApplication(userId: string, input: TeacherApplicationInput) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
      if (!user.rows[0]) throw accessError("SESSION_EXPIRED", 401);
      const existing = await client.query(`SELECT * FROM teacher_applications WHERE user_id=$1
        AND status IN ('pending','needs_info','approved') FOR UPDATE`, [userId]);
      if (existing.rows[0]?.status === "approved") throw accessError("TEACHER_ALREADY_APPROVED", 409);
      const values = [input.fullName,input.publicName,input.schoolName,input.state,input.district,input.positionTitle,input.academicYear,input.levelIds,input.subjectIds];
      let row;
      if (existing.rows[0]) {
        const updated = await client.query(`UPDATE teacher_applications SET full_name=$2,public_name=$3,school_name=$4,state=$5,
          district=$6,position_title=$7,academic_year=$8,level_ids=$9,subject_ids=$10,identity_attested=true,terms_attested=true,
          status='pending',review_note=NULL,reviewed_by=NULL,reviewed_at=NULL,submitted_at=now(),updated_at=now()
          WHERE id=$1 RETURNING *`, [existing.rows[0].id,...values]);
        row = updated.rows[0];
      } else {
        const inserted = await client.query(`INSERT INTO teacher_applications(id,user_id,full_name,public_name,school_name,state,district,
          position_title,academic_year,level_ids,subject_ids,identity_attested,terms_attested)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true) RETURNING *`, [randomUUID(),userId,...values]);
        row = inserted.rows[0];
      }
      await client.query(`INSERT INTO teacher_application_events(id,application_id,event_type,actor_user_id)
        VALUES($1,$2,'submitted',$3)`, [randomUUID(),row.id,userId]);
      await audit(client,userId,"teacher_application_submitted","teacher_application",row.id);
      await client.query("COMMIT");
      return mapApplication(row);
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }

  async getApplication(userId: string) {
    const { rows } = await this.pool.query(`${applicationColumns} WHERE a.user_id=$1 ORDER BY a.submitted_at DESC LIMIT 1`, [userId]);
    return rows[0] ? mapApplication(rows[0]) : null;
  }

  async getTuitionAdminSummary() {
    // Aggregate only; no parent/child records, join codes, teacher contact data or billing estimates.
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT count(*) FROM teacher_applications WHERE status='pending') AS pending_applications,
        (SELECT count(*) FROM teacher_applications WHERE status='needs_info') AS needs_info_applications,
        (SELECT count(*) FROM teacher_profiles p JOIN teacher_applications a ON a.id=p.approved_application_id
          WHERE p.status='active' AND a.status='approved' AND p.tuition_affiliation='imai') AS imai_teachers,
        (SELECT count(*) FROM teacher_profiles p JOIN teacher_applications a ON a.id=p.approved_application_id
          WHERE p.status='active' AND a.status='approved' AND p.tuition_affiliation='external') AS external_teachers,
        (SELECT count(*) FROM teacher_profiles WHERE status='suspended') AS suspended_teachers,
        (SELECT count(*) FROM teacher_classes c JOIN teacher_profiles p ON p.user_id=c.teacher_id
          JOIN teacher_applications a ON a.id=p.approved_application_id
          WHERE c.status='active' AND p.status='active' AND a.status='approved') AS active_classes,
        (SELECT count(*) FROM class_enrollments e JOIN teacher_classes c ON c.id=e.class_id
          JOIN teacher_profiles p ON p.user_id=c.teacher_id JOIN teacher_applications a ON a.id=p.approved_application_id
          WHERE e.status='active' AND c.status='active' AND p.status='active' AND a.status='approved') AS active_enrollments,
        (SELECT count(*) FROM class_enrollments e JOIN teacher_classes c ON c.id=e.class_id
          JOIN teacher_profiles p ON p.user_id=c.teacher_id JOIN teacher_applications a ON a.id=p.approved_application_id
          WHERE e.status='pending_teacher' AND c.status='active' AND p.status='active' AND a.status='approved') AS pending_enrollments,
        (SELECT count(*) FROM feedback_submissions WHERE category='problem') AS problem_feedback
    `);
    const row = rows[0];
    return {
      pendingApplications: Number(row.pending_applications),
      needsInfoApplications: Number(row.needs_info_applications),
      imaiTeachers: Number(row.imai_teachers),
      externalTeachers: Number(row.external_teachers),
      suspendedTeachers: Number(row.suspended_teachers),
      activeClasses: Number(row.active_classes),
      activeEnrollments: Number(row.active_enrollments),
      pendingEnrollments: Number(row.pending_enrollments),
      problemFeedback: Number(row.problem_feedback),
    };
  }

  async listApplications(status: TeacherApplicationStatus = "pending") {
    const { rows } = await this.pool.query(`${applicationColumns} WHERE a.status=$1 ORDER BY a.submitted_at,a.id LIMIT 100`, [status]);
    return rows.map(mapApplication);
  }

  async reviewApplication(applicationId: string, adminId: string, decision: "approve" | "needs_info" | "reject", note?: string, schoolDisplayName?: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Match submitApplication: lock the applicant before the application. Otherwise
      // approval's user foreign keys can deadlock against a concurrent resubmission.
      const applicant = await client.query(`SELECT id FROM users WHERE id=(
        SELECT user_id FROM teacher_applications WHERE id=$1) FOR UPDATE`, [applicationId]);
      if (!applicant.rows[0]) throw accessError("TEACHER_APPLICATION_NOT_FOUND", 404);
      // Read again after waiting so approval uses the committed resubmission.
      const result = await client.query("SELECT * FROM teacher_applications WHERE id=$1 FOR UPDATE", [applicationId]);
      const application = result.rows[0];
      if (!application) throw accessError("TEACHER_APPLICATION_NOT_FOUND", 404);
      if (!['pending','needs_info'].includes(application.status)) throw accessError("TEACHER_APPLICATION_STATE_CONFLICT", 409);
      if (!note) throw accessError("REVIEW_NOTE_REQUIRED", 400);
      if (decision === "approve") {
        if(this.options.requireKycReview)await assertTeacherKycReviewed(client,applicationId);
        const finalSchoolName = schoolDisplayName?.trim() || application.school_name;
        const normalized = normalizeSchool(finalSchoolName);
        const schoolResult = await client.query(`INSERT INTO schools(id,display_name,normalized_name,state,district)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(normalized_name,state,district) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now() RETURNING id,display_name`,
          [randomUUID(),finalSchoolName,normalized,application.state,application.district]);
        const school = schoolResult.rows[0];
        await client.query(`INSERT INTO teacher_profiles(user_id,public_name,school_id,approved_application_id,status)
          VALUES($1,$2,$3,$4,'active') ON CONFLICT(user_id) DO UPDATE SET public_name=EXCLUDED.public_name,school_id=EXCLUDED.school_id,
          approved_application_id=EXCLUDED.approved_application_id,status='active',suspended_at=NULL,updated_at=now()`,
          [application.user_id,application.public_name,school.id,application.id]);
        await client.query(`INSERT INTO user_roles(user_id,role,status,granted_by,granted_at,revoked_at)
          VALUES($1,'teacher','active',$2,now(),NULL) ON CONFLICT(user_id,role) DO UPDATE SET status='active',granted_by=EXCLUDED.granted_by,
          granted_at=now(),revoked_at=NULL`, [application.user_id,adminId]);
      }
      const status = decision === "approve" ? "approved" : decision === "needs_info" ? "needs_info" : "rejected";
      const updated = await client.query(`UPDATE teacher_applications SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now()
        WHERE id=$1 RETURNING *`, [applicationId,status,note ?? null,adminId]);
      await client.query(`INSERT INTO teacher_application_events(id,application_id,event_type,actor_user_id,note)
        VALUES($1,$2,$3,$4,$5)`, [randomUUID(),applicationId,status,adminId,note ?? null]);
      await audit(client,adminId,`teacher_application_${status}`,"teacher_application",applicationId);
      await client.query("COMMIT");
      return mapApplication(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }

  async listTuitionTeachers(levelId?: string, subjectId?: string) {
    // Only approved and active teachers. No email, account identifiers for families,
    // school contact details, join codes or student data in this response.
    const { rows } = await this.pool.query(`
      SELECT p.user_id AS id, p.public_name, p.tuition_affiliation,
        a.level_ids, a.subject_ids, a.position_title, a.state
      FROM teacher_profiles p
      JOIN teacher_applications a ON a.id=p.approved_application_id
      WHERE p.status='active' AND a.status='approved'
        AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=p.user_id AND r.role='teacher' AND r.status='active')
        AND ($1::text IS NULL OR $1=ANY(a.level_ids))
        AND ($2::text IS NULL OR $2=ANY(a.subject_ids))
      ORDER BY CASE p.tuition_affiliation WHEN 'imai' THEN 0 ELSE 1 END, p.public_name, p.user_id
      LIMIT 100`, [levelId ?? null, subjectId ?? null]);
    return rows.map((row: any) => ({
      id: row.id, publicName: row.public_name,
      affiliation: row.tuition_affiliation as "imai" | "external",
      levelIds: row.level_ids as string[], subjectIds: row.subject_ids as string[],
      positionTitle: row.position_title as string, state: row.state as string,
    }));
  }

  async getTuitionTeacher(teacherId: string) {
    const { rows } = await this.pool.query(`
      SELECT p.user_id AS id, p.public_name, p.tuition_affiliation,
        a.level_ids, a.subject_ids, a.position_title, a.state,p.tuition_experience_years,p.tuition_qualifications
      FROM teacher_profiles p
      JOIN teacher_applications a ON a.id=p.approved_application_id
      WHERE p.status='active' AND a.status='approved' AND p.user_id=$1
        AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=p.user_id AND r.role='teacher' AND r.status='active')
      LIMIT 1`, [teacherId]);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id, publicName: row.public_name,
      affiliation: row.tuition_affiliation as "imai" | "external",
      levelIds: row.level_ids as string[], subjectIds: row.subject_ids as string[],
      positionTitle: row.position_title as string, state: row.state as string,
      ...(row.tuition_experience_years!==undefined&&row.tuition_experience_years!==null?{experienceYears:Number(row.tuition_experience_years)}:{}),
      ...(row.tuition_qualifications?{qualifications:row.tuition_qualifications as string}:{}),
    };
  }

  async setTuitionDetails(adminId:string,teacherId:string,input:{experienceYears:number|null;qualifications:string|null;reviewNote:string}){
    if((input.experienceYears!==null&&(!Number.isInteger(input.experienceYears)||input.experienceYears<0||input.experienceYears>70))||
      (input.qualifications!==null&&(input.qualifications.length<3||input.qualifications.length>300||/@|https?:|www\.|\+?\d[\d -]{7,}\d/.test(input.qualifications)))||input.reviewNote.trim().length<10||input.reviewNote.length>1000)
      throw accessError("INVALID_INPUT",400);
    const client=await this.pool.connect();try{await client.query("BEGIN");
      if(!(await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='super_admin' AND status='active'",[adminId])).rows[0])throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
      const updated=await client.query("UPDATE teacher_profiles SET tuition_experience_years=$2,tuition_qualifications=$3,updated_at=now() WHERE user_id=$1 AND status='active' RETURNING user_id",[teacherId,input.experienceYears,input.qualifications]);
      if(!updated.rows[0])throw accessError("TEACHER_NOT_FOUND",404);
      await audit(client,adminId,"tuition_details_reviewed","teacher_profile",teacherId,{experienceYears:input.experienceYears,qualifications:input.qualifications,reviewNote:input.reviewNote});await client.query("COMMIT");
      return{teacherId};
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }

  async setTuitionAffiliation(adminId: string, teacherId: string, affiliation: "imai" | "external") {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "UPDATE teacher_profiles SET tuition_affiliation=$2,updated_at=now() WHERE user_id=$1 AND status='active' RETURNING user_id",
        [teacherId, affiliation],
      );
      if (!result.rows[0]) throw accessError("TEACHER_NOT_FOUND", 404);
      await audit(client, adminId, "tuition_affiliation_updated", "teacher_profile", teacherId, { affiliation });
      await client.query("COMMIT");
      return { teacherId, affiliation };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async getTeacherProfile(teacherId: string) {
    const { rows } = await this.pool.query(`SELECT p.user_id,p.public_name,p.status,p.tuition_affiliation,s.display_name AS school_name,
      a.level_ids,a.subject_ids,a.academic_year,u.email FROM teacher_profiles p JOIN schools s ON s.id=p.school_id
      JOIN teacher_applications a ON a.id=p.approved_application_id JOIN users u ON u.id=p.user_id WHERE p.user_id=$1`, [teacherId]);
    if (!rows[0]) return null;
    return { id: rows[0].user_id, publicName: rows[0].public_name, status: rows[0].status,
      tuitionAffiliation: rows[0].tuition_affiliation as "imai" | "external", schoolName: rows[0].school_name,
      levelIds: rows[0].level_ids, subjectIds: rows[0].subject_ids, academicYear: Number(rows[0].academic_year), email: rows[0].email };
  }

  async createClass(teacherId: string, input: { name: string; academicYear: number; levelId: TeacherLevelId; subjectId: typeof teacherSubjectIds[number] }) {
    if (!isTeacherSubjectForLevel(input.levelId,input.subjectId)) throw accessError("INVALID_INPUT",400);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const profileResult = await client.query(`SELECT p.school_id,p.status,a.level_ids,a.subject_ids
        FROM teacher_profiles p JOIN teacher_applications a ON a.id=p.approved_application_id
        WHERE p.user_id=$1 FOR SHARE`, [teacherId]);
      const profile = profileResult.rows[0];
      if (!profile || profile.status !== "active") throw accessError("TEACHER_ACCESS_REQUIRED", 403);
      if (!profile.level_ids.includes(input.levelId) || !profile.subject_ids.includes(input.subjectId)) throw accessError("TEACHER_SCOPE_REQUIRED", 403);
      let code = makeJoinCode();
      let digest = codeDigest(code);
      while ((await client.query("SELECT 1 FROM teacher_classes WHERE join_code_digest=$1", [digest])).rows[0]) {
        code = makeJoinCode(); digest = codeDigest(code);
      }
      const classId = randomUUID();
      const encryptedCode = sealJoinCode(code, classId, teacherId, this.joinCodeSecret);
      const inserted = await client.query(`INSERT INTO teacher_classes(id,teacher_id,school_id,name,academic_year,level_id,subject_id,join_code_digest,join_code_hint,join_code_ciphertext)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [classId,teacherId,profile.school_id,input.name,input.academicYear,input.levelId,input.subjectId,digest,code.slice(-4),encryptedCode]);
      await audit(client,teacherId,"teacher_class_created","teacher_class",inserted.rows[0].id);
      const mapped = await client.query(`${classColumns} WHERE c.id=$1`, [inserted.rows[0].id]);
      await client.query("COMMIT");
      return mapClass({ ...mapped.rows[0], join_code: code });
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }

  async listTeacherClasses(teacherId: string) {
    const { rows } = await this.pool.query(`${classColumns.replace("SELECT c.*", "SELECT c.*,counts.active_students,counts.pending_students")}
      LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE status='active') AS active_students,
        COUNT(*) FILTER (WHERE status='pending_teacher') AS pending_students FROM class_enrollments WHERE class_id=c.id) counts ON true
      WHERE c.teacher_id=$1 AND p.status='active' ORDER BY c.status,c.academic_year DESC,c.name`, [teacherId]);
    return rows.map((row: any) => mapClass({
      ...row,
      ...(row.status === "active" && row.join_code_ciphertext
        ? { join_code: openJoinCode(row.join_code_ciphertext, row.id, row.teacher_id, this.joinCodeSecret) }
        : {}),
    }));
  }

  async rotateJoinCode(teacherId: string, classId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query(`SELECT c.id FROM teacher_classes c JOIN teacher_profiles p ON p.user_id=c.teacher_id
        WHERE c.id=$1 AND c.teacher_id=$2 AND c.status='active' AND p.status='active' FOR UPDATE`, [classId,teacherId]);
      if (!owned.rows[0]) throw accessError("TEACHER_CLASS_NOT_FOUND", 404);
      let code = makeJoinCode(); let digest = codeDigest(code);
      while ((await client.query("SELECT 1 FROM teacher_classes WHERE join_code_digest=$1", [digest])).rows[0]) {
        code = makeJoinCode(); digest = codeDigest(code);
      }
      const encryptedCode = sealJoinCode(code, classId, teacherId, this.joinCodeSecret);
      await client.query("UPDATE teacher_classes SET join_code_digest=$2,join_code_hint=$3,join_code_ciphertext=$4,updated_at=now() WHERE id=$1", [classId,digest,code.slice(-4),encryptedCode]);
      await audit(client,teacherId,"teacher_class_code_rotated","teacher_class",classId);
      await client.query("COMMIT"); return { joinCode: code, codeHint: code.slice(-4) };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async previewClass(parentId: string, studentId: string, joinCode: string) {
    const owned = await this.pool.query("SELECT id,name,level_id FROM students WHERE id=$1 AND parent_id=$2", [studentId,parentId]);
    if (!owned.rows[0]) throw accessError("STUDENT_NOT_FOUND", 404);
    const { rows } = await this.pool.query(`${classColumns} WHERE c.join_code_digest=$1 AND c.status='active' AND p.status='active'`, [codeDigest(joinCode)]);
    if (!rows[0]) throw accessError("CLASS_CODE_UNAVAILABLE", 404);
    if (rows[0].level_id !== owned.rows[0].level_id) throw accessError("CLASS_LEVEL_MISMATCH", 409);
    const conflict = await this.pool.query(`${enrollmentColumns} WHERE e.student_id=$1 AND e.status='active'
      AND c.academic_year=$2 AND c.subject_id=$3 LIMIT 1`, [studentId,rows[0].academic_year,rows[0].subject_id]);
    return { class: mapClass(rows[0]), student: { id: owned.rows[0].id, name: owned.rows[0].name },
      ...(conflict.rows[0] ? { currentEnrollment: mapEnrollment(conflict.rows[0]) } : {}) };
  }

  async requestJoin(parentId: string, studentId: string, joinCode: string, consentVersion: string, clientRequestId: string, replaceEnrollmentId?: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`teacher-enrollment:${studentId}`]);
      const owned = await client.query("SELECT id,name,level_id FROM students WHERE id=$1 AND parent_id=$2 FOR SHARE", [studentId,parentId]);
      if (!owned.rows[0]) throw accessError("STUDENT_NOT_FOUND", 404);
      const replay = await client.query("SELECT id,class_id,student_id FROM class_enrollments WHERE requested_by=$1 AND client_request_id=$2 FOR UPDATE", [parentId,clientRequestId]);
      if (replay.rows[0]) {
        if (replay.rows[0].student_id !== studentId) throw accessError("REQUEST_KEY_CONFLICT", 409);
        const view = await client.query(`${enrollmentColumns} WHERE e.id=$1`, [replay.rows[0].id]);
        await client.query("COMMIT"); return mapEnrollment(view.rows[0]);
      }
      const classResult = await client.query(`SELECT c.*,p.status AS teacher_status FROM teacher_classes c JOIN teacher_profiles p ON p.user_id=c.teacher_id
        WHERE c.join_code_digest=$1 AND c.status='active' FOR SHARE`, [codeDigest(joinCode)]);
      const target = classResult.rows[0];
      if (!target || target.teacher_status !== "active") throw accessError("CLASS_CODE_UNAVAILABLE", 404);
      if (target.level_id !== owned.rows[0].level_id) throw accessError("CLASS_LEVEL_MISMATCH", 409);
      const conflict = await client.query(`SELECT e.id,e.status,c.academic_year,c.subject_id FROM class_enrollments e JOIN teacher_classes c ON c.id=e.class_id
        WHERE e.student_id=$1 AND e.status IN ('active','pending_teacher') AND c.academic_year=$2 AND c.subject_id=$3
        ORDER BY CASE e.status WHEN 'active' THEN 0 ELSE 1 END FOR UPDATE`,
        [studentId,target.academic_year,target.subject_id]);
      if (conflict.rows.some((row: any) => row.status === "pending_teacher")) throw accessError("SUBJECT_CLASS_REQUEST_PENDING", 409);
      const current = conflict.rows.find((row: any) => row.status === "active");
      if (current && current.id !== replaceEnrollmentId) throw accessError("SUBJECT_CLASS_CONFLICT", 409);
      const inserted = await client.query(`INSERT INTO class_enrollments(id,class_id,student_id,requested_by,status,parent_approved_at,replaces_enrollment_id,client_request_id,consent_version)
        VALUES($1,$2,$3,$4,'pending_teacher',now(),$5,$6,$7) RETURNING id`, [randomUUID(),target.id,studentId,parentId,current?.id ?? null,clientRequestId,consentVersion]);
      await audit(client,parentId,current ? "class_transfer_requested" : "class_join_requested","class_enrollment",inserted.rows[0].id,{ studentId,consentVersion });
      const view = await client.query(`${enrollmentColumns} WHERE e.id=$1`, [inserted.rows[0].id]);
      await client.query("COMMIT"); return mapEnrollment(view.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async listFamilyEnrollments(parentId: string, studentId?: string) {
    const { rows } = await this.pool.query(`${enrollmentColumns} WHERE st.parent_id=$1 AND ($2::uuid IS NULL OR st.id=$2::uuid)
      ORDER BY e.created_at DESC,e.id DESC`, [parentId,studentId ?? null]);
    return rows.map(mapEnrollment);
  }

  async listLearnerTuitionClasses(parentId: string, studentId: string) {
    // Student sessions are scoped by auth to their own studentId; the DB further
    // binds the requested student to the token's parent/owner account.
    const owned = await this.pool.query(
      "SELECT 1 FROM students WHERE id=$1 AND parent_id=$2", [studentId, parentId]);
    if (!owned.rows[0]) throw accessError("STUDENT_NOT_FOUND", 404);
    const { rows } = await this.pool.query(`
      SELECT e.id, c.name AS class_name, p.public_name AS teacher_public_name,
        c.subject_id, e.status
      FROM class_enrollments e
      JOIN teacher_classes c ON c.id=e.class_id
      JOIN teacher_profiles p ON p.user_id=c.teacher_id
      JOIN teacher_applications a ON a.id=p.approved_application_id
      WHERE e.student_id=$1 AND e.status IN ('active','pending_teacher')
        AND c.status='active' AND p.status='active' AND a.status='approved'
      ORDER BY CASE e.status WHEN 'active' THEN 0 ELSE 1 END, e.created_at DESC
      LIMIT 30`, [studentId]);
    return rows.map((row: any) => ({
      id: row.id, className: row.class_name, teacherPublicName: row.teacher_public_name,
      subjectId: row.subject_id, status: row.status as "active" | "pending_teacher",
    }));
  }

  async listTeacherEnrollments(teacherId: string) {
    const { rows } = await this.pool.query(`${enrollmentColumns} WHERE c.teacher_id=$1 AND e.status IN ('pending_teacher','active')
      ORDER BY CASE e.status WHEN 'pending_teacher' THEN 0 ELSE 1 END,e.created_at`, [teacherId]);
    return rows.map(mapEnrollment);
  }

  async decideEnrollment(teacherId: string, enrollmentId: string, decision: "accept" | "decline") {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(`SELECT e.*,c.teacher_id FROM class_enrollments e JOIN teacher_classes c ON c.id=e.class_id
        JOIN teacher_profiles p ON p.user_id=c.teacher_id WHERE e.id=$1 AND c.teacher_id=$2 AND p.status='active' FOR UPDATE`, [enrollmentId,teacherId]);
      const enrollment = found.rows[0];
      if (!enrollment) throw accessError("ENROLLMENT_NOT_FOUND", 404);
      if (enrollment.status !== "pending_teacher") throw accessError("ENROLLMENT_STATE_CONFLICT", 409);
      if (decision === "accept" && enrollment.replaces_enrollment_id) {
        await client.query(`UPDATE class_enrollments SET status='revoked',ended_at=now(),ended_by=$2,updated_at=now()
          WHERE id=$1 AND student_id=$3 AND status='active'`, [enrollment.replaces_enrollment_id,teacherId,enrollment.student_id]);
      }
      const next = decision === "accept" ? "active" : "declined";
      await client.query(`UPDATE class_enrollments SET status=$2,teacher_accepted_at=CASE WHEN $2='active' THEN now() ELSE NULL END,
        activated_at=CASE WHEN $2='active' THEN now() ELSE NULL END,ended_at=CASE WHEN $2='declined' THEN now() ELSE NULL END,
        ended_by=CASE WHEN $2='declined' THEN $3::uuid ELSE NULL END,updated_at=now() WHERE id=$1`, [enrollmentId,next,teacherId]);
      await audit(client,teacherId,decision === "accept" ? "class_enrollment_accepted" : "class_enrollment_declined","class_enrollment",enrollmentId);
      const view = await client.query(`${enrollmentColumns} WHERE e.id=$1`, [enrollmentId]);
      await client.query("COMMIT"); return mapEnrollment(view.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async endEnrollment(parentId: string, studentId: string, enrollmentId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(`UPDATE class_enrollments e SET status='revoked',ended_at=now(),ended_by=$2,updated_at=now()
        FROM students st WHERE e.id=$1 AND st.id=e.student_id AND st.id=$3 AND st.parent_id=$2
        AND e.status IN ('pending_teacher','active') RETURNING e.id`, [enrollmentId,parentId,studentId]);
      if (!updated.rows[0]) throw accessError("ENROLLMENT_NOT_FOUND", 404);
      await audit(client,parentId,"class_enrollment_revoked","class_enrollment",enrollmentId);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async teacherRoster(teacherId: string, classId: string) {
    const owned = await this.pool.query(`SELECT 1 FROM teacher_classes c JOIN teacher_profiles p ON p.user_id=c.teacher_id
      WHERE c.id=$1 AND c.teacher_id=$2 AND p.status='active'`, [classId,teacherId]);
    if (!owned.rows[0]) throw accessError("TEACHER_CLASS_NOT_FOUND", 404);
    const { rows } = await this.pool.query(`SELECT e.id AS enrollment_id,st.id AS student_id,st.name AS student_name,e.status,e.activated_at
      FROM class_enrollments e JOIN students st ON st.id=e.student_id
      WHERE e.class_id=$1 AND e.status='active'
      ORDER BY st.name`, [classId]);
    return rows.map((row: any) => ({ enrollmentId: row.enrollment_id, studentId: row.student_id, studentName: row.student_name,
      status: row.status, activatedAt: iso(row.activated_at),
      metricLabel: "Roster kelas aktif. Tracking kemajuan bahan guru belum tersedia dalam pilot ini." }));
  }

  async setTeacherStatus(adminId: string, teacherId: string, status: "active" | "suspended") {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`UPDATE teacher_profiles SET status=$2,suspended_at=CASE WHEN $2='suspended' THEN now() ELSE NULL END,updated_at=now()
        WHERE user_id=$1 RETURNING user_id`, [teacherId,status]);
      if (!result.rows[0]) throw accessError("TEACHER_NOT_FOUND", 404);
      await client.query(`UPDATE user_roles SET status=$2,revoked_at=CASE WHEN $2='revoked' THEN now() ELSE NULL END
        WHERE user_id=$1 AND role='teacher'`, [teacherId,status === "active" ? "active" : "revoked"]);
      if (status === "suspended") {
        const withdrawn = await client.query(`UPDATE teacher_materials SET status='withdrawn',review_note='Ditarik balik secara automatik apabila akses guru digantung.',
          reviewed_by=$2,reviewed_at=now(),updated_at=now()
          WHERE teacher_id=$1 AND status='published' AND publication_source='verified_teacher_auto' AND reviewed_at IS NULL RETURNING id`, [teacherId,adminId]);
        for (const material of withdrawn.rows) {
          await audit(client,adminId,"teacher_material_auto_withdrawn_on_suspension","teacher_material",material.id,{teacherId});
        }
      }
      await audit(client,adminId,status === "active" ? "teacher_reactivated" : "teacher_suspended","teacher_profile",teacherId);
      await client.query("COMMIT"); return { teacherId,status };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
}

export async function verifyTeacherJoinCodeKey(pool: Pick<Pool,"query">, secret = teacherJoinCodeSecret()) {
  const { rows } = await pool.query(`SELECT id,teacher_id,join_code_ciphertext FROM teacher_classes
    WHERE join_code_ciphertext IS NOT NULL ORDER BY created_at,id LIMIT 1`);
  const sample = rows[0];
  if (!sample) return;
  try {
    openJoinCode(sample.join_code_ciphertext,sample.id,sample.teacher_id,secret);
  } catch {
    throw new Error("Teacher join-code encryption key cannot decrypt the stored class codes");
  }
}
