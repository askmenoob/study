import { randomUUID,createHash } from "node:crypto";
import { Pool } from "pg";
import { describe,it,expect,beforeAll,afterAll,vi } from "vitest";
import { migrateTuitionCommerce,TuitionCommerceRepository,tuitionAmounts } from "./tuitionCommerce.js";
import { TuitionPaymentService } from "./tuitionPaymentService.js";
const databaseUrl=process.env.EXAM_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("sandbox tuition commerce with real PostgreSQL and synthetic provider",()=>{
  const schema="commerce_"+randomUUID().replaceAll("-","");
  const adminId=randomUUID(),teacher=randomUUID(),parent=randomUUID(),stranger=randomUUID(),child=randomUUID(),classId=randomUUID(),slotId=randomUUID(),bookingId=randomUUID();
  let owner:Pool,pool:Pool,repository:TuitionCommerceRepository,packageId:string,invoiceId:string;
  const serviceWithCheckout=(repo:TuitionCommerceRepository,gateway:ConstructorParameters<typeof TuitionPaymentService>[1])=>new TuitionPaymentService(repo,gateway,()=>true);
  const secret="synthetic_gateway_secret";
  beforeAll(async()=>{
    const url=new URL(databaseUrl!);if(!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||!url.pathname.startsWith("/exam_qa")||url.searchParams.has("options"))throw Error("Dedicated disposable loopback database required");
    owner=new Pool({connectionString:databaseUrl});await owner.query(`CREATE SCHEMA ${schema}`);url.searchParams.set("options",`-c search_path=${schema}`);pool=new Pool({connectionString:url.toString()});
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE user_roles(user_id uuid,role text,status text);
      CREATE TABLE students(id uuid PRIMARY KEY,parent_id uuid,name text);CREATE TABLE teacher_profiles(user_id uuid PRIMARY KEY,public_name text,status text);
      CREATE TABLE teacher_classes(id uuid PRIMARY KEY,teacher_id uuid,name text,status text);CREATE TABLE tuition_slots(id uuid PRIMARY KEY,class_id uuid,teacher_id uuid,status text,starts_at timestamptz);
      CREATE TABLE tuition_bookings(id uuid PRIMARY KEY,slot_id uuid,student_id uuid REFERENCES students(id) ON DELETE CASCADE,parent_id uuid,status text);
      INSERT INTO users VALUES('${adminId}'),('${teacher}'),('${parent}'),('${stranger}');
      INSERT INTO user_roles VALUES('${adminId}','super_admin','active'),('${teacher}','teacher','active'),('${parent}','parent','active'),('${stranger}','parent','active');
      INSERT INTO students VALUES('${child}','${parent}','Synthetic Student');INSERT INTO teacher_profiles VALUES('${teacher}','Synthetic Teacher','active');
      INSERT INTO teacher_classes VALUES('${classId}','${teacher}','Synthetic BM','active');
      INSERT INTO tuition_slots VALUES('${slotId}','${classId}','${teacher}','open',now()+interval '7 days');
      INSERT INTO tuition_bookings VALUES('${bookingId}','${slotId}','${child}','${parent}','accepted');`);
    await migrateTuitionCommerce(pool);await migrateTuitionCommerce(pool);repository=new TuitionCommerceRepository(pool);
  });
  afterAll(async()=>{if(pool)await pool.end();if(owner){await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await owner.end();}});
  const callback=(reference:string,status="1",amount="10.31")=>({status,order_id:invoiceId,refno:reference,billcode:"billqa",amount,hash:createHash("md5").update(secret+status+invoiceId+reference+"ok").digest("hex")});
  it("uses exact cents, immutable admin drafts and explicit publication",async()=>{
    expect(tuitionAmounts(1001,30,1250)).toEqual({totalCents:1031,commissionCents:125,teacherCents:876,imaiCents:155});
    for(const values of [[1001.2,30,1250],[1001,-1,1250],[1001,30,10001]])expect(()=>tuitionAmounts(...values as [number,number,number])).toThrow();
    const body={classId,title:"Synthetic single session",amountCents:1001,feeCents:30,commissionBps:1250,clientRequestId:randomUUID()};
    await expect(repository.createPackage(parent,body)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});
    packageId=(await repository.createPackage(adminId,body)).id;expect((await repository.createPackage(adminId,body)).id).toBe(packageId);
    await expect(repository.createPackage(adminId,{...body,amountCents:2000})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
    expect(await repository.options(parent,bookingId)).toEqual([]);
    await repository.packageStatus(adminId,packageId,1,"published");expect((await repository.options(parent,bookingId))[0]).toMatchObject({amountCents:1001,feeCents:30,commissionBps:1250});
    await expect(repository.packageStatus(adminId,packageId,1,"archived")).rejects.toMatchObject({code:"VERSION_CONFLICT"});
  });
  it("requires guardian ownership/consent and freezes the invoice price",async()=>{
    const body={bookingId,packageId,clientRequestId:randomUUID(),noRefundAttested:true as const,consentVersion:"tuition-payment-sandbox-v1" as const};
    await expect(repository.issue(stranger,body)).rejects.toMatchObject({code:"BOOKING_NOT_FOUND"});
    await expect(repository.issue(parent,{...body,noRefundAttested:false} as any)).rejects.toMatchObject({code:"INVALID_INPUT"});
    invoiceId=(await repository.issue(parent,body)).id;expect((await repository.issue(parent,body)).id).toBe(invoiceId);
    await expect(repository.invoice(stranger,invoiceId)).rejects.toMatchObject({code:"INVOICE_NOT_FOUND"});
    await repository.packageStatus(adminId,packageId,2,"archived");expect(await repository.invoice(parent,invoiceId)).toMatchObject({totalCents:1031,teacherCents:876,imaiCents:155,mode:"sandbox",status:"unpaid"});
    const disabled=serviceWithCheckout(repository,async()=>{throw Object.assign(Error("Missing"),{code:"PAYMENTS_NOT_CONFIGURED",statusCode:503});});
    await expect(disabled.checkout(parent,invoiceId)).rejects.toMatchObject({code:"PAYMENTS_NOT_CONFIGURED"});expect((await repository.invoice(parent,invoiceId)).billState).toBe("new");
  });
  it("creates one bill under concurrent checkout and retains uncertainty",async()=>{
    const createBill=vi.fn(async()=>({billCode:"billqa",paymentUrl:"https://dev.toyyibpay.com/billqa"}));
    const service=serviceWithCheckout(repository,async()=>({secret,client:{createBill,confirmTransaction:async()=>true}}));
    const results=await Promise.allSettled([service.checkout(parent,invoiceId),service.checkout(parent,invoiceId)]);
    expect(results.some(r=>r.status==="fulfilled")).toBe(true);expect(createBill).toHaveBeenCalledTimes(1);
    expect(await service.checkout(parent,invoiceId)).toEqual({mode:"sandbox",paymentUrl:"https://dev.toyyibpay.com/billqa"});expect(createBill).toHaveBeenCalledTimes(1);
    const badBooking=randomUUID();await pool.query("INSERT INTO tuition_bookings VALUES($1,$2,$3,$4,'accepted')",[badBooking,slotId,child,parent]);
    const otherPackage=(await repository.createPackage(adminId,{classId,title:"Failure-path session",amountCents:1001,feeCents:30,commissionBps:1250,clientRequestId:randomUUID()})).id;await repository.packageStatus(adminId,otherPackage,1,"published");
    const uncertain=(await repository.issue(parent,{bookingId:badBooking,packageId:otherPackage,clientRequestId:randomUUID(),noRefundAttested:true,consentVersion:"tuition-payment-sandbox-v1"})).id;
    const failing=vi.fn(async()=>{throw Error("Network timed out after provider creation");});const failedService=serviceWithCheckout(repository,async()=>({secret,client:{createBill:failing,confirmTransaction:async()=>false}}));
    await expect(failedService.checkout(parent,uncertain)).rejects.toMatchObject({code:"CHECKOUT_REVIEW_REQUIRED"});await expect(failedService.checkout(parent,uncertain)).rejects.toMatchObject({code:"CHECKOUT_REVIEW_REQUIRED"});expect(failing).toHaveBeenCalledTimes(1);
  });
  it("rejects forged, wrong-bill, wrong-amount and unconfirmed callbacks",async()=>{
    const confirmTransaction=vi.fn(async()=>false);const service=serviceWithCheckout(repository,async()=>({secret,client:{createBill:async()=>({billCode:"unused",paymentUrl:""}),confirmTransaction}}));
    await expect(service.callback({...callback("TP-A"),hash:"0".repeat(32)})).rejects.toMatchObject({code:"PAYMENT_SIGNATURE_INVALID"});
    await expect(service.callback({...callback("TP-A"),billcode:"otherbill"})).rejects.toMatchObject({code:"PAYMENT_REFERENCE_INVALID"});
    await expect(service.callback(callback("TP-A","1","10.30"))).rejects.toMatchObject({code:"PAYMENT_AMOUNT_INVALID"});
    await expect(service.callback(callback("TP-A"))).rejects.toMatchObject({code:"PAYMENT_NOT_CONFIRMED"});
    expect((await repository.invoice(parent,invoiceId)).status).toBe("unpaid");expect(await repository.receipts(parent,invoiceId)).toEqual([]);
  });
  it("settles once, balances ledger and never regresses paid state",async()=>{
    const service=serviceWithCheckout(repository,async()=>({secret,client:{createBill:async()=>({billCode:"unused",paymentUrl:""}),confirmTransaction:async()=>true}}));
    await Promise.all([service.callback(callback("TP-A")),service.callback(callback("TP-A"))]);
    expect(await repository.receipts(parent,invoiceId)).toHaveLength(1);const reconciliation=await repository.reconciliation(adminId);expect(reconciliation[0]).toMatchObject({amountCents:1031,imbalanceCents:"0",mode:"sandbox",holdReason:null});
    const ledger=(await pool.query("SELECT account,direction,amount_cents FROM tuition_payment_ledger ORDER BY account")).rows;expect(ledger).toEqual([{account:"imai_income",direction:"credit",amount_cents:155},{account:"provider_clearing",direction:"debit",amount_cents:1031},{account:"teacher_payable",direction:"credit",amount_cents:876}]);
    await service.callback(callback("TP-A","3","0.00"));expect((await repository.invoice(parent,invoiceId)).status).toBe("paid");expect(await repository.receipts(parent,invoiceId)).toHaveLength(1);
    const createBill=vi.fn(async()=>({billCode:"unused",paymentUrl:""})),confirm=vi.fn(async()=>{throw Error("Provider now unavailable");});
    const stopped=new TuitionPaymentService(repository,async()=>({secret,client:{createBill,confirmTransaction:confirm}}),()=>false);
    await expect(stopped.checkout(parent,invoiceId)).rejects.toMatchObject({code:"PAYMENTS_NOT_CONFIGURED"});
    expect(await stopped.callback(callback("TP-A"))).toMatchObject({settled:true});expect(confirm).not.toHaveBeenCalled();expect(createBill).not.toHaveBeenCalled();
  });
  it("holds duplicate money and money received for cancelled bookings",async()=>{
    const service=serviceWithCheckout(repository,async()=>({secret,client:{createBill:async()=>({billCode:"unused",paymentUrl:""}),confirmTransaction:async()=>true}}));
    await service.callback(callback("TP-B"));expect((await repository.receipts(parent,invoiceId)).find(r=>r.providerReference==="TP-B")?.holdReason).toBe("duplicate_payment");
    expect((await pool.query("SELECT amount_cents FROM tuition_payment_ledger WHERE account='unallocated_credit'")).rows[0].amount_cents).toBe(1031);
    const second=(await repository.invoices(parent,"parent")).find(i=>i.id!==invoiceId)!;
    await pool.query("UPDATE tuition_invoices SET bill_code='latebill',bill_state='ready' WHERE id=$1",[second.id]);await pool.query("UPDATE tuition_bookings SET status='cancelled' WHERE id=$1",[second.bookingId]);
    const payload={...callback("TP-LATE"),order_id:second.id,billcode:"latebill"};payload.hash=createHash("md5").update(secret+"1"+second.id+"TP-LATEok").digest("hex");await service.callback(payload);
    expect((await repository.receipts(parent,second.id))[0].holdReason).toBe("booking_changed");expect((await repository.reconciliation(adminId)).every(r=>r.imbalanceCents==="0")).toBe(true);
    await expect(repository.settle(second.id,"TP-A",1031)).rejects.toMatchObject({code:"PAYMENT_REFERENCE_CONFLICT"});
  });
  it("recovers uncertain bills only after live-admin and independent transaction confirmation",async()=>{
    const p=(await repository.packages(adminId)).find(p=>p.status==="published")!;const b=randomUUID();await pool.query("INSERT INTO tuition_bookings VALUES($1,$2,$3,$4,'accepted')",[b,slotId,child,parent]);
    const invoice=(await repository.issue(parent,{bookingId:b,packageId:p.id,clientRequestId:randomUUID(),noRefundAttested:true,consentVersion:"tuition-payment-sandbox-v1"})).id;
    const confirm=vi.fn(async()=>false);const service=serviceWithCheckout(repository,async()=>({secret,client:{createBill:async()=>{throw Error("Timeout after bill creation");},confirmTransaction:confirm}}));
    await expect(service.checkout(parent,invoice)).rejects.toMatchObject({code:"CHECKOUT_REVIEW_REQUIRED"});const body={billCode:"recoveredbill",providerReference:"TP-RECOVER",reviewNote:"Synthetic provider transaction reviewed independently."};
    await expect(service.recoverConfirmedPayment(parent,invoice,body)).rejects.toMatchObject({code:"SUPER_ADMIN_ACCESS_REQUIRED"});expect(confirm).not.toHaveBeenCalled();
    await expect(service.recoverConfirmedPayment(adminId,invoice,body)).rejects.toMatchObject({code:"PAYMENT_NOT_CONFIRMED"});expect((await repository.invoice(parent,invoice)).billState).toBe("review");
    confirm.mockResolvedValue(true);await service.recoverConfirmedPayment(adminId,invoice,body);await service.recoverConfirmedPayment(adminId,invoice,body);expect(await repository.receipts(parent,invoice)).toHaveLength(1);expect((await repository.invoice(parent,invoice)).status).toBe("paid");
    expect(confirm).toHaveBeenCalledWith(body.billCode,invoice,body.providerReference,1031);expect((await pool.query("SELECT count(*)::int AS n FROM tuition_commerce_events WHERE entity_id=$1 AND event='sandbox_confirmed_bill_recovered'",[invoice])).rows[0].n).toBe(1);
  });
  it("blocks suspended-teacher checkout and holds already-arriving money",async()=>{
    const p=(await repository.packages(adminId)).find(p=>p.status==="published")!;const b=randomUUID();await pool.query("INSERT INTO tuition_bookings VALUES($1,$2,$3,$4,'accepted')",[b,slotId,child,parent]);const invoice=(await repository.issue(parent,{bookingId:b,packageId:p.id,clientRequestId:randomUUID(),noRefundAttested:true,consentVersion:"tuition-payment-sandbox-v1"})).id;
    await pool.query("UPDATE user_roles SET status='revoked' WHERE user_id=$1 AND role='teacher'",[teacher]);await expect(repository.claimCheckout(parent,invoice)).rejects.toMatchObject({code:"BOOKING_STATE_CONFLICT"});await repository.settle(invoice,"TP-SUSPENDED",1031);expect((await repository.receipts(parent,invoice))[0].holdReason).toBe("teacher_unavailable");await pool.query("UPDATE user_roles SET status='active' WHERE user_id=$1 AND role='teacher'",[teacher]);
  });
  it("preserves financial snapshots while child deletion removes booking links",async()=>{
    await pool.query("DELETE FROM students WHERE id=$1",[child]);expect((await repository.invoice(parent,invoiceId)).bookingId).toBeNull();expect(await repository.receipts(parent,invoiceId)).toHaveLength(2);
  });
});
