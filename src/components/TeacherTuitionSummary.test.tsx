import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeacherTuitionSummary } from "./TeacherTuitionSummary";
import type { TeacherClass, TeacherEnrollment, TeacherNetworkProfile } from "../lib/teacherNetworkApi";

const profile = { id: "teacher", publicName: "Cikgu Aina", tuitionAffiliation: "external",
  levelIds: ["d4"], subjectIds: ["math"], status: "active", schoolName: "Sekolah", academicYear: 2026 } as TeacherNetworkProfile;
const classes = [{ id: "class1", status: "active" }, { id: "class2", status: "archived" }] as TeacherClass[];
const enrollments = [
  { classId: "class1", status: "active", teacherStatus: "active" },
  { classId: "class1", status: "pending_teacher", teacherStatus: "active" },
  { classId: "class1", status: "active", teacherStatus: "suspended" },
  { classId: "class2", status: "active", teacherStatus: "active" },
] as TeacherEnrollment[];

describe("teacher tuition overview", () => {
  it("counts only active classes and verified connections, without financial estimates", () => {
    const html = renderToStaticMarkup(createElement(TeacherTuitionSummary, {
      profile, classes, enrollments, materialCount: 2,
    }));
    expect(html).toContain("Guru Luar");
    expect(html).toContain("Kelas aktif");
    expect(html).toContain("Sambungan murid aktif");
    expect(html).toContain("Permohonan menunggu");
    expect(html).toContain("Bahan guru direkodkan");
    expect(html).toContain("Pendapatan tuisyen");
    expect(html).toContain("Belum ada transaksi");
    expect(html).not.toContain("RM1,000");
    expect(html).not.toContain("Masuk Kelas");
    expect(html).toMatch(/>1<\/strong><span>Kelas aktif/);
    expect(html).toMatch(/>1<\/strong><span>Sambungan murid aktif/);
    expect(html).toMatch(/>1<\/strong><span>Permohonan menunggu/);
    expect(html).toMatch(/>2<\/strong><span>Bahan guru direkodkan/);
  });
  it("shows distinct Guru IMAI affiliation on same dashboard", () => {
    const html = renderToStaticMarkup(createElement(TeacherTuitionSummary, {
      profile: { ...profile, tuitionAffiliation: "imai" }, classes: [], enrollments: [], materialCount: 0,
    }));
    expect(html).toContain("Guru IMAI");
    expect(html).toContain("Jadual kelas");
  });
});
