import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { UnitLesson } from "./UnitLesson";
import { LearningLibrary } from "./LearningLibrary";
import { UnitQuestionCard } from "./UnitQuestionCard";
import { getSubjectsForLevel, getTopics } from "../data/curriculum";

it("opens teaching first in every D1 subject, including direct Library practice links",()=>{
  for(const subject of getSubjectsForLevel("d1")) {
    const topic=getTopics("d1",subject.id)[0];
    const html=renderToStaticMarkup(createElement(UnitLesson,{unitId:topic.unitId!,profileKey:"test-child",onBack:()=>{},onStart:()=>{}}));
    expect(html).toContain("Jom belajar dahulu"); expect(html).toContain('role="img"');
    expect(html).not.toContain("unitAnswer");
    const library=renderToStaticMarkup(createElement(LearningLibrary,{levelId:"d1",stage:"KSSR",levelLabel:"Darjah 1",subjects:getSubjectsForLevel("d1"),onOpenSubject:()=>{},initialResourceId:`${topic.unitId}-practice`,allowExternalLinks:false}));
    expect(library).toContain("Jom belajar dahulu"); expect(library).not.toContain("libraryQuestion");
    // React may preload the local illustration with <link href>. The focus
    // boundary forbids navigable external links, not local image preloads.
    expect(library).not.toContain("<a ");
    expect(library).not.toContain('href="http');
  }
});

it("renders picture options, question audio and explanation audio with locked answers",()=>{
  const q=getTopics("d1","math")[0].questions[0];
  const before=renderToStaticMarkup(createElement(UnitQuestionCard,{levelId:"d1",question:q,selected:null,onSelect:()=>{},onNext:()=>{},last:false,language:"ms"}));
  expect(before).toContain("Dengar soalan dan pilihan"); expect(before).toContain('aria-label="Dengar pilihan A"');
  expect((before.match(/role="img"/g)??[]).length).toBe(5);
  const after=renderToStaticMarkup(createElement(UnitQuestionCard,{levelId:"d1",question:q,selected:q.answer,onSelect:()=>{},onNext:()=>{},last:true,language:"ms"}));
  expect(after).toContain("Dengar penerangan"); expect(after).toContain("Selesai aktiviti");
  expect((after.match(/class="unitAnswer[^\"]*" disabled=""/g)??[]).length).toBe(4);
});
