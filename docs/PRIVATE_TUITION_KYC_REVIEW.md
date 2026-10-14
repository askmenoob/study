# Private teacher evidence review — 14 October 2026

This slice implements structured private review records for PT-029. It does not claim real teacher KYC acceptance, official accreditation or a complete identity-verification policy. Those still require the operator's approved evidence process and genuine evidence.

## Admin workflow

Open **Permohonan guru → Bukti semakan KYC** on a pending, approved, rejected or needs-info application. Review actual evidence through the operator's approved external channel, then store only an opaque internal case reference and a concise method/result note. Never paste document numbers, scans, phone numbers, email addresses or document URLs.

The reviewer chooses **Bukti disemak**, **Perlu maklumat** or **Bukti ditolak**. The reviewed decision requires all three checks: applicant identity; school/qualifications/teaching scope; impersonation/duplicate-account/safety terms. This records a human review using the existing approval checklist. It does not perform those checks automatically or define an external KYC standard.

Every saved decision appends an immutable application version, authenticated reviewer ID, server timestamp, case reference, note and checklist. The UI shows the latest 20 decisions; earlier records remain in the database. Review notes stay out of public teacher profiles and learner routes. Evidence decisions do not modify application approval, teacher roles or suspension state; operators use the existing approval/suspension controls separately.

## Consistency and privacy boundaries

- Both routes require the live super-admin role; the repository checks it again while holding a shared role lock. Revoked admin tokens cannot read or write evidence.
- A shared application lock stabilizes the reviewed source; an advisory lock serializes competing evidence writes. A stale expected version returns `VERSION_CONFLICT` without overwriting an earlier decision.
- SHA-256 fingerprints cover the application source, including submission identity and teaching fields. Routine approval status/review metadata are excluded. A changed application or resubmission marks the existing review **Permohonan berubah — semak semula**; an old-form write returns `APPLICATION_CHANGED`.
- The request key deduplicates uncertain retries with the same reviewer and normalized payload. A changed payload with that key returns `IDEMPOTENCY_CONFLICT`.
- Reads and writes are `private, no-store` and vary by Authorization. Unexpected errors return a generic response and log no evidence payload. The input validator rejects common contact/document-number patterns; that is a guardrail, not comprehensive PII detection. Operators must still keep the note free of sensitive details.
- `teacher_kyc_reviews` is additive, append-only through the API and cascades with the application. There is no upload endpoint, external message or automatic purge. Minor/support/teacher-evidence retention periods and any legal hold policy remain undecided under PT-030.

## Verification

Five real PostgreSQL tests cover admin-only access, incomplete checklist/PII-pattern rejection, append history, retry idempotency, concurrent-review conflicts, changed-application invalidation and live role revocation. Three API tests cover denied roles, strict input, cache boundaries and sanitized errors. The complete suite passes 605 tests in 107 files after integrating the existing Smart Academy UI release with both disposable database settings enabled.

Browser staging exercises two admins against the real API/database: reviewed evidence save, stale second-admin rejection with draft retained, reload and next-version needs-info decision, preserved history, parent denial, and desktop/mobile form rendering. All evidence is synthetic. The fixture does not verify a real teacher's identity.

Vitest excludes `.ai/**` because that private directory holds a separate publication checkout and QA artifacts. Without that exclusion it also discovers duplicate tests from the copied checkout. The exclusion does not remove any tests in the authoritative `src`, `server` or other project source directories.

Rollback: the previous application ignores the new review table. Preserve the table and audit records during application rollback. A database recovery follows the protected backup procedure; do not delete review history to recover an application version.
