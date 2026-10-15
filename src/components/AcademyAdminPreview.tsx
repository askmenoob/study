import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { teacherNetworkApi, type TeacherApplication } from "../lib/teacherNetworkApi";

export function AcademyAdminApplications() {
 const [items,setItems]=useState<TeacherApplication[]>([]),[phase,setPhase]=useState<"loading"|"ready"|"error">("loading"),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setPhase("loading");setItems([]);
  void teacherNetworkApi.listApplications("pending",controller.signal).then(({applications})=>{if(!controller.signal.aborted){setItems(applications);setPhase("ready");}}).catch(()=>{if(!controller.signal.aborted)setPhase("error");});
  return()=>controller.abort();
 },[retry]);
 return <section className="academyPanel" aria-labelledby="academy-applications-preview-title" aria-busy={phase==="loading"}><div className="academyPanelHeading"><h2 id="academy-applications-preview-title"><GraduationCap aria-hidden="true"/>Permohonan Guru Baharu</h2><a href="#admin-tuition-applications" className="academyLinkButton">Lihat semua<ArrowRight aria-hidden="true"/></a></div>
  {phase==="loading"?<p role="status">Memuatkan permohonan...</p>:phase==="error"?<div role="alert"><p>Permohonan belum dapat dimuatkan.</p><button type="button" className="miniButton" onClick={()=>setRetry(n=>n+1)}>Cuba lagi</button></div>:items.length?items.slice(0,3).map(item=><a href="#admin-tuition-applications" className="academyDeskRow" key={item.id}><span className="academyTileIcon green"><GraduationCap aria-hidden="true"/></span><span><strong>{item.publicName}</strong><small>{item.tuitionAffiliation==="imai"?"Guru IMAI":"Guru Luar"} · {new Intl.DateTimeFormat("ms-MY",{timeZone:"Asia/Kuala_Lumpur",day:"numeric",month:"short"}).format(new Date(item.submittedAt))}</small></span><span className="academyPendingBadge">Menunggu</span></a>):<div className="academyCompactEmpty"><GraduationCap aria-hidden="true"/><p>Tiada permohonan guru menunggu semakan.</p></div>}
 </section>;
}
