import { tuitionRequest } from "./tuitionApi";
import { tokenStore } from "./api";
export type TuitionPackage={id:string;classId:string;teacherId:string;title:string;amountCents:number;feeCents:number;commissionBps:number;status:"draft"|"published"|"archived";version:number;className:string;teacherName:string};
export type TuitionInvoice={id:string;bookingId:string|null;packageId:string;title:string;mode:"sandbox";amountCents:number;feeCents:number;totalCents:number;teacherCents:number;imaiCents:number;commissionBps:number;status:"unpaid"|"paid";billState:"new"|"creating"|"ready"|"review";createdAt:string;paidAt:string|null};
export type TuitionReceipt={id:string;providerReference:string;amountCents:number;holdReason:"duplicate_payment"|"booking_changed"|"teacher_unavailable"|null;createdAt:string};
export const formatMyr=(cents:number)=>new Intl.NumberFormat("ms-MY",{style:"currency",currency:"MYR"}).format(cents/100);
export async function downloadSandboxReconciliation(){const token=tokenStore.get();const response=await fetch("/api/admin/tuition/reconciliation.csv",{headers:token?{Authorization:"Bearer "+token}:{}});if(!response.ok)throw Error("EXPORT_FAILED");const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download="tuition-sandbox-reconciliation.csv";anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const inputCents=(text:string)=>{if(!/^\d{1,7}(\.\d{1,2})?$/.test(text))throw Error("INVALID_INPUT");const [whole,fraction=""]=text.split(".");return Number(whole)*100+Number(fraction.padEnd(2,"0"));};
export const commerceApi={
 packages:(signal?:AbortSignal)=>tuitionRequest<{packages:TuitionPackage[];classes:Array<{id:string;name:string;teacherName:string}>}>("/admin/tuition/packages",{signal}),
 createPackage:(body:unknown)=>tuitionRequest("/admin/tuition/packages",{method:"POST",body:JSON.stringify(body)}),
 status:(item:TuitionPackage,status:"published"|"archived")=>tuitionRequest(`/admin/tuition/packages/${item.id}`,{method:"PATCH",body:JSON.stringify({expectedVersion:item.version,status,ratesApproved:true})}),
 options:(bookingId:string,signal?:AbortSignal)=>tuitionRequest<{packages:TuitionPackage[]}>(`/tuition/bookings/${bookingId}/packages`,{signal}),
 invoices:(studentId:string,signal?:AbortSignal)=>tuitionRequest<{invoices:TuitionInvoice[]}>(`/tuition/invoices?studentId=${studentId}`,{signal}),
 issue:(body:unknown)=>tuitionRequest("/tuition/invoices",{method:"POST",body:JSON.stringify(body)}),
 checkout:(id:string)=>tuitionRequest<{mode:string;paymentUrl:string}>(`/tuition/invoices/${id}/checkout`,{method:"POST",body:JSON.stringify({sandboxAttested:true})}),
 receipts:(id:string,signal?:AbortSignal)=>tuitionRequest<{receipts:TuitionReceipt[]}>(`/tuition/invoices/${id}/receipts`,{signal}),
 reconciliation:(signal?:AbortSignal)=>tuitionRequest<{transactions:Array<{id:string;invoiceId:string;providerReference:string;amountCents:number;holdReason:string|null;imbalanceCents:string;mode:string;createdAt:string}>}>("/admin/tuition/reconciliation",{signal}),
 adminInvoices:(signal?:AbortSignal)=>tuitionRequest<{invoices:TuitionInvoice[]}>("/admin/tuition/invoices",{signal}),
 recover:(id:string,body:unknown)=>tuitionRequest(`/admin/tuition/invoices/${id}/recover`,{method:"POST",body:JSON.stringify(body)}),
};
export function commerceError(error:unknown){const code=error instanceof Error?error.message:"";return({PAYMENTS_NOT_CONFIGURED:"Pembayaran sandbox belum dikonfigurasi. Tiada bil pembekal atau bayaran dibuat.",CHECKOUT_REVIEW_REQUIRED:"Penciptaan bil belum dapat dipastikan. Admin perlu menyemak sebelum mencuba lagi; bil kedua tidak dicipta secara automatik.",VERSION_CONFLICT:"Pakej sudah berubah. Muat semula sebelum menyimpan.",BOOKING_STATE_CONFLICT:"Tempahan bukan lagi sesi akan datang yang disahkan.",PACKAGE_NOT_FOUND:"Pakej tidak lagi tersedia. Muat semula.",INVALID_INPUT:"Semak nilai RM, komisen dan kelas.",INVOICE_EXISTS:"Tempahan ini sudah mempunyai invois dengan snapshot pakej lain."}as Record<string,string>)[code]??"Tindakan belum berjaya. Muat semula dan semak akses anda.";}
