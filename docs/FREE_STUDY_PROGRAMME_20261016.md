# study.imai.my — fully free programme

## Controlling owner decisions

On 16 October 2026 the owner explicitly changed the product to permanently free learning supported only by the existing voluntary Buy me coffee donation. This replaces the earlier paid-tuition sandbox roadmap. The owner also approved 90/365/365-day retention review candidates, with automatic deletion off and existing backups preserved.

No donation is required to register, study, book a class, use homework/reporting or access available learning features. Donations do not unlock features or confer a different learner entitlement. The original donation destination and QR asset are preserved.

## Implemented free product

Parent invoices, teacher financial statements, admin packages/payouts/accounting and financial navigation are removed from mounted screens. The runtime no longer constructs the commercial service or registers paid handlers. Twenty former commerce/finance routes are retired: authenticated callers receive HTTP410 STUDY_IS_FREE; normal access guards still run, and legacy gateway callbacks are rejected before provider-form parsing. No environment setting enables class checkout or external notification workers in this runtime. Existing historical tables/records are retained.

GET /api/program and API health explicitly state unconditional free access and voluntary donations. In-app booking/learning notifications remain the supported communication channel. Optional external-provider configuration is not a prerequisite for the free programme.

The PWA excludes /api and /api/... from its application navigation fallback. Real service-worker browser regression previously returned HTML for an API navigation; the corrected build returns actual JSON/status codes while retaining offline application navigation.

## Video rooms

PT-018 covers secure teacher-provided room links, not hosted meeting creation or an account/subscription integration. An admin selects a supported provider and join window; a teacher supplies an existing valid room. The application encrypts the link and checks accepted participant, class/teacher state and time window. Scoped normal student sessions are supported; focus sessions prohibit external links. Cancellation removes resolution access.

QA verifies that complete application flow with a synthetic supported URL. No external room was joined, no provider account created and no actual lesson or third-party room availability is claimed. Production policy remains off until an operator configures the room-link workflow for their classes. Checking the teacher's actual room and its provider controls is a per-class operating step, not evidence fabricated by this release.

## Teacher verification

The production repository now requires the latest complete identity/scope/safety review to match the current application fingerprint before approving a new teacher. Unreviewed, needs-info, rejected or stale evidence produces HTTP409 TEACHER_KYC_REQUIRED and grants no teacher profile. Approval and resubmission preserve account-before-application lock order. The admin approval button remains disabled until a current review is loaded/saved; the server rechecks after waiting regardless of the UI state.

Existing approved accounts are retained. The release does not retrospectively certify their identities or manufacture real KYC evidence. Each real application still needs the admin's genuine external review, recorded through the existing protected case-reference/checklist workflow. No identity-document uploads are introduced.

## Privacy and owner-approved retention

A public privacy dialog describes actual account/learning records, scoped class access, AI context, guardian deletion, support requests and backup separation. GET /api/privacy exposes only approved day periods, policy version and deletion state, without users, reviewer IDs, records or counts. The UI reads current approved values instead of embedding a dated policy.

The explicit operator CLI `node scripts/apply-free-retention-policy.mjs --apply-owner-approved-20261016` applies the approved 90/365/365 review periods only to the untouched version-zero policy. A separate owner-approval record preserves provenance and the prior policy; no application-admin identity is invented. Replays do not reapply defaults, and an existing operator policy conflicts instead of being overwritten. Admin edits remain versioned/audited through their existing API.

Tutor log age defines its cutoff. Support candidates require resolved triage and age from the most recent triage update. KYC candidates require rejected/withdrawn applications without active profiles, using review-record age. Open cases, current teacher applications and active holds are excluded. These are review candidates only: no purge endpoint, deletion timer or backup cleanup is enabled.

The periods are owner-approved operational choices, not statutory periods or a legal-compliance certification. The general storage principle was checked against the [official JPDP Personal Data Protection Standard](https://www.pdp.gov.my/ppdpv1/en/personal-data-protection-standard-2015/).

## TODO reconciliation

PT-025 (rates/packages/invoices), PT-026 (ToyyibPay) and PT-027 (class-money reconciliation/payout/tax) are CANCELLED by the new business model, not VERIFIED integrations. Their source implementation, historical records and tests remain for traceability; they are unreachable in the running product. All remaining tasks are evaluated against the free programme. PT-028 now covers in-app notices; external WhatsApp/email acceptance is removed from this release's scope. PT-029 evaluates the verification workflow, not the truth of any real person's identity. PT-030 evaluates the approved review policy and factual privacy surfaces, not automatic deletion or legal certification. PT-034 covers the free technical release, operator guide and support workflow.

Full joint production-account UAT with the owner follows coding, as requested. Technical QA results, provider-room limitations and production promotion evidence remain distinct in the release checkpoint and canonical Sheet.

## Verification

Four roles on desktop/mobile, actual API refusal of class money operations, original donation QR, privacy dialog focus/escape and live policy values, and a new synthetic teacher's required/stale/re-reviewed KYC flow pass browser QA with no page errors. Video-link teacher/guardian/student resolution and cancellation pass separately without joining an external room. Service-worker API navigation and offline app regression pass. Full integrated suite: 703 tests in125 files, zero skips; TypeScript, web/API/PWA build and both content validators PASS. The built API image also passes free-policy/privacy/callback/auth probes with legacy payment/worker opt-in environment values deliberately set true. Exact-commit CI, image IDs, backup and deployed checks are recorded after completion in the canonical release log/checkpoint.
