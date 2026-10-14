import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AcademyParentInsights, AcademyStudentActions, AcademyTopbar, AcademyWorkspaceNav } from "./AcademyChrome";
import type { StudyState } from "../types";

const action=vi.fn();
const study={profile:{name:"Aina",levelId:"d4",cloudId:"11111111-1111-4111-8111-111111111111",goalMinutes:15},attempts:[],streak:0} as StudyState;

describe("IMAI Smart Academy role UI",()=>{
  it.each(["student","parent","teacher","admin"] as const)("shows a truthful %s role header and brand",role=>{
    const html=renderToStaticMarkup(createElement(AcademyTopbar,{role,displayName:"Contoh"}));
    expect(html).toContain("IMAI Smart Academy");
    expect(html).toContain("Contoh");
    expect(html).not.toContain("8:00 malam");
    expect(html).not.toContain("RM");
  });
  it.each(["teacher","admin"] as const)("renders %s desktop and mobile anchor navigation",role=>{
    const html=renderToStaticMarkup(createElement(AcademyWorkspaceNav,{role}));
    expect(html).toContain('class="academyWorkspaceSidebar"');
    expect(html).toContain('class="academyWorkspaceMobileNav"');
    expect(html).toContain("study.imai.my");
    expect(html).toContain("Private Tuition");
    expect(html).toContain('href="#');
    expect(html).not.toContain("javascript:");
  });
  it("provides linked student study tools but does not invent live sessions",()=>{
    const html=renderToStaticMarkup(createElement(AcademyStudentActions,{
      onLearn:action,onTutor:action,onMaterials:action,onProgress:action,onLibrary:action,
    }));
    for(const label of ["Latihan Saya","AI Tutor","Bahan Guru","Rekod Belajar","Library"])expect(html).toContain(label);
    expect(html).not.toContain("Masuk Kelas");
  });
  it("shows parent mastery from real study attempts, no made-up numbers",()=>{
    const html=renderToStaticMarkup(createElement(AcademyParentInsights,{study,onReport:action,onTeacher:action,onManage:action}));
    expect(html).toContain("Ringkasan Prestasi");
    expect(html).toContain("Aina");
    expect(html).toContain("berdasarkan latihan");
    expect(html).toContain("Sesi latihan direkodkan");
    expect(html).toContain("0</strong>");
    expect(html).not.toContain("92% Kehadiran");
    expect(html).not.toContain("Pendapatan");
  });
});
