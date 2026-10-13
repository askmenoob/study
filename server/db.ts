import { Pool } from "pg";
export { migrateExams } from "./examStore.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
});

export async function migrate(target: Pick<Pool, "query"> = pool) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      display_name text NOT NULL,
      role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent','teacher','super_admin')),
      plan text NOT NULL DEFAULT 'free',
      subscription_status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
    UPDATE users SET role='parent' WHERE role IS NULL;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'parent';
    ALTER TABLE users ALTER COLUMN role SET NOT NULL;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid='users'::regclass AND conname='users_role_check'
          AND pg_get_constraintdef(oid) LIKE '%teacher%'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('parent','teacher','super_admin'));
      END IF;
    END $$;
  `);
  await target.query(`
    CREATE TABLE IF NOT EXISTS students (
      id uuid PRIMARY KEY,
      parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      level_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS students_parent_idx ON students(parent_id);
  `);

  await target.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      level_id text NOT NULL,
      subject_id text NOT NULL,
      topic_id text NOT NULL,
      score integer NOT NULL CHECK (score >= 0),
      total integer NOT NULL CHECK (total > 0),
      answers jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS attempts_student_created_idx
      ON attempts(student_id, created_at DESC);
  `);
  await target.query(`
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS client_attempt_id text;
    CREATE UNIQUE INDEX IF NOT EXISTS attempts_client_attempt_uidx
      ON attempts(client_attempt_id) WHERE client_attempt_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS attempts_client_attempt_unique_v1
      ON attempts(client_attempt_id);
  `);
  await target.query(`
    CREATE TABLE IF NOT EXISTS tutor_logs (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id text,
      topic_id text,
      question text NOT NULL,
      answer text NOT NULL,
      provider text NOT NULL DEFAULT 'local',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE tutor_logs ADD COLUMN IF NOT EXISTS conversation_id uuid;
    ALTER TABLE tutor_logs ADD COLUMN IF NOT EXISTS resource_id text;
    CREATE INDEX IF NOT EXISTS tutor_logs_conversation_idx
      ON tutor_logs(student_id,conversation_id,created_at DESC);
  `);
}

export async function migrateFocusSessions() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_links (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      code_hash text UNIQUE NOT NULL,
      duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 180),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      redeemed_at timestamptz,
      revoked_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS study_links_student_idx ON study_links(student_id);
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      link_id uuid UNIQUE NOT NULL REFERENCES study_links(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','exit_requested','approved','revoked','expired')),
      ends_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      exit_requested_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS focus_sessions_student_idx ON focus_sessions(student_id);
  `);
}

export async function closeDb() {
  await pool.end();
}
