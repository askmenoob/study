import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { challengeApi, challengeErrorMessage } from "./challengeApi";

describe("challenge request boundaries", () => {
  let token: string | null;
  beforeEach(() => { token = "learner-token"; vi.stubGlobal("sessionStorage", { getItem: () => token }); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("sends a stable first-answer request unchanged when explicitly retried", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("Network interrupted"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ session: { id: "session" } })));
    vi.stubGlobal("fetch", fetcher);
    const input = { expectedRevision: 5, index: 3, selected: 2, requestId: "f94e8605-c01e-4c21-ad7e-ebf1e3a2610c" };
    await expect(challengeApi.answer("session/1", input)).rejects.toThrow("Network interrupted");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await challengeApi.answer("session/1", input);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe("/api/challenges/session%2F1/answer");
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ Authorization: "Bearer learner-token", "Content-Type": "application/json" });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(input);
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
  });

  it("does not fetch without a current session token", async () => {
    token = null;
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(challengeApi.start({ studentId: "s", subjectId: "math", requestId: "id" })).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a response delivered after the authenticated profile changes", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    const request = challengeApi.get("session");
    token = "parent-token";
    resolve(new Response(JSON.stringify({ session: { studentId: "old-student" } })));
    await expect(request).rejects.toMatchObject({ status: 401, code: "AUTH_CHANGED" });
  });

  it("preserves revision conflicts for refetch instead of resending a different answer", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "REVISION_CONFLICT" }), { status: 409 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(challengeApi.hint("session", { expectedRevision: 1, index: 1, requestId: "hint-id" })).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("encodes learner scope and keeps parent reports on their dedicated endpoint", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}"))); vi.stubGlobal("fetch", fetcher);
    await challengeApi.overview("child&other=1");
    await challengeApi.ranking("child", "subject&other=1");
    await challengeApi.report("child");
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(["/api/challenges?studentId=child%26other%3D1", "/api/challenges/ranking?studentId=child&subjectId=subject%26other%3D1", "/api/challenges/report?studentId=child"]);
  });

  it("aborts timed-out reads and allows caller cancellation", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_path: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetcher);
    const expired = expect(challengeApi.overview("child")).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(15000);
    await expired;
    const controller = new AbortController();
    const canceled = expect(challengeApi.report("child", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await canceled;
    expect(fetcher.mock.calls.every(call => call[1].signal?.aborted)).toBe(true);
  });

  it("does not claim an interrupted answer was saved", () => {
    expect(challengeErrorMessage(new TypeError("Failed to fetch"))).toContain("Simpanan belum dapat disahkan");
  });
});
