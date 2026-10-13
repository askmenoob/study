import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerTeacherNetworkRoutes } from "./teacherNetworkRoutes.js";

const studentId="11111111-1111-4111-8111-111111111111";
const classId="22222222-2222-4222-8222-222222222222";
const enrollmentId="33333333-3333-4333-8333-333333333333";
const applicationId="44444444-4444-4444-8444-444444444444";
const requestId="55555555-5555-4555-8555-555555555555";

function buildApi(){
  const app=Fastify();
  const previewClass=vi.fn(async()=>({class:{id:classId,name:"1 Bestari",teacherPublicName:"Cikgu Siti",schoolName:"SK Bestari",academicYear:2026,levelId:"d1",subjectId:"bm",status:"active"},student:{id:studentId,name:"Aina"}}));
  const requestJoin=vi.fn(async()=>({id:enrollmentId,studentId,studentName:"Aina",classId,className:"1 Bestari",teacherPublicName:"Cikgu Siti",teacherStatus:"active",schoolName:"SK Bestari",academicYear:2026,levelId:"d1",subjectId:"bm",status:"pending_teacher"}));
  const listTeacherClasses=vi.fn(async()=>[{id:classId,name:"1 Bestari",joinCode:"ABCD1234",codeHint:"1234"}]);
  const reviewApplication=vi.fn(async()=>({id:applicationId,status:"approved"}));
  const endEnrollment=vi.fn(async()=>undefined);
  const repository={previewClass,requestJoin,listTeacherClasses,reviewApplication,endEnrollment} as any;
  registerTeacherNetworkRoutes(app,repository,{
    auth:async(request:any)=>{request.user={sub:"parent",role:"parent"};},
    parentAuth:async(request:any)=>{request.user={sub:"parent",role:"parent"};},
    teacherAuth:async(request:any)=>{request.user={sub:"teacher",role:"teacher"};},
    superAdminAuth:async(request:any)=>{request.user={sub:"admin",role:"super_admin"};},
  });
  return {app,previewClass,requestJoin,listTeacherClasses,reviewApplication,endEnrollment};
}

describe("teacher network route contracts",()=>{
  it("requires and records explicit versioned parent consent with an idempotency key",async()=>{
    const {app,requestJoin}=buildApi();
    const url=`/api/students/${studentId}/teacher-connections`;
    expect((await app.inject({method:"POST",url,payload:{joinCode:"ABC12345"}})).statusCode).toBe(400);
    expect(requestJoin).not.toHaveBeenCalled();
    const response=await app.inject({method:"POST",url,payload:{joinCode:"ABC12345",consentAttested:true,consentVersion:"teacher-class-v1",clientRequestId:requestId}});
    expect(response.statusCode).toBe(201);
    expect(requestJoin).toHaveBeenCalledWith("parent",studentId,"ABC12345","teacher-class-v1",requestId,undefined);
    await app.close();
  });

  it("accepts exactly eight class-code characters and normalizes lowercase",async()=>{
    const {app,previewClass}=buildApi();const url=`/api/students/${studentId}/teacher-connections/preview`;
    for(const joinCode of ["EH61","ABC1234","ABC123456","ABCD-123"]){
      expect((await app.inject({method:"POST",url,payload:{joinCode}})).statusCode).toBe(400);
    }
    expect(previewClass).not.toHaveBeenCalled();
    expect((await app.inject({method:"POST",url,payload:{joinCode:"abcd1234"}})).statusCode).toBe(200);
    expect(previewClass).toHaveBeenCalledWith("parent",studentId,"ABCD1234");
    await app.close();
  });

  it("returns the full code only from the teacher-owned class list and forbids caching",async()=>{
    const {app,listTeacherClasses}=buildApi();
    const response=await app.inject({method:"GET",url:"/api/teacher/classes"});
    expect(response.statusCode).toBe(200);
    expect(response.json().classes[0]).toMatchObject({id:classId,joinCode:"ABCD1234"});
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.pragma).toBe("no-cache");
    expect(response.headers.vary).toBe("Authorization");
    expect(listTeacherClasses).toHaveBeenCalledWith("teacher");
    await app.close();
  });

  it("requires a verification note before super admin approval",async()=>{
    const {app,reviewApplication}=buildApi();
    const url=`/api/admin/teacher-applications/${applicationId}`;
    expect((await app.inject({method:"PATCH",url,payload:{decision:"approve",schoolDisplayName:"SK Bestari"}})).statusCode).toBe(400);
    expect(reviewApplication).not.toHaveBeenCalled();
    expect((await app.inject({method:"PATCH",url,payload:{decision:"approve",schoolDisplayName:"SK Bestari",reviewNote:"Identiti dan sekolah disemak melalui pentadbir sekolah."}})).statusCode).toBe(200);
    expect(reviewApplication).toHaveBeenCalledWith(applicationId,"admin","approve","Identiti dan sekolah disemak melalui pentadbir sekolah.","SK Bestari");
    await app.close();
  });

  it("binds a revoked connection to the student named in the nested route",async()=>{
    const {app,endEnrollment}=buildApi();
    const response=await app.inject({method:"DELETE",url:`/api/students/${studentId}/teacher-connections/${enrollmentId}`});
    expect(response.statusCode).toBe(204);
    expect(endEnrollment).toHaveBeenCalledWith("parent",studentId,enrollmentId);
    await app.close();
  });
});
