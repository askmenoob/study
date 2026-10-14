import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, GraduationCap, RefreshCw, Users, Clock3 } from "lucide-react";
import { teacherNetworkApi, type TeacherEnrollment } from "../lib/teacherNetworkApi";
import { findSubject } from "../data/curriculum";
import "./ParentTuitionOverview.css";
import { TuitionBookingList,TuitionNotifications } from "./TuitionSchedule";
import { FamilyHomeworkPanel, TuitionProgressReport } from "./TuitionHomework";
import { ParentTuitionInvoices } from "./ParentTuitionInvoices";
import { TuitionNotificationPreferences } from "./TuitionNotificationPreferences";

export function ParentTuitionOverview({ studentId, studentName, onFindTeacher, onConnections, onManage }: {
  studentId?: string;
  studentName?: string;
  onFindTeacher: () => void;
  onConnections: () => void;
  onManage: () => void;
}) {
  const [classes, setClasses] = useState<TeacherEnrollment[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!studentId) { setClasses([]); setState("idle"); return; }
    const controller = new AbortController();
    setClasses([]); setState("loading");
    void teacherNetworkApi.listConnections(studentId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setClasses(data.enrollments); setState("ready"); } })
      .catch(() => { if (!controller.signal.aborted) { setClasses([]); setState("error"); } });
    return () => controller.abort();
  }, [studentId, retry]);
  const active = classes.filter((item) => item.status === "active" && item.teacherStatus === "active");
  const pending = classes.filter((item) => item.status === "pending_teacher");
  return <><section className="parentTuitionOverview" aria-labelledby="parent-tuition-heading">
    <div className="parentTuitionHeader"><div><span className="tuitionEyebrow"><GraduationCap aria-hidden="true"/> Private Tuition</span>
      <h2 id="parent-tuition-heading">Tuisyen peribadi{studentName ? ` · ${studentName}` : ""}</h2>
      <p>Guru IMAI dan guru luar dalam satu ruang pembelajaran.</p></div>
      <button type="button" className="miniButton" onClick={onFindTeacher}>Cari Guru <ArrowRight aria-hidden="true"/></button>
    </div>
    {!studentId ? <div className="parentTuitionEmpty"><Users aria-hidden="true"/><p>Tambah profil anak dahulu untuk melihat kelas dan mencari guru.</p><button type="button" className="miniButton" onClick={onManage}>Tambah anak</button></div>
      : <><div className="parentTuitionMetrics">
        <article><BookOpenCheck aria-hidden="true"/><div><strong>{state === "ready" ? active.length : "—"}</strong><span>Kelas aktif</span></div></article>
        <article><Clock3 aria-hidden="true"/><div><strong>{state === "ready" ? pending.length : "—"}</strong><span>Menunggu guru</span></div></article>
      </div>
      {state === "loading" && <p role="status" className="parentTuitionLoading">Memuatkan sambungan kelas anak...</p>}
      {state === "error" && <div role="alert" className="parentTuitionError"><p>Maklumat kelas belum dapat dimuatkan. Cuba lagi.</p><button type="button" className="miniButton" onClick={() => setRetry((value) => value + 1)}><RefreshCw aria-hidden="true"/> Cuba lagi</button></div>}
      {state === "ready" && active.length + pending.length === 0 && <div className="parentTuitionEmpty"><p>Anak ini belum mempunyai kelas yang aktif atau menunggu pengesahan. Mulakan dengan mencari guru.</p></div>}
      {state === "ready" && active.length + pending.length > 0 && <div className="parentTuitionConnections">
        {[...active, ...pending].slice(0, 4).map((item) => <article key={item.id}>
          <div><strong>{item.className}</strong><span>{item.teacherPublicName} · {findSubject(item.subjectId)?.name ?? item.subjectId.toUpperCase()}</span></div>
          <span className={item.status === "active" ? "tuitionClassStatus active" : "tuitionClassStatus pending"}>{item.status === "active" ? "Aktif" : "Menunggu guru"}</span>
        </article>)}
      </div>}
      <button type="button" className="parentTuitionConnectionsLink" onClick={onConnections}>Urus sambungan kelas <ArrowRight aria-hidden="true"/></button>
      </>}
  </section>{studentId&&<><TuitionBookingList role="parent" studentId={studentId}/><ParentTuitionInvoices studentId={studentId}/><FamilyHomeworkPanel studentId={studentId} canSubmit={false}/><TuitionProgressReport studentId={studentId}/><TuitionNotifications/><TuitionNotificationPreferences/></>}</>;
}
