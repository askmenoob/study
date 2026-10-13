import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { registerChallengeRoutes } from "./challengeRoutes.js";
import { migrateChallenges } from "./challengeStore.js";
import { assertSession, type FamilySession } from "./familyAccess.js";
import { enforceFocusSession } from "./focusSessions.js";
import type { ChallengeGenerator, ChallengeSession } from "./challengeContracts.js";
const databaseUrl = process.env.CHALLENGE_TEST_DATABASE_URL;
const subjects = [{levelId:"d1",levelName:"Darjah 1",subjectId:"math",subjectName:"Matematik"},{levelId:"d2",levelName:"Darjah 2",subjectId:"math",subjectName:"Matematik"}];
const fixture: ChallengeGenerator = async input => ({questions:Array.from({length:40},(_,i)=>({id:`q${i}`,fingerprint:`fp${i}`,conceptId:"add",topicId:"number",topicName:"Nombor",prompt:`${i}+1?`,options:[String(i+1),String(i+2),String(i+3),String(i+4)],answer:0,explanation:"PRIVATE_EXPLANATION",hint:"PRIVATE_HINT",difficulty:1,source:"bank",phase:"current",repeat:input.history.some(h=>h.fingerprint===`fp${i}`)})),notices:[]});
describe.skipIf(!databaseUrl)("challenge API in disposable PostgreSQL",()=>{
  let admin:Pool,pool:Pool,app:FastifyInstance;
  const apps:FastifyInstance[]=[], schema=`challenge_qa_${randomUUID().replaceAll("-","")}`;
  const parentId=randomUUID(),foreignId=randomUUID(),parent:FamilySession={sub:parentId,role:"parent"};
  async function makeApp(generator=fixture,clock?:()=>number) {
    const instance=Fastify(); await instance.register(jwt,{secret:randomUUID()+randomUUID()});
    const auth=async(req:any)=>{await req.jwtVerify(); assertSession(req.user); await enforceFocusSession(pool,req.user);};
    instance.setErrorHandler((error:any,_req,reply)=>reply.code(error.statusCode??500).send({error:error.code??"SERVER_ERROR"}));
    registerChallengeRoutes(instance,pool,auth,{generator,subjects,clock}); await instance.ready(); apps.push(instance); return instance;
  }
  async function student(level="d1",owner=parentId) {const id=randomUUID();await pool.query("INSERT INTO students(id,parent_id,level_id) VALUES($1,$2,$3)",[id,owner,level]);return id;}
  async function request(method:"GET"|"POST",url:string,payload?:unknown,user:FamilySession|null=parent,instance=app) {
    return instance.inject({method,url,...(payload===undefined?{}:{payload:payload as any}),headers:user?{authorization:`Bearer ${instance.jwt.sign(user)}`}:{}});
  }
  const input=(studentId:string)=>({studentId,subjectId:"math",requestId:randomUUID()});
  async function create(id:string,instance=app) {const r=await request("POST","/api/challenges",input(id),parent,instance);expect(r.statusCode,r.body).toBe(201);return r.json().session as ChallengeSession;}
  async function finish(session:ChallengeSession,correct=40,instance=app) {
    let s=session; for(let i=0;i<s.total;i++) {const r=await request("POST",`/api/challenges/${s.id}/answer`,{expectedRevision:s.revision,index:i,selected:i<correct?0:1,requestId:randomUUID()},parent,instance);expect(r.statusCode,r.body).toBe(200);s=r.json().session;} return s;
  }
  beforeAll(async()=>{
    const url=new URL(databaseUrl!);
    if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||!/^\/(challenge_qa|exam_qa)/.test(url.pathname))throw new Error("Disposable loopback challenge_qa/exam_qa database required");
    admin=new Pool({connectionString:databaseUrl});await admin.query(`CREATE SCHEMA ${schema}`);
    pool=new Pool({connectionString:databaseUrl,max:12,options:`-c search_path=${schema}`});
    await pool.query("CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE students(id uuid PRIMARY KEY,parent_id uuid REFERENCES users(id),level_id text NOT NULL); CREATE TABLE focus_sessions(id uuid PRIMARY KEY,student_id uuid REFERENCES students(id),status text NOT NULL,ends_at timestamptz NOT NULL);");
    await pool.query("INSERT INTO users(id) VALUES($1),($2)",[parentId,foreignId]);await migrateChallenges(pool);await migrateChallenges(pool);app=await makeApp();
  },20000);
  afterAll(async()=>{await Promise.all(apps.map(a=>a.close()));if(pool)await pool.end();if(admin){await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}});
  it("requires auth, ownership, student scope and stored grade while hiding answers",async()=>{
    const own=await student(),sibling=await student(),foreign=await student("d1",foreignId),unsupported=await student("d9");
    expect((await request("GET",`/api/challenges?studentId=${own}`,undefined,null)).statusCode).toBe(401);
    expect((await request("GET",`/api/challenges?studentId=${foreign}`)).statusCode).toBe(404);
    const kid:FamilySession={...parent,role:"student",studentId:own};
    expect((await request("GET",`/api/challenges?studentId=${sibling}`,undefined,kid)).statusCode).toBe(403);
    expect((await request("POST","/api/challenges",input(unsupported))).statusCode).toBe(404);
    const s=await create(own);expect(JSON.stringify(s)).not.toMatch(/PRIVATE_|fingerprint|"answer"/);
    expect((await request("GET",`/api/challenges/${s.id}`,undefined,{sub:foreignId,role:"parent"})).statusCode).toBe(404);
    expect((await request("GET",`/api/challenges/${s.id}`,undefined,{...kid,studentId:sibling})).statusCode).toBe(403);
    expect((await request("GET",`/api/challenges/report?studentId=${own}`,undefined,kid)).statusCode).toBe(403);
    await pool.query("UPDATE students SET level_id='d2' WHERE id=$1",[own]);
    expect((await request("GET",`/api/challenges/${s.id}`)).json().error).toBe("CHALLENGE_LEVEL_CHANGED");
    expect((await request("POST",`/api/challenges/${s.id}/answer`,{expectedRevision:0,index:0,selected:0,requestId:randomUUID()})).statusCode).toBe(409);
    expect((await create(own)).levelId).toBe("d2");
  });
  it("creates and resumes one session across workers and persists every request key",async()=>{
    const id=await student(),body=input(id),second=await makeApp();
    const race=await Promise.all([request("POST","/api/challenges",body),request("POST","/api/challenges",body,parent,second),request("POST","/api/challenges",input(id),parent,second)]);
    expect(race.map(r=>r.statusCode)).toEqual([201,201,201]);expect(new Set(race.map(r=>r.json().session.id)).size).toBe(1);
    expect((await pool.query("SELECT count(*) FROM challenge_sessions WHERE student_id=$1",[id])).rows[0].count).toBe("1");
    const s=race[0].json().session;
    expect((await request("GET",`/api/challenges/${s.id}`,undefined,parent,second)).json().session).toEqual(s);
    await finish(s);
    expect((await request("POST","/api/challenges",body)).json().session.id).toBe(s.id);
    expect((await create(id)).stage).toBe(2);
  });
  it("locks first answers, rejects stale races and makes hint/answer replay exact",async()=>{
    const s=await create(await student()),url=`/api/challenges/${s.id}`,second=await makeApp();
    const hint={expectedRevision:0,index:0,requestId:randomUUID()},first=await request("POST",`${url}/hint`,hint);
    expect(first.json().session).toMatchObject({revision:1,hintCount:1});expect(first.body).not.toContain("PRIVATE_EXPLANATION");
    expect((await request("POST",`${url}/hint`,hint,parent,second)).json()).toEqual(first.json());
    const answer={expectedRevision:1,index:0,selected:0,requestId:randomUUID()};
    const race=await Promise.all([request("POST",`${url}/answer`,answer),request("POST",`${url}/answer`,{...answer,index:1,requestId:randomUUID()},parent,second)]);
    expect(race.map(r=>r.statusCode).sort()).toEqual([200,409]);
    const won=race.find(r=>r.statusCode===200)!.json().session as ChallengeSession;
    const answeredIndex=won.questions.findIndex(q=>q.feedback);
    const locked=await request("POST",`${url}/answer`,{expectedRevision:won.revision,index:answeredIndex,selected:1,requestId:randomUUID()});expect(locked.json().error).toBe("ANSWER_LOCKED");
    const later=await request("POST",`${url}/hint`,{expectedRevision:won.revision,index:2,requestId:randomUUID()});expect(later.statusCode).toBe(200);
    expect((await request("POST",`${url}/hint`,hint)).json()).toEqual(first.json());
    expect((await request("POST",`${url}/hint`,{...hint,index:3})).json().error).toBe("REQUEST_KEY_CONFLICT");
    expect((await pool.query("SELECT sum(answered) AS n FROM challenge_history WHERE student_id=$1",[s.studentId])).rows[0].n).toBe("1");
  });
  it("grades completion, keeps failed stages remedial and prevents reward farming",async()=>{
    const id=await student(),first=await finish(await create(id),31);
    expect(first.result).toMatchObject({passed:false,nextStage:1,rankingPoints:310});
    const second=await finish(await create(id),40);expect(second.stage).toBe(1);expect(second.result).toMatchObject({passed:true,nextStage:2,rankingPoints:45});
    const third=await finish(await create(id));expect(third.stage).toBe(2);expect(third.result!.rankingPoints).toBe(0);
    const report=(await request("GET",`/api/challenges/report?studentId=${id}`)).json();expect(report).toMatchObject({completedSessions:3,answered:120,correct:111});
    expect(report.subjects[0].topics[0]).toMatchObject({answered:120,correct:111,repeatedErrors:0});
  });
  it("completes a shorter fallback at its actual total and preserves teaching-resource lineage",async()=>{
    const short:ChallengeGenerator=async input=>{const generated=await fixture(input);return {questions:generated.questions.slice(0,5).map(q=>({...q,resourceIds:["d1-math-reading-01"]})),notices:["Sesi ringkas: 5 soalan daripada bahan tersedia."]};};
    const instance=await makeApp(short),id=await student(),s=await create(id,instance);
    expect(s.total).toBe(5);expect(s.questions).toHaveLength(5);expect(s.notices).toHaveLength(1);
    expect(s.questions[0].resourceIds).toEqual(["d1-math-reading-01"]);expect(JSON.stringify(s)).not.toMatch(/PRIVATE_EXPLANATION|"answer"/);
    const completed=await finish(s,4,instance);
    expect(completed).toMatchObject({status:"completed",answeredCount:5,total:5,result:{accuracy:80,passed:true,nextStage:2}});
    expect((await create(id,instance)).stage).toBe(2);
    const report=(await request("GET",`/api/challenges/report?studentId=${id}`,undefined,parent,instance)).json();
    expect(report.recentSessions[0]).toMatchObject({total:5,correct:4,passed:true});
  });
  it("rejects malformed inputs and invalid generator results without persisting",async()=>{
    const id=await student();for(const extra of [{stage:99},{levelId:"d9"},{score:999}])expect((await request("POST","/api/challenges",{...input(id),...extra})).statusCode).toBe(400);
    const s=await create(id);
    expect((await request("POST",`/api/challenges/${s.id}/answer`,{expectedRevision:0,index:39,selected:0,requestId:randomUUID()})).json().error).toBe("INDEX_OUT_OF_ORDER");
    for(const changes of [{index:40},{selected:-1},{score:99},{expectedRevision:0.5}])expect((await request("POST",`/api/challenges/${s.id}/answer`,{expectedRevision:0,index:0,selected:0,requestId:randomUUID(),...changes})).statusCode).toBe(400);
    const bad=await makeApp(async input=>{const result=await fixture(input);result.questions[1].fingerprint=result.questions[0].fingerprint;return result;});
    const badId=await student();expect((await request("POST","/api/challenges",input(badId),parent,bad)).statusCode).toBe(503);
    expect((await pool.query("SELECT count(*) FROM challenge_sessions WHERE student_id=$1",[badId])).rows[0].count).toBe("0");
  });
  it("rechecks grade after generation without holding a transaction during generation",async()=>{
    const id=await student();let calls=0;
    const generator:ChallengeGenerator=async generation=>{calls++;if(calls===1)await pool.query("UPDATE students SET level_id='d2' WHERE id=$1",[id]);return fixture(generation);};
    const instance=await makeApp(generator),s=await create(id,instance);expect(s.levelId).toBe("d2");expect(calls).toBe(2);
  });
  it("uses best three sessions per Malaysia day, excludes other levels and reveals only aliases",async()=>{
    let now=Date.parse("2025-09-07T16:00:00Z"),serial=0;
    const unique:ChallengeGenerator=async input=>{const s=await fixture(input);const prefix=++serial;s.questions=s.questions.map(q=>({...q,fingerprint:`unique${prefix}-${q.fingerprint}`}));return s;};
    const instance=await makeApp(unique,()=>now),id=await student(),other=await student("d2");
    for(const score of [10,20,30,40])await finish(await create(id,instance),score,instance);
    await finish(await create(other,instance),40,instance);
    let ranking=(await request("GET",`/api/challenges/ranking?studentId=${id}&subjectId=math`,undefined,parent,instance)).json();
    expect(ranking.yourPoints).toBe(900);expect(ranking.rows).toHaveLength(1);expect(ranking.rows[0]).toMatchObject({points:900,sessions:3,isYou:true});
    expect(JSON.stringify(ranking)).not.toContain(id);expect(JSON.stringify(ranking)).not.toContain(parentId);
    now=Date.parse("2025-09-08T15:59:59Z");await finish(await create(id,instance),40,instance);
    ranking=(await request("GET",`/api/challenges/ranking?studentId=${id}&subjectId=math`,undefined,parent,instance)).json();expect(ranking.yourPoints).toBe(1100);
    now=Date.parse("2025-09-08T16:00:00Z");await finish(await create(id,instance),40,instance);
    ranking=(await request("GET",`/api/challenges/ranking?studentId=${id}&subjectId=math`,undefined,parent,instance)).json();expect(ranking.yourPoints).toBe(1500);
    now=Date.parse("2025-09-14T16:00:00Z");ranking=(await request("GET",`/api/challenges/ranking?studentId=${id}&subjectId=math`,undefined,parent,instance)).json();expect(ranking.yourPoints).toBe(0);
  },20000);
  it("enforces focus expiry and preserves immutable snapshots with cascade deletion",async()=>{
    const id=await student(),s=await create(id),focus=randomUUID();
    await pool.query("INSERT INTO focus_sessions(id,student_id,status,ends_at) VALUES($1,$2,'active',now()-interval '1 second')",[focus,id]);
    const kid:FamilySession={...parent,role:"student",studentId:id,focusSessionId:focus};
    expect((await request("GET",`/api/challenges/${s.id}`,undefined,kid)).json().error).toBe("SESSION_ENDED");
    expect((await request("POST",`/api/challenges/${s.id}/hint`,{expectedRevision:0,index:0,requestId:randomUUID()},kid)).json().error).toBe("SESSION_ENDED");
    await expect(pool.query("UPDATE challenge_sessions SET snapshot='{}'::jsonb WHERE id=$1",[s.id])).rejects.toThrow("IMMUTABLE_CHALLENGE_SNAPSHOT");
    await pool.query("DELETE FROM focus_sessions WHERE student_id=$1",[id]);await pool.query("DELETE FROM students WHERE id=$1",[id]);
    expect((await pool.query("SELECT count(*) FROM challenge_requests WHERE student_id=$1",[id])).rows[0].count).toBe("0");
  });
});
