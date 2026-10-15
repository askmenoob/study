# Teacher application approval concurrency — 16 October 2026

## Observable defect and correction

A teacher resubmission locks the applicant account before locking the application. Approval previously locked the application first, then requested an account foreign-key lock while creating the teacher profile. A concurrent resubmission and approval could therefore fail with PostgreSQL `40P01` (deadlock detected).

Approval now locks the applicant account before the application, using the same order as resubmission. It reads the application after any wait, so the approved profile uses the committed application fields. Missing applications retain HTTP 404, and applications already reviewed retain the existing conflict behavior. No schema, public API shape, identity criteria, provider setting or commercial policy changes.

## Regression evidence

The regression holds the first lock used by resubmission, starts approval and waits for PostgreSQL to report that approval is blocked. It then takes the application lock, updates the public name and commits. Approval must succeed using the updated name, and a later resubmission must be rejected because the application is approved. The test runs against real loopback PostgreSQL in a disposable schema; no production accounts are created or approved.

Before the correction, this regression failed with `40P01` while PostgreSQL checked the `teacher_profiles` user foreign key. After the correction, all 14 focused teacher-network/KYC tests pass.

Full integrated verification: 686 tests in 123 files, zero skips; TypeScript, web/API build, PWA and both curriculum/library validators PASS. The built API image also passes the same concurrency/committed-field probe against a fresh disposable PostgreSQL schema. Promotion evidence is recorded separately in the release checkpoint and canonical release log after completion.

## Remaining TODO acceptance

This corrects the application/approval implementation in PT-029 and supports PT-034 operational readiness. Their full acceptance remains open: real teacher identity evidence and approved verification criteria, joint production-account UAT and support acceptance are still required. The canonical totals remain 26 VERIFIED, 6 BLOCKED and 2 IN_PROGRESS.

PT-018, PT-025–028 and PT-030 retain the recorded provider, commercial or privacy dependencies. ToyyibPay checkout and the external notification worker remain disabled, video remains unconfigured, retention periods remain unapproved and no paid transactions, external notifications or destructive retention action are performed.
