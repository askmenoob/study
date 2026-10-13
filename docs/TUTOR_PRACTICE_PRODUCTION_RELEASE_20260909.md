# Guided Tutor and practice history production release

Released on 9 September 2026 Malaysia time (8 September UTC), following the user's explicit deployment approval. This is the current production record; earlier Tutor and exam candidate records are historical.

## Source and runtime

Main was fast-forwarded from `5dc7dad` to code commit `24b9858084f076998b98a2ee8748e3c91520281a`. The combined release preserves the exam/reference/PWA baseline, including explicit Workbox activation and readable public assets. Subsequent documentation commits do not change the deployed code or require another deployment.

| Service | Running image | Container ID |
| --- | --- | --- |
| Web | `imai-study-web:practice-24b9858` | `990e21b56320` |
| API | `imai-study-api:practice-24b9858` | `aba332b1afa8` |
| PostgreSQL, unchanged | `postgres:17-alpine` | `2856e4bedb4f` |
| Tunnel, unchanged | `cloudflare/cloudflared:2026.8.3` | `f85b5fa9904f` |

Web image ID: `sha256:f277b14cd3bd708df30bf4de24f06cdf933361dc93c61876caea787e5a871927`.
API image ID: `sha256:0518665f7bf3f2664abdff3404a6374fc18a7b909b8c80714cd0b9008940b524`.
Public assets: `index-C1YvPyr2.js` and `index-1QuTT1ZQ.css`.
Default `imai-study-web:latest` and `imai-study-api:latest` aliases also point to these exact images. Updating these aliases did not recreate containers.

Only API and web were recreated, using the existing Compose project plus an explicit release overlay, `--no-deps --no-build --wait`. PostgreSQL and tunnel retained their IDs and zero restart counts. API/web are healthy with zero restarts. The complete API environment digest and all mounts match the pre-release state. `FREE_AI_ONLY=true` and `EXAM_PREVIEW=false` remain explicit. No AI provider, secret or billing setting was changed; provider billing is not independently controlled by the application.

## Delivered behavior

- Guided Tutor uses the selected original Study note, retains bounded conversation context and supports staged deterministic maths guidance. Library can open the tutor with the note selected. Cloud responses and supplied sources are identified.
- Normal topic practice selects question IDs not yet answered in a saved session. Exhausted sets offer explicit wrong-answer or whole-set review; latest correctness removes corrected questions from wrong-answer review. Separate complete question history avoids the existing recent-session cap losing old completion records.
- Diagnostic and suggested-session behavior account for exhausted questions/topics. Offline completion and profile isolation are covered by the combined tests.

This release does not expand the authored question bank, generate replacement questions or publish pending exam packs. Aggregate legacy attempts without question IDs cannot establish exact completion. Device locking still requires OS configuration; Study focus approval does not unlock the OS.

## Verification

| Evidence | Result |
| --- | --- |
| Combined pre-deployment suite | 265 tests across 30 files passed, including 16 real PostgreSQL integration tests |
| Tutor HTTP/database integration suite | 83 assertions passed, with 16 successful tutor requests |
| Full TypeScript, frontend/API builds and both Docker builds | Passed |
| PWA distribution and served candidate checks | 30 and 44 checks passed |
| PWA checks against public production domain after promotion | 44 checks passed |
| Synthetic origin API setup | 21 checks passed: health, ownership, scoped history, exam publication gate, maths conversation, original-note Gemini response and child-link restrictions |
| Persisted browser practice results | 5 checks passed |
| Parent approval of synthetic focus-session end | 1 check passed; public browser displayed the approved end state |
| QA cleanup | 4 checks passed; exact synthetic parent and child IDs absent and private fixture removed |
| Final production audit | 24 checks passed; no structured API error/fatal events since recorded promotion |

Interactive public-browser UAT used a synthetic family and a single-use child link. Starting from two answered questions, normal practice offered only the third question. Saving it exhausted the set. Explicit wrong-answer review offered only the one previously incorrect question; correcting it removed that review option. Reload retained the correct completion state. API evidence confirmed saved session totals of 2, 1 and 1, with the sibling's history unchanged.

From Library, the fractions note opened in Tutor with the correct context. A synthetic cake word problem received a live Gemini free-provider explanation that asked the learner for the remaining parts before giving the final fraction. A separate origin concept request used the configured free provider in 1.28 seconds; this single observation is not a latency guarantee.

The same browser tab transitioned from old asset `index-CU6L1Ldr.js` to `index-C1YvPyr2.js` after two reloads without clearing storage/cache. Desktop screenshots at 1348 by 926 were inspected. Parent approval ended the child session and displayed the correct explanation about OS locks.

## UAT limits and verifier corrections

- The optional public-browser click on **Saya perlukan petunjuk** was rejected by automatic approval review because sending the follow-up could persist a tutor interaction and the review required action-time confirmation. It was not retried or replayed through another mechanism. That live UI action remains unverified; earlier automated/service guidance checks are separate evidence.
- Physical Android installation and device enforcement were not tested in this release. Existing artifact checks do not establish those behaviors.
- A Python request to the public API received Cloudflare 403/1010. Origin HTTP checks were labelled separately; the actual public browser successfully exercised the app and tutor. No WAF or network setting was changed.
- Initial mount verification compared Docker's returned array order. Sorting by destination established identical mounts; no corrective deployment was needed.
- Cleanup initially expected HTTP 401 after account deletion. The existing `/api/me` implementation returns 404 `USER_NOT_FOUND`; live response and exact database absence confirmed cleanup. No application change was needed.
- Browser console messages observed during UAT were extension metadata errors; no application-origin console errors were observed.

## Data, backup and rollback

After deleting the synthetic QA family, the monitored production counts exactly matched the pre-release baseline: 1 user, 2 students, 30 attempts, 1 focus session, 35 tutor logs and 0 exam attempts. No real profile or attempt was deleted or rewritten. The additive tutor conversation/resource columns are present.

Backup: `/mnt/data/backups/imai-study/20260909T031200/imai-study.dump`, 26,696 bytes, SHA-256 `9e35756e68b87dfe06760222f9187f247983ffbc9b2fd9ffeb8501afb2ac8167`.
The backup was restored to isolated temporary PostgreSQL. Both the new API and previous API became healthy against the migrated copy, with all 69 monitored rows preserved. Temporary containers, internal network and secret files were removed. That copy had no exam attempts; populated exam coverage comes from the integration suite.

Private operational evidence and explicit release/rollback overlays are retained at `/mnt/data/releases/imai-study/20260909-tutor-practice-24b9858-ops`. This contains the before/deployed/final manifests, restore probe and origin check results, without retaining the QA token fixture.

Rollback targets, only if required after coordination:

- Web: `imai-study-web:exam-79924b5ae895`, image `sha256:00512defe25f699af239c235d15e1ad9969f27b9c2c58658331d2dba5809704b`.
- API: `imai-study-api:exam-c92498e53f7c`, image `sha256:22071246e130f5a274b0fb47f11c1487d1a59a39ad880792d16059cde9145d4e`.

Use the recorded rollback overlay for API/web only, preserving PostgreSQL, tunnel, environment and mounts. The added nullable tutor columns can remain. Do not restore the database or remove history for an application-image rollback. No rollback was required, and no further deployment is planned for this documentation update.
