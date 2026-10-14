import { useEffect, useState } from "react";
import type { TeacherClass } from "../lib/teacherNetworkApi";
import { tuitionApi, tuitionRequest, malaysiaTime, malaysiaInputToIso, tuitionError, type TuitionSlot, type TuitionBooking } from "../lib/tuitionApi";
import "./TuitionSchedule.css";
import { TeacherVideoLink,ParticipantVideoLink } from "./TuitionVideo";

export function TuitionSlotBooking({teacherId,studentId,replacesBookingId,onBooked}:{teacherId:string;studentId?:string;replacesBookingId?:string;onBooked?:()=>void}) {
  const [slots,setSlots]=useState<TuitionSlot[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [slotId,setSlotId]=useState(""),[consent,setConsent]=useState(false),[saving,setSaving]=useState(false),[refresh,setRefresh]=useState(0);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  useEffect(()=>{const controller=new AbortController();setBusy(true);setSlots([]);setError("");
    void tuitionApi.slots(teacherId,controller.signal).then(data=>{if(!controller.signal.aborted)setSlots(data.slots);})
      .catch(()=>{if(!controller.signal.aborted)setError("Jadual belum dapat dimuatkan.");}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>controller.abort();},[teacherId,refresh]);
  useEffect(()=>{setSlotId("");setConsent(false);setRequestId(crypto.randomUUID());setNotice("");},[teacherId,studentId]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!studentId||!slotId||!consent||saving)return;
    setSaving(true);setError("");try{await tuitionApi.book(slotId,studentId,requestId,replacesBookingId);setNotice("Permohonan direkodkan. Tunggu pengesahan guru. Tiada bayaran dibuat.");setSlotId("");setConsent(false);setRequestId(crypto.randomUUID());setRefresh(n=>n+1);onBooked?.();}
    catch(caught){setError(tuitionError(caught));}finally{setSaving(false);}};
  return <section className="tuitionSchedule" aria-label="Slot kelas guru"><h2>{replacesBookingId?"Mohon ubah masa":"Jadual tersedia"}</h2><p>Semua waktu ialah waktu Malaysia (Asia/Kuala_Lumpur). Permohonan memerlukan pengesahan guru.</p>
    {replacesBookingId&&<p>Tempahan asal dibatalkan hanya apabila permohonan masa baharu berjaya disimpan. Masa baharu perlu pengesahan guru. Polisi bayaran: tiada refund.</p>}
    {busy&&<p role="status">Memuatkan slot...</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {!busy&&!error&&slots.length===0&&<p>Guru belum menerbitkan slot kelas.</p>}
    {slots.length>0&&<form onSubmit={submit}><label>Slot kelas<select aria-label="Slot kelas" required value={slotId} disabled={saving} onChange={e=>{setSlotId(e.target.value);setRequestId(crypto.randomUUID());setConsent(false);}}><option value="">Pilih masa</option>
      {slots.map(item=><option key={item.id} value={item.id} disabled={item.remaining<=0}>{malaysiaTime(item.startsAt)} · {item.className} · {item.kind==="group"?"Kumpulan":"1-ke-1"}{item.trial?" · Percubaan":""} · {item.remaining} tempat</option>)}</select></label>
      <label className="tuitionConsent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required disabled={!studentId||saving}/><span>Saya penjaga anak yang dipilih dan bersetuju memohon slot ini. Nama anak dikongsi dengan guru untuk pengurusan sesi.</span></label>
      <button type="submit" className="primary" disabled={!studentId||!slotId||!consent||saving}>{saving?"Menyimpan...":"Mohon slot kelas"}</button></form>}
    {!studentId&&<p>Pilih atau tambah profil anak dahulu.</p>}
    <button type="button" className="miniButton" disabled={busy||saving} onClick={()=>setRefresh(n=>n+1)}>Muat semula slot</button>
  </section>;
}

export function TeacherSlotForm({classes,onChanged}:{classes:TeacherClass[];onChanged?:()=>void}) {
  const active=classes.filter(c=>c.status==="active");
  const [classId,setClassId]=useState(""),[start,setStart]=useState(""),[end,setEnd]=useState(""),[group,setGroup]=useState(false),[capacity,setCapacity]=useState(2),[trial,setTrial]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[slots,setSlots]=useState<TuitionSlot[]>([]),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();void tuitionApi.ownSlots(controller.signal).then(data=>{if(!controller.signal.aborted)setSlots(data.slots);}).catch(()=>{if(!controller.signal.aborted)setError("Jadual belum dapat dimuatkan.");});return()=>controller.abort();},[refresh]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");try{await tuitionApi.createSlot({classId,startsAt:malaysiaInputToIso(start),endsAt:malaysiaInputToIso(end),kind:group?"group":"individual",capacity:group?capacity:1,trial});setNotice("Slot kelas diterbitkan.");setStart("");setEnd("");setRefresh(n=>n+1);onChanged?.();}catch(caught){setError(tuitionError(caught));}finally{setBusy(false);}};
  return <section className="tuitionSchedule"><h2>Jadual ketersediaan</h2><p>Masukkan waktu Malaysia. Tempoh 15–240 minit, sehingga 180 hari akan datang.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <form onSubmit={submit}><label>Kelas<select aria-label="Kelas" required value={classId} onChange={e=>setClassId(e.target.value)} disabled={busy}><option value="">Pilih kelas</option>{active.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Format<select aria-label="Format" value={group?"group":"individual"} onChange={e=>setGroup(e.target.value==="group")} disabled={busy}><option value="individual">1-ke-1</option><option value="group">Kumpulan</option></select></label>
      <label>Mula (Malaysia)<input type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)} disabled={busy}/></label>
      <label>Tamat (Malaysia)<input type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)} disabled={busy}/></label>
      {group&&<label>Kapasiti<input type="number" min={1} max={20} required value={capacity} onChange={e=>setCapacity(Number(e.target.value))} disabled={busy}/></label>}
      <label className="tuitionConsent"><input type="checkbox" checked={trial} onChange={e=>setTrial(e.target.checked)} disabled={busy}/><span>Sesi percubaan</span></label>
      <button className="primary" disabled={busy||!active.length}>{busy?"Menyimpan...":"Terbitkan slot"}</button></form>
    {slots.map(s=><article key={s.id}><strong>{s.className}</strong><p>{malaysiaTime(s.startsAt)} – {malaysiaTime(s.endsAt)}</p><p>{s.kind==="group"?"Kumpulan":"1-ke-1"} · {s.remaining}/{s.capacity} tempat kosong{s.trial?" · Percubaan":""}</p><TeacherVideoLink slotId={s.id}/><button type="button" className="miniButton" disabled={busy} onClick={()=>{if(!window.confirm("Tutup slot ini dan batalkan semua tempahan berkaitan?"))return;setBusy(true);setError("");void tuitionApi.closeSlot(s.id).then(()=>{setRefresh(n=>n+1);onChanged?.();}).catch(caught=>setError(tuitionError(caught))).finally(()=>setBusy(false));}}>Tutup slot</button></article>)}
  </section>;
}

export function TuitionBookingList({role,studentId}:{role:"parent"|"teacher"|"student";studentId?:string}) {
  const [reschedule,setReschedule]=useState<TuitionBooking|null>(null);
  const [bookings,setBookings]=useState<TuitionBooking[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setBookings([]);setError("");void tuitionApi.bookings(controller.signal).then(data=>{if(!controller.signal.aborted)setBookings(data.bookings);}).catch(()=>{if(!controller.signal.aborted)setError("Tempahan belum dapat dimuatkan.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[refresh,studentId,role]);
  const act=async(operation:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError("");try{await operation();setRefresh(n=>n+1);}catch(caught){setError(tuitionError(caught));}finally{setBusy(false);}};
  const visible=bookings.filter(b=>!studentId||b.studentId===studentId).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const next=visible.find(b=>b.status==="accepted"&&Date.parse(b.startsAt)>Date.now());
  return <section className="tuitionSchedule" aria-label="Tempahan dan kehadiran"><h2>Tempahan &amp; kehadiran</h2>
    {loading&&<p role="status">Memuatkan tempahan...</p>}{error&&<p role="alert">{error}</p>}
    {!loading&&!error&&!visible.length&&<p>Belum ada tempahan direkodkan.</p>}
    {!loading&&next&&<p className="tuitionScheduleNotice"><strong>Kelas seterusnya:</strong> {next.className} · {malaysiaTime(next.startsAt)} · {next.teacherName}</p>}
    {visible.map(b=><article key={b.id}><h3>{b.className}</h3><p>{b.teacherName} · {b.studentName}</p><p>{malaysiaTime(b.startsAt)} – {malaysiaTime(b.endsAt)}</p>
      <p>Status: {{pending:"Menunggu guru",accepted:"Disahkan",cancelled:"Dibatalkan"}[b.status]}{b.trial?" · Percubaan":""}</p>
      <p>Kehadiran: {b.attendance?{present:"Hadir",absent:"Tidak hadir",excused:"Berizin"}[b.attendance]:"Belum direkodkan"}</p>
      {role!=="teacher"&&b.status==="accepted"&&<ParticipantVideoLink bookingId={b.id}/>}
      <div className="tuitionScheduleActions">{role==="teacher"&&b.status==="pending"&&Date.parse(b.startsAt)>Date.now()&&<><button type="button" className="miniButton" disabled={busy} onClick={()=>void act(()=>tuitionApi.decide(b.id,"accept"))}>Terima</button><button type="button" className="miniButton" disabled={busy} onClick={()=>void act(()=>tuitionApi.decide(b.id,"decline"))}>Tolak</button></>}
      {role!=="student"&&b.status!=="cancelled"&&Date.parse(b.startsAt)>Date.now()&&<button type="button" className="miniButton" disabled={busy} onClick={()=>void act(()=>tuitionApi.cancel(b.id))}>Batalkan</button>}
      {role==="parent"&&b.status!=="cancelled"&&Date.parse(b.startsAt)>Date.now()&&<button type="button" className="miniButton" disabled={busy} onClick={()=>setReschedule(b)}>Ubah masa</button>}
      {role==="teacher"&&b.status==="accepted"&&Date.parse(b.startsAt)<=Date.now()&&(["present","absent","excused"] as const).map(state=><button key={state} type="button" className="miniButton" disabled={busy} onClick={()=>void act(()=>tuitionApi.attendance(b.id,state))}>{{present:"Hadir",absent:"Tidak hadir",excused:"Berizin"}[state]}</button>)}</div>
    </article>)}
    {reschedule&&reschedule.studentId===(studentId??reschedule.studentId)&&<><TuitionSlotBooking key={reschedule.id} teacherId={reschedule.teacherId} studentId={reschedule.studentId} replacesBookingId={reschedule.id} onBooked={()=>{setReschedule(null);setRefresh(n=>n+1);}}/><button type="button" className="miniButton" onClick={()=>setReschedule(null)}>Tutup ubah masa</button></>}
    <button type="button" className="miniButton" disabled={loading||busy} onClick={()=>setRefresh(n=>n+1)}>Muat semula tempahan</button>
  </section>;
}
type Notification={id:string;bookingId:string;event:string;createdAt:string;readAt:string|null};
export function TuitionNotifications(){
  const [items,setItems]=useState<Notification[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");void tuitionRequest<{notifications:Notification[]}>("/tuition/notifications",{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItems(data.notifications);}).catch(()=>{if(!controller.signal.aborted)setError("Notifikasi belum dapat dimuatkan.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[refresh]);
  const read=async(id:string)=>{if(busy)return;setBusy(true);try{await tuitionRequest(`/tuition/notifications/${id}`,{method:"PATCH",body:JSON.stringify({read:true})});setRefresh(n=>n+1);}catch{setError("Notifikasi belum dapat ditandakan dibaca.");}finally{setBusy(false);}};
  const labels:Record<string,string>={requested:"Permohonan booking baharu",accepted:"Booking diterima guru",declined:"Permohonan booking ditolak",cancelled:"Booking dibatalkan",rescheduled:"Booking diubah masa",slot_closed:"Slot ditutup guru; booking dibatalkan","attendance:present":"Kehadiran: hadir","attendance:absent":"Kehadiran: tidak hadir","attendance:excused":"Kehadiran: berizin"};
  return <section className="tuitionSchedule" aria-label="Notifikasi tuisyen"><h2>Notifikasi tuisyen</h2>{loading&&<p role="status">Memuatkan notifikasi...</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!items.length&&<p>Belum ada notifikasi.</p>}{items.slice(0,10).map(item=><article key={item.id}><strong>{labels[item.event]??"Kemaskini booking"}</strong><p>{malaysiaTime(item.createdAt)} · {item.readAt?"Dibaca":"Belum dibaca"}</p>{!item.readAt&&<button type="button" className="miniButton" disabled={busy} onClick={()=>void read(item.id)}>Tandakan dibaca</button>}</article>)}<button type="button" className="miniButton" disabled={loading||busy} onClick={()=>setRefresh(n=>n+1)}>Muat semula notifikasi</button></section>;
}
