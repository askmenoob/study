import {createHash,randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {z} from "zod";
import {accessError} from "./familyAccess.js";

const ids=z.array(z.string().uuid()).min(1).max(50).refine(values=>new Set(values).size===values.length);
export const payoutDraftInput=z.object({teacherId:z.string().uuid(),ledgerIds:ids,clientRequestId:z.string().uuid(),sandboxAttested:z.literal(true),reviewNote:z.string().trim().min(10).max(1000)}).strict();
export const payoutActionInput=z.object({expectedVersion:z.number().int().min(1),action:z.enum(["prepare","cancel"]),sandboxAttested:z.literal(true),reviewNote:z.string().trim().min(10).max(1000)}).strict();
type Client=Pick<PoolClient,"query">;
export async function migrateTuitionPayouts(client:Client){await client.query(`
 CREATE TABLE IF NOT EXISTS tuition_payout_drafts(
 id uuid PRIMARY KEY,teacher_id uuid NOT NULL REFERENCES users(id),mode text NOT NULL DEFAULT 'sandbox' CHECK(mode='sandbox'),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','prepared','cancelled')),version integer NOT NULL DEFAULT 1,
 total_cents bigint NOT NULL CHECK(total_cents>0),created_by uuid NOT NULL REFERENCES users(id),client_request_id uuid NOT NULL,input_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),prepared_at timestamptz,UNIQUE(created_by,client_request_id));
 CREATE TABLE IF NOT EXISTS tuition_payout_items(draft_id uuid NOT NULL REFERENCES tuition_payout_drafts(id),ledger_id uuid NOT NULL REFERENCES tuition_payment_ledger(id),
 amount_cents integer NOT NULL CHECK(amount_cents>0),invoice_id uuid NOT NULL REFERENCES tuition_invoices(id),title text NOT NULL,PRIMARY KEY(draft_id,ledger_id));
 CREATE TABLE IF NOT EXISTS tuition_payout_reservations(ledger_id uuid PRIMARY KEY REFERENCES tuition_payment_ledger(id),draft_id uuid NOT NULL REFERENCES tuition_payout_drafts(id));
 CREATE TABLE IF NOT EXISTS tuition_payout_events(id uuid PRIMARY KEY,draft_id uuid NOT NULL REFERENCES tuition_payout_drafts(id),actor_id uuid NOT NULL REFERENCES users(id),event text NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS tuition_payout_teacher_idx ON tuition_payout_drafts(teacher_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS tuition_payout_reservation_draft_idx ON tuition_payout_reservations(draft_id);
 CREATE INDEX IF NOT EXISTS tuition_invoice_teacher_idx ON tuition_invoices(teacher_id,created_at DESC);
 `);}

// No child identity/contact joins. Amounts come from immutable confirmed-payment ledger entries.
const allocationsSql=`SELECT l.id AS "ledgerId",i.id AS "invoiceId",i.teacher_id AS "teacherId",p.public_name AS "teacherName",i.title,l.amount_cents AS "amountCents",t.created_at AS "recordedAt",r.draft_id AS "reservedDraftId",
 CASE WHEN t.hold_reason IS NOT NULL THEN 'payment_held'
 WHEN i.status<>'paid' THEN 'payment_unconfirmed'
 WHEN EXISTS(SELECT 1 FROM tuition_payment_ledger q WHERE q.transaction_id=t.id GROUP BY q.transaction_id HAVING sum(CASE WHEN q.direction='debit' THEN q.amount_cents ELSE -q.amount_cents END)<>0) THEN 'ledger_unbalanced'
 WHEN b.id IS NULL THEN 'booking_removed' WHEN b.status<>'accepted' THEN 'booking_changed'
 WHEN p.user_id IS NULL OR p.status<>'active' OR NOT EXISTS(SELECT 1 FROM user_roles u WHERE u.user_id=i.teacher_id AND u.role='teacher' AND u.status='active') THEN 'teacher_unavailable'
 WHEN s.id IS NULL THEN 'slot_removed'
 WHEN s.ends_at>now() THEN 'session_not_completed'
 WHEN b.attendance IS DISTINCT FROM 'present' THEN 'attendance_review_required'
 WHEN r.ledger_id IS NOT NULL THEN 'reserved' ELSE 'ready_for_review' END AS readiness
 FROM tuition_payment_ledger l JOIN tuition_payment_transactions t ON t.id=l.transaction_id JOIN tuition_invoices i ON i.id=t.invoice_id
 LEFT JOIN teacher_profiles p ON p.user_id=i.teacher_id LEFT JOIN tuition_bookings b ON b.id=i.booking_id LEFT JOIN tuition_slots s ON s.id=b.slot_id
 LEFT JOIN tuition_payout_reservations r ON r.ledger_id=l.id
 WHERE l.account='teacher_payable' AND l.direction='credit' AND i.mode='sandbox'`;
const draftsSql=`SELECT d.id,d.teacher_id AS "teacherId",p.public_name AS "teacherName",d.mode,d.status,d.version,d.total_cents::text AS "totalCents",d.created_at AS "createdAt",d.prepared_at AS "preparedAt" FROM tuition_payout_drafts d JOIN teacher_profiles p ON p.user_id=d.teacher_id`;
export class TuitionPayoutRepository{
 constructor(private pool:Pool){}
 private async transaction<T>(work:(client:PoolClient)=>Promise<T>){const client=await this.pool.connect();try{await client.query("BEGIN");const value=await work(client);await client.query("COMMIT");return value;}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
 private async role(client:Client,user:string,role:"teacher"|"super_admin"){
  // Teacher suspension updates profile before role; follow that lock order.
  if(role==="teacher"&&!(await client.query("SELECT 1 FROM teacher_profiles WHERE user_id=$1 AND status='active' FOR SHARE",[user])).rows[0])throw accessError("TEACHER_ACCESS_REQUIRED");
  if(!(await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2 AND status='active' FOR SHARE",[user,role])).rows[0])throw accessError(role==="teacher"?"TEACHER_ACCESS_REQUIRED":"SUPER_ADMIN_ACCESS_REQUIRED");
 }
 private async rows(client:Client,teacher?:string){return(await client.query(allocationsSql+(teacher?" AND i.teacher_id=$1":"")+" ORDER BY t.created_at DESC,l.id LIMIT 200",teacher?[teacher]:[])).rows;}
 async teacherStatement(teacher:string){await this.role(this.pool,teacher,"teacher");return{mode:"sandbox",moneyTransferred:false,allocations:await this.rows(this.pool,teacher),drafts:(await this.pool.query(draftsSql+" WHERE d.teacher_id=$1 ORDER BY d.created_at DESC LIMIT 100",[teacher])).rows};}
 async adminOverview(actor:string){await this.role(this.pool,actor,"super_admin");return{mode:"sandbox",moneyTransferred:false,allocations:await this.rows(this.pool),drafts:(await this.pool.query(draftsSql+" ORDER BY d.created_at DESC LIMIT 100")).rows};}
 async createDraft(actor:string,input:z.infer<typeof payoutDraftInput>){
  const parsed=payoutDraftInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);const body={...parsed.data,ledgerIds:[...parsed.data.ledgerIds].sort()},hash=createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return this.transaction(async client=>{
   await this.role(client,actor,"super_admin");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["tuition-payout-request:"+actor]);
   const prior=(await client.query("SELECT id,input_hash FROM tuition_payout_drafts WHERE created_by=$1 AND client_request_id=$2",[actor,body.clientRequestId])).rows[0];if(prior){if(prior.input_hash!==hash)throw accessError("IDEMPOTENCY_CONFLICT",409);return{id:prior.id};}
   await this.role(client,body.teacherId,"teacher");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["tuition-payout-teacher:"+body.teacherId]);
   // Lock booking state before reserving allocations; cancellation/attendance edits cannot race a review.
   await client.query("SELECT b.id FROM tuition_bookings b JOIN tuition_invoices i ON i.booking_id=b.id JOIN tuition_payment_transactions t ON t.invoice_id=i.id JOIN tuition_payment_ledger l ON l.transaction_id=t.id WHERE l.id=ANY($1::uuid[]) ORDER BY b.id FOR SHARE OF b",[body.ledgerIds]);
   const rows=(await client.query(allocationsSql+" AND l.id=ANY($1::uuid[]) ORDER BY l.id FOR SHARE OF l,i,t",[body.ledgerIds])).rows;
   if(rows.length!==body.ledgerIds.length||rows.some(row=>row.teacherId!==body.teacherId||row.readiness!=="ready_for_review"))throw accessError("PAYOUT_REVIEW_NOT_READY",409);
   const id=randomUUID(),total=rows.reduce((sum,row)=>sum+row.amountCents,0);await client.query("INSERT INTO tuition_payout_drafts(id,teacher_id,total_cents,created_by,client_request_id,input_hash) VALUES($1,$2,$3,$4,$5,$6)",[id,body.teacherId,total,actor,body.clientRequestId,hash]);
   for(const row of rows){await client.query("INSERT INTO tuition_payout_items(draft_id,ledger_id,amount_cents,invoice_id,title) VALUES($1,$2,$3,$4,$5)",[id,row.ledgerId,row.amountCents,row.invoiceId,row.title]);await client.query("INSERT INTO tuition_payout_reservations(ledger_id,draft_id) VALUES($1,$2)",[row.ledgerId,id]);}
   await client.query("INSERT INTO tuition_payout_events(id,draft_id,actor_id,event,note) VALUES($1,$2,$3,'draft_created',$4)",[randomUUID(),id,actor,body.reviewNote]);return{id};
  });
 }
 async action(actor:string,id:string,input:z.infer<typeof payoutActionInput>){
  const parsed=payoutActionInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);const body=parsed.data;
  return this.transaction(async client=>{
   await this.role(client,actor,"super_admin");const initial=(await client.query("SELECT teacher_id FROM tuition_payout_drafts WHERE id=$1",[id])).rows[0];if(!initial)throw accessError("PAYOUT_DRAFT_NOT_FOUND",404);
   if(body.action==="prepare")await this.role(client,initial.teacher_id,"teacher");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["tuition-payout-teacher:"+initial.teacher_id]);
   const draft=(await client.query("SELECT * FROM tuition_payout_drafts WHERE id=$1 FOR UPDATE",[id])).rows[0];if(draft.version!==body.expectedVersion)throw accessError("VERSION_CONFLICT",409);if(draft.status==="cancelled"||body.action==="prepare"&&draft.status!=="draft")throw accessError("PAYOUT_STATE_CONFLICT",409);
   if(body.action==="prepare"){
    const items=(await client.query("SELECT ledger_id FROM tuition_payout_items WHERE draft_id=$1 ORDER BY ledger_id",[id])).rows,ledgerIds=items.map(item=>item.ledger_id);
    await client.query("SELECT b.id FROM tuition_bookings b JOIN tuition_invoices i ON i.booking_id=b.id JOIN tuition_payment_transactions t ON t.invoice_id=i.id JOIN tuition_payment_ledger l ON l.transaction_id=t.id WHERE l.id=ANY($1::uuid[]) ORDER BY b.id FOR SHARE OF b",[ledgerIds]);
    const rows=(await client.query(allocationsSql+" AND l.id=ANY($1::uuid[]) FOR SHARE OF l,i,t",[ledgerIds])).rows;
    if(rows.length!==items.length||rows.some(row=>row.readiness!=="reserved"||row.reservedDraftId!==id))throw accessError("PAYOUT_REVIEW_NOT_READY",409);
   }
   const status=body.action==="prepare"?"prepared":"cancelled";await client.query("UPDATE tuition_payout_drafts SET status=$2,version=version+1,prepared_at=CASE WHEN $2='prepared' THEN now() ELSE prepared_at END WHERE id=$1",[id,status]);
   if(status==="cancelled")await client.query("DELETE FROM tuition_payout_reservations WHERE draft_id=$1",[id]);
   await client.query("INSERT INTO tuition_payout_events(id,draft_id,actor_id,event,note) VALUES($1,$2,$3,$4,$5)",[randomUUID(),id,actor,status,body.reviewNote]);return{status,version:draft.version+1,moneyTransferred:false};
  });
 }
 async exportDraft(actor:string,id:string){await this.role(this.pool,actor,"super_admin");const draft=(await this.pool.query(draftsSql+" WHERE d.id=$1",[id])).rows[0];if(!draft)throw accessError("PAYOUT_DRAFT_NOT_FOUND",404);return{draft,items:(await this.pool.query("SELECT ledger_id AS \"ledgerId\",invoice_id AS \"invoiceId\",title,amount_cents AS \"amountCents\" FROM tuition_payout_items WHERE draft_id=$1 ORDER BY ledger_id",[id])).rows};}
}
export function privateFinanceCsv(rows:unknown[][]){return rows.map(row=>row.map(value=>{let text=String(value??"");if(/^[=+@\-\t\r\n]/.test(text))text="'"+text;return'"'+text.replaceAll('"','""')+'"';}).join(",")).join("\r\n")+"\r\n";}
