import Fastify from "fastify";
import {describe,it,expect} from "vitest";
import {registerFreeStudyRoutes} from "./freeStudy.js";

describe("fully free Study programme",()=>{
 const make=()=>{const app=Fastify();const guard=async(request:any)=>{if(request.headers.authorization!=="synthetic-session")throw Object.assign(Error("Unauthorized"),{statusCode:401});};registerFreeStudyRoutes(app,{parentAuth:guard,teacherAuth:guard,superAdminAuth:guard});return app;};
 it("publishes unconditional free access independent of donations",async()=>{const app=make();try{const result=await app.inject({url:"/api/program"});expect(result.statusCode).toBe(200);expect(result.json()).toEqual({access:"free",commerceEnabled:false,donations:"voluntary",donationRequired:false});expect(result.headers["cache-control"]).toBe("no-store");}finally{await app.close();}});
 it.each([
  ["POST","/api/admin/tuition/packages"],["PATCH","/api/admin/tuition/packages/legacy"],
  ["POST","/api/tuition/invoices"],["POST","/api/tuition/invoices/legacy/checkout"],
  ["POST","/api/admin/tuition/invoices/legacy/recover"],["POST","/api/admin/tuition/payouts"],
  ["PATCH","/api/admin/tuition/payouts/legacy"],["GET","/api/teacher/tuition/statement"],
  ["GET","/api/admin/tuition/accounting.csv"],
 ] as const)("retires %s %s before processing caller data",async(method,url)=>{const app=make();try{expect((await app.inject({method,url})).statusCode).toBe(401);const result=await app.inject({method,url,headers:{authorization:"synthetic-session","content-type":"application/x-unknown"},payload:method==="GET"?undefined:"not a payable payload"});expect(result.statusCode).toBe(410);expect(result.json().error).toBe("STUDY_IS_FREE");expect(result.headers["cache-control"]).toBe("private, no-store");}finally{await app.close();}});
 it("publishes only approved privacy metadata and sanitizes storage failures",async()=>{const app=Fastify();let fail=false;const guard=async()=>{};registerFreeStudyRoutes(app,{parentAuth:guard,teacherAuth:guard,superAdminAuth:guard},async()=>{if(fail)throw Error("private storage details");return{retentionApproved:true,reviewCandidateDays:{tutor:90,support:365,kyc:365},automaticDeletion:false};});try{const response=await app.inject({url:"/api/privacy"});expect(response.statusCode).toBe(200);expect(response.headers["cache-control"]).toBe("no-store");expect(response.json().reviewCandidateDays.tutor).toBe(90);fail=true;const error=await app.inject({url:"/api/privacy"});expect(error.statusCode).toBe(503);expect(error.json()).toEqual({error:"PRIVACY_POLICY_UNAVAILABLE"});}finally{await app.close();}});
 it("rejects legacy gateway callbacks without parsing provider forms",async()=>{const app=make();try{const result=await app.inject({method:"POST",url:"/api/tuition/payments/toyyibpay/callback",headers:{"content-type":"application/x-www-form-urlencoded"},payload:"status=1&secret=ignored"});expect(result.statusCode).toBe(410);expect(result.json().error).toBe("STUDY_IS_FREE");}finally{await app.close();}});
});
