import { describe,it,expect,vi } from "vitest";
import { createHash } from "node:crypto";
import { verifyToyyibCallback,myrToCents,loadToyyibSandboxConfiguration,ToyyibSandboxClient } from "./toyyibPay.js";
const config={secret:"synthetic_sandbox_secret",category:"testcategory",callbackUrl:"https://study.example.invalid/callback",returnUrl:"https://study.example.invalid/return"};
describe("ToyyibPay sandbox contract; synthetic provider tests only",()=>{
  it("fails closed when sandbox credentials are unavailable or mode is live",async()=>{
    await expect(loadToyyibSandboxConfiguration({})).rejects.toMatchObject({code:"PAYMENTS_NOT_CONFIGURED"});
    await expect(loadToyyibSandboxConfiguration({TOYYIBPAY_MODE:"live"})).rejects.toMatchObject({code:"PAYMENTS_NOT_CONFIGURED"});
  });
  it("validates the documented callback digest and rejects tampered status/order/ref",()=>{
    const fields={status:"1",order_id:"order123",refno:"TP123",hash:createHash("md5").update(config.secret+"1order123TP123ok").digest("hex"),billcode:"testcode",amount:"10.00"};
    expect(verifyToyyibCallback(config.secret,fields)).toBe(true);
    for(const changed of [{status:"3"},{order_id:"other"},{refno:"other"},{hash:"garbage"}])expect(verifyToyyibCallback(config.secret,{...fields,...changed})).toBe(false);
  });
  it("uses exact cents and rejects exponential/negative/overprecise amounts",()=>{
    expect(myrToCents("10.10")).toBe(1010);expect(myrToCents("0.29")).toBe(29);
    for(const bad of ["-1","1e3","10.001","NaN","1,000.00"])expect(()=>myrToCents(bad)).toThrow();
  });
  it("rejects HTTP 200 error bodies without exposing provider text",async()=>{
    for(const response of [new Response("[KEY-DID-NOT-EXIST]"),Response.json({status:"error",msg:"secret"}),Response.json([])]){
      const client=new ToyyibSandboxClient(config,vi.fn(async()=>response) as any);
      await expect(client.createBill("11111111-1111-4111-8111-111111111111",1000)).rejects.toMatchObject({code:"PAYMENT_PROVIDER_REJECTED"});
    }
  });
  it("creates only sandbox URLs without child personal data",async()=>{
    const request=vi.fn(async(_input:string|URL|Request,_init?:RequestInit)=>Response.json([{BillCode:"test1234"}]));const client=new ToyyibSandboxClient(config,request as any);
    expect(await client.createBill("11111111-1111-4111-8111-111111111111",1000)).toEqual({billCode:"test1234",paymentUrl:"https://dev.toyyibpay.com/test1234"});
    expect(request.mock.calls[0][0]).toBe("https://dev.toyyibpay.com/index.php/api/createBill");
  });
  it("requires server-confirmed status, order, invoice and amount",async()=>{
    const order="11111111-1111-4111-8111-111111111111";const client=new ToyyibSandboxClient(config,vi.fn(async()=>Response.json([{billpaymentStatus:"1",billExternalReferenceNo:order,billpaymentInvoiceNo:"TP123",billpaymentAmount:"10.00"}])) as any);
    expect(await client.confirmTransaction("bill123",order,"TP123",1000)).toBe(true);
    expect(await client.confirmTransaction("bill123",order,"TP123",999)).toBe(false);
    expect(await client.confirmTransaction("bill123",order,"wrong",1000)).toBe(false);
  });
});
