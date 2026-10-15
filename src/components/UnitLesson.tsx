import { voiceEnabledForLevel } from "../lib/voiceGrade";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Volume2, Square } from "lucide-react";
import { libraryUnits } from "../../server/library/catalog";
import { earlyFrames } from "../../server/library/earlyLearning";
import { learningPolicy } from "../../server/library/learningPolicy";
import { LearningPicture } from "./LearningPicture";
import { useLearningSpeech } from "../lib/useLearningSpeech";
import { markUnitLearned } from "../lib/learnedUnits";
import "./UnitLearning.css";
import { IllustratedReading } from "./IllustratedReading";
import { ReadingVisualGuide } from "./ReadingGraphics";

export interface UnitLessonProps { unitId: string; profileKey: string; onBack: () => void; onStart: () => void }
export function UnitLesson({ unitId, profileKey, onBack, onStart }: UnitLessonProps) {
  const unit = libraryUnits.find(u => u.id === unitId);
  const [page,setPage] = useState(-1);
  const [support,setSupport] = useState<"listen"|"read">(() => { try { return localStorage.getItem(`imai-study:reading-support:${profileKey}`) === "read" ? "read" : "listen"; } catch { return "listen"; } });
  const [storageMessage,setStorageMessage] = useState("");
  const language = ["en","lit_en","mgmt_math","stpm_math","ict","physics","chemistry","biology"].includes(unit?.subjectId ?? "") ? "en" : unit?.subjectId === "bc" ? "zh" : unit?.subjectId === "bt" ? "ta" : unit?.subjectId === "ba" ? "ar" : "ms";
  const voiceEnabled = voiceEnabledForLevel(unit?.levelId);
  const speech = useLearningSpeech(language, voiceEnabled);
  if (!unit) return <main className="unitLesson"><p>Unit ini tidak tersedia untuk dipelajari.</p><button onClick={onBack}>Kembali</button></main>;
  const readingFrames = unit.levelId === "d1" && unit.reading.illustrations?.length
    ? unit.reading.body.map((text, index) => ({ text, visual: unit.reading.illustrations!.find(picture => picture.afterParagraph === index)!.visual })) : undefined;
  const frames = earlyFrames[unit.id] ?? readingFrames;
  const pages = frames?.length ?? 2;
  const text = frames ? frames[Math.max(0,page)]?.text ?? "" : page === 0 ? unit.note.body.join("\n\n") : unit.reading.body.join("\n\n");
  function chooseSupport(value: "listen"|"read") {
    setSupport(value);
    try { localStorage.setItem(`imai-study:reading-support:${profileKey}`,value); } catch { setStorageMessage("Pilihan cara belajar digunakan untuk sesi ini sahaja."); }
  }
  function next() { speech.stop(); if (page >= pages-1) { markUnitLearned(profileKey,unitId); onStart(); } else setPage(p => p+1); window.scrollTo({top:0,behavior:"instant"}); }
  return <main className={`unitLesson${frames ? " unitLessonEarly" : ""}`}>
    <button className="back" onClick={() => {speech.stop();onBack();}}><ArrowLeft/> Kembali</button>
    <div className="unitLessonHeading"><span>{learningPolicy(unit.levelId).approach}</span><h1>{unit.note.title}</h1><p>{unit.note.summary}</p></div>
    {page===-1&&<ReadingVisualGuide resource={{...unit.reading,subjectId:unit.subjectId,language}}/>}
    <div className="unitLessonJourney" aria-label="Langkah pembelajaran"><span className="current"><BookOpen aria-hidden="true"/> Baca dan fahami</span><span>Cuba aktiviti</span></div>
    <div className="unitLessonProgress" role="progressbar" aria-label="Kemajuan bacaan unit" aria-valuemin={0} aria-valuemax={pages} aria-valuenow={Math.max(0,page+1)}><span style={{width:`${Math.max(0,page+1)/pages*100}%`}}/></div>
    {page < 0 ? <section className="unitLessonWelcome">
      {frames ? <LearningPicture visual={frames[0].visual}/> : <div className="unitWelcomeIllustration"><img src="/focus-reading.webp" alt="" width="240" height="180"/></div>}
      <h2>{frames ? "Jom belajar dahulu" : "Fahami satu unit, kemudian cuba"}</h2>
      {frames ? <><p>Lihat gambar dan dengar contoh. Selepas itu, cuba sehingga enam aktiviti. Kamu boleh berehat.</p><fieldset className="learningSupport"><legend>Cara belajar kamu</legend><label><input type="radio" name="reading-support" checked={support === "listen"} onChange={() => chooseSupport("listen")}/><Headphones/> Dengar dan lihat gambar</label><label><input type="radio" name="reading-support" checked={support === "read"} onChange={() => chooseSupport("read")}/><BookOpen/> Saya boleh baca ayat pendek</label></fieldset><p className="unitScope">Jika audio belum tersedia, minta orang dewasa membacakan. Cara belajar boleh diubah tanpa menukar gred kelas.</p></> : <><h3>Dalam unit ini</h3><ul>{unit.curriculum.objectives.map(o => <li key={o} dir="auto">{o}</li>)}</ul><p>{unit.curriculum.prerequisite}</p></>}
      {storageMessage && <p role="status">{storageMessage}</p>}
      <button className="primary" onClick={next}>{frames ? "Lihat dan belajar" : "Buka nota unit"}<ArrowRight/></button>
    </section> : <section className="unitTeachingCard">
      <p className="unitStep">{frames ? "Belajar bersama" : page === 0 ? "Nota dan contoh" : "Bacaan untuk latihan"} · {page+1}/{pages}</p>
      {frames && <LearningPicture visual={frames[page].visual}/>}
      {!frames&&<ReadingVisualGuide resource={{...(page===0?unit.note:unit.reading),subjectId:unit.subjectId,language}}/>}
      <div className="unitLessonText">{!frames ? <IllustratedReading body={page===0?unit.note.body:unit.reading.body} illustrations={page===0?unit.note.illustrations:unit.reading.illustrations}/> : text.split("\n\n").map((p,i) => <p key={i} dir="auto">{p}</p>)}</div>
      {voiceEnabled && <div className="learningSpeech"><button className="speechButton" onClick={() => void speech.speak(text)} disabled={speech.busy}><Volume2/>{speech.busy ? "Menyediakan audio…" : "Dengar contoh"}</button><button aria-label="Hentikan audio" onClick={speech.stop}><Square/></button></div>}
      {voiceEnabled && speech.message && <p role="status" className="learningSpeechMessage">{speech.message}</p>}
      {voiceEnabled && frames && support === "listen" && <p className="unitScope">Tekan pembesar suara. Dengar semula jika perlu.</p>}
      <div className="unitLessonActions"><button onClick={() => {speech.stop();setPage(p => p-1);}}>Lihat semula</button><button className="primary" onClick={next}>{page === pages-1 ? "Giliran kamu · Cuba aktiviti" : "Seterusnya"}<ArrowRight/></button></div>
    </section>}
    <p className="unitScope">Unit pilihan untuk gred ini. Library belum meliputi semua bab.{unit.levelId === "t6" ? unit.curriculum.semester ? ` Semester ${unit.curriculum.semester} · Sebahagian hasil pembelajaran telah dipadankan dengan sukatan MPM.` : " Padanan semester STPM masih memerlukan semakan pendidik." : ""}</p>
  </main>;
}
