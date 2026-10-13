import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
import { parsePastedStudyLink } from "../lib/studyLinkInput";
import "./StudyLinkEntry.css";

export function StudyLinkEntry() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const openLink = (event: FormEvent) => {
    event.preventDefault();
    if (opening) return;
    const code = parsePastedStudyLink(value, window.location.origin);
    if (!code) {
      setError("Link tidak sah. Tampal link penuh daripada ibu bapa untuk laman Study ini.");
      return;
    }
    setOpening(true); setError(""); setValue("");
    // App's existing hashchange handler reloads and captures the fragment once.
    window.location.replace("/#join=" + encodeURIComponent(code));
  };
  return <details className="studyLinkEntry">
    <summary><Link2 aria-hidden="true"/>Buka link belajar</summary>
    <form onSubmit={openLink}>
      <p>Ada link daripada ibu bapa? Tampal di sini untuk terus masuk ke profil sendiri, termasuk dalam kiosk tanpa address bar.</p>
      <label htmlFor="childStudyLink">Link belajar daripada ibu bapa</label>
      <input id="childStudyLink" type="text" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }}
        placeholder="https://study.imai.my/#join=..." autoComplete="off" autoCapitalize="none" spellCheck={false}
        maxLength={2048} required disabled={opening} aria-invalid={Boolean(error)} aria-describedby={error ? "childLinkError" : "childLinkHelp"}/>
      {error && <p id="childLinkError" className="authError" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={opening}>{opening ? "Membuka sesi..." : "Mula belajar"}</button>
      <small id="childLinkHelp">Link hanya boleh digunakan sekali. Ibu bapa perlu jana link baharu jika sesi sudah tamat. Sekatan aplikasi lain perlu diaktifkan pada peranti.</small>
    </form>
  </details>;
}
