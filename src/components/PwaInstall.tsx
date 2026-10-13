import { useSyncExternalStore } from "react";
import { pwaInstallStore } from "../lib/pwaInstall";
import "./PwaInstall.css";

export function PwaInstall() {
  const status = useSyncExternalStore(pwaInstallStore.subscribe, pwaInstallStore.getSnapshot, pwaInstallStore.getSnapshot);
  if (status === "installed") return null;

  const canPrompt = status === "available" || status === "prompting";
  const notice = status === "accepted"
    ? "Permintaan pemasangan diterima. Ikut arahan pelayar dan semak ikon Study pada skrin utama."
    : status === "dismissed"
      ? "Pemasangan belum diteruskan. Anda boleh gunakan menu pelayar untuk memasang kemudian."
      : status === "error"
        ? "Dialog pemasangan belum dapat dibuka. Cuba langkah dalam Cara pasang Study."
        : "";

  return <section className="pwaInstall" aria-label="Pemasangan Study">
    {canPrompt && <div className="pwaInstallAction">
      <div><strong>Study di skrin utama</strong><p>Buka Study terus seperti aplikasi.</p></div>
      <button type="button" onClick={() => { void pwaInstallStore.install(); }} disabled={status === "prompting"}>
        {status === "prompting" ? "Membuka…" : "Install Study"}
      </button>
    </div>}
    <p className="pwaInstallNotice" role="status">{notice}</p>
    <details className="pwaInstallHelp">
      <summary>Cara pasang Study</summary>
      <ol>
        <li>Di Android, buka <strong>study.imai.my</strong> terus dalam <strong>Chrome</strong> menggunakan tab biasa.</li>
        <li>Tekan menu <strong>⋮</strong>, kemudian pilih <strong>Add to Home screen / Tambah pada skrin utama</strong> atau <strong>Install app / Pasang apl</strong>.</li>
        <li>Ikut arahan pelayar, kemudian buka Study melalui ikon pada skrin utama.</li>
      </ol>
      <p>Jika halaman dibuka dalam WhatsApp atau aplikasi lain, buka Chrome secara berasingan. Pemasangan mungkin tidak tersedia dalam pelayar dalam aplikasi atau tab Incognito / peribadi.</p>
      <p>Jika pilihan pemasangan tiada, semak sama ada Study sudah dipasang, kemas kini Chrome dan muat semula halaman. Pilihan menu bergantung pada pelayar dan peranti.</p>
    </details>
  </section>;
}
