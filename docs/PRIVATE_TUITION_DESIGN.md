# Private Tuition interaction and layout contract

Updated 14 October 2026. The existing Study learner experience, family profiles, curriculum, games, PWA and saved progress remain the base. Tuition is additive.

## Four role surfaces

| Role | Desktop | Mobile | Main actions |
| --- | --- | --- | --- |
| Student | Existing Study sidebar, own upcoming sessions, homework and teacher feedback in the learning page | Existing five-item learner navigation, stacked cards | Read own sessions, submit own answer, request guided homework help; never manage bookings or payments |
| Parent | Existing family sidebar and selected child; directory and teacher profile; booking, attendance, homework report and notifications | Existing six-item parent navigation; stacked teacher profile and single-column forms | Choose child, inspect active approved teacher, consent to booking, cancel or request another time; read actual child records |
| Teacher | Portal header; teaching summary, class management, availability, requests, homework and notifications | Wrapped header and single-column forms; controls at least 44px tall | Publish owned-class slot, accept/decline, record attendance, assign rubric-based homework, review latest answer |
| Super admin | Existing teacher approval, tuition summary and feedback triage portal | Existing responsive admin navigation and cards | Review and suspend teachers, manage platform feedback; never masquerade as a guardian |

## Tokens and responsive rules

Tuition cards use white surfaces, soft blue borders and dark blue text. Blue is used for tuition discovery, orange for keyboard focus and trial/accent information. Existing user theme preferences and Study shell remain active.

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#193653` | Main tuition text |
| Surface | `#ffffff` | Forms and records |
| Border | `#d8e5f3` | Card boundaries |
| Input border | `#aabed4` | Form boundaries |
| Information | `#eef5ff` | Upcoming session message |
| Focus | `#ec7c22` | Visible keyboard outline |
| Error | `#9b1c23` on `#fff0f1` | Failed reads or writes |
| Radius | 20px desktop; 9px controls | Shared tuition cards |
| Spacing | 24px desktop; 16px mobile | Shared tuition cards |

Forms use two equal columns above 640px and one column at or below 640px. Desktop was exercised at 1440×1000 and mobile at 390×844. Tuition profile uses its existing 1120px content maximum and collapses its two-column layout on mobile.

## State and accessibility contract

- Label every input; give selects explicit accessible names. Keep loading, empty, missing and failure states separate. Errors use `role=alert`; successful writes and loading use `role=status`.
- Keep focus visible, controls at least 44px tall and document scroll free from horizontal overflow. Existing skip link, learner/parent navigation and mobile menu remain available.
- Show actual recorded status. An accepted connection is not a scheduled session. An accepted booking is not a payment. Unknown qualifications, fees and attendance remain explicitly unknown.
- Display all session and homework times in Asia/Kuala_Lumpur. Treat datetime-local inputs as Malaysia time independently of device timezone.
- Disable writes while submitting. Retain the same request key after an uncertain booking/homework result. Reject stale homework versions, rather than overwriting another answer or review.
- Booking and reschedule require explicit guardian consent. Cancelling an original booking and requesting a replacement must commit together or both roll back.
- External payment and video features stay unavailable until their provider/configuration and acceptance checks are complete. The operator has selected ToyyibPay and stated no refunds; rates and commissions are not invented.

## Verification boundaries

Browser UAT uses synthetic staging accounts and a disposable PostgreSQL database. Passing staging UAT proves the implemented interaction, rather than a live provider transaction or third-party service. Runtime/deployment evidence is recorded separately in the TODO and release log.

## Approved showcase refinement — 15 October 2026

The user reissued the approved four-role showcase as the controlling target. Compact dashboard composition, real next-session previews, recorded progress/activity, parent child-first overview, teacher teaching desk and admin application/feedback previews are implemented. All 20 required role/viewport cases pass; real QA booking/selection/authorization and 22 existing detail states pass. Full suite: 680/680 tests in 122 files, zero skipped. See STUDY_SHOWCASE_ACCEPTANCE_20261015.md for the comparison ledger, copy audit and intentional deviations. This evidence does not change the 26 VERIFIED / 6 BLOCKED / 2 IN_PROGRESS master status, activate providers, or claim the joint full-app UAT is complete.