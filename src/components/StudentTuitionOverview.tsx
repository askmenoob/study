import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, GraduationCap, RefreshCw, Sparkles, Clock3 } from "lucide-react";
import { findSubject } from "../data/curriculum";
import { teacherNetworkApi, type StudentTuitionClass } from "../lib/teacherNetworkApi";
import "./StudentTuitionOverview.css";
import { TuitionBookingList } from "./TuitionSchedule";
import { FamilyHomeworkPanel } from "./TuitionHomework";

export function StudentTuitionOverview({ studentId, onMaterials, onTutor }: {
  studentId?: string; onMaterials: () => void; onTutor: () => void;
}) {
  const [classes, setClasses] = useState<StudentTuitionClass[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!studentId) { setClasses([]); setPhase("idle"); return; }
    const controller = new AbortController();
    setPhase("loading"); setClasses([]);
    void teacherNetworkApi.listStudentTuitionClasses(studentId, controller.signal)
      .then(({ classes: result }) => { if (!controller.signal.aborted) { setClasses(result); setPhase("ready"); } })
      .catch(() => { if (!controller.signal.aborted) { setClasses([]); setPhase("error"); } });
    return () => controller.abort();
  }, [studentId, reload]);

  const active = classes.filter((item) => item.status === "active");
  const pending = classes.filter((item) => item.status === "pending_teacher");
  return <><section className="studentTuition" aria-labelledby="student-tuition-heading">
    <header className="studentTuitionHeader"><div><span className="studentTuitionEyebrow"><GraduationCap aria-hidden="true"/> IMAI Private Tuition</span>
      <h2 id="student-tuition-heading">Kelas dengan guru saya</h2><p>Belajar bersama cikgu, kemudian ulang kaji mengikut rentak kamu.</p>
    </div><button type="button" className="studentTuitionRefresh" disabled={phase === "loading"} onClick={() => setReload((n) => n + 1)} aria-label="Muat semula kelas"><RefreshCw aria-hidden="true"/></button></header>
    <div className="studentTuitionSummary" aria-label="Ringkasan kelas">
      <div><BookOpenCheck aria-hidden="true"/><strong>{phase === "ready" ? active.length : "—"}</strong><span>Kelas aktif</span></div>
      <div><Clock3 aria-hidden="true"/><strong>{phase === "ready" ? pending.length : "—"}</strong><span>Menunggu cikgu</span></div>
    </div>
    {phase === "loading" && <p role="status" className="studentTuitionNotice">Sedang memuatkan kelas kamu...</p>}
    {phase === "error" && <div role="alert" className="studentTuitionNotice"><p>Kelas belum dapat dimuatkan.</p><button type="button" className="miniButton" onClick={() => setReload((n) => n + 1)}>Cuba lagi</button></div>}
    {phase === "idle" && <p className="studentTuitionNotice">Belum ada profil pelajar aktif untuk memaparkan kelas.</p>}
    {phase === "ready" && classes.length === 0 && <p className="studentTuitionNotice">Belum ada kelas bersama guru. Ibu bapa boleh membantu menyertai kelas melalui kod jemputan cikgu.</p>}
    {phase === "ready" && classes.length > 0 && <div className="studentTuitionList">
      {[...active, ...pending].slice(0, 4).map((item) => <article key={item.id}>
        <span className="studentTuitionClassIcon"><BookOpenCheck aria-hidden="true"/></span>
        <div><h3>{item.className}</h3><p>{item.teacherPublicName} · {findSubject(item.subjectId)?.name ?? item.subjectId.toUpperCase()}</p></div>
        <span className={item.status === "active" ? "studentTuitionStatus active" : "studentTuitionStatus pending"}>{item.status === "active" ? "Aktif" : "Menunggu cikgu"}</span>
      </article>)}
    </div>}
    <footer className="studentTuitionActions">
      <button type="button" className="studentTuitionMaterials" onClick={onMaterials}>Bahan daripada guru <ArrowRight aria-hidden="true"/></button>
      <button type="button" className="studentTuitionTutor" onClick={onTutor}><Sparkles aria-hidden="true"/> Tanya AI Tutor</button>
    </footer>
    <p className="studentTuitionFootnote">Sesi yang disahkan dipaparkan dalam tempahan. Kelas aktif bermaksud cikgu telah mengesahkan sambungan.</p>
  </section>{studentId&&<><TuitionBookingList role="student" studentId={studentId}/><FamilyHomeworkPanel studentId={studentId} canSubmit={true}/></>}</>;
}
