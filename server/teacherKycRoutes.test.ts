import Fastify from "fastify";
import { describe,it,expect,vi } from "vitest";
import { registerTeacherKycRoutes } from "./teacherKycRoutes.js";
const id="11111111-1111-4111-8111-111111111111";
const payload={expectedVersion:0,applicationFingerprint:"a".repeat(64),clientRequestId:id,decision:"reviewed",caseReference:"CASE-QA-ALPHA",note:"Synthetic evidence verified via approved review channel.",identityChecked:true,scopeChecked:true,safetyChecked:true};
function setup(role="super_admin"){
  const app=Fastify();const repository={read:vi.fn(async()=>({version:0})),record:vi.fn(async()=>({version:1}))};
  registerTeacherKycRoutes(app,repository as any,async(request:any)=>{if(role==="anonymous")throw Object.assign(Error("UNAUTHORIZED"),{statusCode:401});if(role!=="super_admin")throw Object.assign(Error("FORBIDDEN"),{statusCode:403});request.user={sub:id};});
  return{app,repository};
}
describe("teacher evidence API boundaries",()=>{
  it("denies every non-admin role before touching evidence",async()=>{
    for(const role of ["anonymous","parent","teacher","student"]){const {app,repository}=setup(role);
      for(const method of ["GET","POST"] as const)expect((await app.inject({method,url:`/api/admin/teacher-applications/${id}/kyc`,...(method==="POST"?{payload}:{})})).statusCode).toBe(role==="anonymous"?401:403);
      expect(repository.read).not.toHaveBeenCalled();expect(repository.record).not.toHaveBeenCalled();await app.close();}
  });
  it("rejects mass assignment, missing checks, raw contact data and query scope",async()=>{
    const {app,repository}=setup();for(const body of [{...payload,reviewerId:id},{...payload,expectedVersion:-1},{...payload,identityChecked:false},{...payload,note:"private@example.invalid is the evidence."},{...payload,caseReference:"CASE-123456789012"}])
      expect((await app.inject({method:"POST",url:`/api/admin/teacher-applications/${id}/kyc`,payload:body})).statusCode).toBe(400);
    expect((await app.inject({url:`/api/admin/teacher-applications/${id}/kyc?scope=public`})).statusCode).toBe(400);
    expect(repository.record).not.toHaveBeenCalled();await app.close();
  });
  it("returns private no-store responses and safe conflicts",async()=>{
    const {app,repository}=setup();const result=await app.inject({method:"POST",url:`/api/admin/teacher-applications/${id}/kyc`,payload});
    expect(result.statusCode).toBe(200);expect(result.headers["cache-control"]).toBe("private, no-store");expect(result.headers.vary).toBe("Authorization");expect(repository.record).toHaveBeenCalledWith(id,id,payload);
    repository.read.mockRejectedValueOnce(Object.assign(Error("Private database details"),{statusCode:409,code:"APPLICATION_CHANGED"}));
    expect((await app.inject({url:`/api/admin/teacher-applications/${id}/kyc`})).json()).toEqual({error:"APPLICATION_CHANGED"});
    repository.read.mockRejectedValueOnce(Error("Secret connection and document data"));
    const failure=await app.inject({url:`/api/admin/teacher-applications/${id}/kyc`});expect(failure.statusCode).toBe(500);expect(failure.json()).toEqual({error:"INTERNAL_ERROR"});await app.close();
  });
});
