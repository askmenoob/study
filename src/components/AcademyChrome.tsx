import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, ChartNoAxesColumnIncreasing, ClipboardCheck, GraduationCap, Home, LibraryBig, Menu, MessageSquare, Settings, ShieldCheck, Sparkles, Users, CalendarDays, UserRound, ArrowRight, Trophy } from "lucide-react";
import type { StudyState } from "../types";
import { findLevel, getSubjectsForLevel } from "../data/curriculum";
import { subjectMastery } from "../lib/progress";
import { AcademyRoleIllustration } from "./AcademyRoleIllustration";
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
  {label:"Rekod Kewangan",target:"academy-earnings",Icon:ChartNoAxesColumnIncreasing},
  {label:"Profil & Tetapan",target:"academy-teacher-settings",Icon:Settings},
];
const adminLinks=[
  {label:"Dashboard",target:"academy-admin-home",Icon:Home},
  {label:"Pengurusan Guru",target:"admin-tuition-applications",Icon:GraduationCap},
  {label:"Pengguna",target:"academy-users",Icon:Users},
  {label:"Kelas & Permohonan",target:"academy-admin-operations",Icon:BookOpenCheck},
  {label:"Moderasi",target:"admin-feedback-triage",Icon:ShieldCheck},
  {label:"Inbox",target:"admin-feedback-heading",Icon:MessageSquare},
  {label:"Pakej sandbox",target:"academy-commerce",Icon:ClipboardCheck},
  {label:"Rekod Kewangan",target:"academy-finance",Icon:ChartNoAxesColumnIncreasing},
  {label:"Persediaan aplikasi",target:"academy-readiness",Icon:Settings},
  {label:"Privasi & Retention",target:"academy-retention",Icon:ShieldCheck},
];
export function AcademyWorkspaceNav({role}: {role:"teacher"|"admin"}) {
  const links=role==="teacher"?teachingLinks:adminLinks;
  const [active,setActive]=useState(links[0].target);
  const [open,setOpen]=useState(false);
  const menuButton=useRef<HTMLButtonElement>(null);
  const menuRef=useRef<HTMLElement>(null);
  const menuId=`academy-${role}-menu`;
  useEffect(()=>{
    const sync=()=>{const target=window.location.hash.slice(1);if(links.some(item=>item.target===target))setActive(target);};
    sync();window.addEventListener("hashchange",sync);
    return()=>window.removeEventListener("hashchange",sync);
  },[links]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setOpen(false);menuButton.current?.focus();}
      if(event.key==="Tab"){
        const controls=Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a,button")??[]);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    const resize=()=>{if(window.innerWidth>760)setOpen(false);};
    window.addEventListener("keydown",keydown);window.addEventListener("resize",resize);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",keydown);window.removeEventListener("resize",resize);};
  },[open]);
  const select=(target:string)=>{
    setActive(target);setOpen(false);
    requestAnimationFrame(()=>{
      const destination=document.getElementById(target);
      if(destination){destination.tabIndex=-1;destination.focus({preventScroll:true});}
    });
  };
  const item=({label,target,Icon}:typeof links[number])=><a key={label} href={`#${target}`} aria-current={active===target?"location":undefined} onClick={()=>select(target)}><Icon aria-hidden="true"/><span>{label}</span></a>;
  return <>
    <aside className="academyWorkspaceSidebar" aria-label={`Navigasi ${roles[role].title}`}>
      <a className="academyWorkspaceBrand" href={`#${role==="teacher"?"academy-teacher-home":"academy-admin-home"}`}>
        <span><GraduationCap aria-hidden="true"/></span><span><strong>study.imai.my</strong><small>Private Tuition</small></span>
      </a>
      <div className="academySidebarLabel">MENU UTAMA</div>
      <nav>{links.map(item)}</nav>
      <div className="academySidebarInfo"><Sparkles aria-hidden="true"/><strong>IMAI Smart Academy</strong><p>Belajar • Berkembang • Capai Impian</p></div>
    </aside>
    <nav className="academyWorkspaceMobileNav" aria-label={`Menu telefon ${roles[role].title}`}>{links.slice(0,4).map(item)}<button ref={menuButton} type="button" aria-label="Buka semua menu" aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(true)}><Menu aria-hidden="true"/><span>Menu</span></button></nav>
    {open&&<div className="academyMenuOverlay" onClick={event=>{if(event.target===event.currentTarget){setOpen(false);menuButton.current?.focus();}}}><section ref={menuRef} id={menuId} className="academyMenuDialog" role="dialog" aria-modal="true" aria-label={`Semua menu ${roles[role].title}`}><div className="academyMenuHeading"><h2>Menu {roles[role].title}</h2><button type="button" className="miniButton" onClick={()=>{setOpen(false);menuButton.current?.focus();}}>Tutup</button></div><nav>{links.map(item)}</nav></section></div>}
  </>;
}

export function AcademyWelcomeBanner({study,onLearn}: {study:StudyState;onLearn:()=>void}) {
 return <section className="academyWelcomeBanner academyIllustratedWelcome" aria-labelledby="academy-welcome-title">
  <div className="academyWelcomeWords">
   <h1 id="academy-welcome-title">Selamat kembali, {study.profile.name || "pelajar"}! 👋</h1>
   <p>Teruskan pembelajaran anda hari ini.</p>
   <div className="academyWelcomeDetails"><span><GraduationCap aria-hidden="true"/>{findLevel(study.profile.levelId).label}</span><span><Trophy aria-hidden="true"/>{study.streak} hari streak</span></div>
   <button type="button" className="primary" onClick={onLearn}>{study.profile.levelId.startsWith("t")?"Sambung belajar":"Sambung membaca"}<ArrowRight aria-hidden="true"/></button>
  </div>
  <AcademyRoleIllustration role={study.profile.levelId.startsWith("t")?"secondary":"student"}/>
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
    <div className="academySubjectProgress">{subjects.slice(0,4).map((subject,index)=>{
      const value=subjectMastery(recent,study.profile.levelId,subject.id);
      return <div key={subject.id} className={`academyProgressRow tone-${index%4}`}><span>{subject.name}</span><div className="academyProgressTrack" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`Penguasaan ${subject.name}`}><i style={{width:`${value}%`}}/></div><strong>{value}%</strong></div>
    })}<p>Penguasaan ini berdasarkan latihan yang disimpan, bukan keputusan peperiksaan.</p></div>
    <div className="academyInsightSide"><span className="academyInsightIcon"><Trophy aria-hidden="true"/></span><strong>{counts}</strong><span>Sesi latihan direkodkan</span><small>{findLevel(study.profile.levelId).label}</small>
    <button type="button" className="academyLinkButton" onClick={onTeacher}>Cari guru untuk anak <ArrowRight aria-hidden="true"/></button></div>
   </div>}
 </section>;
}
