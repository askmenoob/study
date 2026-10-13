import { useEffect, useState } from "react";
import { BadgeCheck, RefreshCw, Send } from "lucide-react";
import { teacherNetworkApi, type TeacherApplication, type TeacherApplicationInput } from "../lib/teacherNetworkApi";
import type { TeacherLevelId } from "../lib/teacherContentApi";

const levelIds: TeacherLevelId[] = ["d1","d2","d3","d4","d5","d6"];
const subjects = [{id:"bm",name:"Bahasa Melayu"},{id:"en",name:"English"},{id:"math",name:"Matematik"},{id:"science",name:"Sains"},{id:"history",name:"Sejarah"},{id:"islam",name:"Pendidikan Islam"},{id:"moral",name:"Pendidikan Moral"}];
const statusLabel: Record<string,string> = { pending:"Dalam semakan",needs_info:"Perlu maklumat",approved:"Diluluskan",rejected:"Ditolak",withdrawn:"Ditarik balik" };

export function TeacherApplicationPanel({ defaultName = "", onApproved }: { defaultName?: string; onApproved?: () => void }) {
  const [application,setApplication]=useState<TeacherApplication|null>(null); const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [refresh,setRefresh]=useState(0);
  const year = new Date().getFullYear();
  const [form,setForm]=useState<TeacherApplicationInput>({ fullName:defaultName,publicName:defaultName,schoolName:"",state:"",district:"",positionTitle:"Guru",academicYear:year,levelIds:["d1"],subjectIds:["bm"],identityAttested:false,termsAttested:false });

  useEffect(()=>{ let alive=true; const controller=new AbortController(); setError("");
    void teacherNetworkApi.getApplication(controller.signal).then(result=>{ if(!alive)return; setApplication(result.application); setLoaded(true);
      if(result.application?.status==="approved") onApproved?.();
      if(result.application?.status==="needs_info") { const item=result.application; setForm({
        fullName:item.fullName,publicName:item.publicName,schoolName:item.schoolName,state:item.state,district:item.district,
        positionTitle:item.positionTitle,academicYear:item.academicYear,levelIds:item.levelIds,subjectIds:item.subjectIds,
        identityAttested:false,termsAttested:false,
      }); }
    }).catch(()=>{ if(alive){setLoaded(true);setError("Status permohonan belum dapat dimuatkan.");} }); return()=>{alive=false;controller.abort();};
  },[refresh]);
  const toggle=(key:"levelIds"|"subjectIds",value:string)=>setForm(current=>{ const items=current[key] as string[]; const next=items.includes(value)?items.filter(item=>item!==value):[...items,value]; return {...current,[key]:next}; });
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(busy||!form.levelIds.length||!form.subjectIds.length)return;setBusy(true);setError("");try{setApplication((await teacherNetworkApi.submitApplication(form)).application);}catch{setError("Permohonan belum dapat dihantar. Semak semua maklumat dan cuba lagi.");}finally{setBusy(false);}};

  if(!loaded)return <section><p role="status">Memuatkan status permohonan guru...</p></section>;
  if(application && ["pending","approved"].includes(application.status)) return <section className="teacherApplicationStatus">
    <BadgeCheck aria-hidden="true"/><div><small>Permohonan guru</small><h2>{statusLabel[application.status]}</h2>
    <p>{application.status==="pending"?"Super admin sedang menyemak identiti, sekolah, darjah dan subjek anda. Fungsi kelas kekal dikunci sehingga lulus.":application.teacherStatus==="suspended"?"Akses guru digantung. Ruang ibu bapa dan rekod keluarga anda tidak terjejas.":"Ruang guru sudah tersedia. Tukar ke ruang guru untuk cipta kelas dan menerima murid."}</p>
    <p className="trustNote">Kelulusan IMAI Study bukan pengesahan atau akreditasi rasmi KPM.</p>
    <button type="button" className="miniButton" onClick={()=>setRefresh(value=>value+1)}><RefreshCw aria-hidden="true"/>Semak status</button></div>
  </section>;

  return <section className="teacherApplicationPanel"><div className="head"><div><small>Untuk ibu bapa yang juga guru</small><h2>Mohon ruang guru</h2><p>Tiga bahagian ringkas. Selepas dihantar, super admin akan semak sebelum akses guru dibuka.</p></div></div>
    {application?.reviewNote&&<p className="teacherReviewNote"><strong>{statusLabel[application.status]}:</strong> {application.reviewNote}</p>}
    <form onSubmit={submit}><fieldset disabled={busy}><legend>1. Maklumat diri</legend>
      <label>Nama penuh<input required minLength={2} maxLength={120} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
      <label>Nama yang parent dan murid akan nampak<input required minLength={2} maxLength={80} value={form.publicName} onChange={e=>setForm({...form,publicName:e.target.value})}/></label>
      <label>Jawatan<input required minLength={2} maxLength={100} value={form.positionTitle} onChange={e=>setForm({...form,positionTitle:e.target.value})}/></label>
    </fieldset><fieldset disabled={busy}><legend>2. Sekolah &amp; subjek</legend>
      <label>Nama sekolah<input required minLength={3} maxLength={160} value={form.schoolName} onChange={e=>setForm({...form,schoolName:e.target.value})}/><small>Jika sekolah belum ada dalam sistem, tulis nama rasminya. Super admin akan padankan semasa semakan.</small></label>
      <label>Negeri<input required value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label>
      <label>Daerah / PPD<input required value={form.district} onChange={e=>setForm({...form,district:e.target.value})}/></label>
      <label>Tahun akademik<input type="number" min={year-1} max={year+2} required value={form.academicYear} onChange={e=>setForm({...form,academicYear:Number(e.target.value)})}/></label>
      <div className="choiceGrid"><strong>Darjah yang diajar</strong>{levelIds.map(id=><label key={id}><input type="checkbox" checked={form.levelIds.includes(id)} onChange={()=>toggle("levelIds",id)}/>Darjah {id.slice(1)}</label>)}</div>
      <div className="choiceGrid"><strong>Subjek yang diajar</strong>{subjects.map(item=><label key={item.id}><input type="checkbox" checked={form.subjectIds.includes(item.id)} onChange={()=>toggle("subjectIds",item.id)}/>{item.name}</label>)}</div>
    </fieldset><fieldset disabled={busy}><legend>3. Pengesahan</legend>
      <label className="teacherCheck"><input type="checkbox" required checked={form.identityAttested} onChange={e=>setForm({...form,identityAttested:e.target.checked})}/><span>Saya mengesahkan maklumat ini benar dan saya ialah guru atau pendidik di sekolah yang dinyatakan.</span></label>
      <label className="teacherCheck"><input type="checkbox" required checked={form.termsAttested} onChange={e=>setForm({...form,termsAttested:e.target.checked})}/><span>Saya bersetuju menjaga data murid dan hanya berkongsi bahan yang saya berhak gunakan.</span></label>
      <p className="trustNote">Kami tidak meminta salinan penuh MyKad. Super admin boleh membuat pengesahan sekolah melalui saluran lain sebelum meluluskan.</p>
      {error&&<p role="alert" className="teacherError">{error}</p>}
      <button className="primary" disabled={busy||!form.levelIds.length||!form.subjectIds.length||!form.identityAttested||!form.termsAttested}>{busy?"Menghantar...":"Hantar permohonan"}<Send aria-hidden="true"/></button>
    </fieldset></form>
  </section>;
}
