import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { feedbackApi, type AdminFeedbackTriage } from "../lib/feedbackApi";
import "./AdminFeedbackTriage.css";
type Status = AdminFeedbackTriage["status"];
const statuses: { id: Status | "all"; label: string }[] = [
  {id:"open",label:"Baharu"}, {id:"in_review",label:"Dalam semakan"},
  {id:"resolved",label:"Selesai"}, {id:"all",label:"Semua"},
];
const statusLabels: Record<Status,string> = { open:"Baharu",in_review:"Dalam semakan",resolved:"Selesai" };

export function FeedbackTriageList({ items, onReview, busy }: {
  items: AdminFeedbackTriage[];
  busy: string;
  onReview: (item: AdminFeedbackTriage, status: Status, note: string) => void;
}) {
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [chosen,setChosen] = useState<Record<string,Status>>({});
  if (!items.length) return <p className="adminTriageEmpty">Tiada laporan masalah sepadan dengan penapis ini.</p>;
  return <div className="adminTriageList">{items.map(item => {
    const status=chosen[item.id] ?? item.status;
    const note=notes[item.id] ?? item.note ?? "";
    return <article key={item.id}>
      <div className="adminTriageMeta"><strong>{item.referenceId}</strong><span className={`adminTriageStatus ${item.status}`}>{statusLabels[item.status]}</span></div>
      <p className="adminTriageMessage">{item.message}</p>
      <small>Diterima: {new Date(item.createdAt).toLocaleString("ms-MY",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</small>
      <div className="adminTriageReview">
        <label>Status<select aria-label={`Status ${item.referenceId}`} value={status} disabled={Boolean(busy)} onChange={event => setChosen(current=>({...current,[item.id]:event.target.value as Status}))}>
          {statuses.filter(v=>v.id!=="all").map(v=><option value={v.id} key={v.id}>{v.label}</option>)}
        </select></label>
        <label>Nota dalaman<textarea aria-label={`Nota ${item.referenceId}`} maxLength={500} rows={2} disabled={Boolean(busy)} placeholder="Tindakan yang diambil (wajib jika diselesaikan)" value={note} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))}/></label>
        <button type="button" className="miniButton" disabled={Boolean(busy)||status==="resolved"&&note.trim().length<5} onClick={()=>onReview(item,status,note.trim())}><ClipboardCheck aria-hidden="true"/>{busy===item.id?"Menyimpan...":"Simpan semakan"}</button>
      </div>
    </article>;
  })}</div>;
}

export function AdminFeedbackTriage() {
  const [filter,setFilter] = useState<Status | "all">("open");
  const [items,setItems] = useState<AdminFeedbackTriage[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");setItems([]);
    void feedbackApi.listFeedbackTriage(filter==="all"?undefined:filter,controller.signal)
      .then(result=>{if(!controller.signal.aborted)setItems(result.feedback);})
      .catch(()=>{if(!controller.signal.aborted)setError("Senarai laporan masalah belum dapat dimuatkan.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[filter,refresh]);
  const onReview = async (item:AdminFeedbackTriage,status:Status,note:string) => {
    if (busy) return;
    setBusy(item.id);setError("");setNotice("");
    try {
      await feedbackApi.reviewProblem(item.id,status,item.version,note || undefined);
      setNotice("Status laporan disimpan dalam audit log. Tiada mesej dihantar secara automatik kepada ibu bapa.");
      setRefresh(n=>n+1);
    } catch {
      setError("Status gagal dikemas kini; rekod mungkin sudah diubah pentadbir lain. Muat semula dan cuba lagi.");
    } finally {setBusy("");}
  };
  return <section className="adminFeedbackTriage" id="admin-feedback-triage" aria-labelledby="admin-feedback-triage-title" aria-busy={loading}>
    <div className="adminTriageHead"><div><span className="adminFeedbackEyebrow"><ShieldAlert aria-hidden="true"/> Moderation</span>
      <h2 id="admin-feedback-triage-title">Laporan masalah · Tindakan admin</h2>
      <p>Status dan nota semakan bersifat dalaman. Tiada fungsi balasan mesej atau notifikasi automatik.</p>
    </div><button type="button" className="miniButton" disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RefreshCw aria-hidden="true"/> Muat semula</button></div>
    <div className="adminTriageFilters" role="group" aria-label="Tapis status laporan">{statuses.map(entry=>
      <button type="button" key={entry.id} aria-pressed={filter===entry.id} onClick={()=>setFilter(entry.id)}>{entry.label}</button>)}</div>
    {loading && <p role="status">Memuatkan laporan masalah...</p>}
    {error && <p role="alert" className="adminFeedbackError">{error}</p>}
    {notice && <p role="status" className="adminTeacherNotice">{notice}</p>}
    {!loading&&!error&&<FeedbackTriageList items={items} busy={busy} onReview={(item,status,note)=>void onReview(item,status,note)}/>}
  </section>;
}
