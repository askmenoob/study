import { useEffect,useState } from "react";
import { tuitionRequest } from "../lib/tuitionApi";
import type { TuitionTeacher } from "../lib/teacherNetworkApi";
import "./TuitionSchedule.css";
export function AdminTuitionDetails({teacherId}:{teacherId:string}) {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [years,setYears]=useState(""),[qualification,setQualification]=useState(""),[note,setNote]=useState("");
  useEffect(()=>{if(!open)return;const controller=new AbortController();setLoading(true);setLoaded(false);setError("");void tuitionRequest<{teacher:TuitionTeacher}>(`/admin/teachers/${teacherId}/tuition-details`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setYears(data.teacher.experienceYears===undefined?"":String(data.teacher.experienceYears));setQualification(data.teacher.qualifications??"");setLoaded(true);}}).catch(()=>{if(!controller.signal.aborted)setError("Maklumat guru belum dapat dimuatkan.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[open,teacherId]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy||loading)return;setBusy(true);setError("");setNotice("");try{await tuitionRequest(`/admin/teachers/${teacherId}/tuition-details`,{method:"PATCH",body:JSON.stringify({experienceYears:years===""?null:Number(years),qualifications:qualification.trim()||null,reviewNote:note.trim()})});setNotice("Maklumat yang disemak diterbitkan dalam profil guru.");setNote("");}catch{setError("Maklumat belum dapat diterbitkan. Semak julat pengalaman, nota dan pastikan tiada maklumat hubungan.");}finally{setBusy(false);}};
  return <div className="tuitionSchedule"><button type="button" className="miniButton" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Semak pengalaman &amp; kelayakan</button>
    {open&&<><p>Terbitkan hanya maklumat yang telah disemak. Kosong bermaksud belum diterbitkan. Jangan masukkan telefon, e-mel atau pautan.</p>{loading&&<p role="status">Memuatkan maklumat...</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {!loading&&loaded&&<form onSubmit={submit}><label>Pengalaman tuisyen (tahun)<input type="number" min={0} max={70} value={years} onChange={e=>setYears(e.target.value)} disabled={busy}/></label>
      <label>Kelayakan disemak<input maxLength={300} value={qualification} onChange={e=>setQualification(e.target.value)} disabled={busy}/></label>
      <label>Kaedah &amp; bukti semakan<textarea required minLength={10} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy}/></label>
      <button className="primary" disabled={busy||note.trim().length<10}>{busy?"Menyimpan...":"Terbitkan maklumat disemak"}</button></form>}</>}
  </div>;
}
