import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrateTuitionBooking, TuitionBookingRepository } from "./tuitionBookingStore.js";
import { migrateTuitionLearning, TuitionLearningRepository } from "./tuitionLearningStore.js";

const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("tuition booking: real PostgreSQL isolation and concurrency", () => {
  const schema = "tuition_" + randomUUID().replaceAll("-", "");
  const teacher = randomUUID(), otherTeacher = randomUUID(), parent = randomUUID(), otherParent = randomUUID();
  const child = randomUUID(), sibling = randomUUID(), stranger = randomUUID(), classId = randomUUID();
  let admin: Pool, pool: Pool, repository: TuitionBookingRepository;
  const date = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["localhost","127.0.0.1","[::1]"].includes(url.hostname) || !url.pathname.startsWith("/exam_qa") || url.searchParams.has("options")) throw Error("Disposable loopback exam_qa required");
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options", "-c search_path=" + schema);
    pool = new Pool({ connectionString: url.toString() });
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE user_roles(user_id uuid,role text,status text);
      CREATE TABLE students(id uuid PRIMARY KEY,parent_id uuid REFERENCES users(id),name text,level_id text);
      CREATE TABLE teacher_profiles(user_id uuid PRIMARY KEY REFERENCES users(id),public_name text,status text);
      CREATE TABLE teacher_classes(id uuid PRIMARY KEY,teacher_id uuid REFERENCES teacher_profiles(user_id),name text,level_id text,subject_id text,status text);
      INSERT INTO users VALUES ('${teacher}'),('${otherTeacher}'),('${parent}'),('${otherParent}');
      INSERT INTO user_roles VALUES ('${teacher}','teacher','active'),('${otherTeacher}','teacher','active'),('${parent}','parent','active'),('${otherParent}','parent','active');
      INSERT INTO teacher_profiles VALUES ('${teacher}','Cikgu Siti','active'),('${otherTeacher}','Cikgu Luar','active');
      INSERT INTO students VALUES ('${child}','${parent}','Aina','d1'),('${sibling}','${parent}','Aisyah','d1'),('${stranger}','${otherParent}','Badrul','d1');
      INSERT INTO teacher_classes VALUES ('${classId}','${teacher}','BM','d1','bm','active');`);
    await migrateTuitionBooking(pool);
    await pool.query(`CREATE TABLE class_enrollments(class_id uuid,student_id uuid,status text);`);
    await pool.query(`CREATE TABLE attempts(student_id uuid,subject_id text,topic_id text,score integer,total integer,created_at timestamptz DEFAULT now());`);
    await migrateTuitionLearning(pool);
    repository = new TuitionBookingRepository(pool);
  });
  afterAll(async () => { if(pool) await pool.end(); if(admin) { await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); } });
  it("rejects a class belonging to a different teacher", async () => {
    await expect(repository.createSlot(otherTeacher,{classId,startsAt:date(48),endsAt:date(49),capacity:1,kind:"individual",trial:false})).rejects.toMatchObject({code:"CLASS_NOT_FOUND"});
  });
  it("serializes overlapping availability and accepts adjacent windows", async () => {
    const input = {classId,startsAt:date(72),endsAt:date(73),capacity:1,kind:"individual" as const,trial:false};
    const results = await Promise.allSettled([repository.createSlot(teacher,input),repository.createSlot(teacher,input)]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(r=>r.status==="rejected")[0]).toMatchObject({reason:{code:"TIME_CONFLICT"}});
    expect(await repository.createSlot(teacher,{...input,startsAt:input.endsAt,endsAt:date(74)})).toMatchObject({status:"open"});
  });
  it("enforces capacity, ownership, consent and request idempotency", async () => {
    const slot = await repository.createSlot(teacher,{classId,startsAt:date(96),endsAt:date(97),capacity:1,kind:"individual",trial:true});
    await expect(repository.requestBooking(parent,{slotId:slot.id,studentId:stranger,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"})).rejects.toMatchObject({code:"STUDENT_NOT_FOUND"});
    const key = randomUUID();
    const input = {slotId:slot.id,studentId:child,clientRequestId:key,consentVersion:"tuition-booking-v1" as const};
    const booking = await repository.requestBooking(parent,input);
    expect(booking.status).toBe("pending");
    expect((await repository.requestBooking(parent,input)).id).toBe(booking.id);
    await expect(repository.requestBooking(parent,{...input,studentId:sibling})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
    await expect(repository.requestBooking(parent,{...input,studentId:sibling,clientRequestId:randomUUID()})).rejects.toMatchObject({code:"SLOT_FULL"});
    await expect(repository.decide(otherTeacher,booking.id,"accept")).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});
    await expect(repository.cancel(otherParent,"parent",booking.id)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});
    expect((await repository.decide(teacher,booking.id,"accept")).status).toBe("accepted");
    expect((await repository.cancel(parent,"parent",booking.id)).status).toBe("cancelled");
    const notifications=await repository.notifications(parent,"parent");
    expect(notifications.map(n=>n.event)).toContain("accepted");
    await expect(repository.readNotification(otherParent,"parent",notifications[0].id)).rejects.toMatchObject({code:"NOTIFICATION_NOT_FOUND"});
    await repository.readNotification(parent,"parent",notifications[0].id);
    expect((await repository.notifications(parent,"parent"))[0].readAt).not.toBeNull();
  });
  it("two families racing for the last seat cannot oversell", async () => {
    const slot = await repository.createSlot(teacher,{classId,startsAt:date(120),endsAt:date(121),capacity:1,kind:"individual",trial:false});
    const results = await Promise.allSettled([
      repository.requestBooking(parent,{slotId:slot.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"}),
      repository.requestBooking(otherParent,{slotId:slot.id,studentId:stranger,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"}),
    ]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(r=>r.status==="rejected")[0]).toMatchObject({reason:{code:"SLOT_FULL"}});
  });
  it("blocks overlapping student bookings across different slots", async () => {
    const slot = await repository.createSlot(teacher,{classId,startsAt:date(144),endsAt:date(145),capacity:2,kind:"group",trial:false});
    const booking = await repository.requestBooking(parent,{slotId:slot.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});
    await expect(repository.requestBooking(parent,{slotId:slot.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"})).rejects.toMatchObject({code:"STUDENT_TIME_CONFLICT"});
    expect((await repository.listBookings(parent,"student",child)).map(b=>b.id)).toContain(booking.id);
    await expect(repository.listBookings(otherParent,"student",child)).rejects.toMatchObject({code:"STUDENT_NOT_FOUND"});
  });
  it("reschedules atomically and restores the original booking when the target is full",async()=>{
    const original=await repository.createSlot(teacher,{classId,startsAt:date(200),endsAt:date(201),capacity:1,kind:"individual",trial:false});
    const target=await repository.createSlot(teacher,{classId,startsAt:date(202),endsAt:date(203),capacity:1,kind:"individual",trial:false});
    const old=await repository.requestBooking(parent,{slotId:original.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});
    const occupied=await repository.requestBooking(otherParent,{slotId:target.id,studentId:stranger,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});
    const input={slotId:target.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1",replacesBookingId:old.id};
    await expect(repository.requestBooking(parent,input)).rejects.toMatchObject({code:"SLOT_FULL"});
    expect((await repository.listBookings(parent,"parent")).find(b=>b.id===old.id)?.status).toBe("pending");
    await repository.cancel(otherParent,"parent",occupied.id);
    const replacement=await repository.requestBooking(parent,input);
    expect(replacement.status).toBe("pending");
    expect((await repository.requestBooking(parent,input)).id).toBe(replacement.id);
    expect((await repository.listBookings(parent,"parent")).find(b=>b.id===old.id)?.status).toBe("cancelled");
    expect((await pool.query("SELECT count(*)::int AS n FROM tuition_booking_events WHERE booking_id=$1 AND action='rescheduled'",[old.id])).rows[0].n).toBe(1);
  });
  it("attendance requires teacher ownership, accepted status and a session that has begun",async()=>{
    const sl=await repository.createSlot(teacher,{classId,startsAt:date(220),endsAt:date(221),capacity:1,kind:"individual",trial:false});
    const b=await repository.requestBooking(parent,{slotId:sl.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});
    await expect(repository.attendance(teacher,b.id,"present")).rejects.toMatchObject({code:"ATTENDANCE_NOT_READY"});
    await repository.decide(teacher,b.id,"accept");
    await expect(repository.attendance(teacher,b.id,"present")).rejects.toMatchObject({code:"ATTENDANCE_NOT_READY"});
    await pool.query("UPDATE tuition_slots SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[sl.id]);
    await expect(repository.attendance(otherTeacher,b.id,"present")).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});
    await repository.attendance(teacher,b.id,"present");
    expect((await repository.listBookings(parent,"student",child)).find(row=>row.id===b.id)).toMatchObject({attendance:"present"});
    expect((await pool.query("SELECT attendance_by FROM tuition_bookings WHERE id=$1",[b.id])).rows[0].attendance_by).toBe(teacher);
  });
  it("homework scopes learners, rejects stale reviews and removes old feedback after a new answer",async()=>{
    const learning=new TuitionLearningRepository(pool);
    await pool.query("INSERT INTO class_enrollments VALUES($1,$2,'active')",[classId,child]);
    const input={classId,title:"Bina ayat",instructions:"Bina tiga ayat menggunakan perkataan yang dipelajari.",rubric:"Makna 50, ejaan 50",dueAt:date(240),clientRequestId:randomUUID(),privacyAttested:true as const};
    const assigned=await learning.assign(teacher,input);
    expect((await learning.assign(teacher,input)).id).toBe(assigned.id);
    await expect(learning.assign(teacher,{...input,title:"Tajuk berubah"})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
    expect((await learning.listStudent(parent,child)).map(h=>h.id)).toContain(assigned.id);
    expect(await learning.listStudent(otherParent,stranger)).toEqual([]);
    await expect(learning.submit(otherParent,child,assigned.id,"Jawapan",0)).rejects.toMatchObject({code:"STUDENT_NOT_FOUND"});
    await expect(learning.submit(otherParent,stranger,assigned.id,"Jawapan",0)).rejects.toMatchObject({code:"HOMEWORK_NOT_FOUND"});
    const submitted=await learning.submit(parent,child,assigned.id,"Saya suka membaca. Buku itu menarik.",0);
    await expect(learning.review(otherTeacher,submitted.id,90,"Bagus",1)).rejects.toMatchObject({code:"SUBMISSION_NOT_FOUND"});
    const reviewed=await learning.review(teacher,submitted.id,90,"Semak huruf besar.",1);
    expect(reviewed.score).toBe(90);
    await expect(learning.review(teacher,submitted.id,100,"Bagus",1)).rejects.toMatchObject({code:"VERSION_CONFLICT"});
    expect((await learning.listStudent(parent,child))[0]).toMatchObject({score:90,feedback:"Semak huruf besar.",version:2});
    const resubmitted=await learning.submit(parent,child,assigned.id,"Saya suka membaca. Buku itu sangat menarik.",2);
    expect(resubmitted).toMatchObject({score:null,feedback:null,version:3});
    await expect(learning.submit(parent,child,assigned.id,"Tertindih",2)).rejects.toMatchObject({code:"VERSION_CONFLICT"});
  });
  it("closing an owned slot cancels its reservations atomically and prevents new booking",async()=>{
    const sl=await repository.createSlot(teacher,{classId,startsAt:date(260),endsAt:date(261),capacity:2,kind:"group",trial:false});
    const b=await repository.requestBooking(parent,{slotId:sl.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});
    await expect(repository.closeSlot(otherTeacher,sl.id)).rejects.toMatchObject({code:"SLOT_NOT_FOUND"});
    await repository.closeSlot(teacher,sl.id);await repository.closeSlot(teacher,sl.id);
    expect((await repository.listBookings(parent,"parent")).find(row=>row.id===b.id)?.status).toBe("cancelled");
    await expect(repository.requestBooking(parent,{slotId:sl.id,studentId:sibling,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"})).rejects.toMatchObject({code:"SLOT_NOT_FOUND"});
    expect((await pool.query("SELECT count(*)::int AS n FROM tuition_booking_events WHERE booking_id=$1 AND action='slot_closed'",[b.id])).rows[0].n).toBe(1);
  });
  it("a historical single-session booking does not grant access to future class homework",async()=>{
    const learning=new TuitionLearningRepository(pool);
    const sl=await repository.createSlot(teacher,{classId,startsAt:date(280),endsAt:date(281),capacity:1,kind:"individual",trial:false});
    const b=await repository.requestBooking(parent,{slotId:sl.id,studentId:sibling,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"});await repository.decide(teacher,b.id,"accept");
    await pool.query("UPDATE tuition_slots SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[sl.id]);
    const h=await learning.assign(teacher,{classId,title:"Tugasan baharu",instructions:"Bina dua ayat tentang sekolah.",rubric:"Makna 50, ejaan 50",dueAt:date(300),clientRequestId:randomUUID(),privacyAttested:true});
    expect((await learning.listStudent(parent,sibling)).map(row=>row.id)).not.toContain(h.id);
    await expect(learning.submit(parent,sibling,h.id,"Saya suka sekolah.",0)).rejects.toMatchObject({code:"HOMEWORK_NOT_FOUND"});
    await pool.query("UPDATE tuition_homework SET created_at=now()-interval '3 hours' WHERE id=$1",[h.id]);
    expect((await learning.listStudent(parent,sibling)).map(row=>row.id)).toContain(h.id);
  });
  it("reports attendance and actual practice evidence with bounded weak-topic criteria",async()=>{
    const learning=new TuitionLearningRepository(pool);
    await pool.query("INSERT INTO attempts(student_id,subject_id,topic_id,score,total) VALUES($1,'bm','ayat',1,5),($1,'bm','ayat',2,5),($1,'bm','ayat',2,5),($1,'math','nombor',0,5)",[child]);
    const report=await learning.report(parent,child);
    expect(report.attendance.present).toBe(1);
    expect(report.practiceTopicsToReview).toEqual([{subjectId:"bm",topicId:"ayat",attempts:3,correct:5,questions:15}]);
    expect(report.weekly[0]).toMatchObject({attempts:4,correct:5,questions:20});
    await expect(learning.report(otherParent,child)).rejects.toMatchObject({code:"STUDENT_NOT_FOUND"});
  });
  it("suspension hides slots and prevents stale teacher or parent writes", async () => {
    const slot = await repository.createSlot(teacher,{classId,startsAt:date(168),endsAt:date(169),capacity:1,kind:"individual",trial:false});
    await pool.query("UPDATE teacher_profiles SET status='suspended' WHERE user_id=$1",[teacher]);
    expect(await repository.listSlots(teacher)).toEqual([]);
    await expect(repository.requestBooking(parent,{slotId:slot.id,studentId:child,clientRequestId:randomUUID(),consentVersion:"tuition-booking-v1"})).rejects.toMatchObject({code:"SLOT_NOT_FOUND"});
    await expect(repository.createSlot(teacher,{classId,startsAt:date(192),endsAt:date(193),capacity:1,kind:"individual",trial:false})).rejects.toMatchObject({code:"TEACHER_ACCESS_REQUIRED"});
  });
  it("preserves guardian child deletion and removes the child's tuition records",async()=>{
    await pool.query("DELETE FROM students WHERE id=$1 AND parent_id=$2",[child,parent]);
    expect((await pool.query("SELECT count(*)::int AS n FROM tuition_bookings WHERE student_id=$1",[child])).rows[0].n).toBe(0);
    expect((await pool.query("SELECT count(*)::int AS n FROM tuition_homework_submissions WHERE student_id=$1",[child])).rows[0].n).toBe(0);
  });
});
