# Guided AI Tutor release candidate

## Historical candidate record

The evidence below records the initial tutor candidate `47bf0ff`, before the exam release. The combined Tutor/practice release is now deployed at code commit `24b9858`, above exam/PWA baseline `5dc7dad`. See [the current production release record](TUTOR_PRACTICE_PRODUCTION_RELEASE_20260909.md) for exact images, deployment evidence and remaining UAT limits. Statements below about undeployed candidates and old production images describe that earlier snapshot only.

## Release scope and status (initial candidate)

This candidate strengthens the existing Study tutor: explain a concept, ask the learner to try, then use their actual reply for the next hint. It is based on `072c82d` in branch `codex/study-tutor-guided-20260909`, in the isolated worktree `/tmp/imai-study-tutor-guided-20260909`.

The production web remains the combined PWA/reference release `4d6ae6f`, image alias `imai-study-web:sources-4d6ae6f`. The main worktree remains clean at `072c82d` (documentation commits after that production release). No candidate has been deployed. Main working-tree files and production containers were not changed for this task. Deployment requires the user's requested release coordination.

## Resulting behavior

- Learners can select a subject and an eligible original Study note, or open the tutor directly from a note/reading in Library.
- The panel displays the selected note and the excerpts supplied to the tutor. The label describes supplied context; it does not certify that every generated answer is correct.
- The first exercise response teaches or gives a next step. Hint requests continue guidance. After initial guidance, an explicit request for worked steps can show a solution. Concept questions can receive a direct explanation.
- Single-character answers are accepted. Supported deterministic maths retains the exercise across turns, handles incorrect final answers and offers two hint stages. Equivalent fractions are accepted without floating-point rounding errors. Final answers are checked; arbitrary intermediate working is not automatically graded.
- The local maths grammar is deliberately bounded: one binary arithmetic operation, fraction addition/subtraction, and simple integer-coefficient equations of the form ax +/- b = c. Unsupported expressions fall through to the cloud/general tutor instead of parsing a misleading prefix.
- A new conversation, subject, resource or profile resets the panel and cancels its pending request. Late responses from the previous context are ignored. Network errors expose retry without duplicating the learner's message.
- When cloud AI is unavailable, the response explicitly identifies local guidance. Notes remain readable. No new AI provider, payment setup or Experiential Labs integration was added.

The existing Gemini project's free-only/billing-disabled requirement remains unchanged. Application routing does not independently control the provider's billing setting. TTS behavior, quiz content, parent controls, focus authorization and the explicit Workbox activation configuration are retained.

## Content and conversation boundaries

`server/studyNotes.json` contains the same eleven original Study note/reading records previously embedded in `src/data/resources.ts`; the frontend and API now share this source. A before/after content comparison passed. Practice question sets and answers are not moved into this source. Link-only third-party references are not fetched or ingested.

Explicit resources must match the student's actual curriculum stage, subject and any resource-specific level restrictions. A forged request level cannot override the owned student profile. Automatic selection uses bounded topic/keyword matching and supplies at most two excerpts, each at most 1,800 characters. It is a small reference-backed pilot, not complete curriculum coverage or a general document retrieval system.

History is scoped by owned student, conversation UUID, subject, topic and resource. The API loads at most twelve completed exchanges from the last two hours; Gemini receives at most the last six individual messages (three exchanges). The local maths flow can use the loaded history. Legacy clients without a conversation UUID retain a separate null scope. Existing per-parent request limits remain, and concurrent requests in the same conversation are rejected by a process-local guard. Multi-instance distributed locking is outside this release.

No account ID or structured profile identity field is passed to Gemini. Known student names and common email/phone/MyKad patterns are scrubbed from dialogue. This is a limited filter, not a guarantee for arbitrary personal information typed into a message. Server-side tutor logging continues; the panel does not save chat text in localStorage.

## Database and build changes

The API adds nullable `conversation_id uuid` and `resource_id text` columns plus a history lookup index to `tutor_logs`. The migration is additive and idempotent, with no profile, attempt or existing log rewrite/deletion. It was exercised against an isolated legacy-schema test database, including an API restart. Production migrations have not run.

The web Docker build now copies `server/studyNotes.json`, and TypeScript copies the same JSON into the API build. Existing npm dependencies and lockfile are unchanged.

Built candidate images, not running production services:

- `imai-study-web:tutor-candidate-20260909`
- `imai-study-api:tutor-candidate-20260909`

## Verification evidence

All results below apply to this isolated candidate, except the explicitly described read-only production comparison.

| Check | Result |
| --- | --- |
| `npm test` | 140 tests passed across 20 files |
| `npm run build` | Frontend and API type checks/builds passed |
| `node scripts/validate-pwa.mjs` | 30 distribution artifact checks passed |
| `python3 scripts/test-tutor-integration.py` | 83 HTTP/database assertions passed; 16 successful tutor requests |
| Candidate API and web Docker builds | Both passed; built API imports the shared notes |
| Candidate Nginx configuration on the existing app network | Passed |
| Candidate web HTTP validation on a temporary localhost port | 44 PWA/header/asset checks passed |
| Three synthetic live Gemini requests | Concept explanation, first word-problem guidance and follow-up hint passed the observed teaching checks; 0.9-1.3 seconds in this small sample |
| Original note-content comparison | Eleven shared records preserved |
| `git diff --check` | Passed, including release documentation |
| Read-only production comparison | Main worktree clean; active web image matches `sources-4d6ae6f`; existing web/API/PostgreSQL/tunnel container IDs and restart counts unchanged |

The API integration suite uses generated parents/students in a uniquely named temporary database and API container. It covers ownership, forged levels, resource eligibility, conversation/profile isolation, one-character answers, wrong/correct maths attempts, unavailable-AI notices, revoked/expired focus sessions and migration compatibility. The container, database and temporary protected environment file were cleaned up. The temporary web validation container was also removed.

The three live requests used synthetic academic text and the existing protected Gemini secret. These observations are not an accuracy guarantee, load test or latency SLA. No student identities were used in those probes.

### Remaining UAT

Rendered browser interaction and physical-device UAT are not complete. The available browser blocked the isolated localhost preview with `net::ERR_BLOCKED_BY_CLIENT`. The Browser skill prohibits bypassing that block with another browser-control mechanism without authorization. Component rendering/escaping tests and HTTP checks do not replace interactive UAT.

After coordinated deployment or an approved reachable staging URL, verify:

1. Open an eligible Library note with the tutor; confirm note context and supplied-source text.
2. Ask a maths exercise, submit a wrong final answer, ask for a hint, then request worked steps. Repeat with a Gemini-backed word problem.
3. Switch profile/subject or start a new chat during a pending response; confirm no stale text appears.
4. Check the same flow through a child's study link; parent-only controls and external-reference focus gating must remain enforced.
5. Reload an already-open Study tab, verify it receives the new assets, and check mobile layout and the existing Android installation control.

## Coordinated deployment handoff

The deployment target is the candidate API and web together. The API startup applies the additive tutor-log migration. Keep PostgreSQL and the tunnel in place, preserve the protected free-tier configuration, and avoid redeploying an older PWA/reference image. Record the final commit and image IDs at handoff; the candidate tags above are currently built artifacts only.

Before deployment, confirm the main HEAD/production image still match the coordination baseline, preserve rollback image references and follow the existing backup procedure. After approval, merge/cherry-pick the reviewed tutor commit, deploy only API and web, then run health, public artifact checks and the interactive UAT above. A rollback should restore both prior app image references; the nullable added columns can remain without deleting any data.
