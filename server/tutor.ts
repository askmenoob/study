export type TutorContext = {
  levelId: string;
  subjectId?: string;
  topicId?: string;
  message: string;
};

export type TutorResult = {
  answer: string;
  provider: string;
};

export function answerLocally(ctx: TutorContext): TutorResult {
  const q = ctx.message.toLowerCase();
  let answer = "Cuba pecahkan soalan kepada langkah kecil: kenal pasti apa yang diberi, apa yang ditanya, kemudian pilih konsep yang sesuai. Selepas itu cuba satu contoh mudah dahulu.";

  if (q.includes("pecahan") || q.includes("1/2") || q.includes("fraction")) {
    answer = "Bayangkan satu pizza dibahagi dua. Satu bahagian ialah 1/2. Jika pizza yang sama dibahagi empat, dua bahagian masih meliputi kawasan yang sama, jadi 1/2 = 2/4. Cuba darab pengangka dan penyebut dengan nombor yang sama untuk mencari pecahan setara.";
  } else if (q.includes("darab") || q.includes("multiply")) {
    answer = "Darab ialah penambahan berulang. Contohnya 4 × 3 bermaksud 3 + 3 + 3 + 3 = 12. Untuk nombor besar, pecahkan kepada nilai tempat dan gabungkan semula.";
  }
  if (ctx.levelId.startsWith("d")) {
    answer += " Saya terangkan dengan bahasa mudah dan contoh harian kerana profil ini sekolah rendah.";
  } else if (ctx.levelId === "t6") {
    answer += " Untuk STPM, selepas faham konsep asas, nyatakan istilah dan hujah dengan lebih tepat seperti dalam jawapan peperiksaan.";
  }

  return { answer, provider: "local" };
}
