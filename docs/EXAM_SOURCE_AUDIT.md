# Audit sumber dan izin kandungan exam

Tarikh semakan: **9 September 2026**, Asia/Singapore. Skop: Matematik UASA Darjah 4–6 dan SPM Tingkatan 4/5. Status: **sumber calon ditemukan; tiada lesen pihak ketiga diluluskan untuk import**. Tiada permohonan dihantar, pembelian dibuat atau pihak luar dihubungi.

## Keputusan yang boleh digunakan

Empat pack dalam `server/examCatalog.ts` ialah **preview original berbantukan AI**, 24 item utama dan 24 alternatif retry. Ia menguji aliran jawab → semak → nota → retry; ia tidak memenuhi permintaan bank kertas peperiksaan tahun lepas dengan sendirinya. Label `UASA`/`SPM` ialah laluan sasaran, bukan dakwaan bahawa pack ini ialah instrumen sebenar atau set lengkap. Semua `review=pending`, `reviewer=null`, `reviewedAt=null`.

Sumber awam yang mempunyai pautan muat turun belum membuktikan izin untuk menyalin, mengubah, menyimpan, memaparkan soalan satu demi satu, menggunakan skema, membina produk berbayar atau menggunakan AI atas kandungannya. Atribusi hanya merekod asal; lesen mesti mempunyai skop dan pemberi izin yang berhak. Audit ini merekod bukti yang kelihatan, bukan kesimpulan bahawa laman pihak ketiga melanggar hak.

## Pengelasan wajib

| Jenis | Bukti minimum sebelum diterbitkan | Jangan disamakan dengan |
|---|---|---|
| `past_exam` — SPM sebenar lepas | Kod 1449, tahun/sesi, muka depan/identiti LP, versi kertas dan skema, rantaian izin penggunaan digital | Trial negeri/MRSM, model penerbit atau koleksi yang hanya menggunakan nama SPM |
| `trial` — percubaan | Nama penyedia/organisasi, tahun, set/daerah, kertas dan skema sepadan, izin pemegang hak | Kertas sebenar SPM |
| `school_exam` — UASA sekolah lepas | Nama sekolah/penyedia, sesi dan darjah, bukti pernah ditadbir, versi/skema, hak sekolah/penulis yang disahkan | Buku model UASA, lembaran kerja atau satu peperiksaan kebangsaan seragam |
| `original` — Study | Rekod authoring, sumber idea umum, tarikh dan versi, semua keys/notes/rubrics original, semakan pendidik | Kertas tahun lepas, endorsement KPM atau kertas penuh |

Nota/format adalah rekod rujukan editorial, bukan `ExamPrivatePaper` untuk dijawab. Sumber dengan izin `unknown` tidak dimasukkan ke `EXAM_PAPERS`, termasuk dalam preview.

## Sumber rasmi dan format

Semua item di bawah diperiksa pada **2026-09-09**. “Dibaca” bermaksud teks halaman/PDF dapat dilihat melalui web reader; ia tidak bermakna semua contoh item telah diaudit.

| ID / sumber tepat | Jenis, tahun, akses | Bukti dan batas |
|---|---|---|
| F01 [KPM — Pentaksiran Berasaskan Sekolah](https://www.moe.gov.my/pentaksiran-berasaskan-sekolah) | Halaman rasmi KPM; dibaca | Menghubungkan panduan UASA dan format Tahap Dua **2025**. Footer mempunyai hak cipta terpelihara; tiada pemberian izin import bank soalan Study ditemukan pada halaman ini. |
| F02 [Format Instrumen UASA Tahap Dua Sekolah Rendah 2025](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/7.%20Format%20Instrumen%20UASA%20Tahap%20Dua%20Sekolah%20Rendah%202025.pdf) | PDF rasmi KPM, 10 halaman; dibaca | Halaman 6: Matematik Tahun 4/5/6, respons terhad/terbuka, Bahagian A 13 soalan/26 markah, B 2 soalan/24 markah; 50 markah, 75 minit, penskoran analitikal. Format 2025 ini tidak dianggap jaminan tiada perubahan kemudian. |
| F03 [Panduan Pengurusan dan Pentadbiran UASA & FAQ](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf) | PDF rasmi KPM, tajuk dalaman 2024/2025, 15 halaman; dibaca | Halaman 3 menerangkan UASA sebagai pentaksiran sumatif dalam PBD di sekolah. Halaman 7–8 meminta verifikasi instrumen/skema serta penyelarasan penskoran. Ini menyokong keperluan review pendidik, bukan lesen mengambil item. |
| F04 [Town Hall UASA dalam domain akaun moe.gov.my](https://sites.google.com/moe.gov.my/townhall-uasa2024/utama) | Halaman awam dibaca; ada pautan LP | Pautan “Format Pentaksiran SPM Mulai Tahun 2021” dikenal pasti. Bahan terbenam tidak dianggap telah dibaca. |
| F05 [LP — pautan Format Pentaksiran SPM mulai 2021](http://lp.moe.gov.my/index.php/makluman-spm/1018-format-pentaksiran-sijil-pelajaran-malaysia-spm-mulai-tahun-2021) | URL diambil tepat daripada F04; fetch menuju HTTPS **timeout** | Sasaran rasmi ditemukan tetapi isi semasa **belum dapat disahkan**. Jangan gunakan kegagalan ini sebagai alasan mengambil salinan pihak ketiga sebagai lesen. |
| F06 [KPM/LP — Jadual Waktu SPM 2025](https://www.moe.gov.my/storage/files/shares/Takwim/Takwim%20Peperiksaan/spm/Jadual%20Waktu%20Peperiksaan%20Sijil%20Pelajaran%20Malaysia%202025.pdf) | PDF rasmi, 19 halaman; dibaca | Indeks PDF 11/halaman bercetak 23: Matematik 1449/1 aneka pilihan 90 minit; 1449/2 150 minit. Sumber ini menyokong kod/tempoh 2025, bukan bilangan item/markah lengkap bagi edisi masa depan. Hak cipta Kerajaan Malaysia pada muka depan. |

**Implikasi preview:** UASA preview menggunakan numeric/structured sahaja; SPM mempunyai numeric, satu choice dan structured. Setiap pack ialah 6 soalan utama, 6 markah automatic dan 4 markah self-marked, tempoh percubaan produk 20 minit (UASA) / 25 minit (SPM). Bilangan dan masa ini **bukan format penuh rasmi**. Rubrik kecil Study bukan peraturan pemarkahan LP. Tahap kesukaran, DSKP per item dan wakilan konstruk belum disahkan oleh guru.

## Sumber calon GuruBesar dan bukti izin

`rights=unknown` untuk **semua** calon luar berikut. Tarikh artikel berbeza daripada tahun bahan. Halaman dibaca pada **2026-09-09** kecuali bukti arkib D4 yang dinyatakan bertarikh 2026-09-08.

| ID / sumber tepat | Jenis / tahap / tahun | Akses dan identiti yang kelihatan | Status izin / tindakan |
|---|---|---|---|
| G01 [Latihan Matematik Tahun 4](https://gurubesar.my/latihan-matematik-tahun-4/) | Worksheet D4; artikel 23/30 Jan 2025; bukan bukti UASA lepas | Kredit **Galeri Cikgu Rozzi**. [ZIP](https://gurubesar.my/wp-content/uploads/2025/01/Latihan-Matematik-Tahun-4.zip). Pada 2026-09-08 HEAD 200, 609487 bytes; directory dalam memory mengandungi 6 JPG. Halaman disemak semula 2026-09-09; isi JPG/skema tidak disahkan. | Tiada izin import ditemukan. Minta identiti pemegang hak dan izin bertulis melalui pemilik/penyedia yang disahkan. Jangan claim ini past school paper. |
| G02 [Nota Ringkas Padat Matematik Tahap 2](https://gurubesar.my/nota-ringkas-padat-matematik-tahap-2/) | Nota D4/D5/D6; artikel 29 Jan/18 Ogos 2025; tahun bahan tidak jelas | Tiga pautan Drive bernama Tahun 4.zip, Tahun 5.zip dan Tahun 6.zip. Pencipta asal tidak kelihatan dalam teks artikel. | Sesuai sebagai calon nota sokongan; tiada izin, isi, kelengkapan atau mapping DSKP disahkan. |
| G02a [Tahun 4.zip](https://drive.google.com/file/d/1pJv9LgDDoNUE40OMeecPCnP-SEUJIc7B/view?usp=drive_link) | D4, nota | Halaman Drive bernama fail dibuka; web reader hanya menunjukkan “Sign in”. **Bukan bukti fail rosak atau wajib login**; isi tidak terbaca melalui tool ini. | `unknown`; tiada cubaan login/bypass atau import. |
| G02b [Tahun 5.zip](https://drive.google.com/file/d/195E0a9nlbIApj4zCOGdt4gqDki4VIoFx/view?usp=drive_link) | D5, nota | Keadaan akses sama seperti G02a. | `unknown`; nota tidak dikira sebagai kertas UASA lepas. |
| G02c [Tahun 6.zip](https://drive.google.com/file/d/1RRtO4EYL1F4WifINgFXEGgOqNLOY-3jH/view?usp=drive_link) | D6, nota | Keadaan akses sama seperti G02a. | `unknown`; nota tidak dikira sebagai kertas UASA lepas. |
| G03 [Nota Padat Matematik Pecahan](https://gurubesar.my/nota-padat-matematik-pecahan/) | Nota topik pecahan, darjah khusus tidak dinyatakan; artikel 29 Jan/17 Ogos 2025 | [Nota-Pecahan.zip](https://gurubesar.my/wp-content/uploads/2025/01/Nota-Pecahan.zip) dikenal pasti; web reader tidak menyokong ZIP. Pencipta asal tidak kelihatan dalam teks. | Pautan bacaan lanjut sahaja; tiada soalan/nota disalin ke pack Study. |
| G04 [Himpunan Percubaan SPM Matematik](https://gurubesar.my/himpunan-percubaan-spm-matematik/) | Indeks **trial** 2023–2026; bukan indeks bukti actual SPM | Halaman dibaca; mempunyai MRSM, negeri, SBP dan lain-lain. | Tidak memberikan blanket license untuk setiap penyumbang. Pemeriksaan “terms of service” melalui pautan footer kembali kepada halaman yang sama, tanpa syarat penggunaan semula yang boleh dibaca. Ini hanya dapatan halaman diperiksa, bukan dakwaan tiada terms di seluruh laman. |
| G05 [Percubaan SPM Matematik MRSM 2025](https://gurubesar.my/percubaan-spm-matematik-mrsm-2025/) | `trial`, MRSM, **2025**; artikel 31 Okt/29 Nov 2025 | K1/K2 dan kedua skema disenaraikan. [Skema K1](https://gurubesar.my/wp-content/uploads/2025/10/PP-SPMRSM-1449-KERTAS-1-2025.pdf) dibaca, 2 halaman, jawapan 1–40; menyatakan **© Bahagian Pendidikan Menengah MARA 2025**. | Identiti pemegang hak dalam PDF jelas; izin penggunaan Study **belum ada**. Skema K2/padanan semua items dan izin pihak pengeluar belum disahkan. |
| G06 [Percubaan SPM Matematik Johor 2024](https://gurubesar.my/percubaan-spm-matematik-johor-2024/) | `trial`, Johor Bahru/Muar/MPSM, **2024**; artikel dikemas kini 15 Sep 2025 | [JB Set 2 K1 PDF](https://gurubesar.my/wp-content/uploads/2024/11/KERTAS-TRIAL-MATHS-K1-2024-SPM-JB-SET2.pdf) dibaca sebagai 15 halaman; muka pertama fail bernombor bercetak 5 dan hak cipta **MPKD Johor Bahru**. Label skema K1 JB Set1/2 tiada hyperlink; skema K2 berpaut. | `unknown`; completeness muka depan dan skema perlu diperiksa. Tahun kemas kini artikel tidak mengubah tahun trial. Tiada reuse grant kepada Study ditemukan. |

Carian bersasar “site:gurubesar.my UASA Matematik Tahun 4/5/6”, halaman himpunan latihan dan himpunan nota telah diperiksa. **Tiada calon kertas UASA Matematik sekolah yang pernah ditadbir dengan sekolah, sesi, skema dan izin digital lengkap dapat disahkan untuk D4, D5 atau D6.** Ini keputusan carian terbatas, bukan dakwaan bahan itu tidak wujud. Jangan isi jurang dengan buku teks/nota dan menandakan bank past papers siap.

## Calon actual past SPM di luar GuruBesar

P01 [Kertas Soalan Sebenar SPM 2021–2022 — Matematik](https://pubhtml5.com/fqgw/ptkt/basic/) dibaca pada **2026-09-09**. Akaun penerbit di halaman bernama **Pustaka Yakin Pelajar**; upload 27 Julai 2023. Preview menunjukkan muka depan LP SPM **2022 / 1449/1** dan hak cipta **Kerajaan Malaysia**. Ia juga menyenaraikan kertas model, jadi pengelasan mesti dibuat per kertas. Hanya preview 8 halaman, bukan pengesahan seluruh buku/skema; identiti akaun penerbit dan kontrak sublesen digital belum diperiksa. **Jenis calon `past_exam`, rights `unknown`, bukan sedia import.** Pembelian buku juga tidak dijadikan bukti izin menerbitkan bank digital.

Keutamaan permohonan: (1) sekolah/penyedia sah bagi satu set UASA D4, D5 dan D6 bersama skema; (2) MARA/penyedia yang berhak bagi trial MRSM; (3) LP/penerbit berlesen bagi actual past SPM. Untuk G01/G02/G03, GuruBesar boleh membantu mengenal pasti pencipta; pengesahan admin sebagai pengumpul tidak menggantikan izin pemegang hak asal.

## Coverage yang jujur

| Laluan | Original dalam code | Kertas lepas/trial boleh diterbitkan | Jurang utama |
|---|---:|---:|---|
| D4 Matematik | 6 utama + 6 retry; pending review | **0** | Sumber sekolah/sesi/skema dan izin belum diperoleh |
| D5 Matematik | 6 utama + 6 retry; pending review | **0** | Sama; calon nota luar bukan pengganti soalan exam |
| D6 Matematik | 6 utama + 6 retry; pending review | **0** | Sama; calon nota luar bukan pengganti soalan exam |
| SPM T4/T5 Matematik | 6 utama + 6 retry; pending review | **0** | Trial/past candidate ada, tetapi license dan editorial approval belum ada |

## Rekod authoring original dan review

Pada **2026-09-09**, agent kandungan membina 48 teks soalan baharu, solusi langkah demi langkah, nota pendek/contoh berasingan dan rubrik khusus untuk worktree ini. Nombor/situasi dibina untuk latihan aritmetik dan Matematik sekolah biasa. Tiada pipeline OCR/import, gambar, teks soalan, skema atau penukaran perkataan soalan pihak ketiga digunakan. `rights=owned` merekod provenance authoring projek ini; ia **bukan pendapat undang-undang mengenai copyright eksklusif kandungan berbantukan AI**. Source `year/url=null` kerana tiada kertas asal pihak ketiga.

| Pack ID v1 | Topik utama |
|---|---|
| `original-d4-math-preview` | Tambah pecahan, tambah perpuluhan, nilai digit, pecahan kuantiti, baki wang, luas segi empat tepat |
| `original-d5-math-preview` | Darab pecahan, bahagi perpuluhan, peratus kepada pecahan, peratus kuantiti, isi padu cecair, luas segi tiga |
| `original-d6-math-preview` | Bahagi pecahan, darab perpuluhan, nisbah, purata, laju/masa/jarak, diskaun |
| `original-spm-math-preview` | Kuadratik, kebarangkalian tanpa pengembalian, kecerunan, bentuk piawai, faedah mudah, Pythagoras |

Setiap retry mempunyai ID/prompt/jawapan berbeza, skill dan jenis respons yang sama. Note example juga berbeza daripada soalan. Prompt numeric meminta nilai, bukan syarat simplification yang grader tidak menguji. Jawapan structured: satu markah automatic untuk final value, dua markah self-marked untuk kerja; semakan kerja tidak dianggap penskoran rasmi.

**Review manusia belum berlaku.** Semakan matematik agent dan automated tests tidak mengisi `reviewer` atau `reviewedAt`. Guru mesti menilai DSKP, bahasa, prasyarat, tahap kesukaran, makna unit, penyelesaian alternatif dan keadilan rubrik. Ia penting khususnya bagi topik primer antara darjah dan topik prasyarat T1–T3 dalam preview SPM T4/T5.

## Checklist pendidik sebelum status approved

- [ ] Nama/kelayakan, tarikh sebenar, pack ID/version dan laporan review direkod.
- [ ] Setiap item mempunyai darjah yang tepat, standard DSKP rujukan dan prasyarat yang sesuai. Semak current syllabus, bukan tarikh artikel.
- [ ] Selesaikan semua 48 items secara bebas; semak keys, penyebut, unit, perpuluhan/tolerance dan semua langkah solusi.
- [ ] Semak primary/retry menguji skill setara tanpa membenarkan jawapan hafalan; banding beban bacaan dan kesukaran.
- [ ] Untuk structured, terima kaedah sah alternatif; manual rubric tidak menggandakan markah jawapan akhir, tidak mengajar langkah palsu, dan tidak memaksa self-score sebagai markah rasmi.
- [ ] Cuba sekurang-kurangnya satu jawapan salah bagi setiap skill; nota perlu menjelaskan misconception itu dalam bacaan singkat.
- [ ] Semak aksesibiliti simbol pecahan/kuasa/unit dan kefahaman BM pada telefon; semak prompt tidak memerlukan rajah yang tiada.
- [ ] Tentukan bahawa skop/timer/markah hanya preview; jangan lulus dakwaan set penuh atau ramalan gred tanpa bukti tambahan.
- [ ] Catat setiap isu/blocker dan pembetulan; review semula versi selepas pembetulan. Hanya pemeriksa sebenar boleh memberi bukti kelulusan; agent tidak mengarang tandatangan.

## Draf permohonan izin — belum dihantar

Subjek: Permohonan izin penggunaan digital bahan Matematik untuk Study IMAI

Salam sejahtera,

Saya sedang menyediakan Study IMAI (study.imai.my), tempat murid mengulang kaji soalan peperiksaan lepas dan membaca nota pendek apabila diperlukan.

Kami menemukan bahan berikut melalui GuruBesar.my:

1. Percubaan SPM Matematik MRSM 2025: https://gurubesar.my/percubaan-spm-matematik-mrsm-2025/
2. Latihan Matematik Tahun 4, dikreditkan kepada Galeri Cikgu Rozzi: https://gurubesar.my/latihan-matematik-tahun-4/

Kami juga mencari set UASA Matematik Darjah 4, 5 dan 6 yang sudah selesai ditadbir, mempunyai sesi/sekolah yang jelas serta skema jawapan. Bahan yang berlainan akan diurus dengan pemegang hak masing-masing.

Boleh pihak tuan/puan mengesahkan pemegang hak dan pihak yang berkuasa memberikan izin bagi bahan yang berada di bawah jagaan tuan/puan? Jika pihak tuan/puan hanya mengumpulkan pautan, kami menghargai rujukan kepada pemilik asal.

Skop yang ingin kami mohon ialah penyimpanan salinan yang dibenarkan di server Study; paparan soalan satu demi satu; penggunaan rajah dan skema; pemformatan yang mengekalkan makna; serta penyediaan penerangan tambahan yang dilabel sebagai penerangan Study. Sila nyatakan secara berasingan sama ada bantuan AI untuk pemformatan/penerangan dibenarkan. Kami tidak meminta hak melatih model AI atas bahan ini.

Mohon nyatakan dokumen/tahun/set yang diliputi, tempoh dan wilayah izin, skop akses percuma atau berbayar, atribusi wajib, sebarang bayaran, had jumlah pengguna, hak pembetulan dan proses menarik balik kandungan. Mohon juga pengesahan bahawa izin ini meliputi komponen pihak ketiga dalam soalan/rajah/skema, atau senaraikan pengecualiannya.

Kami belum memasukkan bahan tersebut ke bank soalan Study. Tiada tanggapan bahawa fail awam, pembelian buku atau atribusi sahaja membenarkan penerbitan semula. Kami akan menunggu bukti izin bertulis dan semakan pendidik sebelum menerbitkan kandungan yang dipohon.

Terima kasih.

Pasukan Study IMAI

Nota penghantaran: sesuaikan senarai dokumen dengan pemegang hak yang betul; jangan hantar permohonan MARA kepada pencipta worksheet lain. Tiada alamat penerima direka. Draf ini telah disediakan untuk semakan; **ia belum dihantar**.

## Evidence dan langkah seterusnya

- `npm test -- server/examCatalog.test.ts`: **53 tests lulus** pada 2026-09-09; merangkumi 48 expected-answer checks, ID/prompt/retry, markah, rubrik, note dan provenance. Test awal gagal kerana catalogue belum wujud, kemudian lulus selepas authoring.
- Strict targeted TypeScript check: lulus menggunakan `npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext server/examCatalog.ts server/examCatalog.test.ts`. Percubaan pertama tanpa `--ignoreConfig` ditolak TypeScript 6 kerana config wujud; tiada code error daripada percubaan itu.
- Root menyemak kiraan 48 items dan meminta retry D5 berjawapan berbeza serta prompt selari dengan numeric grader; pembetulan dibuat dan tests lulus semula.
- **Masih belum selesai:** izin pihak ketiga, set actual past paper lengkap, semakan guru, pemetaan DSKP lengkap, penentusahan format SPM terbaru daripada LP yang boleh dicapai, dan human learning trial. Lihat `EXAM_LEARNING_TRIAL.md`.
- Backend/publication gate, integration tests, browser QA dan deployment ialah tanggungjawab integrasi root. Audit ini tidak mendakwa ia sudah dijalankan.
