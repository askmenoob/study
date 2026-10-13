import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TuitionTeacherDetails } from "./TuitionTeacherProfile";
import type { TuitionTeacher } from "../lib/teacherNetworkApi";

const teacher: TuitionTeacher = {
  id: "11111111-1111-4111-8111-111111111111",
  publicName: "Cikgu <Private>",
  affiliation: "external", levelIds: ["d1", "d2"], subjectIds: ["math", "bm"],
  positionTitle: "Guru Sekolah Rendah", state: "Perak",
};
const props = { teacher, hasStudent: true, onConnect: vi.fn(), onManage: vi.fn(), onBack: vi.fn() };

describe("parent tuition teacher profile", () => {
  it("shows approved scope honestly without inventing availability, fees or experience", () => {
    const html = renderToStaticMarkup(createElement(TuitionTeacherDetails, props));
    expect(html).toContain("Guru Luar");
    expect(html).toContain("Darjah 1");
    expect(html).toContain("Darjah 2");
    expect(html).toContain("Matematik");
    expect(html).toContain("Belum dinyatakan");
    expect(html).toContain("Semak slot tersedia di bawah");
    expect(html).toContain("Masukkan kod kelas");
    expect(html).toContain("&lt;Private&gt;");
    expect(html).not.toContain("<Private>");
    expect(html).not.toMatch(/RM\s*\d+/);
    expect(html).not.toContain("Tempah Sekarang");
  });
  it("requires parent child profile before starting the join-code flow", () => {
    const html = renderToStaticMarkup(createElement(TuitionTeacherDetails, { ...props, hasStudent: false }));
    expect(html).toContain("Tambah profil anak");
    expect(html).not.toContain(">Masukkan kod kelas<");
  });
  it("distinguishes IMAI teachers from external teachers without claiming KPM accreditation", () => {
    const html = renderToStaticMarkup(createElement(TuitionTeacherDetails, {
      ...props, teacher: { ...teacher, affiliation: "imai" },
    }));
    expect(html).toContain("Guru IMAI");
    expect(html).toContain("bukan pengiktirafan rasmi KPM");
  });
});
