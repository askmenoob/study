import { libraryResources } from "./library/catalog.js";

export type TutorSource = { id: string; title: string; excerpt: string };
type StudyNote = { id: string; kind: string; title: string; subjectId: string; stages: string[]; levelIds?: string[]; relatedTopicId?: string; body: string[]; keyPoints?: string[] };
const studyNotes: StudyNote[] = [...libraryResources
  .filter(resource => resource.kind === "note" || resource.kind === "reading")
  .map(({ questions: _questions, ...resource }) => resource)];
export const stageForLevel = (levelId: string) => levelId.startsWith("d") ? "KSSR" : levelId === "t6" ? "STPM" : "KSSM";

export function eligibleTutorNotes(levelId: string, subjectId?: string) {
  return studyNotes.filter(note => note.stages.includes(stageForLevel(levelId))
    && Boolean(note.levelIds?.includes(levelId))
    && (!subjectId || note.subjectId === subjectId));
}

const stopWords = new Set("saya awak kamu yang dengan untuk dari dalam itu ini apa ialah adalah cara macam mana bagaimana kenapa boleh sila beri tolong faham belum tahu mahu nak tentang lagi teruskan petunjuk penyelesaian langkah tunjukkan perlukan".split(" "));
function words(text: string) {
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(word => word.length > 2 && !stopWords.has(word));
}
export function selectTutorSources(input: { levelId: string; subjectId?: string; topicId?: string; resourceId?: string; message: string; previousQuestion?: string }): TutorSource[] {
  const eligible = eligibleTutorNotes(input.levelId, input.subjectId);
  const selected = input.resourceId ? eligible.find(note => note.id === input.resourceId) : undefined;
  if (input.resourceId && !selected) throw Object.assign(new Error("TUTOR_RESOURCE_NOT_AVAILABLE"), { statusCode: 400 });
  const terms = words(input.message + " " + (input.previousQuestion ?? ""));
  const ranked = eligible.map(note => {
    const title = note.title.toLowerCase();
    const body = note.body.join(" ").toLowerCase();
    const score = (input.topicId && note.relatedTopicId === input.topicId ? 8 : 0)
      + terms.reduce((sum, term) => sum + (title.includes(term) ? 3 : body.includes(term) ? 1 : 0), 0);
    return { note, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const matches = selected ? [selected] : ranked.slice(0, 2).map(item => item.note);
  return matches.map(note => ({ id: note.id, title: note.title, excerpt: note.body.join("\n\n").slice(0, 1800) }));
}

// Strip known profile identity and common contact identifiers; never send account IDs
// as model context. Arbitrary self-disclosure still needs user-facing privacy guidance.
export function academicText(text: string, studentName?: string) {
  let cleaned = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mel]");
  if (studentName && studentName.trim().length >= 3) {
    const escaped = studentName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp("\\b" + escaped + "\\b", "gi"), "[murid]");
  }
  return cleaned
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mel]")
    .replace(/\b\d{6}-\d{2}-\d{4}\b/g, "[pengenalan]")
    .replace(/(?:\+?60|0)1[0-9][ -]?\d{3,4}[ -]?\d{4}\b/g, "[telefon]");
}
