import { voiceEnabledForLevel } from "../lib/voiceGrade";
import { CheckCircle2, ChevronRight, Lightbulb, Square, Volume2 } from "lucide-react";
import type { Question } from "../types";
import { LearningPicture } from "./LearningPicture";
import { useLearningSpeech } from "../lib/useLearningSpeech";
import "./UnitLearning.css";
import { ReadingEvidenceNote } from "./IllustratedReading";

export function UnitQuestionCard({ question, selected, onSelect, onNext, last, language, levelId }: {
  question: Question; selected: number|null; onSelect: (index: number) => void; onNext: () => void; last: boolean; language: string; levelId?: string;
}) {
  const voiceEnabled = voiceEnabledForLevel(levelId);
  const speech = useLearningSpeech(language, voiceEnabled);
  const parts = question.prompt.split(/\n\n/), title = parts.pop();
  const sayQuestion = [question.prompt, ...question.options.map((o,i) => `${String.fromCharCode(65+i)}. ${o}`)].join("\n");
  return <section className={`unitQuestionCard${question.support ? " unitQuestionEarly" : ""}`}>
    {parts.length > 0 && <div className="unitQuestionPassage">{parts.map((p,i) => <p dir="auto" key={i}>{p}</p>)}</div>}
    {question.support?.scene && <LearningPicture visual={question.support.scene}/>}
    <h2 dir="auto">{title}</h2>
    {voiceEnabled && <div className="learningSpeech"><button className="speechButton" disabled={speech.busy} onClick={() => void speech.speak(sayQuestion)}><Volume2/>{speech.busy ? "Menyediakan audio…" : "Dengar soalan dan pilihan"}</button><button aria-label="Hentikan audio" onClick={speech.stop}><Square/></button></div>}
    {voiceEnabled && speech.message && <p role="status" className="learningSpeechMessage">{speech.message}</p>}
    <div className={`unitChoices${question.support ? " unitPictureChoices" : ""}`}>{question.options.map((option,index) => <div className="unitChoice" key={index}>
      <button className={`unitAnswer${selected !== null ? index === question.answer ? " unitAnswerCorrect" : index === selected ? " unitAnswerWrong" : "" : ""}`} disabled={selected !== null} aria-pressed={selected === index} onClick={() => {speech.stop();onSelect(index);}}>
        {question.support?.choices[index] && <LearningPicture visual={question.support.choices[index]} small/>}<span dir="auto"><b>{String.fromCharCode(65+index)}.</b> {option}</span>
      </button>{voiceEnabled && <button className="unitChoiceSpeech" aria-label={`Dengar pilihan ${String.fromCharCode(65+index)}`} disabled={speech.busy} onClick={() => void speech.speak(option)}><Volume2 size={19}/></button>}
    </div>)}</div>
    {selected === null && question.hint && <details className="unitHint"><summary>Perlu bantuan?</summary><p dir="auto">{question.hint}</p>{voiceEnabled && <button onClick={() => void speech.speak(question.hint!)}><Volume2/> Dengar bantuan</button>}</details>}
    {selected !== null && <div className="unitFeedback" role="status"><div>{selected === question.answer ? <CheckCircle2/> : <Lightbulb/>}<b>{selected === question.answer ? "Betul!" : "Mari belajar daripada jawapan ini."}</b></div><p dir="auto">{question.explanation}</p><ReadingEvidenceNote evidence={question.evidence}/><div className="unitLessonActions">{voiceEnabled && <button onClick={() => void speech.speak(question.explanation)}><Volume2/> Dengar penerangan</button>}<button className="primary" onClick={() => {speech.stop();onNext();}}>{last ? "Selesai aktiviti" : "Seterusnya"}<ChevronRight/></button></div></div>}
  </section>;
}
