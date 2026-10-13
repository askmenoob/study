import { useEffect, useRef, useState } from "react";
import { BookOpen, RotateCcw, Send, Sparkles } from "lucide-react";
import { findLevel, getSubjectsForLevel, getTopics } from "../data/curriculum";
import { isResourceForLevel, kindLabels, resources } from "../data/resources";
import { askTutorCloud } from "../lib/api";
import { makeUuid } from "../lib/id";
import type { LevelId, TutorMessage } from "../types";
import "./TutorPanel.css";

type Props = {
  studentId?: string;
  levelId: LevelId;
  initialSubjectId?: string;
  initialTopicId?: string;
  initialResourceId?: string;
};

export function TutorPanel(props: Props) {
  // A new profile or entry context always receives fresh, in-memory chat state.
  const contextKey = [props.studentId, props.levelId, props.initialSubjectId, props.initialTopicId, props.initialResourceId].join(":");
  return <TutorContext key={contextKey} {...props} />;
}

function TutorContext({ studentId, levelId, initialSubjectId, initialTopicId, initialResourceId }: Props) {
  const level = findLevel(levelId);
  const subjects = getSubjectsForLevel(levelId);
  const notes = resources.filter((resource) =>
    (resource.kind === "note" || resource.kind === "reading") &&
    isResourceForLevel(resource, levelId, level.stage) &&
    subjects.some((subject) => subject.id === resource.subjectId),
  );
  const initialNote = notes.find((resource) => resource.id === initialResourceId);
  const [subjectId, setSubjectId] = useState(() =>
    initialNote?.subjectId ?? subjects.find((subject) => subject.id === initialSubjectId)?.id ?? subjects[0]?.id ?? "",
  );
  const [resourceId, setResourceId] = useState(initialNote?.id ?? "");
  const subjectNotes = notes.filter((resource) => resource.subjectId === subjectId);
  const selectedNote = subjectNotes.find((resource) => resource.id === resourceId);
  const topicId = selectedNote?.relatedTopicId ?? (subjectId === initialSubjectId && !selectedNote ? initialTopicId : undefined);
  const topic = getTopics(levelId, subjectId).find((item) => item.id === topicId);
  const conversationKey = [studentId, levelId, subjectId, selectedNote?.id, topicId].join(":");

  return <main className="tutor tutorPanel">
    <div className="orb"><Sparkles aria-hidden="true" /></div>
    <small>AI Tutor · {level.label}</small>
    <h2>Mari faham bersama</h2>
    <p>Tanya soalan atau kongsi cubaan kamu. Tutor beri petunjuk dahulu, kemudian bantu kamu melangkah sendiri.</p>
    <div className="tutorContext">
      <label htmlFor="tutor-subject">Subjek
        <select id="tutor-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setResourceId(""); }}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </label>
      <label htmlFor="tutor-note">Nota atau bacaan <span>(pilihan)</span>
        <select id="tutor-note" value={selectedNote?.id ?? ""} onChange={(event) => setResourceId(event.target.value)}>
          <option value="">Tanpa nota dipilih</option>
          {subjectNotes.map((resource) => <option key={resource.id} value={resource.id}>{kindLabels[resource.kind]} · {resource.title}</option>)}
        </select>
      </label>
      <p>Menukar subjek atau nota memulakan perbualan baharu.</p>
      {!subjectNotes.length && <p>Belum ada nota Study untuk subjek pada tahap ini. Kamu masih boleh bertanya.</p>}
      {topic && <p>Topik: <strong>{topic.name}</strong></p>}
      {selectedNote && <details className="tutorSelectedNote">
        <summary><BookOpen aria-hidden="true" /> Baca nota dipilih: {selectedNote.title}</summary>
        {selectedNote.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </details>}
    </div>
    <TutorConversation key={conversationKey} studentId={studentId} levelId={levelId} subjectId={subjectId} topicId={topicId} resourceId={selectedNote?.id} />
  </main>;
}

type ConversationProps = { studentId?: string; levelId: LevelId; subjectId: string; topicId?: string; resourceId?: string };

function TutorConversation({ studentId, levelId, subjectId, topicId, resourceId }: ConversationProps) {
  const [conversationId, setConversationId] = useState(makeUuid);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const newConversation = () => {
    request.current?.abort();
    request.current = null;
    setConversationId(makeUuid());
    setMessages([]); setInput(""); setBusy(false); setError(""); setFailedMessage(null);
    inputRef.current?.focus();
  };

  const send = async (text: string, retry = false) => {
    const message = text.trim();
    if (!studentId || !message || message.length > 1200 || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setFailedMessage(null);
    if (!retry) {
      setMessages((current) => [...current, { role: "user", text: message }]);
      setInput("");
    }
    try {
      const result = await askTutorCloud({ studentId, levelId, subjectId, topicId, resourceId, conversationId, message }, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      setMessages((current) => [...current, {
        role: "assistant", text: result.answer, provider: result.provider,
        sources: result.sources, support: result.support, notice: result.notice,
      }]);
    } catch (cause) {
      if (controller.signal.aborted || request.current !== controller) return;
      const code = cause instanceof Error ? cause.message : "";
      setError(code === "SESSION_ENDED" || code === "UNAUTHORIZED" || code === "HTTP_401"
        ? "Sesi belajar tidak lagi tersedia. Muat semula halaman untuk menyemak sesi."
        : code === "AI_TUTOR_RATE_LIMIT"
          ? "Had soalan sementara telah dicapai. Tunggu sebentar sebelum cuba semula."
          : code === "AI_TUTOR_BUSY"
            ? "Tutor masih memproses soalan. Tunggu sebentar dan cuba semula."
        : cause instanceof Error && cause.name === "AbortError"
          ? "Tutor mengambil masa terlalu lama. Cuba hantar semula soalan ini."
          : "Jawapan belum diterima. Semak sambungan dan cuba semula.");
      setFailedMessage(message);
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  };

  return <section className="tutorConversation" aria-label="Perbualan tutor">
    <div className="tutorChatHead">
      <span>Perbualan ini tidak disimpan pada peranti.</span>
      <button type="button" className="miniButton" onClick={newConversation}><RotateCcw aria-hidden="true" /> Perbualan baharu</button>
    </div>
    {!studentId && <p className="tutorNotice">Pilih atau tambah profil anak dahulu untuk menggunakan tutor.</p>}
    <div className="chat tutorChat" role="log" aria-label="Mesej tutor" aria-live="polite" aria-relevant="additions">
      {messages.length === 0 && <div className="ai tutorWelcome">
        <b>Mulakan dengan satu soalan</b>
        <p>{resourceId ? "Tanya tentang nota dipilih atau beritahu bahagian yang belum jelas." : "Kongsi soalan dan langkah yang sudah kamu cuba. Jawapan ringkas seperti “4” juga boleh."}</p>
      </div>}
      {messages.map((message, index) => <TutorMessageView key={index} message={message} />)}
    </div>
    {busy && <p className="tutorBusy" role="status"><Sparkles aria-hidden="true" /> Tutor sedang menyediakan petunjuk…</p>}
    {error && <div className="tutorError" role="alert">
      <p>{error}</p>
      {failedMessage && <button type="button" className="miniButton" disabled={busy} onClick={() => void send(failedMessage, true)}>Cuba semula</button>}
    </div>}
    {messages.some((message) => message.role === "assistant") && <div className="tutorQuickActions" aria-label="Bantuan seterusnya">
      <button type="button" disabled={busy || Boolean(error)} onClick={() => void send("Saya perlukan petunjuk")}>Saya perlukan petunjuk</button>
      <button type="button" disabled={busy || Boolean(error)} onClick={() => void send("Tunjukkan langkah penyelesaian")}>Tunjukkan langkah penyelesaian</button>
    </div>}
    <form className="tutorForm" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
      <label htmlFor="tutor-question">Soalan atau cubaan kamu</label>
      <textarea id="tutor-question" ref={inputRef} value={input} maxLength={1200} rows={3} disabled={!studentId}
        aria-describedby="tutor-question-help tutor-question-privacy"
        onChange={(event) => setInput(event.target.value.slice(0, 1200))}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void send(input); }
        }}
        placeholder="Tulis soalan atau sambung cubaan kamu…" />
      <p className="tutorSupport" id="tutor-question-privacy">Kongsi soalan sahaja; jangan masukkan nama penuh, nombor telefon atau maklumat peribadi.</p>
      <div className="tutorFormFoot">
        <small id="tutor-question-help">{input.length}/1200 aksara</small>
        <button className="primary" type="submit" disabled={!studentId || !input.trim() || busy}><Send aria-hidden="true" />{busy ? "Menunggu…" : "Hantar"}</button>
      </div>
    </form>
  </section>;
}

export function TutorMessageView({ message }: { message: TutorMessage }) {
  if (message.role === "user") return <div className="user"><b className="tutorMessageRole">Kamu</b><p>{message.text}</p></div>;
  const isLocal = message.provider === "local" || message.provider?.startsWith("local:");
  const providerLabel = message.provider?.startsWith("verified-math") ? "Math Coach"
    : message.provider?.startsWith("gemini-free:") ? "Gemini Free"
      : isLocal ? "Panduan setempat" : "Tutor Study";
  const sources = message.sources ?? [];
  return <div className="ai">
    <b>AI Tutor</b><small className="providerBadge">{providerLabel}</small>
    <p>{message.text}</p>
    {(message.notice || isLocal) && <p className="tutorNotice">{message.notice || "AI dalam talian belum tersedia. Ini panduan setempat yang terhad; cuba lagi kemudian untuk bantuan AI."}</p>}
    {message.support === "general" && <small className="tutorSupport">Panduan umum · Tiada nota Study dibekalkan untuk jawapan ini.</small>}
    {sources.length > 0 && <div className="tutorSources">
      <small>Nota yang dibekalkan kepada tutor</small>
      {sources.map((source) => <details key={source.id}>
        <summary>{source.title}</summary>
        <p>{source.excerpt}</p>
      </details>)}
    </div>}
  </div>;
}
