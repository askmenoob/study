import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { migrateTeacherKyc, TeacherKycRepository } from "./teacherKyc.js";

const databaseUrl=process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("private teacher evidence reviews against PostgreSQL",()=>{
  const schema=`teacher_kyc_${randomUUID().replaceAll("-","")}`;
  const adminId=randomUUID(),parentId=randomUUID(),applicationId=randomUUID();
  let admin:Pool,pool:Pool,repository:TeacherKycRepository;
  beforeAll(async()=>{
    const url=new URL(databaseUrl!);
    if(!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw Error("Dedicated loopback exam_qa database required");
    admin=new Pool({connectionString:databaseUrl});await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options",`-c search_path=${schema}`);pool=new Pool({connectionString:url.toString()});
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE user_roles(user_id uuid REFERENCES users(id),role text,status text);
      CREATE TABLE teacher_applications(id uuid PRIMARY KEY,user_id uuid REFERENCES users(id),full_name text,school_name text,status text,submitted_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),review_note text,reviewed_by uuid,reviewed_at timestamptz);`);
    await pool.query("INSERT INTO users VALUES($1),($2)",[adminId,parentId]);
    await pool.query("INSERT INTO user_roles VALUES($1,'super_admin','active'),($2,'parent','active')",[adminId,parentId]);
    await pool.query("INSERT INTO teacher_applications(id,user_id,full_name,school_name,status) VALUES($1,$2,'Synthetic Teacher','Synthetic School','pending')",[applicationId,parentId]);
    await migrateTeacherKyc(pool);repository=new TeacherKycRepository(pool);
  });
  afterAll(async()=>{if(pool)await pool.end();if(admin){await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}});
  const input=async()=>{const view=await repository.read(adminId,applicationId);return {expectedVersion:view.version,applicationFingerprint:view.applicationFingerprint,clientRequestId:randomUUID(),decision:"reviewed" as const,caseReference:"CASE-QA-ALPHA",note:"Synthetic evidence reviewed outside the platform.",identityChecked:true,scopeChecked:true,safetyChecked:true};};
  it("keeps evidence private and requires complete manual checks",async()=>{
    await expect(repository.read(parentId,applicationId)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
    expect(await repository.read(adminId,applicationId)).toMatchObject({version:0,status:"unreviewed",history:[]});
    await expect(repository.record(adminId,applicationId,{...await input(),identityChecked:false})).rejects.toMatchObject({code:"INVALID_INPUT"});
    await expect(repository.record(adminId,applicationId,{...await input(),note:"Contact private@example.invalid for identification."})).rejects.toMatchObject({code:"INVALID_INPUT"});
    await expect(repository.record(adminId,applicationId,{...await input(),caseReference:"CASE-123456789012"})).rejects.toMatchObject({code:"INVALID_INPUT"});
    expect((await repository.read(adminId,applicationId)).history).toHaveLength(0);
  });
  it("appends evidence once on retry and does not activate a teacher",async()=>{
    const body=await input();const first=await repository.record(adminId,applicationId,body);
    expect(first).toMatchObject({version:1,status:"reviewed"});
    expect(first.history[0]).toMatchObject({reviewerId:adminId,caseReference:body.caseReference,identityChecked:true});
    expect((await repository.record(adminId,applicationId,body)).history).toHaveLength(1);
    await expect(repository.record(adminId,applicationId,{...body,note:"Changed evidence reference after uncertain response."})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
    expect((await pool.query("SELECT status FROM teacher_applications WHERE id=$1",[applicationId])).rows[0].status).toBe("pending");
    expect((await pool.query("SELECT role FROM user_roles WHERE user_id=$1",[parentId])).rows.map(r=>r.role)).toEqual(["parent"]);
  });
  it("serializes concurrent reviewers and retains previous evidence",async()=>{
    const body=await input();const results=await Promise.allSettled([
      repository.record(adminId,applicationId,{...body,decision:"needs_info",identityChecked:false,note:"Need a clearer independent identity check."}),
      repository.record(adminId,applicationId,{...body,clientRequestId:randomUUID(),decision:"rejected",note:"Independent verification found inconsistent evidence."})]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    const rejected=results.find(r=>r.status==="rejected") as PromiseRejectedResult;expect(rejected.reason).toMatchObject({code:"VERSION_CONFLICT"});
    const view=await repository.read(adminId,applicationId);expect(view.version).toBe(2);expect(view.history.map(r=>r.version)).toEqual([2,1]);
  });
  it("invalidates evidence on changed application and denies stale writes",async()=>{
    const body=await input();await pool.query("UPDATE teacher_applications SET school_name='Changed School' WHERE id=$1",[applicationId]);
    expect(await repository.read(adminId,applicationId)).toMatchObject({status:"stale",version:2});
    await expect(repository.record(adminId,applicationId,body)).rejects.toMatchObject({code:"APPLICATION_CHANGED"});
    expect((await repository.read(adminId,applicationId)).history).toHaveLength(2);
    expect(await repository.record(adminId,applicationId,await input())).toMatchObject({version:3,status:"reviewed"});
    await pool.query("UPDATE teacher_applications SET status='approved',review_note='Approved internally',updated_at=now() WHERE id=$1",[applicationId]);
    expect((await repository.read(adminId,applicationId)).status).toBe("reviewed");
  });
  it("checks the live admin role and rejects non-existent applications",async()=>{
    await expect(repository.read(adminId,randomUUID())).rejects.toMatchObject({code:"APPLICATION_NOT_FOUND"});
    const body=await input();await pool.query("UPDATE user_roles SET status='revoked' WHERE user_id=$1",[adminId]);
    await expect(repository.record(adminId,applicationId,body)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
    await expect(repository.read(adminId,applicationId)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
  });
});
