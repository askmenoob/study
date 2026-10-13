import { voiceEnabledForLevel } from "../lib/voiceGrade";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Coffee, Flag, Lightbulb, LoaderCircle, RefreshCw, Sparkles, Trophy } from "lucide-react";
import type { ChallengeLeaderboard, ChallengePublicQuestion, ChallengeSession, ChallengeSubjectProgress } from "../../server/challengeContracts";
import { tokenStore } from "../lib/api";
import { challengeApi, ChallengeApiError, challengeErrorMessage, type ChallengeMutation } from "../lib/challengeApi";
import { makeUuid } from "../lib/id";
import { SubjectGraphic } from "./LearnerGraphics";
import { learningPolicy } from "../../server/library/learningPolicy";
import { libraryResources } from "../../server/library/catalog";
import { LearningPicture } from "./LearningPicture";
import { useLearningSpeech } from "../lib/useLearningSpeech";
import { Volume2 } from "lucide-react";
import "./UnitLearning.css";
import "./ChallengeJourney.css";

export interface ChallengeJourneyProps {
  studentId: string; levelId: string; levelLabel: string; subjectId: string; subjectName: string;
  onBack: () => void; onPracticeFallback?: () => void; onReadResource?: (resourceId: string) => void;
}
type PendingAction = { kind: "start"; payload: { studentId: string; subjectId: string; requestId: string } }
  | { kind: "answer"; id: string; payload: ChallengeMutation & { selected: number } }
  | { kind: "hint"; id: string; payload: ChallengeMutation };
const phaseLabels = { review: "Ingat semula", current: "Jom cuba", strengthen: "Kukuhkan ilmu", challenge: "Cabar diri" };

export function ChallengeJourney(props: ChallengeJourneyProps) {
  const token = typeof sessionStorage === "undefined" ? "" : tokenStore.get();
  return <ChallengeWorkspace key={`${token}:${props.studentId}:${props.levelId}:${props.subjectId}`} {...props} />;
}

function ChallengeWorkspace({ studentId, levelId, levelLabel, subjectId, subjectName, onBack, onPracticeFallback, onReadResource }: ChallengeJourneyProps) {
  const [progress, setProgress] = useState<ChallengeSubjectProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [continuedBoundary, setContinuedBoundary] = useState(-1);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasPending, setHasPending] = useState(false);
  const [ranking, setRanking] = useState<ChallengeLeaderboard | null>(null);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [rankingError, setRankingError] = useState("");
  const alive = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const token = useRef(typeof sessionStorage === "undefined" ? null : tokenStore.get());
  const busyRef = useRef(false);
  const blockedRef = useRef(false);
  const pending = useRef<PendingAction | null>(null);
  const rankingBusyRef = useRef(false);

  function current(epoch: number) { return alive.current && generation.current === epoch && token.current === tokenStore.get(); }
  function accept(incoming: ChallengeSession, epoch: number) {
    if (!current(epoch)) return;
    if (incoming.studentId !== studentId || incoming.levelId !== levelId || incoming.subjectId !== subjectId) throw new ChallengeApiError("SCOPE_MISMATCH", 403);
    setSession(incoming);
  }
  function fail(caught: unknown, epoch: number) {
    if (!alive.current || generation.current !== epoch) return;
    if (caught instanceof ChallengeApiError && (caught.status === 401 || caught.status === 403)) {
      blockedRef.current = true; setBlocked(true); setSession(null); setProgress(null); setRanking(null);
      pending.current = null; setHasPending(false); setReviewIndex(null); setSelected(null);
    } else if (!current(epoch)) return;
    setError(challengeErrorMessage(caught));
  }
  async function load(epoch: number) {
    busyRef.current = true; setBusy(true); setError("");
    try {
      const result = await challengeApi.overview(studentId, controller.current?.signal);
      if (!current(epoch)) return;
      if (result.studentId !== studentId || result.levelId !== levelId) throw new ChallengeApiError("SCOPE_MISMATCH", 403);
      const subject = result.subjects.find(item => item.subjectId === subjectId) ?? null;
      setProgress(subject);
      if (subject?.activeSessionId) {
        const active = await challengeApi.get(subject.activeSessionId, controller.current?.signal);
        accept(active.session, epoch);
      }
      if (current(epoch)) setLoaded(true);
    } catch (caught) { fail(caught, epoch); }
    finally { if (alive.current && generation.current === epoch) { busyRef.current = false; setBusy(false); } }
  }
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    const epoch = ++generation.current;
    void load(epoch);
    return () => { alive.current = false; controller.current?.abort(); };
    // Profile/account changes remount this workspace; each mount owns its requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function execute(action: PendingAction) {
    if (busyRef.current || blockedRef.current) return;
    const epoch = generation.current;
    if (!current(epoch)) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    pending.current = action; setHasPending(true);
    try {
      const signal = controller.current?.signal;
      const result = action.kind === "start" ? await challengeApi.start(action.payload, signal)
        : action.kind === "answer" ? await challengeApi.answer(action.id, action.payload, signal)
        : await challengeApi.hint(action.id, action.payload, signal);
      if (!current(epoch)) return;
      accept(result.session, epoch);
      pending.current = null; setHasPending(false);
      if (action.kind === "start") { setSelected(null); setReviewIndex(null); setContinuedBoundary(-1); }
      if (action.kind === "answer") {
        setReviewIndex(action.payload.index); setSelected(null);
        if (result.session.status === "completed") setRanking(null);
      }
    } catch (caught) {
      if (caught instanceof ChallengeApiError && caught.status === 409 && action.kind !== "start" && current(epoch)) {
        try {
          const latest = await challengeApi.get(action.id, controller.current?.signal);
          if (!current(epoch)) return;
          accept(latest.session, epoch);
          pending.current = null; setHasPending(false); setSelected(null);
          setReviewIndex(latest.session.questions[action.payload.index]?.feedback ? action.payload.index : null);
          setNotice("Kemajuan terkini sudah dimuatkan. Semak jawapan sebelum teruskan.");
        } catch (refreshError) { fail(refreshError, epoch); }
      } else fail(caught, epoch);
    } finally { if (alive.current && generation.current === epoch) { busyRef.current = false; setBusy(false); } }
  }
  function start() { void execute(pending.current ?? { kind: "start", payload: { studentId, subjectId, requestId: makeUuid() } }); }
  function answer() {
    if (!session || selected === null || pending.current) return;
    void execute({ kind: "answer", id: session.id, payload: { expectedRevision: session.revision, index: session.answeredCount, selected, requestId: makeUuid() } });
  }
  function hint() {
    if (!session || pending.current) return;
    void execute({ kind: "hint", id: session.id, payload: { expectedRevision: session.revision, index: session.answeredCount, requestId: makeUuid() } });
  }
  async function loadRanking() {
    if (rankingBusyRef.current || blockedRef.current) return;
    const epoch = generation.current;
    if (!current(epoch)) return;
    rankingBusyRef.current = true; setRankingBusy(true); setRankingError("");
    try {
      const result = await challengeApi.ranking(studentId, subjectId, controller.current?.signal);
      if (!current(epoch)) return;
      if (result.levelId !== levelId || result.subjectId !== subjectId) throw new ChallengeApiError("SCOPE_MISMATCH", 403);
      setRanking(result);
    } catch (caught) {
      if (caught instanceof ChallengeApiError && (caught.status === 401 || caught.status === 403)) fail(caught, epoch);
      else if (current(epoch)) setRankingError(challengeErrorMessage(caught));
    } finally { if (alive.current && generation.current === epoch) { rankingBusyRef.current = false; setRankingBusy(false); } }
  }
  const policy = learningPolicy(levelId);
  const checkpoint = session && session.status === "active" && reviewIndex === null && session.answeredCount > 0
    && session.answeredCount % policy.breakEvery === 0 && continuedBoundary !== session.answeredCount;
  const questionIndex = reviewIndex ?? session?.answeredCount ?? 0;
  const question = session?.questions[questionIndex];
  const completed = session?.status === "completed" && reviewIndex === null;

  return <main className="challengeJourney">
    <div className="challengeActions"><button type="button" className="challengeBack" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Kembali ke subjek</button>{onPracticeFallback && <button type="button" className="challengeTextButton" onClick={onPracticeFallback}>Pilih topik latihan</button>}</div>
    <div className="challengeHeading">
      <SubjectGraphic subjectId={subjectId} />
      <div><p>{levelLabel} <span aria-hidden="true">·</span> {subjectName}</p><h1>Cabaran ilmu</h1></div>
      <span className="challengeStage"><Flag size={15} aria-hidden="true" /> Tahap {session?.stage ?? progress?.stage ?? 1}</span>
    </div>
    {error && <div className="challengeError" role="alert"><p>{error}</p>{!blocked && <button type="button" className="challengeSecondary" disabled={busy} onClick={() => pending.current ? void execute(pending.current) : void load(generation.current)}><RefreshCw size={16} aria-hidden="true" /> Cuba lagi</button>}{onPracticeFallback && !blocked && <button type="button" className="challengeTextButton" onClick={onPracticeFallback}>Buka latihan topik</button>}</div>}
    {notice && <p className="challengeNotice" role="status">{notice}</p>}
    {busy && !session && <div className="challengeLoading" role="status"><LoaderCircle size={24} aria-hidden="true" /><p>{hasPending ? "Sedang menyediakan cabaran…" : "Memuatkan kemajuan…"}</p></div>}
    {!blocked && loaded && !session && !busy && <section className="challengeIntro">
      <span className="challengeIntroIcon"><Sparkles size={30} aria-hidden="true" /></span>
      <p className="challengeEyebrow">SATU LANGKAH, SATU KEJAYAAN</p>
      <h2>Jom bina keyakinan!</h2>
      <p>Soalan daripada konsep unit Library yang dipelajari. Tahap cabaran menunjukkan kemajuan latihan, bukan pertukaran gred kelas.</p>
      <div className="challengeIntroFacts"><span><b>Maksimum {policy.maximum}</b>soalan satu set</span><span><b>Setiap {policy.breakEvery}</b>masa untuk rehat</span><span><b>80% betul</b>naik tahap</span></div>
      <p className="challengeFinePrint">Set mungkin lebih pendek jika soalan terhad. Ada soalan ulangan untuk mengukuhkan kefahaman.</p>
      {progress ? <button type="button" className="challengePrimary" onClick={start}>Mulakan cabaran <ArrowRight size={18} aria-hidden="true" /></button> : <><p>Cabaran untuk subjek ini belum tersedia.</p>{onPracticeFallback && <button type="button" className="challengePrimary" onClick={onPracticeFallback}>Buka latihan topik <ArrowRight size={18} aria-hidden="true" /></button>}</>}
    </section>}
    {!blocked && session && <>
      <ChallengeProgress answered={session.answeredCount} total={session.total} breakEvery={policy.breakEvery} />
      {session.notices.length > 0 && <details className="challengeSetNotice"><summary>Tentang set ini <ChevronDown size={15} aria-hidden="true" /></summary>{session.notices.map((item, index) => <p key={index}>{item}</p>)}</details>}
      {checkpoint ? <section className="challengeRest">
        <span className="challengeRestIcon"><Coffee size={34} aria-hidden="true" /></span>
        <p className="challengeEyebrow">BAGUS, SATU BAHAGIAN SELESAI!</p>
        <h2>Tarik nafas. Rehat sebentar.</h2><p>{session.answeredCount} daripada {session.total} soalan selesai. Kemajuan ini sudah disimpan.</p>
        <div className="challengeActions"><button type="button" className="challengePrimary" onClick={() => { setContinuedBoundary(session.answeredCount); setSelected(null); }}>Sambung {Math.min(policy.breakEvery, session.total - session.answeredCount)} soalan <ArrowRight size={17} aria-hidden="true" /></button><button type="button" className="challengeSecondary" onClick={onBack}>Rehat dahulu</button></div>
        <small>Kamu boleh sambung dari sini apabila kembali.</small>
      </section> : completed ? <ChallengeCompletion session={session} busy={busy || hasPending} onStart={start} onBack={onBack} /> : question && <ChallengeQuestionCard levelId={levelId} key={question.id} question={question} index={questionIndex} total={session.total} selected={selected} disabled={busy || hasPending} onSelect={setSelected} onAnswer={answer} onHint={hint} onReadResource={onReadResource} onNext={() => { setReviewIndex(null); setSelected(null); }} />}
      <p className="challengeSaveNote">{hasPending ? "Menunggu pengesahan pelayan. Cuba lagi jika sambungan terganggu." : "Jawapan yang disahkan disimpan dalam akaun. Kamu boleh kembali untuk sambung."}</p>
    </>}
    {!blocked && loaded && <details className="challengeRanking" onToggle={event => { if (event.currentTarget.open && !ranking) void loadRanking(); }}>
      <summary><span><Trophy size={20} aria-hidden="true" /> Kedudukan minggu ini</span><ChevronDown size={18} aria-hidden="true" /></summary>
      <p>Kedudukan {subjectName} untuk {levelLabel}. Nama samaran menjaga privasi.</p>
      <p>Hanya {ranking?.dailySessionLimit ?? 3} sesi terbaik sehari dikira. Soalan yang sudah dikuasai tidak memberi mata baharu; membetulkan kesilapan masih diberi mata. Terus belajar mengikut rentak kamu.</p>
      {rankingBusy && <p role="status">Memuatkan kedudukan…</p>}
      {rankingError && <div role="alert"><p>{rankingError}</p><button type="button" className="challengeSecondary" disabled={rankingBusy} onClick={() => void loadRanking()}>Cuba lagi</button></div>}
      {ranking && <ChallengeRankingTable ranking={ranking} />}
    </details>}
  </main>;
}

export function ChallengeProgress({ answered, total, breakEvery = 10 }: { answered: number; total: number; breakEvery?: number }) {
  const blocks = Array.from({ length: Math.ceil(total / breakEvery) }, (_, index) => ({ start: index * breakEvery, end: Math.min((index + 1) * breakEvery, total) }));
  return <div className="challengeProgress" aria-label="Kemajuan cabaran">
    <div className="challengeProgressLabel"><strong>{answered} / {total} selesai</strong><span>Satu soalan pada satu masa</span></div>
    <div className="challengeBlocks">{blocks.map(({ start, end }, index) => <div key={start} className={`challengeBlock${answered >= end ? " challengeBlockDone" : answered >= start ? " challengeBlockActive" : ""}`}><span>Bahagian {index + 1}</span><div role="progressbar" aria-label={`Bahagian ${index + 1}`} aria-valuemin={0} aria-valuemax={end - start} aria-valuenow={Math.max(0, Math.min(answered - start, end - start))}><i style={{ width: `${Math.max(0, Math.min((answered - start) / (end - start), 1)) * 100}%` }} /></div><small>{start + 1}–{end}{answered >= end && <Check size={13} aria-hidden="true" />}</small></div>)}</div>
  </div>;
}

export function ChallengeQuestionCard({ question, index, total, selected, disabled, onSelect, onAnswer, onHint, onNext, onReadResource, levelId }: {
  levelId?: string; question: ChallengePublicQuestion; index: number; total: number; selected: number | null; disabled: boolean;
  onSelect: (value: number) => void; onAnswer: () => void; onHint: () => void; onNext: () => void; onReadResource?: (resourceId: string) => void;
}) {
  const voiceEnabled = voiceEnabledForLevel(levelId);
  const speech = useLearningSpeech(libraryResources.find(r => r.id === question.resourceIds?.[0])?.language ?? "ms", voiceEnabled);
  const feedback = question.feedback;
  const parts = question.source === "bank" && question.resourceIds?.length ? question.prompt.split(/\n\n/) : [question.prompt];
  const questionText = parts[parts.length - 1];
  const passage = parts.slice(0, -1);
  return <section className="challengeQuestion" aria-labelledby="challenge-question-title">
    <div className="challengeQuestionMeta"><span>{phaseLabels[question.phase]}</span><span>Soalan {index + 1} / {total}</span></div>
    <p className="challengeTopic">{question.topicName}{question.repeat ? " · Ulang kaji" : ""}</p>
    {passage.length > 0 && <div className="challengePassage" aria-label="Bahan bacaan soalan">{passage.map((paragraph, i) => <p dir="auto" key={i}>{paragraph}</p>)}</div>}
    {question.support?.scene&&<LearningPicture visual={question.support.scene}/>}
    <h2 id="challenge-question-title" dir="auto">{questionText}</h2>
    {voiceEnabled && <div className="learningSpeech"><button className="speechButton" disabled={speech.busy} onClick={()=>void speech.speak([question.prompt,...question.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`)].join("\n"))}><Volume2/>{speech.busy?"Menyediakan audio…":"Dengar soalan dan pilihan"}</button><button onClick={speech.stop}>Henti</button></div>}
    {speech.message&&<p role="status" className="learningSpeechMessage">{speech.message}</p>}
    <fieldset className="challengeOptions" disabled={disabled || Boolean(feedback)}><legend className="challengeSrOnly">Pilih satu jawapan</legend>
      {question.options.map((option, optionIndex) => {
        const isSelected = (feedback?.selected ?? selected) === optionIndex;
        const correct = feedback && feedback.answer === optionIndex;
        const wrong = feedback && isSelected && !feedback.correct;
        return <label key={optionIndex} className={`challengeOption${isSelected ? " challengeOptionSelected" : ""}${correct ? " challengeOptionCorrect" : ""}${wrong ? " challengeOptionWrong" : ""}`}><input type="radio" name={`challenge-answer-${question.id}`} checked={isSelected} onChange={() => onSelect(optionIndex)} /><span className="challengeOptionLetter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span><span>{question.support?.choices[optionIndex]&&<LearningPicture visual={question.support.choices[optionIndex]} small/>}{option}{correct ? <small>Jawapan betul</small> : wrong ? <small>Pilihan kamu</small> : null}</span>{correct && <Check size={19} aria-hidden="true" />}</label>;
      })}
    </fieldset>
    {question.hint && <div className="challengeHint"><Lightbulb size={18} aria-hidden="true" /><p>{question.hint}</p>{voiceEnabled && <button onClick={()=>void speech.speak(question.hint!)}><Volume2/> Dengar petunjuk</button>}</div>}
    {feedback ? <div className={`challengeFeedback${feedback.correct ? " challengeFeedbackCorrect" : ""}`} role="status"><strong>{feedback.correct ? "Tepat! Bagus usaha kamu." : "Belum tepat. Jom faham bersama."}</strong><p>{feedback.explanation}</p>{voiceEnabled && <button type="button" className="challengeSecondary" onClick={()=>void speech.speak(feedback.explanation)}><Volume2/> Dengar penerangan</button>}{onReadResource && question.resourceIds?.length ? <button type="button" className="challengeSecondary" onClick={() => {speech.stop();onReadResource(question.resourceIds![0]);}}>Baca semula nota berkaitan</button> : null}<button type="button" className="challengePrimary" disabled={disabled} onClick={()=>{speech.stop();onNext();}}>{index + 1 === total ? "Lihat keputusan" : "Teruskan"}<ArrowRight size={17} aria-hidden="true" /></button></div>
      : <div className="challengeActions"><button type="button" className="challengeSecondary" disabled={disabled || Boolean(question.hint)} onClick={onHint}><Lightbulb size={17} aria-hidden="true" />{question.hint ? "Petunjuk dibuka" : "Beri petunjuk"}</button><button type="button" className="challengePrimary" disabled={disabled || selected === null} onClick={()=>{speech.stop();onAnswer();}}>{disabled ? "Sila tunggu…" : "Semak jawapan"}<ArrowRight size={17} aria-hidden="true" /></button></div>}
  </section>;
}

export function ChallengeCompletion({ session, busy, onStart, onBack }: { session: ChallengeSession; busy: boolean; onStart: () => void; onBack: () => void }) {
  const passed = session.result?.passed ?? false;
  return <section className="challengeCompletion"><span className="challengeCompletionIcon"><Trophy size={38} aria-hidden="true" /></span><p className="challengeEyebrow">TAHAP {session.stage} SELESAI</p><h2>{passed ? "Hebat, kamu naik tahap!" : "Setiap cubaan membantu kamu."}</h2><div className="challengeScore"><strong>{session.correctCount}<span> / {session.total}</span></strong><p>jawapan betul · {Math.round(session.result?.accuracy ?? 0)}%</p></div><p>{passed ? `Tahap ${session.result?.nextStage ?? session.stage + 1} sedia untuk diteroka.` : `Kita kukuhkan tahap ${session.stage} dahulu. Capai 80% untuk naik tahap.`}</p><p className="challengeFinePrint">{session.hintCount} petunjuk digunakan · {session.result?.rankingPoints ?? 0} mata kedudukan. Kamu boleh cuba set seterusnya; sesetengah soalan mungkin berulang.</p><div className="challengeActions"><button type="button" className="challengePrimary" disabled={busy} onClick={onStart}>{busy ? "Menyediakan set…" : passed ? "Ke tahap seterusnya" : "Cuba set pengukuhan"}<ArrowRight size={17} aria-hidden="true" /></button><button type="button" className="challengeSecondary" onClick={onBack}>Rehat dahulu</button></div></section>;
}

export function ChallengeRankingTable({ ranking }: { ranking: ChallengeLeaderboard }) {
  return <><p className="challengeRankingPoints">Mata kamu: <strong>{ranking.yourPoints}</strong></p>{ranking.rows.length === 0 ? <p>Belum ada kedudukan minggu ini. Cubalah satu set!</p> : <ol className="challengeRankingRows">{ranking.rows.map(row => <li key={`${row.rank}:${row.alias}`} className={row.isYou ? "challengeRankingYou" : undefined}><span className="challengeRank">{row.rank}</span><span>{row.alias}{row.isYou && <small>Kamu</small>}</span><strong>{row.points}<small>mata</small></strong></li>)}</ol>}</>;
}
