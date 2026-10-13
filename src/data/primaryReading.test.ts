import { expect, it } from "vitest";
import { primaryReadingUnits, libraryResources } from "../../server/library/catalog.js";
import { validPictureSupport } from "../../server/library/earlyLearning.js";
import { readingSources } from "../../server/library/readingSources.js";
import { getTopics } from "./curriculum";
import { createChallengeGenerator } from "../../server/challengeGenerator.js";

it("adds five unique illustrated readings for every primary year with passage evidence", () => {
  expect(primaryReadingUnits).toHaveLength(30);
  for (let year=1;year<=6;year++) {
    const units=primaryReadingUnits.filter(u=>u.levelId===`d${year}`);
    expect(units).toHaveLength(5);
    expect(units.filter(u=>u.subjectId==='bm')).toHaveLength(2);
    expect(new Set(units.map(u=>u.subjectId))).toEqual(new Set(['bm','en','math','science']));
  }
  for (const unit of primaryReadingUnits) {
    expect(unit.reading.illustrations!.length).toBeGreaterThanOrEqual(2);
    expect(unit.sourceIds!.every(id=>readingSources.some(s=>s.id===id))).toBe(true);
    const questions=[...unit.reading.questions!,...unit.practice.questions!];
    expect(questions).toHaveLength(6);
    for(const q of questions) {
      expect(Number.isInteger(q.evidence?.paragraph)).toBe(true);
      expect(q.evidence!.text.trim().length).toBeGreaterThan(3);
      expect(unit.reading.body[q.evidence!.paragraph]).toContain(q.evidence!.text);
      if(unit.levelId==='d1') expect(validPictureSupport(q.support)).toBe(true);
    }
    for(const picture of unit.reading.illustrations!) {
      expect(unit.reading.body[picture.afterParagraph]).toBeDefined();
      expect(validPictureSupport({choices:Array(4).fill(picture.visual)})).toBe(true);
    }
    if(unit.levelId==='d1') {
      expect(unit.reading.body.length).toBeGreaterThanOrEqual(3);
      expect(unit.reading.body.length).toBeLessThanOrEqual(4);
      unit.reading.body.forEach((_,index)=>expect(unit.reading.illustrations!.some(p=>p.afterParagraph===index)).toBe(true));
    }
  }
});

it("synchronizes exact topic questions with the original reading, never unrelated old exercises", () => {
  for(const unit of primaryReadingUnits) {
    const topic=getTopics(unit.levelId,unit.subjectId).find(t=>t.unitId===unit.id)!;
    expect(topic.questions).toHaveLength(6);
    for(const q of topic.questions) {
      expect(q.evidence).toBeDefined();
      expect(q.resourceIds!.every(id=>libraryResources.some(r=>r.id===id&&r.unitId===unit.id))).toBe(true);
      if(unit.levelId!=='d1') for(const paragraph of unit.reading.body) expect(q.prompt).toContain(paragraph);
    }
  }
});

it("keeps the source passage on server-generated practice questions", async () => {
  const generate=createChallengeGenerator({cloud:null,includeTemplates:false});
  for(const unit of primaryReadingUnits.filter(u=>u.levelId==='d6')) {
    const session=await generate({levelId:'d6',subjectId:unit.subjectId,stage:1,seed:unit.id,history:[]});
    const questions=session.questions.filter(q=>q.resourceIds?.some(id=>id.startsWith(unit.id+'-')));
    expect(questions.length).toBeGreaterThan(0);
    for(const q of questions) for(const paragraph of unit.reading.body) expect(q.prompt).toContain(paragraph);
  }
});
