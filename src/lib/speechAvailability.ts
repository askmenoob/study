export const AI_SPEECH_TIMEOUT_MS = 50_000;

export class AiSpeechError extends Error {
  constructor(public code: string, public status: number, public retryAfterSeconds?: number) {
    super(code);
  }
}

export function speechFailureMessage(error: unknown): string {
  if (error instanceof AiSpeechError) {
    if (error.code === "TTS_DAILY_QUOTA") return "Had harian suara AI percuma telah habis. Audio baharu boleh dicuba semula selepas quota harian diperbaharui.";
    if (error.status === 429) return "Suara AI sedang mencapai had penggunaan percuma. Cuba lagi kemudian.";
    if (error.status === 401) return "Sesi log masuk telah tamat. Minta ibu bapa buka semula sesi belajar.";
    if (error.code === "TTS_TIMEOUT" || error.status === 504) return "Suara AI mengambil masa terlalu lama. Cuba lagi sebentar nanti.";
  }
  if (error instanceof Error && /AbortError|TimeoutError/.test(error.name)) return "Suara AI mengambil masa terlalu lama. Cuba lagi sebentar nanti.";
  return "Suara AI tidak dapat disediakan sekarang. Cuba lagi sebentar nanti.";
}

/** Some browsers publish their installed voices only after voiceschanged. */
export function waitForDeviceVoice(synth: SpeechSynthesis, language: string, signal: AbortSignal): Promise<SpeechSynthesisVoice | undefined> {
  const match = () => synth.getVoices().find(v => v.lang.toLowerCase().replaceAll("_", "-").split("-")[0] === language.toLowerCase().split("-")[0]);
  if (signal.aborted) return Promise.resolve(undefined);
  const current = match();
  if (current) return Promise.resolve(current);
  return new Promise(resolve => {
    const finish = (voice?: SpeechSynthesisVoice) => {
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", changed);
      signal.removeEventListener("abort", aborted);
      resolve(voice);
    };
    const changed = () => { const voice = match(); if (voice) finish(voice); };
    const aborted = () => finish();
    const timer = setTimeout(() => finish(match()), 1500);
    synth.addEventListener("voiceschanged", changed);
    signal.addEventListener("abort", aborted, { once: true });
    changed();
  });
}
