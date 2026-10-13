# IMAI Study re-audit — 13 September 2026

## Definition of done for this pass

- Confirm the current production snapshot without mutating it.
- Reproduce material security, teacher, parent and recovery defects.
- Apply the smallest repository-scoped fixes.
- Add regression coverage and pass the full build, test, content-validation and dependency checks.
- Keep deployment as a separate, explicitly approved release step.

## Production snapshot before this candidate

- Production source was clean at `a49af7b`.
- API, web, PostgreSQL and tunnel containers were running; API, web and PostgreSQL reported healthy.
- No API/web error-level pattern was found in the final one-hour log sample.
- Aggregate database checks found 6 users, 7 active roles, 1 teacher profile, 1 teacher class, 1 teacher material and 0 class enrollments.
- Aggregate integrity checks found no approved application without a teacher profile, no active teacher-role/profile mismatch, no active class without encrypted code material, no material/class scope mismatch and no published material attached to an inactive scope.

## Material findings fixed in this candidate

| Severity | Finding | Fix and evidence |
| --- | --- | --- |
| Critical | A student JWT could call the account role-switch endpoint and receive a parent or teacher token. | Student sessions and super-admin sessions are now rejected before role lookup. Integration regressions assert that no replacement token is returned. |
| High | Every real browser request reached the API from the same web-container address, so the in-memory auth limiter grouped all users into one bucket. The web port was also published on every host interface. | Compose now pins the internal proxy addresses, trusts only the web container at the API boundary, trusts only the bridge gateway at Nginx, and binds the host web port to `127.0.0.1`. Compose parsing and static trust-chain regressions pass. |
| High | A parent could preview one class code, edit the input, then submit consent using a different code. A late preview response could also replace newer state. | Preview state is bound to the normalized eight-character code, stale preview responses are ignored, and join submission uses the previewed code only. Component regressions pass. |
| High | The restore script dropped the live database before proving that the dump could be restored. | Restore now validates into a temporary database, checks core schema, renames the original database only at cutover, waits for application health, and attempts rollback on failure. Shell syntax passes; an isolated destructive rehearsal is still required before the script is used for a real recovery. |
| Medium | The super-admin bootstrap updated the legacy `users.role` field without guaranteeing an active `user_roles` row. | Create, promote and repair paths now update both records atomically; the bootstrap performs the account-role migration first. Five focused tests pass. |
| Medium | The nested enrollment-revoke route did not bind the enrollment to the student ID in the URL. | The route and repository now require parent, student and enrollment ownership together. PostgreSQL integration coverage proves a sibling ID cannot revoke the selected child's enrollment. |
| Medium | Archived classes still exposed code and roster actions, and could become the material form's selected fallback. | Archived cards now hide operational actions; only active classes can be selected for publishing. Component regressions pass. |
| Medium | A wrong class-code encryption key could pass generic health checks and fail only when a teacher opened a class. | Startup now decrypts one stored encrypted class code and refuses readiness when the configured key is incompatible. Three readiness tests pass. |
| Medium | An idempotent retry was validated against the current class code before its prior request was replayed. A rotated code could therefore break a legitimate retry. | Replay lookup now precedes class-code validation after student ownership is established. Disposable-PostgreSQL coverage includes replay with a no-longer-valid code. |
| Medium | Backup files depended on the caller's permissions and checksums used location-sensitive paths. | Backup now uses a restrictive umask, `0700` directory, `0600` files and relative checksums. Restore verifies from inside the selected backup directory. |
| Medium | The development test runner had two moderate advisories. | Vitest was upgraded to 5.0.0; the complete dependency audit now reports zero vulnerabilities. Test discovery is restricted to source TypeScript tests so compiled output is not executed twice. |
| Low | Fastify's top-level request-logging option is deprecated. | The API and test server now use `LogController` while preserving the existing redaction and access-log behaviour. |

## Verification evidence

- Full build: passed, including TypeScript, web production bundle, PWA generation and API compilation.
- Full suite after build output existed: 83 files passed, 6 skipped; 502 tests passed, 34 skipped.
- Disposable PostgreSQL: 2 integration files and 6 tests passed, including teacher approval, class joining, auto-publication, transfer, sibling-ID rejection, revocation and suspension.
- Curriculum validator: 12 levels, 1,200 topics, 7,328 questions, 0 errors.
- Library validator: 3,601 materials, 0 errors.
- Dependency audit: 0 known vulnerabilities across production and development dependencies.
- Compose config, backup/restore shell syntax and `git diff --check`: passed.

## Remaining risks and release gates

1. **Medium — Class-code digest hardening.** Existing lookup digests are unsalted SHA-256. Move future and existing decryptable codes to a keyed HMAC with an explicit migration and rollback path.
2. **Medium — Authenticated browser UAT.** Production currently has no class enrollments, so parent consent, teacher acceptance and student material visibility cannot be proven end-to-end from live data. Perform this with a controlled test family after deployment, then remove the fixtures.
3. **Medium — Recovery rehearsal.** Run the new restore script against a complete isolated Compose copy and force the health-check failure branch before relying on it during an incident.
4. **Low — Frontend bundle size.** The build still warns that several content chunks exceed 500 kB. This is a performance issue, not a correctness failure; measure real mobile load before choosing more code splitting.
5. **Low — Rate-limit durability.** Auth buckets are process-local and reset when the API restarts. A shared store is required only when the service scales to multiple API replicas or needs durable abuse counters.
6. **Low — Join-code label association.** The visible label is not programmatically connected to its input through `for`/`id`. The input remains usable and exposes its guidance through the accessibility tree, but the markup should be corrected in a later accessibility pass.

## Release status

- Code release: `36cfa62` (`fix(study): harden teacher flows and production recovery`).
- Protected pre-release backup: `/mnt/data/backups/imai-study/20260913T180048`; checksum, permissions and `pg_restore --list` passed.
- The backup restored successfully into isolated PostgreSQL and its aggregate counts matched production exactly before deployment.
- The first Compose start attempt stopped API/web and then refused to remove the existing network while PostgreSQL had an active endpoint. The old API/web containers were reattached to the unchanged network and returned healthy before the deployment approach was revised.
- Rollback API/web images were rebuilt from the prior `a49af7b` commit without copying runtime environment into image metadata.
- The dedicated Study network was then recreated with the configured `172.25.0.0/16` subnet while PostgreSQL stayed running. PostgreSQL was reattached at `.2`, followed by the new API at `.3` and web at `.4`.
- Production API and web are healthy on the new images with restart count 0. PostgreSQL retained its container and restart count 0; the tunnel also retained its container and restart count 0.
- Public root and `/api/health` return HTTP 200. Public and origin HTML both reference the new `index-COn7rL0j.js` asset. Web and API ports are bound to `127.0.0.1` only.
- A synthetic production JWT confirmed student role switching returns `403 STUDENT_ACCESS_DENIED` without a replacement token. Public requests are now recorded through `trusted_nginx`; no deployment error pattern was found in the final API/web log sample.
- Chrome QA passed page identity, meaningful render, no framework overlay, no relevant application console error and navigation to `Guru Saya`. The class-code input visibly requires eight characters. A complete parent-consent/teacher-acceptance/student-material UAT remains blocked by the absence of a production enrollment fixture.
