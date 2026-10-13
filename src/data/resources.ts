import type { LevelId, Stage } from "../types";
import { fractionPilot } from "./fractionPilot";
import studyNotes from "../../server/studyNotes.json";
import { libraryResources } from "../../server/library/catalog";
export type ResourceKind = "note" | "reading" | "practice";
export interface PracticeQuestion { id?: string; prompt: string; options: string[]; answer: number; explanation: string; hint?: string; evidence?: import("../../server/library/catalog").ReadingEvidence }
export interface LearningResource {
  id: string; kind: ResourceKind; title: string; subjectId: string; stages: ("KSSR"|"KSSM"|"STPM")[];
  summary: string; minutes: number; body: string[]; keyPoints?: string[]; vocabulary?: {term:string; meaning:string}[];
  questions?: PracticeQuestion[]; relatedTopicId?: string;
  levelIds?: LevelId[]; referenceIds?: string[]; review?: string; unitId?: string;
  language?: "ms" | "en" | "zh" | "ta" | "ar";
  curriculum?: import("../../server/library/learningPolicy").UnitCurriculum;
  illustrations?: import("../../server/library/catalog").ReadingIllustration[];
  sourceIds?: string[];
  readingBody?: string[];
}
export interface SourceRegistryItem {
  id:string; name:string; repo:string; license:string; commercial:string; use:string; status:"approved"|"conditional"|"research-only";
}
export const resources: LearningResource[] = [...libraryResources, fractionPilot];
// Retain the original objects and IDs for editorial remapping; no stage-wide fallback.
export const archivedResources: LearningResource[] = [
  ...studyNotes as LearningResource[],
  {id:"bm-practice-library",kind:"practice",title:"Teks Latihan: Perpustakaan Mini Kelas",subjectId:"bm",stages:["KSSR","KSSM"],minutes:8,summary:"Latihan pemahaman berdasarkan petikan pendek original.",body:["Kelas 5 Bestari membina sebuah perpustakaan mini menggunakan rak lama yang dibaiki semula. Setiap murid membawa sebuah buku yang sudah dibaca di rumah. Mereka menyusun buku mengikut kategori dan merekod pinjaman dalam sebuah buku log.","Selepas dua bulan, guru kelas mendapati lebih ramai murid membaca pada waktu rehat. Murid juga belajar menjaga buku bersama dan mengingatkan rakan supaya memulangkan bahan pada waktunya."],questions:[{prompt:"Mengapakah murid membawa buku dari rumah?",options:["Untuk dijual","Untuk menambah koleksi perpustakaan mini","Untuk dibuang","Untuk dihias"],answer:1,explanation:"Buku itu digunakan untuk membina koleksi perpustakaan mini kelas."},{prompt:"Apakah perubahan yang diperhatikan selepas dua bulan?",options:["Rak rosak","Murid kurang membaca","Lebih ramai murid membaca pada waktu rehat","Buku tidak dipinjam"],answer:2,explanation:"Petikan menyatakan lebih ramai murid membaca pada waktu rehat."},{prompt:"Nilai yang ditunjukkan oleh murid ialah...",options:["kerjasama dan tanggungjawab","mementingkan diri","cuai","malas"],answer:0,explanation:"Mereka berkongsi buku, menjaga koleksi dan mengingatkan rakan."}]},
  {id:"en-practice-robot",kind:"practice",title:"Reading Practice: The Library Robot",subjectId:"en",stages:["KSSR","KSSM"],minutes:8,summary:"Short original comprehension text with three questions.",body:["The school library received a small robot that could move books from the return desk to a sorting area. At first, some students thought the robot would replace the librarian. The librarian explained that the robot only handled repetitive carrying tasks.","Because the robot saved time, the librarian spent more time helping students find reliable information, choose suitable books and learn how to search the catalogue."],questions:[{prompt:"What task did the robot mainly perform?",options:["Teaching classes","Carrying returned books","Writing stories","Repairing computers"],answer:1,explanation:"The robot moved returned books to a sorting area."},{prompt:"Why did the librarian have more time for students?",options:["The library closed","Students stopped borrowing","The robot handled repetitive carrying","There were fewer books"],answer:2,explanation:"Automating a repetitive task freed time for student support."},{prompt:"The passage suggests technology is most useful when it...",options:["removes all people","supports people in useful work","avoids learning","replaces every task"],answer:1,explanation:"The robot supported the librarian rather than replacing the role."}]},
  {id:"math-practice-word",kind:"practice",title:"Latihan Matematik: Masalah Harian",subjectId:"math",stages:["KSSR"],levelIds:["d4","d5","d6"],minutes:7,summary:"Latihan menyelesaikan masalah menggunakan situasi wang dan pecahan.",body:["Baca setiap situasi, kenal pasti maklumat penting dan tentukan operasi yang sesuai sebelum mengira."],questions:[{prompt:"Sara mempunyai RM20 dan membeli buku RM7.50. Baki ialah...",options:["RM12.50","RM13.50","RM27.50","RM11.50"],answer:0,explanation:"RM20.00 − RM7.50 = RM12.50."},{prompt:"Satu kek dipotong 8 sama besar. 3 bahagian dimakan. Pecahan yang tinggal ialah...",options:["3/8","5/8","5/3","8/5"],answer:1,explanation:"8 bahagian − 3 bahagian = 5 bahagian, jadi 5/8 tinggal."},{prompt:"4 botol masing-masing 750 mL mengandungi jumlah...",options:["1 L","2 L","3 L","4 L"],answer:2,explanation:"4 × 750 mL = 3000 mL = 3 L."}],relatedTopicId:"measure"},
  {id:"stpm-practice-function",kind:"practice",title:"STPM Quick Practice: Functions",subjectId:"stpm_math",stages:["STPM"],minutes:8,summary:"Latihan ringkas fungsi dan kadar perubahan untuk semakan pantas.",body:["Gunakan notasi fungsi dengan teliti dan tunjukkan penggantian nilai sebelum memilih jawapan."],questions:[{prompt:"Jika f(x)=3x−2, f(5)=",options:["10","13","15","17"],answer:1,explanation:"f(5)=3(5)−2=13."},{prompt:"Terbitan bagi 4x³ ialah...",options:["4x²","12x²","12x³","3x²"],answer:1,explanation:"Menggunakan hukum kuasa: 4 × 3x² = 12x²."},{prompt:"Jika kadar perubahan positif, fungsi secara setempat...",options:["menurun","meningkat","malar semestinya","tiada domain"],answer:1,explanation:"Terbitan positif menunjukkan fungsi meningkat pada julat tersebut."}],relatedTopicId:"functions"},
];
export const sourceRegistry: SourceRegistryItem[] = [
  {id:"malaysia-prompts",name:"Malaysian Teachers AI Prompt Library",repo:"https://github.com/lerlerchan/Prompt-libraries-for-Malaysia-Educators",license:"MIT",commercial:"Ya",use:"Corak prompt KSSR/KSSM, konteks Malaysia dan idea penjanaan latihan.",status:"approved"},
  {id:"oatutor",name:"OATutor-Content",repo:"https://github.com/CAHLR/OATutor-Content",license:"Per-item metadata (contoh CC BY 4.0)",commercial:"Bersyarat: hanya item berlesen komersial dengan attribution",use:"Struktur problem bank, hints, scaffolds dan latihan; import mesti semak lesen setiap item.",status:"conditional"},
  {id:"pratham",name:"Pratham Books source",repo:"https://github.com/global-asp/pb-source",license:"Per-story Creative Commons / Public Domain metadata",commercial:"Bersyarat: ikut lesen setiap cerita",use:"Sumber bacaan terbuka; import hanya cerita yang lesen individunya membenarkan penggunaan komersial dan attribution disimpan.",status:"conditional"},
  {id:"clusive",name:"Clusive",repo:"https://github.com/cast-org/clusive",license:"BSD 3-Clause (code)",commercial:"Ya untuk code; content ikut lesen masing-masing",use:"Rujukan UX reader: read-aloud, font/spacing, library search, glossary dan annotation.",status:"approved"},
  {id:"openstax-mirror",name:"OpenStax Textbook Mirrors",repo:"https://github.com/philschatz/textbooks",license:"Mixed CC BY / CC BY-NC-SA",commercial:"Bersyarat",use:"Rujukan nota terbuka. Import hanya buku/section yang disahkan CC BY; bahan NC tidak dibawa ke produk jualan.",status:"conditional"},
  {id:"superdskp",name:"SuperDSKP",repo:"https://github.com/hedarchion/superdskp",license:"Belum disahkan",commercial:"Tidak digunakan",use:"Research-only untuk struktur DSKP Bahasa Inggeris KSSM sehingga lesen penggunaan semula jelas.",status:"research-only"},
  {id:"kssm-sk",name:"KSSM Sains Komputer",repo:"https://github.com/theluqmn/kssm-sk",license:"Belum disahkan",commercial:"Tidak digunakan",use:"Research-only untuk organisasi nota/aktiviti Sains Komputer; tiada kandungan disalin.",status:"research-only"},
];
export const kindLabels: Record<ResourceKind,string> = { note:"Nota", reading:"Bacaan", practice:"Teks Latihan" };
export const isResourceForLevel = (resource: LearningResource, levelId: LevelId, stage: Stage) =>
  resource.stages.includes(stage) && Boolean(resource.levelIds?.includes(levelId));

const normalizeSearch = (text: string) => text.normalize("NFKC").toLocaleLowerCase("ms-MY").trim().replace(/\s+/g, " ");
const resourceSearch = new Map(resources.map(resource => [resource.id, normalizeSearch([
  resource.title, resource.summary, ...resource.body, ...(resource.keyPoints ?? []),
  ...(resource.vocabulary ?? []).flatMap(word => [word.term, word.meaning]),
].join(" "))]));
export function findLearningResources(input: {
  levelId: LevelId; stage: Stage; subjectId?: string; kind?: ResourceKind;
  query?: string; savedIds?: ReadonlySet<string>;
}): LearningResource[] {
  const terms = normalizeSearch(input.query ?? "").split(" ").filter(Boolean);
  return resources.filter(resource => isResourceForLevel(resource, input.levelId, input.stage)
    && (!input.subjectId || input.subjectId === "all" || resource.subjectId === input.subjectId)
    && (!input.kind || resource.kind === input.kind)
    && (!input.savedIds || input.savedIds.has(resource.id))
    && terms.every(term => resourceSearch.get(resource.id)?.includes(term)));
}
