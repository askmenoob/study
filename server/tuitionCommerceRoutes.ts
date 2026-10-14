import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TuitionCommerceRepository,tuitionPackageInput,tuitionInvoiceInput } from "./tuitionCommerce.js";
import { TuitionPaymentService } from "./tuitionPaymentService.js";
export function registerTuitionCommerceRoutes(app:FastifyInstance,repository:TuitionCommerceRepository,payments:TuitionPaymentService,guards:{parentAuth:(request:any)=>Promise<void>;superAdminAuth:(request:any)=>Promise<void>}){
  const id=z.object({id:z.string().uuid()}).strict();
  async function call(request:any,reply:any,operation:()=>Promise<unknown>){reply.header("Cache-Control","private, no-store").header("Vary","Authorization");try{return await operation();}catch(error:any){if(error?.statusCode)return reply.code(error.statusCode).send({error:error.code});request.log.error({event:"tuition_commerce_error"},"Tuition commerce request failed");return reply.code(500).send({error:"INTERNAL_ERROR"});}}
  app.get("/api/admin/tuition/packages",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    if(Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>{const [packages,classes]=await Promise.all([repository.packages(request.user.sub),repository.classes(request.user.sub)]);return{packages,classes,mode:"sandbox"};});
  });
  app.post("/api/admin/tuition/packages",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    const body=tuitionPackageInput.safeParse(request.body);if(!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({package:await repository.createPackage(request.user.sub,body.data)}));
  });
  app.patch("/api/admin/tuition/packages/:id",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    const p=id.safeParse(request.params),body=z.object({expectedVersion:z.number().int().min(1),status:z.enum(["published","archived"]),ratesApproved:z.literal(true)}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({package:await repository.packageStatus(request.user.sub,p.data.id,body.data.expectedVersion,body.data.status)}));
  });
  app.get("/api/tuition/bookings/:id/packages",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const p=id.safeParse(request.params);if(!p.success||Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({packages:await repository.options(request.user.sub,p.data.id),mode:"sandbox"}));
  });
  app.post("/api/tuition/invoices",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const body=tuitionInvoiceInput.safeParse(request.body);if(!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({invoice:await repository.issue(request.user.sub,body.data)}));
  });
  app.get("/api/tuition/invoices",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const query=z.object({studentId:z.string().uuid().optional()}).strict().safeParse(request.query);if(!query.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({invoices:await repository.invoices(request.user.sub,"parent",query.data.studentId),mode:"sandbox"}));
  });
  app.get("/api/tuition/invoices/:id/receipts",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const p=id.safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({receipts:await repository.receipts(request.user.sub,p.data.id),mode:"sandbox"}));
  });
  app.post("/api/tuition/invoices/:id/checkout",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const p=id.safeParse(request.params),body=z.object({sandboxAttested:z.literal(true)}).strict().safeParse(request.body);if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,()=>payments.checkout(request.user.sub,p.data.id));
  });
  app.get("/api/admin/tuition/reconciliation",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{
    if(Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({transactions:await repository.reconciliation(request.user.sub),mode:"sandbox"}));
  });
  app.get("/api/admin/tuition/invoices",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{if(Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>({invoices:await repository.invoices(request.user.sub,"super_admin"),mode:"sandbox"}));});
  app.get("/api/admin/tuition/reconciliation.csv",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{if(Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,async()=>{const rows=await repository.reconciliation(request.user.sub);const cell=(value:unknown)=>{let text=String(value??"");if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};const lines=[["mode","payment_id","invoice_id","provider_reference","amount_myr","hold_reason","ledger_imbalance_cents","recorded_at"],...rows.map(row=>[row.mode,row.id,row.invoiceId,row.providerReference,(row.amountCents/100).toFixed(2),row.holdReason??"",row.imbalanceCents,new Date(row.createdAt).toISOString()])];reply.type("text/csv; charset=utf-8").header("Content-Disposition",'attachment; filename="tuition-sandbox-reconciliation.csv"');return lines.map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";});});
  app.post("/api/admin/tuition/invoices/:id/recover",{preHandler:guards.superAdminAuth},async(request:any,reply)=>{const p=id.safeParse(request.params),body=z.object({billCode:z.string().max(32),providerReference:z.string().max(64),reviewNote:z.string().trim().min(10).max(1000),providerEvidenceReviewed:z.literal(true)}).strict().safeParse(request.body);if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return call(request,reply,()=>payments.recoverConfirmedPayment(request.user.sub,p.data.id,{billCode:body.data.billCode,providerReference:body.data.providerReference,reviewNote:body.data.reviewNote}));});
  // Decode only bounded flat callback forms, rejecting repeated keys rather than picking one.
  if(!app.hasContentTypeParser("application/x-www-form-urlencoded"))app.addContentTypeParser("application/x-www-form-urlencoded",{parseAs:"string",bodyLimit:4096},(_request,body,done)=>{
    const values=new URLSearchParams(String(body)),record:Record<string,string>={};for(const [key,value]of values){if(Object.hasOwn(record,key)||["__proto__","constructor","prototype"].includes(key)){done(Object.assign(Error("INVALID_INPUT"),{statusCode:400}));return;}record[key]=value;}done(null,record);
  });
  app.post("/api/tuition/payments/toyyibpay/callback",{bodyLimit:4096},async(request:any,reply)=>call(request,reply,()=>payments.callback(request.body)));
}
