import { useState } from "react";
import type { ExamAttempt, ExamPaperSummary, ExamQuestionReview } from "../../server/examContracts";
import type { ExamDraft } from "../lib/examDrafts";
import { examAnswersEqual, examTimeExpired } from "../lib/examDrafts";

export function ExamRevisionSource({ paper, allowExternalLinks }: { paper: ExamPaperSummary; allowExternalLinks: boolean }) {
  const source = paper.source;
  const kinds = { original: "Set asli IMAI", past_exam: "Peperiksaan tahun lepas", trial: "Kertas percubaan", school_exam: "Peperiksaan sekolah" };
  return <div className="examSource">
    <div className="examBadges"><span>{kinds[source.kind]}</span><span>{paper.publication === "preview" ? "Preview" : "Diterbitkan"}</span>
      <span>{source.review === "approved" ? "Semakan kandungan diluluskan" : "Belum disemak pendidik"}</span></div>
    <p>{source.provider}{source.kind !== "original" && source.year !== null ? ` · ${source.year}` : ""} · {paper.scopeLabel}</p>
    {source.url && allowExternalLinks && /^https:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noopener noreferrer">Lihat sumber kertas</a> : null}
    {source.url && !allowExternalLinks ? <small>Pautan sumber boleh dibuka selepas sesi belajar tamat.</small> : null}
  </div>;
}

export function ExamRevisionScores({ attempt }: { attempt: ExamAttempt }) {
  return <div className="examScores">
    <div><small>Markah automatik{attempt.status === "draft" ? " setakat ini" : ""}</small><strong>{attempt.autoScore} / {attempt.autoMarks}</strong></div>
    <div><small>Self-mark langkah kerja</small><strong>{attempt.manualScore} / {attempt.manualMarks}</strong><span>{attempt.needsSelfMark ? "Masih perlu semakan sendiri" : "Berdasarkan pilihan sendiri"}</span></div>
    <p>Markah latihan sahaja. Self-mark bukan markah rasmi atau penilaian guru.</p>
  </div>;
}

export function ExamRevisionReview({ review, disabled, onSelfMark }: {
  review: ExamQuestionReview; disabled: boolean; onSelfMark: (marks: Record<string, boolean>) => void;
}) {
  const [marks, setMarks] = useState<Record<string, boolean>>(() => review.selfMarks);
  const changed = review.manualScore === null || review.rubric.some(step => Boolean(marks[step.id]) !== Boolean(review.selfMarks[step.id]));
  return <section className={`examReview ${review.correct ? "examReviewCorrect" : "examReviewWrong"}`} aria-label="Semakan jawapan">
    <h3>{review.correct ? "Jawapan tepat" : "Jawapan belum tepat"}</h3>
    <p>Markah automatik: <b>{review.autoScore} / {review.autoMarks}</b></p>
    <ol>{review.solution.map((step, index) => <li key={index}>{step}</li>)}</ol>
    <details className="examNote"><summary>Perlu nota pendek?</summary><h4>{review.note.title}</h4><p>{review.note.body}</p><p>{review.note.example}</p></details>
    {review.rubric.length > 0 ? <div className="examSelfMark">
      <h4>Semak langkah kerja sendiri</h4><p>Tandakan hanya langkah yang ada dalam jawapan asal anda. Markah ini disimpan berasingan.</p>
      {review.rubric.map(step => <label key={step.id}><input type="checkbox" disabled={disabled} checked={Boolean(marks[step.id])}
        onChange={event => setMarks(previous => ({ ...previous, [step.id]: event.target.checked }))}/><span>{step.description} <b>({step.marks} markah)</b></span></label>)}
      <button type="button" disabled={disabled || !changed} onClick={() => onSelfMark(Object.fromEntries(review.rubric.map(step => [step.id, Boolean(marks[step.id])])))}>Simpan self-mark</button>
      <small>{changed ? "Pilihan self-mark belum disimpan." : `Self-mark tersimpan: ${review.manualScore ?? 0} / ${review.manualMarks}`}</small>
    </div> : null}
  </section>;
}

export function ExamRevisionConflict({ draft, attempt, disabled, onCloud, onLocal }: {
  draft: ExamDraft; attempt: ExamAttempt; disabled: boolean; onCloud: () => void; onLocal: () => void;
}) {
  const editable = attempt.status === "draft" && !examTimeExpired(attempt);
  const changed = attempt.paper.questions.filter(question => !examAnswersEqual(
    { answer: draft.answers[question.id] }, { answer: attempt.answers[question.id] },
  ));
  const describe = (value: { value: string; unit?: string; working?: string } | undefined) => value ? [value.value || "Tiada jawapan", value.unit, value.working && `Langkah: ${value.working}`].filter(Boolean).join(" · ") : "Tiada jawapan";
  return <section className="examConflict" role="alert">
    <h3>Draft device ini berbeza daripada cloud</h3>
    <p>Draft asal masih dikekalkan. Pilih selepas membandingkan jawapan. Jawapan yang telah disemak atau dihantar tidak boleh ditukar.</p>
    <div className="examConflictTable"><table><thead><tr><th>Soalan</th><th>Draft device ini</th><th>Cloud</th></tr></thead><tbody>
      {changed.map(question => <tr key={question.id}><th>{question.number}{attempt.checkedQuestionIds.includes(question.id) ? " · terkunci" : ""}</th>
        <td>{describe(draft.answers[question.id])}</td><td>{describe(attempt.answers[question.id])}</td></tr>)}
    </tbody></table></div>
    {!editable ? <p>Cubaan telah dihantar atau masa tamat. Draft di atas tidak boleh dikira dalam keputusan.</p> : null}
    <div className="examActions"><button type="button" disabled={disabled} onClick={onCloud}>Guna cloud & buang draft ini</button>
      {editable ? <button type="button" disabled={disabled} onClick={onLocal}>Guna draft untuk soalan yang belum dikunci</button> : null}</div>
  </section>;
}
