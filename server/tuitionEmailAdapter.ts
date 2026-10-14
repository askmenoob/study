import { createHash } from "node:crypto";
import { readFileSync,statSync } from "node:fs";
import nodemailer from "nodemailer";
import type { DeliveryAdapters,TuitionDeliveryAdapter } from "./tuitionNotificationDelivery.js";
import {configuredTuitionWhatsApp} from "./tuitionWhatsAppAdapter.js";

type MailTransport={sendMail:(message:Record<string,unknown>)=>Promise<{accepted?:unknown[];messageId?:string}>;close:()=>void};
type TransportFactory=(options:Record<string,unknown>)=>MailTransport;
const createTransport:TransportFactory=options=>nodemailer.createTransport(options);
/** No network connections at configuration time. Both provider selection and worker opt-in are required. */
export function configuredTuitionEmail(env:NodeJS.ProcessEnv=process.env,factory:TransportFactory=createTransport):TuitionDeliveryAdapter|null{
 if(env.TUITION_NOTIFICATION_WORKER_ENABLED!=="true"||env.TUITION_EMAIL_PROVIDER!=="smtp")return null;
 try{
  const host=env.TUITION_SMTP_HOST??"",port=Number(env.TUITION_SMTP_PORT),user=env.TUITION_SMTP_USER??"",from=env.TUITION_SMTP_FROM??"",file=env.TUITION_SMTP_PASSWORD_FILE;
  if(!/^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host)||!host.includes(".")||![465,587].includes(port)||!user||/[\r\n]/.test(user)||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)||!file)return null;
  const info=statSync(file);if(!info.isFile()||(process.platform!=="win32"&&(info.mode&0o077)!==0))return null;
  const pass=readFileSync(file,"utf8").trim();if(!pass||/[\r\n]/.test(pass))return null;
  return{async send(input){
   if(input.signal.aborted)throw Error("Delivery cancelled");
   const transport=factory({host,port,secure:port===465,requireTLS:port===587,tls:{rejectUnauthorized:true,minVersion:"TLSv1.2"},auth:{user,pass},pool:false,logger:false,debug:false,connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000,disableFileAccess:true,disableUrlAccess:true});
   const abort=()=>transport.close();input.signal.addEventListener("abort",abort,{once:true});
   try{
    const messageId=`<tuition-${input.idempotencyKey}@${from.split("@")[1]}>`;
    const result=await transport.sendMail({from,to:input.destination,envelope:{from,to:[input.destination]},subject:"IMAI Study — notifikasi peribadi",text:input.message,messageId,disableFileAccess:true,disableUrlAccess:true});
    if(input.signal.aborted||!result.accepted?.some(value=>typeof value==="string"&&value.toLowerCase()===input.destination.toLowerCase()))throw Error("Recipient acceptance not confirmed");
    // Opaque local reference avoids exposing recipient addresses or provider diagnostics.
    return{accepted:true,reference:"smtp:"+createHash("sha256").update(messageId).digest("hex")};
   }finally{input.signal.removeEventListener("abort",abort);transport.close();}
  }};
 }catch{return null;}
}
export function configuredTuitionAdapters():DeliveryAdapters{
 const email=configuredTuitionEmail(),whatsapp=configuredTuitionWhatsApp();return channel=>channel==="email"?email:whatsapp;
}
