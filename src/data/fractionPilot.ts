import type { LearningResource } from "./resources";

export const fractionPilot: LearningResource = {
  id: "imai-d4-fractions-pilot-2026", kind: "practice", subjectId: "math",
  title: "Pecahan: Cuba Langkah Demi Langkah", stages: ["KSSR"], levelIds: ["d4"],
  summary: "8 soalan original dengan petunjuk dan penerangan. Latihan kefahaman untuk pilot Darjah 4.",
  minutes: 15, relatedTopicId: "fraction", referenceIds: ["gb-fractions", "gb-math-d4-notes"],
  review: "Original IMAI • Belum disemak guru atau dipetakan kepada DSKP. Bukan simulasi UASA.",
  body: [
    "Pecahan membandingkan bahagian dengan satu keseluruhan yang dibahagi sama besar. Penyebut menunjukkan jumlah bahagian sama besar, manakala pengangka menunjukkan bahagian yang dipilih.",
    "Untuk pecahan setara, darab atau bahagi pengangka dan penyebut dengan nombor bukan sifar yang sama. Untuk tambah atau tolak, samakan penyebut dahulu. Contoh: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2.",
    "Cuba kira di atas kertas. Jika tersekat, buka petunjuk sebelum memilih jawapan. Selepas mencuba, baca langkah penyelesaian. Pautan bacaan lanjut ialah rujukan topik; soalan ini ditulis khas untuk Study.",
  ],
  questions: [
    { id: "d4-fr-01", prompt: "Satu jalur dibahagi kepada 6 bahagian sama besar. Empat bahagian diwarnakan. Apakah pecahan bahagian berwarna?", options: ["4/6", "6/4", "2/6", "4/2"], answer: 0, hint: "Kenal pasti jumlah bahagian sebagai penyebut dan bilangan yang berwarna sebagai pengangka.", explanation: "Ada 4 bahagian berwarna daripada 6 bahagian sama besar, jadi pecahannya 4/6. Nilainya juga sama dengan 2/3." },
    { id: "d4-fr-02", prompt: "Pecahan manakah setara dengan 3/4?", options: ["3/8", "6/8", "4/6", "2/4"], answer: 1, hint: "Cuba darab pengangka dan penyebut dengan nombor yang sama.", explanation: "Darab kedua-duanya dengan 2: (3 × 2)/(4 × 2) = 6/8. Menukar penyebut sahaja akan mengubah nilai pecahan." },
    { id: "d4-fr-03", prompt: "Hitung 3/8 + 2/8.", options: ["5/16", "6/8", "5/8", "1/8"], answer: 2, hint: "Penyebut sudah sama. Tambah bilangan bahagian tanpa mengubah saiz setiap bahagian.", explanation: "3/8 + 2/8 = (3 + 2)/8 = 5/8. Penyebut kekal 8 kerana saiz bahagiannya tidak berubah." },
    { id: "d4-fr-04", prompt: "Hitung 7/10 − 3/10 dalam bentuk termudah.", options: ["1/5", "4/20", "1", "2/5"], answer: 3, hint: "Tolak pengangka dahulu, kemudian cari nombor yang boleh membahagi pengangka dan penyebut.", explanation: "7/10 − 3/10 = 4/10. Bahagi pengangka dan penyebut dengan 2 untuk mendapat 2/5." },
    { id: "d4-fr-05", prompt: "Hitung 1/2 + 1/4.", options: ["3/4", "2/6", "1/8", "2/4"], answer: 0, hint: "Tulis satu perdua sebagai pecahan berpenyebut 4 sebelum menambah.", explanation: "1/2 = 2/4. Jadi 2/4 + 1/4 = 3/4. Pengangka dan penyebut tidak boleh ditambah terus serentak." },
    { id: "d4-fr-06", prompt: "Sebiji kek dibahagi kepada 8 bahagian sama besar. Jika 3 bahagian dimakan, apakah pecahan kek yang tinggal?", options: ["3/8", "5/8", "5/3", "8/5"], answer: 1, hint: "Cari dahulu berapa bahagian yang masih tinggal daripada lapan bahagian asal.", explanation: "Bahagian yang tinggal ialah 8 − 3 = 5. Daripada 8 bahagian asal, pecahan yang tinggal ialah 5/8." },
    { id: "d4-fr-07", prompt: "Dua pertiga daripada 18 biji guli berwarna biru. Berapa biji guli biru?", options: ["6 biji", "9 biji", "12 biji", "16 biji"], answer: 2, hint: "Bahagikan guli kepada tiga kumpulan sama banyak. Kemudian ambil dua kumpulan.", explanation: "Satu pertiga daripada 18 ialah 18 ÷ 3 = 6. Dua pertiga ialah 6 × 2 = 12 biji guli." },
    { id: "d4-fr-08", prompt: "Panjang reben ialah 3/4 m. Sebanyak 1/8 m dipotong. Berapa panjang reben yang tinggal?", options: ["2/4 m", "2/8 m", "7/8 m", "5/8 m"], answer: 3, hint: "Samakan kedua-dua penyebut sebelum menolak. Kekalkan unit meter.", explanation: "3/4 m = 6/8 m. Baki reben ialah 6/8 − 1/8 = 5/8 m. Semak bahawa baki lebih pendek daripada panjang asal." },
  ],
};
