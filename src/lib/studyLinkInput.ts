// A kiosk has no address bar. Accept only this deployment's generated links;
// never navigate to user-supplied hosts or put an invite into a query string.
export function parsePastedStudyLink(input: string, expectedOrigin: string): string | null {
  if (input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (url.origin !== expectedOrigin || url.username || url.password || url.pathname !== "/" || url.search) return null;
    const parameters = new URLSearchParams(url.hash.slice(1));
    if ([...parameters].length !== 1 || !parameters.has("join")) return null;
    const code = parameters.get("join") ?? "";
    return /^[A-Za-z0-9_-]{43}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
