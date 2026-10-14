import {createHash,createHmac,randomUUID,timingSafeEqual} from "node:crypto";
import {readFileSync,statSync} from "node:fs";
import type {Pool} from "pg";
import {z} from "zod";
import {accessError} from "./familyAccess.js";
export type WhatsAppReceiptConfiguration={appSecret:string;verifyToken:string;phoneNumberId:string};
function protectedValue(file:string|undefined){if(!file)throw Error();const info=statSync(file);if(!info.isFile()||(process.platform!=="win32"&&(info.mode&0o077)!==0))throw Error();const value=readFileSync(file,"utf8").trim();if(value.length<16||/\s/.test(value))throw Error();return value;}
export function configuredWhatsAppReceipts(env:NodeJS.ProcessEnv=process.env):WhatsAppReceiptConfiguration{
 try{if(env.TUITION_WHATSAPP_PROVIDER!=="meta_cloud"||env.TUITION_WHATSAPP_WEBHOOK_ENABLED!=="true"||!/^\d{8,32}$/.test(env.TUITION_WHATSAPP_PHONE_NUMBER_ID??""))throw Error();return{appSecret:protectedValue(env.TUITION_WHATSAPP_APP_SECRET_FILE),verifyToken:protectedValue(env.TUITION_WHATSAPP_VERIFY_TOKEN_FILE),phoneNumberId:env.TUITION_WHATSAPP_PHONE_NUMBER_ID!};}catch{throw accessError("WHATSAPP_WEBHOOK_NOT_CONFIGURED",503);}
}
export function verifyWhatsAppReceipt(raw:Buffer,signature:unknown,secret:string){if(typeof signature!=="string"||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;return timingSafeEqual(Buffer.from(signature.slice(7),"hex"),createHmac("sha256",secret).update(raw).digest());}
const statusInput=z.object({id:z.string().regex(/^wamid\.[A-Za-z0-9+/=_-]{1,500}$/),status:z.enum(["sent","delivered","read","failed"]),timestamp:z.union([z.string().regex(/^\d{1,11}$/),z.number().int().min(0)]).transform(Number)});
const payloadInput=z.object({object:z.literal("whatsapp_business_account"),entry:z.array(z.object({changes:z.array(z.object({field:z.string(),value:z.object({messaging_product:z.literal("whatsapp"),metadata:z.object({phone_number_id:z.string()}),statuses:z.array(statusInput).max(100).optional()})})).max(20)})).max(20)});
export type WhatsAppDeliveryReceipt={reference:string;status:"sent"|"delivered"|"read"|"failed";timestamp:number};
export function extractWhatsAppReceipts(payload:unknown,phone:string){const parsed=payloadInput.safeParse(payload);if(!parsed.success)throw accessError("INVALID_INPUT",400);const receipts:WhatsAppDeliveryReceipt[]=[];for(const entry of parsed.data.entry)for(const change of entry.changes){if(change.field!=="messages"||change.value.metadata.phone_number_id!==phone)continue;for(const status of change.value.statuses??[]){if(status.timestamp>Math.floor(Date.now()/1000)+300)throw accessError("INVALID_INPUT",400);receipts.push({reference:"meta:"+createHash("sha256").update(status.id).digest("hex"),status:status.status,timestamp:status.timestamp});}}if(receipts.length>100)throw accessError("INVALID_INPUT",400);return receipts;}
export async function migrateWhatsAppDeliveryReceipts(pool:Pick<Pool,"query">){await pool.query(`ALTER TABLE tuition_delivery_outbox ADD COLUMN IF NOT EXISTS delivery_status text CHECK(delivery_status IN ('sent','delivered','read','failed'));ALTER TABLE tuition_delivery_outbox ADD COLUMN IF NOT EXISTS delivery_timestamp bigint;
 CREATE UNIQUE INDEX IF NOT EXISTS tuition_delivery_unique_provider_ref_idx ON tuition_delivery_outbox(provider_reference) WHERE provider_reference IS NOT NULL;
 CREATE TABLE IF NOT EXISTS tuition_whatsapp_delivery_events(id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES tuition_delivery_outbox(id) ON DELETE CASCADE,status text NOT NULL CHECK(status IN ('sent','delivered','read','failed')),provider_timestamp bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(job_id,status,provider_timestamp));`);}
export class TuitionWhatsAppReceiptRepository{
 constructor(private pool:Pool){}
 async record(receipts:WhatsAppDeliveryReceipt[]){const client=await this.pool.connect();let matched=0;try{await client.query("BEGIN");for(const receipt of receipts){const jobs=(await client.query("SELECT id,status,delivery_status,delivery_timestamp FROM tuition_delivery_outbox WHERE channel='whatsapp' AND provider_reference=$1 FOR UPDATE",[receipt.reference])).rows;for(const job of jobs){
  if(job.status!=="accepted")continue;
  const event=await client.query("INSERT INTO tuition_whatsapp_delivery_events(id,job_id,status,provider_timestamp) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id",[randomUUID(),job.id,receipt.status,receipt.timestamp]);if(!event.rows.length)continue;matched++;
  const ranks:Record<string,number>={sent:1,delivered:2,read:3},rank=ranks[receipt.status]??0,prior=ranks[job.delivery_status]??0;
  const update=receipt.status==="failed"?prior<2&&receipt.timestamp>=Number(job.delivery_timestamp??0):rank>prior&&!(job.delivery_status==="failed"&&receipt.status==="sent");
  if(update)await client.query("UPDATE tuition_delivery_outbox SET delivery_status=$2,delivery_timestamp=$3 WHERE id=$1",[job.id,receipt.status,receipt.timestamp]);
 }}await client.query("COMMIT");return{matched};}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
}
