import type {FastifyInstance} from "fastify";
export function registerTuitionReadinessRoutes(app:FastifyInstance,read:((actor:string)=>Promise<unknown>),superAdminAuth:(request:any)=>Promise<void>){
 app.get("/api/admin/tuition/readiness",{preHandler:superAdminAuth},async(request:any,reply)=>{reply.header("Cache-Control","private, no-store").header("Vary","Authorization");if(Object.keys(request.query??{}).length)return reply.code(400).send({error:"INVALID_INPUT"});try{return await read(request.user.sub);}catch(error:any){if(error?.statusCode)return reply.code(error.statusCode).send({error:error.code});request.log.error({event:"tuition_readiness_error"},"Readiness check failed");return reply.code(500).send({error:"INTERNAL_ERROR"});}});
}
