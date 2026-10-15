import { useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import './StudyFooter.css';

const donationQrUrl = '/donation/duitnow-nik-azfar.jpg';

export function StudyFooter() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [dialogKind,setDialogKind]=useState<"donation"|"privacy">("donation");
  const [privacyRefresh,setPrivacyRefresh]=useState(0);
  const [privacyPolicy,setPrivacyPolicy]=useState<{retentionApproved:boolean;reviewCandidateDays:{tutor:number|null;support:number|null;kyc:number|null}}|null>(null);
  const [privacyError,setPrivacyError]=useState(false);
  useEffect(()=>{if(!privacyRefresh)return;const controller=new AbortController();setPrivacyPolicy(null);setPrivacyError(false);void fetch("/api/privacy",{signal:controller.signal,cache:"no-store"}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(policy=>{if(!controller.signal.aborted)setPrivacyPolicy(policy);}).catch(()=>{if(!controller.signal.aborted)setPrivacyError(true);});return()=>controller.abort();},[privacyRefresh]);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  function openDonation(kind:"donation"|"privacy"="donation") {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;

    setDialogKind(kind);
    if(kind==="privacy")setPrivacyRefresh(value=>value+1);
    setHasOpened(true);
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    cleanupRef.current = () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }

  function closeDonation() {
    dialogRef.current?.close();
    restorePage();
  }

  function restorePage() {
    const cleanup = cleanupRef.current;
    cleanupRef.current = null;
    cleanup?.();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closeDonation();
  }

  return (
    <footer className="focusFooter donationFooter">
      <div className="donationFooterCopy">
        <strong className="donationFooterName">IMAI Study</strong>
        <span className="donationFooterTagline">Percuma sepenuhnya · Sumbangan sukarela</span>
      </div>
      <button className="donationTrigger" type="button" aria-haspopup="dialog" onClick={()=>openDonation("privacy")}>Privasi &amp; data</button>
      <button
        ref={triggerRef}
        className="donationTrigger"
        type="button"
        aria-haspopup="dialog"
        onClick={()=>openDonation()}
      >
        Buy me ☕
      </button>
      <dialog
        ref={dialogRef}
        className="donationDialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={closeOnBackdrop}
        onCancel={(event) => { event.preventDefault(); closeDonation(); }}
        onClose={() => { if (!dialogRef.current?.open) restorePage(); }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
      >
        <div className="donationHeader">
          <h2 id={titleId} className="donationTitle">{dialogKind==="privacy"?"Privasi & data":"Buy me ☕"}</h2>
          <button
            className="donationClose"
            type="button"
            aria-label={dialogKind==="privacy"?"Tutup maklumat privasi":"Tutup tetingkap sumbangan"}
            onClick={closeDonation}
            autoFocus
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="donationBody">
          {dialogKind==="privacy"?<div id={descriptionId} className="studyPrivacyNotice">
            <p><strong>Program percuma.</strong> Tiada bayaran diperlukan untuk belajar. Sumbangan Buy me ☕ adalah sukarela dan tidak menentukan akses.</p>
            <h3>Akaun keluarga dan rekod belajar</h3><p>Ibu bapa atau penjaga mengurus profil anak. Sistem menyimpan maklumat akaun, profil, jawapan latihan, kemajuan, perbualan AI Tutor dan rekod kelas untuk menyediakan pembelajaran dan laporan.</p>
            <h3>Guru dan kelas</h3><p>Guru yang diluluskan hanya mendapat akses mengikut hubungan kelas yang aktif. Bahan, tugasan, kehadiran dan pautan video dikawal mengikut peserta. Admin mengurus permohonan guru dan laporan keselamatan.</p>
            <h3>AI Tutor dan pautan luar</h3><p>Kandungan soalan dan konteks pembelajaran yang diperlukan boleh dihantar kepada pembekal AI. Jangan masukkan nombor pengenalan, alamat, telefon atau maklumat peribadi dalam soalan atau bahan. Bilik video dan sumbangan melalui penyedia luar tertakluk pada perkhidmatan penyedia tersebut.</p>
            <h3>Simpanan dan pemadaman</h3><p>Tiada pemadaman berkala automatik diaktifkan. Rekod sokongan dan semakan guru memerlukan semakan admin; rekod yang layak disenaraikan untuk semakan admin, bukan dipadam secara automatik. Backup diurus berasingan dan tidak dipadam serta-merta apabila profil dipadam.</p>
            {privacyPolicy?.retentionApproved?<p>Calon semakan: log AI Tutor {privacyPolicy.reviewCandidateDays.tutor??"belum ditetapkan"} hari; tiket sokongan selesai {privacyPolicy.reviewCandidateDays.support??"belum ditetapkan"} hari; metadata permohonan guru ditolak atau ditarik balik {privacyPolicy.reviewCandidateDays.kyc??"belum ditetapkan"} hari. Rekod aktif dan hold dikecualikan.</p>:<p role="status">{privacyError?"Tetapan simpanan belum dapat dimuatkan. Cuba buka semula maklumat privasi.":privacyPolicy?"Tempoh calon semakan belum diluluskan.":"Memuatkan polisi simpanan..."}</p>}
            <p>Penjaga boleh memadam profil anak melalui pengurusan profil. Untuk permintaan akses, pembetulan atau semakan pemadaman rekod lain, hantar maklum balas daripada akaun ibu bapa. Jangan sertakan dokumen identiti dalam maklum balas.</p>
            <p>Maklumat operasi: 16 Oktober 2026.</p>
          </div>:<><p id={descriptionId} className="donationDescription">
            study.imai.my percuma sepenuhnya. Sumbangan sukarela anda membantu menyokong IMAI Study; sumbangan tidak diperlukan untuk mengakses pembelajaran.
            {' '}Terima kasih atas sokongan anda.
          </p>
          {hasOpened ? (
            <img
              className="donationQr"
              src={donationQrUrl}
              width={975}
              height={1536}
              alt="Kod QR DuitNow untuk sumbangan kepada Nik Azfar bin Nik Zainal"
              decoding="async"
            />
          ) : null}
          <a
            className="donationDownload"
            href={donationQrUrl}
            download="duitnow-nik-azfar.jpg"
          >
            Simpan QR
          </a></>}
        </div>
      </dialog>
    </footer>
  );
}
