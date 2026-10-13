import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudentTuitionOverview } from "./StudentTuitionOverview";

const props = { onMaterials: vi.fn(), onTutor: vi.fn() };
describe("student tuition dashboard", () => {
  it("offers own teacher materials and AI Tutor without inventing lessons or fees", () => {
    const html = renderToStaticMarkup(createElement(StudentTuitionOverview, {
      ...props, studentId: "11111111-1111-4111-8111-111111111111",
    }));
    expect(html).toContain("IMAI Private Tuition");
    expect(html).toContain("Kelas aktif");
    expect(html).toContain("Menunggu cikgu");
    expect(html).toContain("Bahan daripada guru");
    expect(html).toContain("Tanya AI Tutor");
    expect(html).toContain("Tempahan &amp; kehadiran");
    expect(html).not.toMatch(/RM\s*\d+/);
    expect(html).not.toContain("Masuk Kelas");
  });
  it("shows honest empty student profile state", () => {
    const html = renderToStaticMarkup(createElement(StudentTuitionOverview, props));
    expect(html).toContain("Belum ada profil pelajar aktif");
    expect(html).not.toContain("Cikgu Aina");
    expect(html).not.toContain("Matematik 4");
  });
});
