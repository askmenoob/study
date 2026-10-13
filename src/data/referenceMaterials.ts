import type { LevelId } from "../types";

export interface ReferenceMaterial {
  id: string;
  title: string;
  publisher: "GuruBesar.my" | "KPM";
  url: string;
  kind: "Nota" | "Latihan" | "Percubaan SPM" | "Panduan pentaksiran";
  levelIds: LevelId[];
  subjectIds: string[];
  creditedTo: string;
  originalUrl?: string;
  pageYear: number;
  materialYear: number | null;
  summary: string;
  answerKey: string;
  verification: string;
  checkedOn: string;
  official: boolean;
  reuse: "link-only";
  curriculumReview: string;
}

const community = {
  publisher: "GuruBesar.my", official: false, reuse: "link-only",
  checkedOn: "2026-09-08", curriculumReview: "Belum dipetakan kepada DSKP",
} as const;

// Metadata only: no third-party worksheets, PDFs, images or answer keys are stored.
export const referenceMaterials: ReferenceMaterial[] = [
  {
    ...community, id: "gb-math-d4-practice", title: "Latihan Matematik Tahun 4",
    url: "https://gurubesar.my/latihan-matematik-tahun-4/", kind: "Latihan",
    levelIds: ["d4"], subjectIds: ["math"], creditedTo: "Galeri Cikgu Rozzi",
    pageYear: 2025, materialYear: null,
    summary: "Koleksi latihan Tahun 4 untuk rujukan tambahan selepas belajar dalam Study.",
    answerKey: "Belum disahkan",
    verification: "Halaman dan pautan ZIP boleh dicapai. Isi soalan, jawapan dan tahun bahan belum disemak satu persatu.",
  },
  {
    ...community, id: "gb-math-d4-notes", title: "Nota Ringkas Dan Padat Matematik Tahun 4",
    url: "https://gurubesar.my/nota-ringkas-dan-padat-matematik-tahun-4/", kind: "Nota",
    levelIds: ["d4"], subjectIds: ["math"], creditedTo: "Teacher Collection (kredit pada halaman; pencipta asal belum disahkan)",
    pageYear: 2026, materialYear: null,
    summary: "Nota Matematik Tahun 4 sebagai bacaan tambahan sebelum mencuba latihan.",
    answerKey: "Tidak berkenaan — nota",
    verification: "Tajuk, tahap dan kredit pada halaman telah dibaca. Tahun artikel tidak mengesahkan tahun atau edisi nota.",
  },
  {
    ...community, id: "gb-science-d4-notes", title: "Nota Ringkas Peta Minda Sains Tahun 4",
    url: "https://gurubesar.my/nota-ringkas-peta-minda-sains-tahun-4/", kind: "Nota",
    levelIds: ["d4"], subjectIds: ["science"], creditedTo: "Teacher Collection (kredit pada halaman; pencipta asal belum disahkan)",
    pageYear: 2026, materialYear: null,
    summary: "Peta minda Sains untuk ulang kaji. Semak kesesuaian topik bersama guru.",
    answerKey: "Tidak berkenaan — nota",
    verification: "Halaman rujukan telah dibaca. Isi fail dan pemetaan setiap topik kepada DSKP belum disahkan.",
  },
  {
    ...community, id: "gb-en-d5-starter", title: "Year 5 Starter Unit English Worksheets",
    url: "https://gurubesar.my/year-5-starter-unit-english-worksheets/", kind: "Latihan",
    levelIds: ["d5"], subjectIds: ["en"], creditedTo: "Teacherfiera.com",
    originalUrl: "https://www.teacherfiera.com/year-5-2021-supporting-materials-based-on-the-main-textbook-starter-unit/",
    pageYear: 2025, materialYear: 2021,
    summary: "Worksheet English untuk Starter Unit Tahun 5. Sesetengah aktiviti memerlukan audio atau buku teks.", answerKey: "Pencipta merujuk Teacher’s Book; belum diperiksa",
    verification: "PDF 30 halaman dan halaman pencipta dibaca. Bahan asal untuk 2021; kesesuaian edisi sekolah semasa belum disahkan.",
  },
  {
    ...community, id: "gb-en-d1-writing", title: "Writing Practice Module Primary 1",
    url: "https://gurubesar.my/writing-practice-module-primary-1/", kind: "Latihan",
    levelIds: ["d1"], subjectIds: ["en"], creditedTo: "Teacher Niss",
    pageYear: 2025, materialYear: null,
    summary: "Latihan penulisan English Primary 1 untuk digunakan dengan bimbingan.", answerKey: "Belum disahkan",
    verification: "Halaman dan kredit penyumbang disahkan. Kandungan penuh, kesesuaian aliran sekolah dan skema belum disahkan.",
  },
  {
    ...community, id: "gb-fractions", title: "Nota Padat Matematik Pecahan",
    url: "https://gurubesar.my/nota-padat-matematik-pecahan/", kind: "Nota",
    levelIds: ["d4", "d5", "d6"], subjectIds: ["math"], creditedTo: "Pencipta asal belum dikenal pasti",
    pageYear: 2025, materialYear: null,
    summary: "Bacaan lanjut bagi topik pecahan. Pilihan topik untuk Darjah 4–6 oleh Study; halaman tidak menetapkan darjah khusus.",
    answerKey: "Tidak berkenaan — nota",
    verification: "Halaman bertajuk pecahan telah dibaca. Isi penuh, tahap kesukaran dan keselarasan DSKP belum disahkan.",
  },
  {
    ...community, id: "gb-history-d5-notes", title: "Nota Ringkas Dan Padat Sejarah Tahun 5",
    url: "https://gurubesar.my/nota-ringkas-dan-padat-sejarah-tahun-5/", kind: "Nota",
    levelIds: ["d5"], subjectIds: ["history"], creditedTo: "Teacher Collection (kredit pada halaman; pencipta asal belum disahkan)",
    pageYear: 2026, materialYear: null,
    summary: "Koleksi nota Sejarah Tahun 5 untuk bacaan tambahan.", answerKey: "Tidak berkenaan — nota",
    verification: "Halaman dan pautan ZIP boleh dicapai. Isi arkib, tahun kandungan dan keselarasan topik belum disemak.",
  },
  {
    ...community, id: "gb-science-t5-notes", title: "Nota Ringkas Sains KSSM Tingkatan 5",
    url: "https://gurubesar.my/nota-ringkas-sains-kssm-tingkatan-5/", kind: "Nota",
    levelIds: ["t5"], subjectIds: ["science"], creditedTo: "Cikgu Suhaina, SMK Senai",
    pageYear: 2025, materialYear: 2021,
    summary: "Nota Sains Tingkatan 5. PDF menyatakan tahun 2021 walaupun artikel dikemas kini pada 2025.",
    answerKey: "Tidak berkenaan — nota",
    verification: "PDF 48 halaman dibuka; penyedia dan tahun bahan diperiksa. Ketepatan semua isi belum diaudit.",
  },
  {
    ...community, id: "gb-spm-math-mrsm-2025", title: "Percubaan SPM Matematik MRSM 2025",
    url: "https://gurubesar.my/percubaan-spm-matematik-mrsm-2025/", kind: "Percubaan SPM",
    levelIds: ["t4", "t5"], subjectIds: ["math"], creditedTo: "Bahagian Pendidikan Menengah MARA (kredit pada skema K1)",
    pageYear: 2025, materialYear: 2025,
    summary: "Kertas percubaan Matematik 2025 untuk ulang kaji SPM. Bukan kertas peperiksaan sebenar SPM.",
    answerKey: "Skema K1 dibuka; K2 belum diperiksa",
    verification: "Kertas 1 dan skema K1 boleh dibuka. Padanan setiap jawapan dan kandungan K2 belum disemak.",
  },
  {
    publisher: "KPM", official: true, reuse: "link-only", checkedOn: "2026-09-08",
    id: "kpm-uasa-primary-2025", title: "Format Instrumen UASA Tahap Dua 2025",
    url: "https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/7.%20Format%20Instrumen%20UASA%20Tahap%20Dua%20Sekolah%20Rendah%202025.pdf",
    kind: "Panduan pentaksiran", levelIds: ["d4", "d5", "d6"], subjectIds: ["bm", "en", "math", "science", "history"],
    creditedTo: "Kementerian Pendidikan Malaysia", pageYear: 2025, materialYear: 2025,
    summary: "Rujukan ibu bapa dan guru tentang bentuk pentaksiran Tahun 4–6. Matematik menggunakan soalan subjektif; latihan MCQ Study bukan simulasi UASA penuh.",
    answerKey: "Tidak berkenaan — dokumen format",
    verification: "PDF rasmi edisi 2025 dibaca termasuk bahagian Matematik. Belum disahkan sama ada edisi pengganti 2026 tersedia.",
    curriculumReview: "Panduan format; bukan pengesahan item Study",
  },
  {
    publisher: "KPM", official: true, reuse: "link-only", checkedOn: "2026-09-08",
    id: "kpm-pbd-2019", title: "Panduan Pelaksanaan PBD — Edisi Kedua 2019",
    url: "https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/Panduan%20Pelaksanaan%20Pentaksiran%20Bilik%20Darjah%20Edisi%202%20-%202019.pdf",
    kind: "Panduan pentaksiran", levelIds: ["d1", "d2", "d3", "d4", "d5", "d6", "t1", "t2", "t3", "t4", "t5"], subjectIds: [],
    creditedTo: "Bahagian Pembangunan Kurikulum, KPM", pageYear: 2019, materialYear: 2019,
    summary: "Rujukan guru dan ibu bapa tentang standard serta pertimbangan profesional dalam PBD. Skor latihan Study bukan Tahap Penguasaan rasmi.",
    answerKey: "Tidak berkenaan — panduan guru",
    verification: "Dokumen rasmi telah dibaca. Ini panduan PBD, bukan DSKP lengkap bagi sesuatu subjek atau pengesahan bank soalan Study.",
    curriculumReview: "Rangka semakan; DSKP subjek masih perlu dirujuk",
  },
];

export function findReferences(levelId: LevelId, subjectId: string, query: string): ReferenceMaterial[] {
  const search = query.trim().toLocaleLowerCase("ms-MY");
  return referenceMaterials.filter(r => r.levelIds.includes(levelId)
    && (subjectId === "all" || !r.subjectIds.length || r.subjectIds.includes(subjectId))
    && `${r.title} ${r.summary} ${r.publisher} ${r.creditedTo}`.toLocaleLowerCase("ms-MY").includes(search));
}
