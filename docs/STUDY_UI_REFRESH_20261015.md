# Study Smart Academy UI refresh — 15 October 2026

The login, learning and operational workspaces now use the existing Smart Academy royal-blue and white design language throughout. This release preserves curriculum, roles, scoped access, provider gates and financial behavior.

## User-visible changes

- Shared palette, typography, input sizing, borders, primary/secondary controls and focus treatment across authentication, primary/secondary learning, Library, Tutor, quizzes, revision, guardian reports/profiles, tuition and operations.
- Login uses the existing graduation-cap identity and a reversible password-visibility control. Favicon, Apple and installed-app assets have new filenames; installed-app theme color is blue for every role.
- Five-item mobile navigation includes a Menu entry. Every teacher/admin section remains reachable. Menus support keyboard focus containment, Escape dismissal, visible closing controls, background-scroll restoration and viewport changes.
- Teacher Profile & Settings opens the real profile/preferences section. Financial records, admin readiness and retention are directly discoverable. Selected operational links reflect the selected hash.
- Connection notices occupy their own space rather than covering forms. Nested operational and exam headers grow with their content rather than inheriting the legacy fixed-height/sticky header.

## Design contract and visual review

Reference: the existing live Smart Academy dashboards, extended with a generated coordinated design board. The board is saved outside source as `outputs/study-ui-design-reference.png`. Implementation uses real account data and existing educational assets; mockup skeleton rows, invented Add User actions, altered navigation labels, generated quiz text and a new wordmark were deliberately not adopted. Existing information architecture and user-owned content are the controlling reference.

Tokens: blue #1569e8, navy #16325a, muted #59708c, canvas #f4f8ff, white panels, borders #dce7f5; Inter/system typography; 46px fields, at least 44px principal touch controls, 10–22px radii. Semantic correct/wrong/warning colors remain distinct. Secondary students retain their age-appropriate information density within the shared palette.

Visual comparison inspected palette, heading/control typography, 244px desktop sidebar rhythm, input/button geometry, asset framing, navigation states, mobile collapse, and text wrapping. Repairs included the old black login-wordmark style, legacy purple accents, hidden mobile menu destinations, wrong teacher profile anchor, overlapping notices and inherited exam-header sizing. No added marketing claims or fake operational values.

## Verification

- Type checking and web/API/PWA builds pass. Curriculum and Library validation pass.
- Full existing suite: 675/675 tests, 121 files, both PostgreSQL integration suites enabled on the dedicated synthetic test database. Final affected checks: 27/27.
- In-app browser independently verifies the teacher mobile menu, the real profile destination and no relevant console errors. Dedicated Playwright regression (Browser plugin absent) captures 36 rendered states and 28 screenshots using synthetic accounts; loaded exam catalogue separately verified at 320×740, 390×844 and 1440×1000. No horizontal overflow, framework overlay, JS exception or server 5xx observed in the successful pass.
- Password visibility, registration-mode switching, wrong-password error, teacher/admin target existence and selected navigation, mobile menu dismissal and body-scroll restoration, all guardian navigation, normal student Library/Tutor/progress, secondary lesson → quiz → feedback → unit revision → exam catalogue exercised.
- Repeated harness logins reached the existing 20-per-15-minute authentication guard. The isolated QA API was restarted once for a fresh verification window; no production authentication limit or application protection was changed.

This evidence verifies the redesigned UI and regression checks. Joint full-app UAT, genuine ToyyibPay acceptance, real video-room delivery, external messages and actual payouts remain separate outstanding work. No QA accounts or transactions are copied to production.

## Release boundary

The production release replaces the web container only. The API image, PostgreSQL and tunnel are retained. Deployment requires a successful exact-commit CI run, a checksum-verified backup, a tagged prior web image, and unchanged shared Cloudflared configuration/backups. Post-release checks verify the new web entry/icons/theme and existing protected API boundaries.

## Detail-state completion

The follow-up carries the same palette into installation notices, generated learning links, controlled-session banners, loading/ended states, Library hover states and donation-dialog chrome. Subject marks and educational illustrations retain their semantic colors; the existing QR asset is unchanged.

The device selector now has a separate explicit label: before the fix, the label text contained every option and an exact `Peranti anak` label lookup returned zero controls; after the fix it returns one correctly associated select. All three platform guides remain unchanged in content and require no device configuration during verification.

Teacher/admin anchor navigation now moves keyboard focus to the chosen destination after closing the menu. Guardian/student drawers move focus into the new content after selection. The mobile admin table has a visible horizontal-scroll hint and a named focusable region; a real ArrowRight interaction verifies horizontal keyboard scrolling at 320px. The Library search field retains its integrated input shape rather than receiving a second field border from the shared form rules.

Additional synthetic browser evidence: 22 detail states, no JS exceptions or API 5xx, at 320/390px; device guides, teacher profile, install details, donation open/Escape, real class roster, user table, focus destinations, age-appropriate guided reader, secondary reader typography/spacing/bookmark controls, challenge introduction, and controlled session → exit request → guardian approval → ended screen. A separate 320px keyboard-scroll check passes. No audio/model call, external message, real room, payment or OS-setting action is performed. Final affected existing tests: 16/16 across three files; type checking and web build pass. Full exact-commit CI remains the promotion gate.

## Password control accessibility repair

Final in-app accessibility inspection exposed the password toggle nested inside the password label: the input name included the toggle action. The label is now explicitly associated with a stable input ID and the show/hide button is a separate control. The old production markup fails the no-nested-button regression check; the candidate passes. In-app accessibility output now names the field exactly `Kata laluan` and lists `Tunjukkan kata laluan` separately. The browser check verifies show/hide retains the typed value, never submits, and preserves registration autocomplete/help associations. Login/registration layout and no-overflow checks pass at 320, 390 and 1440px.
