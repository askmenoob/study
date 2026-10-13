import { useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import './StudyFooter.css';

const donationQrUrl = '/donation/duitnow-nik-azfar.jpg';

export function StudyFooter() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  function openDonation() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;

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
        <span className="donationFooterTagline">Belajar hari ini, selangkah lebih yakin.</span>
      </div>
      <button
        ref={triggerRef}
        className="donationTrigger"
        type="button"
        aria-haspopup="dialog"
        onClick={openDonation}
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
          <h2 id={titleId} className="donationTitle">Buy me ☕</h2>
          <button
            className="donationClose"
            type="button"
            aria-label="Tutup tetingkap sumbangan"
            onClick={closeDonation}
            autoFocus
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="donationBody">
          <p id={descriptionId} className="donationDescription">
            Sumbangan sukarela anda membantu menyokong IMAI Study.
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
          </a>
        </div>
      </dialog>
    </footer>
  );
}
