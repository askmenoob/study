import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParentTeacherConnection, TeacherConnectionCard, joinCodeMatchesPreview } from "./ParentTeacherConnection";

describe("parent teacher connection",()=>{
  it("states consent, privacy, no-notification-spam and the non-empty Library fallback",()=>{
    const html=renderToStaticMarkup(createElement(ParentTeacherConnection,{studentId:"11111111-1111-4111-8111-111111111111",studentName:"Aina",onOpenMaterials(){}}));
    expect(html).toContain("Parent memberi persetujuan dahulu");expect(html).toContain("Email parent");expect(html).toContain("Tiada email atau WhatsApp automatik");expect(html).toContain("Library IMAI");expect(html).toContain("Masukkan kod kelas");
    expect(html).toContain("semua 8 aksara");expect(html).toContain("4 aksara petunjuk");expect(html).toContain('minLength="8"');expect(html).toContain('maxLength="8"');expect(html).toContain("Contoh: ABCD1234");
  });
  it("removes the verified badge and material action when a teacher is suspended",()=>{
    const html=renderToStaticMarkup(createElement(TeacherConnectionCard,{busy:false,onOpenMaterials(){},onLeave(){},item:{
      id:"e",studentId:"s",studentName:"Aina",classId:"c",className:"1 Bestari BM",teacherPublicName:"Cikgu Siti",
      schoolName:"SK Bestari",academicYear:2026,levelId:"d1",subjectId:"bm",status:"active",teacherStatus:"suspended",
    }}));
    expect(html).toContain("Akses guru dihentikan");
    expect(html).toContain("Pengesahan tidak aktif");
    expect(html).not.toContain("Guru Disahkan");
    expect(html).not.toContain("Buka bahan guru");
    expect(html).toContain("Keluar kelas");
  });
  it("binds consent to the exact normalized code that produced the preview",()=>{
    expect(joinCodeMatchesPreview("ABCD1234", " abcd1234 ")).toBe(true);
    expect(joinCodeMatchesPreview("ABCD1234", "WXYZ5678")).toBe(false);
  });
});
