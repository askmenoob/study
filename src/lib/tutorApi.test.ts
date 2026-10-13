import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askTutorCloud } from "./api";

const input = {
  studentId: "child-1", levelId: "d4", subjectId: "math",
  conversationId: "12345678-1234-4234-8234-123456789012", resourceId: "kssr-math-fraction-note", message: "4",
};

beforeEach(() => {
  vi.stubGlobal("sessionStorage", { getItem: () => "test-session" });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("tutor API contract", () => {
  it("sends the conversation, note and one-character attempt and preserves source metadata", async () => {
    const result = {
      answer: "Semak langkah ini.", provider: "local", support: "study-notes",
      sources: [{ id: input.resourceId, title: "Pecahan", excerpt: "Nota pecahan." }], notice: "Panduan setempat.",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(askTutorCloud(input)).resolves.toEqual(result);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/tutor");
    expect(JSON.parse(init.body)).toEqual(input);
    expect(init.headers.get("Authorization")).toBe("Bearer test-session");
  });

  it("propagates network errors so the panel can offer a retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(askTutorCloud(input)).rejects.toThrow("Failed to fetch");
  });

  it.each([
    ["AI_TUTOR_RATE_LIMIT", 429],
    ["AI_TUTOR_BUSY", 409],
  ])("preserves %s so the panel can distinguish waiting from connection failures", async (code, status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: code }), { status })));
    await expect(askTutorCloud(input)).rejects.toThrow(code);
  });

  it("cancels the actual fetch when a chat or profile is reset", async () => {
    let fetchSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_path: string, init: RequestInit) => new Promise((_resolve, reject) => {
      fetchSignal = init.signal as AbortSignal;
      fetchSignal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const controller = new AbortController();
    const pending = askTutorCloud(input, controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(fetchSignal?.aborted).toBe(true);
  });

  it("bounds waiting time while retaining caller cancellation support", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_path: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const pending = askTutorCloud(input, new AbortController().signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(45000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
});
