import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw, UsersRound } from "lucide-react";
import { FeedbackApiError, feedbackApi, type AdminUserSummary } from "../lib/feedbackApi";
import "./AdminUserDirectory.css";

const PAGE_SIZE = 25;
const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tarikh tidak tersedia" : date.toLocaleDateString("ms-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
};

export function AdminUserTable({ users }: { users: AdminUserSummary[] }) {
  if (!users.length) return <div className="adminUsersEmpty"><UsersRound aria-hidden="true" /><p>Belum ada pengguna berdaftar.</p></div>;
  return <div className="adminUsersTableWrap"><table className="adminUsersTable">
    <caption>Senarai email pengguna berdaftar</caption>
    <thead><tr><th scope="col">Email</th><th scope="col">Peranan</th><th scope="col">Tarikh daftar</th></tr></thead>
    <tbody>{users.map((user) => <tr key={user.email}>
      <td data-label="Email"><span className="adminUserEmail">{user.email}</span></td>
      <td data-label="Peranan"><span className={`adminUserRole role-${user.role}`}>{user.role === "super_admin" ? "Super Admin" : user.role === "teacher" ? "Guru" : "Ibu bapa"}</span></td>
      <td data-label="Tarikh daftar"><time dateTime={user.createdAt}>{displayDate(user.createdAt)}</time></td>
    </tr>)}</tbody>
  </table></div>;
}

type DirectoryViewProps = {
  users: AdminUserSummary[];
  total: number | null;
  nextCursor: string | null;
  busy: boolean;
  error: string;
  canRetry: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
};

export function AdminUserDirectoryView({ users, total, nextCursor, busy, error, canRetry, onRefresh, onRetry, onLoadMore }: DirectoryViewProps) {
  return <section className="adminUsersSection" aria-labelledby="admin-users-heading" aria-busy={busy}>
    <div className="adminUsersHeading"><div><span className="adminFeedbackEyebrow">Pengurusan akaun</span><h2 id="admin-users-heading">Pengguna berdaftar</h2><p>Alamat email penuh hanya tersedia kepada super admin.</p></div><div className="adminUsersActions"><strong>{total === null ? "…" : `${total} akaun`}</strong><button type="button" className="miniButton" disabled={busy} onClick={onRefresh}><RefreshCw aria-hidden="true" />Muat semula</button></div></div>
    {busy && <p className="adminFeedbackLoading" role="status">{users.length ? "Memuatkan pengguna seterusnya..." : "Memuatkan pengguna..."}</p>}
    {error && <div className="adminFeedbackError" role="alert"><p>{error}</p>{canRetry && <button type="button" className="miniButton" disabled={busy} onClick={onRetry}>Cuba lagi</button>}</div>}
    {users.length > 0 && <AdminUserTable users={users} />}
    {!busy && !error && users.length === 0 && <AdminUserTable users={[]} />}
    {nextCursor && <div className="adminUsersPager"><span>Menunjukkan {users.length} daripada {total ?? users.length}</span><button type="button" className="miniButton" disabled={busy || Boolean(error)} onClick={onLoadMore}>{busy ? "Memuatkan..." : "Tunjuk lagi"}<ChevronDown aria-hidden="true" /></button></div>}
  </section>;
}

export function AdminUserDirectory() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [requestCursor, setRequestCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true); setError(""); setCanRetry(true);
    void feedbackApi.listAdminUsers(PAGE_SIZE, requestCursor, controller.signal).then((result) => {
      if (!alive) return;
      setUsers((current) => requestCursor ? [...current, ...result.users] : result.users);
      setTotal(result.total); setNextCursor(result.nextCursor);
    }).catch((caught: unknown) => {
      if (!alive) return;
      const authBlocked = caught instanceof FeedbackApiError && [401, 403].includes(caught.status);
      setCanRetry(!authBlocked);
      setError(authBlocked ? "Sesi super admin telah tamat atau tidak dibenarkan. Log keluar dan masuk semula."
        : "Senarai pengguna belum dapat dimuatkan. Semak sambungan dan cuba semula.");
    }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; controller.abort(); };
  }, [requestCursor, refresh]);

  return <AdminUserDirectoryView
    users={users} total={total} nextCursor={nextCursor} busy={busy} error={error} canRetry={canRetry}
    onRefresh={() => { setRequestCursor(undefined); setRefresh((value) => value + 1); }}
    onRetry={() => setRefresh((value) => value + 1)}
    onLoadMore={() => { if (nextCursor) setRequestCursor(nextCursor); }}
  />;
}
