import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeacherClassPanel } from "./TeacherClassPanel";

describe("teacher class dashboard",()=>{
  it("keeps first-run actions, verified-scope wording and app-only progress clear",()=>{
    const html=renderToStaticMarkup(createElement(TeacherClassPanel,{profile:{id:"t",publicName:"Cikgu Siti",status:"active",schoolName:"SK Bestari",levelIds:["d1"],subjectIds:["bm"],academicYear:2026},classes:[{id:"c",teacherId:"t",teacherPublicName:"Cikgu Siti",schoolName:"SK Bestari",name:"1 Bestari BM",academicYear:2026,levelId:"d1",subjectId:"bm",status:"active",codeHint:"1234",joinCode:"ABCD1234",activeStudents:1,pendingStudents:0}],enrollments:[],onChanged(){}}));
    expect(html).toContain("Tindakan diperlukan");expect(html).toContain("Cipta kelas");expect(html).toContain("bukan pengesahan rasmi KPM");expect(html).toContain("Jana kod baharu");
    expect(html).toContain("Kod penuh aktif 8 aksara");expect(html).toContain("ABCD1234");expect(html).toContain("Salin kod penuh");expect(html).not.toContain("Petunjuk sahaja");
  });

  it("offers a safe rotation fallback for a legacy class without encrypted code",()=>{
    const html=renderToStaticMarkup(createElement(TeacherClassPanel,{profile:{id:"t",publicName:"Cikgu Siti",status:"active",schoolName:"SK Bestari",levelIds:["d1"],subjectIds:["bm"],academicYear:2026},classes:[{id:"c",teacherId:"t",teacherPublicName:"Cikgu Siti",schoolName:"SK Bestari",name:"1 Bestari BM",academicYear:2026,levelId:"d1",subjectId:"bm",status:"active",codeHint:"1234"}],enrollments:[],onChanged(){}}));
    expect(html).toContain("Kod penuh belum tersedia");expect(html).toContain("Jana kod baharu");expect(html).not.toContain("1234");
  });

  it("does not offer active code, rotation or roster actions for an archived class",()=>{
    const html=renderToStaticMarkup(createElement(TeacherClassPanel,{profile:{id:"t",publicName:"Cikgu Siti",status:"active",schoolName:"SK Bestari",levelIds:["d1"],subjectIds:["bm"],academicYear:2026},classes:[{id:"c",teacherId:"t",teacherPublicName:"Cikgu Siti",schoolName:"SK Bestari",name:"1 Bestari BM",academicYear:2026,levelId:"d1",subjectId:"bm",status:"archived",codeHint:"1234",joinCode:"ABCD1234"}],enrollments:[],onChanged(){}}));
    expect(html).toContain("Kelas diarkibkan");
    expect(html).not.toContain("Kod penuh aktif");
    expect(html).not.toContain("ABCD1234");
    expect(html).not.toContain("Jana kod baharu");
    expect(html).not.toContain("Lihat roster");
  });
});
