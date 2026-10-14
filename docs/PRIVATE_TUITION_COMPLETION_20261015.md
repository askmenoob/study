# Finance and messaging completion before full app acceptance

The user requested completion of remaining coding before the joint full application test. This change implements the remaining scoped finance/messaging interfaces and a plain-language admin configuration summary. It does not activate external providers or conduct a paid/live acceptance test.

## Implemented behavior

- Teacher-private sandbox ledger allocations/statements/CSV and payout-draft history replace the static financial placeholder. Scope/teacher status are rechecked and pupil/guardian identities are excluded.
- Admin payout preparation uses immutable confirmed ledger credits, expected versions, request replay protection, booking/attendance/role checks and exclusive allocation reservations. Draft/prepared/cancelled histories survive cancellation/child deletion. No bank transfer, paid-state mutation or caller-supplied payout amount exists.
- Admin accounting CSV includes complete periods of up to 31 Malaysia-calendar days, exact allocations/holds and ledger imbalance. Exports over 10,000 records reject instead of silently truncating. This is an accounting-review record, not a tax form or bank instruction.
- Optional Meta Cloud API sender uses approved-template configuration, possession-verification OTP and static generic booking/payment templates; provider/account/template creation is external. It is disabled by default and sends no real messages during verification.
- Raw-body signed WhatsApp callbacks validate the configured phone channel and record only known message statuses. Replay/out-of-order protection preserves delivered/read status. Names, phone numbers and incoming messages are not stored. Query credentials are excluded from the new Nginx webhook access record.
- Admin Persediaan aplikasi separates available settings from actual payment/class/delivery/KYC/privacy acceptance, without displaying credentials or secret-file paths.
- The existing video-link write/suspension deadlock was reproduced as PostgreSQL 40P01 with a deterministic concurrent transaction. Profile-before-role locking fixes it; the same ordering protects the new payout preparation path. Focused regression checks now reject the suspended teacher cleanly.

## Verification and limits

Focused real-PostgreSQL and HTTP/transport checks cover ownership, concurrent reservations, request replay, stale revisions, attendance/teacher changes, child deletion, balanced allocation snapshots, date boundaries, CSV formula injection, disabled providers, exact destination confirmation, signed raw callbacks, malformed/excessive bodies, event replay and out-of-order delivery states. Technical regression/build/CI and focused new-panel browser evidence are recorded in the canonical release log after final verification.

The existing overview test's "Belum ada transaksi" expectation was intentionally updated: a global static claim is no longer appropriate once an account-specific ledger view exists. The no-invented-earnings checks remain. No assertion or timeout was weakened to hide a product failure.

Full joint four-role app acceptance is the next stage, after this source release. Actual provider payments/meetings/messages, teacher identity evidence, approved rates/fees/retention rules, bank payouts and tax acceptance still need genuine accounts, decisions and evidence. Payout preparation does not implement an automated live payout gateway; retention preview does not implement a destructive purge. The canonical commercial TODO must retain these limits instead of marking synthetic evidence as VERIFIED.

Read [PRIVATE_TUITION_PROVIDER_OPERATIONS.md](PRIVATE_TUITION_PROVIDER_OPERATIONS.md) for operator prerequisites. Preserve prior production images, the shared tunnel diff/backups and PostgreSQL/tunnel containers during release. Existing private QA/pilot data and its af74d74 web snapshot are preserved; do not seed production with finance fixtures.
