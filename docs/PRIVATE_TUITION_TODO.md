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
| PT-003 | 0 Design | Tetapkan reka bentuk pelajar/ibu bapa/guru/admin desktop & mobile, design tokens, breakpoints | PENDING |
| PT-004 | 1 Foundation | Marketplace profile taxonomy guru IMAI/Guru Luar, disclosure jelas dan tanpa contact details | VERIFIED |
| PT-005 | 1 Foundation | Endpoint read-only direktori guru aktif diluluskan, carian/filter terhad, tiada PII | VERIFIED |
| PT-006 | 1 Foundation | Test keselamatan direktori: hanya guru aktif, tiada email, suspended tidak terpapar | VERIFIED |
| PT-007 | 1 Parent | Nav Cari Guru, senarai guru + filter mengikut subjek/tahap, keadaan loading/empty/error | IN_PROGRESS |
| PT-008 | 1 Parent | Detail guru; pengalaman, subjek, ketersediaan, identiti guru dan CTA terhad kepada flow sedia ada | IN_PROGRESS |
| PT-009 | 1 Student | Home dengan kelas seterusnya, kemajuan, latihan, AI Tutor, ganjaran tanpa regress | IN_PROGRESS |
| PT-010 | 1 Parent | Dashboard multi-anak, kehadiran, aktiviti, prestasi dan notifikasi yang benar | IN_PROGRESS |
| PT-011 | 1 Teacher | Dashboard responsive jadual, pelajar, tugasan, status onboarding & earnings placeholder berlabel | IN_PROGRESS |
| PT-012 | 1 Admin | Dashboard pengesahan guru, ringkasan data nyata, ticket moderation | IN_PROGRESS |
| PT-013 | 1 UI | Global layout/sidebar/mobile tab bar konsisten; aksesibel WCAG dasar & PWA | PENDING |
| PT-014 | 2 Booking | Jadual ketersediaan guru dengan timezone Asia/Kuala_Lumpur dan konflik waktu | PENDING |
| PT-015 | 2 Booking | Booking request oleh penjaga bagi anak; status pending/accepted/cancelled | PENDING |
| PT-016 | 2 Booking | Kelas 1-to-1 dan group dengan kapasiti serta kelas percubaan | PENDING |
| PT-017 | 2 Booking | Reschedule/cancel dengan audit log + notifikasi & polisi | PENDING |
| PT-018 | 2 Booking | Video-class integration secara selamat, link hanya kepada peserta berkaitan | PENDING |
| PT-019 | 2 Booking | Ujian transaksi race condition, double booking, ownership & cross-tenant | PENDING |
| PT-020 | 3 Learning | Homework assign/submit/review, guru feedback & rubrik | PENDING |
| PT-021 | 3 Learning | Jadual + kehadiran disahkan guru, parent visibility | PENDING |
| PT-022 | 3 Learning | AI Tutor berasaskan silibus + homework, langkah-demi-langkah & data minimization | PENDING |
| PT-023 | 3 Learning | Laporan perkembangan, trend/topik lemah, insights tanpa tuntutan tidak sah | PENDING |
| PT-024 | 3 Learning | Kandungan sekolah rendah/menengah dan gamification sesuai umur | PENDING |
| PT-025 | 4 Commerce | Pakej, kadar guru, komisen IMAI, yuran, invoice & resit | PENDING |
| PT-026 | 4 Commerce | Gateway Malaysia sandbox, signed webhooks + idempotent ledger | PENDING |
| PT-027 | 4 Commerce | Refund, reconciliation, payout guru, tax/payment records | PENDING |
| PT-028 | 4 Commerce | Notifikasi booking & bayaran dengan consent, WhatsApp/email | PENDING |
| PT-029 | 5 Governance | KYC guru, application & moderation Guru Luar, safety report, suspend workflow | PENDING |
| PT-030 | 5 Governance | Role permissions, consent ibu bapa, privacy & retention review untuk minor | PENDING |
| PT-031 | 5 Governance | Production observability, access/error logs, rate limits, support ticket flow | PENDING |
| PT-032 | 6 QA & Launch | CI typecheck, tests, content checks, accessibility, mobile smoke, UAT 4 role | PENDING |
| PT-033 | 6 QA & Launch | Backup, staging rollout, rollback rehearsal, deployed health + production smoke | PENDING |
| PT-034 | 6 QA & Launch | Publish release notes, TODO sync, operator manual, support readiness | PENDING |

## Execution milestones
M0: PT-001–003 → M1: PT-004–013 → M2: PT-014–019 → M3: PT-020–024 → M4: PT-025–028 → M5: PT-029–031 → M6: PT-032–034.

## Semakan awal (belum dinilai COMPLETE)
- Repo React 19/Vite/TypeScript, Fastify, PostgreSQL; existing parent/student/teacher/admin role, teacher approval/class enrollment, PWA/AI Tutor.
- Worktree ada perubahan **deploy/cloudflared-study.yml** dari kerja lain; jangan reset, stash atau commit fail itu dalam PT changes.
- App teacher onboarding sedia ada menggunakan school metadata; peluasan kepada tuition teacher perlu disemak sebelum menukar proses kelulusan.
- Semua gambar mockup terdahulu ialah illustrative (data dummy, tarikh 2025), bukan live records.
