import type { ReactNode } from "react";
import { BookOpenCheck, ChartNoAxesColumnIncreasing, ClipboardCheck, GraduationCap, Home, LibraryBig, Menu, MessageSquare, Settings, ShieldCheck, Sparkles, Users, CalendarDays, UserRound, ArrowRight, Trophy } from "lucide-react";
import type { StudyState } from "../types";
import { findLevel, getSubjectsForLevel } from "../data/curriculum";
import { subjectMastery } from "../lib/progress";
import "./AcademyChrome.css";

export type AcademyRole = "student" | "parent" | "teacher" | "admin";
const roles: Record<AcademyRole,{title:string;description:string;label:string}> = {
  student:{title:"Pelajar",description:"Ruang belajar dan tuisyen",label:"Pelajar"},
  parent:{title:"Ibu Bapa",description:"Pantau pembelajaran anak",label:"Ibu Bapa"},
  teacher:{title:"Guru",description:"Kelas, murid dan tugasan",label:"Guru"},
  admin:{title:"Admin",description:"Operasi & keselamatan platform",label:"Super Admin"},
};

export function AcademyTopbar({role,displayName}: {role:AcademyRole;displayName?:string}) {
  const context=roles[role];
  return <header className="academyTopbar" aria-label={`Ruang ${context.title}`}>
    <div className="academyTopbarContext"><span className="academyTopbarEyebrow"><GraduationCap aria-hidden="true"/> IMAI Smart Academy</span>
      <div><strong>{context.title}</strong><span className="academyBreadcrumb">/ {context.description}</span></div>
    </div>
    <div className="academyTopbarAccount"><span className="academyRoleBadge"><ShieldCheck aria-hidden="true"/>{context.label}</span><span className="academyUserBubble" aria-hidden="true"><UserRound/></span>
      <span className="academyTopbarName">{displayName?.trim()||context.title}</span></div>
  </header>;
}

const teachingLinks=[
  {label:"Dashboard",target:"academy-teacher-home",Icon:Home},
  {label:"Kelas Saya",target:"academy-classes",Icon:BookOpenCheck},
  {label:"Jadual Kelas",target:"academy-schedule",Icon:CalendarDays},
  {label:"Tugasan & Pelajar",target:"academy-homework",Icon:ClipboardCheck},
  {label:"Bahan Mengajar",target:"academy-materials",Icon:LibraryBig},
  {label:"Profil & Tetapan",target:"academy-teacher-home",Icon:Settings},
];
const adminLinks=[
  {label:"Dashboard",target:"academy-admin-home",Icon:Home},
  {label:"Pengurusan Guru",target:"admin-tuition-applications",Icon:GraduationCap},
  {label:"Pengguna",target:"academy-users",Icon:Users},
  {label:"Kelas & Permohonan",target:"academy-admin-operations",Icon:BookOpenCheck},
  {label:"Moderasi",target:"admin-feedback-triage",Icon:ShieldCheck},
  {label:"Inbox",target:"admin-feedback-heading",Icon:MessageSquare},
];
export function AcademyWorkspaceNav({role}: {role:"teacher"|"admin"}) {
  const links=role==="teacher"?teachingLinks:adminLinks;
  const items=links.map(({label,target,Icon})=><a key={label} href={`#${target}`}><Icon aria-hidden="true"/><span>{label}</span></a>);
  return <>
    <aside className="academyWorkspaceSidebar" aria-label={`Navigasi ${roles[role].title}`}>
      <a className="academyWorkspaceBrand" href={`#${role==="teacher"?"academy-teacher-home":"academy-admin-home"}`}>
        <span><GraduationCap aria-hidden="true"/></span><span><strong>study.imai.my</strong><small>Private Tuition</small></span>
      </a>
      <div className="academySidebarLabel">MENU UTAMA</div>
      <nav>{items}</nav>
      <div className="academySidebarInfo"><Sparkles aria-hidden="true"/><strong>IMAI Smart Academy</strong><p>Belajar • Berkembang • Capai Impian</p></div>
    </aside>
    <nav className="academyWorkspaceMobileNav" aria-label={`Menu telefon ${roles[role].title}`}>{items.slice(0,5)}</nav>
  </>;
}

export function AcademyWelcomeBanner({study,onLearn}: {study:StudyState;onLearn:()=>void}) {
 return <section className="academyWelcomeBanner" aria-labelledby="academy-welcome-title">
  <div className="academyWelcomeWords"><span className="academyWelcomeKicker"><Sparkles aria-hidden="true"/> RUANG BELAJAR SAYA</span>
   <h1 id="academy-welcome-title">Selamat kembali, {study.profile.name || "pelajar"}! 👋</h1>
   <p>Belajar lebih bijak bersama cikgu dan AI Tutor. Satu langkah kecil setiap hari.</p>
   <div className="academyWelcomeDetails"><span><GraduationCap aria-hidden="true"/>{findLevel(study.profile.levelId).label}</span><span><Trophy aria-hidden="true"/>{study.streak} hari streak</span></div>
   <button type="button" className="primary" onClick={onLearn}>Sambung belajar <ArrowRight aria-hidden="true"/></button>
  </div>
  <img src="/focus-books.webp" alt="" loading="lazy" width="250" height="190"/>
 </section>;
}

export function AcademyStudentActions({onLearn,onTutor,onMaterials,onProgress,onLibrary}: {
 onLearn:()=>void;onTutor:()=>void;onMaterials:()=>void;onProgress:()=>void;onLibrary:()=>void;
}) {
 const items=[
  {label:"Latihan Saya",description:"Sambung latihan",Icon:ClipboardCheck,onClick:onLearn,kind:"orange"},
  {label:"AI Tutor",description:"Belajar langkah demi langkah",Icon:Sparkles,onClick:onTutor,kind:"blue"},
  {label:"Bahan Guru",description:"Nota dan tugasan",Icon:BookOpenCheck,onClick:onMaterials,kind:"green"},
  {label:"Rekod Belajar",description:"Lihat kemajuan",Icon:ChartNoAxesColumnIncreasing,onClick:onProgress,kind:"purple"},
  {label:"Library",description:"Bacaan & nota",Icon:LibraryBig,onClick:onLibrary,kind:"cyan"},
 ];
 return <section className="academyStudentQuick" aria-labelledby="academy-quick-title"><div className="academySectionHead"><h2 id="academy-quick-title">Pilihan pantas untuk kamu</h2><span>Belajar ikut rentak sendiri</span></div>
 <div className="academyQuickGrid">{items.map(item=><button type="button" className={`academyQuickCard ${item.kind}`} key={item.label} onClick={item.onClick}>
 <span><item.Icon aria-hidden="true"/></span><strong>{item.label}</strong><small>{item.description}</small><ArrowRight className="academyQuickArrow" aria-hidden="true"/></button>)}</div>
 </section>;
}

export function AcademyParentInsights({study,onReport,onTeacher,onManage}: {study:StudyState;onReport:()=>void;onTeacher:()=>void;onManage:()=>void}) {
 const subjects=getSubjectsForLevel(study.profile.levelId);
 const recent=study.attempts.filter(a=>a.levelId===study.profile.levelId);
 const counts=recent.length;
 return <section className="academyParentInsights" aria-label="Ringkasan prestasi anak">
   <div className="academySectionHead"><div><span className="academySectionKicker">PANTAU ANAK</span><h2>Ringkasan Prestasi {study.profile.name ? `· ${study.profile.name}`:""}</h2></div>
    <button type="button" className="academyLinkButton" onClick={onReport}>Lihat laporan <ArrowRight aria-hidden="true"/></button></div>
   {!study.profile.cloudId?<div className="academyEmptyState"><p>Tambah profil anak untuk melihat perkembangan sebenar.</p><button type="button" className="miniButton" onClick={onManage}>Tambah anak</button></div>
   : <div className="academyInsightGrid">
    <div className="academySubjectProgress">{subjects.slice(0,4).map(subject=>{
      const value=subjectMastery(recent,study.profile.levelId,subject.id);
      return <div key={subject.id} className="academyProgressRow"><span>{subject.name}</span><div className="academyProgressTrack" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`Penguasaan ${subject.name}`}><i style={{width:`${value}%`}}/></div><strong>{value}%</strong></div>
    })}<p>Penguasaan ini berdasarkan latihan yang disimpan, bukan keputusan peperiksaan.</p></div>
    <div className="academyInsightSide"><span className="academyInsightIcon"><Trophy aria-hidden="true"/></span><strong>{counts}</strong><span>Sesi latihan direkodkan</span><small>{findLevel(study.profile.levelId).label}</small>
    <button type="button" className="academyLinkButton" onClick={onTeacher}>Cari guru untuk anak <ArrowRight aria-hidden="true"/></button></div>
   </div>}
 </section>;
}
