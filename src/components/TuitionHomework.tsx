import { useEffect,useState } from "react";
import type { TeacherClass } from "../lib/teacherNetworkApi";
import { tuitionRequest,malaysiaTime,malaysiaInputToIso } from "../lib/tuitionApi";
import "./TuitionSchedule.css";
type Homework={id:string;title:string;instructions:string;rubric:string;dueAt:string;className:string;teacherName:string;levelId:string;subjectId:string;version?:number;answer?:string;score?:number|null;feedback?:string|null;submittedAt?:string};
type Submission={id:string;student_name:string;answer:string;version:number;score:number|null;feedback:string|null};
const learningError=(error:unknown)=>error instanceof Error&&error.message==="VERSION_CONFLICT"?"Jawapan atau semakan telah berubah. Muat semula sebelum menghantar lagi.":"Tindakan belum berjaya. Semak akses kelas dan cuba semula.";

export function FamilyHomeworkPanel({studentId,canSubmit}:{studentId:string;canSubmit:boolean}) {
  const [items,setItems]=useState<Homework[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setItems([]);setError("");void tuitionRequest<{homework:Homework[]}>(`/tuition/students/${studentId}/homework`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItems(data.homework);}).catch(()=>{if(!controller.signal.aborted)setError("Tugasan belum dapat dimuatkan.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[studentId,refresh]);
  return <section className="tuitionSchedule" aria-label="Tugasan guru"><h2>Tugasan guru</h2>{loading&&<p role="status">Memuatkan tugasan...</p>}{error&&<p role="alert">{error}</p>}
    {!loading&&!error&&!items.length&&<p>Belum ada tugasan untuk kelas kamu.</p>}
    {items.map(item=><HomeworkAnswer key={`${studentId}:${item.id}`} item={item} studentId={studentId} canSubmit={canSubmit} onChanged={()=>setRefresh(n=>n+1)}/>)}
    <button type="button" className="miniButton" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Muat semula tugasan</button>
  </section>;
}
function HomeworkAnswer({item,studentId,canSubmit,onChanged}:{item:Homework;studentId:string;canSubmit:boolean;onChanged:()=>void}) {
  const [answer,setAnswer]=useState(item.answer??""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>setAnswer(item.answer??""),[item.answer]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError("");try{await tuitionRequest(`/tuition/students/${studentId}/homework/${item.id}/submission`,{method:"PUT",body:JSON.stringify({answer,expectedVersion:item.version??0})});onChanged();}catch(caught){setError(learningError(caught));}finally{setBusy(false);}};
  return <article><h3>{item.title}</h3><p>{item.className} · {item.teacherName} · Tarikh akhir {malaysiaTime(item.dueAt)}</p>
    <p style={{whiteSpace:"pre-wrap"}}>{item.instructions}</p><p><strong>Rubrik:</strong> {item.rubric}</p>
    {item.submittedAt&&<p>Jawapan dihantar: {malaysiaTime(item.submittedAt)}</p>}
    {item.score!==null&&item.score!==undefined&&<p>Markah guru: {item.score}/100</p>}{item.feedback&&<p><strong>Maklum balas:</strong> {item.feedback}</p>}
    {error&&<p role="alert">{error}</p>}
    {canSubmit?<><HomeworkTutor item={item} studentId={studentId}/><form onSubmit={submit}><label>Jawapan kamu<textarea required maxLength={10000} rows={5} value={answer} onChange={e=>setAnswer(e.target.value)} disabled={busy}/></label><button type="submit" className="primary" disabled={busy||!answer.trim()}>{busy?"Menghantar...":item.version?"Hantar semula jawapan":"Hantar jawapan"}</button></form></>
      :item.answer?<p style={{whiteSpace:"pre-wrap"}}><strong>Jawapan anak:</strong> {item.answer}</p>:<p>Jawapan belum dihantar.</p>}
  </article>;
}
function HomeworkTutor({item,studentId}:{item:Homework;studentId:string}) {
  const [question,setQuestion]=useState(""),[answer,setAnswer]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [conversationId]=useState(()=>crypto.randomUUID());
  const ask=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError("");try{const result=await tuitionRequest<{answer:string;notice?:string}>("/tutor",{method:"POST",body:JSON.stringify({studentId,levelId:item.levelId,subjectId:item.subjectId,homeworkId:item.id,conversationId,message:question})});setAnswer(result.answer);setNotice(result.notice??"");}catch{setError("Bantuan belum tersedia. Baca arahan guru dan cuba lagi.");}finally{setBusy(false);}};
  return <div><h4>Bantuan AI Tutor</h4><p>Nyatakan langkah yang kamu sudah cuba. Jangan masukkan nama, telefon atau maklumat peribadi.</p><form onSubmit={ask}><label>Soalan tentang tugasan<input maxLength={1200} required value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy}/></label><button type="submit" className="miniButton" disabled={busy||!question.trim()}>{busy?"Memproses...":"Bantu langkah demi langkah"}</button></form>{error&&<p role="alert">{error}</p>}{answer&&<p style={{whiteSpace:"pre-wrap"}}>{answer}</p>}{notice&&<p>{notice}</p>}</div>;
}
type Report={attendance:{present:number;absent:number;excused:number};weekly:Array<{week:string;attempts:number;correct:number;questions:number}>;practiceTopicsToReview:Array<{subjectId:string;topicId:string;attempts:number;correct:number;questions:number}>;homework:{submitted:number;reviewed:number;meanScore:string|null};notice:string};
export function TuitionProgressReport({studentId}:{studentId:string}){
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();setReport(null);setError("");void tuitionRequest<{report:Report}>(`/tuition/students/${studentId}/progress`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setReport(data.report);}).catch(()=>{if(!controller.signal.aborted)setError("Laporan belum dapat dimuatkan.");});return()=>controller.abort();},[studentId]);
 return <section className="tuitionSchedule"><h2>Laporan perkembangan</h2>{error?<p role="alert">{error}</p>:!report?<p role="status">Memuatkan laporan...</p>:<><p>Kehadiran direkodkan: {report.attendance.present} hadir · {report.attendance.absent} tidak hadir · {report.attendance.excused} berizin</p><p>Tugasan: {report.homework.submitted} dihantar · {report.homework.reviewed} disemak · Purata markah guru: {report.homework.meanScore??"Belum tersedia"}</p><h3>Latihan mengikut minggu</h3>{!report.weekly.length?<p>Belum ada latihan dalam 8 minggu terkini.</p>:<ul>{report.weekly.map(w=><li key={w.week}>Minggu {w.week}: {w.attempts} latihan · {w.correct}/{w.questions} soalan betul</li>)}</ul>}<h3>Topik untuk ulang kaji</h3>{!report.practiceTopicsToReview.length?<p>Belum ada topik dengan bukti latihan yang cukup untuk cadangan ini.</p>:<ul>{report.practiceTopicsToReview.map(t=><li key={`${t.subjectId}:${t.topicId}`}>{t.subjectId.toUpperCase()} · {t.topicId} · {t.correct}/{t.questions} ({t.attempts} latihan)</li>)}</ul>}<p>{report.notice}</p></>}</section>;
}
export function TeacherHomeworkPanel({classes}:{classes:TeacherClass[]}) {
  const [items,setItems]=useState<Homework[]>([]),[refresh,setRefresh]=useState(0),[classId,setClassId]=useState(""),[title,setTitle]=useState(""),[instructions,setInstructions]=useState(""),[rubric,setRubric]=useState(""),[due,setDue]=useState("");
  const [privacy,setPrivacy]=useState(false);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID()),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();void tuitionRequest<{homework:Homework[]}>("/teacher/tuition/homework",{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItems(data.homework);}).catch(()=>{if(!controller.signal.aborted)setError("Tugasan belum dapat dimuatkan.");});return()=>controller.abort();},[refresh]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy||!privacy)return;setBusy(true);setError("");try{await tuitionRequest("/teacher/tuition/homework",{method:"POST",body:JSON.stringify({classId,title,instructions,rubric,dueAt:malaysiaInputToIso(due),clientRequestId:requestId,privacyAttested:true})});setTitle("");setInstructions("");setRubric("");setDue("");setPrivacy(false);setRequestId(crypto.randomUUID());setRefresh(n=>n+1);}catch(caught){setError(learningError(caught));}finally{setBusy(false);}};
  return <section className="tuitionSchedule"><h2>Tugasan &amp; semakan</h2>{error&&<p role="alert">{error}</p>}
    <form onSubmit={submit}><label>Kelas<select aria-label="Kelas" required value={classId} onChange={e=>{setClassId(e.target.value);setRequestId(crypto.randomUUID());}} disabled={busy}><option value="">Pilih kelas</option>{classes.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Tajuk<input required minLength={3} maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setRequestId(crypto.randomUUID());}} disabled={busy}/></label>
      <label>Arahan<textarea required minLength={10} maxLength={10000} rows={5} value={instructions} onChange={e=>{setInstructions(e.target.value);setRequestId(crypto.randomUUID());}} disabled={busy}/></label>
      <label>Rubrik (jumlah 100 markah)<textarea required minLength={3} maxLength={2000} rows={3} value={rubric} onChange={e=>{setRubric(e.target.value);setRequestId(crypto.randomUUID());}} disabled={busy}/></label>
      <label>Tarikh akhir (Malaysia)<input type="datetime-local" required value={due} onChange={e=>{setDue(e.target.value);setRequestId(crypto.randomUUID());}} disabled={busy}/></label><label className="tuitionConsent"><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)} disabled={busy}/><span>Tugasan dan rubrik tidak mengandungi maklumat peribadi murid.</span></label><button className="primary" disabled={busy||!classId||!privacy}>{busy?"Menyimpan...":"Beri tugasan"}</button></form>
    {items.map(item=><TeacherHomeworkReview key={item.id} item={item}/>)}
  </section>;
}
function TeacherHomeworkReview({item}:{item:Homework}) {
  const [expanded,setExpanded]=useState(false),[submissions,setSubmissions]=useState<Submission[]>([]),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
  useEffect(()=>{if(!expanded)return;const controller=new AbortController();setError("");void tuitionRequest<{submissions:Submission[]}>(`/teacher/tuition/homework/${item.id}/submissions`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setSubmissions(data.submissions);}).catch(()=>{if(!controller.signal.aborted)setError("Jawapan belum dapat dimuatkan.");});return()=>controller.abort();},[item.id,expanded,refresh]);
  return <article><h3>{item.title}</h3><p>{item.className} · {malaysiaTime(item.dueAt)}</p><p>Rubrik: {item.rubric}</p><button type="button" className="miniButton" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>Semak jawapan</button>
    {error&&<p role="alert">{error}</p>}{expanded&&submissions.map(sub=><SubmissionReview key={`${sub.id}:${sub.version}`} submission={sub} onChanged={()=>setRefresh(n=>n+1)}/>)}
    {expanded&&!error&&!submissions.length&&<p>Belum ada jawapan.</p>}
  </article>;
}
function SubmissionReview({submission,onChanged}:{submission:Submission;onChanged:()=>void}) {
  const [score,setScore]=useState(submission.score??0),[feedback,setFeedback]=useState(submission.feedback??""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError("");try{await tuitionRequest(`/teacher/tuition/submissions/${submission.id}`,{method:"PATCH",body:JSON.stringify({score,feedback,expectedVersion:submission.version})});onChanged();}catch(caught){setError(learningError(caught));}finally{setBusy(false);}};
  return <div><h4>{submission.student_name}</h4><p style={{whiteSpace:"pre-wrap"}}>{submission.answer}</p>{error&&<p role="alert">{error}</p>}<form onSubmit={submit}><label>Markah /100<input type="number" min={0} max={100} required value={score} onChange={e=>setScore(Number(e.target.value))} disabled={busy}/></label><label>Maklum balas<textarea required maxLength={5000} value={feedback} onChange={e=>setFeedback(e.target.value)} disabled={busy}/></label><button className="primary" disabled={busy}>{busy?"Menyimpan...":"Simpan semakan"}</button></form></div>;
}
