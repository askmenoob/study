import { expect, it } from "vitest";
import { libraryUnits } from "./catalog.js";

it("teaches newly assessed operations and language forms before practice",()=>{
  const cases: Array<[string,RegExp[]]> = [
    ["library-d2-math-puluh-dan-sa",[/42 − 20/,/22/]],
    ["library-d3-en-past-event-sequence",[/past of draw is drew/]],
    ["library-d6-math-peratus-daripada-jumlah",[/bahagian ÷ jumlah keseluruhan × 100%/,/12\.5%/]],
    ["library-d6-science-jarak-masa-laju",[/jarak = laju × masa/,/4 \+ 2 = 6/,/12 ÷ 6 = 2/]],
    ["library-t2-en-reporting-words-in-context",[/Will becomes would/,/have\/has.*had/,/Monday.*Tuesday/]],
    ["library-t4-geo-kepadatan-dan-perubahan-penduduk",[/Pertambahan semula jadi = kelahiran − kematian/,/1 030/]],
  ];
  for(const [id,examples] of cases){const note=libraryUnits.find(u=>u.id===id)!.note.body.join(" ");for(const example of examples)expect(note,id).toMatch(example);}
});

it("keeps shared question context independent of shuffled question position",()=>{
  for(const unit of libraryUnits)for(const section of [unit.reading,unit.practice])
    expect(section.body.join(" "),unit.id).not.toMatch(/question\s+\d|final question|soalan (?:pertama|kedua|ketiga|terakhir)/i);
});

it("does not label a moon as hiding toys or a clean plate as food on the floor",()=>{
  for(const unit of libraryUnits.filter(u=>u.levelId==="d1"))for(const q of [...unit.reading.questions!,...unit.practice.questions!]){
    q.support!.choices.forEach((v,i)=>{
      if(v.items.some(item=>item.kind==="sleep"))expect(q.options[i],q.prompt).toMatch(/^(tidur|sleep)$/i);
      if(v.items.some(item=>item.kind==="plate"))expect(q.options[i],q.prompt).not.toMatch(/lantai/);
      if(v.items.some(item=>item.kind==="blocks"))expect(q.options[i],q.prompt).not.toMatch(/makanan|tanpa izin/);
    });
  }
});

it("labels two-variable Management Mathematics as foundation rather than complete semester coverage",()=>{
  const unit=libraryUnits.find(u=>u.subjectId==="mgmt_math")!;
  expect(unit.note.title).toMatch(/^Foundations:/);
  expect(unit.note.body.join(" ")).toMatch(/three-variable models, simplex tableaux and the Big-M method in Semester 3/);
  expect(unit.curriculum.standardMapping).toBe("pending");
  expect(unit.curriculum.teacherReview).toBe("pending");
});
