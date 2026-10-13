import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { activeTeacherClasses, TeacherMaterialList } from "./TeacherDashboard";

describe("teacher material status list", () => {
  it("shows moderation status and escapes teacher content", () => {
    const html = renderToStaticMarkup(createElement(TeacherMaterialList, { materials: [{
      id: "material", teacherName: "Cikgu", levelId: "d1", subjectId: "bm", kind: "note",
      title: "<script>alert(1)</script>", summary: "Ringkasan bahan original.", body: "Isi bahan yang mencukupi.",
      status: "rejected", reviewNote: "Tambah contoh yang lebih jelas.",
    }] }));
    expect(html).toContain("Perlu pembetulan");
    expect(html).toContain("Tambah contoh yang lebih jelas");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("labels auto-published material honestly before and after admin review", () => {
    const base = { id: "material", teacherName: "Cikgu", levelId: "d1" as const, subjectId: "bm", kind: "note" as const,
      title: "Mengenal suku kata", summary: "Ringkasan bahan original.", body: "Isi bahan yang mencukupi.", status: "published" as const,
      publicationSource: "verified_teacher_auto" as const };
    const unreviewed = renderToStaticMarkup(createElement(TeacherMaterialList, { materials: [base] }));
    const reviewed = renderToStaticMarkup(createElement(TeacherMaterialList, { materials: [{ ...base, reviewedAt: "2026-09-12T12:00:00.000Z" }] }));
    expect(unreviewed).toContain("Diterbitkan · belum disemak");
    expect(unreviewed).not.toContain("Diluluskan");
    expect(reviewed).toContain("Disemak IMAI");
  });

  it("selects only active classes for publishing teacher material", () => {
    const archived = { id: "archived", status: "archived" as const };
    const active = { id: "active", status: "active" as const };
    expect(activeTeacherClasses([archived, active] as any).map(item => item.id)).toEqual(["active"]);
    expect(activeTeacherClasses([archived] as any)).toEqual([]);
  });
});
