# IMAI Private Tuition — Canonical TODO (Konsep C)
Tarikh mula: 2026-10-13 | Projek: study.imai.my | Source: /mnt/data/projects/imai-study

## Prinsip / skop
- Upgrade **secara tambahan**, kekalkan ulang kaji, silibus KSSR/KSSM/STPM, AI Tutor, akaun keluarga, PWA serta rekod kemajuan sedia ada.
- Dua kategori guru: **Guru IMAI** (dilantik/dikelola IMAI) dan **Guru Luar** (guru persendirian diluluskan). Kedua-duanya mesti melalui pengesahan, moderation dan privasi murid.
- 4 role/UI: Pelajar, Ibu Bapa, Guru, Admin. Responsive desktop + mobile menurut mockup IMAI Smart Academy (biru lembut, putih, oren; cards; navigasi).
- STATUS: PENDING | IN_PROGRESS | VERIFIED | BLOCKED. Hanya VERIFIED selepas semakan kod + test + bukti runtime; graf kemajuan berdasarkan nombor VERIFIED / total.
- Jangan masukkan nama/email/telefon pelajar dalam public teacher directory; UI contoh bukan data produksi. Pengguna bawah umur hanya melalui akaun penjaga.
- Tiada pembayaran/autobooking sebenar sebelum transaction safety, idempotency dan UAT. Tiada pembekal AI berbayar (polisi Study).

## TODO Utama
| ID | Fasa | Tugasan / acceptance criteria | Status |
| --- | --- | --- | --- |
| PT-001 | 0 Audit | Semak repo, branches, runtime, schema, role & laluan produksi; preserve cloudflared diff | VERIFIED |
| PT-002 | 0 Audit | Snapshot backup, baseline health + ujian, rollback checkpoint | VERIFIED |
| PT-003 | 0 Design | Tetapkan reka bentuk pelajar/ibu bapa/guru/admin desktop & mobile, design tokens, breakpoints | VERIFIED |
| PT-004 | 1 Foundation | Marketplace profile taxonomy guru IMAI/Guru Luar, disclosure jelas dan tanpa contact details | VERIFIED |
| PT-005 | 1 Foundation | Endpoint read-only direktori guru aktif diluluskan, carian/filter terhad, tiada PII | VERIFIED |
| PT-006 | 1 Foundation | Test keselamatan direktori: hanya guru aktif, tiada email, suspended tidak terpapar | VERIFIED |
| PT-007 | 1 Parent | Nav Cari Guru, senarai guru + filter mengikut subjek/tahap, keadaan loading/empty/error | VERIFIED |
| PT-008 | 1 Parent | Detail guru; pengalaman, subjek, ketersediaan, identiti guru dan CTA terhad kepada flow sedia ada | VERIFIED |
| PT-009 | 1 Student | Home dengan kelas seterusnya, kemajuan, latihan, AI Tutor, ganjaran tanpa regress | VERIFIED |
| PT-010 | 1 Parent | Dashboard multi-anak, kehadiran, aktiviti, prestasi dan notifikasi yang benar | VERIFIED |
| PT-011 | 1 Teacher | Dashboard responsive jadual, pelajar, tugasan, status onboarding & earnings placeholder berlabel | VERIFIED |
| PT-012 | 1 Admin | Dashboard pengesahan guru, ringkasan data nyata, ticket moderation | VERIFIED |
| PT-013 | 1 UI | Global layout/sidebar/mobile tab bar konsisten; aksesibel WCAG dasar & PWA | VERIFIED |
| PT-014 | 2 Booking | Jadual ketersediaan guru dengan timezone Asia/Kuala_Lumpur dan konflik waktu | VERIFIED |
| PT-015 | 2 Booking | Booking request oleh penjaga bagi anak; status pending/accepted/cancelled | VERIFIED |
| PT-016 | 2 Booking | Kelas 1-to-1 dan group dengan kapasiti serta kelas percubaan | VERIFIED |
| PT-017 | 2 Booking | Reschedule/cancel dengan audit log + notifikasi & polisi | VERIFIED |
| PT-018 | 2 Booking | Video-class integration secara selamat, link hanya kepada peserta berkaitan | BLOCKED |
| PT-019 | 2 Booking | Ujian transaksi race condition, double booking, ownership & cross-tenant | VERIFIED |
| PT-020 | 3 Learning | Homework assign/submit/review, guru feedback & rubrik | VERIFIED |
| PT-021 | 3 Learning | Jadual + kehadiran disahkan guru, parent visibility | VERIFIED |
| PT-022 | 3 Learning | AI Tutor berasaskan silibus + homework, langkah-demi-langkah & data minimization | VERIFIED |
| PT-023 | 3 Learning | Laporan perkembangan, trend/topik lemah, insights tanpa tuntutan tidak sah | VERIFIED |
| PT-024 | 3 Learning | Kandungan sekolah rendah/menengah dan gamification sesuai umur | VERIFIED |
| PT-025 | 4 Commerce | Pakej, kadar guru, komisen IMAI, yuran, invoice & resit | BLOCKED |
| PT-026 | 4 Commerce | Gateway Malaysia sandbox, signed webhooks + idempotent ledger | BLOCKED |
| PT-027 | 4 Commerce | Refund, reconciliation, payout guru, tax/payment records | BLOCKED |
| PT-028 | 4 Commerce | Notifikasi booking & bayaran dengan consent, WhatsApp/email | BLOCKED |
| PT-029 | 5 Governance | KYC guru, application & moderation Guru Luar, safety report, suspend workflow | IN_PROGRESS |
| PT-030 | 5 Governance | Role permissions, consent ibu bapa, privacy & retention review untuk minor | BLOCKED |
| PT-031 | 5 Governance | Production observability, access/error logs, rate limits, support ticket flow | VERIFIED |
| PT-032 | 6 QA & Launch | CI typecheck, tests, content checks, accessibility, mobile smoke, UAT 4 role | VERIFIED |
| PT-033 | 6 QA & Launch | Backup, staging rollout, rollback rehearsal, deployed health + production smoke | VERIFIED |
| PT-034 | 6 QA & Launch | Publish release notes, TODO sync, operator manual, support readiness | IN_PROGRESS |

## Execution milestones
M0: PT-001–003 → M1: PT-004–013 → M2: PT-014–019 → M3: PT-020–024 → M4: PT-025–028 → M5: PT-029–031 → M6: PT-032–034.

## Semakan awal (belum dinilai COMPLETE)
- Repo React 19/Vite/TypeScript, Fastify, PostgreSQL; existing parent/student/teacher/admin role, teacher approval/class enrollment, PWA/AI Tutor.
- Worktree ada perubahan **deploy/cloudflared-study.yml** dari kerja lain; jangan reset, stash atau commit fail itu dalam PT changes.
- App teacher onboarding sedia ada menggunakan school metadata; peluasan kepada tuition teacher perlu disemak sebelum menukar proses kelulusan.
- Semua gambar mockup terdahulu ialah illustrative (data dummy, tarikh 2025), bukan live records.


## Release 14 October 2026

26/34 VERIFIED; 6 BLOCKED; 2 IN_PROGRESS. See PRIVATE_TUITION_OPERATIONS.md and PRIVATE_TUITION_RELEASE_20261014.md. Statuses reflect the full acceptance criteria, including provider and operational evidence.

- **PT-001 VERIFIED**: 2026-10-14 — Audit checkout/runtime/container/schema selesai. Cloudflared dirty diff disimpan dan dibanding byte-identical selepas deployment; backup untracked kekal.
- **PT-002 VERIFIED**: 2026-10-14 — Backup produksi 20261014T032455: checksum dump/compose/env PASS. Pemulihan ke PostgreSQL terasing + API imej lama health PASS; backup produksi tidak dieksport.
- **PT-003 VERIFIED**: 2026-10-14 — Design contract empat peranan, tokens/breakpoints/state disimpan; UAT desktop 1440x1000 dan mobile 390x844.
- **PT-004 VERIFIED**: 2026-10-14 — Guru IMAI/Guru Luar disclosure kekal, profil public tanpa contact details; kelayakan/pengalaman hanya admin reviewed note.
- **PT-005 VERIFIED**: 2026-10-14 — Direktori aktif/approved dengan subject/level filters + safe projection; UAT parent cari guru/profil.
- **PT-006 VERIFIED**: 2026-10-14 — Ujian PostgreSQL + UI suspension: suspended teacher slots/homework disembunyikan dan JWT guru lama ditolak.
- **PT-007 VERIFIED**: 2026-10-14 — Parent Cari Guru, filters dan loading/empty/error tersedia; browser staging memilih guru/profil dan memohon slot PASS.
- **PT-008 VERIFIED**: 2026-10-14 — Profil guru, admin-reviewed 5 tahun/kelayakan sintetik, slot availability dan guardian CTA lulus browser. Maklumat yang belum disemak tidak direka.
- **PT-009 VERIFIED**: 2026-10-14 — Pelajar scoped study-link session: kelas seterusnya dari booking accepted, latihan/kemajuan/AI/ganjaran sedia ada; full regression 589 PASS.
- **PT-010 VERIFIED**: 2026-10-14 — Browser parent dua anak: tukar anak tanpa bocor booking/homework; laporan dan notifikasi scoped; attendance PostgreSQL.
- **PT-011 VERIFIED**: 2026-10-14 — Teacher UI slot/trial/class/assignment/review lulus desktop/mobile; earnings masih placeholder jelas tiada transaksi.
- **PT-012 VERIFIED**: 2026-10-14 — Admin summary data nyata, experience/qualification publication dan support-triage resolved + suspension/reactivation lulus UAT.
- **PT-013 VERIFIED**: 2026-10-14 — Layout/PWA build PASS; semua empat peranan tiada horizontal overflow di390px. Labels/focus/status/controls disemak; nested tuition header clipping dibetulkan. Bukan audit WCAG penuh.
- **PT-014 VERIFIED**: 2026-10-14 — Slot dated UTC + timezone Asia/Kuala_Lumpur, UI input+08; teacher lock conflicts/adjacent tests PASS.
- **PT-015 VERIFIED**: 2026-10-14 — Parent owned-child guardian consent-version + pending/accepted/cancelled idempotency; UI request/teacher accept PASS.
- **PT-016 VERIFIED**: 2026-10-14 — Individual capacity1/group1-20, trial flag; last-seat concurrency and capacity PostgreSQL PASS.
- **PT-017 VERIFIED**: 2026-10-14 — Cancel/reschedule before-start atomic, failed replacement retains original, audit+durable recipient notifications. Slot close cancels live reservations atomically. Polisi tiada refund; tiada caj.
- **PT-018 BLOCKED**: 2026-10-14 — Pautan video terenkripsi/polisi admin/participant-time-window/focus gate siap serta QA PASS. Provider/account dan kelas sebenar belum dipilih; produksi disabled.
- **PT-019 VERIFIED**: 2026-10-14 — PostgreSQL race last-seat, overlap, ownership, changed-payload idempotency, reschedule rollback, stale-role and student-delete integration PASS.
- **PT-020 VERIFIED**: 2026-10-14 — Teacher privacy-attested assignment/rubric, scoped student answer, expectedVersion reviews/resubmission; UI 85/100 + feedback persisted.
- **PT-021 VERIFIED**: 2026-10-14 — Accepted-after-start teacher attendance; parent/student scoped reads + notifications; real PostgreSQL ownership/status tests PASS.
- **PT-022 VERIFIED**: 2026-10-14 — Homework relation checked server-side + existing curriculum Tutor. Real staging provider gemini-free:gemini-3.5-flash-lite response PASS; known identity/contact filters and provider homework reference minimization tested.
- **PT-023 VERIFIED**: 2026-10-14 — Eight-week practice trends, weak topic>=3attempts/<60%, teacher homework averages, confirmed attendance; actual DB metrics tests and parent UI PASS. No diagnosis claims.
- **PT-024 VERIFIED**: 2026-10-14 — Existing primary/secondary curriculum/game paths retained; content validators and regression PASS. 12levels/1200topics, library1200units checked.
- **PT-025 BLOCKED**: 2026-10-14 — Pakej draft/approval, exact-cent commission/fees, immutable invoice/TEST receipt dan no-refund consent siap. Kadar sebenar belum diluluskan; harga QA tidak dipromosikan.
- **PT-026 BLOCKED**: 2026-10-14 — Signed callback/independent confirmation, durable ledger, checkout/recovery dan idempotency siap/diuji sintetik PostgreSQL. Secret/category dan transaksi ToyyibPay sebenar belum tersedia; checkout disabled.
- **PT-027 BLOCKED**: 2026-10-14 — Tiada refund didedahkan; balanced ledger/reconciliation CSV/duplicate-cancel-revocation holds siap. Bank/payout/tax acceptance memerlukan keputusan/account/bukti sebenar; tiada transfer.
- **PT-028 BLOCKED**: 2026-10-14 — Consent OTP/encrypted outbox booking-payment/withdrawal/TLS SMTP opt-in/quarantine siap/diuji sintetik. Provider/account/destinasi belum diluluskan; WhatsApp disabled, worker produksi off, tiada mesej luar sebenar.
- **PT-029 IN_PROGRESS**: 2026-10-14 — Approval/application/moderation, laporan keselamatan private queue, admin-reviewed pengalaman/kelayakan dan suspension/reactivation lulus UAT. Bukti KYC Guru Luar serta kriteria verifikasi identiti lengkap masih diperlukan.
- **PT-030 BLOCKED**: 2026-10-14 — Admin versioned policy/holds dan count-only retention preview siap. Open support/current KYC excluded. Tempoh/wording belum diluluskan; defaults null, deletionEnabled=false, tiada purge.
- **PT-031 VERIFIED**: 2026-10-14 — Production access/error logs observed, bounded booking/slot/homework requests, error sanitization and private support queue/triage PASS.
- **PT-032 VERIFIED**: 2026-10-14 — GitHub Study verification CI; npmci build(typecheck/web/API/PWA), both content checks and 589 tests. Four-role browser/mobile UAT separately PASS.
- **PT-033 VERIFIED**: 2026-10-14 — Production api/web deployed; DB/tunnel IDs unchanged. API DBhealth/freeOnlytrue, publicHTTP200, tuition unauth401; isolated rollback restore PASS.
- **PT-034 IN_PROGRESS**: 2026-10-14 — Release teknikal, manual operator, bukti QA dan TODO sync disediakan. Support penuh bagi video/commerce/KYC/retention belum boleh diterima sehingga baki kebergantungan selesai.


## PT-029 structured evidence slice — 14 October 2026

Private admin evidence registry, append-only review versions/checklist/case reference, retry idempotency, concurrent-review protection and application-change invalidation implemented. Full integrated suite: 605 tests/107 files PASS. Two-admin staging browser flow, history, draft retention, parent denial and desktop/mobile checks PASS. Existing Smart Academy release 9685c91/5d0a735 preserved. PT-029 remains IN_PROGRESS until approved real-evidence verification and acceptance are supplied; retention remains PT-030 BLOCKED. See PRIVATE_TUITION_KYC_REVIEW.md.
