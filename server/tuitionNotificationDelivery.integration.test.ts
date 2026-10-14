import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeAll,afterAll,describe,it,expect,vi } from "vitest";
import { migrateTuitionNotificationDelivery,TuitionNotificationDelivery } from "./tuitionNotificationDelivery.js";
const databaseUrl=process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("consented notification outbox against PostgreSQL; synthetic delivery only",()=>{
 const schema="delivery_"+randomUUID().replaceAll("-","");const user=randomUUID(),other=randomUUID(),adminId=randomUUID();let owner:Pool,pool:Pool,delivery:TuitionNotificationDelivery;
 const secret="synthetic_notification_key_at_least_32_chars",sent:Array<{destination:string;message:string;idempotencyKey:string}>=[];
 const send=vi.fn(async(input:any)=>{sent.push(input);return{accepted:true,reference:"SYNTHETIC-"+sent.length};});
 beforeAll(async()=>{const url=new URL(databaseUrl!);if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw Error("Dedicated loopback exam_qa required");owner=new Pool({connectionString:databaseUrl});await owner.query(`CREATE SCHEMA ${schema}`);url.searchParams.set("options",`-c search_path=${schema}`);pool=new Pool({connectionString:url.toString()});await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE user_roles(user_id uuid,role text,status text);CREATE TABLE tuition_notifications(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz DEFAULT now(),recipient_role text DEFAULT 'parent');CREATE TABLE tuition_payment_notifications(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz DEFAULT now(),recipient_role text DEFAULT 'parent');INSERT INTO users VALUES('${user}'),('${other}'),('${adminId}');INSERT INTO user_roles VALUES('${user}','parent','active'),('${other}','parent','active'),('${adminId}','super_admin','active');`);await migrateTuitionNotificationDelivery(pool);delivery=new TuitionNotificationDelivery(pool,()=>({send}),()=>secret);});
 afterAll(async()=>{if(pool)await pool.end();if(owner){await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await owner.end();}});
 it("defaults transport-disabled, never exposes OTP/contact plaintext and requires verified possession",async()=>{
  const disabled=new TuitionNotificationDelivery(pool,()=>null,()=>secret);expect((await disabled.preferences(user)).channels).toEqual({email:false,whatsapp:false});await expect(disabled.requestVerification(user,"email","owner@example.invalid")).rejects.toMatchObject({code:"NOTIFICATIONS_NOT_CONFIGURED"});expect(await disabled.runOne()).toEqual({status:"provider_unconfigured"});expect(send).not.toHaveBeenCalled();
  const response=await delivery.requestVerification(user,"email","owner@example.invalid");expect(response).toEqual({maskedDestination:"o***@example.invalid",verificationPending:true});expect(JSON.stringify(response)).not.toMatch(/\d{6}/);const stored=(await pool.query("SELECT sealed_destination,verification_hash FROM tuition_notification_preferences")).rows[0];expect(stored.sealed_destination).not.toContain("owner@example.invalid");
  await pool.query("INSERT INTO tuition_notifications(id,user_id) VALUES($1,$2)",[randomUUID(),user]);expect((await delivery.enqueue()).examined).toBe(0);expect(await delivery.runOne()).toEqual({status:"accepted"});const code=sent.at(-1)!.message.match(/\d{6}/)![0];expect(stored.verification_hash).not.toContain(code);await expect(delivery.verify(other,"email",code)).rejects.toMatchObject({code:"VERIFICATION_CODE_INVALID"});
  expect(await delivery.verify(user,"email",code)).toEqual({verified:true});expect((await delivery.preferences(user)).preferences[0].verifiedAt).toBeTruthy();
 });
 it("queues only future events once and sends no child details",async()=>{
  const notification=randomUUID();await pool.query("INSERT INTO tuition_notifications(id,user_id) VALUES($1,$2)",[notification,user]);await Promise.all([delivery.enqueue(),delivery.enqueue()]);expect((await pool.query("SELECT count(*)::int AS n FROM tuition_delivery_outbox WHERE source_notification_id=$1",[notification])).rows[0].n).toBe(1);
  const before=send.mock.calls.length;await Promise.all([delivery.runOne(),delivery.runOne()]);expect(send.mock.calls.length-before).toBe(1);expect(sent.at(-1)!.message).toBe("Ada kemas kini tempahan di IMAI Study. Log masuk ke https://study.imai.my untuk melihat butiran.");
  const audit=await delivery.adminOutbox(adminId);expect(audit[0].status).toBe("accepted");expect(JSON.stringify(audit)).not.toContain("owner@example.invalid");await expect(delivery.adminOutbox(user)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
 });
 it("withdrawal cancels pending sends, preserves recipient snapshots and limits bad verification attempts",async()=>{
  await pool.query("INSERT INTO tuition_notifications(id,user_id) VALUES($1,$2)",[randomUUID(),user]);await delivery.enqueue();await delivery.disable(user,"email");const before=send.mock.calls.length;expect(await delivery.runOne()).toEqual({status:"idle"});expect(send.mock.calls.length).toBe(before);
  await delivery.requestVerification(user,"email","changed@example.invalid");expect((await delivery.adminOutbox(adminId)).some(row=>row.maskedDestination==="o***@example.invalid")).toBe(true);await delivery.runOne();const real=sent.at(-1)!.message.match(/\d{6}/)![0],bad=real==="000000"?"111111":"000000";
  for(let attempt=0;attempt<5;attempt++)await expect(delivery.verify(user,"email",bad)).rejects.toMatchObject({code:"VERIFICATION_CODE_INVALID"});await expect(delivery.verify(user,"email",real)).rejects.toMatchObject({code:"VERIFICATION_CODE_INVALID"});expect((await pool.query("SELECT verification_attempts FROM tuition_notification_preferences WHERE user_id=$1",[user])).rows[0].verification_attempts).toBe(5);
 });
 it("unknown delivery outcome is held and is never automatically retried",async()=>{
  await delivery.requestVerification(other,"whatsapp","+60123456789");const failed=vi.fn(async()=>{throw Error("Network closed after send");});const uncertain=new TuitionNotificationDelivery(pool,channel=>channel==="whatsapp"?{send:failed}:null,()=>secret);
  expect(await uncertain.runOne()).toEqual({status:"review"});expect(await uncertain.runOne()).toEqual({status:"idle"});expect(failed).toHaveBeenCalledTimes(1);
 });
 it("durable attempt state prevents a second send after acknowledgement persistence fails",async()=>{
  await delivery.requestVerification(other,"whatsapp","+60111111111");await pool.query(`CREATE FUNCTION reject_accepted() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='accepted' THEN RAISE EXCEPTION 'Synthetic persistence failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_accepted BEFORE UPDATE ON tuition_delivery_outbox FOR EACH ROW EXECUTE FUNCTION reject_accepted();`);
  const before=send.mock.calls.length;expect(await delivery.runOne()).toEqual({status:"review"});expect(send.mock.calls.length-before).toBe(1);expect(await delivery.runOne()).toEqual({status:"idle"});expect(send.mock.calls.length-before).toBe(1);await pool.query("DROP TRIGGER reject_accepted ON tuition_delivery_outbox");
 });
});
