import { useEffect, useState } from "react";
import { AdminTuitionCommerce } from "./AdminTuitionCommerce";
import { AdminTuitionVideo } from "./TuitionVideo";
import { AdminTuitionNotificationOutbox } from "./TuitionNotificationPreferences";
import { AdminTuitionRetention } from "./AdminTuitionRetention";
import {AdminTuitionPayouts,AdminTuitionAccounting} from "./TuitionFinance";
import {AdminTuitionReadiness} from "./AdminTuitionReadiness";
import { Inbox, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { FeedbackApiError, feedbackApi, type AdminFeedback, type FeedbackCategory } from "../lib/feedbackApi";
import { AdminUserDirectory } from "./AdminUserDirectory";
import { AdminTeacherPanel } from "./AdminTeacherPanel";
import { AdminTuitionOverview } from "./AdminTuitionOverview";
import { AdminFeedbackTriage } from "./AdminFeedbackTriage";
import { AcademyWorkspaceNav } from "./AcademyChrome";
import { AcademyAdminApplications } from "./AcademyAdminPreview";
import { AcademyRoleIllustration } from "./AcademyRoleIllustration";
import "./AdminFeedbackInbox.css";

const categoryLabels: Record<FeedbackCategory, string> = {
  suggestion: "Cadangan",
  problem: "Masalah",
  other: "Lain-lain",
};
const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Masa tidak tersedia" : date.toLocaleString("ms-MY", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export function AdminFeedbackList({ feedback }: { feedback: AdminFeedback[] }) {
  if (!feedback.length) return <div className="adminFeedbackEmpty"><Inbox aria-hidden="true" /><h2>Belum ada maklum balas</h2><p>Cadangan dan laporan ibu bapa akan muncul di sini selepas dihantar.</p></div>;
  return <div className="adminFeedbackList">{feedback.map((item) => <article key={item.id} className="adminFeedbackCard">
    <div className="adminFeedbackMeta"><span className={`adminFeedbackCategory category-${item.category}`}>{categoryLabels[item.category]}</span></div>
    <div className="adminFeedbackReference"><strong>{item.referenceId}</strong><time dateTime={item.createdAt}>{displayDate(item.createdAt)}</time></div>
    <p className="adminFeedbackMessage">{item.message}</p>
    <dl>
      <div><dt>Daripada</dt><dd>{item.parentDisplayName || "Ibu / Bapa"}</dd></div>
      <div><dt>Akaun ibu bapa</dt><dd>{item.parentEmail}</dd></div>
      {item.pagePath ? <div><dt>Halaman</dt><dd>{item.pagePath}</dd></div> : null}
    </dl>
    <p className="adminFeedbackReply">{item.allowReply ? "Boleh dihubungi semula" : "Tidak meminta untuk dihubungi semula"}</p>
  </article>)}</div>;
}

export function AdminFeedbackInbox({ email, onLogout }: { email?: string; onLogout: () => void }) {
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true); setError("");
    void feedbackApi.listAdmin(controller.signal).then((result) => {
      if (alive) setFeedback(result.feedback);
    }).catch((caught: unknown) => {
      if (!alive) return;
      setError(caught instanceof FeedbackApiError && [401, 403].includes(caught.status)
        ? "Sesi super admin telah tamat atau tidak dibenarkan. Log keluar dan masuk semula."
        : "Inbox belum dapat dimuatkan. Semak sambungan dan cuba semula.");
    }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; controller.abort(); };
  }, [refresh]);

  return <div className="adminFeedbackShell academyUnified academyRoleAdmin"><AcademyWorkspaceNav role="admin"/>
    <header className="adminFeedbackHeader"><div className="adminFeedbackBrand"><ShieldCheck aria-hidden="true" /><span><strong>study.imai.my</strong><small>IMAI Smart Academy · Admin</small></span></div><div className="adminFeedbackAccount"><span>{email ?? "Akaun pentadbir"}</span><button type="button" className="miniButton" onClick={onLogout}><LogOut aria-hidden="true" />Log keluar</button></div></header>
    <main className="adminFeedbackMain">
      <div className="adminFeedbackTitle adminDashboardTitle academyIllustratedWelcome" id="academy-admin-home"><div><span className="adminFeedbackEyebrow">IMAI Study</span><h1>Selamat datang, Admin IMAI! 👋</h1><p>Semak pengguna berdaftar serta cadangan dan maklum balas ibu bapa.</p></div><AcademyRoleIllustration role="admin"/></div>
      <div id="academy-admin-operations"><AdminTuitionOverview /></div><div className="academyOverviewGrid academyAdminDesk"><AcademyAdminApplications/><section className="academyPanel"><div className="academyPanelHeading"><h2><Inbox aria-hidden="true"/>Maklum Balas Terkini</h2><a className="academyLinkButton" href="#admin-feedback-heading">Lihat semua</a></div>{busy?<p role="status">Memuatkan maklum balas...</p>:error?<p role="alert">{error}</p>:feedback.length?feedback.slice(0,3).map(item=><a className="academyDeskRow" href="#admin-feedback-heading" key={item.id}><span className="academyTileIcon purple"><Inbox aria-hidden="true"/></span><span><strong>{categoryLabels[item.category]} · {item.referenceId}</strong><small>{displayDate(item.createdAt)}</small></span></a>):<div className="academyCompactEmpty"><Inbox aria-hidden="true"/><p>Belum ada maklum balas direkodkan.</p></div>}</section></div>
      <div id="academy-users"><AdminUserDirectory /></div>
      <AdminTeacherPanel />
      <AdminTuitionReadiness />
      <AdminTuitionCommerce />
      <div id="academy-finance"><AdminTuitionPayouts /><AdminTuitionAccounting /></div>
      <AdminTuitionVideo />
      <AdminTuitionNotificationOutbox />
      <AdminTuitionRetention />
      <AdminFeedbackTriage />
      <section aria-labelledby="admin-feedback-heading" aria-busy={busy}>
        <div className="adminFeedbackTitle"><div><span className="adminFeedbackEyebrow">Cadangan &amp; maklum balas</span><h2 id="admin-feedback-heading">Inbox ibu bapa</h2><p>Semua rekod yang dihantar oleh ibu bapa tersedia di sini.</p></div><button type="button" className="miniButton" disabled={busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw aria-hidden="true" />Muat semula</button></div>
        {busy && <p className="adminFeedbackLoading" role="status">Memuatkan maklum balas...</p>}
        {error && <div className="adminFeedbackError" role="alert"><p>{error}</p><button type="button" className="miniButton" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>Cuba lagi</button></div>}
        {feedback.length > 0 && <AdminFeedbackList feedback={feedback} />}
        {!busy && !error && feedback.length === 0 && <AdminFeedbackList feedback={[]} />}
      </section>
    </main>
  </div>;
}
