import type { FastifyInstance, FastifyRequest } from "fastify";
import { isIP } from "node:net";
import { performance } from "node:perf_hooks";

type AccessIdentity = { user_id: string | null; email: string | null };
type ClientAddress = { ip: string | null; ip_source: "socket" | "trusted_nginx" };
type AddressResolver = (request: FastifyRequest) => ClientAddress;
const identities = new WeakMap<FastifyRequest, AccessIdentity>();

function normalizeIp(value: unknown): string | null {
  if (typeof value !== "string" || value !== value.trim() || value.includes("%") || !isIP(value)) return null;
  if (value.toLowerCase().startsWith("::ffff:") && isIP(value.slice(7)) === 4) return value.slice(7);
  return isIP(value) === 6 ? new URL("http://[" + value + "]/").hostname.slice(1, -1) : value;
}

/** Only call after jwtVerify/assertSession, password verification, or committed link redemption. */
export function markVerifiedAccessIdentity(request: FastifyRequest, identity: unknown) {
  const value = identity as { sub?: unknown; email?: unknown } | null;
  const user_id = typeof value?.sub === "string" && value.sub.length > 0 && value.sub.length <= 256 ? value.sub : null;
  const email = user_id && typeof value?.email === "string" && value.email.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ? value.email : null;
  identities.set(request, { user_id, email });
}

/** nginx must overwrite X-Forwarded-For with its validated $remote_addr; never append a client header. */
export function createClientAddressResolver(config = ""): AddressResolver {
  const trusted = new Set(config.split(",").map(value => value.trim()).filter(Boolean).map(value => {
    const ip = normalizeIp(value);
    if (!ip) throw new Error("ACCESS_LOG_TRUSTED_PROXY_IPS requires exact IP addresses");
    return ip;
  }));
  return request => {
    const peer = normalizeIp(request.raw.socket.remoteAddress);
    const forwarded = normalizeIp(request.headers["x-forwarded-for"]);
    if (peer && trusted.has(peer) && forwarded) return { ip: forwarded, ip_source: "trusted_nginx" };
    return { ip: peer, ip_source: "socket" };
  };
}

export function registerUserAccessLogging(app: FastifyInstance, address: AddressResolver) {
  const started = new WeakMap<FastifyRequest, number>();
  app.addHook("onRequest", async request => { started.set(request, performance.now()); });
  app.addHook("onResponse", async (request, reply) => {
    const identity = identities.get(request) ?? { user_id: null, email: null };
    app.log.info({
      event: "user_access",
      app: "imai-study",
      timestamp: new Date().toISOString(),
      method: request.method,
      route: request.routeOptions.url ?? null,
      status: reply.statusCode,
      duration_ms: Math.round(Math.max(0, performance.now() - (started.get(request) ?? performance.now())) * 1000) / 1000,
      ...identity,
      ...address(request),
    });
  });
}
