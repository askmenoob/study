import { useState } from "react";
import { tuitionRequest } from "../lib/tuitionApi";
import "./TuitionSchedule.css";
export function TuitionSafetyReport({teacherId}:{teacherId:string}){
  const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[receipt,setReceipt]=useState(""),[key,setKey]=useState(()=>crypto.randomUUID());
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError("");try{const result=await tuitionRequest<{feedback:{referenceId:string}}>("/feedback",{method:"POST",body:JSON.stringify({clientRequestId:key,category:"problem",message:`Laporan keselamatan guru ${teacherId}: ${message.trim()}`,pagePath:`/tuition/teacher/${teacherId}`,allowReply:false})});setReceipt(result.feedback.referenceId);setMessage("");setKey(crypto.randomUUID());}catch{setError("Laporan belum dapat disimpan. Cuba semula menggunakan borang yang sama.");}finally{setBusy(false);}};
  return <section className="tuitionSchedule" aria-label="Laporan keselamatan guru"><h2>Keselamatan kelas</h2><p>Laporan dihantar ke queue dalaman pentadbir IMAI untuk semakan. Maklumat ini tidak diterbitkan dalam direktori.</p><button type="button" className="miniButton" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Laporkan kebimbangan keselamatan</button>
    {open&&<form onSubmit={submit}><label>Perkara yang perlu disemak<textarea required minLength={10} maxLength={1800} rows={4} value={message} onChange={e=>{setMessage(e.target.value);setKey(crypto.randomUUID());}} disabled={busy}/></label><p>Nyatakan kejadian dan masa. Jangan masukkan nama penuh anak, telefon, alamat atau dokumen pengenalan.</p><button type="submit" className="primary" disabled={busy||message.trim().length<10}>{busy?"Menyimpan...":"Hantar laporan kepada admin"}</button></form>}
    {error&&<p role="alert">{error}</p>}{receipt&&<p role="status">Laporan direkodkan. Rujukan: {receipt}</p>}
  </section>;
}
