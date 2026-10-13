import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackApi } from "./feedbackApi";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("feedback API client", () => {
  const session = new MemoryStorage();
  const local = new MemoryStorage();

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("localStorage", local);
    session.setItem("imai-study-token-v1", "parent-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    session.removeItem("imai-study-token-v1");
    local.removeItem("imai-study-token-v1");
  });

  it("sends the stable client request id and parent feedback contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      feedback: { id: "feedback-id", referenceId: "FB-1001" },
    })));
    vi.stubGlobal("fetch", fetcher);
    const input = {
      clientRequestId: "8a7843a0-af3b-4fd5-b181-0a26fa3f2c45",
      category: "suggestion" as const,
      message: "Sila tambah latihan bacaan pendek.",
      pagePath: "/settings",
      allowReply: true,
    };

    await expect(feedbackApi.submit(input)).resolves.toEqual({
      feedback: { id: "feedback-id", referenceId: "FB-1001" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [path, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/feedback");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer parent-token");
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("retries an uncertain network result with the exact same idempotent body", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        feedback: { id: "feedback-id", referenceId: "FB-1002" },
      })));
    vi.stubGlobal("fetch", fetcher);
    const input = {
      clientRequestId: "b9e9f4eb-a360-42fd-af4e-d63c76af25c4",
      category: "problem",
      message: "Paparan terlalu kecil pada telefon.",
      allowReply: false,
    } as const;

    await expect(feedbackApi.submit(input)).rejects.toThrow("Failed to fetch");
    await expect(feedbackApi.submit(input)).resolves.toEqual({
      feedback: { id: "feedback-id", referenceId: "FB-1002" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
  });

  it("reads the dedicated super-admin inbox contract", async () => {
    const feedback = [{
      id: "feedback-id", referenceId: "FB-1003", category: "other", message: "Terima kasih.",
      pagePath: "/settings", allowReply: false, parentEmail: "parent@example.test",
      parentDisplayName: "Ibu Arif", createdAt: "2026-09-12T08:00:00Z",
    }];
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ feedback })));
    vi.stubGlobal("fetch", fetcher);

    await expect(feedbackApi.listAdmin()).resolves.toEqual({ feedback });
    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/feedback");
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer parent-token");
  });

  it("reads a paginated super-admin user directory without putting an email in the URL", async () => {
    const users = [{ email: "parent@example.test", role: "parent", createdAt: "2026-09-12T08:00:00Z" }];
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ users, total: 1, nextCursor: null })));
    vi.stubGlobal("fetch", fetcher);

    await expect(feedbackApi.listAdminUsers(25)).resolves.toEqual({ users, total: 1, nextCursor: null });
    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/users?limit=25");
    expect(String(fetcher.mock.calls[0][0])).not.toContain("parent%40example.test");
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer parent-token");
  });

  it("does not call the server without a current authenticated token", async () => {
    session.removeItem("imai-study-token-v1");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    await expect(feedbackApi.listAdmin()).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
