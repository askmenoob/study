import type {Pool} from "pg";
import {z} from "zod";
import {accessError} from "./familyAccess.js";
const date=z.string().regex(/^20\d{2}-\d{2}-\d{2}$/);
export const accountingPeriodInput=z.object({from:date,to:date}).strict();
export function accountingPeriod(input:unknown){
 const parsed=accountingPeriodInput.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);
 const boundary=(value:string)=>{const stamp=Date.parse(value+"T00:00:00.000Z");if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==value)throw accessError("INVALID_INPUT",400);return stamp-8*3600000;};
 const start=boundary(parsed.data.from),end=boundary(parsed.data.to)+86400000;if(end<=start||end-start>31*86400000)throw accessError("ACCOUNTING_PERIOD_INVALID",400);
 return{from:new Date(start).toISOString(),until:new Date(end).toISOString(),timezone:"Asia/Kuala_Lumpur"};
}
export async function tuitionAccountingRecords(pool:Pick<Pool,"query">,actor:string,input:unknown){
 const period=accountingPeriod(input);if(!(await pool.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='super_admin' AND status='active'",[actor])).rows[0])throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
 const rows=(await pool.query(`SELECT t.id AS "transactionId",i.id AS "invoiceId",i.mode,i.title,i.teacher_id AS "teacherId",t.provider_reference AS "providerReference",t.amount_cents AS "paidCents",t.hold_reason AS "holdReason",t.created_at AS "recordedAt",
  COALESCE(sum(l.amount_cents) FILTER(WHERE l.account='teacher_payable' AND l.direction='credit'),0)::text AS "teacherCents",
  COALESCE(sum(l.amount_cents) FILTER(WHERE l.account='imai_income' AND l.direction='credit'),0)::text AS "imaiCents",
  COALESCE(sum(l.amount_cents) FILTER(WHERE l.account='unallocated_credit' AND l.direction='credit'),0)::text AS "heldCents",
  COALESCE(sum(CASE WHEN l.direction='debit' THEN l.amount_cents ELSE -l.amount_cents END),0)::text AS "imbalanceCents"
  FROM tuition_payment_transactions t JOIN tuition_invoices i ON i.id=t.invoice_id LEFT JOIN tuition_payment_ledger l ON l.transaction_id=t.id
  WHERE t.created_at>=$1::timestamptz AND t.created_at<$2::timestamptz GROUP BY t.id,i.id ORDER BY t.created_at,t.id LIMIT 10001`,[period.from,period.until])).rows;
 if(rows.length>10000)throw accessError("ACCOUNTING_EXPORT_TOO_LARGE",409);
 return{period,records:rows,documentType:"sandbox_accounting_records",taxDocument:false,moneyTransferred:false};
}
