import type { FocusSession, RedeemedStudyLink } from "./api";
import { redeemStudyLink } from "./api";

// Capture once before React mounts; fragments never reach the HTTP request or referrer.
export function captureStudyLink(location: Pick<Location, "hash" | "pathname" | "search">, history: Pick<History, "replaceState">): string | null {
  const parameters = new URLSearchParams(location.hash.slice(1));
  if (!parameters.has("join")) return null;
  const code = parameters.get("join") ?? "";
  history.replaceState(null, "", location.pathname + location.search);
  return code;
}

// A consumed link cannot be redeemed twice by StrictMode or by a hydration retry.
export function singleFlightRedeemer(redeem: (code: string) => Promise<RedeemedStudyLink>) {
  const requests = new Map<string, Promise<RedeemedStudyLink>>();
  return (code: string) => {
    const existing = requests.get(code);
    if (existing) return existing;
    const pending = redeem(code).catch((error: unknown) => { requests.delete(code); throw error; });
    requests.set(code, pending);
    return pending;
  };
}
export const redeemStudyLinkOnce = singleFlightRedeemer(redeemStudyLink);

export function isSessionEnded(status: FocusSession["status"]) {
  return status === "approved" || status === "revoked" || status === "expired";
}
export function sessionEndMessage(status: FocusSession["status"]) {
  if (status === "approved") return "Ibu bapa telah meluluskan sesi ini untuk ditamatkan.";
  if (status === "revoked") return "Ibu bapa telah membatalkan sesi belajar ini.";
  return "Tempoh sesi yang ditetapkan oleh ibu bapa telah tamat.";
}
export function remainingSessionTime(endsAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
  if (!Number.isFinite(seconds)) return "Menyemak masa";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
