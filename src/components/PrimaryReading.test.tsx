import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { primaryReadingUnits } from "../../server/library/catalog";
import { getSubjectsForLevel, getTopics } from "../data/curriculum";
import { LearningLibrary } from "./LearningLibrary";
import { UnitQuestionCard } from "./UnitQuestionCard";
import { ReadingSources } from "./ReadingSources";

it("renders new D1 readings as teaching with pictures before any question", () => {
  for(const unit of primaryReadingUnits.filter(u=>u.levelId==='d1')) {
    const html=renderToStaticMarkup(createElement(LearningLibrary,{levelId:'d1',stage:'KSSR',levelLabel:'Darjah 1',subjects:getSubjectsForLevel('d1'),onOpenSubject:()=>{},initialResourceId:unit.id+'-reading',allowExternalLinks:false}));
    expect(html).toContain('Jom belajar dahulu');expect(html).toContain('role="img"');
    expect(html).not.toContain('class="unitAnswer');expect(html).not.toContain('<a ');expect(html).not.toContain('href="http');
  }
});
it("renders illustrated practice context and exposes evidence only after answering", () => {
  const unit=primaryReadingUnits.find(u=>u.levelId==='d2'&&u.subjectId==='bm')!;
  const html=renderToStaticMarkup(createElement(LearningLibrary,{levelId:'d2',stage:'KSSR',levelLabel:'Darjah 2',subjects:getSubjectsForLevel('d2'),onOpenSubject:()=>{},initialResourceId:unit.id+'-practice',allowExternalLinks:false}));
  expect(html).toContain('Bacaan untuk latihan ini');expect(html).toContain('readingPanel');expect(html).toContain('role="img"');expect(html).not.toContain('<a ');expect(html).not.toContain('href="http');
  const question=getTopics('d2','bm').find(t=>t.unitId===unit.id)!.questions[0];
  const render=(selected:number|null)=>renderToStaticMarkup(createElement(UnitQuestionCard,{question,selected,onSelect:()=>{},onNext:()=>{},last:false,language:'ms'}));
  expect(render(null)).not.toContain('Bukti dalam bacaan');
  expect(render(question.answer)).toContain('Bukti dalam bacaan');
});
it("gates all supplemental external reading links during focus and outside primary", () => {
  const render=(levelId:string,allowExternalLinks:boolean)=>renderToStaticMarkup(createElement(ReadingSources,{levelId,allowExternalLinks}));
  expect(render('d2',true)).toContain('bookdash.org');
  expect(render('d2',true)).toContain('belum mempunyai latihan yang dipadankan');
  expect(render('d2',false)).toBe('');expect(render('t6',true)).toBe('');
});
