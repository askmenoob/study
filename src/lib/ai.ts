import type { Level, Subject } from "../types";

export interface TutorContext { level: Level; subject?: Subject; topicName?: string }
export interface TutorProvider { ask(message: string, context: TutorContext): Promise<string> }

class LocalTutorProvider implements TutorProvider {
  async ask(message: string, context: TutorContext) {
    const text = message.toLowerCase();
    const prefix = `Untuk ${context.level.label}, kita guna penerangan ringkas.`;
    if (text.includes("pecahan") || text.includes("1/2")) {
      return `${prefix} Bayangkan satu pizza dibahagi sama besar. 1/2 bermaksud ambil 1 daripada 2 bahagian. Jika pizza sama dibahagi 4, bahagian yang sama ialah 2/4. Jadi 1/2 = 2/4.`;
    }
    if (text.includes("algebra") || text.includes("aljabar") || text.includes(" x ")) {
      return `${prefix} Anggap pemboleh ubah seperti kotak yang belum diketahui nilainya. Kita buat operasi yang sama pada kedua-dua belah persamaan supaya kotak itu tinggal sendirian.`;
    }
    if (text.includes("sejarah")) {
      return `${prefix} Untuk sejarah, mula dengan tiga perkara: bila, siapa dan sebab. Selepas itu sambungkan kesan peristiwa supaya fakta tidak dihafal secara terpisah.`;
    }
    return `${prefix} Cuba pecahkan soalan ini kepada perkara yang sudah diketahui, perkara yang ditanya dan satu langkah kecil seterusnya. ${context.topicName ? `Kita sedang belajar topik ${context.topicName}.` : ""}`;
  }
}

export const tutorProvider: TutorProvider = new LocalTutorProvider();
