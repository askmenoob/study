import { additionalTopics } from "./banks";
import type { Level, LevelId, Question, Stage, Subject, Topic } from "../types";
import { libraryUnits, libraryResources } from "../../server/library/catalog";
import { mappedSupplement } from "./banks/unitMapping";

export const levels: Level[] = [
  ...Array.from({ length: 6 }, (_, index) => ({ id: `d${index + 1}` as LevelId, label: `Darjah ${index + 1}`, stage: "KSSR" as Stage, year: index + 1 })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `t${index + 1}` as LevelId, label: `Tingkatan ${index + 1}`, stage: "KSSM" as Stage, year: index + 1 })),
  { id: "t6", label: "Tingkatan 6", stage: "STPM", year: 6 },
];

export const subjects: Subject[] = [
  { id: "bm", name: "Bahasa Melayu", short: "BM", stages: ["KSSR", "KSSM", "STPM"] },
  { id: "en", name: "English", short: "EN", stages: ["KSSR", "KSSM"] },
  { id: "math", name: "Matematik", short: "M", stages: ["KSSR", "KSSM"] },
  { id: "science", name: "Sains", short: "SN", stages: ["KSSR", "KSSM"] },
  { id: "history", name: "Sejarah", short: "SJ", stages: ["KSSR", "KSSM", "STPM"] },
  { id: "geo", name: "Geografi", short: "GF", stages: ["KSSM", "STPM"] },
  { id: "islam", name: "Pendidikan Islam", short: "PI", stages: ["KSSR", "KSSM"] },
  { id: "moral", name: "Pendidikan Moral", short: "PM", stages: ["KSSR", "KSSM"] },
  { id: "pa", name: "Pengajian Am", short: "PA", stages: ["STPM"] },
  { id: "bc", name: "Bahasa Cina", short: "BC", stages: ["STPM"] },
  { id: "bt", name: "Bahasa Tamil", short: "BT", stages: ["STPM"] },
  { id: "ba", name: "Bahasa Arab", short: "BA", stages: ["STPM"] },
  { id: "lit_en", name: "Literature in English", short: "LIE", stages: ["STPM"] },
  { id: "kmk", name: "Kesusasteraan Melayu Komunikatif", short: "KMK", stages: ["STPM"] },
  { id: "syariah", name: "Pengajian Syariah Kontemporari", short: "SY", stages: ["STPM"] },
  { id: "usuluddin", name: "Pengajian Usuluddin", short: "US", stages: ["STPM"] },
  { id: "tahfiz", name: "Tahfiz Al-Quran", short: "TQ", stages: ["STPM"] },
  { id: "economics", name: "Ekonomi", short: "EKO", stages: ["STPM"] },
  { id: "business", name: "Pengajian Perniagaan", short: "PP", stages: ["STPM"] },
  { id: "accounting", name: "Perakaunan", short: "AKA", stages: ["STPM"] },
  { id: "mgmt_math", name: "Management Mathematics", short: "MM", stages: ["STPM"] },
  { id: "stpm_math", name: "Mathematics", short: "MAT", stages: ["STPM"] },
  { id: "ict", name: "Information and Communications Technology", short: "ICT", stages: ["STPM"] },
  { id: "physics", name: "Physics", short: "PHY", stages: ["STPM"] },
  { id: "chemistry", name: "Chemistry", short: "CHEM", stages: ["STPM"] },
  { id: "biology", name: "Biology", short: "BIO", stages: ["STPM"] },
  { id: "sports_science", name: "Sains Sukan", short: "SS", stages: ["STPM"] },
  { id: "visual_art", name: "Seni Visual", short: "SV", stages: ["STPM"] },
];

const q = (id: string, prompt: string, options: string[], answer: number, explanation: string): Question => ({ id, prompt, options, answer, explanation });

const primaryMath: Topic[] = [
  { id: "number", name: "Nombor & Operasi", description: "Nilai tempat, tambah, tolak, darab dan bahagi.", target: 80, questions: [
    q("pm-n1", "Apakah 25 × 4?", ["50", "75", "100", "125"], 2, "25 darab 4 ialah 100."),
    q("pm-n2", "Nilai tempat digit 7 dalam 3,742 ialah...", ["Sa", "Puluh", "Ratus", "Ribu"], 2, "Digit 7 berada pada tempat ratus."),
    q("pm-n3", "840 ÷ 7 =", ["12", "120", "140", "147"], 1, "840 dibahagi 7 ialah 120."),
  ]},
  { id: "fraction", name: "Pecahan, Perpuluhan & Peratus", description: "Pecahan setara dan penukaran bentuk nombor.", target: 80, questions: [
    q("pm-f1", "1/2 + 1/4 =", ["1/6", "2/6", "3/4", "1"], 2, "1/2 = 2/4, jadi 2/4 + 1/4 = 3/4."),
    q("pm-f2", "3/4 dalam perpuluhan ialah...", ["0.25", "0.5", "0.75", "1.25"], 2, "3 ÷ 4 = 0.75."),
    q("pm-f3", "25% bersamaan...", ["1/2", "1/4", "3/4", "1/5"], 1, "25% = 25/100 = 1/4."),
  ]},
  { id: "measure", name: "Masa, Wang & Ukuran", description: "Unit masa, wang, panjang, jisim dan isipadu.", target: 80, questions: [
    q("pm-m1", "2 jam 30 minit = ... minit", ["120", "130", "150", "180"], 2, "2 jam = 120 minit; tambah 30 menjadi 150."),
    q("pm-m2", "RM10.00 − RM3.45 =", ["RM6.45", "RM6.55", "RM7.55", "RM7.45"], 1, "RM10.00 − RM3.45 = RM6.55."),
    q("pm-m3", "1 kilometer = ... meter", ["10", "100", "1000", "10000"], 2, "1 km bersamaan 1000 m."),
  ]},
];

const primaryBm: Topic[] = [
  { id: "grammar", name: "Tatabahasa", description: "Kata nama, kata kerja dan binaan ayat.", target: 80, questions: [
    q("pb-g1", "Pilih kata kerja.", ["cantik", "berlari", "meja", "merah"], 1, "Berlari menunjukkan perbuatan."),
    q("pb-g2", "Ayat yang betul ialah...", ["Ali makan nasi.", "Ali nasi makan.", "Makan Ali nasi.", "Nasi Ali makan."], 0, "Ayat mudah lazimnya menggunakan susunan subjek diikuti predikat."),
    q("pb-g3", "Sinonim bagi 'gembira' ialah...", ["sedih", "marah", "bahagia", "letih"], 2, "Bahagia mempunyai maksud yang hampir sama dengan gembira."),
  ]},
  { id: "comprehension", name: "Pemahaman", description: "Idea utama, inferens dan makna perkataan dalam konteks.", target: 80, questions: [
    q("pb-c1", "Apakah tujuan membaca soalan sebelum petikan?", ["Menghafal jawapan", "Mengetahui maklumat yang perlu dicari", "Melangkau petikan", "Meneka"], 1, "Soalan membantu kita fokus pada maklumat penting dalam petikan."),
    q("pb-c2", "Idea utama ialah...", ["contoh kecil", "isi terpenting sesuatu petikan", "tajuk buku", "nama penulis"], 1, "Idea utama merumuskan perkara terpenting yang dibincangkan."),
    q("pb-c3", "Inferens ialah kesimpulan berdasarkan...", ["tekaan rawak", "petunjuk dan maklumat", "tajuk sahaja", "gambar sahaja"], 1, "Inferens dibuat daripada petunjuk yang terdapat dalam teks."),
  ]},
];

const primaryEnglish: Topic[] = [
  { id: "grammar", name: "Grammar", description: "Sentence structure, verbs and simple tenses.", target: 80, questions: [
    q("pe-g1", "Choose the correct sentence.", ["She go to school.", "She goes to school.", "She going school.", "She gone school."], 1, "For he/she/it in the simple present, the verb usually takes -s."),
    q("pe-g2", "The past tense of 'walk' is...", ["walks", "walking", "walked", "walker"], 2, "Regular verbs usually add -ed in the past tense."),
    q("pe-g3", "Which word is an adjective?", ["quickly", "beautiful", "run", "school"], 1, "Beautiful describes a noun, so it is an adjective."),
  ]},
  { id: "vocab", name: "Vocabulary & Reading", description: "Word meaning and reading clues.", target: 80, questions: [
    q("pe-v1", "A synonym for 'happy' is...", ["angry", "joyful", "tired", "cold"], 1, "Joyful has a similar meaning to happy."),
    q("pe-v2", "An antonym for 'early' is...", ["late", "fast", "young", "near"], 0, "Late is the opposite of early."),
    q("pe-v3", "A main idea tells us...", ["the smallest detail", "what a text is mostly about", "only the title", "the page number"], 1, "The main idea is what the passage is mostly about."),
  ]},
];

const primaryScience: Topic[] = [
  { id: "life", name: "Hidupan & Proses Hidup", description: "Keperluan asas, manusia, haiwan dan tumbuhan.", target: 80, questions: [
    q("ps-l1", "Tumbuhan memerlukan cahaya untuk proses...", ["kondensasi", "fotosintesis", "penyejatan", "peleburan"], 1, "Fotosintesis menggunakan cahaya untuk menghasilkan makanan."),
    q("ps-l2", "Organ utama untuk bernafas ialah...", ["jantung", "peparu", "perut", "buah pinggang"], 1, "Peparu membantu pertukaran gas semasa pernafasan."),
    q("ps-l3", "Antara berikut, yang manakah keperluan asas manusia?", ["mainan", "udara", "telefon", "televisyen"], 1, "Udara ialah keperluan asas untuk hidup."),
  ]},
  { id: "matter", name: "Bahan, Tenaga & Bumi", description: "Sifat bahan, perubahan dan sumber tenaga.", target: 80, questions: [
    q("ps-m1", "Air yang membeku berubah daripada...", ["gas ke pepejal", "cecair ke pepejal", "pepejal ke gas", "cecair ke gas"], 1, "Pembekuan ialah perubahan cecair kepada pepejal."),
    q("ps-m2", "Sumber tenaga utama bagi Bumi ialah...", ["bulan", "matahari", "angin", "tanah"], 1, "Matahari membekalkan sebahagian besar tenaga kepada sistem Bumi."),
    q("ps-m3", "Bahan yang membenarkan cahaya melalui dengan jelas ialah...", ["legap", "lut sinar", "kasar", "magnet"], 1, "Bahan lut sinar membenarkan cahaya melaluinya."),
  ]},
];

const primaryHistory: Topic[] = [
  { id: "malaysia", name: "Kenali Malaysia", description: "Identiti negara, simbol dan warisan.", target: 80, questions: [
    q("ph-m1", "Bendera Malaysia dikenali sebagai...", ["Sang Saka", "Jalur Gemilang", "Bintang Timur", "Seri Negara"], 1, "Nama rasmi bendera Malaysia ialah Jalur Gemilang."),
    q("ph-m2", "Rukun Negara mempunyai berapa prinsip?", ["3", "4", "5", "6"], 2, "Rukun Negara mempunyai lima prinsip."),
    q("ph-m3", "Kajian sejarah menggunakan sumber untuk...", ["mereka cerita", "memahami peristiwa lalu", "meramal cuaca", "mengira wang"], 1, "Sumber sejarah membantu kita memahami dan menilai peristiwa lalu."),
  ]},
];

const faithTopics: Topic[] = [
  { id: "values", name: "Akhlak & Nilai", description: "Amalan baik, tanggungjawab dan adab.", target: 80, questions: [
    q("pf-v1", "Tindakan yang menunjukkan amanah ialah...", ["menyembunyikan barang orang", "memulangkan barang yang dipinjam", "berbohong", "mengabaikan tugas"], 1, "Amanah bermaksud menjaga dan menunaikan tanggungjawab dengan betul."),
    q("pf-v2", "Apabila berbeza pendapat, kita patut...", ["menghina", "mendengar dengan hormat", "menjerit", "menyebar fitnah"], 1, "Menghormati orang lain membantu perbincangan yang baik."),
    q("pf-v3", "Sikap bertanggungjawab bermaksud...", ["menyalahkan orang", "melaksanakan tugas yang diberi", "melengah-lengahkan semua kerja", "mengelak tugas"], 1, "Tanggungjawab melibatkan usaha menunaikan tugas yang diamanahkan."),
  ]},
];

const secondaryMath: Topic[] = [
  { id: "algebra", name: "Algebra", description: "Ungkapan, persamaan dan pola.", target: 80, questions: [
    q("sm-a1", "Jika x + 7 = 15, x =", ["6", "7", "8", "22"], 2, "Tolak 7 pada kedua-dua belah: x = 8."),
    q("sm-a2", "Permudahkan 3a + 2a.", ["5", "5a", "6a", "a"], 1, "Sebutan sejenis boleh dijumlahkan: 3a + 2a = 5a."),
    q("sm-a3", "2(x + 3) =", ["2x + 3", "2x + 6", "x + 6", "6x"], 1, "Gunakan hukum pengembangan: 2×x + 2×3."),
  ]},
  { id: "geometry", name: "Geometri & Ukuran", description: "Sudut, perimeter, luas dan bentuk.", target: 80, questions: [
    q("sm-g1", "Jumlah sudut dalam segi tiga ialah...", ["90°", "180°", "270°", "360°"], 1, "Jumlah sudut dalaman segi tiga ialah 180°."),
    q("sm-g2", "Luas segi empat tepat 8 cm × 5 cm ialah...", ["13 cm²", "26 cm²", "40 cm²", "80 cm²"], 2, "Luas = panjang × lebar = 40 cm²."),
    q("sm-g3", "Sudut tepat bersamaan...", ["45°", "60°", "90°", "180°"], 2, "Sudut tepat ialah 90°."),
  ]},
  { id: "data", name: "Data & Kebarangkalian", description: "Perwakilan data, purata dan kebarangkalian asas.", target: 80, questions: [
    q("sm-d1", "Min bagi 4, 6, 8 ialah...", ["5", "6", "7", "8"], 1, "(4+6+8) ÷ 3 = 6."),
    q("sm-d2", "Kebarangkalian mendapat kepala bagi syiling adil ialah...", ["0", "1/4", "1/2", "1"], 2, "Terdapat dua hasil sama mungkin: kepala atau ekor."),
    q("sm-d3", "Median bagi 2, 3, 9, 10, 12 ialah...", ["3", "9", "10", "12"], 1, "Nilai tengah selepas disusun ialah 9."),
  ]},
];

const secondaryScience: Topic[] = [
  { id: "cell", name: "Sel & Organisasi", description: "Sel, tisu, organ dan sistem badan.", target: 80, questions: [
    q("ss-c1", "Unit asas bagi benda hidup ialah...", ["atom", "sel", "organ", "tisu"], 1, "Sel ialah unit struktur dan fungsi asas benda hidup."),
    q("ss-c2", "Sekumpulan sel yang menjalankan fungsi sama membentuk...", ["organisma", "tisu", "sistem", "molekul"], 1, "Sel yang serupa dan bekerja bersama membentuk tisu."),
    q("ss-c3", "Mitokondrion berkaitan rapat dengan...", ["penghasilan tenaga", "penyimpanan air sahaja", "warna bunga", "pembentukan tulang"], 0, "Mitokondrion terlibat dalam respirasi sel dan penghasilan tenaga."),
  ]},
  { id: "matter", name: "Jirim & Interaksi", description: "Zarah, unsur, sebatian dan perubahan fizikal.", target: 80, questions: [
    q("ss-m1", "Jirim mempunyai...", ["jisim dan memenuhi ruang", "warna sahaja", "haba sahaja", "cahaya sahaja"], 0, "Jirim mempunyai jisim dan memenuhi ruang."),
    q("ss-m2", "Penyejatan berlaku pada...", ["permukaan cecair", "dalam pepejal sahaja", "nukleus atom", "semua logam sahaja"], 0, "Penyejatan ialah perubahan cecair kepada gas di permukaan."),
    q("ss-m3", "Sebatian terbentuk apabila unsur...", ["bercampur secara rawak sahaja", "bergabung secara kimia", "mencair", "disejukkan sahaja"], 1, "Sebatian terbentuk melalui gabungan kimia unsur dalam nisbah tertentu."),
  ]},
];

const secondaryHistory: Topic[] = [
  { id: "melaka", name: "Kesultanan Melayu Melaka", description: "Pentadbiran, perdagangan dan warisan Melaka.", target: 80, questions: [
    q("sh-m1", "Kedudukan Melaka penting kerana terletak berhampiran...", ["Selat Melaka", "Laut Hitam", "Terusan Panama", "Laut Mediterranean"], 0, "Selat Melaka ialah laluan perdagangan penting di rantau ini."),
    q("sh-m2", "Sumber sejarah primer ialah...", ["catatan asal sezaman", "rumusan moden sahaja", "fiksyen", "iklan"], 0, "Sumber primer berasal daripada zaman atau peristiwa yang dikaji."),
    q("sh-m3", "Warisan sejarah penting kerana membantu membina...", ["identiti dan pemahaman masyarakat", "tekaan", "harga barang", "ramalan cuaca"], 0, "Sejarah membantu memahami asal-usul, perubahan dan identiti masyarakat."),
  ]},
];

const secondaryGeo: Topic[] = [
  { id: "map", name: "Peta & Kedudukan", description: "Arah, skala, koordinat dan tafsiran peta.", target: 80, questions: [
    q("sg-m1", "Arah bertentangan dengan timur ialah...", ["utara", "selatan", "barat", "timur laut"], 2, "Barat ialah arah bertentangan dengan timur."),
    q("sg-m2", "Skala peta digunakan untuk menunjukkan...", ["warna", "hubungan jarak peta dengan jarak sebenar", "cuaca sahaja", "masa sahaja"], 1, "Skala membandingkan jarak pada peta dengan jarak sebenar."),
    q("sg-m3", "Garisan lintang utama pada 0° ialah...", ["Khatulistiwa", "Meridian Pangkal", "Garisan Tarikh", "Tropika"], 0, "Khatulistiwa berada pada latitud 0°."),
  ]},
];

const stpmTopics: Record<string, Topic[]> = {
  stpm_math: [{ id: "functions", name: "Functions & Calculus", description: "Functions, differentiation and rate of change.", target: 80, questions: [
    q("st-m1", "Jika f(x)=2x+3, maka f(4)=", ["8", "10", "11", "14"], 2, "f(4)=2(4)+3=11."),
    q("st-m2", "Terbitan bagi x² ialah...", ["x", "2x", "x³", "2"], 1, "Menggunakan hukum kuasa, d(x²)/dx = 2x."),
    q("st-m3", "Kecerunan tangen pada lengkung boleh diperoleh menggunakan...", ["pembezaan", "pengiraan median", "faktor perdana", "jadual kekerapan sahaja"], 0, "Pembezaan memberikan kadar perubahan seketika."),
  ]}],
  bm: [{ id: "language", name: "Bahasa & Wacana", description: "Analisis bahasa, makna dan wacana.", target: 80, questions: [
    q("st-b1", "Wacana yang baik mempunyai...", ["kohesi dan koheren", "ayat rawak", "ejaan sahaja", "tajuk sahaja"], 0, "Kohesi dan koheren membantu kesatuan serta kelancaran idea."),
    q("st-b2", "Semantik mengkaji...", ["bunyi sahaja", "makna", "tulisan tangan", "angka"], 1, "Semantik ialah bidang yang berkaitan dengan makna."),
    q("st-b3", "Register bahasa merujuk kepada...", ["variasi bahasa mengikut situasi", "huruf vokal", "bilangan ayat", "panjang buku"], 0, "Register berubah mengikut konteks, bidang dan peserta komunikasi."),
  ]}],
  history: secondaryHistory,
  geo: secondaryGeo,
  en: primaryEnglish,
};

const secondaryBm: Topic[] = [
  { ...primaryBm[0], description: "Morfologi, sintaksis dan penggunaan bahasa dalam konteks." },
  { ...primaryBm[1], description: "Pemahaman teks, inferens, hujah dan rumusan." },
];
const secondaryEnglish: Topic[] = [
  { ...primaryEnglish[0], description: "Grammar, sentence control and tense accuracy." },
  { ...primaryEnglish[1], description: "Vocabulary, comprehension and inference." },
];

export function getSubjectsForLevel(levelId: LevelId): Subject[] {
  const level = levels.find((item) => item.id === levelId)!;
  return subjects.filter((subject) => {
    if (!subject.stages.includes(level.stage)) return false;
    if (level.stage === "KSSR" && subject.id === "history" && level.year < 4) return false;
    if (level.stage === "STPM" && ["science", "islam", "moral"].includes(subject.id)) return false;
    return true;
  });
}

function getSeedTopics(levelId: LevelId, subjectId: string): Topic[] {
  const level = levels.find((item) => item.id === levelId)!;
  if (level.stage === "STPM") return stpmTopics[subjectId] ?? [];
  if (level.stage === "KSSR") {
    if (subjectId === "math") return primaryMath;
    if (subjectId === "bm") return primaryBm;
    if (subjectId === "en") return primaryEnglish;
    if (subjectId === "science") return primaryScience;
    if (subjectId === "history") return primaryHistory;
    return faithTopics;
  }
  if (subjectId === "math") return secondaryMath;
  if (subjectId === "science") return secondaryScience;
  if (subjectId === "history") return secondaryHistory;
  if (subjectId === "geo") return secondaryGeo;
  if (subjectId === "en") return secondaryEnglish;
  if (subjectId === "bm") return secondaryBm;
  return faithTopics;
}

// Historical objects remain available for migration/audit, not offered as grade mastery content.
export function getArchivedTopics(levelId: LevelId, subjectId: string): Topic[] {
  if (!levels.some(level => level.id === levelId) || !getSubjectsForLevel(levelId).some(subject => subject.id === subjectId)) return [];
  return [...additionalTopics(levelId, subjectId), ...getSeedTopics(levelId, subjectId)];
}

const unitTopics = new Map(libraryUnits.map(unit => [unit.id, {
  id: unit.id, unitId: unit.id, resourceId: `${unit.id}-note`, name: unit.note.title,
  description: unit.note.summary, target: 80,
  questions: libraryResources.filter(r => r.unitId === unit.id).flatMap(resource => (resource.questions ?? []).map((q): Question => ({
    ...q, id: q.id!, prompt: q.support ? q.prompt : `${(resource.readingBody ?? resource.body).join("\n\n")}\n\n${q.prompt}`,
    difficulty: (q.support || resource.kind === "reading" ? 1 : 2) as 1|2,
    resourceIds: [resource.id],
  }))).concat(mappedSupplement(unit.levelId,unit.subjectId,unit.id)),
} satisfies Topic]));

export function getTopics(levelId: LevelId, subjectId: string): Topic[] {
  if (!levels.some(level => level.id === levelId) || !getSubjectsForLevel(levelId).some(subject => subject.id === subjectId)) return [];
  return libraryUnits.filter(unit => unit.levelId === levelId && unit.subjectId === subjectId).map(unit => unitTopics.get(unit.id)!);
}

export const findLevel = (id: LevelId) => levels.find((level) => level.id === id)!;
export const findSubject = (id: string) => subjects.find((subject) => subject.id === id)!;
