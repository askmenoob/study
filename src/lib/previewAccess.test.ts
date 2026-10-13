import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasPreviewAccess, isLocalExamPreview, loginPreview } from "./previewAccess";
import { tokenStore } from "./api";

describe("isolated preview login", () => {
  beforeEach(() => vi.stubGlobal("window", { location: new URL("http://127.0.0.1:4195/") }));
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("permits only the exact HTTP loopback preview addresses", () => {
    for (const url of ["http://127.0.0.1:4195", "http://localhost:4195"]) {
      expect(isLocalExamPreview(new URL(url))).toBe(true);
    }
    for (const url of ["https://study.imai.my", "http://localhost.evil:4195", "http://127.0.0.1:4196", "http://192.168.1.1:4195", "https://localhost:4195"]) {
      expect(isLocalExamPreview(new URL(url))).toBe(false);
    }
  });

  it("never contacts the capability endpoint or writes a token on production", async () => {
    vi.stubGlobal("window", { location: new URL("https://study.imai.my/") });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const save = vi.spyOn(tokenStore, "set").mockImplementation(() => {});
    expect(await hasPreviewAccess()).toBe(false);
    await expect(loginPreview()).rejects.toThrow("PREVIEW_UNAVAILABLE");
    expect(fetcher).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  });

  it("requires an explicitly enabled capability and fails closed on errors", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    for (const response of [new Response("{}", { status: 404 }), new Response('{"enabled":false}'), new Response('{"enabled":"true"}'), new Response("<html>")]) {
      fetcher.mockResolvedValueOnce(response);
      expect(await hasPreviewAccess()).toBe(false);
    }
    fetcher.mockRejectedValueOnce(new TypeError("offline"));
    expect(await hasPreviewAccess()).toBe(false);
    fetcher.mockResolvedValueOnce(new Response('{"enabled":true}'));
    expect(await hasPreviewAccess()).toBe(true);
  });

  it("sends no credentials and uses the existing session-only token storage", async () => {
    const session = new Map([["imai-study-focus-session-id", "old-focus"]]);
    const local = new Map([["imai-study-token-v1", "legacy-token"]]);
    vi.stubGlobal("sessionStorage", { setItem: (key: string, value: string) => session.set(key, value), removeItem: (key: string) => session.delete(key) });
    vi.stubGlobal("localStorage", { removeItem: (key: string) => local.delete(key) });
    const user = { id: "qa-parent", role: "parent", plan: "free" };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "api-issued-token", user })));
    vi.stubGlobal("fetch", fetcher);
    expect(await loginPreview()).toEqual(user);
    expect(fetcher).toHaveBeenCalledWith("/api/preview-access", expect.objectContaining({ method: "POST", body: "{}", cache: "no-store" }));
    expect(session.get("imai-study-token-v1")).toBe("api-issued-token");
    expect(session.has("imai-study-focus-session-id")).toBe(false);
    expect(local.has("imai-study-token-v1")).toBe(false);
  });

  it("leaves existing authentication intact on failed or malformed responses", async () => {
    const save = vi.spyOn(tokenStore, "set").mockImplementation(() => {});
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    for (const response of [new Response("{}", { status: 503 }), new Response('{"token":"bad","user":{"id":"s","role":"student"}}'), new Response('{"user":{"id":"p","role":"parent"}}')]) {
      fetcher.mockResolvedValueOnce(response);
      await expect(loginPreview()).rejects.toThrow("PREVIEW_UNAVAILABLE");
    }
    fetcher.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(loginPreview()).rejects.toThrow("RATE_LIMITED");
    expect(save).not.toHaveBeenCalled();
  });
});
