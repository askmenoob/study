import type {FastifyInstance} from "fastify";

// A source-level policy: environment variables cannot turn class payments on.
export const freeStudyPolicy={access:"free",commerceEnabled:false,donations:"voluntary",donationRequired:false} as const;
type Guard=(request:any)=>Promise<void>;
export function registerFreeStudyRoutes(app:FastifyInstance,guards:{parentAuth:Guard;teacherAuth:Guard;superAdminAuth:Guard},readPrivacy?:()=>Promise<unknown>){
 app.get("/api/program",async(_request,reply)=>{reply.header("Cache-Control","no-store");return freeStudyPolicy;});
 app.get("/api/privacy",async(request,reply)=>{reply.header("Cache-Control","no-store");try{return readPrivacy?await readPrivacy():{retentionApproved:false,automaticDeletion:false,reviewCandidateDays:{tutor:null,support:null,kyc:null}};}catch{request.log.error({event:"public_privacy_unavailable"},"Privacy policy unavailable");return reply.code(503).send({error:"PRIVACY_POLICY_UNAVAILABLE"});}});
 const retired:Array<{method:"GET"|"POST"|"PATCH";url:string;guard?:Guard}>=[
  {method:"GET",url:"/api/admin/tuition/packages",guard:guards.superAdminAuth},
  {method:"POST",url:"/api/admin/tuition/packages",guard:guards.superAdminAuth},
  {method:"PATCH",url:"/api/admin/tuition/packages/:id",guard:guards.superAdminAuth},
  {method:"GET",url:"/api/tuition/bookings/:id/packages",guard:guards.parentAuth},
  {method:"POST",url:"/api/tuition/invoices",guard:guards.parentAuth},
  {method:"GET",url:"/api/tuition/invoices",guard:guards.parentAuth},
  {method:"GET",url:"/api/tuition/invoices/:id/receipts",guard:guards.parentAuth},
  {method:"POST",url:"/api/tuition/invoices/:id/checkout",guard:guards.parentAuth},
  {method:"GET",url:"/api/admin/tuition/reconciliation",guard:guards.superAdminAuth},
  {method:"GET",url:"/api/admin/tuition/invoices",guard:guards.superAdminAuth},
  {method:"GET",url:"/api/admin/tuition/reconciliation.csv",guard:guards.superAdminAuth},
  {method:"POST",url:"/api/admin/tuition/invoices/:id/recover",guard:guards.superAdminAuth},
  {method:"POST",url:"/api/tuition/payments/toyyibpay/callback"},
  {method:"GET",url:"/api/teacher/tuition/statement",guard:guards.teacherAuth},
  {method:"GET",url:"/api/teacher/tuition/statement.csv",guard:guards.teacherAuth},
  {method:"GET",url:"/api/admin/tuition/payouts",guard:guards.superAdminAuth},
  {method:"POST",url:"/api/admin/tuition/payouts",guard:guards.superAdminAuth},
  {method:"PATCH",url:"/api/admin/tuition/payouts/:draftId",guard:guards.superAdminAuth},
  {method:"GET",url:"/api/admin/tuition/payouts/:draftId.csv",guard:guards.superAdminAuth},
  {method:"GET",url:"/api/admin/tuition/accounting.csv",guard:guards.superAdminAuth},
 ];
 for(const route of retired){
  const unavailable=async(_request:any,reply:any)=>reply.header("Cache-Control","private, no-store").header("Vary","Authorization").code(410).send({error:"STUDY_IS_FREE",message:"study.imai.my percuma sepenuhnya. Sumbangan adalah sukarela."});
  app.route({method:route.method,url:route.url,bodyLimit:4096,onRequest:async(request,reply)=>{if(route.guard)await route.guard(request);return unavailable(request,reply);},handler:unavailable});
 }
}
