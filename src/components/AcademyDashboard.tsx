import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, ClipboardCheck, Flame, GraduationCap, LibraryBig, ShieldCheck, Users } from "lucide-react";
import type { StudyState } from "../types";
import { getSubjectsForLevel } from "../data/curriculum";
import { subjectMastery } from "../lib/progress";
import { tuitionApi, malaysiaTime, type TuitionBooking } from "../lib/tuitionApi";
import type { TeacherClass, TeacherEnrollment } from "../lib/teacherNetworkApi";
import type { TeacherMaterial } from "../lib/teacherContentApi";

export function AcademyProgressCard({study,onProgress}:{study:StudyState;onProgress:()=>void}) {
 const attempts=study.attempts.filter(a=>a.levelId===study.profile.levelId);
 return <section className="academyPanel academyProgressCard" aria-labelledby="academy-progress-title">
  <div className="academyPanelHeading"><h2 id="academy-progress-title"><ChartNoAxesColumnIncreasing aria-hidden="true"/>Progress Saya</h2><button type="button" className="academyLinkButton" onClick={onProgress}>Lihat semua<ArrowRight aria-hidden="true"/></button></div>
  <div className="academySubjectProgress">{getSubjectsForLevel(study.profile.levelId).slice(0,4).map((subject,index)=>{
   const value=subjectMastery(attempts,study.profile.levelId,subject.id);
   return <div key={subject.id} className={`academyProgressRow tone-${index%4}`}><span>{subject.name}</span><div className="academyProgressTrack" role="progressbar" aria-label={`Penguasaan ${subject.name}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></div><strong>{value}%</strong></div>;
  })}</div><p className="academyCaption">{attempts.length?"Daripada latihan yang direkodkan.":"Belum ada latihan direkodkan untuk tahap ini."}</p>
 </section>;
}

// Only accepted, upcoming bookings qualify as scheduled classes. An enrollment alone does not.
export function AcademyNextClass({studentId,role,onDetails}:{studentId?:string;role:"student"|"parent"|"teacher";onDetails:()=>void}) {
 const [bookings,setBookings]=useState<TuitionBooking[]>([]),[phase,setPhase]=useState<"loading"|"ready"|"error">("loading"),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setBookings([]);
  if(role!=="teacher"&&!studentId){setPhase("ready");return()=>controller.abort();}
  setPhase("loading");void tuitionApi.bookings(controller.signal).then(data=>{if(!controller.signal.aborted){setBookings(data.bookings);setPhase("ready");}}).catch(()=>{if(!controller.signal.aborted)setPhase("error");});
  return()=>controller.abort();
 },[studentId,role,retry]);
 const next=academyNextBooking(bookings,role,studentId);
 return <section className="academyPanel academyNextClass" aria-labelledby="academy-next-class-title" aria-busy={phase==="loading"}>
  <div className="academyPanelHeading"><h2 id="academy-next-class-title"><CalendarDays aria-hidden="true"/>{role==="teacher"?"Jadual Kelas Seterusnya":"Kelas Akan Datang"}</h2><button type="button" className="academyLinkButton" onClick={onDetails}>Lihat butiran<ArrowRight aria-hidden="true"/></button></div>
  {phase==="loading"?<p role="status">Memuatkan kelas...</p>:phase==="error"?<div role="alert"><p>Kelas belum dapat dimuatkan.</p><button type="button" className="miniButton" onClick={()=>setRetry(n=>n+1)}>Cuba lagi</button></div>:next?<div className="academyNextContent"><span className="academyTileIcon"><GraduationCap aria-hidden="true"/></span><div><h3>{next.className}</h3><p>{role==="teacher"?next.studentName:next.teacherName}</p><time dateTime={next.startsAt}>{malaysiaTime(next.startsAt)}</time><span className="academyStatus">Disahkan</span></div></div>:<div className="academyNextContent"><span className="academyTileIcon"><CalendarDays aria-hidden="true"/></span><div><h3>Belum ada sesi disahkan</h3><p>{!studentId&&role!=="teacher"?"Pilih profil anak untuk melihat jadual.":"Sesi yang disahkan oleh guru akan muncul di sini."}</p></div></div>}
  <button type="button" className="primary" onClick={onDetails}>{role==="teacher"?"Urus jadual kelas":"Lihat kelas saya"}<ArrowRight aria-hidden="true"/></button>
 </section>;
}

export function academyNextBooking(bookings:TuitionBooking[],role:"student"|"parent"|"teacher",studentId?:string,now=Date.now()) {
 return bookings.filter(b=>(role==="teacher"||Boolean(studentId)&&b.studentId===studentId)&&b.status==="accepted"&&Date.parse(b.endsAt)>now).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt))[0];
}

export function academyActivityDays(study:StudyState,now=new Date()) {
 const dateKey=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
 return Array.from({length:7},(_,index)=>{
  const day=new Date(now.getTime()-(6-index)*86400000),key=dateKey(day);
  return {key,label:new Intl.DateTimeFormat("ms-MY",{timeZone:"Asia/Kuala_Lumpur",weekday:"short"}).format(day),count:study.attempts.filter(a=>a.levelId===study.profile.levelId&&Date.parse(a.completedAt)<=now.getTime()&&dateKey(new Date(a.completedAt))===key).length};
 });
}

export function AcademyLearningActivity({study,onProgress}:{study:StudyState;onProgress:()=>void}) {
 const days=academyActivityDays(study),max=Math.max(1,...days.map(d=>d.count));
 return <section className="academyActivityStrip" aria-label="Aktiviti pembelajaran">
  <div className="academyPanel academyStreak"><span className="academyTileIcon"><Flame aria-hidden="true"/></span><div><h2>Streak Belajar</h2><strong>{study.streak} hari</strong><p>Teruskan konsisten!</p></div></div>
  <div className="academyPanel academyActivityChart"><div className="academyPanelHeading"><h2><ChartNoAxesColumnIncreasing aria-hidden="true"/>Aktiviti 7 hari</h2><button type="button" className="academyLinkButton" onClick={onProgress}>Lihat rekod<ArrowRight aria-hidden="true"/></button></div><div className="academyBars" aria-label="Bilangan latihan yang disimpan dalam tujuh hari terakhir">{days.map(day=><div key={day.key} aria-label={`${day.key}: ${day.count} latihan`}><span>{day.count}</span><div><i style={{height:`${day.count/max*100}%`}}/></div><small>{day.label}</small></div>)}</div></div>
 </section>;
}

export function AcademyTeacherDesk({classes,enrollments,materials,onSchedule}:{classes:TeacherClass[];enrollments:TeacherEnrollment[];materials:TeacherMaterial[];onSchedule:()=>void}) {
 const active=classes.filter(c=>c.status==="active"),pending=enrollments.filter(e=>e.status==="pending_teacher"&&active.some(c=>c.id===e.classId));
 return <div className="academyOverviewGrid academyTeacherDesk"><AcademyNextClass role="teacher" onDetails={onSchedule}/><section className="academyPanel" aria-labelledby="academy-teaching-desk-title"><div className="academyPanelHeading"><h2 id="academy-teaching-desk-title"><ClipboardCheck aria-hidden="true"/>Ruang Mengajar</h2><a href="#academy-homework" className="academyLinkButton">Tugasan<ArrowRight aria-hidden="true"/></a></div>
  <a className="academyDeskRow" href="#academy-classes"><span className="academyTileIcon"><Users aria-hidden="true"/></span><span><strong>{pending.length} permohonan murid menunggu</strong><small>Semak sambungan kelas sebenar</small></span><ArrowRight aria-hidden="true"/></a>
  <a className="academyDeskRow" href="#academy-materials"><span className="academyTileIcon purple"><LibraryBig aria-hidden="true"/></span><span><strong>{materials.length} bahan direkodkan</strong><small>{materials[0]?.title??"Terbitkan nota atau bacaan untuk kelas"}</small></span><ArrowRight aria-hidden="true"/></a>
  <a className="academyDeskRow" href="#academy-teacher-settings"><span className="academyTileIcon green"><ShieldCheck aria-hidden="true"/></span><span><strong>Profil &amp; Tetapan Guru</strong><small>Semak profil dan pilihan notifikasi</small></span><ArrowRight aria-hidden="true"/></a>
 </section></div>;
}

export function academyFocusSection(id:string) {
 const section=document.getElementById(id);
 if(!section)return;
 section.tabIndex=-1;section.focus({preventScroll:true});
 section.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
}
