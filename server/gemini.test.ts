import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY_FILE;
  delete process.env.TTS_CACHE_DIR;
});

describe("Gemini free cloud AI layer", () => {
  it("parses a Gemini tutor answer", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Mari kita faham langkah demi langkah." }] } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { askGeminiTutor } = await import("./gemini.js");
    const result = await askGeminiTutor({ levelLabel:"Darjah 4", stage:"KSSR", subjectLabel:"Matematik", topicLabel:"Pecahan", message:"Apa itu 1/2?" });
    expect(result.answer).toContain("langkah demi langkah");
    expect(result.provider).toContain("gemini-free:");
  });

  it("returns WAV speech and caches it", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const dir = await mkdtemp(path.join(tmpdir(), "imai-study-gemini-tts-"));
    process.env.TTS_CACHE_DIR = dir;
    const pcm = Buffer.from([0,0,1,0,2,0,3,0]);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      candidates:[{content:{parts:[{inlineData:{mimeType:"audio/L16;rate=24000",data:pcm.toString("base64")}}]}}],
    }), { status:200, headers:{"Content-Type":"application/json"} }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateGeminiSpeech } = await import("./gemini.js");
    const first = await generateGeminiSpeech({ text:"Selamat belajar.", language:"ms", style:"lesson" });
    const second = await generateGeminiSpeech({ text:"Selamat belajar.", language:"ms", style:"lesson" });
    expect(first.audio.subarray(0,4).toString()).toBe("RIFF");
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await rm(dir,{recursive:true,force:true});
  });
  it("hides Gemini thought parts and uses minimal thinking for normal questions", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (_url, init:any) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates:[{content:{parts:[
        { thought:true, text:"2-6 paragraphs? Moral value integrated?" },
        { text:"Jawapannya 313. Sebab 10 + 313 = 323." },
      ]}}] }), { status:200, headers:{"Content-Type":"application/json"} });
    }));
    const { askGeminiTutor } = await import("./gemini.js");
    const result = await askGeminiTutor({
      levelLabel:"Darjah 4", stage:"KSSR", subjectLabel:"Matematik",
      history:[{role:"user",text:"10 tambah berapa menjadi 323"},{role:"model",text:"313"}],
      message:"teruskan",
    });
    expect(result.answer).toContain("313");
    expect(result.answer).not.toContain("Moral value");
    expect(sent.generationConfig.thinkingConfig.thinkingLevel).toBe("minimal");
    expect(sent.contents.length).toBe(3);
  });

  it("enforces teach-first tutoring for first-attempt exercises", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (_url, init:any) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates:[{content:{parts:[{text:"Cuba guna operasi songsang dahulu."}]}}] }), { status:200, headers:{"Content-Type":"application/json"} });
    }));
    const { askGeminiTutor } = await import("./gemini.js");
    await askGeminiTutor({ levelLabel:"Darjah 4", stage:"KSSR", subjectLabel:"Matematik", message:"x + 7 = 15, berapa x?" });
    const system = sent.system_instruction.parts[0].text;
    expect(system).toContain("ajar dahulu sebelum memberi jawapan akhir");
    expect(system).toContain("Jangan dedahkan jawapan akhir pada respons pertama");
    expect(system).toContain("operasi yang sama pada kedua-dua belah");
  });


});


describe("grounded tutor boundaries", () => {
  it("supplies the actual selected Study note to the provider", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (_url, init: any) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Samakan penyebut dahulu." }] }, finishReason: "STOP" }] }), { status: 200 });
    }));
    const { askGeminiTutor } = await import("./gemini.js");
    await askGeminiTutor({ levelLabel: "Darjah 4", stage: "KSSR", subjectLabel: "Matematik", message: "Bagaimana tambah pecahan?", references: [{ id: "fraction-note", title: "Nota pecahan Study", excerpt: "Selepas penyebut sama, tambah pengangka sahaja." }] } as any);
    expect(sent.system_instruction.parts[0].text).toContain("Selepas penyebut sama, tambah pengangka sahaja.");
    expect(sent.system_instruction.parts[0].text).toContain("fraction-note");
  });

  it("does not spend three requests retrying a rejected API key", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => new Response('forbidden private details', { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const { askGeminiTutor } = await import("./gemini.js");
    await expect(askGeminiTutor({ levelLabel: "Darjah 4", stage: "KSSR", message: "Apa itu fotosintesis?" })).rejects.toThrow("GEMINI_403");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never displays a provider answer truncated midway through an explanation", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Untuk menambah pecahan, mula dengan" }] }, finishReason: "MAX_TOKENS" }] }), { status: 200 })));
    const { askGeminiTutor } = await import("./gemini.js");
    await expect(askGeminiTutor({ levelLabel: "Darjah 4", stage: "KSSR", message: "Bagaimana tambah pecahan?" })).rejects.toThrow();
  });
});


describe("speech provider failures and concurrency", () => {
  const audioResponse = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from([0, 0, 1, 0]).toString("base64") } }] } }] }), { status: 200 });
  async function setup() {
    process.env.GEMINI_API_KEY = "test-key";
    const dir = await mkdtemp(path.join(tmpdir(), "imai-study-speech-reliability-"));
    process.env.TTS_CACHE_DIR = dir;
    return { dir, ...(await import("./gemini.js")) };
  }

  it("shares one provider request across simultaneous identical speech requests", async () => {
    const { dir, generateGeminiSpeech } = await setup();
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return audioResponse();
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const results = await Promise.all(Array.from({ length: 12 }, () => generateGeminiSpeech({ text: "Mari membaca bersama.", language: "ms" })));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(results.every((result) => result.audio.equals(results[0].audio))).toBe(true);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("honours retry metadata, serves cached audio during cooldown, and resumes after expiry", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const { dir, generateGeminiSpeech, classifyTtsError } = await setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(audioResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "private provider detail", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "90.1s" }] } }), { status: 429, headers: { "Retry-After": "75" } }))
      .mockResolvedValueOnce(audioResponse());
    vi.stubGlobal("fetch", fetchMock);
    try {
      await generateGeminiSpeech({ text: "Audio tersedia.", language: "ms" });
      const failed = await generateGeminiSpeech({ text: "Audio baru.", language: "ms" }).catch((error: unknown) => error);
      expect(classifyTtsError(failed)).toEqual({ code: "TTS_RATE_LIMITED", retryAfterSeconds: 91 });
      expect(String(failed)).toBe("GeminiProviderError: GEMINI_429");
      now += 1_000;
      await expect(generateGeminiSpeech({ text: "Audio ketiga.", language: "ms" })).rejects.toMatchObject({ status: 429, retryAfterSeconds: 90 });
      const cached = await generateGeminiSpeech({ text: "Audio tersedia.", language: "ms" });
      expect(cached.cached).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      now += 90_000;
      await expect(generateGeminiSpeech({ text: "Audio baru.", language: "ms" })).resolves.toMatchObject({ cached: false });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it.each([
    { header: undefined, retry: 60 },
    { header: "9999999", retry: 86400 },
    { header: "0", retry: 1 },
    { header: new Date(1_120_000).toUTCString(), retry: 120 },
  ])("bounds or defaults Retry-After $header without retrying automatically", async ({ header, retry }) => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const { dir, generateGeminiSpeech } = await setup();
    const fetchMock = vi.fn(async () => new Response("private non-JSON details", { status: 429, headers: header ? { "Retry-After": header } : {} }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(generateGeminiSpeech({ text: "Bacaan baru.", language: "ms" })).rejects.toMatchObject({ message: "GEMINI_429", status: 429, retryAfterSeconds: retry });
      await expect(generateGeminiSpeech({ text: "Bacaan lain.", language: "ms" })).rejects.toMatchObject({ status: 429, retryAfterSeconds: retry });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it.each([
    { now: "2026-09-10T12:00:00Z", reset: "2026-09-11T07:00:00Z" },
    { now: "2026-01-10T12:00:00Z", reset: "2026-01-11T08:00:00Z" },
    { now: "2026-03-08T09:00:00Z", reset: "2026-03-09T07:00:00Z" },
    { now: "2026-11-01T08:00:00Z", reset: "2026-11-02T08:00:00Z" },
  ])("uses Pacific midnight for daily quota at $now despite a one-second RetryInfo", async ({ now, reset }) => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    const { dir, generateGeminiSpeech, classifyTtsError } = await setup();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { details: [
      { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "1s" },
    ] } }), { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const error = await generateGeminiSpeech({ text: "Had harian.", language: "ms" }).catch((failure: unknown) => failure);
      const retryAfterSeconds = (Date.parse(reset) - Date.parse(now)) / 1_000;
      expect(classifyTtsError(error)).toEqual({ code: "TTS_DAILY_QUOTA", retryAfterSeconds });
      await expect(generateGeminiSpeech({ text: "Bacaan berbeza.", language: "ms" })).rejects.toMatchObject({ status: 429, quotaScope: "daily", retryAfterSeconds });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("clears failed pending work and does not apply speech cooldown to tutor requests", async () => {
    const { dir, generateGeminiSpeech, askGeminiTutor, classifyTtsError } = await setup();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new DOMException("private timeout detail", "TimeoutError"))
      .mockResolvedValueOnce(audioResponse())
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Mari cuba langkah pertama." }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const failed = await generateGeminiSpeech({ text: "Cuba lagi.", language: "ms" }).catch((error: unknown) => error);
      expect(classifyTtsError(failed)).toEqual({ code: "TTS_TIMEOUT" });
      await expect(generateGeminiSpeech({ text: "Cuba lagi.", language: "ms" })).resolves.toMatchObject({ cached: false });
      await expect(generateGeminiSpeech({ text: "Had audio.", language: "ms" })).rejects.toMatchObject({ status: 429 });
      await expect(askGeminiTutor({ levelLabel: "Darjah 1", stage: "KSSR", message: "Apa itu buku?" })).resolves.toMatchObject({ answer: "Mari cuba langkah pertama." });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
