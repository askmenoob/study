import { useState } from "react";
import { Pause, Play, Sparkles, Star } from "lucide-react";

export type AcademyIllustrationRole = "student" | "secondary" | "parent" | "teacher" | "admin";

// Fictional decorative artwork, never a user avatar or evidence of teacher verification.
export function AcademyRoleIllustration({role}:{role:AcademyIllustrationRole}) {
 const [paused,setPaused]=useState(()=>{
  try{return typeof window!=="undefined"&&window.localStorage.getItem("imai-study-illustration-paused")==="true";}catch{return false;}
 });
 const toggle=()=>{
  const next=!paused;setPaused(next);
  try{window.localStorage.setItem("imai-study-illustration-paused",String(next));}catch{/* The in-session control still works when storage is unavailable. */}
 };
 return <div className={`academyRoleIllustration academyRoleIllustration-${role}`} data-paused={paused}>
  <div className="academyArtScene" aria-hidden="true">
  <span className="academyArtHalo"/>
  <img className="academyCharacterArt" src={`/academy/${role}-v1.webp`} alt="" width="720" height="670" decoding="async" fetchPriority="high"/>
  <Sparkles className="academyArtSpark academyArtSpark-one"/>
  <Star className="academyArtSpark academyArtSpark-two"/>
  </div>
  <button type="button" className="academyMotionToggle" aria-label={paused?"Sambung animasi ilustrasi":"Hentikan animasi ilustrasi"} aria-pressed={paused} title={paused?"Sambung animasi":"Hentikan animasi"} onClick={toggle}>{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}</button>
 </div>;
}
