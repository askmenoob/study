# Private Tuition operator guide

14 October 2026. This guide describes booking and learning. The current sandbox commerce, private video-link, notification consent and retention-preview implementation is documented in [PRIVATE_TUITION_PROVIDER_OPERATIONS.md](PRIVATE_TUITION_PROVIDER_OPERATIONS.md). Provider activation, real payments, account changes and actual external test sends still require their operational prerequisites.

## Booking

1. Approve a teacher application through the existing admin workflow. Verify the teacher identity and teaching scope before approval; an attestation alone is not KYC evidence.
2. The active teacher creates an owned class, then publishes a dated slot using Malaysia time. A slot lasts 15–240 minutes, is at most 180 days ahead and has one seat for individual teaching or up to twenty for a group. Trial sessions are explicitly labelled.
3. The guardian selects the child and teacher slot and attests consent. A pending booking reserves capacity and the child's time. Only its teacher can accept or decline it.
4. The guardian or teacher can cancel before the session starts. A guardian can request another slot before the original starts; the replacement is pending and requires acceptance. The original cancellation and replacement request are one database transaction. An unavailable/full target leaves the original unchanged.
5. Closing a future slot cancels all its live reservations in one transaction. The UI asks the teacher to confirm. In-app events notify affected guardians and the teacher. Started sessions cannot be closed or cancelled by this flow.
6. The teacher records attendance only on accepted bookings after session start. Parents and scoped students can read the saved record. Attendance changes append audit events.

The business instruction is **no refunds**. This release creates no charges and has no active checkout. The no-refund instruction must also appear before checkout when commerce is enabled. Cancellation eligibility is currently before session start; any further business cutoff needs an explicit policy.

## Homework and reports

- Teachers assign plain-text homework and a visible 100-point rubric to their owned active class. They attest that instructions/rubrics contain no pupil personal data. The attestation is stored.
- Learners can read homework through an active class connection or an accepted tuition session related to the assignment. A historical session does not grant access to future class homework.
- Only the scoped student session submits an answer; guardians read it. A teacher reviews only their own submissions. Every submission/review checks the expected version. A resubmission clears the previous mark and feedback so an old review is never presented as current.
- Homework AI help verifies the student/class relationship before loading its context. It uses the existing free AI service and local fallback. Known student identity/contact patterns are filtered; the internal homework ID is replaced in provider references. The source remains teacher-authored content, not a claim of official curriculum endorsement.
- Parent reports separate attendance, teacher-reviewed homework scores and practice records. Weekly practice covers eight weeks. Suggested review topics require at least three attempts and accuracy below 60%; these are practice indicators, not diagnoses.

## Notifications and support

In-app notifications are durable database records and scoped to their recipient. Marking one read cannot affect another user's record. These notifications are not email/WhatsApp deliveries. Use the existing feedback ticket and admin triage workflow for support. Never copy child details into public responses.

Booking creation is limited to 30 requests per guardian per hour; slot publication to 60 per teacher per hour; homework assignment to 30 per teacher per hour. Database locks serialize reservations and state changes. Error responses contain stable codes; unexpected database details are excluded from tuition error logs.

## ToyyibPay boundary

The repository includes a sandbox client following https://toyyibpay.com/apireference/ as checked on 14 October 2026. Checkout, callback confirmation and a durable sandbox ledger now exist and are tested using synthetic gateway responses. Production checkout remains disabled without approved configuration; no actual provider transaction has been verified.

Required future protected configuration: `TOYYIBPAY_MODE=sandbox`, `TOYYIBPAY_SECRET_FILE` (regular file, mode 600), `TOYYIBPAY_CATEGORY_CODE`, HTTPS callback and return URLs. Live mode is rejected by this client. Do not put secret values in the TODO, logs or chat.

A provider HTTP 200 is insufficient: inspect the returned BillCode. The server validates callback hashes and independently confirms order, invoice, status and exact amount. A browser return URL never proves payment. TEST invoices/receipts, a balanced idempotent ledger and reconciliation export are implemented. Approved rates, payout/tax/bank acceptance and actual ToyyibPay sandbox verification remain outstanding.

## Release and rollback

- Run typecheck, web/API/PWA builds and the full test suite with both disposable database variables set. Run four-role staging browser UAT. The QA database is separate from production.
- Take the protected production backup with `deploy/backup.sh`, verify checksums and retain the class-code encryption key separately. Do not export production backups into the local chat outputs.
- Preserve the existing Cloudflare configuration diff and its untracked backups. Rebuild only API/web with `docker compose --env-file .env up -d --build --no-deps api web`; do not recreate PostgreSQL or the tunnel.
- Retain pre-release API/web image tags and their IDs. New tuition schema is additive. An application rollback uses the previous source/images while leaving additive tables in place. A database recovery uses the existing documented restore workflow after an isolated rehearsal.
- Verify API DB health, local and public web responses and unauthenticated denial on tuition endpoints. Staging user-flow evidence and production health evidence are separate. Record exact release results and remaining tasks in the canonical Sheet.

## Outstanding release scope

Admins can publish reviewed teacher experience and qualifications with an internal evidence note. Parent safety reports enter the existing private support queue. Suspending a teacher immediately rejects their old session's tuition requests and hides their slots and homework; staging verifies this behaviour.

Source implementation now includes inactive sandbox packages/invoices/ledger, private approved-provider video links, encrypted consent-aware notification outbox with optional SMTP, and a non-destructive retention preview. Remaining acceptance needs approved provider accounts/rates/payout/tax requirements, real external evidence/delivery, complete teacher KYC evidence, minor privacy/retention decisions and final commercial support acceptance. The integrated source suite has 644 passing tests across 115 files. Initial hosted CI had 589 tests; see the release log for each later exact commit/run. Do not mark the whole project complete from synthetic evidence.
