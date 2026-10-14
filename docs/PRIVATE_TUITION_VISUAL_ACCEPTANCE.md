# IMAI Smart Academy — Visual Acceptance Contract

Reference: user-approved 16:9 image "IMAI Smart Academy — Gambaran Aplikasi Siap", produced October 14, 2026.
Audience: Pelajar, Ibu Bapa, Guru IMAI/Guru Luar, Admin. Desktop + responsive Android mobile.
The image is concept art; it is **not** a pixel-accurate Figma source. Sample metrics, payment records, AI teacher portraits and mockup dates are illustrative only.

## Invariants
- Never fabricate live classes, student attendance, income, test scores, dates, fees, notifications or financial/teacher verification claims. Use real API data, honest empty states and clearly labeled unavailable functionality.
- Preserve all prior revision-study features, primary vs secondary learning differentiation, student session locks and parent authorization, and free cloud AI policy.
- Accessible keyboard focus/skip links, readable contrast, safe-area mobile nav, no horizontal clipping at 390px, desktop min 1280px.
- Existing environment, tunnel, secrets, and unrelated worktree changes are **not** part of UI release.

## Target surface / implementation
| Role | Mockup elements | Implementation | Verification requirement |
| --- | --- | --- | --- |
| Shared | Royal-blue + white cards, cap logo, premium SaaS sidebar, top bar, responsive menu | AcademyChrome.tsx/css; existing role shells reused | Production desktop/mobile screenshot and functional link clicks |
| Pelajar | Welcome banner with illustration, quick tiles, class list, homework, tutor and real progress | AcademyWelcomeBanner + AcademyStudentActions + StudentTuitionOverview + LearnerDashboard | Login as actual student fixture, refresh, switch screens, tutor, class controls |
| Ibu Bapa | Multi-child selection, real subject mastery, class bookings, notifications and homework | AcademyParentInsights + ParentDashboard + ParentTuitionOverview | Test 0, 1, 2 children, attendance, scheduling, cross-parent data isolation |
| Guru | Brand sidebar, mobile tabs, teaching metrics, slot list, material submission & assignments | AcademyWorkspaceNav + TeacherDashboard + TeacherTuitionSummary | Approved Guru IMAI and Guru Luar login, submit/approve slots, availability |
| Admin | Unified sidebar, teacher approval, aggregate KPIs, triage and audit | AcademyWorkspaceNav + AdminFeedbackInbox + AdminTuitionOverview | Super admin login, teacher approval, in-review/resolve, audit log, non-admin denied |

## Non-equivalence to illustrated art (must not hide)
1. The original concept art includes stylized teacher/child portraits. Current UI uses iconography and original IMAI artwork, rather than unauthorized/synthetic depictions of real users.
2. Future-state chat/video calls, payment gateway/payout, automatic receipts and teacher earnings must not be shown as working before backend + sandbox/production integration and UAT.
3. Mockup values (e.g., 86 teachers, 312 classes, 92% attendance and April 2025 dates) are **not actual**. Every KPI must be real or explicitly unavailable.
4. Exact pixel parity requires editable design source, font/image assets, responsive variations and real screenshot-side comparison; generated pixels alone are not code. Treat visual parity as open until reference-based screenshot QA is performed.

## Final release gates
- [ ] Both desktop (1440x900) and mobile (390x844) screenshots for each role inspected against reference
- [ ] Keyboard focus + long names, blank data, API errors, 2+ children, large class lists
- [ ] Actual role-based browser UAT (Pelajar/Ibu Bapa/Guru/Admin)
- [ ] Accessibility labels and touch targets checked; voice remains restricted to Years 1-2 by existing policy
- [ ] Payments: sandbox signed-webhook/idempotency and payouts; deploy only with authorized provider configuration
- [ ] True video-class integration and student-safety/privacy review
- [ ] Grade-curriculum regression suite and backup / rollback rehearsal
