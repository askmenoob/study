import { useId, useState } from "react";
import { ExternalLink, MonitorSmartphone, ShieldCheck } from "lucide-react";
import "./DeviceSetupGuide.css";

type Platform = "android" | "ios" | "windows";
type Guide = {
  title: string;
  method: string;
  prerequisites: string;
  steps: Array<{ title: string; text: string }>;
  localExit: string;
  offline: string;
  limitation: string;
  managed: string;
  sources: Array<{ title: string; url: string }>;
};

const guides: Record<Platform, Guide> = {
  android: {
    title: "Android",
    method: "App pinning · aktifkan pada peranti",
    prerequisites: "Sediakan PIN, pattern atau password skrin yang hanya ibu bapa tahu. Nama menu berbeza mengikut jenama telefon.",
    steps: [
      { title: "Hidupkan App pinning", text: "Buka Settings → Security / Security & location → Advanced → App pinning. Hidupkan pilihan meminta PIN sebelum unpin jika pilihan itu dipaparkan." },
      { title: "Buka profil anak", text: "Buka link belajar pada peranti anak. Pastikan nama anak betul sebelum mengaktifkan pinning. Jika mahu menggunakan PWA, masuk ke sesi melalui aplikasi PWA itu sendiri." },
      { title: "Pin aplikasi yang sedang digunakan", text: "Buka Recent apps / Overview, tekan ikon aplikasi di bahagian atas kad, kemudian pilih Pin. Semak bahawa aplikasi lain tidak boleh digunakan sebelum menyerahkan peranti." },
    ],
    localExit: "Pada gesture navigation, swipe ke atas dan tahan. Pada navigasi 3 butang, tahan Back + Overview; 2 butang, tahan Back + Home. Ibu bapa masukkan PIN, pattern atau password apabila diminta.",
    offline: "Jika internet terputus, ibu bapa masih boleh unpin secara setempat dengan pengesahan skrin. Sambungkan internet semula untuk menyemak sesi Study.",
    limitation: "App pinning ialah pilihan manual. Jika anak mengetahui pengesahan skrin, ia tidak menyediakan kawalan keluar khusus untuk ibu bapa.",
    managed: "Auto-lock dan unlock daripada dashboard memerlukan aplikasi native, device management / DPC dan Lock Task Mode yang dikonfigurasi pada peranti. Memasang PWA sahaja tidak mengaktifkannya.",
    sources: [
      { title: "Google: Pin dan unpin", url: "https://support.google.com/android/answer/9455138?hl=en" },
      { title: "Android: Lock Task Mode", url: "https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode" },
    ],
  },
  ios: {
    title: "iPhone / iPad",
    method: "Guided Access · aktifkan pada peranti",
    prerequisites: "Tetapkan passcode Guided Access yang berasingan dan hanya ibu bapa tahu. Jangan gunakan Face ID / Touch ID anak sebagai cara menamatkan Guided Access.",
    steps: [
      { title: "Sediakan Guided Access", text: "Buka Settings → Accessibility → Guided Access. Hidupkan fungsi ini. Dalam Passcode Settings, pilih Set Guided Access Passcode." },
      { title: "Buka sesi anak", text: "Buka link belajar dalam aplikasi yang anak akan gunakan. Pastikan nama anak betul. Buka sesi dalam PWA terlebih dahulu jika mahu mengunci pada PWA itu." },
      { title: "Mulakan sekatan", text: "Triple-click butang sisi, butang atas atau Home. Pilih Guided Access jika menu muncul, semak Session Settings / Options dan tekan Start." },
    ],
    localExit: "Triple-click butang sisi, atas atau Home. Masukkan passcode Guided Access, kemudian tekan End. Pada iOS 18 / iPadOS 18 atau lebih lama, Apple menetapkan double-click untuk membuka skrin pengesahan.",
    offline: "Pengesahan dengan passcode pada peranti masih boleh digunakan tanpa internet. Masa Study habis atau kelulusan dashboard tidak mematikan Guided Access.",
    limitation: "Time limit Guided Access tidak membuka peranti secara automatik. Apple juga menyatakan Emergency Services dan Crash Detection tidak tersedia semasa Guided Access; tamatkan sesi untuk menggunakannya.",
    managed: "Unlock OS melalui dashboard memerlukan aplikasi native yang ditandatangani, Mac/Xcode, supervised device dan allowlist Autonomous Single App Mode melalui pengurusan peranti. Menambah supervision pada peranti sedia ada memerlukan pemadaman peranti; sediakan backup dan persetujuan berasingan sebelum langkah itu.",
    sources: [
      { title: "Apple: Guided Access", url: "https://support.apple.com/en-us/111795" },
      { title: "Apple: Single App Mode", url: "https://developer.apple.com/videos/play/wwdc2022/10152/" },
      { title: "Apple: Supervision", url: "https://support.apple.com/guide/deployment/about-device-supervision-dep1d89f0bff/web" },
    ],
  },
  windows: {
    title: "Windows",
    method: "Assigned Access + Microsoft Edge",
    prerequisites: "Perlu Windows Pro, Enterprise, Education atau IoT Enterprise. Windows Home tidak menyokong Assigned Access. Kekalkan akaun administrator ibu bapa berasingan, lindungi akaun lain dan pastikan UAC aktif.",
    steps: [
      { title: "Cipta akaun kiosk", text: "Pada PC anak, log masuk sebagai administrator. Buka Settings → Accounts → Other users → Set up a kiosk. Cipta akaun standard khusus untuk Study." },
      { title: "Tetapkan Microsoft Edge", text: "Pilih Microsoft Edge → Digital / Interactive Signage. Gunakan https://study.imai.my/ sebagai startup URL tetap. Jangan simpan link anak sekali guna sebagai startup URL." },
      { title: "Masuk ke kiosk", text: "Sign out daripada akaun administrator dan log masuk ke akaun kiosk pada PC tersebut. Edge akan membuka Study. Sesi browser biasa tidak dibawa masuk kerana kiosk menggunakan InPrivate." },
      { title: "Masukkan link di dalam kiosk", text: "Pada halaman Study, pilih Buka link belajar. Taip atau tampal link baharu yang disediakan ibu bapa, kemudian buka sesi. Semak nama anak sebelum menyerahkan PC. Jangan gunakan semula link yang sudah ditebus sebelum masuk kiosk." },
    ],
    localExit: "Ctrl + Alt + Del keluar daripada kiosk ke skrin sign-in. Untuk menggunakan aplikasi lain, ibu bapa log masuk ke akaun mereka. Shortcut ini masih boleh membawa anak ke skrin sign-in; rahsiakan akses akaun yang tidak dihadkan.",
    offline: "Jika sambungan gagal, ibu bapa boleh gunakan Ctrl + Alt + Del dan log masuk dengan akaun tempatan mereka. Jika Edge dimulakan semula, sediakan link baharu kerana sesi InPrivate mungkin telah dibersihkan.",
    limitation: "Fullscreen Edge biasa tidak sama dengan Assigned Access. Ujian kiosk mesti dibuat terus pada PC; ia tidak disokong melalui Remote Desktop.",
    managed: "Kelulusan dashboard menamatkan sesi Study sahaja. Untuk unlock OS dari jauh, PC memerlukan companion / device management yang telah dipasang, dipadankan dan diuji. Panduan ini tidak memasang atau mengaktifkan komponen tersebut.",
    sources: [
      { title: "Microsoft: Keperluan Windows", url: "https://learn.microsoft.com/en-us/windows/configuration/assigned-access/" },
      { title: "Microsoft: Setup dan keluar kiosk", url: "https://learn.microsoft.com/en-us/windows/configuration/assigned-access/configure-single-app-kiosk" },
      { title: "Microsoft: Edge kiosk", url: "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode" },
    ],
  },
};

export function DeviceSetupGuide() {
  const [platform, setPlatform] = useState<Platform | "">("");
  const selectId = useId();
  const guide = platform ? guides[platform] : null;
  return <details className="deviceSetupGuide">
    <summary><MonitorSmartphone aria-hidden="true"/><span>Persediaan peranti anak</span></summary>
    <div className="deviceSetupBody">
      <p className="deviceSetupIntro">Pilih peranti yang digunakan oleh anak. Study tidak dapat mengesan atau mengesahkan lock sistem operasi daripada PWA.</p>
      <label className="deviceSetupSelect" htmlFor={selectId}>Peranti anak
        <select id={selectId} value={platform} onChange={(event) => setPlatform(event.target.value as Platform | "")}>
          <option value="">Pilih peranti anak</option>
          <option value="android">Android</option>
          <option value="ios">iPhone / iPad</option>
          <option value="windows">Windows</option>
        </select>
      </label>
      {guide && <section className="deviceSetupPlatform" aria-label={"Panduan " + guide.title}>
        <div className="deviceSetupTitle"><h3>{guide.title}</h3><span>{guide.method}</span></div>
        <p className="deviceSetupPrerequisites">{guide.prerequisites}</p>
        <ol className="deviceSetupSteps">{guide.steps.map((step) => <li key={step.title}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
        <div className="deviceSetupRecovery">
          <h4>Keluar dengan ibu bapa</h4><p>{guide.localExit}</p>
          <h4>Jika tiada internet</h4><p>{guide.offline}</p>
        </div>
        <p className="deviceSetupLimit">{guide.limitation}</p>
        <details className="deviceSetupManaged">
          <summary><ShieldCheck aria-hidden="true"/> Auto-lock dan unlock melalui dashboard</summary>
          <p>{guide.managed}</p>
          <p>Dalam setup manual, pengesahan keluar di Study hanya menamatkan sesi belajar. Sekatan OS masih perlu ditamatkan melalui kawalan peranti oleh ibu bapa.</p>
        </details>
        {platform === "windows" && <p className="deviceSetupLimit"><a href="/device-setup/windows-preflight.ps1" download>Semak kesediaan Windows (skrip baca sahaja)</a><br/>Muat turun dan semak skrip sebelum menjalankannya dalam PowerShell. Ia tidak memasang kiosk atau mengubah tetapan PC.</p>}
        <div className="deviceSetupSources" aria-label="Panduan rasmi">{guide.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink aria-hidden="true"/><span className="deviceSetupSrOnly"> (buka tab baharu)</span></a>)}</div>
      </section>}
    </div>
  </details>;
}
