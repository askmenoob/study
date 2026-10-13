# Study: arah baharu ulang kaji exam

Tarikh: 9 September 2026. Status: spesifikasi arah produk dan contoh interaksi; belum pelaksanaan production.
Baseline yang diperiksa: repo `/mnt/data/projects/imai-study`, HEAD `a48602a`, working tree bersih. Runtime sedia ada kekal semasa semakan ini.

## Keputusan pengguna

- Study perlu menjadi tempat ulang kaji soalan peperiksaan tahun lepas dan nota yang diperlukan untuk menjawabnya.
- Aktiviti utama ialah menjawab, menyemak dan membaiki kesilapan. Nota panjang/bacaan buku teks tidak menjadi laluan utama.
- UASA dan SPM ditawarkan dari awal.
- Subjek pertama ialah Matematik untuk kedua-duanya.
- Pilihan UASA dalam soalan scope merujuk Darjah 4–6. Contoh interaksi menggunakan D4 dan SPM; ia tidak membuktikan kandungan D5/D6 telah siap. UASA menengah rendah belum termasuk dalam skop kandungan pertama ini.

## A. Ringkasan idea dan pengalaman sasaran

Janji produk: murid boleh terus membuat ulang kaji yang sesuai, memahami jawapan yang salah dan mencuba kemahiran itu sekali lagi. Kejayaan diukur melalui penyelesaian latihan serta pembetulan kesilapan, bukan jumlah halaman dibaca.

Halaman utama selepas memilih profil:

1. **Sambung ulang kaji** — buka draft terakhir jika ada.
2. **Buat soalan exam** — pilih UASA/SPM, tahap/subjek, tahun, penyedia dan jenis kertas.
3. **Ulang kesilapan** — item atau skill yang perlu dicuba semula.

Nota berkaitan tersedia dalam semakan jawapan dan boleh dicari secara berasingan. Ia tidak menjadi pra-syarat untuk memulakan semua latihan. AI Tutor menjadi bantuan dalam konteks soalan, dengan penerangan berasaskan skema yang sudah diperiksa.

Dua mod menggunakan kandungan berversi yang sama:

| Perkara | Latihan berpandu | Simulasi exam |
|---|---|---|
| Tujuan | Faham dan baiki kesilapan | Uji diri dalam keadaan lebih hampir kepada kertas |
| Bantuan | Petunjuk pilihan; nota/skema selepas percubaan | Bantuan dan skema ditutup sehingga hantar |
| Masa | Sesi pendek; boleh sambung | Ikut tempoh kertas atau label jelas jika set ringkas |
| Penilaian | Rekod percubaan pertama, bantuan dan cubaan semula berasingan | Rekod submission serta pemarkahan kertas berversi |
| Soalan struktur | Jawapan akhir dan semakan langkah dengan rubric | Subsoalan, markah dan rubric ikut sumber |

Loop: pilih set → jawab → semak → buka nota berkaitan apabila perlu → cuba soalan setara → jadualkan ulang kaji. Dalam simulasi, semakan berlaku selepas submission.

Contoh nota: satu konsep, satu worked example dan satu kesilapan lazim. Sasaran editorial awal sekitar 60–120 saat bacaan; ini andaian reka bentuk untuk diuji, bukan had yang memotong penerangan penting.

## B. Skeptical Customer

- **High — Asal soalan tidak jelas.** Fakta: 414 entri asal projek ialah seed MVP yang sebahagiannya dikongsi; ia bukan bank past papers. Risiko: pelanggan menjangka kertas tahun lepas tetapi menerima soalan generik. Ujian: lima pengguna mesti dapat mengenal pasti tahun, penyedia dan jenis set tanpa bantuan.
- **High — Murid melihat jawapan tetapi masih tidak faham.** Andaian: skor dan skema sahaja tidak cukup untuk sesetengah murid. Ujian: selepas nota pendek, murid menjawab soalan setara yang belum pernah dilihat dan menerangkan satu langkah.
- **High — Pilihan banyak tetapi kandungan kosong.** Fakta: 12 tahap dalam UI belum bermaksud liputan exam lengkap. Pembaikan: paparkan hanya set yang boleh diselesaikan; nyatakan liputan sebenar setiap tahap/subjek.
- **Medium — Aktiviti tidak terasa berguna.** Belum ada bukti produk meningkatkan penguasaan. Ujian: masa mula, sesi selesai, pembetulan kesilapan dan pilihan untuk kembali; jangan guna page views sebagai ukuran utama.

## C. Aggressive Competitor

Fakta daripada laman penyedia sendiri: Pandai mengiklankan exam simulations, topical tests, Quick Notes, automated marking dan laporan prestasi. Bumi Gemilang mempunyai indeks UASA Tahun 4–6 dan percubaan SPM dengan skema. Ini bukti ciri yang ditawarkan/diiklankan, bukan bukti keberkesanan pembelajaran atau ketepatan semua fail.

- **High — Gabungan soalan dan nota mudah disamai.** Inferens: pesaing sedia ada boleh menyediakan aliran serupa. Ujian: Study perlu mengurangkan masa untuk mula latihan dan membantu membetulkan kesilapan dalam satu sesi.
- **High — Study menjadi perantara kepada PDF.** Jika nilai akhirnya hanya external links, pengguna boleh terus ke indeks sumber. Pembaikan: draft, semakan dalam konteks, nota berkaitan dan cubaan semula mesti membentuk satu perjalanan lengkap.
- **High — Liputan cetek mudah kalah.** Kekalkan kedua-dua UASA dan SPM, tetapi terbitkan set yang lengkap bagi skop yang dinyatakan. Jangan mengiklankan seluruh syllabus apabila beberapa topik sahaja tersedia.
- **Medium — Pengguna berulang belum terbukti.** Saluran pemerolehan dan kesanggupan membayar belum diuji. Lakukan ujian kecil dengan persetujuan peserta, tanpa menganggap domain/PWA menghasilkan pengguna dengan sendiri.

## D. Skeptical Engineer

Asas yang boleh digunakan semula: akaun keluarga, profil, focus session, PWA, cloud/offline sync bagi completed attempts, komponen penerangan dan penapisan tahap. Aliran murid berubah dengan ketara, tetapi tidak memerlukan pembinaan semula semua infrastruktur.

- **High — Format data hanya MCQ.** `src/types.ts` mewajibkan options/answer index dan merekod selected/correct. Perlu jenis soalan, subsoalan, markah, jawapan berstruktur dan rubric. UASA Matematik dalam format KPM 2025 mempunyai respons subjektif dan penskoran analitikal; MCQ sahaja tidak mewakili kertas itu.
- **High — Draft paper belum disimpan.** Library answers hanya React state; cloud attempts berasaskan satu topik dan completed submission. Tambah paper attempt berasingan dengan versi, jawapan, status draft, masa dan mod. Uji refresh, offline, sambung serta submit berulang.
- **High — Markah semasa dipercayai daripada client.** API menerima score/correct. Pemarkahan objektif perlu dikira server menggunakan answer key berversi; jangan terima markah yang diubah browser. Markah struktur bermula dengan semakan rubric manusia/self-mark yang dilabel, sehingga penilaian automatik dibuktikan.
- **Medium — Punca kesilapan belum diketahui.** Jawapan salah sahaja tidak membuktikan misconception tertentu. Pautkan item kepada skill/nota; nyatakan “ulang skill ini”. Diagnosis spesifik memerlukan langkah kerja atau pola bukti yang mencukupi.
- **High — Soalan/skema mungkin berubah selepas digunakan.** Versi paper/item/rubric mesti kekal bersama attempt; pembetulan kandungan menghasilkan versi baharu supaya laporan lama boleh dijelaskan.

Model minimum yang diperlukan: Source → PaperVersion → Sections/Items/Rubrics → AttemptDraft → Submission/Review → RetryQueue/Notes. Rekod adaptive lama kekal dengan asalnya dan tidak dilabel semula sebagai keputusan exam.

## E. Tiga risiko terbesar

1. **High: bekalan soalan dan skema yang boleh digunakan belum mencukupi.** Katalog rujukan tidak membuktikan hak untuk mengimport atau kelengkapan fail.
2. **High: pemarkahan dan penerangan yang salah menjejaskan kepercayaan.** Unit, pecahan setara, langkah dan markah separa perlu disemak.
3. **High: membuka terlalu banyak tahap dengan kandungan cetek.** Kedua-dua exam perlu hadir sejak awal, tetapi keluasan promosi mesti sepadan dengan set yang sudah disiapkan.

## F. Eksperimen termurah

1. Gunakan contoh interaksi original untuk menguji perjalanan UASA dan SPM sekarang. Ia dilabel demonstrasi, tidak menyimpan markah dan bukan kertas peperiksaan sebenar.
2. Untuk pilot kandungan, cadangan minimum ialah satu set ringkas Matematik bagi setiap D4, D5, D6 serta satu set SPM; 6–10 item per set, dengan nota dan soalan cubaan semula. Ini sasaran kerja yang dicadangkan, bukan kandungan yang sudah tersedia. Set ringkas tidak dilabel sebagai kertas penuh.
3. Sebelum import, pilih sumber yang lengkap, semak skema dan pastikan kegunaan yang dibenarkan. Soalan exam sebenar, percubaan, set sekolah dan original mesti dipisahkan dalam metadata dan label murid.
4. Uji dengan 12 peserta secara sukarela: dua setiap D4/D5/D6 dan enam calon SPM. Peruntukkan 15–20 minit, bandingkan dengan kaedah soalan+skema biasa dan uji satu item baharu setara selepas dua hari.
5. Ambang awal yang dicadangkan: sekurang-kurangnya 10/12 peserta boleh mula tanpa bantuan dalam 60 saat; tiada jawapan/skema salah yang belum diselesaikan; sekurang-kurangnya 8/12 boleh menjawab satu item setara dengan penerangan ringkas. Sampel ini hanya ujian arah/kebolehgunaan, bukan bukti peningkatan keputusan exam.

## G. Verdict

**PROCEED dengan pivot pengalaman ulang kaji.** Bukti semasa cukup untuk membina dan menguji aliran baharu; belum cukup untuk menjanjikan bank past papers lengkap atau peningkatan gred. Kandungan dan pemarkahan ialah kerja utama bersama UI, bukan kerja sampingan selepas UI siap.

## H. Syarat dan maksud siap

**Siap untuk langkah sekarang:** pilihan UASA+SPM/Matematik direkod; audit baseline dan Council siap; aliran, mod, skop pilot serta batas sumber ditulis; contoh interaksi kedua-dua laluan boleh diuji. Tiada perubahan runtime production dibuat.

**Siap untuk pilot production kelak:**

- Set bagi skop diterbitkan mempunyai identiti, tahun/sesi, penyedia, jenis, bukti sumber, izin penggunaan dan versi yang jelas.
- Semua item/skema/rubric diperiksa; jumlah markah tepat; nota berkait dengan skill yang diuji.
- Boleh jawab, simpan, refresh, sambung, hantar dan semak; submission tidak berganda. Pelajar tidak boleh membaca/mengubah draft pelajar lain.
- Mod berpandu dan simulasi mematuhi masa pembukaan skema; bantuan tidak dicampur dengan skor cubaan pertama.
- Jawapan objektif disemak server. Self-mark/semakan manusia tidak dipaparkan sebagai markah rasmi atau AI-verified.
- Cubaan semula dan nota berkait berfungsi; markah bukan ramalan gred SPM/TP PBD.
- Focus session, akaun, progress lama dan pemulihan PWA kekal berfungsi. UAT telefon serta rollback disediakan sebelum pelancaran.

**Maklumat yang belum selesai:** koleksi kertas sumber sebenar dan permission; tahun/sesi yang lengkap; aliran/bahasa SK/SJK/DLP bagi UASA; reviewer kandungan. Ini tidak menghalang contoh aliran, tetapi mempengaruhi kandungan yang boleh dilancarkan. Baseline BM digunakan untuk demonstrasi sahaja, bukan keputusan muktamad bahasa kandungan.

## Sumber semakan

- [KPM — Panduan Pengurusan dan Pentadbiran UASA & FAQ](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf). Menyatakan autonomi sekolah dan liputan Tahun 4–6/Tingkatan 1–3; edisi 2024/2025 yang dibaca, bukan dakwaan semakan semua pekeliling 2026.
- [KPM — Format UASA Tahap Dua 2025](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/7.%20Format%20Instrumen%20UASA%20Tahap%20Dua%20Sekolah%20Rendah%202025.pdf). Rujukan jenis item dan penskoran Matematik; edisi pengganti 2026 belum disahkan.
- [GuruBesar — Percubaan SPM Matematik MRSM 2025](https://gurubesar.my/percubaan-spm-matematik-mrsm-2025/). Dilabel percubaan, bukan kertas peperiksaan sebenar SPM.
- [Pandai — Exam preparation](https://my.pandai.org/students/academic-competition/) dan [panduan ciri](https://blog.pandai.org/malaysia-best-digital-learning-app-for-students-pandai-app/).
- [Bumi Gemilang — Tahun 4–6](https://www.bumigemilang.com/soalan-percubaan-tahun-4-5-6/) dan [Percubaan SPM 2025](https://www.bumigemilang.com/soalan-percubaan-spm-2025-skema-jawapan-semua-subjek-trial/).

## Semakan contoh interaksi

- Contoh UASA: jawapan salah → penerangan → nota → soalan setara; jawapan 3/6 diterima sebagai setara dengan 1/2.
- Contoh SPM: pemfaktoran persamaan kuadratik → nota berkaitan → soalan setara. Tiada skema peperiksaan sebenar disalin.
- Semakan browser: kedua-dua laluan, keadaan salah/betul, buka/tutup nota, pertukaran laluan dan tamat sesi diuji. Paparan 360px cerah dan 736px gelap diperiksa; tiada app console error yang dicerap. Ini semakan contoh interaksi, bukan UAT produk baharu atau telefon fizikal.
- UI demonstrasi berfungsi secara setempat; tiada login, request API, database atau panggilan AI. Contoh ini tidak membuktikan draft sync, markah separa, pemarkahan server atau liputan syllabus.
