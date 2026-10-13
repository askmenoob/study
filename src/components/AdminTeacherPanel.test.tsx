import { describe, expect, it } from "vitest";
import type { TeacherMaterial } from "../lib/teacherContentApi";
import { materialReviewLabel } from "./AdminTeacherPanel";

describe("admin teacher material queue labels", () => {
  const material: TeacherMaterial = {
    id: "material", levelId: "d1", subjectId: "bm", kind: "note", title: "Mengenal suku kata",
    summary: "Nota ringkas untuk murid.", body: "Baca suku kata dengan perlahan.", status: "published",
    publicationSource: "verified_teacher_auto",
  };

  it("distinguishes auto-published material from reviewed material", () => {
    expect(materialReviewLabel(material)).toBe("Belum disemak");
    expect(materialReviewLabel({ ...material, reviewedAt: "2026-09-12T12:00:00.000Z" })).toBe("Disemak IMAI");
  });
});
