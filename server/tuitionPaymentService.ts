import { z } from "zod";
import { accessError } from "./familyAccess.js";
import { TuitionCommerceRepository } from "./tuitionCommerce.js";
import { loadToyyibSandboxConfiguration,ToyyibSandboxClient,myrToCents,verifyToyyibCallback,toyyibSandboxOrigin } from "./toyyibPay.js";
export const tuitionPaymentCallback=z.object({status:z.enum(["1","2","3"]),order_id:z.string().uuid(),refno:z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),hash:z.string().regex(/^[a-fA-F0-9]{32}$/),billcode:z.string().regex(/^[A-Za-z0-9]{1,32}$/),amount:z.string().max(12),reason:z.string().max(500).optional(),transaction_time:z.string().max(80).optional()}).strict();
type Gateway={secret:string;client:Pick<ToyyibSandboxClient,"createBill"|"confirmTransaction">};
export async function configuredTuitionGateway():Promise<Gateway>{
  const config=await loadToyyibSandboxConfiguration();return{secret:config.secret,client:new ToyyibSandboxClient(config)};
}
export class TuitionPaymentService{
  constructor(private repository:TuitionCommerceRepository,private gateway:()=>Promise<Gateway>=configuredTuitionGateway,private checkoutEnabled:()=>boolean=()=>process.env.TOYYIBPAY_CHECKOUT_ENABLED==="true"){}
  async checkout(parent:string,id:string){
    if(!this.checkoutEnabled())throw accessError("PAYMENTS_NOT_CONFIGURED",503);
    const gateway=await this.gateway(); // Missing configuration must not mutate/claim an invoice.
    const claim=await this.repository.claimCheckout(parent,id);
    if(!claim.claimed)return{mode:"sandbox",paymentUrl:toyyibSandboxOrigin+"/"+claim.billCode};
    try{const result=await gateway.client.createBill(id,claim.amountCents);await this.repository.attachBill(id,result.billCode);return{mode:"sandbox",paymentUrl:result.paymentUrl};}
    catch{await this.repository.checkoutUncertain(id);throw accessError("CHECKOUT_REVIEW_REQUIRED",503);}
  }
  async callback(input:unknown){
    const parsed=tuitionPaymentCallback.safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);
    const gateway=await this.gateway(),body=parsed.data;
    if(!verifyToyyibCallback(gateway.secret,body))throw accessError("PAYMENT_SIGNATURE_INVALID",401);
    const invoice=await this.repository.callbackInvoice(body.order_id,body.billcode);
    // Pending/failure callbacks never regress a confirmed invoice or fabricate a receipt.
    if(body.status!=="1")return{acknowledged:true,settled:false};
    if(myrToCents(body.amount)!==invoice.amountCents)throw accessError("PAYMENT_AMOUNT_INVALID",400);
    if(await this.repository.confirmedReference(body.order_id,body.refno,invoice.amountCents))return{acknowledged:true,settled:true};
    if(!await gateway.client.confirmTransaction(body.billcode,body.order_id,body.refno,invoice.amountCents))throw accessError("PAYMENT_NOT_CONFIRMED",409);
    await this.repository.settle(body.order_id,body.refno,invoice.amountCents);return{acknowledged:true,settled:true};
  }
  async recoverConfirmedPayment(actor:string,id:string,input:{billCode:string;providerReference:string;reviewNote:string}){
    const parsed=z.object({billCode:z.string().regex(/^[A-Za-z0-9]{1,32}$/),providerReference:z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),reviewNote:z.string().trim().min(10).max(1000)}).strict().safeParse(input);if(!parsed.success)throw accessError("INVALID_INPUT",400);
    const invoice=await this.repository.recoveryInvoice(actor,id),gateway=await this.gateway(),body=parsed.data;
    if(!await gateway.client.confirmTransaction(body.billCode,id,body.providerReference,invoice.amountCents))throw accessError("PAYMENT_NOT_CONFIRMED",409);
    await this.repository.attachRecoveredBill(actor,id,body.billCode,body.reviewNote);await this.repository.settle(id,body.providerReference,invoice.amountCents);return{recovered:true,mode:"sandbox"};
  }
}
