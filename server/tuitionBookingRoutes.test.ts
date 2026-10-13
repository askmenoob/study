import Fastify from "fastify";
import { describe,it,expect,vi } from "vitest";
import { registerTuitionBookingRoutes } from "./tuitionBookingRoutes.js";
const id="11111111-1111-4111-8111-111111111111";
function setup(role="parent") {
  const app=Fastify();const book=vi.fn(async()=>({id,status:"pending"}));
  const repository={requestBooking:book,listBookings:vi.fn(async()=>[]),listSlots:vi.fn(async()=>[]),createSlot:vi.fn(async()=>({id}))} as any;
  const auth=async(r:any)=>{if(role==="anonymous")throw Object.assign(Error("UNAUTHORIZED"),{statusCode:401});r.user={sub:id,role,studentId:id};};
  const guard=(required:string)=>async(r:any)=>{await auth(r);if(role!==required)throw Object.assign(Error("FORBIDDEN"),{statusCode:403});};
  registerTuitionBookingRoutes(app,repository,{auth,parentAuth:guard("parent"),teacherAuth:guard("teacher")});return{app,book,repository};
}
describe("tuition API authority and input contracts",()=>{
  it("rejects anonymous reads and student mutations",async()=>{
    for(const role of ["anonymous","student","teacher","super_admin"]) {
      const {app,book}=setup(role);const res=await app.inject({method:"POST",url:"/api/tuition/bookings",payload:{slotId:id,studentId:id,clientRequestId:id,consentVersion:"tuition-booking-v1",consentAttested:true}});
      expect(res.statusCode).toBe(role==="anonymous"?401:403);expect(book).not.toHaveBeenCalled();await app.close();
    }
  });
  it("requires explicit versioned consent and rejects mass assignment",async()=>{
    const {app,book}=setup();const body={slotId:id,studentId:id,clientRequestId:id,consentVersion:"tuition-booking-v1",consentAttested:true};
    for(const invalid of [{...body,consentAttested:false},{...body,status:"accepted"},{...body,consentVersion:"old"},{...body,studentId:"garbage"}]) expect((await app.inject({method:"POST",url:"/api/tuition/bookings",payload:invalid})).statusCode).toBe(400);
    expect(book).not.toHaveBeenCalled();const result=await app.inject({method:"POST",url:"/api/tuition/bookings",payload:body});expect(result.statusCode).toBe(201);expect(result.headers["cache-control"]).toBe("private, no-store");await app.close();
  });
  it("requires an explicit offset for time input",async()=>{
    const {app,repository}=setup("teacher");const payload={classId:id,startsAt:"2026-12-01T10:00:00",endsAt:"2026-12-01T11:00:00+08:00",kind:"individual",capacity:1,trial:false};
    expect((await app.inject({method:"POST",url:"/api/teacher/tuition/slots",payload})).statusCode).toBe(400);expect(repository.createSlot).not.toHaveBeenCalled();
    expect((await app.inject({method:"POST",url:"/api/teacher/tuition/slots",payload:{...payload,startsAt:"2026-12-01T10:00:00+08:00"}})).statusCode).toBe(201);await app.close();
  });
  it("never accepts a student's scope from a query parameter",async()=>{
    const {app,repository}=setup("student");expect((await app.inject({url:"/api/tuition/bookings?studentId=other"})).statusCode).toBe(400);
    expect(repository.listBookings).not.toHaveBeenCalled();expect((await app.inject({url:"/api/tuition/bookings"})).statusCode).toBe(200);
    expect(repository.listBookings).toHaveBeenCalledWith(id,"student",id);await app.close();
  });
  it("returns safe errors without database details",async()=>{
    const {app,repository}=setup();repository.listBookings.mockRejectedValueOnce(Error("secret connection details"));const response=await app.inject({url:"/api/tuition/bookings"});expect(response.statusCode).toBe(500);expect(response.json()).toEqual({error:"INTERNAL_ERROR"});await app.close();
  });
});
