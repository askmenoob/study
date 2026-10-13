# Exam revision implementation — 9 September 2026

Scope: Mathematics UASA D4/D5/D6 and SPM T4/T5; preview first with publication gates. User has no licensed paper collection and asks us to find source/permission status. Real exam imports remain blocked until permission and editorial evidence exist. Original demonstration packs are a test fixture, not a substitute delivered as past papers.

Runtime baseline: 072c82d. Production account/data/API/tunnel remain untouched during implementation. Root integrates; exclusive writers described below.

## API contract

All routes authenticated using existing family/focus-session checks. A parent or student may access only a student in their own permitted scope. Avoid param `:id` (existing auth interprets it as student ID); use `:attemptId`.

- GET `/api/exam/papers?studentId=...` -> ExamCatalogue (papers matching actual stored level, recent attempt summaries). No answer keys/solutions/notes/rubrics in catalogue or paper questions.
- POST `/api/exam/attempts` `{studentId,paperId,paperVersion,mode,clientAttemptId,retryOfAttemptId?}` -> `{attempt:ExamAttempt}`. Unique student/clientAttemptId; identical retry returns same attempt; changed payload conflicts. Server creates a stable private paper snapshot. For retry, select wrong parent items and their authored alternative, guided mode only; never repeat same question as an unseen item.
- GET `/api/exam/attempts/:attemptId` -> `{attempt}`.
- PUT `/api/exam/attempts/:attemptId` `{expectedRevision,answers}` -> `{attempt}`. Revision check and row lock; reject stale edits, submitted attempts, expired simulation updates, unknown question IDs, or changed checked answers.
- POST `/api/exam/attempts/:attemptId/check` `{expectedRevision,questionId,answer}` -> `{attempt}`. Guided only; saves/freezes first response and exposes review for that item only. Simulation cannot reveal reviews before submission.
- POST `/api/exam/attempts/:attemptId/submit` `{expectedRevision}` -> `{attempt}`. Grades stored answers on server. Submission idempotent once complete. Client must save before submitting; expired timed sets submit last server-saved answers and UI must explain pending local answers cannot be counted after deadline.
- POST `/api/exam/attempts/:attemptId/self-mark` `{expectedRevision,marks:Record<questionId,Record<rubricId,boolean>>}` -> `{attempt}`. Only reviewed structure items. Scores bounded by server rubric and kept separate from automatic scores. Never official grades or teacher-approved scores.

Errors: `{error:CODE}`. 400 invalid input; 401/403 auth/scope; 404 unavailable; 409 REVISION_CONFLICT / ATTEMPT_SUBMITTED / CHECKED_ANSWER_LOCKED / SIMULATION_NO_HINTS / TIME_EXPIRED / REQUEST_KEY_CONFLICT / ATTEMPT_LIMIT_REACHED / RETRY_ALREADY_EXISTS; publication failure PAPER_UNAVAILABLE. Client should fetch latest on conflict while preserving unsynced local draft for explicit resolution. No automatic overwrite. Active drafts are capped at 100 per student. One authored retry per original attempt is enforced atomically; identical request replay remains available, including at the draft cap. Retry-of-retry is unavailable until further distinct alternatives exist.

## Publication and content

Production publishes only rights=owned/licensed with nonempty rightsEvidence, approved content review with reviewer/date, validated totals/keys/IDs/level/format. Past/trial/school paper needs real provider, year, URL and license evidence; original cannot claim an upstream year/source. All data authoring server-side. Unknown rights remain blocked even with preview enabled. `EXAM_PREVIEW=true` permits only valid owned original pending-review packs; production default false. Display explicit preview/original/pending review labels.

Six primary questions + six authored alternatives per D4, D5, D6, SPM pack. Exact level scope; no full-exam claims. Numeric answer grading accepts equivalent fractions and decimals with narrow declared tolerance; units must match where supplied. Structured items split objective final-answer marks and self-marked workings. No invented teacher review.

## Persistence, exposure and client

Additive exam table, student FK cascade, unique idempotency key, integer revision, JSONB private snapshot/state. Do not rewrite adaptive attempts. No private keys in frontend imports or API drafts. Atomic changes via transactions. Use parameterized queries.

Client local draft scoped by account identity + student + attempt. Store answers/paper public data only; session token remains existing sessionStorage. Autosave + explicit save, visible pending/saved/conflict states, online retry. Load/reconcile by revision, never silently clobber newer cloud edits. Logout removes exam drafts owned by current account; profile switch cannot render previous student's late response. Local storage failure must warn and must not claim saved. Expired focus sessions cannot continue API writes.

Props for ExamRevision: `{studentId:string, levelId:LevelId, accountKey:string, allowExternalLinks:boolean}`. Root owns App integration. Existing student home enters exam revision; classic exercises/library retained as secondary navigation until migration proven. Preview source links hidden in focus sessions. Dashboard shows separate automatic/self-marked results and retry queue, no claim of learning efficacy.

## Exclusive writers

- Root: this contract, `server/examContracts.ts`, App integration, preview setup, integration QA, final risk ledger.
- Backend agent: `server/exam*.ts` excluding contracts/catalog/content tests; additive DB/index integration. No frontend changes.
- Frontend agent: `src/components/ExamRevision*`, `src/lib/examApi.ts`, `src/lib/examDrafts*`. No App/contract/backend edits.
- Content/source agent: `server/examCatalog.ts`, `server/examCatalog.test.ts`, `docs/EXAM_SOURCE_AUDIT.md`, `docs/EXAM_LEARNING_TRIAL.md`. No runtime/migration/deployment changes.

## Evidence required

- Publication gates including missing license/reviewer and malformed pack failures.
- Exact grading: equivalent fractions, decimals, unit mismatch, invalid/non-finite values, mark tampering, bounded self marks.
- Real disposable PostgreSQL: account/student separation, draft persistence/restart, revision conflicts, duplicate creation/submission, frozen first answers, simulation hiding/time, immutable paper snapshots, retry alternatives, focus-session expiry.
- UI: UASA and SPM load/start, wrong->review->note->retry, reload resumes, offline/pending/conflict clarity, source identity, no external links in focus, narrow layout and console.
- Existing tests/typecheck/build/PWA/curriculum checks. No production migration/deployment without a concrete release review.

## Progress

- [x] Baseline verified; accepted UASA+SPM and Mathematics scope recorded.
- [x] User confirmed source/permission collection still needs research.
- [x] Source/permission audit and educator/user-test materials (zero third-party licenses obtained).
- [x] Server controls, persisted drafts and independent grading.
- [x] User flow and draft recovery.
- [x] Integrated tests and browser verification, including actual offline/reconnect/conflict and 390px layout.
- [x] Risk ledger, preview handover and unresolved evidence gates.

Evidence and restart instructions: `EXAM_PREVIEW_HANDOVER.md`. Production remains at baseline; this is a tested local preview, not a production deployment or completed past-paper library.
