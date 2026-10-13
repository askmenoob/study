import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureStudyLink, isSessionEnded, remainingSessionTime, sessionEndMessage, singleFlightRedeemer } from "./studySession";
import { getFocusSession, redeemStudyLink, tokenStore, type RedeemedStudyLink } from "./api";

const redeemed: RedeemedStudyLink = {
  token: "child-session-token",
  user: { id: "parent-owner", role: "student", plan: "free", studentId: "child-1", focusSessionId: "session-1" },
  session: { id: "session-1", status: "active", endsAt: "2026-09-08T15:30:00Z" },
};

describe("study link entry", () => {
  it("captures the secret from the fragment and removes it before navigation", () => {
    const replaceState = vi.fn();
    expect(captureStudyLink({ hash: "#join=opaque-code", pathname: "/", search: "?source=family" }, { replaceState })).toBe("opaque-code");
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/?source=family");
  });
  it("does not rewrite ordinary navigation or accidentally redeem an empty default URL", () => {
    const replaceState = vi.fn();
    expect(captureStudyLink({ hash: "#library", pathname: "/", search: "" }, { replaceState })).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
    expect(captureStudyLink({ hash: "#join=", pathname: "/", search: "" }, { replaceState })).toBe("");
  });
  it("redeems a single-use link once across concurrent StrictMode effects and hydration retries", async () => {
    let resolve!: (value: RedeemedStudyLink) => void;
    const redeem = vi.fn(() => new Promise<RedeemedStudyLink>((done) => { resolve = done; }));
    const once = singleFlightRedeemer(redeem);
    const first = once("one-use-code"), replay = once("one-use-code");
    expect(first).toBe(replay);
    expect(redeem).toHaveBeenCalledTimes(1);
    resolve(redeemed);
    expect(await first).toEqual(redeemed);
    expect(await once("one-use-code")).toEqual(redeemed);
    expect(redeem).toHaveBeenCalledTimes(1);
  });
  it("allows an explicit retry after a failed request and isolates separate link codes", async () => {
    const redeem = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue(redeemed);
    const once = singleFlightRedeemer(redeem);
    await expect(once("code-a")).rejects.toThrow("network");
    await expect(once("code-a")).resolves.toEqual(redeemed);
    await expect(once("code-b")).resolves.toEqual(redeemed);
    expect(redeem).toHaveBeenCalledTimes(3);
  });
});

describe("focus session decisions", () => {
  it("keeps active and requested exits restricted, and accepts only server terminal states", () => {
    expect(isSessionEnded("active")).toBe(false);
    expect(isSessionEnded("exit_requested")).toBe(false);
    for (const status of ["approved", "revoked", "expired"] as const) expect(isSessionEnded(status)).toBe(true);
    expect(sessionEndMessage("approved")).toContain("meluluskan");
    expect(sessionEndMessage("revoked")).toContain("membatalkan");
    expect(sessionEndMessage("expired")).toContain("Tempoh");
  });
  it("formats a countdown without using the device clock as authorization to exit", () => {
    const endsAt = "2026-09-08T15:30:00Z";
    expect(remainingSessionTime(endsAt, Date.parse("2026-09-08T15:00:00Z"))).toBe("30:00");
    expect(remainingSessionTime(endsAt, Date.parse("2026-09-08T15:29:59.001Z"))).toBe("0:01");
    expect(remainingSessionTime(endsAt, Date.parse("2026-09-08T15:31:00Z"))).toBe("0:00");
    expect(isSessionEnded("active")).toBe(false);
    expect(remainingSessionTime("bad-date", Date.now())).toBe("Menyemak masa");
  });
});

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("study session API boundary", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    vi.stubGlobal("localStorage", new MemoryStorage());
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("sends only the link code when redeeming, never the parent's bearer token", async () => {
    tokenStore.set("parent-secret");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(redeemed), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(redeemStudyLink("opaque")).resolves.toEqual(redeemed);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/redeem-study-link");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual({ code: "opaque" });
    expect(tokenStore.get()).toBe("parent-secret");
  });
  it("normalizes expired focus credentials so the UI can clear private child state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })));
    await expect(getFocusSession()).rejects.toThrow("UNAUTHORIZED");
  });
  it("preserves unavailable-link errors for a meaningful one-use-link screen", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "LINK_UNAVAILABLE" }), { status: 410 })));
    await expect(redeemStudyLink("used")).rejects.toThrow("LINK_UNAVAILABLE");
  });
  it("aborts a stalled session check after 12 seconds to make retry available", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const result = getFocusSession();
    const assertion = expect(result).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(12000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
