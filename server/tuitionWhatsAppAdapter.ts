import {createHash} from "node:crypto";
import {readFileSync,statSync} from "node:fs";
import type {TuitionDeliveryAdapter} from "./tuitionNotificationDelivery.js";

/** Uses operator-selected Meta Cloud API version and existing approved templates; creates no account/template. */
export function configuredTuitionWhatsApp(env:NodeJS.ProcessEnv=process.env,fetcher:typeof fetch=fetch):TuitionDeliveryAdapter|null{
 if(env.TUITION_NOTIFICATION_WORKER_ENABLED!=="true"||env.TUITION_WHATSAPP_PROVIDER!=="meta_cloud"||env.TUITION_WHATSAPP_TEMPLATES_APPROVED!=="true")return null;
 try{
  const version=env.TUITION_WHATSAPP_GRAPH_VERSION??"",phone=env.TUITION_WHATSAPP_PHONE_NUMBER_ID??"",language=env.TUITION_WHATSAPP_TEMPLATE_LANGUAGE??"",file=env.TUITION_WHATSAPP_TOKEN_FILE;
  const otp=env.TUITION_WHATSAPP_OTP_TEMPLATE??"",booking=env.TUITION_WHATSAPP_BOOKING_TEMPLATE??"",payment=env.TUITION_WHATSAPP_PAYMENT_TEMPLATE??"";
  if(!/^v\d{1,2}\.\d$/.test(version)||!/^\d{8,32}$/.test(phone)||! /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)||![otp,booking,payment].every(name=>/^[a-z][a-z0-9_]{0,99}$/.test(name))||!file)return null;
  const info=statSync(file);if(!info.isFile()||(process.platform!=="win32"&&(info.mode&0o077)!==0))return null;
  const token=readFileSync(file,"utf8").trim();if(token.length<16||/\s/.test(token))return null;
  return{async send(input){
   if(input.signal.aborted||!/^\+[1-9]\d{7,14}$/.test(input.destination))throw Error("WhatsApp destination unavailable");
   const destination=input.destination.slice(1),template:Record<string,unknown>={language:{code:language}};
   if(input.purpose==="verification"){
    if(!input.verificationCode||!/^\d{6}$/.test(input.verificationCode))throw Error("Verification content unavailable");
    template.name=otp;template.components=[{type:"body",parameters:[{type:"text",text:input.verificationCode}]},{type:"button",sub_type:"url",index:"0",parameters:[{type:"text",text:input.verificationCode}]}];
   }else if(input.purpose==="booking_update"||input.purpose==="payment_update"){
    // Static approved portal-update template: never forward caller-supplied message or child context.
    template.name=input.purpose==="booking_update"?booking:payment;
   }else throw Error("Unsupported notification purpose");
   const response=await fetcher(`https://graph.facebook.com/${version}/${phone}/messages`,{method:"POST",redirect:"error",signal:input.signal,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:destination,type:"template",template})});
   if(!response.ok)throw Error("WhatsApp request requires review");
   const body=await response.text();if(body.length>16384)throw Error("Unexpected provider response");const result=JSON.parse(body);
   const message=result.messages?.[0],contact=result.contacts?.[0];
   if(result.messaging_product!=="whatsapp"||result.messages?.length!==1||result.contacts?.length!==1||typeof message?.id!=="string"||! /^wamid\.[A-Za-z0-9+/=_-]{1,500}$/.test(message.id)||String(contact?.input??"").replace(/^\+/,"")!==destination||(message.message_status&&message.message_status!=="accepted"))throw Error("WhatsApp acceptance not confirmed");
   return{accepted:true,reference:"meta:"+createHash("sha256").update(message.id).digest("hex")};
  }};
 }catch{return null;}
}
