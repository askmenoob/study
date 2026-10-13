# IMAI Study Free Cloud AI

Production AI is deliberately free-tier only.

## Provider
- Google Gemini Developer API
- Ordinary tutor questions: `gemini-3.5-flash-lite`, then `gemini-3.1-flash-lite`, then `gemini-3.5-flash`.
- Complex tutor questions: `gemini-3.5-flash`, then the two lite models.
- Supported basic arithmetic, fraction addition/subtraction and simple linear equations use the deterministic local solver without a cloud call.
- Cloud tutor calls have a shared 12-second attempt budget; authentication/configuration failures do not retry other models. Incomplete responses are discarded.
- TTS model: `gemini-3.1-flash-tts-preview`
- Voice: `Sulafat` (warm); Malay is supported by Gemini TTS.

## Billing guard
The dedicated Google Cloud project is `imai-study-free-260908` and billing is disabled. No paid provider fallback exists in the app. Free-tier exhaustion results in an unavailable/fallback state rather than a paid call.

## Privacy
Tutor requests exclude structured account/profile identity fields. They include academic questions and recent dialogue, level, curriculum stage, subject, topic, up to two original Study note excerpts and recent score summaries. Known profile names and common email, phone and MyKad patterns are scrubbed from question/history text before the cloud call. This pattern-based filter cannot guarantee removal of every kind of personal information in free text; the composer reminds students to omit personal information. Existing server-side tutor logs remain, while the new panel does not persist chats in browser localStorage.

The server uses the owned student profile for level and separates recent dialogue by student, conversation, subject, topic and selected resource. Linked third-party pages and official exam answer sets are not supplied as tutor notes. See [Guided Tutor release](TUTOR_GUIDED_RELEASE.md) for the exact scope and validation limits.

## Runtime secret
The API reads the Gemini key from `/run/secrets/gemini_api_key`, mounted from `secrets/gemini-api-key`. Keep the file mode at 600 and never commit it.
