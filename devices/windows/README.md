# Persediaan Windows kiosk untuk IMAI Study

Kit ini menyediakan semakan read-only dan XML untuk disemak. Ia **tidak mengaktifkan kiosk**, tidak memasang agent, tidak mengubah akaun, registry, scheduled task atau policy Windows. Ia bukan remote unlock daripada dashboard ibu bapa.

## Apa yang disediakan

- `windows-preflight.ps1`: lapor Edition, build, Edge, UAC dan jenis session apabila diketahui. Tiada credentials, nama pengguna atau identiti peranti dimasukkan dalam laporan.
- `New-StudyKioskConfig.ps1`: hasilkan satu fail XML sahaja, terikat kepada **akaun local standard sedia ada** yang dinyatakan secara jelas.
- `Test-PreparationKit.ps1`: syntax dan fixture tests. Akaun dimock dalam process test; tiada akaun Windows dicipta.
- Salinan download preflight: `/device-setup/windows-preflight.ps1`, sama dengan fail dalam folder ini.

## Sokongan dan had

Assigned Access menyokong Windows Pro, Enterprise, Education dan IoT Enterprise. Windows Home tidak disokong. Kit ini menyasarkan Windows 11 dengan Edge machine-wide dan Windows PowerShell 64-bit. UAC mesti aktif. Semakan session boleh menjadi `Unknown` apabila tool berjalan dalam service; ia bukan bukti console session.

Edge `--kiosk` sahaja menyediakan browser kiosk. Windows Assigned Access diperlukan untuk sekatan OS. Kiosk mesti disemak dari console fizikal; Microsoft tidak menyokong pengalaman ini melalui RDP.

Secara default, `Ctrl+Alt+Del` boleh membawa murid ke sign-in screen. Ini **bukan approval ibu bapa** dan tidak memanggil Study API. Untuk membuka akaun Windows lain, credentials akaun tersebut masih diperlukan. Kit mengekalkan breakout default untuk recovery. Ia tidak menyembunyikan atau menukar shortcut itu.

Assigned Access mengehadkan aplikasi Windows, tetapi kit ini tidak memasang URLAllowlist atau URLBlocklist Edge. Ia belum membuktikan bahawa Edge hanya boleh melawat host Study; pautan kandungan, navigasi atau dialogs masih perlu diuji dan policy URL berasingan diperlukan jika sekatan website penuh dikehendaki.

Dalam kiosk, pilih **Buka link belajar** dan masukkan link baharu yang ibu bapa sediakan. Session daripada browser biasa tidak berpindah ke Edge kiosk InPrivate. Jika session hilang selepas browser ditutup atau restart, ibu bapa perlu menyediakan link baharu; link yang sudah redeemed tidak boleh digunakan semula.

Status `approved` pada Study hanya menamatkan focus session dalam app. Kit ini tidak menghubungkan status tersebut kepada Windows dan tidak boleh mendakwa OS sudah unlocked. Edge InPrivate juga boleh memadam session apabila browser ditutup; URL kiosk kekal pada halaman utama, tanpa invite code atau token.

## Semak dahulu

Jalankan dalam Windows PowerShell biasa, tanpa elevation:

```powershell
.\windows-preflight.ps1
```

Jika execution policy menyekat script, berhenti dan semak polisi organisasi. Kit tidak menukar atau bypass execution policy.

## Hasilkan XML untuk review

Gunakan akaun murid local standard yang memang sudah wujud. Jangan gunakan akaun ibu bapa, administrator atau akaun kerja utama. Generator membaca akaun dan keahlian Administrators menggunakan SID kumpulan supaya tidak bergantung pada bahasa Windows. Jika bacaan akaun gagal, ia tidak menghasilkan konfigurasi.

```powershell
.\New-StudyKioskConfig.ps1 -KioskAccount 'StudyChild' -OutputPath 'C:\Temp\study-kiosk.xml' -WhatIf
.\New-StudyKioskConfig.ps1 -KioskAccount 'StudyChild' -OutputPath 'C:\Temp\study-kiosk.xml'
```

Folder output mesti sudah wujud. Fail sedia ada tidak ditindih. `-WhatIf` membuat validation tanpa menulis fail; panggilan biasa hanya menulis XML. Kedua-duanya tidak apply setting. URL tetap ialah `https://study.imai.my/`. Tiada auto-logon, global profile atau download token dalam XML.

## Manual setup kemudian, selepas pemilik sedia

Cara paling mudah untuk satu peranti ialah Windows **Settings → Accounts → Other users → Kiosk → Get started**. Pilih akaun local standard khusus dan Microsoft Edge, kemudian fullscreen dengan URL `https://study.imai.my/`. Semak pilihan automatic sign-in Windows mengikut dokumentasi sebelum setup; Windows boleh mengkonfigurasinya melalui wizard.

Sebelum mengaktifkan, pastikan akaun administrator ibu bapa berasingan boleh digunakan dan credentials recovery tersedia di luar akaun kiosk. Simpan backup konfigurasi kiosk sedia ada serta backup data peranti. Kit ini tidak membuat backup atau apply bagi pihak pengguna. Jangan lakukan pada komputer kerja utama semata-mata untuk menguji.

Selepas setup manual, uji pada console: sign-in murid membuka Study, cubaan membuka aplikasi lain, default breakout ke sign-in, dan akses recovery ibu bapa. Semak semula selepas reboot. Untuk remove konfigurasi melalui Settings, gunakan **Other users → Kiosk → Remove kiosk**. Jangan anggap semua setting lain automatik kembali seperti asal.

XML dalam kit ialah artifact review untuk pengurusan Assigned Access; Settings wizard tidak mengimport fail ini secara langsung. Tiada apply script disediakan.

## Tests

```powershell
.\Test-PreparationKit.ps1
```

Tests membaca capability sebenar, kemudian mock akaun/edition/UAC dalam process berasingan dan menulis XML ke folder temporary unik. Folder tersebut dibersihkan selepas test. Lulus tests ini membuktikan preparation kit; ia tidak membuktikan OS kiosk berjalan.

## Rujukan rasmi

- [Assigned Access dan edition yang disokong](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/)
- [Microsoft Edge kiosk dan hadnya](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode)
- [Setup single-app kiosk, breakout dan removal](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/configure-single-app-kiosk)
- [Format XML dan existing local account](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/configuration-file)
