import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { accessError } from "./familyAccess.js";
export type HomeworkInput={classId:string;title:string;instructions:string;dueAt:string;rubric:string;clientRequestId:string;privacyAttested:true};
export async function migrateTuitionLearning(pool:Pick<Pool,"query">) {
  await pool.query(`CREATE TABLE IF NOT EXISTS tuition_homework(
    id uuid PRIMARY KEY,teacher_id uuid NOT NULL REFERENCES teacher_profiles(user_id),class_id uuid NOT NULL REFERENCES teacher_classes(id),
    title text NOT NULL CHECK(char_length(title) BETWEEN 3 AND 120),instructions text NOT NULL CHECK(char_length(instructions) BETWEEN 10 AND 10000),
    rubric text NOT NULL CHECK(char_length(rubric) BETWEEN 3 AND 2000),due_at timestamptz NOT NULL,client_request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(teacher_id,client_request_id));
    ALTER TABLE tuition_homework ADD COLUMN IF NOT EXISTS privacy_attested boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS tuition_homework_class_idx ON tuition_homework(class_id,due_at);
    CREATE TABLE IF NOT EXISTS tuition_homework_submissions(
    id uuid PRIMARY KEY,homework_id uuid NOT NULL REFERENCES tuition_homework(id),student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    answer text NOT NULL CHECK(char_length(answer) BETWEEN 1 AND 10000),version integer NOT NULL DEFAULT 1,
    score integer CHECK(score BETWEEN 0 AND 100),feedback text CHECK(char_length(feedback) BETWEEN 1 AND 5000),
    submitted_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,reviewed_by uuid REFERENCES users(id),
    UNIQUE(homework_id,student_id));
    CREATE TABLE IF NOT EXISTS tuition_learning_audit(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES users(id),
    entity_id uuid NOT NULL,action text NOT NULL,version integer,created_at timestamptz NOT NULL DEFAULT now());
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='tuition_homework_submissions'::regclass AND conname='tuition_homework_submissions_student_id_fkey' AND confdeltype<>'c') THEN
        ALTER TABLE tuition_homework_submissions DROP CONSTRAINT tuition_homework_submissions_student_id_fkey;
        ALTER TABLE tuition_homework_submissions ADD CONSTRAINT tuition_homework_submissions_student_id_fkey FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE;
      END IF;
    END $$;`);
}
const linked = `EXISTS(SELECT 1 FROM class_enrollments e WHERE e.class_id=h.class_id AND e.student_id=st.id AND e.status='active')
  OR EXISTS(SELECT 1 FROM tuition_bookings b JOIN tuition_slots sl ON sl.id=b.slot_id WHERE sl.class_id=h.class_id AND b.student_id=st.id AND b.status='accepted' AND sl.ends_at>=h.created_at)`;
const visible = `SELECT h.id,h.class_id AS "classId",h.title,h.instructions,h.rubric,h.due_at AS "dueAt",
    c.name AS "className",p.public_name AS "teacherName",c.subject_id AS "subjectId",c.level_id AS "levelId"
    FROM tuition_homework h JOIN teacher_classes c ON c.id=h.class_id JOIN teacher_profiles p ON p.user_id=h.teacher_id`;
export class TuitionLearningRepository {
  constructor(private pool:Pool){}
  private async transaction<T>(operation:(client:PoolClient)=>Promise<T>){const client=await this.pool.connect();try{await client.query("BEGIN");const result=await operation(client);await client.query("COMMIT");return result;}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
  private async teacher(client:Pick<PoolClient,"query">,id:string,classId?:string){
    if(!(await client.query(`SELECT 1 FROM teacher_profiles p JOIN user_roles r ON r.user_id=p.user_id AND r.role='teacher' AND r.status='active'
      WHERE p.user_id=$1 AND p.status='active' FOR SHARE OF p`,[id])).rows[0])throw accessError("TEACHER_ACCESS_REQUIRED");
    if(classId&&!(await client.query("SELECT 1 FROM teacher_classes WHERE id=$1 AND teacher_id=$2 AND status='active'",[classId,id])).rows[0])throw accessError("CLASS_NOT_FOUND",404);
  }
  private async child(client:Pick<PoolClient,"query">,parent:string,student:string){
    if(!(await client.query(`SELECT 1 FROM students st JOIN user_roles r ON r.user_id=st.parent_id AND r.role='parent' AND r.status='active' WHERE st.id=$1 AND st.parent_id=$2`,[student,parent])).rows[0])throw accessError("STUDENT_NOT_FOUND",404);
  }
  async assign(teacher:string,input:HomeworkInput){
    if(input.privacyAttested!==true||input.title.trim().length<3||input.title.length>120||input.instructions.trim().length<10||input.instructions.length>10000||input.rubric.trim().length<3||input.rubric.length>2000||!Number.isFinite(Date.parse(input.dueAt)))throw accessError("INVALID_INPUT",400);
    return this.transaction(async client=>{await this.teacher(client,teacher,input.classId);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["homework:"+teacher]);
      const old=(await client.query("SELECT * FROM tuition_homework WHERE teacher_id=$1 AND client_request_id=$2",[teacher,input.clientRequestId])).rows[0];
      if(old){if(old.class_id!==input.classId||old.title!==input.title||old.instructions!==input.instructions||old.rubric!==input.rubric||new Date(old.due_at).getTime()!==Date.parse(input.dueAt))throw accessError("IDEMPOTENCY_CONFLICT",409);return {id:old.id};}
      if(Date.parse(input.dueAt)<=Date.now())throw accessError("INVALID_INPUT",400);
      const count=(await client.query("SELECT count(*)::int AS n FROM tuition_homework WHERE teacher_id=$1 AND created_at>now()-interval '1 hour'",[teacher])).rows[0].n;
      if(count>=30)throw accessError("HOMEWORK_RATE_LIMIT",429);
      const id=randomUUID();await client.query("INSERT INTO tuition_homework(id,teacher_id,class_id,title,instructions,rubric,due_at,client_request_id,privacy_attested) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)",[id,teacher,input.classId,input.title,input.instructions,input.rubric,input.dueAt,input.clientRequestId]);
      await client.query("INSERT INTO tuition_learning_audit(id,actor_id,entity_id,action) VALUES($1,$2,$3,'assigned')",[randomUUID(),teacher,id]);return{id};});
  }
  async listTeacher(teacher:string){await this.teacher(this.pool,teacher);return(await this.pool.query(visible+" WHERE h.teacher_id=$1 ORDER BY h.due_at DESC LIMIT 100",[teacher])).rows;}
  async listStudent(parent:string,student:string){await this.child(this.pool,parent,student);
    return(await this.pool.query(visible.replace("FROM tuition_homework",` ,sub.id AS "submissionId",sub.answer,sub.version,sub.score,sub.feedback,sub.reviewed_at AS "reviewedAt",sub.submitted_at AS "submittedAt" FROM tuition_homework`)+` JOIN students st ON st.id=$1 LEFT JOIN tuition_homework_submissions sub ON sub.homework_id=h.id AND sub.student_id=st.id
      WHERE st.parent_id=$2 AND p.status='active' AND c.status='active' AND (${linked})
      AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=p.user_id AND role='teacher' AND status='active')
      ORDER BY h.due_at DESC LIMIT 100`,[student,parent])).rows.map(row=>row);
  }
  async detail(parent:string,student:string,homework:string){await this.child(this.pool,parent,student);
    const result=await this.pool.query(visible+` JOIN students st ON st.id=$1 WHERE h.id=$3 AND st.parent_id=$2 AND p.status='active' AND c.status='active' AND (${linked})
      AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=p.user_id AND role='teacher' AND status='active')`,[student,parent,homework]);
    if(!result.rows[0])throw accessError("HOMEWORK_NOT_FOUND",404);return result.rows[0];
  }
  async submit(parent:string,student:string,homework:string,answer:string,expectedVersion:number){
    if(!answer.trim()||answer.length>10000||!Number.isInteger(expectedVersion)||expectedVersion<0)throw accessError("INVALID_INPUT",400);
    return this.transaction(async client=>{
      await this.child(client,parent,student);
      // Lock the teaching identity so a simultaneous suspension cannot grant new access.
      const scope=(await client.query(`SELECT p.user_id FROM tuition_homework h JOIN teacher_classes c ON c.id=h.class_id JOIN teacher_profiles p ON p.user_id=h.teacher_id
       JOIN students st ON st.id=$1 WHERE h.id=$3 AND st.parent_id=$2 AND p.status='active' AND c.status='active' AND (${linked})
       AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=p.user_id AND role='teacher' AND status='active') FOR SHARE OF p`,[student,parent,homework])).rows[0];
      if(!scope)throw accessError("HOMEWORK_NOT_FOUND",404);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["submission:"+homework+":"+student]);
      const old=(await client.query("SELECT * FROM tuition_homework_submissions WHERE homework_id=$1 AND student_id=$2 FOR UPDATE",[homework,student])).rows[0];
      if((old?.version??0)!==expectedVersion)throw accessError("VERSION_CONFLICT",409);
      const id=old?.id??randomUUID();
      const result=old?await client.query("UPDATE tuition_homework_submissions SET answer=$2,version=version+1,submitted_at=now(),score=NULL,feedback=NULL,reviewed_at=NULL,reviewed_by=NULL WHERE id=$1 RETURNING *",[id,answer])
        :await client.query("INSERT INTO tuition_homework_submissions(id,homework_id,student_id,answer) VALUES($1,$2,$3,$4) RETURNING *",[id,homework,student,answer]);
      await client.query("INSERT INTO tuition_learning_audit(id,actor_id,entity_id,action,version) VALUES($1,$2,$3,'submitted',$4)",[randomUUID(),parent,id,result.rows[0].version]);return result.rows[0];});
  }
  async submissions(teacher:string,homework:string){await this.teacher(this.pool,teacher);
    if(!(await this.pool.query("SELECT 1 FROM tuition_homework WHERE id=$1 AND teacher_id=$2",[homework,teacher])).rows[0])throw accessError("HOMEWORK_NOT_FOUND",404);
    return(await this.pool.query(`SELECT sub.*,st.name AS student_name FROM tuition_homework_submissions sub JOIN tuition_homework h ON h.id=sub.homework_id JOIN students st ON st.id=sub.student_id WHERE h.id=$1 AND h.teacher_id=$2 ORDER BY sub.submitted_at DESC LIMIT 200`,[homework,teacher])).rows;
  }
  async ownSubmission(parent:string,student:string,homework:string){await this.detail(parent,student,homework);return(await this.pool.query("SELECT * FROM tuition_homework_submissions WHERE homework_id=$1 AND student_id=$2",[homework,student])).rows[0]??null;}
  async report(parent:string,student:string){
    await this.child(this.pool,parent,student);
    const [attendance,weekly,topics,homework]=await Promise.all([
      this.pool.query(`SELECT count(*) FILTER(WHERE attendance='present')::int AS present,count(*) FILTER(WHERE attendance='absent')::int AS absent,count(*) FILTER(WHERE attendance='excused')::int AS excused FROM tuition_bookings WHERE parent_id=$1 AND student_id=$2 AND status='accepted'`,[parent,student]),
      this.pool.query(`SELECT to_char(date_trunc('week',created_at AT TIME ZONE 'Asia/Kuala_Lumpur'),'YYYY-MM-DD') AS week,count(*)::int AS attempts,sum(score)::int AS correct,sum(total)::int AS questions FROM attempts WHERE student_id=$1 AND created_at>now()-interval '8 weeks' GROUP BY week ORDER BY week`,[student]),
      this.pool.query(`SELECT subject_id AS "subjectId",topic_id AS "topicId",count(*)::int AS attempts,sum(score)::int AS correct,sum(total)::int AS questions FROM attempts WHERE student_id=$1 AND created_at>now()-interval '8 weeks' GROUP BY subject_id,topic_id HAVING count(*)>=3 AND sum(total)>0 AND sum(score)::numeric/sum(total)<0.6 ORDER BY sum(score)::numeric/sum(total) LIMIT 5`,[student]),
      this.pool.query(`SELECT count(*)::int AS submitted,count(score)::int AS reviewed,round(avg(score),1)::text AS "meanScore" FROM tuition_homework_submissions WHERE student_id=$1`,[student]),
    ]);
    return{attendance:attendance.rows[0],weekly:weekly.rows,practiceTopicsToReview:topics.rows,homework:homework.rows[0],notice:"Rekod 8 minggu. Topik ulang kaji: sekurang-kurangnya 3 latihan, ketepatan di bawah 60%. Ini petunjuk latihan, bukan diagnosis. Kehadiran hanya dikira selepas rekod guru."};
  }
  async review(teacher:string,submission:string,score:number,feedback:string,expectedVersion:number){
    if(!Number.isInteger(score)||score<0||score>100||!feedback.trim()||feedback.length>5000)throw accessError("INVALID_INPUT",400);
    return this.transaction(async client=>{await this.teacher(client,teacher);
      const row=(await client.query(`SELECT sub.* FROM tuition_homework_submissions sub JOIN tuition_homework h ON h.id=sub.homework_id WHERE sub.id=$1 AND h.teacher_id=$2 FOR UPDATE OF sub`,[submission,teacher])).rows[0];
      if(!row)throw accessError("SUBMISSION_NOT_FOUND",404);if(row.version!==expectedVersion)throw accessError("VERSION_CONFLICT",409);
      const result=await client.query("UPDATE tuition_homework_submissions SET score=$2,feedback=$3,reviewed_at=now(),reviewed_by=$4,version=version+1 WHERE id=$1 RETURNING *",[submission,score,feedback,teacher]);
      await client.query("INSERT INTO tuition_learning_audit(id,actor_id,entity_id,action,version) VALUES($1,$2,$3,'reviewed',$4)",[randomUUID(),teacher,submission,result.rows[0].version]);return result.rows[0];});
  }
}
