import type { LearningResource } from './resources';
import scienceReadingThemes from './scienceReadingThemes.json';

// Theme artwork is decorative. Educational labels and quantities below come
// only from the selected resource, never from the image or attached answers.
export const readingThemes = {
  language: { name: 'Bahasa & cerita', english: 'Language & stories', accent: '#2563eb' },
  mathematics: { name: 'Nombor & pola', english: 'Numbers & patterns', accent: '#7c3aed' },
  nature: { name: 'Alam & kehidupan', english: 'Nature & life', accent: '#15803d' },
  matter: { name: 'Bahan & penyiasatan', english: 'Matter & investigation', accent: '#0e7490' },
  energy: { name: 'Tenaga & gerakan', english: 'Energy & motion', accent: '#b45309' },
  world: { name: 'Bumi & tempat', english: 'Earth & places', accent: '#0369a1' },
  community: { name: 'Manusia & masyarakat', english: 'People & community', accent: '#be185d' },
  heritage: { name: 'Warisan & sumber', english: 'Heritage & sources', accent: '#92400e' },
  faith: { name: 'Nilai & pengajian Islam', english: 'Values & Islamic studies', accent: '#047857' },
  enterprise: { name: 'Ekonomi & pengurusan', english: 'Economy & management', accent: '#4338ca' },
  digital: { name: 'Teknologi & maklumat', english: 'Technology & information', accent: '#0369a1' },
  creative: { name: 'Seni & reka cipta', english: 'Art & creativity', accent: '#be123c' },
  health: { name: 'Sukan & kesejahteraan', english: 'Sport & wellbeing', accent: '#0f766e' },
} as const;
export type ReadingTheme = keyof typeof readingThemes;
const subjectThemes: Record<string, ReadingTheme> = {
  bm:'language', en:'language', bc:'language', bt:'language', ba:'language', lit_en:'language', kmk:'language',
  math:'mathematics', stpm_math:'mathematics', mgmt_math:'mathematics', science:'nature', biology:'nature',
  chemistry:'matter', physics:'energy', geo:'world', history:'heritage', moral:'community', pa:'community',
  islam:'faith', syariah:'faith', usuluddin:'faith', tahfiz:'faith', economics:'enterprise', business:'enterprise',
  accounting:'enterprise', ict:'digital', visual_art:'creative', sports_science:'health',
};
export function readingTheme(resource: Pick<LearningResource,'subjectId'|'title'|'summary'> & Partial<Pick<LearningResource,'unitId'>>): ReadingTheme {
  // Published science has an explicit reviewed unit/topic assignment. A new
  // published unit must be assigned before its coverage test can pass.
  if (resource.subjectId === 'science') {
    const assigned=(scienceReadingThemes as Record<string,ReadingTheme>)[resource.unitId??''];
    if(assigned) return assigned;
    // Teacher-created text has no catalogue unit ID. Its title selects a
    // broad decorative theme; incidental words in its summary are not used.
    const topic = resource.title.toLowerCase();
    if (/\b(?:benih|bercambah|percambahan|tumbuhan|haiwan|hidupan|fotosintesis|daun|ekosistem|nutrien|mikroorganisma)\b/.test(topic)) return 'nature';
    if (/\b(?:elektrik\w*|litar|tenaga|cahaya|bayang\w*|bunyi|daya|geseran|gerakan|magnet\w*|haba|suhu|konduktor|penebat|tekanan|pantulan|pembiasan|kelajuan|inersia|kuasa|tuil|takal|mesin|gelombang)\b/.test(topic)) return 'energy';
    if (/\b(?:bumi|bulan|planet|suria|angkasa|cuaca|batuan|bintang|galaksi|meteor|hakisan)\b/.test(topic)) return 'world';
    if (/\b(?:campuran|larut\w*|kelarutan|asid|alkali|pepejal|cecair|gas|karat\w*|ketumpatan|jirim|penyejatan|pendidihan|kondensasi|pembekuan|pengaratan|polimer|aloi)\b|sifat bahan/.test(topic)) return 'matter';
  }
  return subjectThemes[resource.subjectId] ?? 'language';
}
export const readingArtPath = (theme: ReadingTheme) => `/reading-art/${theme}-v1.webp`;
export function readingFocus(body: readonly string[]) {
  return body.map((paragraph, index) => {
    // Preserve the exact authored words. Truncate at a word boundary without
    // inventing an explanation, ordering, causal link or scientific claim.
    const sentence = paragraph.match(/^.*?[.!?。！？](?:\s|$)/u)?.[0].trim() ?? paragraph;
    const text = sentence.length <= 190 ? sentence : `${sentence.slice(0,190).replace(/\s+\S*$/u,'')}…`;
    return { paragraph: index, text };
  }).filter(point => point.text.trim()).slice(0, 4);
}
export function readingFractions(resource: Pick<LearningResource,'subjectId'> & Partial<Pick<LearningResource,'title'>>, body: readonly string[]) {
  if (!['math','stpm_math','mgmt_math'].includes(resource.subjectId) || !/pecahan|fraction|pengangka|penyebut/i.test(`${resource.title??''} ${body.join(' ')}`)) return [];
  const seen = new Set<string>();
  return [...body.join(' ').matchAll(/(?<![\p{L}\d/.\-−])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/gu)].flatMap(match => {
    const numerator=Number(match[1]), denominator=Number(match[2]), label=`${numerator}/${denominator}`;
    if (denominator<2 || denominator>12 || numerator>denominator || seen.has(label)) return [];
    seen.add(label); return [{ numerator, denominator, label }];
  }).slice(0,4);
}
