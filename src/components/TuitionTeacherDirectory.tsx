import { useEffect, useState } from "react";
import { BookOpenCheck, GraduationCap, MapPin, RefreshCw, Search, ShieldCheck, UserRound } from "lucide-react";
import { findSubject } from "../data/curriculum";
import { teacherNetworkApi, type TuitionTeacher } from "../lib/teacherNetworkApi";
import type { TeacherLevelId } from "../lib/teacherContentApi";
import { TuitionTeacherProfile } from "./TuitionTeacherProfile";
import "./TuitionTeacherDirectory.css";

const levels: TeacherLevelId[] = ["d1", "d2", "d3", "d4", "d5", "d6"];
const subjects = ["bm", "en", "math", "science", "history", "islam", "moral"];
const levelLabel = (id: string) => `Darjah ${id.slice(1)}`;
const subjectLabel = (id: string) => findSubject(id)?.name ?? id.toUpperCase();

export function TuitionTeacherDirectory({ onConnect, onManage, hasStudent, studentId }: {
  onConnect: () => void; onManage: () => void; hasStudent: boolean; studentId?:string;
}) {
  const [teachers, setTeachers] = useState<TuitionTeacher[]>([]);
  const [levelId, setLevelId] = useState<TeacherLevelId | "">("");
  const [subjectId, setSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    void teacherNetworkApi.listTuitionTeachers({
      ...(levelId ? { levelId } : {}), ...(subjectId ? { subjectId } : {}),
    }, controller.signal).then(({ teachers: result }) => {
      if (!controller.signal.aborted) setTeachers(result);
    }).catch(() => {
      if (!controller.signal.aborted) { setTeachers([]); setError(true); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [levelId, subjectId, retry]);

  const visible = teachers.filter((item) => [item.publicName, item.positionTitle, item.state]
    .some((value) => value.toLocaleLowerCase("ms-MY").includes(search.trim().toLocaleLowerCase("ms-MY"))));

  if (selectedTeacherId) {
    return <TuitionTeacherProfile id={selectedTeacherId} studentId={studentId} hasStudent={hasStudent}
      onConnect={onConnect} onManage={onManage} onBack={() => setSelectedTeacherId(null)}/>;
  }
  return <main className="tuitionDirectory" aria-label="Cari guru tuisyen">
    <div className="tuitionIntro"><div><span className="tuitionEyebrow"><GraduationCap aria-hidden="true"/> IMAI Smart Academy</span>
      <h1>Cari guru peribadi untuk anak anda</h1>
      <p>Kenali guru IMAI dan guru luar yang telah diluluskan. Pilih mengikut subjek dan tahap pembelajaran.</p>
    </div><div className="tuitionIntroIcon"><BookOpenCheck aria-hidden="true"/></div></div>
    <section className="tuitionFilters" aria-label="Tapis direktori">
      <label>Carian nama guru<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Contoh: Cikgu Aina" autoComplete="off"/></label>
      <label>Tahap<select value={levelId} onChange={(event) => setLevelId(event.target.value as TeacherLevelId | "")}>
        <option value="">Semua tahap</option>{levels.map((id) => <option key={id} value={id}>{levelLabel(id)}</option>)}
      </select></label>
      <label>Subjek<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
        <option value="">Semua subjek</option>{subjects.map((id) => <option key={id} value={id}>{subjectLabel(id)}</option>)}
      </select></label>
      <button className="miniButton" type="button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw aria-hidden="true"/>Muat semula</button>
    </section>
    <div className="tuitionResultHeader"><h2>Guru yang tersedia</h2><span>{loading ? "Memuatkan..." : `${visible.length} guru`}</span></div>
    {error && <div className="tuitionEmpty" role="alert"><p>Direktori guru belum dapat dimuatkan. Semak sambungan dan cuba lagi.</p><button className="miniButton" onClick={() => setRetry((n) => n + 1)}>Cuba semula</button></div>}
    {!error && loading && <p role="status" className="tuitionEmpty">Sedang mencari guru yang disahkan...</p>}
    {!error && !loading && visible.length === 0 && <div className="tuitionEmpty"><Search aria-hidden="true"/><h3>Belum ada guru sepadan</h3><p>Cuba tahap, subjek atau carian lain. Guru baharu akan dipaparkan selepas kelulusan IMAI.</p></div>}
    {!error && !loading && visible.length > 0 && <div className="tuitionCards">
      {visible.map((teacher) => <article key={teacher.id} className="tuitionCard">
        <div className="tuitionCardHeader"><span className="tuitionAvatar"><UserRound aria-hidden="true"/></span>
          <span className={teacher.affiliation === "imai" ? "tuitionBadge imai" : "tuitionBadge external"}><ShieldCheck aria-hidden="true"/>{teacher.affiliation === "imai" ? "Guru IMAI" : "Guru Luar"}</span></div>
        <h3>{teacher.publicName}</h3><p className="tuitionPosition">{teacher.positionTitle}</p>
        <div className="tuitionMeta"><MapPin aria-hidden="true"/> {teacher.state}</div>
        <p className="tuitionCardLabel">Subjek</p><div className="tuitionTags">{teacher.subjectIds.map((id) => <span key={id}>{subjectLabel(id)}</span>)}</div>
        <p className="tuitionCardLabel">Tahap</p><p className="tuitionLevels">{teacher.levelIds.map(levelLabel).join(" · ")}</p>
        <p className="tuitionCardDisclaimer">Lihat slot tersedia dalam profil guru. Permohonan memerlukan pengesahan guru. Kelas dan pembelajaran adalah percuma.</p>
        <button type="button" className="primary tuitionCardAction" onClick={() => setSelectedTeacherId(teacher.id)}>
          Lihat profil guru <BookOpenCheck aria-hidden="true"/>
        </button>
      </article>)}
    </div>}
    <p className="tuitionFootnote">Direktori ini hanya memaparkan guru aktif yang diluluskan. Waktu slot ialah waktu Malaysia. Kelas dan pembelajaran adalah percuma.</p>
  </main>;
}
