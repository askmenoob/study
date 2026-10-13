import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TuitionLearningRepository } from "./tuitionLearningStore.js";
type Guard=(request:any)=>Promise<void>;
const id=z.string().uuid();
export function registerTuitionLearningRoutes(app:FastifyInstance,repository:TuitionLearningRepository,guards:{auth:Guard;teacherAuth:Guard}) {
  const run=async(request:any,reply:any,operation:()=>Promise<unknown>)=>{reply.header("Cache-Control","private, no-store").header("Vary","Authorization");try{return await operation();}catch(error:any){if(error?.statusCode)return reply.code(error.statusCode).send({error:error.code});request.log.error({code:error?.code??"UNKNOWN"},"Tuition learning failed");return reply.code(500).send({error:"INTERNAL_ERROR"});}};
  const family=(request:any,reply:any)=>{if(!["parent","student"].includes(request.user.role)){reply.code(403).send({error:"ROLE_ACCESS_REQUIRED"});return false;}if(request.user.role==="student"&&request.params.studentId!==request.user.studentId){reply.code(403).send({error:"STUDENT_SCOPE_REQUIRED"});return false;}return true;};
  app.post("/api/teacher/tuition/homework",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const body=z.object({classId:id,title:z.string().trim().min(3).max(120),instructions:z.string().trim().min(10).max(10000),rubric:z.string().trim().min(3).max(2000),dueAt:z.string().datetime({offset:true}),clientRequestId:id,privacyAttested:z.literal(true)}).strict().safeParse(request.body);
    if(!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>reply.code(201).send({homework:await repository.assign(request.user.sub,body.data)}));
  });
  app.get("/api/teacher/tuition/homework",{preHandler:guards.teacherAuth},async(request:any,reply)=>run(request,reply,async()=>({homework:await repository.listTeacher(request.user.sub)})));
  app.get("/api/tuition/students/:studentId/homework",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!family(request,reply))return;const p=z.object({studentId:id}).strict().safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({homework:await repository.listStudent(request.user.sub,p.data.studentId)}));
  });
  app.get("/api/tuition/students/:studentId/progress",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!family(request,reply))return;const p=z.object({studentId:id}).strict().safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({report:await repository.report(request.user.sub,p.data.studentId)}));
  });
  app.get("/api/tuition/students/:studentId/homework/:homeworkId/submission",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!family(request,reply))return;const p=z.object({studentId:id,homeworkId:id}).strict().safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({submission:await repository.ownSubmission(request.user.sub,p.data.studentId,p.data.homeworkId)}));
  });
  app.put("/api/tuition/students/:studentId/homework/:homeworkId/submission",{preHandler:guards.auth},async(request:any,reply)=>{
    if(!family(request,reply))return;if(request.user.role!=="student")return reply.code(403).send({error:"STUDENT_ACCESS_REQUIRED"});
    const p=z.object({studentId:id,homeworkId:id}).strict().safeParse(request.params),body=z.object({answer:z.string().trim().min(1).max(10000),expectedVersion:z.number().int().min(0)}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({submission:await repository.submit(request.user.sub,p.data.studentId,p.data.homeworkId,body.data.answer,body.data.expectedVersion)}));
  });
  app.get("/api/teacher/tuition/homework/:homeworkId/submissions",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const p=z.object({homeworkId:id}).strict().safeParse(request.params);if(!p.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({submissions:await repository.submissions(request.user.sub,p.data.homeworkId)}));
  });
  app.patch("/api/teacher/tuition/submissions/:submissionId",{preHandler:guards.teacherAuth},async(request:any,reply)=>{
    const p=z.object({submissionId:id}).strict().safeParse(request.params),body=z.object({score:z.number().int().min(0).max(100),feedback:z.string().trim().min(1).max(5000),expectedVersion:z.number().int().min(1)}).strict().safeParse(request.body);
    if(!p.success||!body.success)return reply.code(400).send({error:"INVALID_INPUT"});return run(request,reply,async()=>({submission:await repository.review(request.user.sub,p.data.submissionId,body.data.score,body.data.feedback,body.data.expectedVersion)}));
  });
}
