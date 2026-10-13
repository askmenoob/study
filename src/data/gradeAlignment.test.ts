import { expect, it, vi } from "vitest";
import { getArchivedTopics, getSubjectsForLevel, getTopics, levels } from "./curriculum";
import { resources, archivedResources, findLearningResources } from "./resources";
import { practicePool } from "../lib/practice";
import { libraryResources, libraryUnits } from "../../server/library/catalog";
import { earlyFrames } from "../../server/library/earlyLearning";
import { learningPolicy } from "../../server/library/learningPolicy";
import { createChallengeGenerator } from "../../server/challengeGenerator";

it("publishes linked units for all 102 grade/subject pairs without shared cross-grade questions",()=>{
  const seen=new Map<string,string>(); let pairs=0;
  for(const level of levels) for(const subject of getSubjectsForLevel(level.id)) {
    pairs++;
    for(const topic of getTopics(level.id,subject.id)) {
      const unit=libraryUnits.find(u=>u.id===topic.unitId)!;
      expect(unit).toBeDefined(); expect(unit.levelId).toBe(level.id); expect(unit.subjectId).toBe(subject.id);
      expect(unit.curriculum.objectives.length).toBeGreaterThanOrEqual(3);
      expect(topic.questions.length).toBeGreaterThanOrEqual(6);
      for(const q of topic.questions) {
        expect(q.resourceIds?.length).toBeGreaterThan(0);
        for(const id of q.resourceIds!) {
          const resource=libraryResources.find(r=>r.id===id)!;
          expect(resource?.unitId).toBe(unit.id); expect(resource?.levelIds).toEqual([level.id]);
        }
        const signature=JSON.stringify([subject.id,q.prompt.normalize("NFKC").replace(/\s+/g," ").trim(),q.options[q.answer]]);
        const previous=seen.get(signature); expect(previous,`${level.id} repeated ${q.prompt}`).toBeUndefined(); seen.set(signature,level.id);
        expect(q.id).not.toMatch(/^(pb|pe|ps|pf|pm|sm|ss|sh|sg)-/);
      }
    }
  }
  expect(pairs).toBe(102);
  expect(resources.every(r=>Boolean(r.levelIds?.length))).toBe(true);
  expect(getArchivedTopics("d1","bm").flatMap(t=>t.questions).some(q=>q.id==="pb-c3")).toBe(true);
  expect(findLearningResources({levelId:"d1",stage:"KSSR"}).some(r=>archivedResources.some(a=>a.id===r.id))).toBe(false);
});

it("requires concrete pictures and short supported activities for all six first-year subjects",async()=>{
  const cloud=vi.fn(async()=>[]), generate=createChallengeGenerator({cloud});
  const first=libraryUnits.filter(u=>u.levelId==="d1"); expect(new Set(first.map(u=>u.subjectId)).size).toBe(6);
  for(const unit of first) {
    expect(earlyFrames[unit.id]?.length ?? unit.reading.illustrations?.length).toBeGreaterThanOrEqual(3);
    const session=await generate({levelId:"d1",subjectId:unit.subjectId,stage:99,seed:"grade-qa",history:[]});
    expect(session.questions).toHaveLength(6);
    for(const question of session.questions) {
      expect(question.support?.choices).toHaveLength(4);
      expect(question.prompt.split(/\s+/).length).toBeLessThanOrEqual(20);
      expect(question.prompt).not.toMatch(/fotosintesis|inferens|kondensasi/);
    }
  }
  expect(cloud).not.toHaveBeenCalled();
});

it("retains answer history when an unchanged maths question is moved into its Library unit",()=>{
  const topic=getTopics("d2","math")[0],q=topic.questions.find(q=>q.id.includes("number-lab-add-"))!;
  expect(q).toBeDefined();
  const pool=practicePool(topic,"d2","math",[],[{levelId:"d2",subjectId:"math",topicId:"practice-number-lab",questionId:q.id,correct:true,completedAt:"2026-09-01T00:00:00Z"}]);
  expect(pool.unseen.some(item=>item.id===q.id)).toBe(false); expect(pool.answered).toBe(1);
  expect(practicePool(topic,"d3","math",[],[{levelId:"d2",subjectId:"math",topicId:topic.id,questionId:q.id,correct:true,completedAt:"2026-09-01T00:00:00Z"}]).answered).toBe(0);
});

it("caps sessions by grade independently of challenge stage",async()=>{
  const expected={d1:6,d2:12,d3:16,d4:24,d5:24,d6:24,t1:40,t2:40,t3:40,t4:40,t5:40,t6:40};
  const generate=createChallengeGenerator({cloud:null});
  for(const [levelId,maximum] of Object.entries(expected)) {
    expect(learningPolicy(levelId).maximum).toBe(maximum);
    const result=await generate({levelId,subjectId:levelId==="t6"?"stpm_math":"math",stage:99,seed:"cap",history:[]});
    expect(result.questions.length).toBeLessThanOrEqual(maximum);
    expect(result.questions.every(q=>q.resourceIds?.every(id=>id.startsWith(`library-${levelId}-`)))).toBe(true);
  }
});
