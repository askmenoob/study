import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { beforeAll,afterAll,describe,it,expect } from "vitest";
import { migrateTuitionVideo,TuitionVideoRepository,videoUrl,sealVideoLink,openVideoLink } from "./tuitionVideo.js";
const databaseUrl=process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("private meeting links with real PostgreSQL",()=>{
 const schema="video_"+randomUUID().replaceAll("-","");const adminId=randomUUID(),teacher=randomUUID(),otherTeacher=randomUUID(),parent=randomUUID(),otherParent=randomUUID(),child=randomUUID(),sibling=randomUUID(),classId=randomUUID(),slot=randomUUID(),booking=randomUUID();
 const secret="synthetic_video_secret_at_least_32_chars",meeting="https://meet.google.com/abc-defg-hij";let now=Date.now(),owner:Pool,pool:Pool,repository:TuitionVideoRepository;
 beforeAll(async()=>{const url=new URL(databaseUrl!);if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw Error("Dedicated loopback exam_qa required");owner=new Pool({connectionString:databaseUrl});await owner.query(`CREATE SCHEMA ${schema}`);url.searchParams.set("options",`-c search_path=${schema}`);pool=new Pool({connectionString:url.toString()});
 await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE user_roles(user_id uuid,role text,status text);CREATE TABLE students(id uuid PRIMARY KEY,parent_id uuid);CREATE TABLE teacher_profiles(user_id uuid PRIMARY KEY,status text);CREATE TABLE teacher_classes(id uuid PRIMARY KEY,teacher_id uuid,status text);CREATE TABLE tuition_slots(id uuid PRIMARY KEY,teacher_id uuid,class_id uuid,status text,starts_at timestamptz,ends_at timestamptz);CREATE TABLE tuition_bookings(id uuid PRIMARY KEY,parent_id uuid,student_id uuid,slot_id uuid,status text);
 INSERT INTO users VALUES('${adminId}'),('${teacher}'),('${otherTeacher}'),('${parent}'),('${otherParent}');INSERT INTO user_roles VALUES('${adminId}','super_admin','active'),('${teacher}','teacher','active'),('${otherTeacher}','teacher','active'),('${parent}','parent','active'),('${otherParent}','parent','active');
 INSERT INTO teacher_profiles VALUES('${teacher}','active'),('${otherTeacher}','active');INSERT INTO students VALUES('${child}','${parent}'),('${sibling}','${parent}');INSERT INTO teacher_classes VALUES('${classId}','${teacher}','active');
 INSERT INTO tuition_slots VALUES('${slot}','${teacher}','${classId}','open',now()+interval '2 hours',now()+interval '3 hours');INSERT INTO tuition_bookings VALUES('${booking}','${parent}','${child}','${slot}','accepted');`);
 await migrateTuitionVideo(pool);repository=new TuitionVideoRepository(pool,()=>secret,()=>now);
 });afterAll(async()=>{if(pool)await pool.end();if(owner){await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await owner.end();}});
 it("accepts only supported HTTPS meeting domains and authenticated ciphertext context",()=>{
  expect(videoUrl(meeting,"google_meet")).toBe(meeting);expect(videoUrl("https://us06web.zoom.us/j/123456789?pwd=synthetic","zoom")).toContain("zoom.us");
  for(const url of ["http://meet.google.com/abc-defg-hij","https://meet.google.com.attacker.invalid/abc-defg-hij","https://private:secret@meet.google.com/abc-defg-hij","https://meet.google.com:444/abc-defg-hij","javascript:alert(1)","https://127.0.0.1/j/123456789"])expect(()=>videoUrl(url,"google_meet")).toThrow();
  const sealed=sealVideoLink(meeting,slot,teacher,secret);expect(sealed).not.toContain("google.com");expect(openVideoLink(sealed,slot,teacher,secret)).toBe(meeting);expect(()=>openVideoLink(sealed,slot,otherTeacher,secret)).toThrow();expect(()=>openVideoLink(sealed,randomUUID(),teacher,secret)).toThrow();
 });
 it("defaults disabled and requires admin-approved provider policy",async()=>{
  expect(await repository.adminPolicy(adminId)).toMatchObject({enabled:false,provider:null,version:0});await expect(repository.saveLink(teacher,slot,{url:meeting,expectedVersion:0})).rejects.toMatchObject({code:"VIDEO_NOT_CONFIGURED"});
  const policy={expectedVersion:0,provider:"google_meet" as const,enabled:true,joinBeforeMinutes:15,joinAfterMinutes:15,providerApproved:true as const,reviewNote:"Synthetic staging provider policy reviewed."};
  await expect(repository.setPolicy(parent,policy)).rejects.toMatchObject({code:"ROLE_ACCESS_REQUIRED"});expect(await repository.setPolicy(adminId,policy)).toMatchObject({version:1});await expect(repository.setPolicy(adminId,policy)).rejects.toMatchObject({code:"VERSION_CONFLICT"});
 });
 it("keeps encrypted links owned by the slot teacher and versioned",async()=>{
  await expect(repository.saveLink(otherTeacher,slot,{url:meeting,expectedVersion:0})).rejects.toMatchObject({code:"SLOT_NOT_FOUND"});await repository.saveLink(teacher,slot,{url:meeting,expectedVersion:0});expect(await repository.teacherLink(teacher,slot)).toMatchObject({url:meeting,version:1});
  await expect(repository.saveLink(teacher,slot,{url:meeting,expectedVersion:0})).rejects.toMatchObject({code:"VERSION_CONFLICT"});expect((await pool.query("SELECT sealed_url FROM tuition_video_links")).rows[0].sealed_url).not.toContain("meet.google.com");
 });
 it("allows only accepted scoped participants inside the approved join window",async()=>{
  await expect(repository.participantLink(otherParent,"parent",booking)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});await expect(repository.participantLink(parent,"student",booking,sibling)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});
  await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"VIDEO_JOIN_WINDOW"});const times=(await pool.query("SELECT starts_at,ends_at FROM tuition_slots WHERE id=$1",[slot])).rows[0];now=new Date(times.starts_at).getTime()-15*60000;
  expect(await repository.participantLink(parent,"student",booking,child)).toMatchObject({url:meeting,provider:"google_meet"});now=new Date(times.ends_at).getTime()+15*60000+1;await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"VIDEO_JOIN_WINDOW"});
  now=new Date(times.starts_at).getTime();await pool.query("UPDATE tuition_bookings SET status='cancelled' WHERE id=$1",[booking]);await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});await pool.query("UPDATE tuition_bookings SET status='accepted' WHERE id=$1",[booking]);
 });
 it("suspension and disabling/changing the provider cut off participant links",async()=>{
  await pool.query("UPDATE user_roles SET status='revoked' WHERE user_id=$1 AND role='teacher'",[teacher]);await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});await pool.query("UPDATE user_roles SET status='active' WHERE user_id=$1",[teacher]);
  await repository.setPolicy(adminId,{expectedVersion:1,provider:"zoom",enabled:true,joinBeforeMinutes:15,joinAfterMinutes:15,providerApproved:true,reviewNote:"Synthetic provider changed after review."});await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"VIDEO_LINK_NOT_READY"});
  await repository.setPolicy(adminId,{expectedVersion:2,provider:"zoom",enabled:false,joinBeforeMinutes:15,joinAfterMinutes:15,providerApproved:true,reviewNote:"Synthetic provider disabled for review."});await expect(repository.participantLink(parent,"parent",booking)).rejects.toMatchObject({code:"VIDEO_NOT_CONFIGURED"});
 });
});
