import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TuitionAdminMetrics } from "./AdminTuitionOverview";
import type { TuitionAdminSummary } from "../lib/teacherNetworkApi";

const metrics: TuitionAdminSummary = {
  pendingApplications: 3, needsInfoApplications: 1, imaiTeachers: 4, externalTeachers: 7,
  suspendedTeachers: 2, activeClasses: 8, activeEnrollments: 23, pendingEnrollments: 5, problemFeedback: 10,
};
describe("admin tuition dashboard", () => {
  it("shows counts with honest operational semantics and useful admin links", () => {
    const html = renderToStaticMarkup(createElement(TuitionAdminMetrics, { summary: metrics }));
    expect(html).toContain("Guru IMAI aktif");
    expect(html).toContain("Guru Luar aktif");
    expect(html).toContain("Sambungan murid aktif");
    expect(html).toContain("Permohonan guru menunggu");
    expect(html).toContain("23");
    expect(html).toContain("rekod maklum balas berkategori masalah");
    expect(html).toContain("bukan jumlah tiket belum selesai");
    expect(html).toContain('href="#admin-tuition-applications"');
    expect(html).toContain('href="#admin-feedback-triage"');
    expect(html).not.toContain("RM");
    expect(html).not.toContain("Pendapatan");
  });
  it("handles truly empty aggregates without invented activity", () => {
    const html = renderToStaticMarkup(createElement(TuitionAdminMetrics, {
      summary: Object.fromEntries(Object.keys(metrics).map(key => [key, 0])) as TuitionAdminSummary,
    }));
    expect(html).toContain("Guru IMAI aktif");
    expect(html).toContain(">0</strong>");
    expect(html).not.toContain("Revenue");
  });
});
