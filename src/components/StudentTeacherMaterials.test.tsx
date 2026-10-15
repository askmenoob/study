import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudentTeacherMaterialList, StudentTeacherMaterialReader } from "./StudentTeacherMaterials";

describe("approved teacher materials for students", () => {
  it("renders safe plain text metadata without internal teacher email", () => {
    const html = renderToStaticMarkup(createElement(StudentTeacherMaterialList, { materials: [{
      id: "material", teacherName: "Cikgu Siti", teacherEmail: "private@example.test", levelId: "d1", subjectId: "bm", kind: "reading",
      title: "Bacaan <script>", summary: "Bacaan pendek untuk murid.", body: "Isi bacaan yang telah diluluskan.", status: "published",
    }], onOpen() {} }));
    expect(html).toContain("Bacaan guru");
    expect(html).toContain("Bacaan &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("private@example.test");
  });

  it("shows an honest empty state", () => {
    const html = renderToStaticMarkup(createElement(StudentTeacherMaterialList, { materials: [], onOpen() {} }));
    expect(html).toContain("Belum ada bahan guru");
  });

  it("does not claim super-admin review for auto-published teacher material", () => {
    const html = renderToStaticMarkup(createElement(StudentTeacherMaterialReader, { material: {
      id: "material", teacherName: "Cikgu Siti", levelId: "d1", subjectId: "bm", kind: "note",
      title: "Mengenal suku kata", summary: "Nota ringkas untuk murid.", body: "Baca suku kata dengan jelas.", status: "published",
      publicationSource: "verified_teacher_auto",
    }, levelLabel: "Darjah 1", subjects: [{ id: "bm", name: "Bahasa Melayu" }], onBack() {} }));
    expect(html).toContain("Bahan daripada Guru Disahkan IMAI");
    expect(html).toContain("boleh disemak atau ditarik balik");
    expect(html).not.toContain("telah diluluskan super admin");
    expect(html).toContain('/reading-art/language-v1.webp');
    expect(html).toContain('Panduan grafik bacaan');
    expect(html).toContain('Baca suku kata dengan jelas.');
  });
});
