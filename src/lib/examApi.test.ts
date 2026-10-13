import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { examApi, examErrorMessage } from "./examApi";

describe("exam API authorization and concurrency contract", () => {
  let token: string | null;
  beforeEach(() => {
    token = "session-only-token";
    vi.stubGlobal("sessionStorage", { getItem: () => token });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("sends the current session token and preserves revision and full frozen answers", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ attempt: { id: "a" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const answers = { checked: { value: "1/2", working: "first working" }, editable: { value: "4" } };
    await examApi.save("attempt/1", 7, answers);
    expect(fetcher.mock.calls[0][0]).toBe("/api/exam/attempts/attempt%2F1");
    const options = fetcher.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("PUT");
    expect(options.headers).toMatchObject({ Authorization: "Bearer session-only-token" });
    expect(JSON.parse(options.body as string)).toEqual({ expectedRevision: 7, answers });
  });
  it("does not write without an active token", async () => {
    token = null;
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(examApi.submit("attempt", 1)).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("discards a late response after an account or focus-session token switch", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>(done => { resolve = done; })));
    const pending = examApi.get("attempt");
    token = "another-session";
    resolve(new Response(JSON.stringify({ attempt: { studentId: "previous-student" } }), { status: 200 }));
    await expect(pending).rejects.toMatchObject({ code: "AUTH_CHANGED", status: 401 });
  });
  it("preserves the server conflict code for explicit draft resolution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "REVISION_CONFLICT" }), { status: 409 })));
    await expect(examApi.save("attempt", 1, {})).rejects.toMatchObject({ code: "REVISION_CONFLICT", status: 409 });
  });
  it("keeps self-mark inputs separate from automatic scoring", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ attempt: {} }), { status: 200 })); vi.stubGlobal("fetch", fetcher);
    await examApi.selfMark("attempt", 3, { q1: { step1: true, step2: false } });
    expect(fetcher.mock.calls[0][0]).toBe("/api/exam/attempts/attempt/self-mark");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ expectedRevision: 3, marks: { q1: { step1: true, step2: false } } });
  });
  it("encodes catalogue scope and translates a full draft queue into a useful action", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ papers: [], attempts: [] }), { status: 200 })); vi.stubGlobal("fetch", fetcher);
    await examApi.catalogue("student&other=1");
    expect(fetcher.mock.calls[0][0]).toBe("/api/exam/papers?studentId=student%26other%3D1");
    expect(examErrorMessage(new Error("ATTEMPT_LIMIT_REACHED"))).toContain("Sambung dan hantar");
    expect(examErrorMessage(new Error("RETRY_ALREADY_EXISTS"))).toBe("Soalan alternatif untuk cubaan ini sudah dibuka. Sambung daripada Senarai set & cubaan.");
  });
});
