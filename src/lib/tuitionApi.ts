import { tokenStore } from "./api";

export type TuitionSlot = {
  id:string; teacherId:string; classId:string; className:string; teacherName:string;
  levelId:string; subjectId:string; startsAt:string; endsAt:string; timezone:string;
  kind:"individual"|"group"; capacity:number; remaining:number; trial:boolean; status:string;
};
export type TuitionBooking = {
  id:string; slotId:string; studentId:string; studentName:string; teacherId:string;
  className:string; teacherName:string; startsAt:string; endsAt:string; trial:boolean;
  status:"pending"|"accepted"|"cancelled"; attendance:"present"|"absent"|"excused"|null;
};
export async function tuitionRequest<T>(path:string,init:RequestInit = {}):Promise<T> {
  const headers=new Headers(init.headers); const token=tokenStore.get();
  if(token)headers.set("Authorization",`Bearer ${token}`);
  if(init.body!==undefined)headers.set("Content-Type","application/json");
  const response=await fetch(`/api${path}`,{...init,headers});
  if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error ?? `HTTP_${response.status}`);
  return response.status===204 ? undefined as T : await response.json() as T;
}
export const tuitionApi={
  slots:(teacherId:string,signal?:AbortSignal)=>tuitionRequest<{slots:TuitionSlot[]}>(`/tuition/teachers/${teacherId}/slots`,{signal}),
  ownSlots:(signal?:AbortSignal)=>tuitionRequest<{slots:TuitionSlot[]}>("/teacher/tuition/slots",{signal}),
  closeSlot:(id:string)=>tuitionRequest(`/teacher/tuition/slots/${id}`,{method:"DELETE"}),
  createSlot:(input:Omit<TuitionSlot,"id"|"teacherId"|"teacherName"|"className"|"levelId"|"subjectId"|"remaining"|"status"|"timezone">)=>tuitionRequest<{slot:TuitionSlot}>("/teacher/tuition/slots",{method:"POST",body:JSON.stringify(input)}),
  book:(slotId:string,studentId:string,clientRequestId:string,replacesBookingId?:string)=>tuitionRequest<{booking:TuitionBooking}>("/tuition/bookings",{method:"POST",body:JSON.stringify({slotId,studentId,clientRequestId,consentAttested:true,consentVersion:"tuition-booking-v1",...(replacesBookingId?{replacesBookingId}:{})})}),
  bookings:(signal?:AbortSignal)=>tuitionRequest<{bookings:TuitionBooking[]}>("/tuition/bookings",{signal}),
  decide:(id:string,decision:"accept"|"decline")=>tuitionRequest(`/teacher/tuition/bookings/${id}`,{method:"PATCH",body:JSON.stringify({decision})}),
  cancel:(id:string)=>tuitionRequest(`/tuition/bookings/${id}/cancel`,{method:"POST",body:"{}"}),
  attendance:(id:string,attendance:"present"|"absent"|"excused")=>tuitionRequest(`/teacher/tuition/bookings/${id}/attendance`,{method:"PATCH",body:JSON.stringify({attendance})}),
};
export const malaysiaTime=(iso:string)=>new Intl.DateTimeFormat("ms-MY",{timeZone:"Asia/Kuala_Lumpur",dateStyle:"medium",timeStyle:"short"}).format(new Date(iso));
// datetime-local represents Malaysia time even if the browser operates in another timezone.
export const malaysiaInputToIso=(value:string)=>new Date(`${value}:00+08:00`).toISOString();
export function tuitionError(error:unknown) {
  const code=error instanceof Error ? error.message : "";
  return ({SLOT_FULL:"Slot telah penuh. Pilih masa lain.",STUDENT_TIME_CONFLICT:"Anak mempunyai tempahan bertindih.",TIME_CONFLICT:"Jadual ini bertindih dengan slot lain.",LEVEL_MISMATCH:"Tahap kelas tidak sepadan dengan profil anak.",BOOKING_STATE_CONFLICT:"Status tempahan telah berubah. Muat semula.",ATTENDANCE_NOT_READY:"Kehadiran hanya boleh direkod selepas sesi bermula.",BOOKING_ALREADY_STARTED:"Sesi sudah bermula. Pembatalan tidak tersedia.",INVALID_INPUT:"Semak waktu, tempoh 15–240 minit dan kapasiti kelas.",SLOT_NOT_FOUND:"Slot tidak lagi tersedia."} as Record<string,string>)[code] ?? "Tindakan belum berjaya. Semak sambungan dan cuba semula.";
}
