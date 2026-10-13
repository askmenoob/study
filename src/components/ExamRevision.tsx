import { useEffect, useRef, useState } from "react";
import type { ExamAnswer, ExamAttempt, ExamCatalogue, ExamLevel, ExamMode, ExamPaperSummary } from "../../server/examContracts";
import type { LevelId } from "../types";
import { tokenStore } from "../lib/api";
import { examApi, ExamApiError, examErrorMessage } from "../lib/examApi";
import { makeUuid } from "../lib/id";
import {
  examAnswersEqual, examTimeExpired, listExamDrafts, makeExamDraft, mergeEditableExamAnswers,
  readExamDraft, reconcileExamDraft, removeExamDraft, writeExamDraft, type ExamDraft,
} from "../lib/examDrafts";
import { ExamRevisionConflict, ExamRevisionReview, ExamRevisionScores, ExamRevisionSource } from "./ExamRevisionViews";
import "./ExamRevision.css";

export interface ExamRevisionProps { studentId: string; levelId: LevelId; accountKey: string; allowExternalLinks: boolean; onOpenTopicPractice: () => void }
type SyncState = "saved" | "pending" | "saving" | "conflict";
const levelLabels: Record<string, string> = { d4: "Darjah 4", d5: "Darjah 5", d6: "Darjah 6", t4: "Tingkatan 4", t5: "Tingkatan 5" };
const modeLabel = (mode: ExamMode) => mode === "guided" ? "Latihan berpandu" : "Simulation";
const displayDate = (value: string) => new Date(value).toLocaleString("ms-MY", { dateStyle: "short", timeStyle: "short" });

// A fresh child instance prevents late requests or answers from a previous profile entering the next profile.
export function ExamRevision(props: ExamRevisionProps) {
  return <ExamRevisionWorkspace key={`${props.accountKey}:${props.studentId}:${props.levelId}`} {...props}/>;
}

function ExamRevisionWorkspace({ studentId, levelId, accountKey, allowExternalLinks, onOpenTopicPractice }: ExamRevisionProps) {
  const [catalogue, setCatalogue] = useState<ExamCatalogue | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [drafts, setDrafts] = useState<ExamDraft[]>([]);
  const [conflict, setConflict] = useState<ExamDraft | null>(null);
  const [sync, setSync] = useState<SyncState>("saved");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [storageWarning, setStorageWarning] = useState(false);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [now, setNow] = useState(Date.now);
  const alive = useRef(true);
  const token = useRef(tokenStore.get());
  const busyRef = useRef(false);
  const blockedRef = useRef(false);
  const attemptRef = useRef<ExamAttempt | null>(null);
  const answersRef = useRef<Record<string, ExamAnswer>>({});
  const draftRef = useRef<ExamDraft | null>(null);
  const conflictRef = useRef<ExamDraft | null>(null);
  const startKeys = useRef(new Map<string, string>());
  const actions = useRef({ reconnect: () => {} });

  function current() { return alive.current && token.current === tokenStore.get(); }
  function refreshDraftList() {
    const result = listExamDrafts(accountKey, studentId);
    setDrafts(result.value);
    if (result.error) setStorageWarning(true);
  }
  function storeDraft(draft: ExamDraft) {
    draftRef.current = draft;
    if (!writeExamDraft(draft)) setStorageWarning(true);
    refreshDraftList();
  }
  function forgetDraft(attemptId: string) {
    if (!removeExamDraft(accountKey, studentId, attemptId)) setStorageWarning(true);
    draftRef.current = null;
    refreshDraftList();
  }
  function applyCloud(incoming: ExamAttempt) {
    if (!current()) return;
    if (incoming.studentId !== studentId) throw new ExamApiError("STUDENT_SCOPE_MISMATCH", 403);
    const local = draftRef.current?.attemptId === incoming.id ? { value: draftRef.current, error: false } : readExamDraft(accountKey, studentId, incoming.id);
    if (local.error) setStorageWarning(true);
    const state = reconcileExamDraft(local.value, incoming);
    attemptRef.current = incoming; setAttempt(incoming); setNow(Date.now());
    draftRef.current = local.value;
    conflictRef.current = state === "conflict" ? local.value : null;
    setConflict(conflictRef.current);
    answersRef.current = state === "pending" && local.value ? local.value.answers : incoming.answers;
    setAnswers(answersRef.current); setSync(state);
    if (state === "saved") forgetDraft(incoming.id);
    if (state === "pending") setNotice("Draft device ini dipulihkan. Jawapan masih menunggu simpanan cloud.");
    if (state === "conflict") setNotice("");
  }
  async function refreshCatalogue() {
    const result = await examApi.catalogue(studentId);
    if (current()) { setCatalogue(result); refreshDraftList(); }
  }
  async function handleError(caught: unknown) {
    if (!alive.current) return;
    if (caught instanceof ExamApiError && (caught.status === 401 || caught.status === 403)) {
      blockedRef.current = true; setAuthBlocked(true);
    }
    if (!current() && !(caught instanceof ExamApiError && caught.code === "AUTH_CHANGED")) return;
    setError(examErrorMessage(caught)); setRetryBlocked(true);
    if (sync === "saving") setSync(draftRef.current ? "pending" : "saved");
    if (caught instanceof ExamApiError && caught.status === 409 && attemptRef.current) {
      try { const result = await examApi.get(attemptRef.current.id); applyCloud(result.attempt); }
      catch (refreshError) { if (current()) setError(`${examErrorMessage(caught)} ${examErrorMessage(refreshError)}`); }
    }
  }
  async function run(operation: () => Promise<void>) {
    if (busyRef.current || blockedRef.current || !current()) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await operation(); }
    catch (caught) { await handleError(caught); }
    finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
      if (current()) setSync(previous => previous === "saving" ? (conflictRef.current ? "conflict" : draftRef.current ? "pending" : "saved") : previous);
    }
  }
  async function saveCurrent(): Promise<ExamAttempt> {
    const active = attemptRef.current;
    if (!active) throw new Error("ATTEMPT_UNAVAILABLE");
    if (conflictRef.current) throw new ExamApiError("REVISION_CONFLICT", 409);
    if (examAnswersEqual(answersRef.current, active.answers)) return active;
    if (examTimeExpired(active)) throw new ExamApiError("TIME_EXPIRED", 409);
    setSync("saving");
    const result = await examApi.save(active.id, active.revision, answersRef.current);
    if (!current()) throw new ExamApiError("AUTH_CHANGED", 401);
    applyCloud(result.attempt); setRetryBlocked(false);
    return result.attempt;
  }
  function syncNow() { setRetryBlocked(false); void run(async () => { await saveCurrent(); }); }
  function openAttempt(id: string) {
    void run(async () => {
      const result = await examApi.get(id);
      if (!current()) return;
      applyCloud(result.attempt); setQuestionIndex(0); setSubmitConfirm(false); setNotice(""); setRetryBlocked(false);
    });
  }
  function start(paper: Pick<ExamPaperSummary, "id" | "version">, mode: ExamMode, retryOfAttemptId?: string) {
    void run(async () => {
      const key = `${paper.id}:${paper.version}:${mode}:${retryOfAttemptId ?? ""}`;
      const clientAttemptId = startKeys.current.get(key) ?? makeUuid();
      startKeys.current.set(key, clientAttemptId);
      const result = await examApi.start({ studentId, paperId: paper.id, paperVersion: paper.version, mode, clientAttemptId, ...(retryOfAttemptId ? { retryOfAttemptId } : {}) });
      if (!current()) return;
      applyCloud(result.attempt); startKeys.current.delete(key);
      setQuestionIndex(0); setSubmitConfirm(false); setNotice(""); setRetryBlocked(false);
    });
  }
  function editAnswer(questionId: string, patch: Partial<ExamAnswer>) {
    const active = attemptRef.current;
    if (!active || busyRef.current || blockedRef.current || conflictRef.current || active.status !== "draft" || examTimeExpired(active) || active.checkedQuestionIds.includes(questionId)) return;
    const next = { ...answersRef.current, [questionId]: { ...(answersRef.current[questionId] ?? { value: "" }), ...patch } };
    answersRef.current = next; setAnswers(next); setNotice(""); setRetryBlocked(false);
    if (examAnswersEqual(next, active.answers)) { forgetDraft(active.id); setSync("saved"); }
    else { storeDraft(makeExamDraft(accountKey, active, next)); setSync("pending"); }
  }
  function checkAnswer(questionId: string) {
    void run(async () => {
      const active = await saveCurrent();
      if (!current()) return;
      const answer = answersRef.current[questionId];
      if (!answer?.value.trim()) return;
      const result = await examApi.check(active.id, active.revision, questionId, answer);
      applyCloud(result.attempt); setNotice("Jawapan pertama disimpan dan dikunci. Semakan tersedia di bawah.");
    });
  }
  function submit() {
    void run(async () => {
      let active = attemptRef.current;
      if (!active) return;
      // The deadline is authoritative on the server. Never try to count pending local answers after it.
      if (!examTimeExpired(active)) active = await saveCurrent();
      if (!current()) return;
      const result = await examApi.submit(active.id, active.revision);
      applyCloud(result.attempt); setSubmitConfirm(false); setQuestionIndex(0);
      setNotice("Cubaan dihantar. Markah automatik dan self-mark dipaparkan berasingan.");
    });
  }
  function selfMark(questionId: string, marks: Record<string, boolean>) {
    void run(async () => {
      if (!attemptRef.current || conflictRef.current) return;
      const active = await saveCurrent();
      const result = await examApi.selfMark(active.id, active.revision, { [questionId]: marks });
      applyCloud(result.attempt); setNotice("Self-mark langkah kerja telah disimpan.");
    });
  }
  function resolveConflict(useLocal: boolean) {
    const active = attemptRef.current; const local = conflictRef.current;
    if (!active || !local || busyRef.current || blockedRef.current) return;
    const next = useLocal ? mergeEditableExamAnswers(local, active) : active.answers;
    conflictRef.current = null; setConflict(null); answersRef.current = next; setAnswers(next);
    setError(""); setRetryBlocked(false);
    if (examAnswersEqual(next, active.answers)) { forgetDraft(active.id); setSync("saved"); }
    else { storeDraft(makeExamDraft(accountKey, active, next)); setSync("pending"); }
    setNotice(useLocal ? "Draft digunakan pada soalan yang masih boleh diubah. Jawapan terkunci mengikut cloud." : "Versi cloud dipilih. Draft tempatan cubaan ini dibuang.");
  }
  function backToCatalogue() {
    if (busyRef.current) return;
    attemptRef.current = null; draftRef.current = null; conflictRef.current = null; answersRef.current = {};
    setAttempt(null); setAnswers({}); setConflict(null); setSubmitConfirm(false); setSync("saved"); setNotice("");
    void run(refreshCatalogue);
  }

  actions.current.reconnect = () => {
    setOnline(true); setRetryBlocked(false);
    void run(async () => {
      const active = attemptRef.current;
      if (active) { const result = await examApi.get(active.id); applyCloud(result.attempt); }
      else await refreshCatalogue();
    });
  };
  useEffect(() => {
    alive.current = true;
    refreshDraftList(); void run(refreshCatalogue);
    const onOnline = () => actions.current.reconnect();
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { alive.current = false; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);
  useEffect(() => {
    if (!attempt?.endsAt || attempt.status !== "draft") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [attempt?.endsAt, attempt?.status]);
  useEffect(() => {
    if (sync !== "pending" || !online || busy || retryBlocked || authBlocked || conflict || !attempt || examTimeExpired(attempt)) return;
    const timer = setTimeout(syncNow, 1000);
    return () => clearTimeout(timer);
  }, [answers, sync, online, busy, retryBlocked, authBlocked, conflict, attempt]);

  const expired = attempt ? examTimeExpired(attempt, now) : false;
  const clockSeconds = attempt?.endsAt ? Math.max(0, Math.ceil((Date.parse(attempt.endsAt) - now) / 1000)) : null;
  const question = attempt?.paper.questions[questionIndex];
  const review = attempt && (attempt.mode === "guided" || attempt.status === "submitted") ? attempt.reviews.find(item => item.questionId === question?.id) : undefined;
  const checked = Boolean(question && attempt?.checkedQuestionIds.includes(question.id));
  const readOnly = busy || authBlocked || Boolean(conflict) || attempt?.status === "submitted" || expired || checked;
  const answeredCount = attempt?.paper.questions.filter(item => answers[item.id]?.value.trim()).length ?? 0;
  const canRetry = attempt?.status === "submitted" && attempt.reviews.some(item => !item.correct) && !attempt.retryOfAttemptId;
  const visiblePapers = catalogue?.papers.filter(paper => paper.levelIds.includes(levelId as ExamLevel)) ?? [];
  const syncText = sync === "conflict" ? "Konflik · pilih versi di bawah" : sync === "saving" ? "Sedang menyimpan ke cloud…" : sync === "pending" ? "Belum disync ke cloud" : "Jawapan tersimpan di cloud";

  return <main className="examRevision" aria-label="Ulang kaji peperiksaan">
    <header className="examHeading"><div><small>FORMAT PEPERIKSAAN · {levelLabels[levelId] ?? (levelId === "t6" ? "TINGKATAN 6" : "TAHAP PROFIL")}</small><h2>{attempt ? attempt.paper.title : "Set latihan peperiksaan"}</h2>
      <p>{attempt ? modeLabel(attempt.mode) : "Pilih set, jawab dahulu dan buka nota pendek bila perlu."}</p></div>
      {!online ? <span className="examOffline" role="status">Offline · simpanan cloud tertangguh</span> : null}</header>
    {storageWarning ? <p className="examWarning" role="alert">Simpanan tempatan tidak tersedia atau draft tidak dapat dibaca. Jawapan belum disync boleh hilang jika halaman ditutup. Kekalkan halaman ini dan gunakan Simpan ke cloud apabila bersambung.</p> : null}
    {error ? <div className="examWarning" role="alert"><p>{error}</p>{!authBlocked ? <button type="button" disabled={busy || !online} onClick={() => actions.current.reconnect()}>Semak sambungan & muat cloud</button> : null}</div> : null}
    {notice ? <p className="examNotice" role="status">{notice}</p> : null}

    {!attempt ? <>
      <p className="examCoverage">{catalogue?.coverageNotice ?? "Memuatkan set mengikut tahap sebenar pada profil…"}</p>
      <div className="examCatalogue">{visiblePapers.map(paper => <article className="examCard" key={paper.id}>
        <small>{paper.exam} · Matematik</small><h3>{paper.title}</h3><ExamRevisionSource paper={paper} allowExternalLinks={allowExternalLinks}/>
        <p className="examPaperMeta">{paper.questionCount} soalan · {paper.durationMinutes} minit simulation · {paper.autoMarks} markah automatik + {paper.manualMarks} self-mark</p>
        <div className="examModeOptions"><div><b>Latihan berpandu</b><p>Semak satu demi satu. Jawapan pertama dikunci selepas semakan.</p><button type="button" className="examPrimary" disabled={busy || !online || authBlocked} onClick={() => start(paper, "guided")}>Mula latihan berpandu</button></div>
          <div><b>Simulation</b><p>Masa bermula apabila set dibuka. Jawapan dan nota dibuka selepas hantar.</p><button type="button" disabled={busy || !online || authBlocked} onClick={() => start(paper, "simulation")}>Mula simulation · {paper.durationMinutes} min</button></div></div>
      </article>)}</div>
      {catalogue && !visiblePapers.length ? <div className="examEmpty examEmptyVisual"><img src="/focus-reading.webp" width="960" height="640" alt="" decoding="async" /><div><h3>Jom kukuhkan asas dahulu</h3><p>Set peperiksaan yang disemak untuk gred ini belum tersedia. Kamu boleh mengulang kaji unit Library yang dipelajari.</p><button type="button" onClick={onOpenTopicPractice}>Teruskan latihan topik</button><small>Set exam akan dibuka selepas hak penggunaan dan kandungannya disahkan.</small></div></div> : null}
      {drafts.length > 0 ? <section className="examHistory"><h3>Draft pada device ini</h3><p>Draft belum disync. Sambungan diperlukan untuk membandingkannya dengan rekod cloud.</p>
        {drafts.map(draft => <article key={draft.attemptId}><div><b>{draft.title}</b><small>{modeLabel(draft.mode)} · {displayDate(draft.savedAt)}</small></div><button type="button" disabled={busy || !online || authBlocked} onClick={() => openAttempt(draft.attemptId)}>Pulihkan draft</button></article>)}</section> : null}
      <section className="examHistory"><div className="examSectionHeading"><h3>Cubaan terkini</h3><button type="button" disabled={busy || !online || authBlocked} onClick={() => void run(refreshCatalogue)}>Muat semula</button></div>
        {catalogue?.attempts.length ? catalogue.attempts.map(item => <article key={item.id}><div><b>{item.title}</b><small>{modeLabel(item.mode)} · {displayDate(item.updatedAt)}{item.retryOfAttemptId ? " · latihan semula" : ""}</small>
          <p>{item.status === "draft" ? "Belum dihantar" : `Automatik ${item.autoScore}/${item.autoMarks} · Self-mark ${item.manualScore}/${item.manualMarks}`}</p>
          {item.status === "submitted" ? <small>{item.wrongCount} jawapan perlu diperbaiki{item.needsSelfMark ? " · Self-mark belum lengkap" : ""}</small> : null}</div>
          <button type="button" disabled={busy || !online || authBlocked} onClick={() => openAttempt(item.id)}>{item.status === "draft" ? "Sambung" : "Lihat semakan"}</button></article>) : <p>{busy && !catalogue ? "Memuatkan cubaan…" : "Belum ada cubaan untuk dipaparkan."}</p>}
      </section>
    </> : <>
      <div className="examToolbar"><button type="button" disabled={busy} onClick={backToCatalogue}>← Senarai set & cubaan</button>
        {attempt.status === "draft" ? <div className={`examSync examSync-${sync}`} role="status">{syncText}{sync === "pending" && !storageWarning ? " · Draft device tersedia" : ""}</div> : <span className="examSubmitted">Sudah dihantar</span>}
        {clockSeconds !== null && attempt.status === "draft" ? <span className={`examClock ${expired ? "examClockExpired" : ""}`} aria-label="Baki masa">{expired ? "Masa tamat" : `${Math.floor(clockSeconds / 60)}:${String(clockSeconds % 60).padStart(2, "0")}`}</span> : null}
      </div>
      <ExamRevisionSource paper={attempt.paper} allowExternalLinks={allowExternalLinks}/>
      {expired && attempt.status === "draft" ? <p className="examWarning" role="alert">Masa tamat. Hanya jawapan terakhir yang sudah disimpan di cloud akan dikira. Jawapan tempatan yang belum disync tidak boleh dihantar selepas deadline.</p> : null}
      {conflict ? <ExamRevisionConflict draft={conflict} attempt={attempt} disabled={busy || authBlocked} onCloud={() => resolveConflict(false)} onLocal={() => resolveConflict(true)}/> : null}
      {attempt.status === "submitted" ? <section className="examResult"><h3>Semakan cubaan</h3><ExamRevisionScores attempt={attempt}/>
        {canRetry ? <button type="button" className="examPrimary" disabled={busy || !online || authBlocked || Boolean(conflict)} onClick={() => start(attempt.paper, "guided", attempt.id)}>Latih semula jawapan salah · soalan alternatif</button> : null}
        {attempt.retryOfAttemptId ? <p>Ini latihan semula menggunakan soalan alternatif. Keputusan berasingan daripada cubaan asal.</p> : null}
      </section> : null}
      <nav className="examQuestionNav" aria-label="Pilih soalan">{attempt.paper.questions.map((item, index) => <button type="button" key={item.id} disabled={busy}
        aria-current={index === questionIndex ? "step" : undefined} aria-label={`Soalan ${item.number}${attempt.checkedQuestionIds.includes(item.id) ? ", sudah disemak" : answers[item.id]?.value.trim() ? ", sudah dijawab" : ", belum dijawab"}`}
        className={index === questionIndex ? "examQuestionActive" : ""} onClick={() => setQuestionIndex(index)}>{item.number}{attempt.checkedQuestionIds.includes(item.id) ? " ✓" : answers[item.id]?.value.trim() ? " •" : ""}</button>)}</nav>
      {question ? <article className="examQuestion" key={question.id}><div className="examQuestionMeta"><small>Soalan {question.number} daripada {attempt.paper.questionCount} · {question.skillName}</small><span>{question.autoMarks} automatik{question.manualMarks ? ` + ${question.manualMarks} self-mark` : ""}</span></div>
        <h3>{question.prompt}</h3>
        {question.kind === "choice" ? <fieldset className="examChoices" disabled={readOnly}><legend>Jawapan anda</legend>{question.options?.map(option => <label key={option.id} className={answers[question.id]?.value === option.id ? "examChoiceSelected" : ""}>
          <input type="radio" name={`exam-answer-${attempt.id}-${question.id}`} value={option.id} checked={answers[question.id]?.value === option.id} onChange={() => editAnswer(question.id, { value: option.id })}/><span><b>{option.id}.</b> {option.text}</span></label>)}</fieldset> :
          <div className="examWrittenAnswer"><label htmlFor={`exam-value-${question.id}`}>Jawapan akhir{question.unit ? ` (${question.unit})` : ""}</label>
            <input id={`exam-value-${question.id}`} type="text" inputMode="text" maxLength={200} autoComplete="off" disabled={readOnly} value={answers[question.id]?.value ?? ""}
              placeholder="Contoh: 3/4 atau 0.75" onChange={event => editAnswer(question.id, { value: event.target.value, ...(question.unit ? { unit: question.unit } : {}) })}/>
            {question.unit ? <small>Unit jawapan: {question.unit}</small> : null}
            {question.kind === "structured" ? <><label htmlFor={`exam-working-${question.id}`}>Langkah kerja anda</label><textarea id={`exam-working-${question.id}`} rows={4} maxLength={10000} disabled={readOnly}
              value={answers[question.id]?.working ?? ""} placeholder="Tulis pengiraan atau langkah yang anda gunakan." onChange={event => editAnswer(question.id, { working: event.target.value })}/></> : null}</div>}
        {checked && attempt.status === "draft" ? <p className="examNotice">Jawapan pertama sudah dikunci selepas semakan.</p> : null}
        <div className="examActions">{attempt.status === "draft" && !expired ? <button type="button" disabled={busy || authBlocked || !online || Boolean(conflict) || sync === "saved"} onClick={syncNow}>Simpan ke cloud</button> : null}
          {attempt.mode === "guided" && attempt.status === "draft" && !checked ? <button type="button" className="examPrimary" disabled={readOnly || !online || !answers[question.id]?.value.trim()} onClick={() => checkAnswer(question.id)}>Semak & kunci jawapan</button> : null}</div>
        {attempt.mode === "simulation" && attempt.status === "draft" ? <p className="examMuted">Dalam simulation, semakan dan nota pendek hanya dibuka selepas set dihantar.</p> : null}
        {review ? <ExamRevisionReview key={`${attempt.id}:${review.questionId}:${review.manualScore}:${JSON.stringify(review.selfMarks)}`} review={review} disabled={busy || !online || authBlocked || Boolean(conflict)} onSelfMark={marks => selfMark(question.id, marks)}/> : null}
        <div className="examQuestionFooter"><button type="button" disabled={busy || questionIndex === 0} onClick={() => setQuestionIndex(index => index - 1)}>← Sebelum</button><span>{answeredCount} / {attempt.paper.questionCount} dijawab</span>
          <button type="button" disabled={busy || questionIndex >= attempt.paper.questions.length - 1} onClick={() => setQuestionIndex(index => index + 1)}>Seterusnya →</button></div>
      </article> : <p className="examWarning">Soalan tidak tersedia. Muat semula cubaan.</p>}
      {attempt.status === "draft" ? <section className="examSubmit"><h3>Hantar set apabila selesai</h3><p>{attempt.paper.questionCount - answeredCount} soalan belum dijawab. Selepas dihantar, jawapan tidak boleh diubah.</p>
        {submitConfirm ? <><p>{expired ? "Hantar jawapan cloud yang sudah tersimpan sahaja. Draft lewat tidak dikira." : "Semua jawapan semasa akan disimpan ke cloud dahulu, kemudian set dihantar untuk semakan."}</p><div className="examActions">
          <button type="button" className="examPrimary" disabled={busy || !online || authBlocked || (Boolean(conflict) && !expired)} onClick={submit}>{expired ? "Hantar jawapan cloud tersimpan" : "Simpan & hantar sekarang"}</button>
          <button type="button" disabled={busy} onClick={() => setSubmitConfirm(false)}>Sambung menjawab</button></div></> : <button type="button" className="examPrimary" disabled={busy || !online || authBlocked || (Boolean(conflict) && !expired)} onClick={() => setSubmitConfirm(true)}>Hantar set</button>}
      </section> : null}
    </>}
    {busy ? <p className="examBusy" role="status">Sedang menghubungi cloud…</p> : null}
  </main>;
}
