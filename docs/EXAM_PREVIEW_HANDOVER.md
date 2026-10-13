# Handover preview ulang kaji exam

**Preview terkawal siap; pengguna telah membenarkan deployment ke study.imai.my pada 9 September 2026.** Catatan ini merekodkan bukti preview sebelum promotion; status production akhir direkodkan berasingan dalam catatan release. Branch lokal: `codex/exam-revision-controls`, bermula pada `072c82d`. Code dan catatan berada dalam worktree `outputs/imai-study-exam-revision-20260909` pada workspace WSadmin.

**Update: engine sudah live pada production.** Lihat `EXAM_PRODUCTION_RELEASE_20260909.md`: release code `79924b5`, 179 tests, 44 public PWA checks, 15 browser checks dan backup/restore selesai. Publication gate kekal aktif; 0 pack diluluskan di production. Bahagian baseline production di bawah ialah rekod sebelum promotion, bukan keadaan live terkini.

## Hasil yang boleh digunakan

- Matematik UASA D4, D5, D6 dan SPM T4/T5: empat set ringkas, 24 soalan utama dan 24 alternatif dengan nota serta rubric. Semua original berbantukan AI, pending educator review. Bilangan ini bukan kertas rasmi, liputan silibus penuh atau 48 soalan utama.
- Murid masuk melalui Ulang kaji exam. Guided menyimpan dan mengunci jawapan pertama sebelum review; simulation menahan solution/nota sehingga submit. Nota boleh dibuka selepas mencuba.
- Draft disimpan pada server. Draft tempatan berscope account/student/attempt. Reload, server restart, offline/reconnect dan conflict diuji; pengguna memilih versi apabila cloud sudah berubah. Offline reload memerlukan sambungan kembali untuk memuatkan paper dan membandingkan draft, tetapi draft tidak dibuang.
- Automatic marks dikira oleh server. Jawapan pecahan setara diterima, unit diperiksa, markah client tidak dipercayai. Self-mark jalan kerja menggunakan rubric terhad dan sentiasa berasingan daripada auto score.
- Soalan ulangan mempunyai konteks/nombor/jawapan berlainan; hanya satu authored retry setiap original attempt. Cubaan ulangan seterusnya tidak dilabel baharu tanpa alternative tambahan.
- Catalogue memakai tahap sebenar daripada DB. Parent/sibling access, expiry/revocation focus, duplicate submission, revision race, immutable snapshot dan had 100 active draft/murid dikawal pada server.
- UI telefon mempunyai pilihan tukar profil, navigation boleh dicapai dan tajuk tidak bertindih. Laporan adaptive lama dilabel latihan topik; markah exam berada dalam modul exam.

## Preview dan isolation

URL lokal: **http://127.0.0.1:4195/**. Ia hanya boleh dicapai pada komputer ini. API bind `127.0.0.1:4194`; database QA yang berasingan dihubungkan melalui SSH loopback `55439`. Tiada credentials, Gemini key, database, volume atau tunnel production digunakan. Satu keluarga demo dikekalkan dalam DB QA untuk semakan manual; automated fixture accounts sudah dibersihkan. Jangan masukkan data murid sebenar dalam preview ini.

Runner di luar repo: `../run-study-exam-preview.mjs`. Ia mencipta signing key sementara dan menggunakan build `dist`/`server/dist`. Taip `restart-api` pada terminal runner untuk memulakan semula API dengan database dan key sama. Startup runner baharu menjana key baharu, maka sesi perlu log masuk semula.

**Cara masuk:** buka URL di atas dan klik **Masuk demo preview**. Akaun study.imai.my tidak disalin ke DB QA, jadi borang login biasa tidak menerima credentials production. Butang demo hanya muncul pada HTTP loopback port 4195 apabila runner mengesahkan capability. Ia memanggil login biasa terhadap fixture QA; tiada password dalam frontend dan token menggunakan sessionStorage sedia ada. Endpoint demo tidak wujud pada API production. Jika sesi lama tamat selepas runner restart, klik **Log masuk ibu bapa**, kemudian masuk demo semula.

Untuk menyambung pada mesin ini, semak listener dahulu supaya tidak melancarkan dua runner:

```powershell
ssh -N -o ExitOnForwardFailure=yes -L 55439:127.0.0.1:55439 ubuntu
# Dalam terminal lain, dari worktree:
npm run build
node ../run-study-exam-preview.mjs "$PWD"
```

DB QA ialah container `imai-study-exam-qa-db-20260909`, image `postgres:17-alpine`, had memori 384 MB, bind loopback remote 55439. Ia tidak perlu dipadam untuk menyambung preview. Untuk menghentikan preview, hentikan hanya terminal runner dan tunnel QA ini; jangan hentikan container Study production. Tiada automation atau monitor dijadualkan.

## Evidence pada candidate akhir

| Check | Keputusan dan batas |
|---|---|
| Suite aplikasi penuh | 173/173 lulus, 22 fail. Selepas satu regression retry race ditambah, 26 tests module terjejas lulus semula; inventory akhir 174 tests. |
| PostgreSQL sebenar | 12 integration tests pada schema unik; concurrent create/save/submit/retry, cap/replay, snapshot SQL constraint, expiry selepas tunggu lock, ownership dan rubric bounds. Semua schema integration dibersihkan. |
| Content | 53 tests; 48 expected answers, IDs/prompts, retry berjawapan berbeza, marks/rubric/provenance. Root menyemak kiraan; ini belum review guru/DSKP. |
| Frontend/data handling | 25 tests; draft scoping/corruption/storage failure/reconciliation, token response, focus-source links, self-mark dan source labels. |
| Typecheck/build | TypeScript web/API dan kedua-dua build lulus. Candidate deployment selepas pembaikan login preview/empty-state: `index-CU6L1Ldr.js`, CSS `index-rzxOKINo.css`. |
| Curriculum lama | 12 levels, 23 STPM catalogue subjects, 138 topic instances, 414 seed instances, 0 errors. Tidak diubah menjadi bank exam. |
| PWA | 30 artifact/activation checks lulus; offline browser reload turut dicuba. Belum pengesahan install pada telefon fizikal. |
| Full HTTP application | 11 kumpulan bukti lulus pada runner sebenar termasuk restart proses API, key privacy, equivalent fractions, duplicate request, alternate retry dan focus session tamat. |
| Browser | CUA Chrome manual: UASA salah → locked review → nota; structured auto 1/1 + self-mark 2/2; reload/resume; submit; alternate retry menerima 3/6 sebagai 1/2. Buka Mod Murid SPM terus ke catalogue exam dengan kawalan ibu bapa tidak dipaparkan. Build akhir dimuatkan selepas service-worker update, tanpa clear storage. |
| Browser failure/recovery | Playwright bundled dengan Chrome headless, context berasingan: 8 kumpulan bukti lulus pada 390×844 dan 1280×900. Offline edit/reload, reconnect, conflicting second-client write, explicit local choice, UASA note, SPM simulation/submit, retry dan logout cleanup. |
| Paparan/console | Halaman bermakna, tiada framework overlay, 0 uncaught app errors; header controls muat dan tajuk tidak overlap. Network errors ketika offline disengajakan direkod berasingan. |
| Frontend key exposure | 0 teks soalan private daripada 48 items dalam JS frontend build; API draft juga tiada keys/notes/solutions/rubrics. |
| Cleanup | 0 HTTP/browser automated fixture accounts dan 0 schema integration tertinggal. Dua accounts daripada runner awal yang kehilangan stdin dibersihkan dalam DB QA sahaja. |

Screenshot dan JSON evidence berada di folder `outputs`, di luar repo:

- `study-exam-mobile-review.png`, `study-exam-mobile-conflict.png`, `study-exam-mobile-offline.png`, `study-exam-spm-desktop.png`.
- `study-exam-browser-results.json`, `study-exam-http-results.json`, `study-exam-final-audit.json`.
- Repro harness: `test-study-exam-browser.mjs`, `test-study-exam-http.mjs`. Jalankan HTTP harness dengan stdin terbuka; ia berhenti pada PERSISTENCE_READY sehingga API direstart dan `continue` dihantar.

Browser automation khusus bernama Browser plugin tidak tersedia dalam katalog skill sesi ini. CUA digunakan untuk interactive Chrome, dan Playwright yang sudah dibundel digunakan untuk offline network control serta viewport sebenar; tiada dependency/browser baru dipasang.

## Pembetulan yang ditemui melalui semakan

1. D5 primary/retry pada mulanya berjawapan sama; alternative dibetulkan dan invariant berjawapan berbeza ditambah.
2. Arahan pecahan termudah tidak sepadan dengan equivalent-value grader; prompt dibetulkan, nota masih mengajar simplification.
3. Semakan focus selepas lock boleh memakai masa sebelum lock; clock dibaca selepas menunggu dan regression menguji expiry semasa wait.
4. Retry boleh dibuka berulang dan disalah anggap unseen; unique parent constraint dan concurrent test ditambah.
5. Picker profil tersembunyi serta navigation tidak muat pada telefon; row profil dan mobile navigation diperbaiki. Heading exam mewarisi sticky/fixed-height header global; style discope semula dan geometry diperiksa dalam browser.
6. Copy preview/Contoh berulang dibuang. Self-mark selections tidak reset akibat revision autosave yang tidak berkaitan.
7. Handover preview sebelumnya tidak memberi cara masuk ke fixture QA. Akses demo satu klik ditambah pada runner loopback sahaja, dengan semakan Host/Origin, JSON body kosong terhad dan response no-store. Lima regression tests capability/login ditambah.
8. Semakan pra-deploy mendapati semua pack masih pending, maka catalogue production kosong. Empty-state kini menerangkan gate kandungan dan menyediakan **Teruskan latihan topik** supaya laluan belajar sedia ada boleh terus digunakan.

## Production dan langkah pelancaran

Semakan akhir remote `/mnt/data/projects/imai-study`: HEAD `072c82d`, working tree bersih. Container web `65ecfbdeb84d…`, API `35a2e5d7f18f…`, PostgreSQL `2856e4bedb4f…`, tunnel `f85b5fa9904f…` kekal, semua running dan restart count 0. Ini bukti runtime lama tidak diganti, bukan bukti perubahan exam sudah live.

Sebelum promotion, source pack perlu lulus izin dan educator review. Kemudian semak candidate/diff, backup serta restore DB, migration additive `exam_attempts`/indexes/trigger, web/API images, data compatibility, physical-phone/focus UAT dan rollback. `EXAM_PREVIEW` mesti kekal false pada production; jangan menjadikan true sebagai cara melepasi editorial gate. Rollback app tidak memerlukan memadam jadual exam atau rekod sejarah. Backup/restore production belum diuji dalam tugasan ini kerana deployment belum dibuat.

## Halangan luar code dan keputusan

**PROCEED untuk preview dan semakan terkawal. REVISE sebelum pelancaran bank past papers.**

1. **Hak penggunaan:** 0 lesen pihak ketiga diperoleh. Calon MRSM/Johor trial dan actual past SPM dikenal pasti; set UASA sekolah lengkap dengan izin belum dapat disahkan. Audit dan draf permohonan ada dalam `EXAM_SOURCE_AUDIT.md`; tiada mesej dihantar.
2. **Kualiti editorial:** guru sebenar belum menilai setiap item, jalan kerja alternatif, tahap/DSKP dan bahasa. `review=pending` kekal. Sumber rasmi UASA 2025 boleh dibaca; halaman format SPM LP yang dirujuk timeout dan perlu disemak semula sebelum claim full/current format.
3. **Nilai pelanggan/persaingan:** belum ada bukti murid lebih faham, kembali menggunakan Study atau sanggup membayar. `EXAM_LEARNING_TRIAL.md` menyediakan ujian termurah, skrip, metrik dan borang kosong. Tiada hasil peserta direka.
4. **Operasi berskala:** preview kecil tidak membuktikan beban ribuan pengguna, kos editorial atau availability production. Had draft, transaction timeout, tiada panggilan AI dalam grading dan isolation mengurangkan risiko awal; capacity/restore test perlu sebelum skala public.

Andaian BM dan set kecil dinyatakan. Izin pemilik, reviewer serta peserta ialah bukti yang masih diperlukan, bukan keputusan kecil yang boleh diteka oleh agent.
