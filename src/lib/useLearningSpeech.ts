import { useCallback, useEffect, useRef, useState } from "react";
import { getAiSpeech } from "./api";
import { AI_SPEECH_TIMEOUT_MS, speechFailureMessage, waitForDeviceVoice } from "./speechAvailability";

/** Reuses Study's configured free speech service. No provider keys or new paid calls. */
export function useLearningSpeech(language: string = "ms", enabled = true) {
  const request = useRef(0), audio = useRef<HTMLAudioElement | null>(null), url = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const cancel = useCallback(() => {
    request.current++; pending.current?.abort(); audio.current?.pause(); audio.current = null;
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => cancel, [cancel]);
  const stop = useCallback(() => { cancel(); setBusy(false); setMessage(""); }, [cancel]);
  const speak = useCallback(async (text: string) => {
    cancel(); setMessage("");
    if (!enabled) { setBusy(false); return; }
    setBusy(true);
    const current = request.current;
    const controller = new AbortController(); pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), AI_SPEECH_TIMEOUT_MS);
    try {
      if (!["ms","en"].includes(language)) throw new Error("Use a matching device voice");
      const result = await getAiSpeech({ text: (text.trim().length < 2 ? `${text}.` : text).slice(0,6000), language: language as "ms"|"en", style: "lesson" }, controller.signal);
      if (current !== request.current) return;
      url.current = URL.createObjectURL(result.blob);
      const player = new Audio(url.current); audio.current = player;
      player.onerror = () => { if (current === request.current) setMessage("Audio tidak dapat dimainkan. Cuba lagi atau minta orang dewasa membacakan."); };
      await player.play();
    } catch (error) {
      if (current !== request.current) return;
      clearTimeout(timeout);
      const fallback = new AbortController(); pending.current = fallback;
      const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
      const voice = synth ? await waitForDeviceVoice(synth, language, fallback.signal) : undefined;
      if (current !== request.current) return;
      if (voice && typeof SpeechSynthesisUtterance !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = .85;
        utterance.onerror = () => { if (current === request.current) setMessage("Suara peranti tidak dapat dimainkan. Minta orang dewasa membacakan."); };
        setMessage("Menggunakan suara peranti sementara suara AI tidak tersedia.");
        window.speechSynthesis.speak(utterance);
      } else setMessage(`${["ms", "en"].includes(language) ? speechFailureMessage(error) : "Suara untuk bahasa ini belum tersedia."} Suara peranti untuk bahasa ini juga belum tersedia.`);
    } finally { clearTimeout(timeout); if (current === request.current) setBusy(false); }
  }, [cancel, language, enabled]);
  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);
  return { speak, stop, busy, message };
}
