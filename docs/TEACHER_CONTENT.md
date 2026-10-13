# Modul Guru IMAI Study

## Matlamat pilot

Modul ini membolehkan guru sebenar membina kelas mengikut subjek dan berkongsi bahan dengan murid yang menyertai kelas itu. Akaun yang sama boleh mempunyai ruang **Ibu bapa** dan **Guru**. Pertukaran ruang tidak memerlukan akaun atau kata laluan kedua.

Pilot hanya menerima bahan **plain text original**. PDF, Word, PowerPoint, imej, audio, video dan pautan luar belum dibuka kerana fail memerlukan quarantine, malware scanning, storage quota, takedown dan audit tambahan.

## Aliran permohonan guru

1. Pemohon mendaftar atau log masuk sebagai ibu bapa.
2. Pemohon membuka **Tetapan > Mohon sebagai guru**.
3. Borang meminta nama penuh, nama paparan awam, sekolah, daerah, negeri, jawatan, tahun akademik, darjah dan subjek.
4. Pemohon mengesahkan maklumat adalah benar, bahan mesti original dan data peribadi murid tidak boleh dimasukkan.
5. Permohonan disimpan sebagai `pending`. Fungsi guru kekal dikunci.
6. Super admin menyemak identiti dan sekolah secara manual, kemudian memilih `approve`, `needs_info` atau `reject`.
7. Kelulusan menambah role `teacher` tanpa membuang role `parent`. Kelulusan IMAI bukan akreditasi KPM.
8. Super admin boleh menggantung akses guru. Ruang ibu bapa dan rekod keluarga tidak terjejas.

## Aliran kelas dan murid

1. Guru mencipta kelas untuk satu sekolah, tahun akademik, darjah dan subjek yang sudah diluluskan.
2. Sistem menghasilkan class code 8 aksara. Code penuh hanya dipaparkan semasa penciptaan atau rotation; database menyimpan digest dan empat aksara terakhir sebagai hint. Hint bukan code join dan UI mesti menyatakannya dengan jelas.
3. Ibu bapa memasukkan code dan melihat nama awam guru, badge **Guru disahkan IMAI**, sekolah, darjah, subjek dan tahun sebelum bersetuju.
4. Ibu bapa memberi persetujuan bagi anak tertentu. Permintaan menjadi `pending_teacher`.
5. Guru menerima atau menolak murid. Bahan guru hanya boleh dilihat selepas penerimaan.
6. Seorang murid hanya mempunyai seorang guru aktif bagi satu subjek. Semasa pertukaran, guru lama kekal aktif sehingga guru baharu menerima murid.
7. Ibu bapa boleh membatalkan permintaan atau meninggalkan kelas. Sejarah audit dikekalkan.

## Bahan pembelajaran

1. Guru memilih kelas miliknya sebelum menghantar bahan.
2. Guru memasukkan jenis bahan, tajuk, ringkasan dan isi plain text.
3. Guru wajib mengesahkan bahan itu original, mempunyai hak penggunaan dan tidak mengandungi data peribadi murid.
4. Bahan plain text daripada guru yang profile dan kelasnya masih aktif diterbitkan terus sebagai `published` dengan sumber `verified_teacher_auto`.
5. Bahan auto-published masuk ke queue **Belum disemak**. Super admin boleh menandakan telah disemak atau menolak; sebab wajib bagi penolakan dan penarikan balik.
6. Hanya bahan `published` daripada kelas aktif, guru aktif dan enrollment aktif dipulangkan kepada murid.
7. Bahan `pending`, `rejected` atau `withdrawn` tidak kelihatan kepada murid.
8. Super admin boleh menarik balik bahan yang sudah diterbitkan.

Library IMAI kekal sebagai bahan permulaan berasingan apabila guru belum menerbitkan bahan. Ia tidak ditampilkan sebagai bahan guru dan tidak masuk ke dalam laporan guru.

## Nilai dan perlindungan untuk pengguna

- **Onboarding jelas:** borang dipecahkan kepada maklumat diri, sekolah/skop dan pengesahan; status semakan sentiasa dipaparkan.
- **Kepercayaan:** murid hanya melihat guru yang diluluskan super admin, bersama identiti awam dan konteks sekolah/subjek. Badge menerangkan pengesahan IMAI dan tidak mendakwa pengesahan KPM.
- **Tiada inbox bising:** pilot tidak menghantar email, WhatsApp atau push notification automatik. Tindakan penting muncul dalam dashboard.
- **Kerja guru terarah:** dashboard menonjolkan permintaan murid yang perlu tindakan, class code, queue bahan dan roster murid aktif.
- **Kawalan ibu bapa:** butiran kelas dipaparkan sebelum persetujuan; ibu bapa boleh batal, keluar atau tukar guru tanpa kehilangan akses terlalu awal.
- **Privasi murid:** guru hanya melihat murid yang diterima dalam kelasnya. Pilot tidak menganggap semua latihan subjek sebagai kemajuan bahan guru; tracking khusus akan memerlukan event bahan yang berasingan.

## Sempadan keselamatan

- Registration awam tidak boleh mencipta role guru.
- Role disemak semula daripada database pada route sensitif; token role yang sudah digantung tidak kekal berkuasa.
- Kelulusan guru membuka auto-publish plain text sahaja. Setiap bahan masih mempunyai post-review, audit dan takedown oleh super admin.
- Guru hanya boleh mencipta kelas bagi darjah dan subjek yang diluluskan.
- Audience bahan ditentukan oleh enrollment kelas-subjek aktif, bukan sekadar darjah murid.
- Nama awam guru digunakan kepada murid; email guru, nota reviewer dan attestations dalaman tidak dihantar.
- React merender bahan sebagai teks biasa tanpa `dangerouslySetInnerHTML`.
- Submission tidak boleh diedit selepas dihantar. Pembetulan menjadi submission baharu dan melalui review semula.
- `clientRequestId` unik menghalang rekod berganda selepas retry rangkaian.
- Had 20 submission sejam dan maksimum 20 bahan auto-published yang belum disemak mengurangkan spam moderation.
- Semua keputusan penting direkodkan dalam audit trail.

## Semakan release minimum

- Registration menghasilkan role parent dan role kedua tidak memadam role pertama.
- Permohonan guru tidak memberi akses sebelum super admin meluluskan.
- Guru tidak boleh mencipta kelas di luar skop darjah/subjeknya.
- Ibu bapa melihat identiti kelas sebelum consent; guru mesti menerima murid.
- Pertukaran guru tidak memutuskan guru lama sebelum guru baharu menerima.
- Bahan guru aktif terikat kepada kelas, diterbitkan terus dan kekal dalam queue post-review sehingga disemak.
- Murid hanya melihat bahan published daripada kelas aktif miliknya.
- Suspension memutuskan akses guru tetapi tidak merosakkan ruang ibu bapa.
- Migration selamat dijalankan lebih daripada sekali pada PostgreSQL sementara.
- Typecheck, build web/API, focused tests dan regression tests lulus.
- Browser UAT meliputi permohonan, approval, pertukaran role, penciptaan kelas, consent, penerimaan murid, moderation, paparan murid, pertukaran guru dan keluar kelas.

## Perkara yang belum termasuk

- Upload fail atau rich-text editor.
- Notifikasi email, WhatsApp atau push.
- Jemputan melalui directory awam guru; pilot menggunakan class code.
- Pengesahan automatik terhadap pangkalan data KPM.
- Penggunaan bahan guru oleh AI Tutor.
- Edit atau versioning bahan yang sudah diluluskan.
- Penilaian rasmi PBD, TP atau dakwaan peningkatan akademik.

Sebelum peluasan, jalankan pilot kecil dengan sekurang-kurangnya tiga guru dan lima keluarga. Ukur sama ada mereka boleh memohon, menyertai kelas, memahami badge, mencari tindakan yang menunggu dan keluar atau menukar guru tanpa bantuan pentadbir.
