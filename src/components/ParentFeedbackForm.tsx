import { useState } from "react";
import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { makeUuid } from "../lib/id";
import { FeedbackApiError, feedbackApi, type FeedbackCategory } from "../lib/feedbackApi";
import "./ParentFeedbackForm.css";

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 10;

export function validateParentFeedback(message: string): string | null {
  const length = message.trim().length;
  if (!length) return "Masukkan cadangan atau maklum balas anda.";
  if (length < MIN_MESSAGE_LENGTH) return `Tulis sekurang-kurangnya ${MIN_MESSAGE_LENGTH} aksara supaya kami dapat memahaminya.`;
  if (length > MAX_MESSAGE_LENGTH) return "Maklum balas tidak boleh melebihi 2,000 aksara.";
  return null;
}

export function shouldRetryFeedbackWithSameRequestId(error: unknown): boolean {
  return !(error instanceof FeedbackApiError) || error.status >= 500;
}

export function ParentFeedbackForm({ pagePath = "/settings" }: { pagePath?: string }) {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [allowReply, setAllowReply] = useState(false);
  const [clientRequestId, setClientRequestId] = useState(() => makeUuid());
  const [busy, setBusy] = useState(false);
  const [retryLocked, setRetryLocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resetForNewFeedback = () => {
    setCategory("suggestion");
    setMessage("");
    setAllowReply(false);
    setClientRequestId(makeUuid());
    setRetryLocked(false);
    setError("");
    setNotice("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const validationError = validateParentFeedback(message);
    if (validationError) { setError(validationError); setNotice(""); return; }

    setBusy(true); setError(""); setNotice("");
    try {
      const result = await feedbackApi.submit({
        clientRequestId,
        category,
        message: message.trim(),
        pagePath,
        allowReply,
      });
      const success = `Maklum balas ${result.feedback.referenceId} telah disimpan dan tersedia dalam inbox pentadbir.`;
      resetForNewFeedback();
      setNotice(success);
    } catch (caught) {
      const uncertain = shouldRetryFeedbackWithSameRequestId(caught);
      setRetryLocked(uncertain);
      if (caught instanceof FeedbackApiError && [401, 403].includes(caught.status)) {
        setError("Sesi anda telah tamat atau akaun ini tidak dibenarkan menghantar maklum balas. Log masuk semula.");
      } else if (caught instanceof FeedbackApiError && caught.status === 429) {
        setError("Terlalu banyak maklum balas dihantar. Tunggu sebentar sebelum cuba lagi.");
      } else if (caught instanceof FeedbackApiError && caught.status === 409) {
        setClientRequestId(makeUuid());
        setError("Permintaan ini bercanggah dengan rekod sedia ada. Semak maklum balas dan hantar semula.");
      } else if (caught instanceof FeedbackApiError && caught.status < 500) {
        setError("Maklum balas tidak dapat diterima. Semak maklumat yang dimasukkan dan cuba lagi.");
      } else {
        setError("Simpanan belum dapat disahkan. Semak sambungan dan cuba semula; permintaan yang sama akan digunakan untuk mengelakkan rekod pendua.");
      }
    } finally {
      setBusy(false);
    }
  };

  return <section className="parentFeedback" aria-labelledby="parent-feedback-title">
    <div className="parentFeedbackHeading">
      <MessageSquareText aria-hidden="true" />
      <div><h2 id="parent-feedback-title">Cadangan &amp; maklum balas</h2><p>Kongsi perkara yang boleh membantu kami memperbaiki pengalaman Study untuk keluarga anda.</p></div>
    </div>
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy || retryLocked}>
        <label htmlFor="parent-feedback-category">Jenis maklum balas</label>
        <select id="parent-feedback-category" value={category} onChange={(event) => { setCategory(event.target.value as FeedbackCategory); setError(""); }}>
          <option value="suggestion">Cadangan</option>
          <option value="problem">Masalah</option>
          <option value="other">Lain-lain</option>
        </select>
        <label htmlFor="parent-feedback-message">Maklum balas anda</label>
        <textarea id="parent-feedback-message" value={message} rows={6} required minLength={MIN_MESSAGE_LENGTH} maxLength={MAX_MESSAGE_LENGTH}
          aria-describedby="parent-feedback-help parent-feedback-privacy" placeholder="Contoh: Sila tambah latihan bacaan yang lebih pendek untuk ulang kaji harian."
          onChange={(event) => { setMessage(event.target.value); setError(""); }} />
        <small id="parent-feedback-help" className="parentFeedbackCount">{message.length.toLocaleString("ms-MY")} / {MAX_MESSAGE_LENGTH.toLocaleString("ms-MY")} aksara</small>
        <label className="parentFeedbackReply"><input type="checkbox" checked={allowReply} onChange={(event) => setAllowReply(event.target.checked)} /><span>Saya bersetuju untuk dihubungi bagi tindakan lanjut</span></label>
        <p id="parent-feedback-privacy" className="parentFeedbackPrivacy">Jangan masukkan kata laluan, nombor MyKad, nombor telefon atau maklumat peribadi anak. Identiti akaun anda disahkan oleh server.</p>
      </fieldset>
      {notice && <p className="parentFeedbackNotice" role="status"><CheckCircle2 aria-hidden="true" />{notice}</p>}
      {error && <p className="parentFeedbackError" role="alert">{error}</p>}
      <div className="parentFeedbackActions">
        <button className="primary" type="submit" disabled={busy}><Send aria-hidden="true" />{busy ? "Menghantar..." : retryLocked ? "Cuba hantar semula" : "Hantar maklum balas"}</button>
        {retryLocked && <button className="miniButton" type="button" disabled={busy} onClick={resetForNewFeedback}>Tulis maklum balas baharu</button>}
      </div>
    </form>
  </section>;
}
