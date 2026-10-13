# Ujian manusia untuk aliran ulang kaji exam

Tarikh reka bentuk: **9 September 2026**. Status: **BELUM DIJALANKAN**. Tiada peserta, guru, keputusan atau peningkatan pembelajaran direka. Dokumen ini menyelesaikan persediaan ujian, bukan membuktikan keberkesanan produk.

## Apa yang perlu dibuktikan

Learning loop: pilih set yang sesuai → jawab sendiri → semak jawapan dan sebab → baca nota pendek berkaitan kesalahan → jawab item setara yang belum dilihat → semak semula selepas 48–72 jam.

| Keraguan | Risiko | Bukti yang diperlukan |
|---|---|---|
| “Ini exam tahun lepas atau soalan AI?” | High: kepercayaan hilang jika preview disalah anggap actual exam | Pengguna mengenal pasti original/trial/past/school, tahun/sumber dan pending review tanpa jurupandu |
| “Selepas salah, anak saya faham atau hafal jawapan?” | High: completion bukan penguasaan | Jawapan dan penerangan betul pada soalan setara serta item baharu selepas dua hari |
| “Banyak darjah tetapi kandungan kosong” | High: liputan mengelirukan | Pengguna mengetahui bilangan set yang benar-benar tersedia dan boleh menyelesaikan satu laluan lengkap |
| “Skor kerja sendiri boleh dipercayai?” | High: markah self-marked disalah tafsir sebagai markah guru | Murid/ibu bapa membezakan automatic daripada self-marked; perbezaan dengan penskoran guru direkod |
| “Mengapa tidak buka PDF sahaja?” | Medium: nilai tambahan belum terbukti | Kurang masa mencari penerangan yang sesuai dan lebih banyak pembetulan kefahaman berbanding bahan statik setara |

## Ujian termurah yang berguna dahulu

**Satu guru Matematik sekolah rendah + lima pasangan murid/ibu bapa Darjah 4**, 20–30 minit setiap sesi, menggunakan preview yang telah melalui semakan guru untuk pilot. Ini ujian usability awal, bukan sampel wakil populasi. Gunakan laptop/telefon sedia ada dan lembaran pemerhatian; belum perlu instrumentation baharu atau perubahan produk.

Kos ialah masa guru/fasilitator/peserta yang dipersetujui; jangan menyatakan anggaran RM sebagai fakta kerana belum ada sebut harga. Jangan merekrut, menghantar jemputan atau mengumpul maklumat kanak-kanak tanpa kebenaran yang sesuai. Gunakan kod peserta seperti D4-P01, bukan nama penuh dalam laporan. Rekod skrin/audio hanya dengan izin khusus; nota pemerhatian tanpa identiti sudah memadai untuk pilot.

Sebelum sesi: lengkapkan educator checklist dalam `EXAM_SOURCE_AUDIT.md`. Bahan pihak ketiga yang tidak berlesen tidak boleh menjadi test data yang dimuat naik. Pack original pending review hanya digunakan sebagai preview terkawal dengan penjelasan yang difahami peserta; kelulusan untuk pilot dan kelulusan penerbitan umum direkod secara berasingan oleh orang sebenar.

### Skrip fasilitator

“Ini preview aliran ulang kaji Study. Soalan ini original dan bukan kertas peperiksaan sebenar. Kami mahu tahu bahagian mana yang membantu atau mengelirukan. Anda tidak sedang diuji untuk mendapat gred. Cuba sendiri dahulu; anda boleh berhenti bila-bila masa.”

Jangan menjelaskan lokasi butang atau memberi petunjuk jawapan semasa tugasan. Jika bantuan diperlukan, berikan selepas pengguna buntu dan catat masa/jenis bantuan. Jangan memaksa murid memberi jawapan salah untuk mencipta hasil pembelajaran.

### Tugasan sesi pertama

1. **Pemahaman sumber:** minta ibu bapa dan murid memilih set Darjah 4 dan menyatakan sama ada ia exam sebenar, tahun bahan, bilangan soalan dan siapa yang menyemak. Catat jawapan verbatim ringkas. Jika pengguna menyangka preview ialah past paper, hentikan dakwaan source clarity dan baiki label dahulu.
2. **Baseline:** murid jawab enam item utama tanpa membuka nota. Simpan jawapan pertama, masa dan keyakinan 1–3. Tandakan item yang sudah dikuasai; jangan gunakan item ini untuk mendakwa learning gain.
3. **Semak kesalahan:** untuk item yang salah secara semula jadi, minta murid membuka solusi dan nota. Soalan neutral: “Apa yang perlu dibuat berbeza?” Catat sama ada murid dapat menerangkan sebab, bukan menyebut nombor akhir sahaja.
4. **Transfer segera:** murid menjawab authored retry yang belum dilihat. Retry mesti berbeza konteks/nombor dan jawapan daripada primary. Jangan tampilkan review primary ketika membuat penilaian transfer.
5. **Kerja bertulis:** murid/ibu bapa menilai dua structured items dengan rubrik. Guru memberi markah secara berasingan tanpa melihat self-score dahulu. Simpan automatic, self-score dan teacher-score dalam lajur berbeza.
6. **Pemulihan sesi:** minta pengguna reload sekali selepas “tersimpan”, sambung dan bezakan keadaan “belum disimpan” jika disimulasikan oleh fasilitator. Sebarang kehilangan jawapan ialah usability blocker, bukan kesilapan murid.
7. **Temu bual dua minit:** “Bila anda perlukan nota?”, “Apa yang masih tidak jelas?”, “Adakah anda akan guna sesi ini lagi?”, “Bahagian mana lebih membantu daripada PDF yang biasa digunakan?” Jangan menukar niat penggunaan kepada bukti retention.

### Sesi 48–72 jam kemudian

Guru menyediakan satu item C original bagi setiap skill yang salah pada baseline, dengan jawapan dan rubrik disemak **sebelum** ditunjukkan. Item C tidak boleh sekadar menukar urutan options atau mengulang retry. Ia belum dikarang atau dimasukkan ke production dalam tugasan ini.

Murid menjawab tanpa nota, lalu menerangkan kaedah. Catat latihan/bantuan tambahan yang berlaku di antara sesi kerana itu boleh mempengaruhi keputusan. Jika tiada kesalahan baseline, laporkan bahawa pembelajaran daripada remediation tidak dapat diukur bagi peserta tersebut; jangan cipta skor sifar awal.

## Lembaran pengumpulan data kosong

| Participant | Level | Pack/version | Item/skill | Primary first correct? | Baseline confidence 1–3 | Review seconds | Note opened? | Reason explained? | Retry correct? | C correct after 48–72h? | Extra learning/help | Facilitator help |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Belum ada peserta | — | — | — | — | — | — | — | — | — | — | — | — |

| Participant | Structured item | Auto score/max | Self score/max | Teacher score/max | Disagreement reason | Parent understands separate scores? |
|---|---|---|---|---|---|---|
| Belum ada peserta | — | — | — | — | — | — |

| Participant | Source type identified? | Pending review identified? | Available coverage understood? | Seconds to start | Completed without help? | Reload retained answers? | Return intent and reason |
|---|---|---|---|---|---|---|---|
| Belum ada peserta | — | — | — | — | — | — | — |

## Metrik dan aturan keputusan yang ditetapkan sebelum ujian

- **Source comprehension:** bilangan peserta yang mengenal pasti original/pending review dengan betul ÷ peserta diuji. Sasaran pilot: 5/5; sebarang salah faham sebagai actual paper memerlukan pembetulan label sebelum meluas.
- **Task completion:** lengkap jawab → review → nota → retry tanpa bantuan navigation ÷ peserta dengan kesalahan baseline dan peluang retry. Sasaran awal: sekurang-kurangnya 4/5 jika semua lima layak; nyatakan denominator sebenar.
- **Immediate correction:** item salah pada primary yang betul pada retry ÷ item salah primary yang diuji semula. Laporkan pecahan seperti 7/10, serta bilangan murid yang menyumbang; jangan menganggap 10 item sebagai 10 peserta bebas.
- **Delayed transfer:** item C betul tanpa nota ÷ item C yang ditadbir bagi kesalahan baseline. Laporkan sebab jawapan, item, bantuan luar dan tempoh sebenar. Jangan gunakan peningkatan ini sahaja sebagai bukti kausal.
- **Rubric agreement:** bilangan markah manual yang sama antara self dan guru ÷ items structured disemak. Sebarang salah tafsir “self-score ialah markah rasmi” ialah blocker label. Perbezaan besar memerlukan rubrik lebih jelas atau arahan bantuan guru.
- **Recovery:** sifar kehilangan jawapan server-saved dan sifar paparan jawapan murid lain. Jika berlaku, hentikan pilot sehingga punca dibetulkan.

Dengan lima peserta, tiada threshold peratus kecil boleh membuktikan produk berkesan. Keputusan awal ialah **REVISE** jika masalah source, jawapan, recovery atau rubric berulang; **PROCEED ke ujian lebih besar** jika aliran difahami dan terdapat isyarat transfer yang konsisten. Ia bukan kelulusan pelancaran awam atau dakwaan peningkatan gred.

## Perbandingan statik yang adil selepas usability lulus

Gunakan dua kelompok skill sepadan yang guru nilai kesukarannya, dengan semua soalan/nota original atau berlesen. Set A menggunakan guided Study; set B menggunakan bahan statik dengan kandungan penerangan yang setara. Tukar susunan A/B antara peserta untuk mengurangkan kesan keletihan dan latihan. Jangan guna soalan yang sama dalam kedua keadaan bagi peserta yang sama.

Kekalkan masa belajar yang setara, prasyarat dan ujian C yang tidak pernah dilihat. Pemeriksa jawapan C tidak perlu tahu keadaan belajar peserta. Laporkan masa hingga mula latihan, masa mendapat penerangan yang relevan, delayed transfer dan keselesaan ibu bapa. Kelebihan UI dan kesan kandungan tidak boleh dipisahkan jika bahan kedua keadaan berbeza banyak; catat batas itu.

Selepas D4 stabil, jalankan sekurang-kurangnya tiga sesi eksploratori bagi D5, D6 dan SPM dengan guru relevan. Ini masih bukan kajian efficacy yang mempunyai kuasa statistik. Saiz kajian pengesahan perlu ditentukan kemudian berdasarkan hasil pilot dan soalan keputusan, bukan nombor peserta yang direka untuk kelihatan meyakinkan.

## Apa maksud siap

Persediaan ujian siap apabila skrip, checklist, metrik, lembaran kosong, bahan berizin/original dan pemeriksa dikenal pasti. Ujian manusia siap hanya apabila sesi benar-benar berlaku, bukti tanpa identiti disimpan, semua isu direkod dan keputusan dibuat terhadap pack/version yang diuji. **Setakat dokumen ini: skrip dan kaedah siap; pemeriksa, peserta, kelulusan pendidik dan bukti hasil masih belum ada.**
