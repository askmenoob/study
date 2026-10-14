# Tuition provider and governance operations

This extends the booking/homework/KYC release. The normal production Compose configuration activates no ToyyibPay checkout, video policy, email/WhatsApp worker or retention deletion. QA examples are synthetic and are never business rate/policy approvals.

## Sandbox commerce

An active super admin drafts a class-specific package by explicitly entering base cents, additional fee cents and commission basis points. No rates are preselected. Publishing requires the approved-rates attestation. Invoices require an accepted future owned-child booking, a published matching package and the guardian's `tuition-payment-sandbox-v1` no-refund attestation. A price snapshot cannot change when the package is archived or replaced. Commission is rounded down to whole cents; the teacher allocation is the remaining base cents and IMAI allocation includes the separately disclosed fee.

All invoices/receipts have TEST prefixes and sandbox mode. They are not tax invoices or real payouts. The no-refund business instruction is disclosed before invoice and checkout creation. Cancellation still uses the existing future-session rules; it never fabricates a refund.

The ToyyibPay client requires `TOYYIBPAY_MODE=sandbox`, a protected regular `TOYYIBPAY_SECRET_FILE` (mode 600), `TOYYIBPAY_CATEGORY_CODE`, HTTPS `TOYYIBPAY_CALLBACK_URL` and `TOYYIBPAY_RETURN_URL`. Checkout additionally requires `TOYYIBPAY_CHECKOUT_ENABLED=true`. Live mode is rejected. Callback confirmation can continue while new checkouts are disabled. A successful callback must match its signed hash, stored bill/order, exact amount, reference and independently queried successful provider transaction. The browser return is not payment evidence.

Before a bill network request the invoice durably enters `creating`. A failed/uncertain bill attempt becomes `review`; it cannot automatically create a second bill. Admin recovery requires a known bill code/reference and a review note; the server still independently confirms the provider transaction. Confirmed cash is recorded exactly once per provider reference with balanced debit/credit entries. Cash arriving after cancellation/teacher revocation or a second distinct payment is held in unallocated credit for manual review. These holds do not authorize refunds or payouts.

Admin reconciliation shows the most recent 200 transactions and exports a private authenticated CSV with spreadsheet formula neutralization. It is an operational subset, not a complete accounting period or external bank reconciliation. No bank transfer, payout instruction, tax filing or manual "mark paid" endpoint exists. Real sandbox credentials, an approved rate schedule and external accounting/payout requirements are needed for commerce acceptance.

## Private video links

Super admins explicitly approve one provider (`google_meet`, `zoom`, `teams`) and the opening/closing window. The default policy is disabled with no selected provider. Active teachers attach an existing meeting URL to an owned future slot. Only supported HTTPS meeting hosts/path shapes are accepted; URLs are encrypted with AES-GCM and slot/teacher-associated context using a protected `TUITION_VIDEO_KEY_FILE`, falling back to the existing class-code key. Policy/link edits use expected versions and audit records.

An accepted participant's guardian or normal scoped student session may resolve the link only during the approved time window. Teacher suspension, slot/class closure, booking cancellation, a changed provider or disabled policy immediately denies new resolution. Focus-controlled study sessions reject external URLs. The browser clears an expired link. Provider room creation, subscriptions, attendance inside the video room, meeting moderation and actual live-class acceptance require the chosen provider/account. The QA test never joined an external room.

## Consent-aware external notifications

Durable in-app booking/payment updates remain available. External contact preferences belong to the adult account; child contact management is denied. Destinations and pending message bodies are encrypted. OTP possession verification expires after 30 minutes, with five attempts and five requests per hour. No plaintext OTP/contact is returned by the API. Only new notices created after verification are queued; external bodies contain a portal link and generic update, without child/class detail. Consent withdrawal/version changes and role revocation are checked before a send.

An optional SMTP adapter exists; it does not select a provider for IMAI. Enable only after approval with `TUITION_EMAIL_PROVIDER=smtp`, `TUITION_NOTIFICATION_WORKER_ENABLED=true`, explicit host, port 465/587, user, sender and mode-600 `TUITION_SMTP_PASSWORD_FILE`. Port 465 requires immediate TLS; 587 requires STARTTLS; certificate verification is mandatory. Transport logging, attachment/file reads and URL reads are disabled. The worker runs one bounded batch at a time. Its durable `attempting` state precedes network I/O; ambiguous acceptance, timeout or persistence failure requires review and is not automatically resent. `accepted` means the SMTP server accepted the exact recipient, not delivery/read proof. No WhatsApp transport/provider is selected; that channel stays disabled.

The optional `deploy/tuition-providers.compose.example.yml` is an operator-reviewed example, not an automatically loaded configuration. It needs both named protected secret files; use a channel-specific reviewed copy when enabling only one integration. Do not put credentials in this repository, Sheets, logs or chat. Do not use the example to enable live payments. Provider send/receipt testing requires approved accounts, destinations and a deliberate test-send authorization.

## Retention review

Super admins can record independently approved nullable tutor/support/KYC day periods with a version and review note, and add/release an audited hold on an internal record ID. Defaults are unset. The preview runs in a repeatable-read snapshot and returns counts only. Open support cases and active teacher KYC applications are excluded; holds remove eligible records from the preview. `deletionEnabled=false` is always returned: no purge API or timer exists. These preview holds do not alter existing guardian child deletion or backup processes. Approved minor privacy wording, legal/accounting retention obligations and deletion/backup design remain separate decisions.

## Acceptance boundary

Synthetic PostgreSQL, transport and gateway tests verify source behavior. Browser QA proves scoped UI/API behavior. Production health proves the deployed runtime is serving and its inactive defaults remain intact. None establishes actual provider payment, external delivery, live video classroom, external KYC authenticity, business rates or final commercial support acceptance. Keep the corresponding canonical TODO items blocked/in progress until those facts are supplied and verified.
