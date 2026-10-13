import { beforeEach, describe, expect, it } from "vitest";
import { discardStudentPendingAttempts, loadPendingAttempts, queueAttempt } from "./sync";
import type { AttemptPayload } from "./api";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

const payload: AttemptPayload = {
  clientAttemptId: "11111111-1111-4111-8111-111111111111",
  studentId: "22222222-2222-4222-8222-222222222222",
  levelId: "d4", subjectId: "math", topicId: "fraction",
  score: 2, total: 3, answers: [],
};

describe("offline attempt queue", () => {
  beforeEach(() => Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true }));
  it("deduplicates the same client attempt id", () => {
    queueAttempt(payload); queueAttempt(payload);
    expect(loadPendingAttempts()).toHaveLength(1);
    expect(loadPendingAttempts()[0].clientAttemptId).toBe(payload.clientAttemptId);
  });
});

it("removes a deleted child's offline records without removing a sibling's work", () => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  const sibling = { ...payload, studentId: "sibling", clientAttemptId: "other-attempt" };
  queueAttempt(payload); queueAttempt(sibling);
  discardStudentPendingAttempts(payload.studentId);
  expect(loadPendingAttempts()).toEqual([sibling]);
});
