import { describe, expect, it } from "vitest";
import type { ExamAttempt } from "../../server/examContracts";
import {
  clearExamDrafts, examAnswersEqual, examDraftKey, listExamDrafts, makeExamDraft,
  mergeEditableExamAnswers, readExamDraft, reconcileExamDraft, removeExamDraft, writeExamDraft,
} from "./examDrafts";

function storageFixture(): Storage {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); }, clear: () => data.clear() };
}
function attemptFixture(overrides: Partial<ExamAttempt> = {}): ExamAttempt {
  return { id: "attempt-1", studentId: "student-1", clientAttemptId: "client-1", mode: "guided", status: "draft", revision: 2,
    startedAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z", submittedAt: null, endsAt: null, retryOfAttemptId: null,
    answers: { q1: { value: "1/2" }, q2: { value: "3", working: "1 + 2" } }, checkedQuestionIds: [], reviews: [],
    autoScore: 0, autoMarks: 2, manualScore: 0, manualMarks: 2, needsSelfMark: false,
    paper: { id: "original-d4", version: 1, title: "Set asli D4", exam: "UASA", levelIds: ["d4"], subjectId: "math", durationMinutes: 10,
      questionCount: 2, autoMarks: 2, manualMarks: 2, publication: "preview", scopeLabel: "Skop terhad",
      source: { kind: "original", provider: "IMAI", year: null, url: null, rights: "owned", rightsEvidence: "author record", review: "pending", reviewer: null, reviewedAt: null },
      questions: [{ id: "q1", number: "1", prompt: "Satu separuh", kind: "numeric", skillId: "fraction", skillName: "Pecahan", autoMarks: 1, manualMarks: 0 },
        { id: "q2", number: "2", prompt: "Tambah", kind: "structured", skillId: "add", skillName: "Tambah", autoMarks: 1, manualMarks: 2 }] }, ...overrides };
}

describe("exam draft recovery and account boundary", () => {
  it("isolates account, student and attempt, including delimiter-like identifiers", () => {
    const storage = storageFixture();
    const original = makeExamDraft("family:a", attemptFixture(), { q1: { value: "0.25" } });
    expect(writeExamDraft(original, storage)).toBe(true);
    expect(readExamDraft("family:a", "student-1", "attempt-1", storage).value?.answers.q1.value).toBe("0.25");
    expect(readExamDraft("family", "a:student-1", "attempt-1", storage).value).toBeNull();
    expect(readExamDraft("family:b", "student-1", "attempt-1", storage).value).toBeNull();
    expect(readExamDraft("family:a", "student-2", "attempt-1", storage).value).toBeNull();
    expect(readExamDraft("family:a", "student-1", "attempt-2", storage).value).toBeNull();
  });
  it("clears only the account logging out, preserving other drafts and unrelated storage", () => {
    const storage = storageFixture();
    writeExamDraft(makeExamDraft("a", attemptFixture(), {}), storage);
    writeExamDraft(makeExamDraft("a", attemptFixture({ id: "attempt-2", studentId: "student-2" }), {}), storage);
    writeExamDraft(makeExamDraft("a:other", attemptFixture(), {}), storage);
    storage.setItem("unrelated", "preserve");
    expect(clearExamDrafts("a", storage)).toBe(true);
    expect(listExamDrafts("a", "student-1", storage).value).toEqual([]);
    expect(readExamDraft("a:other", "student-1", "attempt-1", storage).value).not.toBeNull();
    expect(storage.getItem("unrelated")).toBe("preserve");
  });
  it("persists only answer fields and public identifiers, not source evidence, notes or credentials", () => {
    const attempt = attemptFixture();
    attempt.reviews = [{ questionId: "q1", correct: false, autoScore: 0, autoMarks: 1, manualMarks: 0, manualScore: null,
      solution: ["private solution"], note: { id: "n", title: "Private note", body: "private body", example: "example" }, rubric: [], selfMarks: {} }];
    const draft = makeExamDraft("account", attempt, { q1: { value: "2", unit: "cm", working: "my steps", ...{ secret: "must-not-persist" } } });
    const serialized = JSON.stringify(draft);
    expect(serialized).toContain("my steps");
    for (const forbidden of ["must-not-persist", "private solution", "private body", "author record", "reviews", "source", "token"]) expect(serialized).not.toContain(forbidden);
  });
  it("reports unavailable storage without claiming a save or successful cleanup", () => {
    const storage = storageFixture();
    storage.setItem = () => { throw new Error("QuotaExceededError"); };
    storage.getItem = () => { throw new Error("SecurityError"); };
    storage.removeItem = () => { throw new Error("SecurityError"); };
    expect(writeExamDraft(makeExamDraft("a", attemptFixture(), {}), storage)).toBe(false);
    expect(readExamDraft("a", "student-1", "attempt-1", storage)).toEqual({ value: null, error: true });
    expect(removeExamDraft("a", "student-1", "attempt-1", storage)).toBe(false);
  });
  it("preserves malformed local data for recovery and does not interpret it as a valid draft", () => {
    const storage = storageFixture();
    const key = examDraftKey("a", "student-1", "attempt-1");
    storage.setItem(key, '{"schema":1,"answers":null}');
    expect(readExamDraft("a", "student-1", "attempt-1", storage).error).toBe(true);
    expect(listExamDrafts("a", "student-1", storage)).toEqual({ value: [], error: true });
    expect(storage.getItem(key)).not.toBeNull();
  });
  it("rejects a payload copied under another student's scoped storage key", () => {
    const storage = storageFixture();
    storage.setItem(examDraftKey("a", "student-2", "attempt-1"), JSON.stringify(makeExamDraft("a", attemptFixture(), {})));
    expect(readExamDraft("a", "student-2", "attempt-1", storage)).toEqual({ value: null, error: true });
  });
});

describe("cloud revision reconciliation", () => {
  it("recovers pending answers when the cloud revision has not changed", () => {
    const active = attemptFixture();
    const draft = makeExamDraft("a", active, { q1: { value: "3/4" } });
    expect(reconcileExamDraft(draft, active)).toBe("pending");
  });
  it("keeps stale answers intact and requires explicit resolution when cloud moves ahead", () => {
    const active = attemptFixture();
    const draft = makeExamDraft("a", active, { q1: { value: "3/4" } });
    const before = JSON.stringify(draft);
    expect(reconcileExamDraft(draft, { ...active, revision: 3 })).toBe("conflict");
    expect(JSON.stringify(draft)).toBe(before);
  });
  it("recognises a successful save whose response was lost without a false conflict", () => {
    const active = attemptFixture();
    const draft = makeExamDraft("a", active, { q1: { value: "3/4" } });
    expect(reconcileExamDraft(draft, { ...active, revision: 3, answers: draft.answers })).toBe("saved");
  });
  it("does not discard drafts that differ only in workings or units", () => {
    expect(examAnswersEqual({ q: { value: "2", unit: "cm" } }, { q: { value: "2", unit: "m" } })).toBe(false);
    expect(examAnswersEqual({ q: { value: "2", working: "1+1" } }, { q: { value: "2", working: "2x1" } })).toBe(false);
  });
  it("merges only still-editable questions and preserves the frozen first response", () => {
    const active = attemptFixture({ checkedQuestionIds: ["q1"] });
    const draft = makeExamDraft("a", active, { q1: { value: "wrong override" }, q2: { value: "8", working: "4+4" }, alien: { value: "injected" } });
    expect(mergeEditableExamAnswers(draft, active)).toEqual({ q1: { value: "1/2" }, q2: { value: "8", working: "4+4" } });
    expect(active.answers.q2.value).toBe("3");
  });
  it.each(["submitted", "expired"])("cannot apply pending local answers to an %s attempt", kind => {
    const active = attemptFixture();
    const draft = makeExamDraft("a", active, { q1: { value: "9" } });
    const final: ExamAttempt = kind === "submitted" ? { ...active, status: "submitted" } : { ...active, mode: "simulation", endsAt: "2026-09-09T00:10:00Z" };
    const now = Date.parse("2026-09-09T00:10:00Z");
    expect(reconcileExamDraft(draft, final, now)).toBe("conflict");
    expect(mergeEditableExamAnswers(draft, final, now)).toEqual(active.answers);
  });
  it("never rebases answers across paper snapshots or student identities", () => {
    const active = attemptFixture();
    const draft = makeExamDraft("a", active, { q1: { value: "9" } });
    const other = { ...active, paper: { ...active.paper, version: 2 } };
    expect(reconcileExamDraft(draft, other)).toBe("conflict");
    expect(mergeEditableExamAnswers(draft, other)).toEqual(active.answers);
    expect(mergeEditableExamAnswers(draft, { ...active, studentId: "someone-else" })).toEqual(active.answers);
  });
});
