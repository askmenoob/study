import { tokenStore, type AccountUser } from "./api";

// This capability is provided only by the isolated local preview runner.
export function isLocalExamPreview(location: Pick<Location, "hostname" | "port" | "protocol">): boolean {
  return location.protocol === "http:" && location.port === "4195"
    && (location.hostname === "127.0.0.1" || location.hostname === "localhost");
}

export async function hasPreviewAccess(): Promise<boolean> {
  if (!isLocalExamPreview(window.location)) return false;
  try {
    const response = await fetch("/api/preview-access", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return response.ok && (await response.json()).enabled === true;
  } catch { return false; }
}

export async function loginPreview(): Promise<AccountUser> {
  if (!isLocalExamPreview(window.location)) throw new Error("PREVIEW_UNAVAILABLE");
  const response = await fetch("/api/preview-access", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "RATE_LIMITED" : "PREVIEW_UNAVAILABLE");
  const result = await response.json() as { token?: string; user?: AccountUser };
  if (typeof result.token !== "string" || !result.token || result.user?.role !== "parent" || !result.user.id) {
    throw new Error("PREVIEW_UNAVAILABLE");
  }
  tokenStore.set(result.token);
  return result.user;
}
