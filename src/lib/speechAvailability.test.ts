import { afterEach, expect, it, vi } from "vitest";
import { AiSpeechError, speechFailureMessage, waitForDeviceVoice } from "./speechAvailability";

afterEach(() => vi.useRealTimers());

function device() {
  let voices: SpeechSynthesisVoice[] = [];
  const events = new EventTarget();
  const synth = Object.assign(events, { getVoices: () => voices }) as unknown as SpeechSynthesis;
  return { synth, publish: (lang: string) => { voices = [{ lang } as SpeechSynthesisVoice]; events.dispatchEvent(new Event("voiceschanged")); } };
}

it("uses a matching voice that the browser loads after the first lookup", async () => {
  const d = device();
  const result = waitForDeviceVoice(d.synth, "ms", new AbortController().signal);
  d.publish("ms-MY");
  expect((await result)?.lang).toBe("ms-MY");
});

it("does not substitute an unrelated language or wait forever", async () => {
  vi.useFakeTimers();
  const d = device(); d.publish("en-US");
  const result = waitForDeviceVoice(d.synth, "ms", new AbortController().signal);
  await vi.advanceTimersByTimeAsync(1500);
  expect(await result).toBeUndefined();
});

it("cancels voice discovery when the learner stops audio", async () => {
  const d = device(), controller = new AbortController();
  const result = waitForDeviceVoice(d.synth, "ms", controller.signal);
  controller.abort(); d.publish("ms-MY");
  expect(await result).toBeUndefined();
});

it("explains rate limits and expired login without blaming language support", () => {
  expect(speechFailureMessage(new AiSpeechError("TTS_DAILY_QUOTA", 429, 7200))).toContain("Had harian");
  expect(speechFailureMessage(new AiSpeechError("TTS_RATE_LIMITED", 429, 60))).toContain("had penggunaan percuma");
  expect(speechFailureMessage(new AiSpeechError("UNAUTHORIZED", 401))).toContain("log masuk");
  expect(speechFailureMessage(new AiSpeechError("TTS_TIMEOUT", 504))).toContain("terlalu lama");
});
