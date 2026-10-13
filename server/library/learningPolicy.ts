export type LearningGrade = `d${1|2|3|4|5|6}` | `t${1|2|3|4|5|6}`;

// Product session recommendations, not KPM assessment requirements or official TP scores.
export function learningPolicy(levelId: string) {
  const early = levelId === "d1";
  const maximum = early ? 6 : levelId === "d2" ? 12 : levelId === "d3" ? 16 : /^d[456]$/.test(levelId) ? 24 : 40;
  return {
    maximum, breakEvery: early ? 3 : maximum <= 16 ? 4 : 10,
    approach: early ? "Dengar, lihat dan cuba" : /^d[23]$/.test(levelId) ? "Baca pendek dan cuba berpandu" : /^d/.test(levelId) ? "Fahami konsep dan terangkan langkah" : levelId === "t6" ? "Analisis, hujah dan aplikasi STPM" : "Hubungkan konsep dan selesaikan masalah",
    assessment: /^d[123]$/.test(levelId) ? "Semak kefahaman" : "Ulang kaji unit",
  };
}

export const curriculumReferences = {
  pbd: { title: "KPM · Panduan Pentaksiran Bilik Darjah, Edisi 2 (2019)", url: "https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/Panduan%20Pelaksanaan%20Pentaksiran%20Bilik%20Darjah%20Edisi%202%20-%202019.pdf" },
  earlyLanguages: { title: "KPM · Penjajaran BM dan BI Tahap I (2025)", url: "https://www.moe.gov.my/surat-siaran-kpm-bil-1-tahun-2025-pelaksanaan-dokumen-penjajaran-kurikulum-standard-sekolah-rendah-semakan-2017" },
  stpm: { title: "MPM · Sukatan STPM yang dimurnikan", url: "https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan" },
  stpmMathematics: { title: "MPM · Mathematics 954, Semester 2, hasil pembelajaran 8.2 dan 9.3 (2026)", url: "https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan?args%5B0%5D=a9241797c4e460c1edada9b51a400707&element=7bedb034-a982-4a7b-950c-ec33cea388fc&format=raw&item_id=303&method=download&task=callelement" },
};

export interface UnitCurriculum {
  coverage: "selected-unit";
  objectives: string[];
  prerequisite: string;
  standardMapping: "pending"|"partial";
  standardCodes: string[];
  semester: 1|2|3|null;
  teacherReview: "pending";
  // These documents guide assessment/design. They are NOT a claim of verified SK/SP mapping.
  designReferences: Array<keyof typeof curriculumReferences>;
}

export function unitCurriculum(levelId: string, subjectId: string, objectives: string[], unitId?: string): UnitCurriculum {
  const calculus = unitId === "library-t6-stpm_math-stationary-and-area-v2";
  return {
    coverage: "selected-unit", objectives,
    prerequisite: levelId === "d1" ? "Boleh menunjuk atau memilih gambar, sendiri atau bersama orang dewasa. Membaca belum diperlukan."
      : levelId === "t6" ? "Semak istilah dan contoh asas dalam nota unit sebelum membuat analisis."
      : "Mulakan dengan contoh dalam nota unit. Gunakan bacaan suara jika perlu.",
    standardMapping: calculus ? "partial" : "pending", standardCodes: calculus ? ["954/2 8.2(a)","954/2 8.2(b)","954/2 9.3(a)"] : [], semester: calculus ? 2 : null, teacherReview: "pending",
    designReferences: calculus ? ["stpmMathematics"] : levelId === "t6" ? ["stpm"] : /^d[123]$/.test(levelId) && ["bm", "en"].includes(subjectId) ? ["pbd", "earlyLanguages"] : ["pbd"],
  };
}
