import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { teacherContentApi } from "./teacherContentApi";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("teacher content API client", () => {
  const session = new MemoryStorage();
  const local = new MemoryStorage();
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", session); vi.stubGlobal("localStorage", local);
    session.setItem("imai-study-token-v1", "teacher-token");
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); session.removeItem("imai-study-token-v1"); local.removeItem("imai-study-token-v1"); });

  it("submits the exact idempotent original-content contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ material: { id: "material", status: "pending" } })));
    vi.stubGlobal("fetch", fetcher);
    const input = { clientRequestId: "33333333-3333-4333-8333-333333333333", classId: "44444444-4444-4444-8444-444444444444", levelId: "d1", subjectId: "bm", kind: "note", title: "Mengenal suku kata", summary: "Nota ringkas untuk murid Darjah 1.", body: "Baca suku kata dengan perlahan dan jelas.", rightsAttested: true, privacyAttested: true } as const;
    await teacherContentApi.submit(input);
    const [path, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/teacher/materials");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer teacher-token");
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("uses a student-scoped URL instead of accepting a client grade", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ materials: [] })));
    vi.stubGlobal("fetch", fetcher);
    await teacherContentApi.listForStudent("44444444-4444-4444-8444-444444444444");
    expect(fetcher.mock.calls[0][0]).toBe("/api/students/44444444-4444-4444-8444-444444444444/teacher-materials");
    expect(String(fetcher.mock.calls[0][0])).not.toContain("levelId");
  });
});
