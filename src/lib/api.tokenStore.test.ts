import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "./api";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("tokenStore remember me", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("keeps normal sessions in sessionStorage only", () => {
    tokenStore.set("session-token");
    expect(sessionStorage.getItem("imai-study-token-v1")).toBe("session-token");
    expect(localStorage.getItem("imai-study-token-v1")).toBeNull();
    expect(tokenStore.get()).toBe("session-token");
  });

  it("persists only when remember me is selected", () => {
    tokenStore.set("remembered-token", true);
    expect(sessionStorage.getItem("imai-study-token-v1")).toBeNull();
    expect(localStorage.getItem("imai-study-token-v1")).toBe("remembered-token");
    expect(tokenStore.get()).toBe("remembered-token");
  });

  it("clears both storage locations on logout", () => {
    tokenStore.set("remembered-token", true);
    tokenStore.clear();
    expect(sessionStorage.getItem("imai-study-token-v1")).toBeNull();
    expect(localStorage.getItem("imai-study-token-v1")).toBeNull();
  });
});