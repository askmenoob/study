# Content status — IMAI Study Malaysia v1

## Current grade-alignment candidate — 10 September 2026

The historical counts and deliveries below describe earlier releases. The current
candidate is based on `acba20a` and is **not deployed**. It publishes 102 selected
grade/subject learning units, 307 Library resources (including the eight-question
fractions pilot), and 740 linked topic questions. Legacy stage-shared questions
are archived from current selection; learner history is retained. This is not
complete DSKP/STPM coverage. See `GRADE_ALIGNMENT.md` for the exact scope, age
policies, references, verification and remaining educator-review requirements.

## What v1 contains

Exam revision workstream (9 September 2026): a separate preview now implements Mathematics UASA D4/D5/D6 and SPM T4/T5, with 24 original primary items and 24 authored retry items. All remain pending educator review. No third-party past paper is licensed or imported. These items do not change the 414 legacy seed instances below. See `EXAM_PREVIEW_HANDOVER.md`, `EXAM_SOURCE_AUDIT.md` and `EXAM_RISK_LEDGER.md` for current evidence and publication gates. The public deployment described later in this document remains the older source-reference release.

- 12 learner levels: Darjah 1–6, Tingkatan 1–5, Tingkatan 6.
- KSSR/KSSM common-core subject catalog used by the MVP.
- STPM catalog separated from KSSM. The catalog contains the 23 subjects listed in the MPM STPM 2026 rules.
- Typed topics, questions, options, answer keys and explanations.
- Automated curriculum validator.

Current validator result at release:

- 12 levels
- 23 STPM catalog subjects
- 138 level/topic coverage instances
- 414 seed question instances
- 0 structural validation errors

Some seed topic/question definitions are intentionally reused across adjacent levels to exercise the adaptive engine. These counts are not a claim of 414 unique official examination questions.
## Commercial publishing rule

The seed questions in this repository are original MVP content. Do not copy textbooks, paid workbooks, official past papers or third-party question banks into the commercial product unless their licence explicitly permits it.

Before marketing any pack as “complete syllabus”, “official”, or “exam complete”, validate its topic coverage against the current DSKP / MPM syllabus and have the content reviewed by an educator.

STPM subjects without a validated seed question pack remain visible as catalog entries with an explicit “content not yet published” state. This is intentional and prevents fabricated coverage.

## Content expansion contract

Future content packs should preserve stable IDs for level, subject, topic and question. The progress engine relies on those IDs for mastery history. New packs may add questions or topics without changing the application architecture.

## Source-reference pilot — 8 September 2026

- Learning Library adds 11 external reference records: nine GuruBesar article links and two KPM document links. The records distinguish publisher, credited creator, article year, material year, answer-key checks and curriculum-review limits. All are link-only; no upstream questions, PDFs, images, ZIPs or answer keys are imported.
- References filter by exact learner level and subject. The general fractions note is an explicit editorial reading choice for Darjah 4–6, not an upstream grade assignment. No STPM reference is invented when the catalogue is empty.
- One original Library pilot contains eight fraction questions for Darjah 4, with optional hints, answer explanations and further-reading links. It is labelled not teacher-reviewed or DSKP-mapped, and not a full UASA simulation.
- The eight questions belong to Library practice. They do not change the 414 adaptive seed question instances above, adaptive mastery history, official grades or parent reports. Library answers retain the existing temporary, in-view behaviour.
- Grade filtering is added to the new pilot; pre-existing general Library seed content remains shared by stage and is described as general material. This release does not establish complete per-year syllabus coverage.
- Automated numeric checks establish one correct numeric option for each pilot item, including equivalent fractions, simplest form and units. Educator review and exact SK/SP mapping remain required before calling the pack curriculum-validated.
- Detailed sources, checks, boundaries and follow-up criteria: `docs/SOURCE_REFERENCE_REVIEW.md`.

## Production delivery — 9 September 2026

- The source-reference pilot is live on study.imai.my. Content commit `311dc86` includes the completed PWA baseline; runtime commit `4d6ae6f` also fixes inline service-worker activation so existing browser tabs can receive the new Library after reload.
- Evidence: 76 application tests; curriculum validator 0 errors; typecheck and web/API builds; 30 local and 44 public PWA artifact/activation checks. Production browser UAT verified reference filters, credits, the original eight-question pilot and zero external links during a real focus session.
- Only the web service was replaced. API, PostgreSQL and tunnel container identities and restart counts stayed unchanged. The disposable UAT account and its student/link/session rows were removed, with zero remaining test rows.
- Teacher review, exact DSKP SK/SP mapping and physical-phone UAT remain open. Library practice still does not write adaptive progress or official PBD results.

## Exam engine production delivery — 9 September 2026

- With explicit user approval, the exam engine is now live: API code `c92498e`, final web/build fix `79924b5`. Web and API were replaced; PostgreSQL, tunnel, auth signing secret and database configuration were preserved.
- Publication remains disabled for all four pending original packs (`EXAM_PREVIEW=false`): **zero approved exam packs are public**. The empty catalogue explains this and links directly to existing topic practice. This does not supersede the educator/rights gaps above or imply coverage of all years/forms.
- Fresh evidence: 179 tests, 44 public PWA checks, 15 public browser checks, authenticated public HTTP smoke, production backup restored/migrated in isolation, rollback API compatibility, and zero leftover QA accounts. Details and rollback: `EXAM_PRODUCTION_RELEASE_20260909.md`.
