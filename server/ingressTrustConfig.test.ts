import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production ingress trust chain", () => {
  const compose = readFileSync(new URL("../compose.yml", import.meta.url), "utf8");

  it("pins the proxy addresses used to resolve per-client auth rate limits", () => {
    expect(compose).toContain("STUDY_ACCESS_LOG_TRUSTED_PROXY_IPS:-172.25.0.4");
    expect(compose).toContain("STUDY_ACCESS_LOG_TRUSTED_TUNNEL_IP:-172.25.0.1");
    expect(compose).toContain("ipv4_address: 172.25.0.4");
    expect(compose).toContain("subnet: 172.25.0.0/16");
  });

  it("does not expose the trusted Cloudflare ingress port to the LAN", () => {
    expect(compose).toContain('"127.0.0.1:4178:80"');
  });
});
