# Semakan rujukan Study — 8–9 September 2026

## Hasil dan maksud siap

Pelaksanaan ini menambah tab **Rujukan GuruBesar & KPM** dalam Learning Library dan pilot lapan soalan pecahan original untuk Darjah 4. Release ini sudah live pada 9 September 2026. **Siap bagi pakej ini** bermaksud code, tests, build, deployment, penapis dan kredit rujukan, latihan pilot serta sekatan pautan luar sesi fokus sudah disemak. Ia tidak bermaksud semua bahan disahkan guru atau lengkap DSKP. Bukti production disenaraikan di bahagian release di bawah.

Source asal projek: `/mnt/data/projects/imai-study`. Peringkat preview dibuat dalam salinan berasingan kerana task akses keluarga sedang berjalan. Pada peringkat preview itu, tiada production DB, secret, akaun pelajar, AI provider, tunnel atau deployment diubah. Fasa deployment berikutnya hanya menggantikan service web dan menggunakan satu akaun ujian sementara yang kemudian dipadam bersama data ujiannya.

Integrasi preview berdasarkan commit sebenar `1a75b01` (8 September 2026), selepas perubahan sesi keluarga disiapkan. Patch awal bertembung dengan prop `allowExternalLinks` yang baru ditambah; gabungan akhir mengekalkan sekatan tersebut. Tab rujukan, panel rujukan dan pautan bacaan lanjut tidak membenarkan pautan luar semasa sesi fokus anak. Release production kemudian digabungkan dengan pembaikan PWA sehingga `4806f6b`.

## Katalog yang disepadukan

| Rujukan | Tahap | Status utama |
| --- | --- | --- |
| [Latihan Matematik Tahun 4](https://gurubesar.my/latihan-matematik-tahun-4/) | D4 Matematik | Kredit Galeri Cikgu Rozzi; ZIP hidup, isi/skema belum diaudit |
| [Nota Matematik Tahun 4](https://gurubesar.my/nota-ringkas-dan-padat-matematik-tahun-4/) | D4 Matematik | Artikel 2026; tahun bahan dan pencipta asal belum disahkan |
| [Nota Sains Tahun 4](https://gurubesar.my/nota-ringkas-peta-minda-sains-tahun-4/) | D4 Sains | Halaman dibaca; fail penuh dan DSKP belum disemak |
| [Year 5 Starter Unit English Worksheets](https://gurubesar.my/year-5-starter-unit-english-worksheets/) | D5 English | [Teacherfiera asal](https://www.teacherfiera.com/year-5-2021-supporting-materials-based-on-the-main-textbook-starter-unit/) menyatakan bahan 2021; sesetengah aktiviti memerlukan audio/buku; jawapan dirujuk ke Teacher’s Book |
| [Writing Practice Module Primary 1](https://gurubesar.my/writing-practice-module-primary-1/) | D1 English | Kredit Teacher Niss; skema belum disahkan |
| [Nota Padat Matematik Pecahan](https://gurubesar.my/nota-padat-matematik-pecahan/) | Pilihan topik D4–D6 oleh Study | Halaman tidak menetapkan darjah khusus; bacaan lanjut, bukan asal soalan pilot |
| [Nota Sejarah Tahun 5](https://gurubesar.my/nota-ringkas-dan-padat-sejarah-tahun-5/) | D5 Sejarah | Kredit Teacher Collection; isi ZIP/tahun bahan belum diaudit |
| [Nota Sains KSSM Tingkatan 5](https://gurubesar.my/nota-ringkas-sains-kssm-tingkatan-5/) | T5 Sains | PDF menyatakan Cikgu Suhaina, SMK Senai, 2021; artikel dikemas kini 2025 |
| [Percubaan SPM Matematik MRSM 2025](https://gurubesar.my/percubaan-spm-matematik-mrsm-2025/) | T4–T5 Matematik | K1 dan skema K1 dibuka; K2/padanan jawapan belum diaudit; kredit skema MARA |
| [Format UASA Tahap Dua 2025](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/7.%20Format%20Instrumen%20UASA%20Tahap%20Dua%20Sekolah%20Rendah%202025.pdf) | D4–D6, lima subjek yang ada dalam Study | Dokumen rasmi KPM; Matematik subjektif, 50 markah, 75 minit; edisi pengganti 2026 belum disahkan |
| [Panduan PBD Edisi Kedua 2019](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/Panduan%20Pelaksanaan%20Pentaksiran%20Bilik%20Darjah%20Edisi%202%20-%202019.pdf) | KSSR/KSSM | Rangka semakan guru; bukan DSKP penuh setiap subjek |

## Bahan yang tidak diimport

- Ebook Sains Tahun 4 di GuruBesar mempunyai kredit Cikgu Kerry / Dynamind Solutions dan syarat penggunaan dalam bahan terindeks. [Laman pencipta](https://powerdynamind.com/product/e-book-latihan-power-sains-kssr-semakan-tahun-4-120m-s/) menawarkan versi penuh dengan skema. Izin pengedaran upstream belum diketahui. PDF atau soalannya tidak digunakan dalam produk ini.
- [Percubaan SPM Ekonomi Sarawak 2026](https://gurubesar.my/percubaan-spm-ekonomi-sarawak-2026/) mempunyai label skema K1 tanpa hyperlink pada halaman yang dibaca. Ia tidak dimasukkan kerana subjek Ekonomi sekolah menengah juga belum ada dalam katalog Study. Jangan memetakkannya kepada Ekonomi STPM.
- Tiada scraper, cron, automatic importer, paid AI atau perubahan pada tutor dibuat. Menambah reference URL tidak bermaksud model AI telah dilatih menggunakan bahan tersebut.

## Skeptical Council

A. Idea: kukuhkan latihan Study menggunakan sumber pendidikan Malaysia dengan provenance yang boleh diperiksa.

B. Skeptical Customer — **High**: ibu bapa boleh berhenti menggunakan Study jika tahun/skema salah atau pautan sahaja tidak membantu anak belajar. Ujian: lima ibu bapa mencari latihan sepadan dan pelajar mencuba pilot. Ukur masa untuk bermula serta kesilapan yang dapat diterangkan semula.

C. Aggressive Competitor — **High**: katalog pautan awam mudah disalin. Nilai yang patut dibuktikan ialah soalan original yang disemak, bimbingan langkah dan padanan kelemahan murid. Ia masih hipotesis nilai, bukan kelebihan yang sudah terbukti.

D. Skeptical Engineer — **High**: tag darjah tidak membuktikan SK/SP; jawapan AI bukan bukti ketepatan; pautan boleh rosak. Simpan versi dokumen, kod SK/SP, halaman, reviewer dan keputusan semakan apabila tersedia. Semak soalan/penyelesaian secara bebas sebelum status disahkan dinaikkan.

E. Tiga risiko terbesar: ketepatan dan pemetaan silibus; izin penerbitan semula bahan upstream; nilai produk yang terlalu bergantung pada pautan awam.

F. Eksperimen termurah: guru semak lapan item pilot terhadap DSKP sebenar, kemudian lima murid mencuba 15 minit. Uji semula dengan soalan setara yang berbeza. Ambang cadangan: tiada jawapan salah yang belum diselesaikan, semua item dipetakan dengan bukti, dan sekurang-kurangnya empat daripada lima murid boleh menerangkan satu kaedah yang baru dipelajari. Sampel ini hanya bukti awal kebolehgunaan.

G. Verdict: **REVISE** untuk peluasan bank soalan; katalog link-only dan pilot berlabel sesuai sebagai langkah pertama yang boleh disemak.

H. Sebelum peluasan: tentukan tahap/subjek/aliran sekolah, dapatkan DSKP terpakai, lantik reviewer guru, sahkan izin untuk bahan yang hendak diimport, dan bezakan skor latihan daripada TP/PBD rasmi. Maklumat ini belum lengkap; jangan mendakwa complete syllabus atau KPM-approved.

## Checks dan batas bukti preview — 8 September

- Worktree akhir pada `1a75b01`: 59/59 tests lulus; curriculum structural validator 0 errors; frontend/server typecheck dan build web/PWA/API lulus.
- Tests baharu: grade/subject/search isolation, STPM empty state, metadata/URL shape, pilot hanya D4, satu pilihan numerik betul bagi setiap soalan, bentuk termudah dan unit, stable IDs serta reference IDs.
- Review code bebas: tiada isu actionable ditemui dalam skop ini. Ia tidak menggantikan review guru.
- Browser preview komponen sebenar: identiti halaman, paparan bukan kosong, tiada framework overlay, carian ROZZI, D4 Matematik, D5 English, T6 kosong, hint sebelum jawapan, feedback salah/betul semuanya disahkan. Tiada app console error; warning yang dicerap datang daripada Chrome extension.
- Sesi fokus: dua pautan bacaan lanjut dalam sesi biasa menjadi sifar apabila `allowExternalLinks=false`; tab rujukan juga tiada. Tiga SSR regression tests menguji panel biasa, panel fokus dan bacaan lanjut fokus.
- Klik pautan latihan membuka halaman GuruBesar yang tepat dalam tab baharu. Tiada PDF/ZIP diimport atau dihantar kepada AI.
- Semakan akhir semua 11 URL katalog melalui HTTP HEAD: 11/11 status 200. Ini hanya bukti pautan boleh dicapai, bukan pengesahan semua kandungan.
- Patch akhir diuji dengan `git apply --check` terhadap repo server semasa pada `1a75b01`: lulus; repo production kekal bersih. Patch belum diaplikasi ke source production.
- Responsive preview menggunakan iframe 390px dalam browser yang sama (lebar kandungan 375px selepas scrollbar). Penapis, tab, teks dan kad boleh dipaparkan tanpa horizontal overflow. Ini simulasi saiz, bukan ujian pada telefon sebenar. API viewport Chrome tidak menukar lebar sebenar dalam percubaan ini dan telah direset.
- Preview menggunakan data contoh sahaja, tanpa login, production API, database atau panggilan AI. Preview bukan bukti UAT production.
- Jawapan Library tidak masuk ke laporan kemajuan, seperti behaviour sedia ada. Pilot ini tidak mengubah bank adaptive, mastery IDs atau markah sejarah.

## Release production — 9 September 2026, sekitar 00:50 MYT

- Pengguna meluluskan sambungan dan deployment pakej preview. Scope kekal 11 metadata rujukan dan lapan soalan original; tiada upstream content diimport atau digunakan untuk melatih model.
- Commit kandungan `311dc86` digabungkan di atas PWA `4806f6b`. Final runtime commit **`4d6ae6f`** turut membaiki activation PWA yang ditemui melalui UAT. Dokumen release dikemas kini selepas commit runtime; perubahan dokumentasi tidak memerlukan image baharu.
- **76/76 application tests** lulus pada gabungan kandungan dan PWA, 16 test files. Curriculum validator kekal 12 levels, 23 STPM subjects, 138 topic instances, 414 adaptive question instances, 0 errors. Typecheck serta build web/API lulus.
- Browser lama mula-mula masih memaparkan asset `index-DtbYwr-E.js`. Pemeriksaan package yang dipasang membuktikan `injectRegister: inline` memintas default `skipWaiting`/`clientsClaim` untuk autoUpdate. Dua option Workbox ditetapkan secara explicit. Rujukan dokumentasi: [Vite PWA registration](https://vite-pwa-org.netlify.app/guide/register-service-worker) dan [automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update); code package tempatan digunakan untuk mengesahkan tingkah laku versi terpasang.
- Regression check menjalankan generated worker dalam VM dengan Workbox stubs tanpa rangkaian. Ia gagal pada build lama kerana worker tidak terus meminta activation; selepas fix, **30 checks dist** dan **44 checks pada domain live** lulus. Tab Chrome lama yang sama beralih kepada `index-PQNEAEMP.js` selepas reload tanpa clear storage atau login semula.
- UAT live melalui `https://study.imai.my`: D4 Matematik memaparkan lima rujukan sepadan; carian `ROZZI` memaparkan satu; klik pautan membuka artikel GuruBesar yang tepat. Menukar profil ujian kepada Tingkatan 6 memaparkan 0 rujukan dengan empty state yang jelas, kemudian profil dipulihkan kepada D4.
- Pilot live menunjukkan lapan soalan, label semakan guru/DSKP, petunjuk sebelum sebarang jawapan, maklum balas salah dan betul serta lapan penerangan jawapan betul. Dua pautan bacaan lanjut hadir dalam sesi biasa.
- Sesi fokus sebenar melalui link ujian sekali guna: tab rujukan dan sumber tiada, lapan soalan masih boleh dibuka, jumlah pautan luar pada halaman pilot ialah **0**, dengan nota bahawa bacaan luar tersedia selepas sesi tamat.
- Data ujian dibersihkan dalam transaksi bersasar: satu akaun sementara, satu profil, satu study link dan satu focus session dipadam; semua baki row ujian ialah 0. Tiada adaptive attempts atau tutor logs dijana oleh UAT ini. Rekod keluarga sebenar tidak disentuh.
- Web sahaja diganti. Container IDs, images dan restart counts API, PostgreSQL dan tunnel kekal. Web/API/PostgreSQL healthy dan public API health HTTP 200.
- Review bebas mengesahkan image berjalan sepadan dengan `imai-study-web:sources-4d6ae6f`, digest `sha256:a12f7191f886f53cbbbcabb93319c3320718ed68896d73c4080728da25af516f`. Hash JavaScript dan `sw.js` dalam container sama dengan respons domain awam. Tiada actionable concern pada integrasi atau pembaikan activation.
- Rollback sebelum rujukan disimpan sebagai `imai-study-web:rollback-sources-20260909`; rollback tepat sebelum activation fix sebagai `imai-study-web:rollback-before-4d6ae6f`. Pemulihan menggunakan image tersebut dan penggantian service `web` sahaja dengan Compose `--no-deps --no-build`.
- Bukti deployment server: `/tmp/study-sources-deployment-20260909/` dan subdirektori `4d6ae6f/`. Build dilakukan dalam `/tmp/imai-study-sources-release-20260909`, branch `codex/study-reference-sources-20260909`; main repo menerima fast-forward selepas disahkan bersih.
- Semakan pada telefon Android/PWA fizikal dan semakan guru kekal belum dibuat. Install controls dan artifact PWA lulus bukan bukti pemasangan pada peranti pengguna.

## Status seterusnya

- [x] Sumber dibaca dan katalog metadata disediakan.
- [x] Integrasi Library dan pilot original disiapkan.
- [x] Tests, typecheck, build, browser desktop dan preview sempit disahkan.
- [x] Sekatan pautan luar sesi fokus kekal dan diuji.
- [ ] Semakan guru dan pemetaan SK/SP DSKP bagi pilot.
- [ ] UAT pada telefon/PWA sebenar.
- [x] Deploy dan UAT production selepas arahan deployment.
- [x] Pembaikan dan regression check activation cache PWA untuk browser sedia ada.
- [x] Akaun serta data ujian sementara dibersihkan; rollback web tersedia.
