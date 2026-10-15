import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { accessError } from "./familyAccess.js";

// Only a case reference and review metadata are stored here, never document scans.
const contactOrId=/(?:@|https?:\/\/|\b\d{6}[- ]?\d{2}[- ]?\d{4}\b|\+?\d[\d ()-]{7,}\d)/;
export const teacherKycInput=z.object({
  expectedVersion:z.number().int().min(0).max(2147483646),
  applicationFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
  clientRequestId:z.string().uuid(),decision:z.enum(["reviewed","needs_info","rejected"]),
  caseReference:z.string().trim().min(5).max(64).regex(/^[A-Z][A-Z0-9-]+$/).refine(value=>!contactOrId.test(value)),
  note:z.string().trim().min(10).max(1000).refine(value=>!contactOrId.test(value)),
  identityChecked:z.boolean(),scopeChecked:z.boolean(),safetyChecked:z.boolean(),
}).strict().refine(value=>value.decision!=="reviewed"||(value.identityChecked&&value.scopeChecked&&value.safetyChecked));
export type TeacherKycInput=z.infer<typeof teacherKycInput>;
export async function migrateTeacherKyc(pool:Pick<Pool,"query">){
  await pool.query(`CREATE TABLE IF NOT EXISTS teacher_kyc_reviews(
    id uuid PRIMARY KEY,application_id uuid NOT NULL REFERENCES teacher_applications(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK(version>0),reviewer_id uuid NOT NULL REFERENCES users(id),
    decision text NOT NULL CHECK(decision IN ('reviewed','needs_info','rejected')),
    case_reference text NOT NULL CHECK(char_length(case_reference) BETWEEN 5 AND 64),
    note text NOT NULL CHECK(char_length(note) BETWEEN 10 AND 1000),
    identity_checked boolean NOT NULL,scope_checked boolean NOT NULL,safety_checked boolean NOT NULL,
    application_fingerprint text NOT NULL,input_hash text NOT NULL,client_request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(application_id,version),UNIQUE(application_id,client_request_id),
    CHECK(decision<>'reviewed' OR (identity_checked AND scope_checked AND safety_checked)));
    CREATE INDEX IF NOT EXISTS teacher_kyc_review_order_idx ON teacher_kyc_reviews(application_id,version DESC);`);
}
type Client=Pick<PoolClient,"query">;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const recordSelect=`SELECT version,reviewer_id AS "reviewerId",decision,case_reference AS "caseReference",note,
 identity_checked AS "identityChecked",scope_checked AS "scopeChecked",safety_checked AS "safetyChecked",
 created_at AS "createdAt",application_fingerprint FROM teacher_kyc_reviews WHERE application_id=$1 ORDER BY version DESC LIMIT 20`;
export async function assertTeacherKycReviewed(client:Client,id:string){
 const source=(await client.query(`SELECT to_jsonb(a)-'review_note'-'reviewed_by'-'reviewed_at'-'updated_at'-'status' AS source FROM teacher_applications a WHERE id=$1`,[id])).rows[0];
 const latest=(await client.query("SELECT decision,identity_checked,scope_checked,safety_checked,application_fingerprint FROM teacher_kyc_reviews WHERE application_id=$1 ORDER BY version DESC LIMIT 1",[id])).rows[0];
 if(!source||!latest||latest.decision!=="reviewed"||!latest.identity_checked||!latest.scope_checked||!latest.safety_checked||latest.application_fingerprint!==hash(source.source))throw accessError("TEACHER_KYC_REQUIRED",409);
}
export class TeacherKycRepository {
  constructor(private pool:Pool){}
  private async admin(client:Client,id:string,lock=false){
    if(!(await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='super_admin' AND status='active'"+(lock?" FOR SHARE":""),[id])).rows[0])throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
  }
  private async fingerprint(client:Client,id:string,lock=false){
    const row=(await client.query(`SELECT to_jsonb(a)-'review_note'-'reviewed_by'-'reviewed_at'-'updated_at'-'status' AS source
      FROM teacher_applications a WHERE id=$1${lock?" FOR SHARE":""}`,[id])).rows[0];
    if(!row)throw accessError("APPLICATION_NOT_FOUND",404);
    return hash(row.source);
  }
  private async view(client:Client,id:string,fingerprint:string){
    const rows=(await client.query(recordSelect,[id])).rows;
    const latest=rows[0];
    return{version:latest?.version??0,applicationFingerprint:fingerprint,
      status:!latest?"unreviewed":latest.application_fingerprint!==fingerprint?"stale":latest.decision,
      history:rows.map(({application_fingerprint,...row})=>({...row,createdAt:new Date(row.createdAt).toISOString(),matchesApplication:application_fingerprint===fingerprint}))};
  }
  async read(actor:string,id:string){
    const client=await this.pool.connect();
    try{
      await client.query("BEGIN");await this.admin(client,actor,true);
      const view=await this.view(client,id,await this.fingerprint(client,id,true));
      await client.query("COMMIT");return view;
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
  async record(actor:string,id:string,input:TeacherKycInput){
    const parsed=teacherKycInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);
    const body=parsed.data,inputHash=hash([actor,body]);
    const client=await this.pool.connect();
    try{
      await client.query("BEGIN");await this.admin(client,actor,true);
      const fingerprint=await this.fingerprint(client,id,true);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["teacher-kyc:"+id]);
      const retry=(await client.query("SELECT input_hash FROM teacher_kyc_reviews WHERE application_id=$1 AND client_request_id=$2",[id,body.clientRequestId])).rows[0];
      if(retry){if(retry.input_hash!==inputHash)throw accessError("IDEMPOTENCY_CONFLICT",409);}
      else{
        if(fingerprint!==body.applicationFingerprint)throw accessError("APPLICATION_CHANGED",409);
        const latest=(await client.query("SELECT version FROM teacher_kyc_reviews WHERE application_id=$1 ORDER BY version DESC LIMIT 1",[id])).rows[0];
        if((latest?.version??0)!==body.expectedVersion)throw accessError("VERSION_CONFLICT",409);
        await client.query(`INSERT INTO teacher_kyc_reviews(id,application_id,version,reviewer_id,decision,case_reference,note,
          identity_checked,scope_checked,safety_checked,application_fingerprint,input_hash,client_request_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [randomUUID(),id,body.expectedVersion+1,actor,body.decision,body.caseReference,body.note,body.identityChecked,body.scopeChecked,body.safetyChecked,fingerprint,inputHash,body.clientRequestId]);
      }
      const view=await this.view(client,id,fingerprint);await client.query("COMMIT");return view;
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}
