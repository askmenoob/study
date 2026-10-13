import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ParentTuitionOverview } from "./ParentTuitionOverview";

const handlers = { onFindTeacher: vi.fn(), onConnections: vi.fn(), onManage: vi.fn() };

describe("parent tuition dashboard overview", () => {
  it("provides a parent path to verified teachers even without a child", () => {
    const html = renderToStaticMarkup(createElement(ParentTuitionOverview, handlers));
    expect(html).toContain("Private Tuition");
    expect(html).toContain("Cari Guru");
    expect(html).toContain("Tambah anak");
    expect(html).not.toContain("Kelas aktif</span>");
    expect(html).not.toContain("Tempah Sekarang");
    expect(html).not.toMatch(/RM\s*\d+/);
  });
  it("does not fabricate booking or attendance before loading family records", () => {
    const html = renderToStaticMarkup(createElement(ParentTuitionOverview, {
      ...handlers, studentId: "11111111-1111-4111-8111-111111111111", studentName: "Adam",
    }));
    expect(html).toContain("Tuisyen peribadi · Adam");
    expect(html).toContain("Kelas aktif");
    expect(html).toContain("Menunggu guru");
    expect(html).toContain("Urus sambungan kelas");
    expect(html).not.toContain(">0</strong>");
    expect(html).not.toContain("8:00 malam");
  });
});
