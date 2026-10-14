import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TeacherKycRepository,teacherKycInput } from "./teacherKyc.js";
export function registerTeacherKycRoutes(app:FastifyInstance,repository:TeacherKycRepository,superAdminAuth:(request:any)=>Promise<void>){
  const params=z.object({id:z.string().uuid()}).strict();
  const options={preHandler:superAdminAuth};
  async function call(request:any,reply:any,operation:()=>Promise<unknown>){
    reply.header("Cache-Control","private, no-store").header("Vary","Authorization");
    try{return{review:await operation()};}catch(error:any){
      if(error?.statusCode)return reply.code(error.statusCode).send({error:error.code});
      request.log.error({event:"teacher_kyc_error"},"Teacher evidence review failed");return reply.code(500).send({error:"INTERNAL_ERROR"});
    }
  }
  app.get("/api/admin/teacher-applications/:id/kyc",options,async(request:any,reply)=>{
    const p=params.safeParse(request.params);if(!p.success||Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});
    return call(request,reply,()=>repository.read(request.user.sub,p.data.id));
  });
  app.post("/api/admin/teacher-applications/:id/kyc",options,async(request:any,reply)=>{
    const p=params.safeParse(request.params),body=teacherKycInput.safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});
    return call(request,reply,()=>repository.record(request.user.sub,p.data.id,body.data));
  });
}
