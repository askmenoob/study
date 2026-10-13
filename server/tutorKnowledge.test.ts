import { describe, expect, it } from "vitest";
import { academicText, eligibleTutorNotes, selectTutorSources } from "./tutorKnowledge.js";

describe("Study note retrieval", () => {
  it("uses actual original note paragraphs, without third-party link summaries", () => {
    const found = selectTutorSources({levelId:"d4",subjectId:"math",resourceId:"library-d4-math-pecahan-bahagian-sama-note",message:"Bagaimana tambah pecahan?"});
    expect(found).toHaveLength(1);
    expect(found[0].excerpt).toContain("Kita menambah pengangka");
    expect(JSON.stringify(found)).not.toContain("https://");
  });
  it("does not offer secondary algebra to a primary profile, or another subject", () => {
    expect(() => selectTutorSources({levelId:"d4",subjectId:"math",resourceId:"library-t1-math-persamaan-seimbang-note",message:"algebra"})).toThrow("TUTOR_RESOURCE_NOT_AVAILABLE");
    expect(() => selectTutorSources({levelId:"d4",subjectId:"science",resourceId:"library-d4-math-pecahan-bahagian-sama-note",message:"pecahan"})).toThrow();
  });
  it("never imports a worksheet's answer key as a note", () => {
    expect(eligibleTutorNotes("d4","math").some(note=>note.kind==="practice")).toBe(false);
    expect(() => selectTutorSources({levelId:"d4",subjectId:"math",resourceId:"imai-d4-fractions-pilot-2026",message:"jawapan"})).toThrow();
  });
  it("retrieves the relevant note and admits no match for an unrelated request", () => {
    expect(selectTutorSources({levelId:"d4",subjectId:"science",message:"Bagaimana cahaya membentuk bayang-bayang?"})[0].id).toBe("library-d4-science-cahaya-dan-bayang-note");
    expect(selectTutorSources({levelId:"d4",subjectId:"math",message:"Apakah galaksi Andromeda?"})).toEqual([]);
  });
  it("uses the previous exercise to resolve a short follow-up", () => {
    expect(selectTutorSources({levelId:"d4",subjectId:"math",message:"teruskan"})).toEqual([]);
    const found = selectTutorSources({levelId:"d4",subjectId:"math",message:"teruskan",previousQuestion:"Bagaimana tambah pecahan?"});
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].title.toLowerCase()).toContain("pecahan");
    expect(found[0].excerpt.toLowerCase()).toMatch(/penyebut|pengangka/);
    expect(eligibleTutorNotes("d4","math").some(note=>note.id===found[0].id)).toBe(true);
  });
  it("redacts profile identity and contact details while retaining academic numbers", () => {
    const clean = academicText("Saya ARIF, arif@example.com, 012-3456789, 120101-10-1234. 1/2 + 1/4 dan 10 + 3.", "ARIF");
    expect(clean).not.toMatch(/ARIF|example.com|3456789|120101/);
    expect(clean).toContain("1/2 + 1/4 dan 10 + 3");
  });
});
