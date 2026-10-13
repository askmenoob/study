import type { ExamPrivatePaper, ExamPrivateQuestion } from "./examContracts.js";

// Test-only owned content, with deliberately recognizable private strings.
export function examFixture(): ExamPrivatePaper {
  const item = (id: string, structured = false): Omit<ExamPrivateQuestion, "retry"> => ({
    id, number: id, prompt: `Hitung ${id} separuh daripada satu.`, kind: structured ? "structured" : "numeric",
    skillId: "fractions", skillName: "Pecahan", autoMarks: 1, manualMarks: structured ? 2 : 0,
    key: { numeric: 0.5, tolerance: 1e-9 }, solution: ["PRIVATE_SOLUTION: 1/2"],
    note: { id: "fraction-note", title: "PRIVATE_NOTE", body: "Samakan penyebut.", example: "1/2 = 2/4" },
    rubric: structured ? [{ id: "method", description: "PRIVATE_RUBRIC kaedah", marks: 1 }, { id: "steps", description: "Langkah tepat", marks: 1 }] : [],
  });
  return {
    id: "fixture-d4", version: 1, title: "Original preview", exam: "UASA", levelIds: ["d4"], subjectId: "math",
    durationMinutes: 15, scopeLabel: "Dua item original preview", source: { kind: "original", provider: "IMAI test author", year: null, url: null,
      rights: "owned", rightsEvidence: "Written specifically for this owned test fixture", review: "pending", reviewer: null, reviewedAt: null },
    questions: [
      { ...item("q1"), retry: { ...item("r1"), prompt: "Alternatif satu per empat", key: { numeric: 0.25, tolerance: 1e-9 } } },
      { ...item("q2", true), unit: "m", retry: { ...item("r2", true), unit: "m", prompt: "Alternatif tiga per empat", key: { numeric: 0.75, tolerance: 1e-9 } } },
    ],
  };
}
