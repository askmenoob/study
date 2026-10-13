import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerFeedbackTriageRoutes } from "./feedbackTriageRoutes.js";
import { FeedbackTriageError } from "./feedbackTriageStore.js";

const id="11111111-1111-4111-8111-111111111111";
function setup() {
  const app=Fastify({logger:false});
  const review={id,referenceId:`FB-${id}`,message:"Laporan masalah",createdAt:"2026-10-14T00:00:00Z",
    status:"in_review",version:1,note:"Semakan bermula",reviewedAt:"2026-10-14T00:00:00Z"};
  const repository={
    list:vi.fn(async()=>[review]),
    update:vi.fn(async(_id:string,_admin:string,_status:string,version:number)=>{
      if(version>0)throw new FeedbackTriageError("FEEDBACK_VERSION_CONFLICT",409);
      return review;
    }),
  } as any;
  registerFeedbackTriageRoutes(app,repository,async(request:any)=>{
    if(request.headers.authorization!=="Bearer admin")
      throw Object.assign(new Error("Forbidden"),{statusCode:403});
    request.user={sub:"admin",role:"super_admin"};
  });
  return {app,repository};
}
describe("super admin feedback triage",()=>{
  it("requires super admin and restricts filtering and caching",async()=>{
    const {app,repository}=setup();
    const url="/api/admin/feedback-triage";
    expect((await app.inject({method:"GET",url})).statusCode).toBe(403);
    expect((await app.inject({method:"GET",url:url+"?other=x",headers:{authorization:"Bearer admin"}})).statusCode).toBe(400);
    const result=await app.inject({method:"GET",url:url+"?status=in_review",headers:{authorization:"Bearer admin"}});
    expect(result.statusCode).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect(result.headers.vary).toBe("Authorization");
    expect(result.json().feedback[0].message).toBe("Laporan masalah");
    expect(repository.list).toHaveBeenCalledWith("in_review");
    await app.close();
  });
  it("validates required resolution note and prevents stale writes",async()=>{
    const {app,repository}=setup();
    const url=`/api/admin/feedback-triage/${id}`;
    const auth={authorization:"Bearer admin"};
    expect((await app.inject({method:"PATCH",url,payload:{status:"resolved",expectedVersion:0,note:"Semua selesai"}})).statusCode).toBe(403);
    expect((await app.inject({method:"PATCH",url,headers:auth,payload:{status:"resolved",expectedVersion:0}})).statusCode).toBe(400);
    expect((await app.inject({method:"PATCH",url,headers:auth,payload:{status:"open",expectedVersion:0,random:"bad"}})).statusCode).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
    const response=await app.inject({method:"PATCH",url,headers:auth,payload:{status:"resolved",expectedVersion:0,note:"Masalah disemak dan selesai"}});
    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(id,"admin","resolved",0,"Masalah disemak dan selesai");
    const conflict=await app.inject({method:"PATCH",url,headers:auth,payload:{status:"in_review",expectedVersion:1}});
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error).toBe("FEEDBACK_VERSION_CONFLICT");
    await app.close();
  });
});
