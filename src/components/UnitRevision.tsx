import { BookOpen, RefreshCw } from "lucide-react";
import { getSubjectsForLevel, getTopics } from "../data/curriculum";
import type { AttemptRecord, LevelId, Topic } from "../types";
import { learnedUnits } from "../lib/learnedUnits";
import { learningPolicy } from "../../server/library/learningPolicy";
import "./UnitLearning.css";

export function UnitRevision({ levelId, levelLabel, profileKey, attempts, onReview, onLearn, onExam }: {
  levelId: LevelId; levelLabel: string; profileKey: string; attempts: AttemptRecord[];
  onReview: (topic: Topic, subjectId: string) => void; onLearn: (subjectId: string) => void; onExam: () => void;
}) {
  const learned = learnedUnits(profileKey);
  for (const attempt of attempts) if (attempt.levelId === levelId && attempt.total > 0) learned.add(attempt.topicId);
  const entries = getSubjectsForLevel(levelId).flatMap(subject => getTopics(levelId,subject.id).map(topic => ({subject,topic,ready:learned.has(topic.id)})));
  const ready = entries.filter(entry => entry.ready);
  return <main className="unitLesson unitRevision"><div className="unitLessonHeading"><span>{levelLabel}</span><h1>{learningPolicy(levelId).assessment}</h1><p>Ingat semula perkara yang kamu pelajari dalam Library.</p><div className="revisionReadyCount"><BookOpen aria-hidden="true"/><b>{ready.length}</b><span>daripada {entries.length} unit sedia diulang kaji</span></div></div>
    <section className="unitLessonWelcome"><h2>{ready.length ? "Unit yang sudah dipelajari" : "Jom pilih satu unit dahulu"}</h2><p>{ready.length ? "Soalan di sini menggunakan konsep daripada unit-unit ini. Kamu boleh membuka contoh semula sebelum menjawab." : "Selepas nota dan contoh dipelajari, unit itu akan tersedia untuk ulang kaji di sini."}</p>
      <div className="revisionUnitList">{entries.map(({subject,topic,ready}) => <article key={topic.id} className={ready ? "revisionUnitReady" : "revisionUnitToLearn"}><div><small>{subject.name}</small><h3>{topic.name}</h3><p>{topic.description}</p></div><button className={ready ? "primary" : "miniButton"} onClick={() => ready ? onReview(topic,subject.id) : onLearn(subject.id)}>{ready ? <RefreshCw/> : <BookOpen/>}{ready ? "Ulang kaji unit ini" : "Belajar unit ini"}</button></article>)}</div>
    </section>
    {!/^d[123]$/.test(levelId) && <section className="unitLessonWelcome revisionExamLink"><h2>Latihan format peperiksaan</h2><p>Set format peperiksaan mempunyai liputan dan status semakan tersendiri. Ia tidak dianggap selesai hanya kerana satu unit Library telah dipelajari.</p><button className="miniButton" onClick={onExam}>Lihat set peperiksaan yang tersedia</button></section>}
    <p className="unitScope">{ready.length} daripada {entries.length} unit pilihan telah dipelajari. Ini bukan ukuran liputan penuh silibus atau Tahap Penguasaan rasmi KPM.{levelId === "t6" ? " Liputan semester STPM belum disahkan sepenuhnya." : ""}</p>
  </main>;
}
