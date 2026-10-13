# Private Tuition technical release — 14 October 2026

The booking, learning, reporting and safety release is deployed at https://study.imai.my. The complete commercial/video launch remains incomplete. Canonical TODO: 26 of 34 VERIFIED, 6 BLOCKED and 2 IN_PROGRESS. Each status has evidence or a concrete missing prerequisite; no provider success is inferred from synthetic fixtures.

## Implemented behaviour

- Guardians choose an owned child and an approved active teacher's dated slot, give consent and request a booking. Teachers accept/decline. Individual/group capacity, trial sessions, overlapping sessions and concurrent last-seat requests are enforced in PostgreSQL.
- Cancellation is available before session start. Rescheduling atomically cancels the original only when the replacement request succeeds. A teacher can close a future slot and cancel its live reservations in one transaction. Audit events and scoped in-app notifications are durable.
- Teachers assign homework and a rubric, attest no child PII in those instructions, review the latest student submission and record attendance. Student sessions submit only their own answers; guardians read their child's records. Old reviews are cleared by resubmission and stale updates are rejected.
- Homework Tutor checks the class/student relationship and uses the existing free AI integration with an honest local fallback. Known identity/contact patterns are filtered and internal homework references are replaced in provider context. A real staging request returned `gemini-free:gemini-3.5-flash-lite` using synthetic homework.
- Reports separate practice, confirmed attendance and teacher-reviewed scores. Weak-topic suggestions require three attempts and accuracy below 60%, without diagnostic claims.
- Admins publish reviewed teacher experience/qualifications with an evidence note. Parent safety reports enter private support triage. Suspended teachers lose old-session tuition access, and their slots/homework are hidden.
- Admin, student and teacher-profile section headers now size to their content. Four-role mobile screens and profile no longer inherit the global sticky, fixed-height header.

## Verification evidence

| Check | Result and limits |
| --- | --- |
| Exact lockfile install | `npm ci`; security patch lockfile, audit reports zero vulnerabilities |
| Full regression with disposable PostgreSQL | 104 files, 589 tests passed; both EXAM/CHALLENGE database variables set |
| Earlier overloaded run | Three timing failures while two Docker builds ran concurrently; unchanged tests then passed with builds completed. No timeouts or assertions were weakened |
| Typecheck/build | Web/API/PWA successful; Docker API/web built from the candidate |
| Curriculum/library | 12 levels, 1200 topics, 7328 base questions +1440 additional; library 1200 units, 3601 materials, 7200 new questions; no validator errors |
| Hosted CI | Initial source snapshot [Study verification](https://github.com/askmenoob/study/actions/runs/38455686380) passed install, build, both validators and all 589 tests |
| Four-role staging UAT | Booking/acceptance, two-child isolation, homework submission/85-point review, real AI response, admin publication/private support resolution, suspension/reactivation passed; no page errors or HTTP5xx |
| Responsive verification | Chrome 1440×1000 and 390×844; four roles + teacher profile have no horizontal overflow; header content containment asserted. Labels/focus/basic controls checked; no full WCAG certification claimed |
| Production smoke | Local/public API health and public HTTP200; new tuition routes unauthenticated401; production login rendered. No production user fixture writes |
| Preservation | Shared Cloudflare diff compared byte-identical; PostgreSQL and tunnel container IDs unchanged |
| Backup/rollback rehearsal | Protected production backup `20261014T032455` checksum PASS; restored to isolated PostgreSQL, data structure and previous API health PASS. Rehearsal containers/network removed; production database not restored |

The server feature commit is `b6badfa`, following baseline `39f3d46`. GitHub began as an empty public repository, so its root snapshot `3fbf776817b26088cd4e8ac4a20f5528fcf8b512` deliberately excludes earlier server history, private checkpoints, secrets and host-specific tunnel configuration. Subsequent responsive/documentation updates preserve this separation. The source README explains the generic tunnel template.

## Incomplete acceptance criteria

| TODO | Status | Required work/prerequisite |
| --- | --- | --- |
| PT-018 | BLOCKED | Video provider and participant-only room/token implementation |
| PT-025 | BLOCKED | Approved packages, teacher rates, platform commission/fees; billing, invoice/receipt implementation |
| PT-026 | BLOCKED | ToyyibPay sandbox secret/category; durable ledger, webhook/checkout integration and real sandbox acceptance. Current adapter has six synthetic tests and is inactive |
| PT-027 | BLOCKED | User policy is no refunds. Reconciliation, teacher payout and tax/payment records still need the commercial flow |
| PT-028 | BLOCKED | Consent-aware email/WhatsApp delivery provider/configuration and payment notifications. Only in-app notifications are implemented |
| PT-029 | IN_PROGRESS | Application/moderation/safety/suspension implemented; full external-teacher identity evidence and KYC verification criteria remain |
| PT-030 | BLOCKED | Retention periods for tutor/support/application evidence and corresponding approved purge/hold behaviour. Role/consent/minimization/child deletion are implemented |
| PT-034 | IN_PROGRESS | Technical release notes/manual/TODO sync delivered; complete video/commerce/governance support acceptance remains |

Production makes no tuition charges. The ToyyibPay client rejects live mode and is not registered as a checkout or payment callback route. Secrets must stay in protected files, never in source, the Sheet or chat. The existing Study free-AI-only policy remains enabled.

## Operator references

- `PRIVATE_TUITION_OPERATIONS.md`: booking, homework, consent, support, provider boundaries and rollback.
- `PRIVATE_TUITION_PRIVACY_REVIEW.md`: inventory, child-delete behaviour and pending retention decisions.
- `PRIVATE_TUITION_DESIGN.md`: four-role layout and interaction contract.
- `PRIVATE_TUITION_TODO.md`: synced 34-row checklist and per-row evidence.

Use the saved pre-release API/web image tags for an application rollback while retaining the additive tuition tables. Any production database recovery must use the protected backup/restore procedure after a separate explicit operational decision.
