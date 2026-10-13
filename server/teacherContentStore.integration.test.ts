import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrateAccountRoles } from "./accountRoles.js";
import { migrateTeacherNetwork } from "./teacherNetworkStore.js";
import { migrateTeacherContent } from "./teacherContentStore.js";

const databaseUrl=process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("teacher content migration against disposable PostgreSQL",()=>{
  const schema=`teacher_content_${randomUUID().replaceAll("-","")}`;let admin:Pool,pool:Pool;let closeDb:(()=>Promise<void>)|undefined;
  beforeAll(async()=>{const url=new URL(databaseUrl!);if(!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw new Error("Dedicated loopback exam_qa database required");admin=new Pool({connectionString:databaseUrl});await admin.query(`CREATE SCHEMA ${schema}`);url.searchParams.set("options",`-c search_path=${schema}`);process.env.DATABASE_URL=url.toString();const database=await import("./db.js");closeDb=database.closeDb;await database.migrate();pool=new Pool({connectionString:url.toString()});await migrateAccountRoles(pool);await migrateTeacherNetwork(pool);await migrateTeacherContent(pool);await migrateTeacherContent(pool);});
  afterAll(async()=>{if(pool)await pool.end();if(closeDb)await closeDb();if(admin){await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}});
  it("adds class audience, publication provenance and moderation constraints idempotently",async()=>{const columns=await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='teacher_materials'`);const names=columns.rows.map(row=>row.column_name);expect(names).toContain("class_id");expect(names).toContain("publication_source");const constraints=await pool.query(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='teacher_materials'::regclass`);const definitions=constraints.rows.map(row=>row.definition).join(" ");expect(definitions).toContain("rights_attested");expect(definitions).toContain("privacy_attested");expect(definitions).toContain("verified_teacher_auto");});
});
