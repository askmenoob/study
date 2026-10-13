import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clock3, Maximize2, ShieldCheck } from "lucide-react";
import { getFocusSession, requestFocusExit, type FocusSession } from "../lib/api";
import { isSessionEnded, remainingSessionTime, sessionEndMessage } from "../lib/studySession";

type Props = { sessionId?: string; onEnded: (message: string) => void; children: ReactNode };
export function StudySessionGate({ sessionId, onEnded, children }: Props) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const refresh = useRef<() => Promise<void>>(async () => {});
  const sequence = useRef(0);
  const requesting = useRef(false);
  const endedHandler = useRef(onEnded);
  endedHandler.current = onEnded;

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    let fetching = false;
    setSession(null); setError("");
    const check = async () => {
      if (fetching || requesting.current || !alive) return;
      fetching = true;
      const request = ++sequence.current;
      try {
        const result = await getFocusSession();
        if (!alive || request !== sequence.current) return;
        if (result.session.id !== sessionId) throw new Error("NO_FOCUS_SESSION");
        if (isSessionEnded(result.session.status)) { endedHandler.current(sessionEndMessage(result.session.status)); return; }
        setSession(result.session); setError("");
      } catch (error) {
        if (!alive || request !== sequence.current) return;
        const code = error instanceof Error ? error.message : "";
        if (["UNAUTHORIZED", "SESSION_ENDED", "STUDENT_NOT_FOUND", "FOCUS_SESSION_NOT_FOUND", "NO_FOCUS_SESSION"].includes(code)) {
          endedHandler.current("Sesi ini tidak lagi tersedia. Minta link baharu daripada ibu bapa."); return;
        }
        setError("Sambungan sesi terputus. Pembelajaran dijeda sehingga status sesi dapat disahkan. Pengesahan keluar masih diperlukan.");
      } finally { fetching = false; }
    };
    refresh.current = check;
    const visibleCheck = () => { if (document.visibilityState === "visible") void check(); };
    const poll = window.setInterval(visibleCheck, 5000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    document.addEventListener("visibilitychange", visibleCheck);
    window.addEventListener("online", visibleCheck);
    void check();
    return () => { alive = false; ++sequence.current; clearInterval(poll); clearInterval(clock); document.removeEventListener("visibilitychange", visibleCheck); window.removeEventListener("online", visibleCheck); };
  }, [sessionId]);

  const askToExit = async () => {
    if (requesting.current || !sessionId) return;
    requesting.current = true; setBusy(true);
    const request = ++sequence.current;
    try {
      const result = await requestFocusExit();
      if (request !== sequence.current) return;
      if (isSessionEnded(result.session.status)) endedHandler.current(sessionEndMessage(result.session.status));
      else { setSession(result.session); setError(""); }
    } catch {
      if (request === sequence.current) setError("Permintaan keluar belum dapat disahkan. Semak sambungan dan cuba semula.");
    } finally { requesting.current = false; setBusy(false); }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else throw new Error("UNSUPPORTED");
      setFullscreenNotice("");
    } catch { setFullscreenNotice("Paparan penuh tidak disokong atau tidak dibenarkan pada peranti ini."); }
  };

  if (!sessionId) return <>{children}</>;
  return <div className="focusStudyShell">
    <section className="focusSessionBanner" aria-label="Sesi belajar">
      <div className="focusSessionTitle"><ShieldCheck aria-hidden="true"/><div><strong>Sesi belajar {session?.status === "exit_requested" ? "· Menunggu ibu bapa" : "aktif"}</strong><span><Clock3 aria-hidden="true"/> {session ? remainingSessionTime(session.endsAt, now) : "Menyemak sesi"} {session && "berbaki"}</span></div></div>
      <div className="focusSessionActions">
        <button className="miniButton" onClick={() => void fullscreen()}><Maximize2/>Paparan penuh</button>
        <button className="primary" disabled={busy || !session || session.status === "exit_requested"} onClick={() => void askToExit()}>{busy ? "Menghantar..." : session?.status === "exit_requested" ? "Permintaan dihantar" : "Minta keluar"}</button>
      </div>
      <p className="focusSessionLimit">Study tidak dapat mengesahkan lock peranti. Sekatan aplikasi lain bergantung pada tetapan peranti.</p>
      {session?.status === "exit_requested" && <p className="focusSessionWaiting" role="status">Teruskan belajar sementara menunggu. Ibu bapa perlu log masuk di peranti mereka untuk meluluskan permintaan keluar.</p>}
      {session && Date.parse(session.endsAt) <= now && <p className="focusSessionWaiting">Tempoh belajar selesai. Menunggu pengesahan status daripada server.</p>}
      {fullscreenNotice && <p role="status">{fullscreenNotice}</p>}
    </section>
    {error ? <main className="sessionMessage"><h1>Sesi dijeda</h1><p role="alert">{error}</p><button className="primary" onClick={() => void refresh.current()}>Cuba sambung semula</button></main> :
      session ? children : <main className="sessionMessage" role="status"><h1>Menyemak sesi belajar...</h1><p>Sebentar, saya sedang menyambungkan profil kamu.</p></main>}
  </div>;
}
