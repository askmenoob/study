import {migrateTeacherKyc,TeacherKycRepository} from "./teacherKyc.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { migrateAccountRoles, listActiveRoles } from "./accountRoles.js";
import { migrateTeacherNetwork, PostgresTeacherNetworkRepository } from "./teacherNetworkStore.js";
import { migrateTeacherContent, PostgresTeacherContentRepository } from "./teacherContentStore.js";

const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("teacher network against disposable PostgreSQL", () => {
  const schema = `teacher_network_${randomUUID().replaceAll("-","")}`;
  const adminId=randomUUID(),teacherId=randomUUID(),secondTeacherId=randomUUID(),parentId=randomUUID(),otherParentId=randomUUID();
  const studentId=randomUUID(),siblingStudentId=randomUUID(),otherStudentId=randomUUID();
  let admin:Pool,pool:Pool;let closeDb:(()=>Promise<void>)|undefined;
  let network:PostgresTeacherNetworkRepository,content:PostgresTeacherContentRepository;
  let joinCode="",classId="",enrollmentId="",materialId="";
  const previousJoinCodeKeyFile=process.env.JOIN_CODE_ENCRYPTION_KEY_FILE;
  let keyDirectory="";

  beforeAll(async()=>{
    keyDirectory=await mkdtemp(join(tmpdir(),"imai-study-join-code-"));
    const keyFile=join(keyDirectory,"key");await writeFile(keyFile,"synthetic-integration-join-code-secret",{mode:0o600});process.env.JOIN_CODE_ENCRYPTION_KEY_FILE=keyFile;
    const url=new URL(databaseUrl!);
    if(!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw new Error("Dedicated loopback exam_qa database required");
    admin=new Pool({connectionString:databaseUrl});await admin.query(`CREATE SCHEMA ${schema}`);url.searchParams.set("options",`-c search_path=${schema}`);process.env.DATABASE_URL=url.toString();
    const database=await import("./db.js");closeDb=database.closeDb;await database.migrate();pool=new Pool({connectionString:url.toString()});
    await migrateAccountRoles(pool);await migrateTeacherNetwork(pool);await migrateTeacherContent(pool);
    await pool.query(`INSERT INTO users(id,email,password_hash,display_name,role) VALUES
      ($1,'admin@tests.invalid','unused','Admin','super_admin'),($2,'teacher@tests.invalid','unused','Teacher Parent','parent'),
      ($3,'second-teacher@tests.invalid','unused','Second Teacher','parent'),($4,'parent@tests.invalid','unused','Parent','parent'),
      ($5,'other@tests.invalid','unused','Other Parent','parent')`,[adminId,teacherId,secondTeacherId,parentId,otherParentId]);
    await migrateAccountRoles(pool);
    await pool.query(`INSERT INTO students(id,parent_id,name,level_id) VALUES
      ($1,$2,'Aina','d1'),($3,$2,'Aisyah','d1'),($4,$5,'Badrul','d1')`,
      [studentId,parentId,siblingStudentId,otherStudentId,otherParentId]);
    network=new PostgresTeacherNetworkRepository(pool);content=new PostgresTeacherContentRepository(pool);
  });
  afterAll(async()=>{if(pool)await pool.end();if(closeDb)await closeDb();if(admin){await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}if(previousJoinCodeKeyFile===undefined)delete process.env.JOIN_CODE_ENCRYPTION_KEY_FILE;else process.env.JOIN_CODE_ENCRYPTION_KEY_FILE=previousJoinCodeKeyFile;if(keyDirectory)await rm(keyDirectory,{recursive:true,force:true});});

  it("keeps parent access while super admin approves a teacher application",async()=>{
    const application=await network.submitApplication(teacherId,{fullName:"Siti Aminah",publicName:"Cikgu Siti",schoolName:"SK Bestari",state:"Selangor",district:"Petaling",positionTitle:"Guru Akademik",academicYear:2026,levelIds:["d1"],subjectIds:["bm"],identityAttested:true,termsAttested:true});
    expect(application.status).toBe("pending");
    const approved=await network.reviewApplication(application.id,adminId,"approve","Identiti dan sekolah disemak.");
    expect(approved.status).toBe("approved");expect(await listActiveRoles(pool,teacherId)).toEqual(["parent","teacher"]);
    const secondApplication=await network.submitApplication(secondTeacherId,{fullName:"Roslan Ahmad",publicName:"Cikgu Roslan",schoolName:"SK Bestari",state:"Selangor",district:"Petaling",positionTitle:"Guru Akademik",academicYear:2026,levelIds:["d1"],subjectIds:["bm"],identityAttested:true,termsAttested:true});
    await expect(network.reviewApplication(secondApplication.id,adminId,"approve")).rejects.toMatchObject({code:"REVIEW_NOTE_REQUIRED",statusCode:400});
    await network.reviewApplication(secondApplication.id,adminId,"approve","Identiti dan sekolah disemak.");
  });

  it("serializes application approval with applicant resubmission without a deadlock",async()=>{
    const applicantId=randomUUID();
    await pool.query("INSERT INTO users(id,email,password_hash,display_name,role) VALUES($1,$2,'unused','Concurrent Applicant','parent')",[applicantId,`${applicantId}@tests.invalid`]);
    const application=await network.submitApplication(applicantId,{fullName:"Concurrent Applicant",publicName:"Cikgu Concurrent",schoolName:"SK Concurrent",state:"Selangor",district:"Petaling",positionTitle:"Guru Akademik",academicYear:2026,levelIds:["d1"],subjectIds:["bm"],identityAttested:true,termsAttested:true});
    const resubmission=await pool.connect();
    let approval:Promise<{value?:any;error?:any}>|undefined;
    try{
      await resubmission.query("BEGIN");
      await resubmission.query("SET LOCAL statement_timeout='4s'");
      const {rows:[{pid}]}=await resubmission.query("SELECT pg_backend_pid() AS pid");
      // Hold the first lock taken by submitApplication while approval starts.
      await resubmission.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[applicantId]);
      approval=network.reviewApplication(application.id,adminId,"approve","Identiti dan sekolah disemak.").then(value=>({value}),error=>({error}));
      let waiting=false;
      for(let attempt=0;attempt<150;attempt++){
        waiting=(await pool.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid))) AS waiting",[pid])).rows[0].waiting;
        if(waiting)break;
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);
      // Resubmission must still be able to take its second lock and commit.
      await resubmission.query("SELECT id FROM teacher_applications WHERE id=$1 FOR UPDATE",[application.id]);
      await resubmission.query("UPDATE teacher_applications SET public_name='Cikgu Terkini' WHERE id=$1",[application.id]);
      await resubmission.query("COMMIT");
      const result=await approval;
      expect(result.error).toBeUndefined();
      expect(result.value).toMatchObject({status:"approved",publicName:"Cikgu Terkini"});
      expect((await pool.query("SELECT public_name FROM teacher_profiles WHERE user_id=$1",[applicantId])).rows[0].public_name).toBe("Cikgu Terkini");
      await expect(network.submitApplication(applicantId,{fullName:"Concurrent Applicant",publicName:"Must Not Replace",schoolName:"SK Concurrent",state:"Selangor",district:"Petaling",positionTitle:"Guru Akademik",academicYear:2026,levelIds:["d1"],subjectIds:["bm"],identityAttested:true,termsAttested:true})).rejects.toMatchObject({code:"TEACHER_ALREADY_APPROVED"});
    }finally{
      await resubmission.query("ROLLBACK");resubmission.release();
      if(approval)await approval;
    }
  },10000);

  it("requires a current complete KYC review in the production approval policy",async()=>{
    await migrateTeacherKyc(pool);
    const applicantId=randomUUID();
    await pool.query("INSERT INTO users(id,email,password_hash,display_name,role) VALUES($1,$2,'unused','KYC QA Applicant','parent')",[applicantId,`${applicantId}@tests.invalid`]);
    const app=await network.submitApplication(applicantId,{fullName:"KYC QA Applicant",publicName:"Cikgu KYC",schoolName:"SK KYC QA",state:"Selangor",district:"Petaling",positionTitle:"Guru Akademik",academicYear:2026,levelIds:["d1"],subjectIds:["bm"],identityAttested:true,termsAttested:true});
    const secured=new PostgresTeacherNetworkRepository(pool,undefined,{requireKycReview:true}),kyc=new TeacherKycRepository(pool);
    const approve=()=>secured.reviewApplication(app.id,adminId,"approve","Synthetic approval acceptance only.");
    await expect(approve()).rejects.toMatchObject({code:"TEACHER_KYC_REQUIRED",statusCode:409});
    const record=async(decision:"reviewed"|"needs_info"|"rejected")=>{const view=await kyc.read(adminId,app.id);return kyc.record(adminId,app.id,{expectedVersion:view.version,applicationFingerprint:view.applicationFingerprint,clientRequestId:randomUUID(),decision,caseReference:"CASE-QA-FREE",note:"Synthetic identity scope and safety review only.",identityChecked:decision==="reviewed",scopeChecked:decision==="reviewed",safetyChecked:decision==="reviewed"});};
    await record("needs_info");await expect(approve()).rejects.toMatchObject({code:"TEACHER_KYC_REQUIRED"});
    await record("reviewed");await record("rejected");await expect(approve()).rejects.toMatchObject({code:"TEACHER_KYC_REQUIRED"});
    await record("reviewed");await pool.query("UPDATE teacher_applications SET public_name='Cikgu Updated KYC' WHERE id=$1",[app.id]);
    await expect(approve()).rejects.toMatchObject({code:"TEACHER_KYC_REQUIRED"});
    expect((await pool.query("SELECT status FROM teacher_applications WHERE id=$1",[app.id])).rows[0].status).toBe("pending");
    expect((await pool.query("SELECT count(*)::int AS count FROM teacher_profiles WHERE user_id=$1",[applicantId])).rows[0].count).toBe(0);
    await record("reviewed");expect(await approve()).toMatchObject({status:"approved",publicName:"Cikgu Updated KYC"});
  });

  it("requires parent consent then teacher acceptance before activating a class",async()=>{
    await expect(network.setTuitionDetails(parentId,teacherId,{experienceYears:5,qualifications:"Diploma Pendidikan",reviewNote:"Sijil dan pengalaman disemak."})).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
    await expect(network.setTuitionDetails(adminId,teacherId,{experienceYears:5,qualifications:"Hubungi +60123456789",reviewNote:"Sijil dan pengalaman disemak."})).rejects.toMatchObject({code:"INVALID_INPUT"});
    await network.setTuitionDetails(adminId,teacherId,{experienceYears:5,qualifications:"Diploma Pendidikan",reviewNote:"Sijil dan pengalaman disemak."});
    expect(await network.getTuitionTeacher(teacherId)).toMatchObject({experienceYears:5,qualifications:"Diploma Pendidikan"});
    const created=await network.createClass(teacherId,{name:"1 Bestari BM",academicYear:2026,levelId:"d1",subjectId:"bm"});
    classId=created.id;joinCode=created.joinCode!;expect(joinCode).toHaveLength(8);expect(created.codeHint).toBe(joinCode.slice(-4));
    expect((await network.listTeacherClasses(teacherId)).find(item=>item.id===classId)?.joinCode).toBe(joinCode);
    const originalJoinCode=joinCode;const rotated=await network.rotateJoinCode(teacherId,classId);joinCode=rotated.joinCode;
    expect((await network.listTeacherClasses(teacherId)).find(item=>item.id===classId)?.joinCode).toBe(joinCode);
    await expect(network.previewClass(parentId,studentId,originalJoinCode)).rejects.toMatchObject({code:"CLASS_CODE_UNAVAILABLE",statusCode:404});
    const preview=await network.previewClass(parentId,studentId,joinCode);expect(preview.class.teacherPublicName).toBe("Cikgu Siti");expect(preview.class.joinCode).toBeUndefined();
    await expect(network.previewClass(parentId,studentId,rotated.codeHint)).rejects.toMatchObject({code:"CLASS_CODE_UNAVAILABLE",statusCode:404});
    const requestId=randomUUID();
    const requested=await network.requestJoin(parentId,studentId,joinCode,"teacher-class-v1",requestId);enrollmentId=requested.id;expect(requested.status).toBe("pending_teacher");expect(requested.parentApprovedAt).toBeTruthy();
    expect((await network.requestJoin(parentId,studentId,joinCode,"teacher-class-v1",requestId)).id).toBe(enrollmentId);
    expect((await network.requestJoin(parentId,studentId,"ZZZZZZZZ","teacher-class-v1",requestId)).id).toBe(enrollmentId);
    expect((await network.listTeacherEnrollments(teacherId))[0]).toMatchObject({studentName:"Aina",status:"pending_teacher"});
    expect(await network.teacherRoster(teacherId,classId)).toEqual([]);
    expect((await network.decideEnrollment(teacherId,enrollmentId,"accept")).status).toBe("active");
    expect((await network.listTeacherClasses(teacherId)).find(item=>item.id===classId)).toMatchObject({activeStudents:1,pendingStudents:0});
    expect(await network.teacherRoster(teacherId,classId)).toEqual([expect.objectContaining({studentName:"Aina",status:"active",metricLabel:expect.stringContaining("Tracking kemajuan bahan guru belum tersedia")})]);
  });

  it("auto-publishes verified-teacher content only to the linked class and retains post-review",async()=>{
    const published=await content.createMaterial(teacherId,{clientRequestId:randomUUID(),classId,levelId:"d1",subjectId:"bm",kind:"note",title:"Mengenal suku kata",summary:"Nota ringkas untuk kelas Bahasa Melayu.",body:"Baca suku kata ini dengan perlahan, kemudian bina satu perkataan.",rightsAttested:true,privacyAttested:true});
    materialId=published.id;expect(published).toMatchObject({status:"published",publicationSource:"verified_teacher_auto"});expect(published.reviewedAt).toBeUndefined();
    const visible=await content.listPublishedForStudent(studentId,parentId);expect(visible?.[0]).toMatchObject({id:materialId,teacherName:"Cikgu Siti",className:"1 Bestari BM",schoolName:"SK Bestari"});
    expect(await content.listPublishedForStudent(otherStudentId,otherParentId)).toEqual([]);
    expect((await content.listForReview("unreviewed"))[0]?.id).toBe(materialId);
    const reviewed=await content.reviewMaterial(materialId,adminId,"approve","Semakan dalaman");expect(reviewed.reviewedAt).toBeTruthy();
    expect(await content.listForReview("unreviewed")).toEqual([]);
  });

  it("keeps the current teacher while one transfer waits and blocks overlapping requests",async()=>{
    const secondClass=await network.createClass(secondTeacherId,{name:"1 Cemerlang BM",academicYear:2026,levelId:"d1",subjectId:"bm"});
    const transferRequestId=randomUUID();
    const transfer=await network.requestJoin(parentId,studentId,secondClass.joinCode!,"teacher-class-v1",transferRequestId,enrollmentId);
    expect(transfer).toMatchObject({status:"pending_teacher",replacesEnrollmentId:enrollmentId,teacherPublicName:"Cikgu Roslan"});
    expect((await network.requestJoin(parentId,studentId,secondClass.joinCode!,"teacher-class-v1",transferRequestId,enrollmentId)).id).toBe(transfer.id);
    expect((await content.listPublishedForStudent(studentId,parentId))?.[0]?.id).toBe(materialId);
    await expect(network.requestJoin(parentId,studentId,secondClass.joinCode!,"teacher-class-v1",randomUUID(),enrollmentId)).rejects.toMatchObject({code:"SUBJECT_CLASS_REQUEST_PENDING",statusCode:409});
    await network.decideEnrollment(secondTeacherId,transfer.id,"decline");
    expect((await network.listFamilyEnrollments(parentId,studentId)).find(item=>item.id===enrollmentId)?.status).toBe("active");
  });

  it("revocation and teacher suspension cut off access without deleting family data",async()=>{
    await expect(network.endEnrollment(parentId,siblingStudentId,enrollmentId)).rejects.toMatchObject({code:"ENROLLMENT_NOT_FOUND",statusCode:404});
    expect((await content.listPublishedForStudent(studentId,parentId))?.[0]?.id).toBe(materialId);
    await network.endEnrollment(parentId,studentId,enrollmentId);expect(await content.listPublishedForStudent(studentId,parentId)).toEqual([]);
    const joined=await network.requestJoin(parentId,studentId,joinCode,"teacher-class-v1",randomUUID());await network.decideEnrollment(teacherId,joined.id,"accept");
    expect((await content.listPublishedForStudent(studentId,parentId))?.length).toBe(1);
    await network.setTeacherStatus(adminId,teacherId,"suspended");
    expect(await content.listPublishedForStudent(studentId,parentId)).toEqual([]);expect(await listActiveRoles(pool,teacherId)).toEqual(["parent"]);
    expect((await network.listFamilyEnrollments(parentId,studentId)).find(item=>item.id===joined.id)?.teacherStatus).toBe("suspended");
    expect((await pool.query("SELECT COUNT(*)::int AS count FROM students WHERE parent_id=$1",[parentId])).rows[0].count).toBe(2);
  });
});
