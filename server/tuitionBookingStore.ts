import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { accessError } from "./familyAccess.js";

export type SlotInput = { classId: string; startsAt: string; endsAt: string; kind: "individual" | "group"; capacity: number; trial: boolean };
export type BookingInput = { slotId: string; studentId: string; clientRequestId: string; consentVersion: string; replacesBookingId?:string };
export async function migrateTuitionBooking(pool: Pick<Pool,"query">) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tuition_slots(
      id uuid PRIMARY KEY, teacher_id uuid NOT NULL REFERENCES teacher_profiles(user_id),
      class_id uuid NOT NULL REFERENCES teacher_classes(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
      timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur' CHECK(timezone='Asia/Kuala_Lumpur'),
      kind text NOT NULL CHECK(kind IN ('individual','group')), capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 20),
      trial boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','cancelled')),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK(ends_at > starts_at AND ends_at-starts_at BETWEEN interval '15 minutes' AND interval '4 hours'),
      CHECK(kind='group' OR capacity=1));
    CREATE INDEX IF NOT EXISTS tuition_slots_time_idx ON tuition_slots(teacher_id,starts_at,ends_at) WHERE status='open';
    CREATE TABLE IF NOT EXISTS tuition_bookings(
      id uuid PRIMARY KEY, slot_id uuid NOT NULL REFERENCES tuition_slots(id), student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      parent_id uuid NOT NULL REFERENCES users(id), client_request_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','cancelled')),
      consent_version text NOT NULL CHECK(consent_version='tuition-booking-v1'), consent_at timestamptz NOT NULL DEFAULT now(),
      attendance text CHECK(attendance IN ('present','absent','excused')), attendance_at timestamptz,
      attendance_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(parent_id,client_request_id));
    ALTER TABLE tuition_bookings ADD COLUMN IF NOT EXISTS replaces_booking_id uuid REFERENCES tuition_bookings(id);
    CREATE UNIQUE INDEX IF NOT EXISTS tuition_booking_live_student_idx ON tuition_bookings(slot_id,student_id) WHERE status IN ('pending','accepted');
    CREATE INDEX IF NOT EXISTS tuition_booking_parent_idx ON tuition_bookings(parent_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS tuition_booking_events(
      id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES tuition_bookings(id) ON DELETE CASCADE,
      actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS tuition_notifications(
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), booking_id uuid NOT NULL REFERENCES tuition_bookings(id) ON DELETE CASCADE,
      event text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='tuition_bookings'::regclass AND conname='tuition_bookings_student_id_fkey' AND confdeltype<>'c') THEN
        ALTER TABLE tuition_bookings DROP CONSTRAINT tuition_bookings_student_id_fkey;
        ALTER TABLE tuition_bookings ADD CONSTRAINT tuition_bookings_student_id_fkey FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='tuition_booking_events'::regclass AND conname='tuition_booking_events_booking_id_fkey' AND confdeltype<>'c') THEN
        ALTER TABLE tuition_booking_events DROP CONSTRAINT tuition_booking_events_booking_id_fkey;
        ALTER TABLE tuition_booking_events ADD CONSTRAINT tuition_booking_events_booking_id_fkey FOREIGN KEY(booking_id) REFERENCES tuition_bookings(id) ON DELETE CASCADE;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='tuition_notifications'::regclass AND conname='tuition_notifications_booking_id_fkey' AND confdeltype<>'c') THEN
        ALTER TABLE tuition_notifications DROP CONSTRAINT tuition_notifications_booking_id_fkey;
        ALTER TABLE tuition_notifications ADD CONSTRAINT tuition_notifications_booking_id_fkey FOREIGN KEY(booking_id) REFERENCES tuition_bookings(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
}
const iso = (value: any) => new Date(value).toISOString();
function slot(row: any) {
  return {id:row.id,teacherId:row.teacher_id,classId:row.class_id,className:row.class_name,
    teacherName:row.teacher_name,levelId:row.level_id,subjectId:row.subject_id,startsAt:iso(row.starts_at),
    endsAt:iso(row.ends_at),timezone:"Asia/Kuala_Lumpur",kind:row.kind,capacity:row.capacity,trial:row.trial,
    ...(row.remaining !== undefined ? {remaining:Number(row.remaining)} : {}),status:row.status};
}
function booking(row: any) {
  return {id:row.id,slotId:row.slot_id,studentId:row.student_id,studentName:row.student_name,
    status:row.status,className:row.class_name,teacherName:row.teacher_name,
    teacherId:row.teacher_id,subjectId:row.subject_id,startsAt:iso(row.starts_at),endsAt:iso(row.ends_at),
    trial:row.trial,attendance:row.attendance ?? null,attendanceAt:row.attendance_at ? iso(row.attendance_at) : null,
    timezone:"Asia/Kuala_Lumpur"};
}
const slotsSelect = `SELECT s.*,c.name AS class_name,c.level_id,c.subject_id,p.public_name AS teacher_name
 FROM tuition_slots s JOIN teacher_classes c ON c.id=s.class_id JOIN teacher_profiles p ON p.user_id=s.teacher_id`;
const bookingsSelect = `SELECT b.*,s.teacher_id,s.starts_at,s.ends_at,s.trial,c.name AS class_name,c.subject_id,
 p.public_name AS teacher_name,st.name AS student_name FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id
 JOIN teacher_classes c ON c.id=s.class_id JOIN teacher_profiles p ON p.user_id=s.teacher_id JOIN students st ON st.id=b.student_id`;

export class TuitionBookingRepository {
  constructor(private pool: Pool) {}
  private async transaction<T>(operation: (client: PoolClient)=>Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await operation(client); await client.query("COMMIT"); return result; }
    catch(error) { await client.query("ROLLBACK"); throw error; } finally {client.release();}
  }
  private async role(client: Pick<PoolClient,"query">,id:string,role:string) {
    if (!(await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2 AND status='active'",[id,role])).rows[0])
      throw accessError(role.toUpperCase()+"_ACCESS_REQUIRED");
  }
  private async teacher(client: Pick<PoolClient,"query">,id:string) {
    await this.role(client,id,"teacher");
    if (!(await client.query("SELECT 1 FROM teacher_profiles WHERE user_id=$1 AND status='active' FOR UPDATE",[id])).rows[0])
      throw accessError("TEACHER_ACCESS_REQUIRED");
  }
  private async child(client: Pick<PoolClient,"query">,parent:string,id:string) {
    await this.role(client,parent,"parent");
    const row = (await client.query("SELECT id,level_id FROM students WHERE id=$1 AND parent_id=$2 FOR UPDATE",[id,parent])).rows[0];
    if(!row) throw accessError("STUDENT_NOT_FOUND",404);
    return row;
  }
  private async record(client: PoolClient,id:string,actor:string,action:string,parent:string,teacher:string) {
    await client.query("INSERT INTO tuition_booking_events(id,booking_id,actor_id,action) VALUES($1,$2,$3,$4)",[randomUUID(),id,actor,action]);
    // Durable in-app notification; no representational external send.
    for (const recipient of new Set([parent,teacher])) await client.query(
      "INSERT INTO tuition_notifications(id,user_id,booking_id,event) VALUES($1,$2,$3,$4)",[randomUUID(),recipient,id,action]);
  }
  async createSlot(teacher:string,input:SlotInput) {
    const start = Date.parse(input.startsAt), end=Date.parse(input.endsAt);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<=Date.now()||start>Date.now()+180*86400000||
      end-start<15*60000||end-start>240*60000||!Number.isInteger(input.capacity)||input.capacity<1||input.capacity>20||
      !["individual","group"].includes(input.kind)||(input.kind==="individual"&&input.capacity!==1))
      throw accessError("INVALID_INPUT",400);
    return this.transaction(async client=>{
      await this.teacher(client,teacher);
      const recent=(await client.query("SELECT count(*)::int AS n FROM tuition_slots WHERE teacher_id=$1 AND created_at>now()-interval '1 hour'",[teacher])).rows[0].n;
      if(recent>=60)throw accessError("SLOT_RATE_LIMIT",429);
      if(!(await client.query("SELECT 1 FROM teacher_classes WHERE id=$1 AND teacher_id=$2 AND status='active'",[input.classId,teacher])).rows[0]) throw accessError("CLASS_NOT_FOUND",404);
      const conflicts=await client.query("SELECT 1 FROM tuition_slots WHERE teacher_id=$1 AND status='open' AND starts_at<$3 AND ends_at>$2",[teacher,input.startsAt,input.endsAt]);
      if(conflicts.rows[0]) throw accessError("TIME_CONFLICT",409);
      const id=randomUUID();
      await client.query("INSERT INTO tuition_slots(id,teacher_id,class_id,starts_at,ends_at,kind,capacity,trial) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [id,teacher,input.classId,input.startsAt,input.endsAt,input.kind,input.capacity,input.trial]);
      return slot((await client.query(slotsSelect+" WHERE s.id=$1",[id])).rows[0]);
    });
  }
  async listSlots(teacher:string,owned=false) {
    if(owned) await this.teacher(this.pool,teacher);
    const result=await this.pool.query(slotsSelect.replace("SELECT s.*",`SELECT s.*,s.capacity-(SELECT count(*)::int FROM tuition_bookings b WHERE b.slot_id=s.id AND b.status IN ('pending','accepted')) AS remaining`)+`
      WHERE s.teacher_id=$1 AND s.status='open' AND s.starts_at>now() AND p.status='active' AND c.status='active'
      AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=p.user_id AND role='teacher' AND status='active')
      ORDER BY s.starts_at LIMIT 100`,[teacher]);
    return result.rows.map(slot);
  }
  async requestBooking(parent:string,input:BookingInput) {
    if(input.consentVersion!=="tuition-booking-v1") throw accessError("CONSENT_REQUIRED",400);
    return this.transaction(async client=>{
      // Family lock avoids idempotency races; slot lock avoids overselling; student row avoids double booking.
      await this.role(client,parent,"parent");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["tuition-family:"+parent]);
      const prior=(await client.query(bookingsSelect+" WHERE b.parent_id=$1 AND b.client_request_id=$2",[parent,input.clientRequestId])).rows[0];
      if(prior) {
        if(prior.slot_id!==input.slotId||prior.student_id!==input.studentId||(prior.replaces_booking_id??undefined)!==input.replacesBookingId) throw accessError("IDEMPOTENCY_CONFLICT",409);
        return booking(prior);
      }
      const student=await this.child(client,parent,input.studentId);
      const recent=(await client.query("SELECT count(*)::int AS n FROM tuition_bookings WHERE parent_id=$1 AND created_at>now()-interval '1 hour'",[parent])).rows[0].n;
      if(recent>=30)throw accessError("BOOKING_RATE_LIMIT",429);
      const identity=(await client.query("SELECT teacher_id FROM tuition_slots WHERE id=$1",[input.slotId])).rows[0];
      if(!identity)throw accessError("SLOT_NOT_FOUND",404);
      // Match the profile -> slot lock order used by teacher decisions and suspension.
      const source=input.replacesBookingId?(await client.query(`SELECT b.*,s.teacher_id,s.starts_at FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id WHERE b.id=$1 AND b.parent_id=$2 AND b.student_id=$3`,[input.replacesBookingId,parent,input.studentId])).rows[0]:undefined;
      if(input.replacesBookingId&&!source)throw accessError("BOOKING_NOT_FOUND",404);
      try{for(const teacherId of [...new Set([identity.teacher_id,...(source?[source.teacher_id]:[])])].sort())await this.teacher(client,teacherId);}catch(error:any){if(error?.statusCode===403)throw accessError("SLOT_NOT_FOUND",404);throw error;}
      if(source){
        const locked=(await client.query(`SELECT b.*,s.starts_at FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id WHERE b.id=$1 FOR UPDATE OF b,s`,[source.id])).rows[0];
        if(!["pending","accepted"].includes(locked.status)||Date.parse(locked.starts_at)<=Date.now())throw accessError("BOOKING_STATE_CONFLICT",409);
        if(locked.slot_id===input.slotId)throw accessError("SAME_SLOT",409);
        await client.query("UPDATE tuition_bookings SET status='cancelled',updated_at=now() WHERE id=$1",[source.id]);
        await this.record(client,source.id,parent,"rescheduled",parent,source.teacher_id);
      }
      const current=(await client.query(slotsSelect+` WHERE s.id=$1 AND s.status='open' AND s.starts_at>now()
        AND p.status='active' AND c.status='active'
        AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=p.user_id AND role='teacher' AND status='active') FOR UPDATE OF s`,[input.slotId])).rows[0];
      if(!current) throw accessError("SLOT_NOT_FOUND",404);
      if(current.level_id!==student.level_id) throw accessError("LEVEL_MISMATCH",409);
      const overlap=await client.query(`SELECT 1 FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id
        WHERE b.student_id=$1 AND b.status IN ('pending','accepted') AND s.status='open' AND s.starts_at<$3 AND s.ends_at>$2`,
        [input.studentId,current.starts_at,current.ends_at]);
      if(overlap.rows[0]) throw accessError("STUDENT_TIME_CONFLICT",409);
      const count=(await client.query("SELECT count(*)::int AS n FROM tuition_bookings WHERE slot_id=$1 AND status IN ('pending','accepted')",[input.slotId])).rows[0].n;
      if(count>=current.capacity) throw accessError("SLOT_FULL",409);
      const id=randomUUID();
      await client.query("INSERT INTO tuition_bookings(id,slot_id,student_id,parent_id,client_request_id,consent_version,replaces_booking_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id,input.slotId,input.studentId,parent,input.clientRequestId,input.consentVersion,input.replacesBookingId??null]);
      await this.record(client,id,parent,"requested",parent,current.teacher_id);
      return booking((await client.query(bookingsSelect+" WHERE b.id=$1",[id])).rows[0]);
    });
  }
  async listBookings(actor:string,role:"parent"|"teacher"|"student",studentId?:string) {
    if(role==="teacher") await this.teacher(this.pool,actor);
    else if(role==="student") {if(!studentId) throw accessError("STUDENT_SCOPE_REQUIRED"); await this.child(this.pool,actor,studentId);}
    else await this.role(this.pool,actor,"parent");
    const rows=await this.pool.query(bookingsSelect+
      (role==="teacher" ? " WHERE s.teacher_id=$1" : " WHERE b.parent_id=$1 AND st.parent_id=$1")+
      (role==="student" ? " AND b.student_id=$2" : "")+" ORDER BY s.starts_at DESC LIMIT 200",
      role==="student"?[actor,studentId]:[actor]);
    return rows.rows.map(booking);
  }
  async decide(teacher:string,id:string,decision:"accept"|"decline") {
    return this.transaction(async client=>{
      await this.teacher(client,teacher);
      const row=(await client.query(bookingsSelect+" WHERE b.id=$1 AND s.teacher_id=$2 FOR UPDATE OF b,s",[id,teacher])).rows[0];
      if(!row) throw accessError("BOOKING_NOT_FOUND",404);
      if(!(await client.query("SELECT 1 FROM tuition_slots s JOIN teacher_classes c ON c.id=s.class_id WHERE s.id=$1 AND s.status='open' AND c.status='active'",[row.slot_id])).rows[0])throw accessError("BOOKING_STATE_CONFLICT",409);
      if(row.status!=="pending"||new Date(row.starts_at).getTime()<=Date.now()) throw accessError("BOOKING_STATE_CONFLICT",409);
      await client.query("UPDATE tuition_bookings SET status=$2,updated_at=now() WHERE id=$1",[id,decision==="accept"?"accepted":"cancelled"]);
      await this.record(client,id,teacher,decision==="accept"?"accepted":"declined",row.parent_id,teacher);
      return booking((await client.query(bookingsSelect+" WHERE b.id=$1",[id])).rows[0]);
    });
  }
  async closeSlot(teacher:string,id:string){
    return this.transaction(async client=>{
      await this.teacher(client,teacher);
      const row=(await client.query("SELECT * FROM tuition_slots WHERE id=$1 AND teacher_id=$2 FOR UPDATE",[id,teacher])).rows[0];
      if(!row)throw accessError("SLOT_NOT_FOUND",404);if(row.status==="cancelled")return;
      if(Date.parse(row.starts_at)<=Date.now())throw accessError("BOOKING_ALREADY_STARTED",409);
      await client.query("UPDATE tuition_slots SET status='cancelled' WHERE id=$1",[id]);
      const affected=await client.query("UPDATE tuition_bookings SET status='cancelled',updated_at=now() WHERE slot_id=$1 AND status IN ('pending','accepted') RETURNING id,parent_id",[id]);
      for(const b of affected.rows)await this.record(client,b.id,teacher,"slot_closed",b.parent_id,teacher);
    });
  }
  async cancel(actor:string,role:"parent"|"teacher",id:string) {
    return this.transaction(async client=>{
      if(role==="teacher") await this.teacher(client,actor); else await this.role(client,actor,"parent");
      const row=(await client.query(bookingsSelect+" WHERE b.id=$1 AND "+(role==="teacher"?"s.teacher_id":"b.parent_id")+"=$2"+(role==="parent"?" AND st.parent_id=$2":"")+" FOR UPDATE OF b,s",[id,actor])).rows[0];
      if(!row) throw accessError("BOOKING_NOT_FOUND",404);
      if(row.status==="cancelled") return booking(row);
      if(new Date(row.starts_at).getTime()<=Date.now()) throw accessError("BOOKING_ALREADY_STARTED",409);
      await client.query("UPDATE tuition_bookings SET status='cancelled',updated_at=now() WHERE id=$1",[id]);
      await this.record(client,id,actor,"cancelled",row.parent_id,row.teacher_id);
      return booking((await client.query(bookingsSelect+" WHERE b.id=$1",[id])).rows[0]);
    });
  }
  async attendance(teacher:string,id:string,state:"present"|"absent"|"excused") {
    return this.transaction(async client=>{
      await this.teacher(client,teacher);
      const row=(await client.query(bookingsSelect+" WHERE b.id=$1 AND s.teacher_id=$2 FOR UPDATE OF b",[id,teacher])).rows[0];
      if(!row) throw accessError("BOOKING_NOT_FOUND",404);
      if(row.status!=="accepted"||new Date(row.starts_at).getTime()>Date.now()) throw accessError("ATTENDANCE_NOT_READY",409);
      await client.query("UPDATE tuition_bookings SET attendance=$2,attendance_by=$3,attendance_at=now(),updated_at=now() WHERE id=$1",[id,state,teacher]);
      await this.record(client,id,teacher,"attendance:"+state,row.parent_id,teacher);
      return booking((await client.query(bookingsSelect+" WHERE b.id=$1",[id])).rows[0]);
    });
  }
  async notifications(user:string,role:"parent"|"teacher") {
    await this.role(this.pool,user,role);
    return (await this.pool.query("SELECT id,booking_id AS \"bookingId\",event,created_at AS \"createdAt\",read_at AS \"readAt\" FROM tuition_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[user])).rows;
  }
  async readNotification(user:string,role:"parent"|"teacher",id:string){
    await this.role(this.pool,user,role);
    const result=await this.pool.query("UPDATE tuition_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id",[id,user]);
    if(!result.rows[0])throw accessError("NOTIFICATION_NOT_FOUND",404);
  }
}
