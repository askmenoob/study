import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TuitionBookingRepository } from "./tuitionBookingStore.js";
type Guard = (request:any)=>Promise<void>;
const id = z.string().uuid();
const params = z.object({ bookingId:id }).strict();
const slotInput = z.object({classId:id,startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),
  kind:z.enum(["individual","group"]),capacity:z.number().int().min(1).max(20),trial:z.boolean()}).strict();
const bookingInput=z.object({slotId:id,studentId:id,clientRequestId:id,consentVersion:z.literal("tuition-booking-v1"),consentAttested:z.literal(true),replacesBookingId:id.optional()}).strict();
export function registerTuitionBookingRoutes(app:FastifyInstance,repository:TuitionBookingRepository,
  guards:{auth:Guard,parentAuth:Guard,teacherAuth:Guard}) {
  app.addHook("onSend",async(request,reply,payload)=>{
    if(request.url.startsWith("/api/tuition/")||request.url.startsWith("/api/teacher/tuition/"))
      reply.header("Cache-Control","private, no-store").header("Vary","Authorization");
    return payload;
  });
  const run=async(request:any,reply:any,operation:()=>Promise<unknown>)=>{
    try{return await operation();}catch(error:any){
      if(error?.statusCode) return reply.code(error.statusCode).send({error:error.code});
      request.log.error({code:error?.code??"UNKNOWN"},"Tuition request failed"); return reply.code(500).send({error:"INTERNAL_ERROR"});
    }
  };
  app.get("/api/tuition/teachers/:teacherId/slots",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const input=z.object({teacherId:id}).strict().safeParse(request.params);
    if(!input.success||Object.keys(request.query).length) return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>({slots:await repository.listSlots(input.data.teacherId)}));
  });
  app.get("/api/teacher/tuition/slots",{preHandler:guards.teacherAuth},async(request:any,reply)=>
    run(request,reply,async()=>({slots:await repository.listSlots(request.user.sub,true)})));
  app.post("/api/teacher/tuition/slots",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const input=slotInput.safeParse(request.body);if(!input.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>{const slot=await repository.createSlot(request.user.sub,input.data);return reply.code(201).send({slot});});
  });
  app.delete("/api/teacher/tuition/slots/:slotId",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const p=z.object({slotId:id}).strict().safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>{await repository.closeSlot(request.user.sub,p.data.slotId);return reply.code(204).send();});
  });
  app.post("/api/tuition/bookings",{preHandler:guards.parentAuth},async(request:any,reply)=>{
    const input=bookingInput.safeParse(request.body);if(!input.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>{const booking=await repository.requestBooking(request.user.sub,input.data);return reply.code(201).send({booking});});
  });
  app.get("/api/tuition/bookings",{preHandler:guards.auth},async(request:any,reply)=>{
    const role=request.user.role;
    if(!["parent","teacher","student"].includes(role)) return reply.code(403).send({error:"ROLE_ACCESS_REQUIRED"});
    if(Object.keys(request.query).length) return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>({bookings:await repository.listBookings(request.user.sub,role,request.user.studentId)}));
  });
  app.patch("/api/teacher/tuition/bookings/:bookingId",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const p=params.safeParse(request.params),body=z.object({decision:z.enum(["accept","decline"])}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>({booking:await repository.decide(request.user.sub,p.data.bookingId,body.data.decision)}));
  });
  app.post("/api/tuition/bookings/:bookingId/cancel",{preHandler:guards.auth},async(request:any,reply)=>{
    const p=params.safeParse(request.params),body=z.object({}).strict().safeParse(request.body ?? {});
    if(!["parent","teacher"].includes(request.user.role))return reply.code(403).send({error:"ROLE_ACCESS_REQUIRED"});
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>({booking:await repository.cancel(request.user.sub,request.user.role,p.data.bookingId)}));
  });
  app.patch("/api/teacher/tuition/bookings/:bookingId/attendance",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const p=params.safeParse(request.params),body=z.object({attendance:z.enum(["present","absent","excused"])}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>({booking:await repository.attendance(request.user.sub,p.data.bookingId,body.data.attendance)}));
  });
  app.get("/api/tuition/notifications",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!["parent","teacher"].includes(request.user.role))return reply.code(403).send({error:"ROLE_ACCESS_REQUIRED"});
    return run(request,reply,async()=>({notifications:await repository.notifications(request.user.sub,request.user.role)}));
  });
  app.patch("/api/tuition/notifications/:notificationId",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!["parent","teacher"].includes(request.user.role))return reply.code(403).send({error:"ROLE_ACCESS_REQUIRED"});
    const p=z.object({notificationId:id}).strict().safeParse(request.params),body=z.object({read:z.literal(true)}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return run(request,reply,async()=>{await repository.readNotification(request.user.sub,request.user.role,p.data.notificationId);return reply.code(204).send();});
  });
}
