import { describe, expect, it, vi } from "vitest";
import { guidedTutorReply } from "./tutorService.js";

const base = {levelId:"d4",levelLabel:"Darjah 4",subjectId:"math",subjectLabel:"Matematik",history:[]};
describe("guided tutor service", () => {
  it("minimizes private homework context before a free provider request",async()=>{
    const ask=vi.fn(async(_input:unknown)=>({answer:"Cuba bina satu ayat dahulu.",provider:"gemini-free:test"}));
    const result=await guidedTutorReply({...base,subjectId:"bm",message:"Bantu saya langkah demi langkah",studentName:"ARIF",homework:{id:"private-homework",title:"Ayat ARIF",instructions:"ARIF bina ayat. Hubungi arif@example.com",rubric:"Makna 50, ejaan 50"}},ask);
    const input=ask.mock.calls[0][0] as any;
    expect(input.references[0].excerpt).toContain("Makna 50");expect(input.references[0].excerpt).not.toMatch(/ARIF|example.com/i);
    expect(input).not.toHaveProperty("studentId");expect(result.sources[0].id).toBe("homework:private-homework");
  });
  it("forwards note text and academic history without profile identity to the cloud", async () => {
    const ask = vi.fn(async (_input: unknown) => ({answer:"Samakan penyebut dahulu.",provider:"gemini-free:test",model:"test"}));
    const result = await guidedTutorReply({...base, studentName:"ARIF", resourceId:"library-d4-math-pecahan-bahagian-sama-note", message:"ARIF mahu faham pecahan. arif@example.com"}, ask);
    const input = ask.mock.calls[0]?.[0] as any;
    expect(input.references[0].excerpt).toContain("menambah pengangka");
    expect(input.message).not.toMatch(/ARIF|example.com/i);
    expect(result.sources[0].id).toBe("library-d4-math-pecahan-bahagian-sama-note");
  });
  it("uses deterministic arithmetic without spending an AI request", async () => {
    const ask = vi.fn();
    const result = await guidedTutorReply({...base,message:"10 + 20"},ask);
    expect(result.provider).toBe("verified-math-teach");
    expect(result.answer).not.toContain("30");
    expect(ask).not.toHaveBeenCalled();
  });
  it("rejects a wrong-level source before contacting the provider", async () => {
    const ask = vi.fn();
    await expect(guidedTutorReply({...base,message:"Terangkan",resourceId:"library-t1-math-persamaan-seimbang-note"},ask)).rejects.toThrow("TUTOR_RESOURCE_NOT_AVAILABLE");
    expect(ask).not.toHaveBeenCalled();
  });
  it("keeps original notes available when free quota is exhausted and makes no paid fallback", async () => {
    const ask = vi.fn(async () => {throw new Error("GEMINI_429");});
    const result = await guidedTutorReply({...base,resourceId:"library-d4-math-pecahan-bahagian-sama-note",message:"Kenapa penyebut sama?"},ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("local");
    expect(result.notice).toContain("bukan jawapan daripada AI");
    expect(result.sources).toHaveLength(1);
  });
  it("does not present an unrelated note as supporting a general answer", async () => {
    const ask = vi.fn(async (_input: unknown) => ({answer:"Penerangan umum.",provider:"gemini-free:test",model:"test"}));
    const result = await guidedTutorReply({...base,message:"Bagaimana galaksi terbentuk?"},ask);
    expect(result.support).toBe("general");
    expect(result.sources).toEqual([]);
  });
});
