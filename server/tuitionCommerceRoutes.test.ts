import Fastify from "fastify";
import { describe,it,expect,vi } from "vitest";
import { registerTuitionCommerceRoutes } from "./tuitionCommerceRoutes.js";
const id="11111111-1111-4111-8111-111111111111";
function setup(role="parent"){
 const app=Fastify(),repository={createPackage:vi.fn(async()=>({id})),packages:vi.fn(async()=>[]),classes:vi.fn(async()=>[]),packageStatus:vi.fn(async()=>({id})),options:vi.fn(async()=>[]),issue:vi.fn(async()=>({id})),invoices:vi.fn(async()=>[]),receipts:vi.fn(async()=>[]),reconciliation:vi.fn(async()=>[])};
 const payments={checkout:vi.fn(async()=>({mode:"sandbox",paymentUrl:"https://dev.toyyibpay.com/test"})),callback:vi.fn(async()=>({acknowledged:true,settled:false}))};
 const guard=(required:string)=>async(request:any)=>{if(role==="anonymous")throw Object.assign(Error("UNAUTHORIZED"),{statusCode:401});if(role!==required)throw Object.assign(Error("FORBIDDEN"),{statusCode:403});request.user={sub:id};};
 registerTuitionCommerceRoutes(app,repository as any,payments as any,{parentAuth:guard("parent"),superAdminAuth:guard("super_admin")});return{app,repository,payments};
}
describe("tuition commerce HTTP boundaries",()=>{
 it("exports only admin reconciliation and neutralizes spreadsheet formulas",async()=>{
  const {app,repository}=setup("super_admin");repository.reconciliation.mockResolvedValueOnce([{mode:"sandbox",id,invoiceId:id,providerReference:'=HYPERLINK("https://example.invalid")',amountCents:1031,holdReason:null,imbalanceCents:0,createdAt:"2026-10-14T00:00:00.000Z"}] as any);
  const result=await app.inject({url:"/api/admin/tuition/reconciliation.csv"});expect(result.statusCode).toBe(200);expect(result.headers["content-type"]).toContain("text/csv");expect(result.headers["cache-control"]).toBe("private, no-store");expect(result.body).toContain('"\'=HYPERLINK(""https://example.invalid"")"');expect(result.body).toContain('"10.31"');await app.close();
  const parent=setup();expect((await parent.app.inject({url:"/api/admin/tuition/reconciliation.csv"})).statusCode).toBe(403);expect(parent.repository.reconciliation).not.toHaveBeenCalled();await parent.app.close();
 });
 it("denies student/teacher/admin invoice mutations and non-admin rates",async()=>{
  for(const role of ["anonymous","student","teacher","super_admin"]){const {app,repository}=setup(role);expect((await app.inject({method:"POST",url:"/api/tuition/invoices",payload:{bookingId:id,packageId:id,clientRequestId:id,noRefundAttested:true,consentVersion:"tuition-payment-sandbox-v1"}})).statusCode).toBe(role==="anonymous"?401:403);expect(repository.issue).not.toHaveBeenCalled();await app.close();}
  const {app,repository}=setup();expect((await app.inject({url:"/api/admin/tuition/reconciliation"})).statusCode).toBe(403);expect(repository.reconciliation).not.toHaveBeenCalled();await app.close();
 });
 it("rejects invented amounts, missing no-refund/sandbox consent and invalid rates",async()=>{
  const {app,repository,payments}=setup();const invoice={bookingId:id,packageId:id,clientRequestId:id,noRefundAttested:true,consentVersion:"tuition-payment-sandbox-v1"};
  for(const payload of [{...invoice,totalCents:1},{...invoice,noRefundAttested:false},{...invoice,consentVersion:"live"}])expect((await app.inject({method:"POST",url:"/api/tuition/invoices",payload})).statusCode).toBe(400);
  expect((await app.inject({method:"POST",url:`/api/tuition/invoices/${id}/checkout`,payload:{sandboxAttested:false}})).statusCode).toBe(400);expect(repository.issue).not.toHaveBeenCalled();expect(payments.checkout).not.toHaveBeenCalled();await app.close();
  const admin=setup("super_admin");expect((await admin.app.inject({method:"PATCH",url:`/api/admin/tuition/packages/${id}`,payload:{status:"published",expectedVersion:1,ratesApproved:false}})).statusCode).toBe(400);expect(admin.repository.packageStatus).not.toHaveBeenCalled();await admin.app.close();
 });
 it("decodes bounded provider forms, rejects duplicated/prototype keys and sanitizes errors",async()=>{
  const {app,payments}=setup("anonymous");const form="status=1&order_id="+id+"&refno=TP-A&hash="+"a".repeat(32)+"&billcode=test&amount=10.00";
  const result=await app.inject({method:"POST",url:"/api/tuition/payments/toyyibpay/callback",headers:{"content-type":"application/x-www-form-urlencoded"},payload:form});expect(result.statusCode).toBe(200);expect(payments.callback).toHaveBeenCalledWith({status:"1",order_id:id,refno:"TP-A",hash:"a".repeat(32),billcode:"test",amount:"10.00"});expect(result.headers["cache-control"]).toBe("private, no-store");
  for(const bad of [form+"&status=3",form+"&__proto__=bad",form+"&constructor=bad"])expect((await app.inject({method:"POST",url:"/api/tuition/payments/toyyibpay/callback",headers:{"content-type":"application/x-www-form-urlencoded"},payload:bad})).statusCode).toBe(400);
  expect((await app.inject({method:"POST",url:"/api/tuition/payments/toyyibpay/callback",headers:{"content-type":"application/x-www-form-urlencoded"},payload:"x="+"a".repeat(5000)})).statusCode).toBe(413);
  payments.callback.mockRejectedValueOnce(Error("secret provider and database details"));const failed=await app.inject({method:"POST",url:"/api/tuition/payments/toyyibpay/callback",payload:{}});expect(failed.statusCode).toBe(500);expect(failed.json()).toEqual({error:"INTERNAL_ERROR"});await app.close();
 });
});
