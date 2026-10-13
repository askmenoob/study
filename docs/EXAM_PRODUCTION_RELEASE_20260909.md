# Release engine ulang kaji exam — 9 September 2026

Pengguna membenarkan deployment terus ke **https://study.imai.my** selepas pembaikan login preview. Release ini memasang engine exam dengan publication gate aktif. Ia belum melancarkan bank kertas tahun lepas: **0 pack diluluskan tersedia pada production**. Empat set original pending educator review kekal dalam preview terasing.

## Perubahan yang dipromosikan

- Commit engine: `c92498e53f7c5148d03528a5e2b0b3a3289fbf33`.
- Commit code pembaikan build web: `79924b5ae8956af2a59fde20866a3c8603e38378`. Catatan deployment ditambah sebagai commit dokumentasi selepas semakan; image release kekal merujuk commit code ini.
- API image: `imai-study-api:exam-c92498e53f7c`; web image: `imai-study-web:exam-79924b5ae895`.
- Bundle web: `index-CU6L1Ldr.js`; CSS: `index-rzxOKINo.css`.
- API dan web sahaja diganti. PostgreSQL dan tunnel mengekalkan container ID serta restart count. Semakan fingerprint mengesahkan DATABASE_URL/JWT_SECRET dan mounts API tidak berubah; tiada secrets dimasukkan dalam catatan ini.
- Migration additive mencipta `exam_attempts`, lima indexes termasuk primary/unique indexes, serta immutable-snapshot trigger. Rekod latihan topik lama tidak ditukar menjadi rekod exam.
- `EXAM_PREVIEW=false`. Katalog kosong menerangkan kelulusan bahan dan menawarkan **Teruskan latihan topik**. Login production menggunakan akaun sedia ada; akses **Masuk demo preview** wujud hanya pada runner loopback port 4195.

## Bukti semakan

| Check | Hasil |
|---|---|
| Tests aplikasi | 179/179 lulus, 23 fail, termasuk 12 integration tests dengan PostgreSQL sebenar |
| TypeScript/build | Web dan API lulus; 30 PWA artifact checks tempatan lulus |
| Preview login | 25 checks browser/HTTP lulus: satu klik, parent sebenar, profil D4/SPM, reload, logout, Origin/Host/body guards, token sessionStorage sahaja |
| Backup dan restore | Backup production custom-format dilindungi permission, SHA-256 disahkan, dipulihkan dalam PostgreSQL disposable tanpa network/ports awam |
| Migration rehearsal | Candidate API bermula pada DB yang dipulihkan; jumlah users/students/attempts/focus_sessions sebelum dan selepas migration sama |
| Compatibility rollback | API lama bermula dan health lulus terhadap salinan DB yang sudah dimigrate |
| Public HTTP | 6 kumpulan lulus: health, tiada endpoint demo, register/login/me, gate UASA/SPM, simpan/baca latihan topik, student/focus authorization dan cleanup fixture |
| PWA production akhir | 44 checks lulus pada domain awam, termasuk icons/manifest/service-worker/headers |
| Tab Chrome lama | Mula dengan asset lama; selepas activation dan reload memuatkan `index-CU6L1Ldr.js`, tanpa clear storage |
| Browser production | 15/15 checks lulus pada 1365×950 dan 390×844: login, parent/student reload, D4/SPM empty-state, CTA Matematik, Mod Murid, logout, JWT sessionStorage sahaja, PWA activation; 0 page/console/network failures |
| Audit akhir | API/web healthy dengan restart 0, source tree production bersih, 0 akaun ujian production tertinggal, 0 API error entries, semua container restore/permission-check sudah dibuang |

Evidence di folder `outputs` workspace: `study-exam-production-browser-20260909.json`, `study-exam-production-final-audit.jsonl`, dan empat screenshot `study-exam-production-*-20260909.png`. Dua percubaan browser awal menemui andaian harness tentang stylesheet dan urutan tukar profil; harness dibetulkan berdasarkan DOM/code. Ketiga-tiga fixture daripada setiap percubaan dibersihkan dalam `finally`, kemudian audit DB mengesahkan 0 tertinggal. Ujian ini tidak membuktikan pemasangan pada telefon fizikal, keberkesanan pembelajaran atau kapasiti ribuan pengguna.

## Isu deployment yang ditemui dan diselesaikan

1. Build web pertama gagal semasa DNS resolver sementara tidak dapat menghubungi registry. DNS disahkan pulih, kemudian hanya langkah build web yang gagal disambung; build API tidak diulang.
2. Semakan domain selepas promotion menemui HTTP 403 pada icons. Worktree dibina di bawah umask private, lalu Docker COPY mengekalkan permission 600 pada public assets. Dockerfile web kini menetapkan read/traverse permission untuk `/usr/share/nginx/html`. Image pembetulan diuji melalui Nginx sebenar dalam container tanpa network, kemudian hanya web diganti. Semua 44 PWA checks awam lulus selepas pembetulan.

## Backup dan rollback

- Backup: `/mnt/data/backups/imai-study/20260909T023817/imai-study.dump`; checksum dalam `SHA256SUMS` pada direktori sama. Ia menyimpan data production dan mesti kekal private di server.
- Source release: `/mnt/data/releases/imai-study/20260909-exam-revision`.
- Manifest, log build/restore, fingerprint config dan rollback override: `/mnt/data/releases/imai-study/20260909-exam-revision-ops`.
- Image lama disimpan sebagai `imai-study-api:rollback-exam-20260909` dan `imai-study-web:rollback-exam-20260909`.

Rollback aplikasi menggunakan Compose asal dengan `compose.rollback.yml`, API dahulu kemudian web, `--no-deps --no-build --wait`. Kekalkan DB dan semua table/rekod exam. Jangan gunakan `deploy/restore.sh` untuk rollback app biasa kerana ia menggantikan database. Selepas rollback sebenar, selaraskan source revision dan default image aliases sebelum deployment seterusnya.

```sh
cd /mnt/data/projects/imai-study
docker compose --project-directory "$PWD" --env-file .env -f compose.yml -f /mnt/data/releases/imai-study/20260909-exam-revision-ops/compose.rollback.yml up -d --no-deps --no-build --wait --wait-timeout 60 api
docker compose --project-directory "$PWD" --env-file .env -f compose.yml -f /mnt/data/releases/imai-study/20260909-exam-revision-ops/compose.rollback.yml up -d --no-deps --no-build --wait --wait-timeout 60 web
```

## Maksud siap dan batas

**Deployment siap dan checks di atas telah dipenuhi:** image yang dipilih live, migration/restore/rollback compatibility disahkan, login serta latihan lama berfungsi, PWA dan browser checks lulus, serta fixture ujian sudah dibersihkan.

**Bank exam belum siap untuk pelancaran kandungan.** Izin pihak ketiga belum diperoleh, guru belum meluluskan set original, liputan semua darjah/tingkatan belum lengkap, dan human learning trial belum berjalan. Rujuk `EXAM_SOURCE_AUDIT.md`, `EXAM_RISK_LEDGER.md` dan `EXAM_LEARNING_TRIAL.md` untuk kerja tersebut. Tiada semakan atau izin direka untuk melepasi gate.
