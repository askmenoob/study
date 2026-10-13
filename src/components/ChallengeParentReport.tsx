import { useEffect, useRef, useState } from "react";
import { BarChart3, Lightbulb, RefreshCw } from "lucide-react";
import type { ChallengeParentReport as ParentReport } from "../../server/challengeContracts";
import { tokenStore } from "../lib/api";
import { challengeApi, ChallengeApiError, challengeErrorMessage } from "../lib/challengeApi";
import "./ChallengeParentReport.css";

export function ChallengeParentReport({ studentId }: { studentId: string }) {
  const token = typeof sessionStorage === "undefined" ? "" : tokenStore.get();
  return <ChallengeParentReportWorkspace key={`${token}:${studentId}`} studentId={studentId} />;
}

function ChallengeParentReportWorkspace({ studentId }: { studentId: string }) {
  const [report, setReport] = useState<ParentReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const token = useRef(typeof sessionStorage === "undefined" ? null : tokenStore.get());
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true); setError(""); setReport(null);
    void challengeApi.report(studentId, controller.signal).then(result => {
      if (!alive || token.current !== tokenStore.get()) return;
      if (result.studentId !== studentId) throw new ChallengeApiError("SCOPE_MISMATCH", 403);
      setReport(result);
    }).catch((caught: unknown) => {
      if (!alive) return;
      if (caught instanceof ChallengeApiError && (caught.status === 401 || caught.status === 403)) { setBlocked(true); setReport(null); }
      setError(challengeErrorMessage(caught));
    }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; controller.abort(); };
  }, [studentId, refresh]);
  return <section className="challengeParentReport" aria-label="Laporan cabaran anak">
    <div className="challengeReportHeading"><BarChart3 size={24} aria-hidden="true" /><div><h2>Kemajuan cabaran</h2><p>Lihat kefahaman topik dan bahagian yang boleh dibantu.</p></div>{!blocked && <button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)} aria-label="Muat semula laporan cabaran"><RefreshCw size={17} aria-hidden="true" /></button>}</div>
    {busy && <p className="challengeReportEmpty" role="status">Memuatkan laporan…</p>}
    {error && <div className="challengeReportError" role="alert"><p>{error}</p>{!blocked && <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={busy}>Cuba lagi</button>}</div>}
    {report && !blocked && <ChallengeParentReportContent report={report} />}
  </section>;
}

export function ChallengeParentReportContent({ report }: { report: ParentReport }) {
  const subjectNames = new Map(report.subjects.map(subject => [subject.subjectId, subject.subjectName]));
  return <>
    <div className="challengeReportStats"><div><strong>{report.completedSessions}</strong><span>set selesai</span></div><div><strong>{report.answered ? Math.round(report.correct / report.answered * 100) : "—"}{report.answered ? <small>%</small> : null}</strong><span>jawapan betul</span></div><div><strong>{report.answered}</strong><span>soalan dijawab</span></div><div><strong>{report.hintsUsed}</strong><span>petunjuk digunakan</span></div></div>
    <p className="challengeReportNote"><Lightbulb size={16} aria-hidden="true" /> Petunjuk membantu proses belajar. Galakkan anak menerangkan semula cara menjawab.</p>
    {report.answered === 0 && <p className="challengeReportEmpty">Belum ada jawapan cabaran. Laporan topik akan muncul apabila anak mula menjawab.</p>}
    <div className="challengeReportSubjects">{report.subjects.filter(subject => subject.answered > 0 || subject.activeSessionId || subject.completedSessions > 0).map(subject => <details key={subject.subjectId} className="challengeReportSubject" open>
      <summary><span>{subject.subjectName}<small>Tahap {subject.stage}{subject.activeSessionId ? " · Ada set belum selesai" : ""}</small></span><span>{subject.answered ? `${Math.round(subject.accuracy)}% betul` : "Baru bermula"}</span></summary>
      <p className="challengeReportSubjectMeta">{subject.completedSessions} set selesai · {subject.hintsUsed} petunjuk</p>
      {subject.topics.length > 0 ? <div className="challengeReportTopics">{subject.topics.map(topic => <article key={topic.topicId}><div className="challengeReportTopicHeading"><strong>{topic.topicName}</strong><span>{Math.round(topic.mastery)}%</span></div><div className="challengeReportMeter" role="meter" aria-label={`Penguasaan ${topic.topicName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={topic.mastery}><span style={{ width: `${Math.min(100, Math.max(0, topic.mastery))}%` }} /></div><p>{topic.correct} / {topic.answered} jawapan betul{topic.repeatedErrors > 0 ? <span className="challengeReportNeedsHelp"> · {topic.repeatedErrors} kesilapan berulang — ulang kaji bersama</span> : " · Teruskan latihan"}</p></article>)}</div> : <p className="challengeReportEmpty">Topik muncul selepas jawapan pertama.</p>}
    </details>)}</div>
    {report.answered > 0 && <p className="challengeReportFootnote">Penguasaan ialah peratus jawapan betul dalam cabaran yang telah dijawab, bukan penilaian penuh silibus. Kesilapan berulang membantu memilih topik untuk diulang kaji.</p>}
    {report.recentSessions.length > 0 && <div className="challengeReportRecent"><h3>Set terkini</h3><ul>{report.recentSessions.map(session => <li key={session.id}><div><strong>{subjectNames.get(session.subjectId) ?? "Subjek"} · Tahap {session.stage}</strong><span>{new Date(session.completedAt).toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })}</span></div><div><strong>{session.correct} / {session.total}</strong><span className={session.passed ? "challengeReportPassed" : "challengeReportSupport"}>{session.passed ? "Naik tahap" : "Pengukuhan"}</span></div></li>)}</ul></div>}
  </>;
}
