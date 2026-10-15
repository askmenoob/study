import type { LearningResource } from './resources';

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
export function readingTheme(resource: Pick<LearningResource,'subjectId'|'title'|'summary'>): ReadingTheme {
  // Science spans several domains. Match the authored title/summary, not a
  // stray word elsewhere in a story, and retain a neutral nature default.
  if (resource.subjectId === 'science') {
    const topic = `${resource.title} ${resource.summary}`.toLowerCase();
    if (/elektrik|litar|tenaga|cahaya|bunyi|daya|gerak|magnet|haba/.test(topic)) return 'energy';
    if (/bahan|campuran|larut|asid|alkali|pepejal|cecair|gas|karat/.test(topic)) return 'matter';
    if (/bumi|bulan|planet|suria|angkasa|cuaca/.test(topic)) return 'world';
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
