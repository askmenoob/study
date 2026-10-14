import { randomUUID,createHash } from "node:crypto";
import type { Pool,PoolClient } from "pg";
import { z } from "zod";
import { accessError } from "./familyAccess.js";
export const tuitionPackageInput=z.object({classId:z.string().uuid(),title:z.string().trim().min(3).max(80),amountCents:z.number().int().min(100).max(99999999),feeCents:z.number().int().min(0).max(99999999),commissionBps:z.number().int().min(0).max(10000),clientRequestId:z.string().uuid()}).strict().refine(x=>x.amountCents+x.feeCents<=100000000);
export const tuitionInvoiceInput=z.object({bookingId:z.string().uuid(),packageId:z.string().uuid(),clientRequestId:z.string().uuid(),noRefundAttested:z.literal(true),consentVersion:z.literal("tuition-payment-sandbox-v1")}).strict();
type Client=Pick<PoolClient,"query">;
export type PackageInput=z.infer<typeof tuitionPackageInput>;
export type InvoiceInput=z.infer<typeof tuitionInvoiceInput>;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function tuitionAmounts(amountCents:number,feeCents:number,commissionBps:number){
  if(!Number.isSafeInteger(amountCents)||amountCents<100||!Number.isSafeInteger(feeCents)||feeCents<0||!Number.isSafeInteger(commissionBps)||commissionBps<0||commissionBps>10000||amountCents+feeCents>100000000)throw accessError("INVALID_INPUT",400);
  const commissionCents=Math.floor(amountCents*commissionBps/10000);
  return{totalCents:amountCents+feeCents,commissionCents,teacherCents:amountCents-commissionCents,imaiCents:commissionCents+feeCents};
}
export async function migrateTuitionCommerce(pool:Client){
  await pool.query(`CREATE TABLE IF NOT EXISTS tuition_packages(
    id uuid PRIMARY KEY,class_id uuid NOT NULL REFERENCES teacher_classes(id),teacher_id uuid NOT NULL REFERENCES users(id),title text NOT NULL,
    amount_cents integer NOT NULL CHECK(amount_cents>=100),fee_cents integer NOT NULL CHECK(fee_cents>=0),commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000),
    status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),version integer NOT NULL DEFAULT 1,
    created_by uuid NOT NULL REFERENCES users(id),client_request_id uuid NOT NULL,input_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(created_by,client_request_id),CHECK(amount_cents+fee_cents<=100000000));
    CREATE INDEX IF NOT EXISTS tuition_package_class_idx ON tuition_packages(class_id,status);
    CREATE TABLE IF NOT EXISTS tuition_invoices(
    id uuid PRIMARY KEY,booking_id uuid UNIQUE REFERENCES tuition_bookings(id) ON DELETE SET NULL,package_id uuid NOT NULL REFERENCES tuition_packages(id),
    parent_id uuid NOT NULL REFERENCES users(id),teacher_id uuid NOT NULL REFERENCES users(id),mode text NOT NULL DEFAULT 'sandbox' CHECK(mode='sandbox'),
    title text NOT NULL,amount_cents integer NOT NULL,fee_cents integer NOT NULL,commission_bps integer NOT NULL,
    total_cents integer NOT NULL CHECK(total_cents BETWEEN 100 AND 100000000),teacher_cents integer NOT NULL CHECK(teacher_cents>=0),imai_cents integer NOT NULL CHECK(imai_cents>=0),
    no_refund_version text NOT NULL CHECK(no_refund_version='no-refund-v1'),consent_version text NOT NULL CHECK(consent_version='tuition-payment-sandbox-v1'),consent_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','paid')),bill_state text NOT NULL DEFAULT 'new' CHECK(bill_state IN ('new','creating','ready','review')),
    bill_code text UNIQUE,client_request_id uuid NOT NULL,input_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),paid_at timestamptz,
    UNIQUE(parent_id,client_request_id),CHECK(teacher_cents+imai_cents=total_cents));
    CREATE TABLE IF NOT EXISTS tuition_payment_transactions(
    id uuid PRIMARY KEY,invoice_id uuid NOT NULL REFERENCES tuition_invoices(id),provider_reference text NOT NULL UNIQUE,amount_cents integer NOT NULL CHECK(amount_cents>0),
    hold_reason text CHECK(hold_reason IN ('duplicate_payment','booking_changed','teacher_unavailable')),created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS tuition_payment_ledger(
    id uuid PRIMARY KEY,transaction_id uuid NOT NULL REFERENCES tuition_payment_transactions(id),account text NOT NULL CHECK(account IN ('provider_clearing','teacher_payable','imai_income','unallocated_credit')),
    direction text NOT NULL CHECK(direction IN ('debit','credit')),amount_cents integer NOT NULL CHECK(amount_cents>0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(transaction_id,account));
    CREATE TABLE IF NOT EXISTS tuition_payment_notifications(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),transaction_id uuid NOT NULL REFERENCES tuition_payment_transactions(id),recipient_role text NOT NULL CHECK(recipient_role IN ('parent','teacher')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,transaction_id));
    CREATE TABLE IF NOT EXISTS tuition_commerce_events(
    id uuid PRIMARY KEY,entity_id uuid NOT NULL,actor_id uuid REFERENCES users(id),event text NOT NULL,note text,created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE tuition_commerce_events ADD COLUMN IF NOT EXISTS note text;`);
}
const packageSelect=`SELECT p.id,p.class_id AS "classId",p.teacher_id AS "teacherId",p.title,p.amount_cents AS "amountCents",p.fee_cents AS "feeCents",p.commission_bps AS "commissionBps",p.status,p.version,c.name AS "className",t.public_name AS "teacherName"
 FROM tuition_packages p JOIN teacher_classes c ON c.id=p.class_id JOIN teacher_profiles t ON t.user_id=p.teacher_id`;
const invoiceSelect=`SELECT i.id,i.booking_id AS "bookingId",i.package_id AS "packageId",i.title,i.mode,i.total_cents AS "totalCents",i.amount_cents AS "amountCents",i.fee_cents AS "feeCents",i.commission_bps AS "commissionBps",i.teacher_cents AS "teacherCents",i.imai_cents AS "imaiCents",i.status,i.bill_state AS "billState",i.bill_code AS "billCode",i.created_at AS "createdAt",i.paid_at AS "paidAt",i.parent_id AS "parentId",i.teacher_id AS "teacherId" FROM tuition_invoices i`;
export class TuitionCommerceRepository{
  constructor(private pool:Pool){}
  private async transaction<T>(operation:(client:PoolClient)=>Promise<T>){const client=await this.pool.connect();try{await client.query("BEGIN");const value=await operation(client);await client.query("COMMIT");return value;}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
  private async role(client:Client,id:string,role:string){if(!(await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2 AND status='active' FOR SHARE",[id,role])).rows[0])throw accessError(role==="super_admin"?"SUPER_ADMIN_ACCESS_REQUIRED":"PARENT_ACCESS_REQUIRED");}
  private async event(client:Client,id:string,actor:string|null,event:string){await client.query("INSERT INTO tuition_commerce_events(id,entity_id,actor_id,event) VALUES($1,$2,$3,$4)",[randomUUID(),id,actor,event]);}
  async createPackage(actor:string,input:PackageInput){
    const parsed=tuitionPackageInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);const body=parsed.data,hash=digest(body);
    return this.transaction(async client=>{await this.role(client,actor,"super_admin");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["package:"+actor]);
      const prior=(await client.query("SELECT id,input_hash FROM tuition_packages WHERE created_by=$1 AND client_request_id=$2",[actor,body.clientRequestId])).rows[0];
      if(prior){if(prior.input_hash!==hash)throw accessError("IDEMPOTENCY_CONFLICT",409);return{id:prior.id};}
      const owned=(await client.query(`SELECT c.teacher_id FROM teacher_classes c JOIN teacher_profiles t ON t.user_id=c.teacher_id
        JOIN user_roles r ON r.user_id=t.user_id AND r.role='teacher' AND r.status='active' WHERE c.id=$1 AND c.status='active' AND t.status='active'`,[body.classId])).rows[0];
      if(!owned)throw accessError("CLASS_NOT_FOUND",404);
      const id=randomUUID();await client.query("INSERT INTO tuition_packages(id,class_id,teacher_id,title,amount_cents,fee_cents,commission_bps,created_by,client_request_id,input_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[id,body.classId,owned.teacher_id,body.title,body.amountCents,body.feeCents,body.commissionBps,actor,body.clientRequestId,hash]);
      await this.event(client,id,actor,"package_draft");return{id};
    });
  }
  async packages(actor:string){await this.role(this.pool,actor,"super_admin");return(await this.pool.query(packageSelect+" ORDER BY p.created_at DESC LIMIT 200")).rows;}
  async classes(actor:string){await this.role(this.pool,actor,"super_admin");return(await this.pool.query(`SELECT c.id,c.name,t.public_name AS "teacherName" FROM teacher_classes c JOIN teacher_profiles t ON t.user_id=c.teacher_id JOIN user_roles r ON r.user_id=t.user_id AND r.role='teacher' AND r.status='active' WHERE c.status='active' AND t.status='active' ORDER BY t.public_name,c.name LIMIT 200`)).rows;}
  async packageStatus(actor:string,id:string,version:number,status:"published"|"archived"){
    return this.transaction(async client=>{await this.role(client,actor,"super_admin");const row=(await client.query("SELECT * FROM tuition_packages WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!row)throw accessError("PACKAGE_NOT_FOUND",404);
      if(row.version!==version||row.status==="archived"||(status==="published"&&row.status!=="draft"))throw accessError("VERSION_CONFLICT",409);
      await client.query("UPDATE tuition_packages SET status=$2,version=version+1 WHERE id=$1",[id,status]);await this.event(client,id,actor,"package_"+status);return{id};});
  }
  async options(parent:string,bookingId:string){await this.role(this.pool,parent,"parent");const b=(await this.pool.query(`SELECT b.id,s.class_id FROM tuition_bookings b JOIN students st ON st.id=b.student_id JOIN tuition_slots s ON s.id=b.slot_id WHERE b.id=$1 AND b.parent_id=$2 AND st.parent_id=$2 AND b.status='accepted' AND s.status='open' AND s.starts_at>now()`,[bookingId,parent])).rows[0];if(!b)throw accessError("BOOKING_NOT_FOUND",404);
    return(await this.pool.query(packageSelect+` WHERE p.class_id=$1 AND p.status='published' AND t.status='active' AND c.status='active' AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=t.user_id AND role='teacher' AND status='active') ORDER BY p.created_at DESC LIMIT 50`,[b.class_id])).rows;}
  async issue(parent:string,input:InvoiceInput){
    const parsed=tuitionInvoiceInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);const body=parsed.data,hash=digest(body);
    return this.transaction(async client=>{await this.role(client,parent,"parent");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["invoice-parent:"+parent]);
      const prior=(await client.query("SELECT id,input_hash FROM tuition_invoices WHERE parent_id=$1 AND client_request_id=$2",[parent,body.clientRequestId])).rows[0];if(prior){if(prior.input_hash!==hash)throw accessError("IDEMPOTENCY_CONFLICT",409);return{id:prior.id};}
      const source=(await client.query(`SELECT s.teacher_id,b.slot_id FROM tuition_bookings b JOIN students st ON st.id=b.student_id JOIN tuition_slots s ON s.id=b.slot_id WHERE b.id=$1 AND b.parent_id=$2 AND st.parent_id=$2`,[body.bookingId,parent])).rows[0];if(!source)throw accessError("BOOKING_NOT_FOUND",404);
      if(!(await client.query(`SELECT 1 FROM teacher_profiles t JOIN user_roles r ON r.user_id=t.user_id AND r.role='teacher' AND r.status='active' WHERE t.user_id=$1 AND t.status='active' FOR SHARE OF t`,[source.teacher_id])).rows[0])throw accessError("BOOKING_NOT_FOUND",404);
      const b=(await client.query(`SELECT b.*,s.class_id,s.status AS slot_status,s.starts_at FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id WHERE b.id=$1 FOR UPDATE OF b,s`,[body.bookingId])).rows[0];
      if(b.status!=="accepted"||b.slot_status!=="open"||new Date(b.starts_at).getTime()<=Date.now())throw accessError("BOOKING_STATE_CONFLICT",409);
      const existing=(await client.query("SELECT id,package_id FROM tuition_invoices WHERE booking_id=$1",[body.bookingId])).rows[0];if(existing){if(existing.package_id!==body.packageId)throw accessError("INVOICE_EXISTS",409);return{id:existing.id};}
      const p=(await client.query("SELECT * FROM tuition_packages WHERE id=$1 AND class_id=$2 AND status='published' FOR SHARE",[body.packageId,b.class_id])).rows[0];if(!p)throw accessError("PACKAGE_NOT_FOUND",404);
      const amounts=tuitionAmounts(p.amount_cents,p.fee_cents,p.commission_bps),id=randomUUID();
      await client.query(`INSERT INTO tuition_invoices(id,booking_id,package_id,parent_id,teacher_id,title,amount_cents,fee_cents,commission_bps,total_cents,teacher_cents,imai_cents,no_refund_version,consent_version,client_request_id,input_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'no-refund-v1',$13,$14,$15)`,[id,b.id,p.id,parent,source.teacher_id,p.title,p.amount_cents,p.fee_cents,p.commission_bps,amounts.totalCents,amounts.teacherCents,amounts.imaiCents,body.consentVersion,body.clientRequestId,hash]);
      await this.event(client,id,parent,"sandbox_invoice_created");return{id};});
  }
  async invoices(actor:string,role:"parent"|"super_admin",studentId?:string){await this.role(this.pool,actor,role);if(studentId&&role==="parent"&&!(await this.pool.query("SELECT 1 FROM students WHERE id=$1 AND parent_id=$2",[studentId,actor])).rows[0])throw accessError("STUDENT_NOT_FOUND",404);
    return(await this.pool.query(invoiceSelect+(studentId?" JOIN tuition_bookings b ON b.id=i.booking_id":"")+" WHERE "+(role==="parent"?"i.parent_id=$1":"$1::uuid IS NOT NULL")+(studentId?" AND b.student_id=$2":"")+" ORDER BY i.created_at DESC LIMIT 100",studentId?[actor,studentId]:[actor])).rows;}
  async invoice(parent:string,id:string){await this.role(this.pool,parent,"parent");const row=(await this.pool.query(invoiceSelect+" WHERE i.id=$1 AND i.parent_id=$2",[id,parent])).rows[0];if(!row)throw accessError("INVOICE_NOT_FOUND",404);return row;}
  async claimCheckout(parent:string,id:string){return this.transaction(async client=>{await this.role(client,parent,"parent");const row=(await client.query("SELECT i.*,b.status AS booking_status,s.starts_at FROM tuition_invoices i LEFT JOIN tuition_bookings b ON b.id=i.booking_id LEFT JOIN tuition_slots s ON s.id=b.slot_id WHERE i.id=$1 AND i.parent_id=$2 FOR UPDATE OF i",[id,parent])).rows[0];if(!row)throw accessError("INVOICE_NOT_FOUND",404);
    if(row.status==="paid")throw accessError("INVOICE_ALREADY_PAID",409);if(row.booking_status!=="accepted"||new Date(row.starts_at).getTime()<=Date.now())throw accessError("BOOKING_STATE_CONFLICT",409);
    if(!(await client.query(`SELECT 1 FROM teacher_profiles t JOIN user_roles r ON r.user_id=t.user_id AND r.role='teacher' AND r.status='active' WHERE t.user_id=$1 AND t.status='active'`,[row.teacher_id])).rows[0])throw accessError("BOOKING_STATE_CONFLICT",409);
    if(!(await client.query(`SELECT 1 FROM tuition_bookings b JOIN tuition_slots s ON s.id=b.slot_id JOIN teacher_classes c ON c.id=s.class_id WHERE b.id=$1 AND s.status='open' AND c.status='active'`,[row.booking_id])).rows[0])throw accessError("BOOKING_STATE_CONFLICT",409);
    if(row.bill_code)return{invoiceId:id,amountCents:row.total_cents,billCode:row.bill_code,claimed:false};if(row.bill_state!=="new")throw accessError("CHECKOUT_REVIEW_REQUIRED",409);
    await client.query("UPDATE tuition_invoices SET bill_state='creating' WHERE id=$1",[id]);await this.event(client,id,parent,"sandbox_checkout_claimed");return{invoiceId:id,amountCents:row.total_cents,billCode:null,claimed:true};});}
  async attachBill(id:string,billCode:string){return this.transaction(async client=>{const row=(await client.query("SELECT bill_code,bill_state FROM tuition_invoices WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!row||!(row.bill_state==="creating"||(row.bill_code===billCode&&row.bill_state==="ready")))throw accessError("CHECKOUT_REVIEW_REQUIRED",409);
    await client.query("UPDATE tuition_invoices SET bill_code=$2,bill_state='ready' WHERE id=$1",[id,billCode]);await this.event(client,id,null,"sandbox_bill_attached");});}
  async checkoutUncertain(id:string){await this.pool.query("UPDATE tuition_invoices SET bill_state='review' WHERE id=$1 AND bill_state='creating'",[id]);}
  async callbackInvoice(id:string,billCode:string){const row=(await this.pool.query("SELECT id,total_cents,bill_code,bill_state FROM tuition_invoices WHERE id=$1",[id])).rows[0];if(!row||row.bill_code!==billCode)throw accessError("PAYMENT_REFERENCE_INVALID",400);return{invoiceId:row.id,amountCents:row.total_cents};}
  async confirmedReference(id:string,reference:string,amountCents:number){const prior=(await this.pool.query("SELECT invoice_id,amount_cents FROM tuition_payment_transactions WHERE provider_reference=$1",[reference])).rows[0];if(!prior)return false;if(prior.invoice_id!==id||prior.amount_cents!==amountCents)throw accessError("PAYMENT_REFERENCE_CONFLICT",409);return true;}
  async recoveryInvoice(actor:string,id:string){await this.role(this.pool,actor,"super_admin");const row=(await this.pool.query("SELECT id,total_cents,bill_code,bill_state,status FROM tuition_invoices WHERE id=$1",[id])).rows[0];if(!row)throw accessError("INVOICE_NOT_FOUND",404);if(!["review","creating","ready"].includes(row.bill_state))throw accessError("CHECKOUT_REVIEW_REQUIRED",409);return{amountCents:row.total_cents};}
  async attachRecoveredBill(actor:string,id:string,billCode:string,note:string){return this.transaction(async client=>{await this.role(client,actor,"super_admin");const row=(await client.query("SELECT bill_code,bill_state FROM tuition_invoices WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!row||!["review","creating","ready"].includes(row.bill_state)||(row.bill_code&&row.bill_code!==billCode))throw accessError("CHECKOUT_REVIEW_REQUIRED",409);if(row.bill_state==="ready"&&row.bill_code===billCode)return;await client.query("UPDATE tuition_invoices SET bill_code=$2,bill_state='ready' WHERE id=$1",[id,billCode]);await client.query("INSERT INTO tuition_commerce_events(id,entity_id,actor_id,event,note) VALUES($1,$2,$3,'sandbox_confirmed_bill_recovered',$4)",[randomUUID(),id,actor,note]);});}
  async settle(id:string,reference:string,amountCents:number){return this.transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["payment-reference:"+reference]);
    const row=(await client.query(`SELECT i.*,b.status AS booking_status,EXISTS(SELECT 1 FROM teacher_profiles t JOIN user_roles r ON r.user_id=t.user_id AND r.role='teacher' AND r.status='active' WHERE t.user_id=i.teacher_id AND t.status='active') AS teacher_active FROM tuition_invoices i LEFT JOIN tuition_bookings b ON b.id=i.booking_id WHERE i.id=$1 FOR UPDATE OF i`,[id])).rows[0];if(!row||row.total_cents!==amountCents)throw accessError("PAYMENT_AMOUNT_INVALID",400);
    const prior=(await client.query("SELECT * FROM tuition_payment_transactions WHERE provider_reference=$1",[reference])).rows[0];if(prior){if(prior.invoice_id!==id||prior.amount_cents!==amountCents)throw accessError("PAYMENT_REFERENCE_CONFLICT",409);return{transactionId:prior.id,duplicate:true};}
    const hold=row.status==="paid"?"duplicate_payment":row.booking_status!=="accepted"?"booking_changed":!row.teacher_active?"teacher_unavailable":null,transactionId=randomUUID();
    await client.query("INSERT INTO tuition_payment_transactions(id,invoice_id,provider_reference,amount_cents,hold_reason) VALUES($1,$2,$3,$4,$5)",[transactionId,id,reference,amountCents,hold]);
    const entries:Array<[string,string,number]>=[["provider_clearing","debit",amountCents]];
    if(hold)entries.push(["unallocated_credit","credit",amountCents]);else{if(row.teacher_cents)entries.push(["teacher_payable","credit",row.teacher_cents]);if(row.imai_cents)entries.push(["imai_income","credit",row.imai_cents]);}
    for(const [account,direction,cents]of entries)await client.query("INSERT INTO tuition_payment_ledger(id,transaction_id,account,direction,amount_cents) VALUES($1,$2,$3,$4,$5)",[randomUUID(),transactionId,account,direction,cents]);
    await client.query("UPDATE tuition_invoices SET status='paid',paid_at=COALESCE(paid_at,now()) WHERE id=$1",[id]);for(const user of new Set([row.parent_id,row.teacher_id]))await client.query("INSERT INTO tuition_payment_notifications(id,user_id,transaction_id,recipient_role) VALUES($1,$2,$3,$4)",[randomUUID(),user,transactionId,user===row.parent_id?"parent":"teacher"]);await this.event(client,id,null,hold?"sandbox_payment_held:"+hold:"sandbox_payment_confirmed");return{transactionId,duplicate:false};});}
  async receipts(parent:string,id:string){await this.invoice(parent,id);return(await this.pool.query(`SELECT id,provider_reference AS "providerReference",amount_cents AS "amountCents",hold_reason AS "holdReason",created_at AS "createdAt" FROM tuition_payment_transactions WHERE invoice_id=$1 ORDER BY created_at,id`,[id])).rows;}
  async reconciliation(actor:string){await this.role(this.pool,actor,"super_admin");return(await this.pool.query(`SELECT t.id,t.invoice_id AS "invoiceId",t.provider_reference AS "providerReference",t.amount_cents AS "amountCents",t.hold_reason AS "holdReason",t.created_at AS "createdAt",
    COALESCE(sum(CASE WHEN l.direction='debit' THEN l.amount_cents ELSE -l.amount_cents END),0)::bigint AS "imbalanceCents",i.mode
    FROM tuition_payment_transactions t JOIN tuition_invoices i ON i.id=t.invoice_id LEFT JOIN tuition_payment_ledger l ON l.transaction_id=t.id GROUP BY t.id,i.mode ORDER BY t.created_at DESC LIMIT 200`)).rows;}
}
