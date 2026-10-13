import { useState } from "react";
import { GraduationCap, UsersRound } from "lucide-react";
import { switchAccountRole, type AccountUser } from "../lib/api";

export function AccountRoleSwitcher({ account, onSwitched }: { account: AccountUser; onSwitched: (user: AccountUser) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const target = account.role === "teacher" ? "parent" : "teacher";
  if (!account.roles?.includes("parent") || !account.roles.includes("teacher") || !["parent","teacher"].includes(account.role)) return null;
  const change = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { onSwitched(await switchAccountRole(target)); }
    catch { setError("Ruang belum dapat ditukar. Sesi semasa masih kekal."); }
    finally { setBusy(false); }
  };
  return <div className="roleSwitcher">
    <button type="button" className="miniButton" onClick={() => void change()} disabled={busy}>
      {target === "teacher" ? <GraduationCap aria-hidden="true" /> : <UsersRound aria-hidden="true" />}
      {busy ? "Bertukar ruang..." : target === "teacher" ? "Buka ruang guru" : "Buka ruang ibu bapa"}
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
