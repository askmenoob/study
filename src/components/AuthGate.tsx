import { StudyFooter } from "./StudyFooter";
import { useEffect, useId, useState } from "react";
import { StudyLinkEntry } from "./StudyLinkEntry";
import { PwaInstall } from "./PwaInstall";
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, UsersRound, Eye, EyeOff } from "lucide-react";
import { loginAccount, registerAccount, type AccountUser } from "../lib/api";
import { hasPreviewAccess, loginPreview } from "../lib/previewAccess";
import "./AuthGate.css";
import { FocusBrand } from "./FocusDashboard";

type Props = { onAuthenticated: (user: AccountUser) => void };

export function AuthGate({ onAuthenticated }: Props) {
  const passwordId = useId();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let disposed = false;
    void hasPreviewAccess().then(enabled => { if (!disposed) setPreviewEnabled(enabled); });
    return () => { disposed = true; };
  }, []);

  const enterPreview = async () => {
    if (busy) return;
    setBusy(true); setError(""); setPreviewError("");
    try { onAuthenticated(await loginPreview()); }
    catch (err) {
      setPreviewError(err instanceof Error && err.message === "RATE_LIMITED"
        ? "Terlalu banyak percubaan. Tunggu sebentar sebelum masuk semula."
        : "Demo belum dapat dibuka. Pastikan server preview masih berjalan, kemudian cuba lagi.");
    } finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(""); setPreviewError(""); setBusy(true);
    try {
      const user = mode === "login"
        ? await loginAccount(email, password, rememberMe)
        : await registerAccount(email, password, displayName);
      onAuthenticated(user);
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      setError(code === "EMAIL_EXISTS" ? "Email ini sudah mempunyai akaun." :
        code === "INVALID_CREDENTIALS" ? "Email atau kata laluan tidak tepat." :
        "Tidak dapat log masuk. Semak maklumat dan cuba lagi.");
    } finally { setBusy(false); }
  };
  return <><main className="authShell">
    <section className="authIntro">
      <div className="authBrand"><FocusBrand/></div>
      <h1>Sedikit demi sedikit.<br/><em>Perubahan besar.</em></h1>
      <p>Bantu anak belajar mengikut tahap mereka. Ikuti setiap langkah kemajuan dalam satu akaun keluarga.</p>
      <div className="authIllustration"><img src="/focus-books.webp" alt="" width="400" height="300"/><span>KSSR · KSSM · SPM · STPM</span></div>
      <div className="authBenefits">
        <span><BookOpen aria-hidden="true"/> Latihan mengikut tahap</span>
        <span><UsersRound aria-hidden="true"/> Profil sendiri untuk setiap anak</span>
        <span><ChartNoAxesColumnIncreasing aria-hidden="true"/> Kemajuan yang mudah diikuti</span>
      </div>
    </section>
    <div className="authAccess">
    <form className="authCard" onSubmit={submit}>
      <small>{mode === "login" ? "Selamat kembali" : "Mulakan akaun"}</small>
      <h2>{mode === "login" ? "Log masuk" : "Daftar akaun"}</h2>
      <p className="authFormIntro">{mode === "login" ? "Masuk ke ruang IMAI Study anda." : "Satu akaun boleh digunakan sebagai ibu bapa dan, selepas permohonan diluluskan, sebagai guru."}</p>
      {mode === "register" && <label>Nama penuh
        <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Nama anda"/>
      </label>}
      <label>Email
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com"/>
      </label>
      <div className="authPasswordGroup"><label htmlFor={passwordId}>Kata laluan</label>
        <div className="authPasswordField"><input id={passwordId} type={passwordVisible ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-describedby={mode === "register" ? "authPasswordHelp" : undefined}/><button type="button" className="authPasswordToggle" aria-label={passwordVisible ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"} aria-pressed={passwordVisible} onClick={()=>setPasswordVisible(value=>!value)}>{passwordVisible?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}</button></div>
      </div>
      {mode === "register" && <small id="authPasswordHelp" className="authPasswordHelp">Gunakan sekurang-kurangnya 8 aksara.</small>}
      {mode === "login" && <label className="authRemember">
        <input type="checkbox" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)} />
        <span>Remember me</span>
      </label>}
      {error && <p className="authError" role="alert">{error}</p>}
      <button className="primary authSubmit" disabled={busy} type="submit">
        {busy ? "Memproses..." : mode === "login" ? "Log masuk" : "Daftar & teruskan"}<ArrowRight aria-hidden="true"/>
      </button>
      <button className="authSwitch" type="button" disabled={busy} onClick={()=>{setMode(mode === "login" ? "register" : "login"); setError("")}}>
        {mode === "login" ? "Belum ada akaun? Daftar" : "Sudah ada akaun? Log masuk"}
      </button>
      <p className="authNote">Daftar dahulu sebagai ibu bapa. Jika anda guru, buka Tetapan dan hantar permohonan ringkas untuk semakan super admin.</p>
    </form>
    <StudyLinkEntry/>
    {previewEnabled && <section className="previewAccess" aria-labelledby="previewAccessTitle">
      <span className="authEyebrow">Persekitaran preview</span>
      <h2 id="previewAccessTitle">Cuba ulang kaji UASA & SPM</h2>
      <p>Preview ini menggunakan akaun dan data contoh berasingan. Akaun study.imai.my tidak disalin ke sini. Anda tidak perlu mengisi email atau kata laluan untuk mencuba.</p>
      {previewError && <p className="authError" role="alert">{previewError}</p>}
      <button type="button" className="primary" onClick={() => void enterPreview()} disabled={busy}>
        {busy ? "Memproses..." : "Masuk demo preview"}
      </button>
    </section>}
    <PwaInstall/>
    </div>
  </main><StudyFooter/></>;
}
