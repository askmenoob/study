import { BookOpenCheck, CalendarClock, CircleDollarSign, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import type { TeacherClass, TeacherEnrollment, TeacherNetworkProfile } from "../lib/teacherNetworkApi";
import "./TeacherTuitionSummary.css";

export function TeacherTuitionSummary({ profile, classes, enrollments, materialCount }: {
  profile: TeacherNetworkProfile;
  classes: TeacherClass[];
  enrollments: TeacherEnrollment[];
  materialCount: number;
}) {
  const activeClassIds = new Set(classes.filter((item) => item.status === "active").map((item) => item.id));
  const active = enrollments.filter((item) => item.status === "active" && item.teacherStatus === "active" && activeClassIds.has(item.classId));
  const pending = enrollments.filter((item) => item.status === "pending_teacher" && activeClassIds.has(item.classId));
  return <section className="teacherTuitionSummary" aria-labelledby="teacher-tuition-heading">
    <div className="teacherTuitionIntro"><div>
      <span className="teacherTuitionEyebrow"><GraduationCap aria-hidden="true"/> IMAI Smart Academy · Private Tuition</span>
      <h2 id="teacher-tuition-heading">Ringkasan mengajar</h2>
      <p>{profile.tuitionAffiliation === "imai" ? "Guru IMAI" : "Guru Luar"} · Kelas yang telah dibuat dan murid yang disahkan dalam platform.</p>
    </div><BookOpenCheck aria-hidden="true"/></div>
    <div className="teacherTuitionStats">
      <article><BookOpenCheck aria-hidden="true"/><div><strong>{activeClassIds.size}</strong><span>Kelas aktif</span></div></article>
      <article><Users aria-hidden="true"/><div><strong>{active.length}</strong><span>Sambungan murid aktif</span></div></article>
      <article><ClipboardCheck aria-hidden="true"/><div><strong>{pending.length}</strong><span>Permohonan menunggu</span></div></article>
      <article><GraduationCap aria-hidden="true"/><div><strong>{materialCount}</strong><span>Bahan guru direkodkan</span></div></article>
    </div>
    <div className="teacherTuitionComing">
      <div><CalendarClock aria-hidden="true"/><span><strong>Jadual kelas</strong><small>Urus slot dan permohonan dalam Jadual ketersediaan di bawah. Kelas aktif tidak semestinya mempunyai sesi yang dijadualkan.</small></span></div>
      <div><CircleDollarSign aria-hidden="true"/><span><strong>Pendapatan tuisyen</strong><small>Belum tersedia. Belum ada transaksi atau jumlah pendapatan yang boleh dipaparkan.</small></span></div>
    </div>
  </section>;
}
