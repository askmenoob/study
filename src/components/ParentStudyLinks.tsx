import "./ParentStudyLinks.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { approveFocusExit, createStudyLink, getStudentFocusSessions, getStudyLinks, revokeStudyLink, type FocusSession, type StudyLink } from "../lib/api";
import { isSessionEnded } from "../lib/studySession";
import { DeviceSetupGuide } from "./DeviceSetupGuide";

const dateTime = (date: string) => new Date(date).toLocaleString("ms-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sessionLabels: Record<FocusSession["status"], string> = { active: "Sedang belajar", exit_requested: "Minta kebenaran keluar", approved: "Ditamatkan oleh ibu bapa", revoked: "Dibatalkan", expired: "Tempoh tamat" };

export function ParentStudyLinks({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [duration, setDuration] = useState(30);
  const [links, setLinks] = useState<StudyLink[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [created, setCreated] = useState<{ id: string; url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const mutation = useRef(false);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const refreshing = useRef(false);
  const refreshAgain = useRef(false);

  const refresh = useCallback(async function refreshNow(): Promise<void> {
    if (refreshing.current) { refreshAgain.current = true; return; }
    refreshing.current = true;
    const request = ++sequence.current;
    try {
      const [linkResult, sessionResult] = await Promise.all([getStudyLinks(studentId), getStudentFocusSessions(studentId)]);
      if (!mounted.current || request !== sequence.current) return;
      setLinks(linkResult.links); setSessions(sessionResult.sessions); setLoaded(true); setError("");
      setCreated((current) => current && linkResult.links.some((link) => link.id === current.id && !link.redeemedAt && !link.revokedAt && Date.parse(link.expiresAt) > Date.now()) ? current : null);
    } catch {
      if (mounted.current && request === sequence.current) setError("Tidak dapat mengemas kini link dan sesi. Semak sambungan, kemudian cuba semula.");
    } finally {
      refreshing.current = false;
      if (refreshAgain.current && mounted.current) { refreshAgain.current = false; void refreshNow(); }
    }
  }, [studentId]);
  useEffect(() => {
    mounted.current = true;
    const check = () => { if (document.visibilityState === "visible" && !mutation.current) void refresh(); };
    void refresh();
    const poll = window.setInterval(check, 8000);
    document.addEventListener("visibilitychange", check);
    return () => { mounted.current = false; ++sequence.current; clearInterval(poll); document.removeEventListener("visibilitychange", check); };
  }, [refresh]);

  const generate = async () => {
    if (mutation.current) return;
    mutation.current = true; ++sequence.current; setBusy(true); setError(""); setNotice("");
    try {
      const result = await createStudyLink(studentId, duration);
      if (!mounted.current) return;
      setCreated({ id: result.link.id, url: window.location.origin + "/#join=" + encodeURIComponent(result.code), expiresAt: result.link.expiresAt });
      setNotice("Link siap. Salin dan kongsi sendiri kepada anak. Link hanya boleh digunakan sekali.");
      await refresh();
    } catch { if (mounted.current) setError("Link belum dapat dijana. Cuba lagi. Jika permintaan tadi sudah diterima, link itu masih boleh dibatalkan dalam senarai."); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (mutation.current) return;
    mutation.current = true; ++sequence.current; setBusy(true); setError(""); setNotice("");
    try {
      await revokeStudyLink(studentId, id);
      if (!mounted.current) return;
      setCreated((current) => current?.id === id ? null : current); setNotice("Link dibatalkan.");
      await refresh();
    } catch { if (mounted.current) setError("Pembatalan belum dapat disahkan. Muat semula senarai sebelum mencuba lagi."); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const approve = async (id: string) => {
    if (mutation.current) return;
    mutation.current = true; ++sequence.current; setBusy(true); setError(""); setNotice("");
    try {
      await approveFocusExit(studentId, id);
      if (!mounted.current) return;
      setConfirmEnd(null); setNotice("Kelulusan dihantar. Sesi Study anak akan tamat apabila perantinya menerima kemas kini. Jika lock peranti aktif, ibu bapa perlu membukanya pada peranti anak.");
      await refresh();
    } catch { if (mounted.current) setError("Kelulusan belum dapat disahkan. Muat semula status sesi sebelum mencuba lagi."); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const copyLink = () => {
    if (!created) return;
    if (!navigator.clipboard?.writeText) { setNotice("Pilih link dalam kotak, kemudian salin secara manual."); return; }
    void navigator.clipboard.writeText(created.url).then(() => setNotice("Link disalin. Kongsi kepada " + studentName + ".")).catch(() => setNotice("Salinan automatik tidak dibenarkan. Pilih link dan salin secara manual."));
  };
  const activeSessions = sessions.filter((session) => !isSessionEnded(session.status));
  const pendingLinks = links.filter((link) => !link.redeemedAt && !link.revokedAt && Date.parse(link.expiresAt) > Date.now());
  return <section className="parentStudyLinks" aria-labelledby="studyLinkTitle">
    <div className="studyLinkHeading"><Link2 aria-hidden="true"/><div><h2 id="studyLinkTitle">Link belajar untuk {studentName}</h2><p>Anak terus masuk ke profil sendiri. Akaun dan laporan ibu bapa kekal berasingan.</p></div></div>
    <div className="studyLinkForm"><label>Tempoh sesi<select value={duration} disabled={busy} onChange={(event) => setDuration(Number(event.target.value))}>{[15, 30, 45, 60, 90, 120, 180].map((minutes) => <option value={minutes} key={minutes}>{minutes} minit</option>)}</select></label><button className="primary" disabled={busy} onClick={() => void generate()}><Link2/>{busy ? "Memproses..." : "Jana link belajar"}</button></div>
    <p className="studyLinkNote">Sesi tamat selepas {duration} minit dari waktu link dibuka. Keluar awal perlu kelulusan ibu bapa. Buka ruangan ini di peranti ibu bapa untuk meluluskan permintaan.</p>
    {created && <div className="createdStudyLink"><label>Link sekali guna<input aria-label="Link belajar anak" readOnly value={created.url} onFocus={(event) => event.currentTarget.select()}/></label><button className="miniButton" onClick={copyLink}><Copy/>Salin link</button><small>Gunakan sebelum {dateTime(created.expiresAt)}. Sesi ini hanya untuk {studentName}.</small></div>}
    {notice && <p className="studyLinkNotice" role="status"><Check/>{notice}</p>}
    {error && <p className="studyLinkError" role="alert">{error}</p>}
    <div className="studySessionsHeading"><h3>Sesi anak</h3><button className="miniButton" disabled={busy} onClick={() => void refresh()} aria-label="Muat semula sesi"><RefreshCw/>Muat semula</button></div>
    {!loaded && !error && <p role="status">Memuatkan link dan sesi...</p>}
    {loaded && activeSessions.length === 0 && <p className="studyLinkEmpty">Belum ada sesi aktif. Sesi bermula apabila anak membuka link.</p>}
    {activeSessions.map((session) => <article key={session.id} className={"studySessionRow " + (session.status === "exit_requested" ? "needsApproval" : "")}><div><strong>{sessionLabels[session.status]}</strong><span>Sesi {session.id.slice(0, 8)} · Tamat {dateTime(session.endsAt)}</span></div>{confirmEnd === session.id ? <div className="studySessionConfirm"><p>Tamatkan sesi {studentName} sekarang?</p><button className="primary" disabled={busy} onClick={() => void approve(session.id)}>Sahkan tamat sesi</button><button className="miniButton" disabled={busy} onClick={() => setConfirmEnd(null)}>Batal</button></div> : <button className="miniButton" disabled={busy} onClick={() => setConfirmEnd(session.id)}>{session.status === "exit_requested" ? "Luluskan keluar" : "Tamatkan sesi"}</button>}</article>)}
    <details className="studyLinkHistory"><summary>Link menunggu digunakan ({pendingLinks.length})</summary>{pendingLinks.length ? pendingLinks.map((link) => <div className="studySessionRow" key={link.id}><div><strong>Link {link.id.slice(0, 8)}</strong><span>Tamat {dateTime(link.expiresAt)}</span></div><button className="miniButton" disabled={busy} onClick={() => void revoke(link.id)}>Batalkan link</button></div>) : <p className="studyLinkEmpty">Tiada link menunggu digunakan.</p>}</details>
    <DeviceSetupGuide/>
  </section>;
}
