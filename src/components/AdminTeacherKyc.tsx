import { useEffect,useState } from "react";
import { tuitionRequest,malaysiaTime } from "../lib/tuitionApi";
import "./TuitionSchedule.css";
import "./AdminTeacherKyc.css";
type Decision="reviewed"|"needs_info"|"rejected";
type Evidence={version:number;reviewerId:string;decision:Decision;caseReference:string;note:string;identityChecked:boolean;scopeChecked:boolean;safetyChecked:boolean;createdAt:string;matchesApplication:boolean};
type Review={version:number;applicationFingerprint:string;status:Decision|"unreviewed"|"stale";history:Evidence[]};
const labels:Record<Review["status"],string>={unreviewed:"Belum direkodkan",stale:"Permohonan berubah — semak semula",reviewed:"Bukti disemak",needs_info:"Perlu maklumat",rejected:"Bukti ditolak"};
export function AdminTeacherKyc({applicationId,onStatusChange}:{applicationId:string;onStatusChange?:(id:string,ready:boolean)=>void}){
  const [open,setOpen]=useState(false),[refresh,setRefresh]=useState(0),[review,setReview]=useState<Review|null>(null);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [decision,setDecision]=useState<Decision>("needs_info"),[reference,setReference]=useState(""),[note,setNote]=useState("");
  const [identity,setIdentity]=useState(false),[scope,setScope]=useState(false),[safety,setSafety]=useState(false);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  useEffect(()=>{
    if(!open)return;const controller=new AbortController();setLoading(true);setReview(null);setError("");onStatusChange?.(applicationId,false);
    void tuitionRequest<{review:Review}>(`/admin/teacher-applications/${applicationId}/kyc`,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted){setReview(data.review);onStatusChange?.(applicationId,data.review.status==="reviewed");}})
      .catch(()=>{if(!controller.signal.aborted)setError("Rekod bukti belum dapat dimuatkan.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[open,applicationId,refresh,onStatusChange]);
  const changed=()=>{setRequestId(crypto.randomUUID());setNotice("");};
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy||!review)return;setBusy(true);setError("");setNotice("");
    try{
      const result=await tuitionRequest<{review:Review}>(`/admin/teacher-applications/${applicationId}/kyc`,{method:"POST",body:JSON.stringify({expectedVersion:review.version,applicationFingerprint:review.applicationFingerprint,clientRequestId:requestId,decision,caseReference:reference.trim(),note:note.trim(),identityChecked:identity,scopeChecked:scope,safetyChecked:safety})});
      setReview(result.review);onStatusChange?.(applicationId,result.review.status==="reviewed");setRequestId(crypto.randomUUID());setReference("");setNote("");setIdentity(false);setScope(false);setSafety(false);setDecision("needs_info");setNotice("Rekod bukti semakan disimpan. Keputusan akses guru diurus berasingan.");
    }catch(caught){
      const code=caught instanceof Error?caught.message:"";
      if(code==="APPLICATION_CHANGED"){setIdentity(false);setScope(false);setSafety(false);}
      setError(["VERSION_CONFLICT","APPLICATION_CHANGED"].includes(code)?"Rekod atau permohonan telah berubah. Muat semula dan semak bukti sebelum menghantar lagi.":"Rekod belum disimpan. Semak checklist, rujukan dan nota; jangan masukkan maklumat identiti atau hubungan.");
    }finally{setBusy(false);}
  };
  return <div className="tuitionSchedule adminTeacherKyc" role="region" aria-label="Bukti semakan guru"><button type="button" className="miniButton" disabled={busy} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Bukti semakan KYC</button>
    {open&&<><p>Catat semakan melalui saluran yang diluluskan. Gunakan rujukan kes dalaman sahaja; jangan muat naik atau tampal IC, pasport, telefon, e-mel atau pautan dokumen. Rekod ini tidak meluluskan atau mengaktifkan guru.</p>
      {loading&&<p role="status">Memuatkan bukti semakan...</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {!loading&&review&&<><p><strong>Status bukti:</strong> {labels[review.status]} · Versi {review.version}</p>
        <form onSubmit={submit}><label>Keputusan bukti<select aria-label="Keputusan bukti" value={decision} disabled={busy} onChange={e=>{setDecision(e.target.value as Decision);changed();}}><option value="needs_info">Perlu maklumat</option><option value="reviewed">Bukti disemak</option><option value="rejected">Bukti ditolak</option></select></label>
          <label>Rujukan kes dalaman<input required minLength={5} maxLength={64} pattern="[A-Z][A-Z0-9-]+" placeholder="CASE-ABCD" value={reference} disabled={busy} onChange={e=>{setReference(e.target.value.toUpperCase());changed();}}/></label>
          <label>Nota bukti dan kaedah semakan<textarea required minLength={10} maxLength={1000} rows={3} value={note} disabled={busy} onChange={e=>{setNote(e.target.value);changed();}}/></label>
          <label className="tuitionConsent"><input type="checkbox" checked={identity} disabled={busy} onChange={e=>{setIdentity(e.target.checked);changed();}}/><span>Identiti pemohon telah disemak melalui saluran luar sistem.</span></label>
          <label className="tuitionConsent"><input type="checkbox" checked={scope} disabled={busy} onChange={e=>{setScope(e.target.checked);changed();}}/><span>Sekolah, kelayakan dan skop pengajaran disemak.</span></label>
          <label className="tuitionConsent"><input type="checkbox" checked={safety} disabled={busy} onChange={e=>{setSafety(e.target.checked);changed();}}/><span>Penyamaran, akaun pendua dan terma keselamatan disemak.</span></label>
          <button className="primary" disabled={busy||(decision==="reviewed"&&!(identity&&scope&&safety))}>{busy?"Menyimpan...":"Simpan bukti semakan"}</button>
        </form>
        <details><summary>Sejarah bukti semakan (20 terkini)</summary>{review.history.length===0?<p>Belum ada bukti semakan direkodkan.</p>:review.history.map(item=><article key={item.version}><strong>Versi {item.version} · {labels[item.decision]}</strong><p>{item.caseReference} · {malaysiaTime(item.createdAt)}</p><p>Reviewer: {item.reviewerId}</p><p>Checklist: identiti {item.identityChecked?"ya":"belum"} · skop {item.scopeChecked?"ya":"belum"} · keselamatan {item.safetyChecked?"ya":"belum"}</p><p style={{whiteSpace:"pre-wrap"}}>{item.note}</p>{!item.matchesApplication&&<p>Bukti ini berkaitan maklumat permohonan terdahulu.</p>}</article>)}</details>
      </>}
      <button type="button" className="miniButton" disabled={loading||busy} onClick={()=>{setRefresh(n=>n+1);setRequestId(crypto.randomUUID());setNotice("");}}>Muat semula bukti</button>
    </>}
  </div>;
}
