# Sandbox commerce and provider/governance foundations

The release adds approved-rate package drafts, immutable guardian TEST invoices/receipts, sandbox checkout and signed independently confirmed callbacks, balanced idempotent ledger, ambiguous-payment recovery, cash holds and authenticated CSV reconciliation. It adds encrypted participant-only existing video links with admin policy/time windows, adult destination consent/OTP, encrypted booking/payment outbox with an optional TLS SMTP adapter, and versioned retention policies/holds with count-only preview. Existing Smart Academy four-role UI, booking/homework/KYC and free AI remain intact.

## Candidate verification

- Full disposable PostgreSQL regression: **644 tests, 115 files passed**, both EXAM and CHALLENGE database variables enabled; no skips/failures.
- Typecheck and web/API/PWA build passed. Curriculum and library validators passed. Production dependency audit found zero vulnerabilities.
- Synthetic gateway/transport tests cover forged/incorrect callbacks, repeated confirmation, bill uncertainty/recovery, exact-cent snapshots, balanced allocations, holds after booking/teacher changes, consent withdrawal/versioning, concurrent sends and a database failure after external acceptance. Synthetic success is not provider acceptance.
- Browser QA passed real admin package approval and guardian invoice/no-refund flow, unconfigured checkout fail-closed, admin video policy/teacher link/accepted guardian and normal scoped student resolution, inactive external contact channels, retention preview without deletion and private CSV download.
- Final four-role/profile smoke passed at 1440×1000 and 390×844, without horizontal overflow or page errors. Browser checks used synthetic QA accounts/database and did not create production accounts, join a video room or send actual external messages.

## Production defaults and acceptance

Normal Compose leaves checkout and the notification worker off. Video policy starts disabled/unselected; retention periods start null and deletion is always disabled. No QA package, approved-provider policy or retention days are seeded into production. The optional provider Compose example is not loaded by default. Rollout must back up/checksum production and preserve the shared tunnel configuration, PostgreSQL and tunnel containers. Keep previous API/web images for application rollback; schema additions need not be removed for an application rollback.

The canonical TODO remains **26 VERIFIED, 6 BLOCKED, 2 IN_PROGRESS**. PT-018 requires a chosen provider/account and actual class evidence; PT-025 actual approved rates; PT-026 real ToyyibPay sandbox credentials/category/payment proof; PT-027 external reconciliation/payout/tax requirements; PT-028 approved providers/accounts/destinations and real delivery; PT-029 real KYC evidence/criteria; PT-030 approved minor retention/privacy decisions; PT-034 final commercial support acceptance. Missing prerequisites are not replaced with synthetic data.

Operator details: [PRIVATE_TUITION_PROVIDER_OPERATIONS.md](PRIVATE_TUITION_PROVIDER_OPERATIONS.md). Exact source/public commits, hosted CI, backup and deployment evidence belong to the canonical release log after verification.
