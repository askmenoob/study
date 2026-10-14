import { useEffect, useState } from "react";
import { BookOpenCheck, ClipboardCheck, GraduationCap, MessageSquareWarning, RefreshCw, ShieldCheck, Users, Clock3 } from "lucide-react";
import { teacherNetworkApi, type TuitionAdminSummary } from "../lib/teacherNetworkApi";
import "./AdminTuitionOverview.css";

export function TuitionAdminMetrics({ summary }: { summary: TuitionAdminSummary }) {
  const stats = [
    { label: "Guru IMAI aktif", value: summary.imaiTeachers, Icon: ShieldCheck },
    { label: "Guru Luar aktif", value: summary.externalTeachers, Icon: GraduationCap },
    { label: "Kelas aktif", value: summary.activeClasses, Icon: BookOpenCheck },
    { label: "Sambungan murid aktif", value: summary.activeEnrollments, Icon: Users },
    { label: "Permohonan guru menunggu", value: summary.pendingApplications, Icon: ClipboardCheck },
    { label: "Sambungan menunggu guru", value: summary.pendingEnrollments, Icon: Clock3 },
  ];
  return <>
    <div className="adminTuitionMetrics">{stats.map(({ label, value, Icon }) => <article key={label}>
      <span className="adminTuitionMetricIcon"><Icon aria-hidden="true"/></span>
      <strong>{value.toLocaleString("ms-MY")}</strong><span>{label}</span>
    </article>)}</div>
    <div className="adminTuitionExceptions">
      <p><strong>{summary.needsInfoApplications}</strong> permohonan perlu maklumat lanjut</p>
      <p><strong>{summary.suspendedTeachers}</strong> akaun guru digantung</p>
      <p><strong>{summary.problemFeedback}</strong> rekod maklum balas berkategori masalah (semua masa; bukan jumlah tiket belum selesai)</p>
    </div>
    <nav className="adminTuitionLinks" aria-label="Akses pengurusan tuisyen">
      <a href="#admin-tuition-applications">Semak guru <ClipboardCheck aria-hidden="true"/></a>
      <a href="#admin-teacher-heading">Semakan bahan <BookOpenCheck aria-hidden="true"/></a>
      <a href="#admin-feedback-triage">Inbox masalah <MessageSquareWarning aria-hidden="true"/></a>
      <a href="#academy-readiness">Persediaan aplikasi <ClipboardCheck aria-hidden="true"/></a><a href="#academy-commerce">Pakej sandbox <ClipboardCheck aria-hidden="true"/></a>
    </nav>
  </>;
}

export function AdminTuitionOverview() {
  const [summary, setSummary] = useState<TuitionAdminSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(""); setSummary(null);
    void teacherNetworkApi.getTuitionAdminSummary(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSummary(result.summary); })
      .catch(() => { if (!controller.signal.aborted) setError("Statistik tuisyen belum dapat dimuatkan. Semak sambungan dan cuba lagi."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [refresh]);
  return <section className="adminTuitionOverview" aria-labelledby="admin-tuition-overview-heading" aria-busy={busy}>
    <header className="adminTuitionHeader"><div>
      <span className="adminFeedbackEyebrow"><GraduationCap aria-hidden="true"/> IMAI Smart Academy</span>
      <h2 id="admin-tuition-overview-heading">Private Tuition · Operasi</h2>
      <p>Angka semasa daripada rekod platform. Bukan anggaran jualan atau sesi live berjadual.</p>
    </div><button type="button" className="miniButton" onClick={() => setRefresh((n) => n + 1)} disabled={busy}><RefreshCw aria-hidden="true"/> Muat semula</button></header>
    {busy && <p className="adminTuitionLoading" role="status">Memuatkan ringkasan operasi...</p>}
    {error && <div role="alert" className="adminTuitionError"><p>{error}</p><button type="button" className="miniButton" onClick={() => setRefresh((n) => n + 1)}>Cuba lagi</button></div>}
    {!busy && !error && summary && <TuitionAdminMetrics summary={summary}/>}
    <p className="adminTuitionFootnote">Kelas aktif merujuk rekod kelas dengan guru aktif yang diluluskan; sambungan aktif ialah pengesahan kelas, bukan kehadiran atau tempahan waktu. Pendaftaran, bayaran dan komisen tuisyen belum diaktifkan.</p>
  </section>;
}
