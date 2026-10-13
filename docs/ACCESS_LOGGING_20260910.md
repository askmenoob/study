# IMAI Study user access logging â€” prepared 2026-09-10

Status: prepared and tested only. No production deployment, restart, commit or push was performed.

## Baseline and source preservation

- Worktree: /mnt/data/releases/imai-study/20260910-access-logging
- Branch: codex/study-access-logging-20260910
- HEAD: c75f727085302dae15b0b7f700a66dbea87a9bc1 (fast-forwarded to the already committed voice release; no new commit created)
- Canonical checkout was clean at the same final HEAD.
- The earlier handoff named reading-303359a; initial live inspection found API/web at tts-0693f29. During preparation, a concurrent frontend-only voice release moved canonical main and live web to c75f727. Its 9 changed frontend files did not overlap this patch, so the isolated branch was safely fast-forwarded and the combined build/tests rerun.
- Final live web image: imai-study-web:voice-c75f727
- Final live web image ID: sha256:7770afe772e596a3fbfd6b98983c5a0165db6d7b18628733979a518aae83727b
- Final web revision label: c75f727085302dae15b0b7f700a66dbea87a9bc1
- Live API image: imai-study-api:tts-0693f29
- Live API image ID: sha256:d569501e3f0479c1cb2dddb2a3bbb9a79fa5b378951052a13252070c89655dea
- Image revision label: 0693f29bb85f2db9902ff9bd3fb9bcbb1e72b515
- Before editing, a fresh API build matched the running container:
  - server/dist/index.js SHA-256: 66228cf1982f8489fb16e5a2ccd3f89d615ff615bb2688b9c73ea6a93a0a9037
  - server/dist/gemini.js SHA-256: 89b4ce890f4f1c5238b5918a1e5bd3b987b6f627b6fbc61f0a60d00629090eb9
- Active API Compose files: /mnt/data/projects/imai-study/compose.yml and /mnt/data/releases/imai-study/20260910-tts-reliability-ops/compose.tts-release.yml.
- Active web Compose files: /mnt/data/projects/imai-study/compose.yml and /mnt/data/releases/imai-study/20260910-voice-grades-ops/compose.voice-release.yml.
- API source files did not change between 0693f29 and c75f727. Never rebuild the frontend from 0693f29 for this release.
- The active release override preserves EXAM_PREVIEW=false. Keep it and all TTS settings in any candidate release.

## Behavior

API responses emit a JSON stdout record with event=user_access, app=imai-study,
ISO UTC timestamp, method, route template (null for an unmatched route), status,
duration_ms, user_id, email, ip and ip_source. Pino adds its usual level, time,
pid and hostname fields.

The event contains no raw URL, query, path parameters, request/response bodies,
headers, cookies, bearer tokens, passwords or study-link code.
Identity is explicitly attached only after existing server verification:
signed session verification plus assertSession, successful password comparison,
successful registration insertion, or committed study-link redemption.
A denied authorization check after successful identity verification still records
the verified identity and denied response status.

user_id is the account subject (JWT sub). Student sessions use their parent
account subject; they do not currently carry an email claim, so email is null.
This change does not invent an email or query the database to enrich each request.
Anonymous/invalid-token attempts have null identity; an attempted login email is
not recorded as verified identity. Public endpoints without an existing auth
check remain anonymous, even if the caller sends a token.

One event is written in onResponse after an API response. Static/PWA file requests,
requests served entirely offline, and transport disconnects before a response are
not authenticated API events. The existing nginx diagnostic access log is unchanged;
the secret-minimization guarantee here applies to the new user_access event.

## Trusted ingress

Observed path: Cloudflare -> study tunnel -> nginx web -> Study API.
Observed Docker network: imai-study_study, subnet 172.25.0.0/16.
Observed addresses at preparation: API 172.25.0.3, web 172.25.0.4, tunnel 172.25.0.5.
The web port is published on LAN :4178, so LAN-supplied Cloudflare/forwarded headers
must never establish identity or client address.

- nginx accepts CF-Connecting-IP only from ACCESS_LOG_TRUSTED_TUNNEL_IP.
- nginx overwrites X-Forwarded-For and X-Real-IP with the resulting validated
  remote address and clears CF-Connecting-IP before forwarding to the API.
- The API accepts a single valid X-Forwarded-For IP only when the socket peer
  exactly matches ACCESS_LOG_TRUSTED_PROXY_IPS. It ignores all forwarding headers
  from other peers. No CIDR, wildcard, hostname or hop-count trust is accepted.
- ip_source=trusted_nginx means nginx supplied the sanitized address, which can
  be a Cloudflare client address or a direct LAN caller address.
- ip_source=socket means no trusted sanitized forwarding value was available.
- Fastify trustProxy=true was removed; the existing auth limiter uses the same
  validated address resolver, preserving its 20 attempts / 15 minutes behavior.
- Defaults are empty API trust and loopback-only nginx trust. With defaults,
  proxied requests group by ingress peer; configure verified peers before release.

The current Docker addresses are dynamic. Do not assume the observed values
will survive a recreation. Revalidate immediately before and after replacing API
or web and after any tunnel/network recreation. Do not activate the candidate if
configured peers differ from actual container addresses. Never replace this gate
with broad Docker subnet trust. Static address/network redesign is outside this patch.

References:
- [nginx real IP module](https://nginx.org/en/docs/http/ngx_http_realip_module.html)
- [Fastify response hooks](https://fastify.dev/docs/latest/Reference/Hooks/)

## Verification evidence

1. Initial focused test attempt failed because accessLogging.js did not exist.
2. npm test -- server/accessLogging.test.ts server/accessLogging.integration.test.ts server/focusSessions.test.ts:
   20 passed, exit 0.
   New checks include real signed JWT verification, expired/unsigned tokens,
   missing email, independent simultaneous requests, secret-safe templated routes,
   anonymous 404, exact proxy validation, malformed forwarding values, real production
   login/register routes with actual bcrypt/JWT and a fake database boundary,
   preserved token/HTTP responses, and IP-spoof-resistant auth throttling.
3. npm run typecheck: passed, exit 0 after correcting test-only TypeScript issues.
4. npm run build:api: passed before and after implementation. Final npm run build on c75f727: passed, exit 0 (both TypeScript projects, Vite/PWA web build, API compilation).
5. Final npm test on c75f727: 53 files passed / 3 skipped; 388 tests passed / 25 skipped, exit 0.
   The skipped pre-existing suites require disposable PostgreSQL URLs; no
   production database was queried or changed by tests.
6. python3 scripts/test-access-ingress.py --image imai-study-web:tts-0693f29:
   passed 6 checks, exit 0. Disposable nginx container with candidate template:
   configuration syntax, forged direct headers, trusted IPv4/IPv6, invalid/missing
   client address. The test uses no production network or credentials and removes
   its container in finally.
7. Final focused npm test -- server/accessLogging.test.ts server/accessLogging.integration.test.ts: 13 passed, exit 0, with a fresh passing typecheck. Added an explicit unknown-path/query check across ALL captured API logger records, including the production index routes. No Fastify 404 leak reproduced with the installed version and existing disableRequestLogging=true; no production workaround was needed. The full-suite count above predates this additional regression test.
8. git diff --check: passed. Merged Compose model validation passed with exact trust fields and preserved EXAM_PREVIEW=false; resolved secrets were never printed.

The existing Fastify disableRequestLogging deprecation and Vite large-chunk warnings remain.
Browser login, public Cloudflare forwarding, actual Komodo display and live
container rotation are release verification gates, not claimed as completed here.

## Release procedure for the integration owner

1. Recheck canonical status, main HEAD, active Compose labels, live API/web image
   IDs and revision labels. If a later TTS/application release exists, rebase or
   apply this focused patch to that release and rerun the affected checks.
2. Review the source diff and apply the code, nginx template, Dockerfile.web and
   Compose environment additions together. Keep the new nginx sanitization paired
   with API trust configuration; never enable proxy trust against the old nginx.
3. Build unique candidate API and web image tags from the reviewed worktree;
   retain API tts-0693f29 and web voice-c75f727 images for rollback. Both images are needed because the
   nginx runtime template changed. Preserve the latest web assets and TTS source.
4. Create a new release Compose override without modifying the old release record.
   Preserve EXAM_PREVIEW=false and existing secrets/volumes/origins.
   Set ACCESS_LOG_TRUSTED_PROXY_IPS on api to the verified exact web IP, and
   ACCESS_LOG_TRUSTED_TUNNEL_IP on web to the verified exact tunnel IP.
   The base Compose variables are STUDY_ACCESS_LOG_TRUSTED_PROXY_IPS and
   STUDY_ACCESS_LOG_TRUSTED_TUNNEL_IP respectively.
5. Add bounded API container logs to the release override (not the global daemon):

   logging:
     driver: local
     options:
       max-size: "10m"
       max-file: "3"

   This changes the container logging configuration on recreation. Komodo/Docker
   can read the local driver's recent stdout through the Docker API.
6. Validate the fully merged Compose model without printing resolved secrets.
   Record the rendered trust fields, logging options, candidate image IDs, and
   exact live network peer addresses.
7. Obtain the combined release authorization/checkpoint required by the owner.
   No production activation is authorized by this preparation record.
8. Replace only the reviewed API/web services through the existing release flow.
   Reinspect peers before activating API forwarding trust and after recreation.
   If a peer differs, stop activation and correct the reviewed configuration;
   do not accept headers based on a stale address.
9. Verify health, normal login and token-backed API access, student/missing-email
   behavior, invalid login, direct forged headers, and a genuine public Cloudflare
   request. Inspect only synthetic-account records in Komodo Container Logs.
   Filter JSON for event=user_access and app=imai-study; check timestamp, email,
   templated route, status and source IP. Confirm normal auth thresholds.
10. Rollback uses API tts-0693f29, web voice-c75f727 and their prior release settings;
    no schema/data migration was added. Preserve source/image evidence and tell
    the owner that rollback also restores the prior proxy behavior.

## Reproducing checks in this worktree

Dependencies were reused from the canonical checkout with a temporary node_modules
symlink, then removed. Either run npm ci, or temporarily create that same symlink
to /mnt/data/projects/imai-study/node_modules, run the listed npm commands and remove
the symlink. Do not stage or commit the symlink. The nginx test accepts --image so
an already available nginx image can be used without pulling or rebuilding.
