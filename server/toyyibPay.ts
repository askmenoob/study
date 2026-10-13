import { createHash,timingSafeEqual } from "node:crypto";
import { readFile,stat } from "node:fs/promises";
import { accessError } from "./familyAccess.js";
// Provider contract: https://toyyibpay.com/apireference/ (checked 2026-10-14).
// Sandbox only. No paid state may be derived from a browser return URL.
export type ToyyibCallback={status:string;order_id:string;refno:string;hash:string;billcode:string;amount:string};
export const toyyibSandboxOrigin="https://dev.toyyibpay.com";
export function verifyToyyibCallback(secret:string,payload:ToyyibCallback) {
  if(!secret||! /^[a-f0-9]{32}$/i.test(payload.hash)||! /^[123]$/.test(payload.status)||!payload.order_id||!payload.refno)return false;
  const expected=createHash("md5").update(secret+payload.status+payload.order_id+payload.refno+"ok").digest();
  return timingSafeEqual(expected,Buffer.from(payload.hash,"hex"));
}
export function myrToCents(value:string) {
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(value))throw accessError("PAYMENT_AMOUNT_INVALID",400);
  const [whole,decimal=""]=value.split(".");return Number(whole)*100+Number(decimal.padEnd(2,"0"));
}
export async function loadToyyibSandboxConfiguration(env:NodeJS.ProcessEnv=process.env) {
  if(env.TOYYIBPAY_MODE!=="sandbox"||!env.TOYYIBPAY_SECRET_FILE||!env.TOYYIBPAY_CATEGORY_CODE||!env.TOYYIBPAY_CALLBACK_URL||!env.TOYYIBPAY_RETURN_URL)
    throw accessError("PAYMENTS_NOT_CONFIGURED",503);
  const category=env.TOYYIBPAY_CATEGORY_CODE;
  if(!/^[a-zA-Z0-9]{1,32}$/.test(category))throw accessError("PAYMENTS_NOT_CONFIGURED",503);
  for(const value of [env.TOYYIBPAY_CALLBACK_URL,env.TOYYIBPAY_RETURN_URL]) {
    const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.hash)throw accessError("PAYMENTS_NOT_CONFIGURED",503);
  }
  try {
    const info=await stat(env.TOYYIBPAY_SECRET_FILE);if(!info.isFile()||(process.platform!=="win32"&&(info.mode&0o077)!==0))throw Error("Unprotected secret");
    const secret=(await readFile(env.TOYYIBPAY_SECRET_FILE,"utf8")).trim();if(secret.length<16)throw Error("Invalid secret");
    return{secret,category,callbackUrl:env.TOYYIBPAY_CALLBACK_URL,returnUrl:env.TOYYIBPAY_RETURN_URL};
  }catch{throw accessError("PAYMENTS_NOT_CONFIGURED",503);}
}
export class ToyyibSandboxClient {
  constructor(private config:{secret:string;category:string;callbackUrl:string;returnUrl:string},private request:typeof fetch=fetch){}
  private async call(path:string,values:Record<string,string>):Promise<unknown>{
    let response:Response;
    try{response=await this.request(toyyibSandboxOrigin+"/index.php/api/"+path,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(values),signal:AbortSignal.timeout(10000),redirect:"error"});}
    catch{throw accessError("PAYMENT_PROVIDER_UNAVAILABLE",502);}
    if(!response.ok)throw accessError("PAYMENT_PROVIDER_UNAVAILABLE",502);
    // ToyyibPay returns HTTP 200 for failures too; never expose raw provider messages or secrets.
    try{return await response.json();}catch{throw accessError("PAYMENT_PROVIDER_REJECTED",502);}
  }
  async createBill(orderId:string,amountCents:number){
    if(!/^[0-9a-f-]{36}$/i.test(orderId)||!Number.isSafeInteger(amountCents)||amountCents<100||amountCents>100000000)throw accessError("INVALID_INPUT",400);
    const result=await this.call("createBill",{userSecretKey:this.config.secret,categoryCode:this.config.category,billName:"IMAI Private Tuition",billDescription:"Tuition session",billPriceSetting:"1",billPayorInfo:"0",billAmount:String(amountCents),billReturnUrl:this.config.returnUrl,billCallbackUrl:this.config.callbackUrl,billExternalReferenceNo:orderId,billTo:"",billEmail:"",billPhone:"",billPaymentChannel:"0",billChargeToCustomer:"",billExpiryDays:"1"});
    if(!Array.isArray(result)||result.length!==1||typeof result[0]?.BillCode!=="string"||! /^[a-zA-Z0-9]{1,32}$/.test(result[0].BillCode))throw accessError("PAYMENT_PROVIDER_REJECTED",502);
    return{billCode:result[0].BillCode as string,paymentUrl:toyyibSandboxOrigin+"/"+result[0].BillCode};
  }
  async confirmTransaction(billCode:string,orderId:string,invoiceNo:string,amountCents:number){
    if(!/^[a-zA-Z0-9]{1,32}$/.test(billCode))throw accessError("PAYMENT_REFERENCE_INVALID",400);
    const result=await this.call("getBillTransactions",{billCode,billpaymentStatus:"1"});
    if(!Array.isArray(result))throw accessError("PAYMENT_PROVIDER_REJECTED",502);
    return result.some(row=>row?.billpaymentStatus==="1"&&row.billExternalReferenceNo===orderId&&row.billpaymentInvoiceNo===invoiceNo&&typeof row.billpaymentAmount==="string"&&myrToCents(row.billpaymentAmount)===amountCents);
  }
}
