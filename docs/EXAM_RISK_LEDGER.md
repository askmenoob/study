# Kawalan risiko ulang kaji exam

Tarikh: 9 September 2026. Baseline code: `072c82d`. Skop: Matematik UASA Darjah 4–6 dan SPM Tingkatan 4–5. Status akhir: code dan ujian preview siap; public release belum diluluskan oleh bukti kandungan/izin.

## Maksud siap

Deliverable ini siap apabila preview mempunyai aliran kedua-dua exam, simpan/sambung dan semakan yang benar-benar berfungsi; kawalan penting lulus ujian; sumber dan status izinnya boleh dijejaki; dan halangan penerbitan direkod dengan tindakan yang jelas. Ini bukan pengesahan bank kertas tahun lepas sudah lengkap atau semua risiko perniagaan sudah hilang.

Andaian kecil: Bahasa Melayu sebagai bahasa preview; enam soalan utama dan enam soalan ulangan setiap set; pemarkahan objektif pada server; jalan kerja menggunakan rubric semakan sendiri yang dilabel. Belum ada pengesahan hak kertas sebenar atau educator yang dilantik. Bahan contoh original tidak boleh dipasarkan sebagai kertas tahun lepas.

## Daftar risiko dan bukti

| Risiko | Severity | Kawalan / ujian yang diperlukan | Status bukti |
|---|---|---|---|
| Kandungan pihak ketiga diterbitkan tanpa izin | Critical | Metadata hak dan bukti wajib; unknown ditolak walaupun preview. Audit link sumber, pemilik dan izin bagi setiap calon. | Gate negatif lulus; audit siap; izin sebenar masih 0 — penerbitan disekat |
| Jawapan atau penerangan salah | High | Semakan kiraan bebas, keys dan rubric konsisten; review educator wajib sebelum published. | 48 keys disemak; 53 content tests lulus; educator belum ada — publication disekat |
| Markah dipalsukan atau jalan kerja dianggap markah rasmi | High | Server mengira markah; auto dan self-mark berasingan; rubric dibatasi; tiada ramalan gred. | Ujian API/DB dan browser lulus; kefahaman pengguna sebenar belum diuji |
| Jawapan/skema bocor sebelum submission simulasi | High | Private snapshot pada server; DTO tanpa key; endpoint check ditolak dalam simulation. | API/DB dan UI SPM lulus; 0 teks soalan private dalam frontend bundle |
| Draft murid hilang atau ditimpa peranti lain | High | Simpan DB, revision, row lock, local draft, conflict jelas; refresh dan restart API diuji. | DB concurrency, actual API restart, offline reload/reconnect dan explicit conflict browser lulus |
| Keluarga/murid boleh melihat atau mengubah data orang lain | High | Ownership + student-scope + focus-session pada setiap endpoint; respons lewat tidak menukar profil. | Full HTTP, DB, late-token tests dan logout cleanup lulus |
| Dakwaan liputan melampaui kandungan sebenar | High | Tapis tahap sebenar; label set ringkas original dan pending review; tiada label full exam/official. | Empat pack berlabel disahkan; tiada paper pihak ketiga dilancarkan |
| Murid menghafal jawapan tanpa memahami | High | Nota mengikut skill dan soalan ulangan baharu; ujian transfer tertunda dan penerangan murid. | Aliran dibina; eksperimen manusia belum dijalankan |
| Produk mudah diganti dengan PDF atau pesaing | High | Uji masa mula, simpan/sambung dan pembetulan kesilapan dalam satu aliran; bandingkan dengan soalan+skema biasa. | Hipotesis nilai belum dibuktikan |
| Tiada bekalan kertas berizin yang mencukupi | High | Senarai calon + permintaan izin khusus; jangan launch dengan janji past-paper sebelum lulus. | Status hak masih perlu bukti pemilik |
| Masa simulasi boleh dilanjutkan melalui browser | Medium | Deadline server kekal selepas reload; selepas tamat hanya jawapan yang sudah diterima server dinilai. | Ujian deadline dan tunggu lock melepasi expiry lulus |
| Soalan berubah dan sejarah markah tidak lagi dapat dijelaskan | Medium | Snapshot private + versi immutable per attempt; retry merujuk snapshot asal. | Katalog berubah dan SQL mutation ditolak dalam ujian; satu authored retry setiap parent dikuatkuasakan |
| Kos semakan kandungan/maintenance melebihi nilai produk | Medium | Set awal kecil; rubric boleh diaudit; tiada panggilan AI dalam marking loop; catat masa review dan pembetulan per set. | Had 100 active draft/murid diuji; kos editorial, beban besar dan kos operasi sebenar belum diukur |
| Perubahan merosakkan production atau data keluarga | High | Worktree dan DB QA berasingan; perubahan additive; checks legacy; release review dan rollback sebelum deploy. | Empat container production dan restart count kekal; tiada migration/deploy production |
| UI telefon dan penggunaan murid sebenar tidak sesuai | Medium | Semakan browser sempit dahulu, kemudian UAT telefon fizikal dan ujian peserta berizin. | Browser 390×844 dan 1280×900 lulus; picker tersembunyi/tajuk bertindih dibaiki; telefon fizikal belum diuji |

## Peraturan keputusan

- **PROCEED** untuk preview berlabel dan eksperimen kecil apabila kawalan software lulus.
- **REVISE** untuk pelancaran bank past papers sehingga izin, kelengkapan set dan review educator disahkan.
- Jangan mendakwa peningkatan gred, mastery sebenar atau kesanggupan membayar sebelum bukti peserta tersedia.
- Pelancaran perlu boleh dihentikan jika satu key/skema salah ditemui; semak semula semua item dalam pack yang terjejas dan terbitkan versi pembetulan. Jangan menulis semula snapshot percubaan lama secara senyap.

## Syarat sebelum pilot public

1. Izin bertulis yang meliputi paparan digital, adaptasi interaktif, skema, nota, penggunaan komersial jika berkaitan dan tempoh izin; identiti pemegang hak disahkan.
2. Educator mengesahkan setiap item, skema, unit, markah, bahasa dan pemetaan tahap/DSKP; rekod nama, tarikh dan versi.
3. Ujian API/UI dan recovery lulus pada candidate yang sama; semakan telefon dan focus-session sebenar diselesaikan.
4. Skop promosi sepadan dengan set berizin yang lengkap, termasuk beza kertas sebenar, percubaan dan set sekolah.
5. Release review mengenal pasti image/commit, migration additive, backup yang boleh dipulih, kesihatan runtime dan rollback. Preview lulus belum bermaksud deploy lulus.

## Catatan bukti akhir

Suite penuh 173 tests lulus; selepas menambah satu regression untuk retry race, 26 tests pada module terjejas lulus semula (jumlah 174 tests pada candidate). Typecheck, web/API build, curriculum validator dan 30 PWA checks lulus. Full HTTP mempunyai 11 kumpulan bukti termasuk restart API sebenar; browser mempunyai 8 kumpulan bukti termasuk offline, conflict, SPM dan logout. Dua fixture akaun yang tertinggal apabila runner awal kehilangan stdin dibersihkan hanya dalam DB QA; tiada fixture HTTP/browser atau schema integration tertinggal. Satu akaun demo di DB QA dikekalkan untuk preview.

Audit sumber: `EXAM_SOURCE_AUDIT.md`. Protokol educator/peserta: `EXAM_LEARNING_TRIAL.md`. Kontrak: `EXAM_IMPLEMENTATION_CONTRACT.md`. Evidence terperinci dan batas: `EXAM_PREVIEW_HANDOVER.md`. Semua gate yang bergantung pada izin, guru dan peserta kekal belum dipenuhi; code tidak menggantikan bukti tersebut.
