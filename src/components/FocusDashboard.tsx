import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, Check, ChevronRight, Globe2, Heart, Leaf, Link, Calculator, Users, UserRound, FlaskConical, Sprout, FileText, ListChecks, Sparkles, ArrowUpRight } from 'lucide-react';
import { libraryResources, type LibraryResource } from '../../server/library/catalog';
import { findLevel, findSubject, getTopics, getSubjectsForLevel } from '../data/curriculum';
import { learnedUnits } from '../lib/learnedUnits';
import type { StudyState, LevelId, Topic } from '../types';
import type { CloudStudent } from '../lib/api';

export function FocusBrand() {
  return <span className="focusBrand"><img src="/icons/focus-192.png" width="44" height="44" alt=""/><span><b>IMAI</b><span>Study</span></span></span>;
}
export function SubjectMark({id}:{id:string}) {
  const Icon = id === 'en' ? Globe2 : id === 'math' ? Calculator : id === 'science' ? Leaf : id === 'islam' ? Sprout : id === 'moral' ? Heart : id === 'chem' ? FlaskConical : BookOpen;
  return <span className={`focusSubjectMark focusSubject-${id}`}>{id === 'bm' ? <b>Aa</b> : <Icon aria-hidden="true"/>}</span>;
}
const subjectDescriptions:Record<string,string>={bm:'Membaca, menulis, bahasa kita',en:'Read, learn, grow',math:'Nombor, bentuk dan penyelesaian masalah',science:'Meneroka dunia di sekeliling kita',islam:'Ilmu, ibadah dan akhlak',moral:'Nilai baik dalam kehidupan'};
export function LearnerDashboard({study,profileKey,onSubject,onRead,onLesson,onLibrary,onRevision,onProgress,onTutor,onAllSubjects}:{
 study:StudyState;profileKey:string;onSubject:(id:string)=>void;onRead:(id:string)=>void;onLesson:(topic:Topic,subjectId:string)=>void;onLibrary:()=>void;onRevision:()=>void;onProgress:()=>void;onTutor:()=>void;onAllSubjects:()=>void;
}) {
 const level=findLevel(study.profile.levelId); const subjects=getSubjectsForLevel(level.id);
 const readings=libraryResources.filter(r=>r.levelIds.includes(level.id)&&r.kind==='reading'&&r.unitId);
 const last=study.attempts.filter(a=>a.levelId===level.id).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0];
 const lastTopic=last?getTopics(level.id,last.subjectId).find(t=>t.id===last.topicId):undefined;
 const current=readings.find(r=>r.unitId===(lastTopic?.unitId??last?.topicId))??readings[0];
 const topic=current ? getTopics(level.id,current.subjectId).find(t=>t.unitId===current.unitId) : undefined;
 const learned=learnedUnits(profileKey);const started=Boolean(current&&learned.has(current.unitId!));
 const readCurrent=()=>current?onRead(current.id):onLibrary();
 if (level.id.startsWith('t')) {
  const notes=libraryResources.filter(r=>r.levelIds.includes(level.id)&&r.kind==='note');
  const currentNote=notes.find(r=>r.unitId===current?.unitId);
  const nextNote=notes.find(r=>r.subjectId!==current?.subjectId)??notes.find(r=>r.id!==currentNote?.id);
  const suggestedNotes=[currentNote,nextNote].filter((r):r is LibraryResource=>Boolean(r));
  const openCurrentLesson=()=>current&&topic?onLesson(topic,current.subjectId):onLibrary();
  return <main className="focusDashboard secondaryDashboard">
   <div className="secondaryGreeting"><h1>Fokus hari ini, {study.profile.name || 'pelajar'}.</h1><p>Sambung apa yang dipelajari, satu topik pada satu masa.</p></div>
   <div className="secondaryLayout"><div className="secondaryLearning">
    {current?<section className="secondaryCurrent" aria-label="Pelajaran semasa">
     <div className="secondaryCurrentMeta"><span>Pelajaran semasa</span><span>{findSubject(current.subjectId).name}</span></div>
     <h2>{current.title}</h2><p>{current.summary}</p>
     <button className="primary" onClick={readCurrent}>{last?'Sambung belajar':'Mula belajar'}<ArrowRight aria-hidden="true"/></button>
     <div className="secondarySteps" aria-label="Langkah belajar">
      <button onClick={readCurrent}><span className={started?'isDone':''}>{started?<Check aria-hidden="true"/>:'1'}</span>Baca</button>
      <button onClick={openCurrentLesson}><span>2</span>Faham</button>
      <button onClick={openCurrentLesson}><span>3</span>Latih</button>
     </div>
    </section>:<section className="secondaryCurrent"><h2>Pilih bahan untuk bermula</h2><p>Buka Library dan pilih nota mengikut subjek anda.</p><button className="primary" onClick={onLibrary}>Buka Library<ArrowRight/></button></section>}
    <section className="secondarySubjects"><div className="secondarySectionHeading"><h2>Subjek kamu</h2><button className="textButton" onClick={onAllSubjects}>Lihat semua subjek<ArrowRight aria-hidden="true"/></button></div><div className="secondarySubjectList">{subjects.slice(0,5).map(s=><button key={s.id} onClick={()=>onSubject(s.id)}><span className="secondaryMonogram">{s.short}</span><span><b>{s.name}</b><small>Nota dan latihan topik</small></span><ChevronRight aria-hidden="true"/></button>)}</div></section>
    {suggestedNotes.length>0&&<section className="secondaryNotes"><div className="secondarySectionHeading"><h2>Nota dan bacaan</h2><button className="textButton" onClick={onLibrary}>Lihat Library<ArrowRight aria-hidden="true"/></button></div><div className="secondaryNoteShelf">{suggestedNotes.map(note=><button key={note.id} onClick={()=>onRead(note.id)}><span className="secondaryDocument"><FileText aria-hidden="true"/></span><span><small>{findSubject(note.subjectId).name} · Nota</small><b>{note.title}</b><em>{note.minutes} min bacaan</em></span><ArrowUpRight aria-hidden="true"/></button>)}</div></section>}
   </div><aside className="secondaryAside" aria-label="Pilihan belajar">
    <section className="secondaryNext"><h2>Langkah seterusnya</h2><p>Susun pembelajaran mengikut keperluan anda.</p>
     <button onClick={onLibrary}><BookOpen aria-hidden="true"/><span><b>Buka Library</b><small>Teroka nota dan bacaan</small></span><ChevronRight aria-hidden="true"/></button>
     <button onClick={openCurrentLesson}><ListChecks aria-hidden="true"/><span><b>Latihan topik</b><small>Fahami nota, kemudian cuba</small></span><ChevronRight aria-hidden="true"/></button>
     <button onClick={onRevision}><FileText aria-hidden="true"/><span><b>Ulang kaji exam</b><small>Semak unit yang dipelajari</small></span><ChevronRight aria-hidden="true"/></button>
    </section>
    <section className="secondaryTutor"><Sparkles aria-hidden="true"/><h2>Ada konsep yang belum jelas?</h2><p>Bincang dengan AI Tutor. Fahami cara menyelesaikan soalan, langkah demi langkah.</p><button className="primary" onClick={onTutor}>Buka AI Tutor<ArrowRight aria-hidden="true"/></button></section>
    <button className="secondaryProgress" onClick={onProgress}><ChartNoAxesColumnIncreasing aria-hidden="true"/><span>Lihat prestasi saya</span><ArrowUpRight aria-hidden="true"/></button>
   </aside></div>
  </main>;
 }
 return <main className="focusDashboard learnerDashboard">
  <section className="focusGreeting"><div><h1>Jom belajar, {study.profile.name || 'kawan'}!</h1><p>Sedikit demi sedikit, buat perubahan besar.</p><button className="primary" onClick={readCurrent}>{last?'Sambung belajar':'Mula belajar'}<ArrowRight/></button></div><img className="focusHeroArt" src="/focus-books.webp" alt="" width="360" height="270" fetchPriority="high"/></section>
  {current&&<section className="focusCurrent"><div><span>Pelajaran semasa</span><h2>{current.title.replace(/\s*[—–-]\s*(Dengar dan Baca|Bacaan.*)$/i,'')}</h2><p>{findSubject(current.subjectId).name} · {level.label}</p><div className="focusSteps" aria-label="Langkah belajar"><button className="done" onClick={readCurrent}><i>{started&&<Check/>}</i>Baca</button><button className={started?'done':''} onClick={()=>topic?onLesson(topic,current.subjectId):readCurrent()}><i/>Faham</button><button onClick={()=>topic?onLesson(topic,current.subjectId):readCurrent()}><i/>Latih</button></div></div><img src="/focus-reading.webp" alt="" width="210" height="160"/></section>}
  <section className="focusSection"><div className="focusSectionHeading"><h2>Pilih subjek</h2><span>{level.label}</span></div><div className="focusSubjectList">{subjects.map(s=><button key={s.id} onClick={()=>onSubject(s.id)}><SubjectMark id={s.id}/><span><b>{s.name}</b><small>{subjectDescriptions[s.id]??`Teroka unit ${s.name}`}</small></span><ChevronRight/></button>)}</div></section>
  <section className="focusSection"><div className="focusSectionHeading"><h2>Bacaan untuk kamu</h2><button className="textButton" onClick={onLibrary}>Lihat semua <ArrowRight/></button></div><div className="focusReadingShelf">{readings.filter(r=>r.id!==current?.id).slice(0,2).map((r,i)=><button key={r.id} onClick={()=>onRead(r.id)}><span className={`focusBookCover cover-${i}`}><img src={i?'/focus-books.webp':'/focus-reading.webp'} alt=""/><BookOpen aria-hidden="true"/></span><span><b>{r.title}</b><small>{findSubject(r.subjectId).name}</small><em>Bacaan · {level.label}</em></span></button>)}</div></section>
  <section className="focusContinue"><button className="miniButton" onClick={onRevision}>Ulang kaji unit dipelajari<ArrowRight/></button><button className="miniButton" onClick={onProgress}>Lihat prestasi saya<ChartNoAxesColumnIncreasing/></button></section>
 </main>;
}
export function weeklyLearning(attempts:StudyState['attempts'],levelId:LevelId,now=new Date()) {
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
 const recent=attempts.filter(a=>a.levelId===levelId&&new Date(a.completedAt)>=start&&new Date(a.completedAt)<=now);
 return {sessions:recent.length,units:new Set(recent.map(a=>a.topicId)).size};
}
export function ParentDashboard({study,students,busy,onSwitch,onManage,onReports,onLinks,onStudentMode}:{study:StudyState;students:CloudStudent[];busy:boolean;onSwitch:(id:string)=>void;onManage:()=>void;onReports:()=>void;onLinks:()=>void;onStudentMode:()=>void;}) {
 const week=weeklyLearning(study.attempts,study.profile.levelId);const activity=study.attempts.filter(a=>a.levelId===study.profile.levelId).sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,3);
 return <main className="focusDashboard parentDashboard"><div className="focusParentTop"><button className="miniButton" onClick={onManage}><Users/>Urus anak</button></div><h1>Perkembangan anak</h1><p className="focusSubtitle">Menyokong langkah kecil mereka, setiap hari.</p>
 {!students.length?<section className="focusEmpty"><img src="/focus-books.webp" alt="" width="240" height="180"/><h2>Jom kenalkan anak anda</h2><p>Tambah nama dan tahap anak untuk sediakan ruang belajar mereka.</p><button className="primary" onClick={onManage}><Users/>Tambah anak pertama</button></section>:<>
 <div className="focusChildren" aria-label="Pilih profil anak">{students.map((s,i)=>{
 const sameNameGroup=students.filter(other=>other.name.trim().toLowerCase()===s.name.trim().toLowerCase()&&other.level_id===s.level_id);
 const profileSuffix=sameNameGroup.length>1?` · Profil ${sameNameGroup.findIndex(other=>other.id===s.id)+1}`:'';
 const childLevel=findLevel(s.level_id as LevelId).label;
 return <button key={s.id} disabled={busy} aria-label={`${s.name} · ${childLevel}${profileSuffix}`} aria-pressed={s.id===study.profile.cloudId} onClick={()=>onSwitch(s.id)}><span className={`focusPerson person-${i%3}`}><UserRound/></span><span><b>{s.name}</b><small>{childLevel}{profileSuffix}</small></span></button>;
 })}</div>
 <section className="focusWeekly"><h2>Minggu ini</h2><div><article><BookOpen/><b>{week.sessions}</b><span>sesi latihan</span></article><article><Check/><b>{week.units}</b><span>unit dilatih</span></article></div><small>Daripada latihan topik {study.profile.name} yang telah disimpan.</small></section>
 <section className="focusSection"><div className="focusSectionHeading"><h2>Aktiviti terkini {study.profile.name}</h2></div>{activity.length?<div className="focusActivity">{activity.map(a=><button key={a.id} onClick={onReports}><SubjectMark id={a.subjectId}/><span><b>{findSubject(a.subjectId).name}</b><small>{getTopics(a.levelId,a.subjectId).find(t=>t.id===a.topicId)?.name??'Latihan topik'}</small></span><time dateTime={a.completedAt}>{new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short'}).format(new Date(a.completedAt))}<small>{new Intl.DateTimeFormat('ms-MY',{hour:'numeric',minute:'2-digit'}).format(new Date(a.completedAt))}</small></time><ChevronRight/></button>)}</div>:<div className="focusEmptyText"><BookOpen/><h3>Langkah pertama bermula di sini</h3><p>Selepas anak melengkapkan latihan, aktiviti mereka akan muncul di sini.</p></div>}</section>
 <div className="focusParentActions"><button className="primary" onClick={onReports}><ChartNoAxesColumnIncreasing/>Lihat laporan<ArrowRight/></button><button className="miniButton" onClick={onLinks}><Link/>Kongsi link belajar</button><button className="miniButton" onClick={onManage}><Users/>Urus anak</button></div>
 <button className="textButton focusOpenStudent" disabled={busy} onClick={onStudentMode}>Buka Mod Murid pada peranti ini<ArrowRight/></button></>}
 <div className="focusThanks"><Heart/><p>Terima kasih kerana sentiasa menyokong pembelajaran anak-anak.</p><Sprout/></div></main>;
}
