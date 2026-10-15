import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpenCheck, GraduationCap, MapPin, ShieldCheck, UserRound, CalendarClock } from "lucide-react";
import { findSubject } from "../data/curriculum";
import { teacherNetworkApi, type TuitionTeacher } from "../lib/teacherNetworkApi";
import "./TuitionTeacherProfile.css";
import { TuitionSlotBooking } from "./TuitionSchedule";
import { TuitionSafetyReport } from "./TuitionSafetyReport";

const subjectLabel = (id: string) => findSubject(id)?.name ?? id.toUpperCase();
const levelLabel = (id: string) => id.startsWith("d") ? `Darjah ${id.slice(1)}` : `Tingkatan ${id.slice(1)}`;

export function TuitionTeacherDetails({ teacher, hasStudent, onConnect, onManage, onBack }: {
  teacher: TuitionTeacher; hasStudent: boolean;
  onConnect: () => void; onManage: () => void; onBack: () => void;
}) {
  return <div className="tuitionProfileWrap">
    <button type="button" className="tuitionBack" onClick={onBack}><ArrowLeft aria-hidden="true"/> Kembali ke senarai guru</button>
    <header className="tuitionProfileHero">
      <div className="tuitionProfilePortrait" aria-hidden="true"><UserRound/></div>
      <div className="tuitionProfileIdentity">
        <span className="tuitionEyebrow"><GraduationCap aria-hidden="true"/> Profil guru</span>
        <h1>{teacher.publicName}</h1>
        <p>{teacher.positionTitle}</p>
        <div className="tuitionProfileBadges">
          <span className={teacher.affiliation === "imai" ? "tuitionBadge imai" : "tuitionBadge external"}>
            <ShieldCheck aria-hidden="true"/>{teacher.affiliation === "imai" ? "Guru IMAI" : "Guru Luar"}
          </span>
          <span className="tuitionProfileApproved"><BadgeCheck aria-hidden="true"/> Diluluskan dalam platform</span>
        </div>
      </div>
    </header>
    <div className="tuitionProfileGrid">
      <section className="tuitionProfileSection">
        <h2>Skop pengajaran</h2>
        <p>Maklumat ini berdasarkan permohonan guru yang telah disemak oleh pentadbir IMAI.</p>
        <h3>Subjek ditawarkan</h3>
        <div className="tuitionTags">{teacher.subjectIds.map((id) => <span key={id}>{subjectLabel(id)}</span>)}</div>
        <h3>Tahap pelajar</h3>
        <div className="tuitionTags">{teacher.levelIds.map((id) => <span key={id}>{levelLabel(id)}</span>)}</div>
        <div className="tuitionProfileMeta"><MapPin aria-hidden="true"/><span>Negeri: {teacher.state}</span></div>
        <h3>Maklumat tambahan</h3>
        <dl className="tuitionProfileFacts">
          <div><dt>Pengalaman tuisyen</dt><dd>{teacher.experienceYears===undefined?"Belum dinyatakan":`${teacher.experienceYears} tahun`}</dd></div>
          <div><dt>Kelayakan</dt><dd>{teacher.qualifications??"Belum diterbitkan"}</dd></div>
          <div><dt>Jadual kelas</dt><dd>Semak slot tersedia di bawah</dd></div>
        </dl>
      </section>
      <aside className="tuitionProfileAside">
        <div className="tuitionProfileBooking"><CalendarClock aria-hidden="true"/>
          <h2>Hubungkan kelas anak</h2>
          <p>Slot yang diterbitkan guru boleh dipohon di bawah. Kelas dan pembelajaran adalah percuma sepenuhnya.</p>
          <p>Jika cikgu telah memberikan kod jemputan kelas, ibu bapa boleh memasukkannya dalam menu Guru Saya. Penyertaan memerlukan pengesahan guru.</p>
          <button className="primary" type="button" onClick={hasStudent ? onConnect : onManage}>
            {hasStudent ? "Masukkan kod kelas" : "Tambah profil anak"} <ArrowRight aria-hidden="true"/>
          </button>
          <div className="tuitionProfileDisclosure"><BookOpenCheck aria-hidden="true"/><span>Kelulusan IMAI menunjukkan semakan dalaman platform, bukan pengiktirafan rasmi KPM. Tiada maklumat hubungan peribadi guru atau pelajar dipaparkan.</span></div>
        </div>
      </aside>
    </div>
  </div>;
}

export function TuitionTeacherProfile({ id, studentId, hasStudent, onConnect, onManage, onBack }: {
  id: string; studentId?: string; hasStudent: boolean;
  onConnect: () => void; onManage: () => void; onBack: () => void;
}) {
  const [teacher, setTeacher] = useState<TuitionTeacher | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading"); setTeacher(null);
    void teacherNetworkApi.getTuitionTeacher(id, controller.signal)
      .then(({ teacher: next }) => { if (!controller.signal.aborted) { setTeacher(next); setState("ready"); } })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState(
          error instanceof Error && error.message === "TEACHER_NOT_FOUND" ? "missing" : "error");
      });
    return () => controller.abort();
  }, [id, refresh]);
  return <main className="tuitionDirectory" aria-label="Profil guru tuisyen">
    {state === "ready" && teacher
      ? <><TuitionTeacherDetails teacher={teacher} hasStudent={hasStudent} onConnect={onConnect} onManage={onManage} onBack={onBack}/><TuitionSlotBooking teacherId={id} studentId={studentId}/><TuitionSafetyReport teacherId={id}/></>
      : <div className="tuitionProfileWrap"><button type="button" className="tuitionBack" onClick={onBack}><ArrowLeft aria-hidden="true"/> Kembali ke senarai guru</button>
        <section className="tuitionEmpty" role={state === "error" ? "alert" : "status"}>
          {state === "loading" ? <p>Memuatkan profil guru...</p>
            : <><h1>{state === "missing" ? "Profil guru tidak lagi tersedia" : "Profil guru belum dapat dimuatkan"}</h1>
              <p>{state === "missing" ? "Guru mungkin sudah tidak aktif atau tidak lagi diluluskan." : "Semak sambungan dan cuba lagi."}</p>
              {state === "error" && <button type="button" className="miniButton" onClick={() => setRefresh((value) => value + 1)}>Cuba semula</button>}</>}
        </section></div>}
  </main>;
}
