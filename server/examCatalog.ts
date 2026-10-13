import type { ExamLevel, ExamPrivatePaper, ExamPrivateQuestion } from "./examContracts.js";

// Server-only, newly authored on 2026-09-09. No third-party question text,
// diagrams, answer keys or marking schemes are imported. These small fixtures
// exercise revision mechanics; they are not licensed past papers or full exams.
type Item = Omit<ExamPrivateQuestion, "retry">;
type Draft = Omit<Item, "id" | "number" | "skillId" | "skillName" | "note">;
type NoteText = readonly [title: string, body: string, example: string];

function numeric(prompt: string, answer: number, solution: string[], unit?: string): Draft {
  return { prompt, kind:"numeric", key:{numeric:answer, tolerance:1e-9}, solution,
    autoMarks:1, manualMarks:0, rubric:[], ...(unit ? {unit} : {}) };
}
function structured(prompt: string, answer: number, solution: string[], unit: string, steps: readonly [string,string]): Draft {
  return { ...numeric(prompt, answer, solution, unit), kind:"structured", manualMarks:2,
    rubric:steps.map((description,i) => ({id:`step-${i+1}`, description, marks:1})) };
}
function choice(prompt: string, values: string[], choiceId: string, solution: string[]): Draft {
  return {prompt, kind:"choice", options:values.map((text,i) => ({id:"abcd"[i],text})),
    key:{choiceId}, solution, autoMarks:1, manualMarks:0, rubric:[]};
}
function pair(pack: string, number: number, skill: string, name: string, note: NoteText, first: Draft, retry: Draft): ExamPrivateQuestion {
  const make = (draft: Draft, suffix: string): Item => {
    const id = `${pack}-q${number}${suffix}`;
    return {...draft, id, number:`${number}${suffix ? "R" : ""}`, skillId:`${pack}-${skill}`, skillName:name,
      note:{id:`${id}-note`,title:note[0],body:note[1],example:note[2]}};
  };
  return {...make(first,""),retry:make(retry,"-retry")};
}
function pack(id: string, levels: ExamLevel[], label: string, questions: ExamPrivateQuestion[]): ExamPrivatePaper {
  return {id:`original-${id}-math-preview`,version:1,title:`Preview original Matematik ${label}`,
    exam:id === "spm" ? "SPM" : "UASA",levelIds:levels,subjectId:"math",durationMinutes:id === "spm" ? 25 : 20,
    scopeLabel:"Preview 6 soalan original; bukan kertas peperiksaan sebenar atau set penuh; belum disemak guru.",
    source:{kind:"original",provider:"Study IMAI — original berbantukan AI",year:null,url:null,rights:"owned",
      rightsEvidence:`Dikarang baharu untuk projek Study IMAI pada 2026-09-09 menggunakan bantuan AI: 6 soalan ${label}, 6 alternatif retry, penyelesaian, nota dan rubrik. Tiada soalan/skema/rajah pihak ketiga diimport atau disalin. Rekod authoring dan batas tuntutan: docs/EXAM_SOURCE_AUDIT.md. Status owned ialah provenance authoring projek, bukan pengesahan copyright eksklusif atau kelulusan pendidik.`,
      review:"pending",reviewer:null,reviewedAt:null},questions};
}

const d4 = [
  pair("d4",1,"add-fractions","Tambah pecahan",
    ["Samakan penyebut", "Penyebut menunjukkan saiz bahagian. Tukar kepada pecahan setara dengan penyebut yang sama sebelum menambah pengangka. Penyebut tidak ditambah.", "Contoh: 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2."],
    numeric("Hitung 3/8 + 1/4. Beri jawapan sebagai pecahan atau perpuluhan.",0.625,["1/4 = 2/8.","3/8 + 2/8 = 5/8.","Jawapan: 5/8 = 0.625."]),
    numeric("Hitung 2/5 + 1/10. Beri jawapan sebagai pecahan atau perpuluhan.",0.5,["2/5 = 4/10.","4/10 + 1/10 = 5/10 = 1/2.","Jawapan: 1/2 = 0.5."])),
  pair("d4",2,"add-decimals","Tambah perpuluhan",
    ["Jajarkan titik perpuluhan", "Tulis digit yang sama nilai tempat dalam lajur yang sama. Tambah sifar di hujung bahagian perpuluhan jika perlu; nilai nombor tidak berubah.", "Contoh: 2.35 + 1.4 = 2.35 + 1.40 = 3.75."],
    numeric("Hitung 4.75 + 2.6.",7.35,["Tulis 2.6 sebagai 2.60.","4.75 + 2.60 = 7.35.","Jawapan: 7.35."]),
    numeric("Hitung 6.08 + 1.7.",7.78,["Tulis 1.7 sebagai 1.70.","6.08 + 1.70 = 7.78.","Jawapan: 7.78."])),
  pair("d4",3,"place-value","Nilai digit",
    ["Digit dan nilai tempat", "Nilai digit bergantung pada kedudukannya. Dari kanan: sa, puluh, ratus, ribu dan puluh ribu. Darab digit dengan nilai tempatnya.", "Contoh: digit 7 dalam 27 431 bernilai 7 × 1000 = 7000."],
    numeric("Apakah nilai digit 6 dalam nombor 46 215? Tulis nilainya dalam angka.",6000,["Digit 6 berada di tempat ribu.","6 × 1000 = 6000.","Jawapan: 6000."]),
    numeric("Apakah nilai digit 8 dalam nombor 32 846? Tulis nilainya dalam angka.",800,["Digit 8 berada di tempat ratus.","8 × 100 = 800.","Jawapan: 800."])),
  pair("d4",4,"fraction-quantity","Pecahan daripada kuantiti",
    ["Bahagi dahulu, kemudian darab", "Untuk mencari a/b daripada sesuatu kuantiti, bahagi kuantiti dengan b, kemudian darab dengan a. Penyebut menunjukkan bilangan bahagian yang sama besar.", "Contoh: 2/5 daripada 30 = (30 ÷ 5) × 2 = 12."],
    numeric("Sebuah kotak mengandungi 28 kad. Sebanyak 3/4 daripada kad itu berwarna hijau. Berapa keping kad hijau?",21,["28 ÷ 4 = 7 keping bagi setiap bahagian.","7 × 3 = 21.","Jawapan: 21 keping."],"keping"),
    numeric("Sebuah sampul mengandungi 36 pelekat. Sebanyak 2/3 daripadanya berwarna biru. Berapa keping pelekat biru?",24,["36 ÷ 3 = 12 keping bagi setiap bahagian.","12 × 2 = 24.","Jawapan: 24 keping."],"keping")),
  pair("d4",5,"change","Wang: jumlah dan baki",
    ["Cari jumlah belanja dahulu", "Darab harga satu barang dengan bilangan barang. Baki wang ialah wang dibayar ditolak jumlah belanja. Simpan dua tempat perpuluhan semasa menulis wang.", "Contoh: 3 buku pada RM2.40 berjumlah RM7.20. Baki daripada RM10 ialah RM2.80."],
    structured("Hana membeli 4 buku nota pada harga RM3.60 setiap satu. Dia membayar RM20. Berapakah baki wangnya? Tunjukkan jalan kerja.",5.6,["Jumlah belanja = 4 × RM3.60 = RM14.40.","Baki = RM20.00 − RM14.40 = RM5.60.","Jawapan: RM5.60."],"RM",["Menulis 4 × RM3.60 dan memperoleh jumlah belanja RM14.40.","Menulis baki sebagai RM20.00 − RM14.40 sebelum jawapan akhir."]),
    structured("Farid membeli 6 batang pen pada harga RM2.75 setiap satu. Dia membayar RM20. Berapakah baki wangnya? Tunjukkan jalan kerja.",3.5,["Jumlah belanja = 6 × RM2.75 = RM16.50.","Baki = RM20.00 − RM16.50 = RM3.50.","Jawapan: RM3.50."],"RM",["Menulis 6 × RM2.75 dan memperoleh jumlah belanja RM16.50.","Menulis baki sebagai RM20.00 − RM16.50 sebelum jawapan akhir."])),
  pair("d4",6,"rectangle-area","Luas segi empat tepat",
    ["Luas mengira petak unit", "Luas segi empat tepat = panjang × lebar. Kedua-dua ukuran mesti dalam unit yang sama. Luas dalam sentimeter persegi ditulis cm², berbeza daripada perimeter.", "Contoh: panjang 6 cm dan lebar 4 cm memberi luas 6 × 4 = 24 cm²."],
    structured("Sekeping kad berbentuk segi empat tepat mempunyai panjang 12 cm dan lebar 7 cm. Hitung luasnya. Tunjukkan formula dan penggantian nilai.",84,["Luas = panjang × lebar.","Luas = 12 × 7 = 84.","Jawapan: 84 cm²."],"cm²",["Menulis formula luas = panjang × lebar.","Menggantikan ukuran dengan 12 × 7, bukan menambah sisi."]),
    structured("Sekeping label berbentuk segi empat tepat mempunyai panjang 9 cm dan lebar 8 cm. Hitung luasnya. Tunjukkan formula dan penggantian nilai.",72,["Luas = panjang × lebar.","Luas = 9 × 8 = 72.","Jawapan: 72 cm²."],"cm²",["Menulis formula luas = panjang × lebar.","Menggantikan ukuran dengan 9 × 8, bukan menambah sisi."])),
];

const d5 = [
  pair("d5",1,"multiply-fractions","Darab pecahan",
    ["Darab pengangka dan penyebut", "Untuk mendarab pecahan, darab kedua-dua pengangka dan kedua-dua penyebut. Ringkaskan jawapan dengan membahagi pengangka dan penyebut dengan faktor sepunya.", "Contoh: 2/3 × 3/8 = 6/24 = 1/4."],
    numeric("Hitung 3/4 × 2/3. Beri jawapan sebagai pecahan atau perpuluhan.",0.5,["3/4 × 2/3 = (3 × 2)/(4 × 3) = 6/12.","6/12 = 1/2.","Jawapan: 1/2 = 0.5."]),
    numeric("Hitung 5/6 × 3/4. Beri jawapan sebagai pecahan atau perpuluhan.",0.625,["5/6 × 3/4 = (5 × 3)/(6 × 4) = 15/24.","15/24 = 5/8.","Jawapan: 5/8 = 0.625."])),
  pair("d5",2,"divide-decimals","Bahagi perpuluhan",
    ["Bahagi mengikut nilai tempat", "Bahagikan setiap nilai tempat dengan teliti. Semak hasil bahagi dengan mendarab jawapan dengan pembahagi; hasilnya mesti kembali kepada nombor asal.", "Contoh: 6.3 ÷ 3 = 2.1. Semakan: 2.1 × 3 = 6.3."],
    numeric("Hitung 8.4 ÷ 4.",2.1,["8.4 ialah 84 persepuluh. 84 ÷ 4 = 21 persepuluh.","21 persepuluh = 2.1; semakan 2.1 × 4 = 8.4.","Jawapan: 2.1."]),
    numeric("Hitung 9.75 ÷ 5.",1.95,["9.75 ialah 975 perseratus. 975 ÷ 5 = 195 perseratus.","195 perseratus = 1.95; semakan 1.95 × 5 = 9.75.","Jawapan: 1.95."])),
  pair("d5",3,"percent-fraction","Peratus kepada pecahan",
    ["Peratus bermaksud daripada seratus", "Tulis peratus sebagai pecahan berpenyebut 100. Bahagikan pengangka dan penyebut dengan faktor sepunya untuk mendapatkan pecahan termudah.", "Contoh: 60% = 60/100 = 3/5."],
    numeric("Tukar 25% kepada pecahan atau perpuluhan.",0.25,["25% = 25/100.","Bahagi pengangka dan penyebut dengan 25: 25/100 = 1/4.","Jawapan: 1/4 = 0.25."]),
    numeric("Tukar 40% kepada pecahan atau perpuluhan.",0.4,["40% = 40/100.","Bahagi pengangka dan penyebut dengan 20: 40/100 = 2/5.","Jawapan: 2/5 = 0.4."])),
  pair("d5",4,"percent-quantity","Peratus daripada kuantiti",
    ["Tukar peratus sebelum darab", "Untuk mencari p% daripada kuantiti, darab p/100 dengan kuantiti itu. Jawapan yang dicari ialah kuantiti, bukannya peratus asal.", "Contoh: 10% daripada 90 = 10/100 × 90 = 9."],
    numeric("Kelab mempunyai 150 lencana. Sebanyak 20% daripadanya berwarna merah. Berapa bilangan lencana merah?",30,["20% = 20/100 = 1/5.","1/5 × 150 = 30.","Jawapan: 30 lencana."],"lencana"),
    numeric("Kelab mempunyai 240 lencana. Sebanyak 30% daripadanya berwarna kuning. Berapa bilangan lencana kuning?",72,["30% = 30/100 = 3/10.","3/10 × 240 = 72.","Jawapan: 72 lencana."],"lencana")),
  pair("d5",5,"liquid-volume","Isi padu cecair",
    ["Jumlah isi padu dan baki", "Darab isi padu sebotol dengan bilangan botol. Tolak cecair yang digunakan daripada jumlah itu. Semua isi padu mesti menggunakan unit yang sama sebelum dikira.", "Contoh: 4 botol × 1.5 l = 6 l. Selepas 2 l digunakan, baki = 4 l."],
    structured("Ada 6 botol jus, setiap satu berisi 1.25 l. Sebanyak 0.75 l jus digunakan. Hitung baki jus dalam liter. Tunjukkan jalan kerja.",6.75,["Jumlah jus = 6 × 1.25 = 7.50 l.","Baki = 7.50 − 0.75 = 6.75 l.","Jawapan: 6.75 l."],"l",["Mengira jumlah awal 6 × 1.25 = 7.50 l.","Membentuk operasi baki 7.50 − 0.75 dengan unit yang sama."]),
    structured("Ada 4 bekas air, setiap satu berisi 2.4 l. Sebanyak 1.6 l air digunakan. Hitung baki air dalam liter. Tunjukkan jalan kerja.",8,["Jumlah air = 4 × 2.4 = 9.6 l.","Baki = 9.6 − 1.6 = 8 l.","Jawapan: 8 l."],"l",["Mengira jumlah awal 4 × 2.4 = 9.6 l.","Membentuk operasi baki 9.6 − 1.6 dengan unit yang sama."])),
  pair("d5",6,"triangle-area","Luas segi tiga",
    ["Gunakan tinggi serenjang", "Luas segi tiga = 1/2 × tapak × tinggi serenjang. Tinggi mestilah bersudut tegak dengan tapak; panjang sisi condong tidak semestinya tinggi.", "Contoh: tapak 10 cm dan tinggi serenjang 6 cm memberi luas 1/2 × 10 × 6 = 30 cm²."],
    structured("Sebuah segi tiga mempunyai tapak 12 cm dan tinggi serenjang 9 cm. Hitung luasnya. Tunjukkan formula dan penggantian nilai.",54,["Luas = 1/2 × tapak × tinggi serenjang.","Luas = 1/2 × 12 × 9 = 54.","Jawapan: 54 cm²."],"cm²",["Menulis formula luas = 1/2 × tapak × tinggi serenjang.","Menggantikan nilai dengan 1/2 × 12 × 9."]),
    structured("Sebuah segi tiga mempunyai tapak 16 cm dan tinggi serenjang 5 cm. Hitung luasnya. Tunjukkan formula dan penggantian nilai.",40,["Luas = 1/2 × tapak × tinggi serenjang.","Luas = 1/2 × 16 × 5 = 40.","Jawapan: 40 cm²."],"cm²",["Menulis formula luas = 1/2 × tapak × tinggi serenjang.","Menggantikan nilai dengan 1/2 × 16 × 5."])),
];

const d6 = [
  pair("d6",1,"divide-fractions","Bahagi pecahan",
    ["Darab dengan salingan", "Apabila membahagi dengan pecahan bukan sifar, darab pecahan pertama dengan salingan pecahan kedua. Semak sama ada hasil masuk akal: pembahagi kurang daripada 1 boleh menghasilkan jawapan lebih besar.", "Contoh: 2/3 ÷ 1/4 = 2/3 × 4/1 = 8/3."],
    numeric("Hitung 3/4 ÷ 1/2. Beri jawapan sebagai pecahan atau perpuluhan.",1.5,["3/4 ÷ 1/2 = 3/4 × 2/1.","6/4 = 3/2.","Jawapan: 3/2 = 1.5."]),
    numeric("Hitung 5/6 ÷ 1/3. Beri jawapan sebagai pecahan atau perpuluhan.",2.5,["5/6 ÷ 1/3 = 5/6 × 3/1.","15/6 = 5/2.","Jawapan: 5/2 = 2.5."])),
  pair("d6",2,"multiply-decimals","Darab perpuluhan",
    ["Kira tempat perpuluhan", "Darab seolah-olah nombor bulat, kemudian letakkan titik mengikut jumlah tempat perpuluhan kedua-dua faktor. Anggarkan dahulu untuk mengesan jawapan yang tersasar sepuluh kali ganda.", "Contoh: 1.5 × 0.4 = 0.60 = 0.6."],
    numeric("Hitung 2.75 × 1.2.",3.3,["275 × 12 = 3300.","Ada 3 tempat perpuluhan: 3300 ÷ 1000 = 3.300.","Jawapan: 3.3."]),
    numeric("Hitung 1.25 × 2.4.",3,["125 × 24 = 3000.","Ada 3 tempat perpuluhan: 3000 ÷ 1000 = 3.000.","Jawapan: 3."])),
  pair("d6",3,"ratio-sharing","Nisbah dan pembahagian",
    ["Jumlahkan bahagian nisbah", "Jumlah bahagian ialah jumlah nombor dalam nisbah. Bahagi jumlah objek dengan jumlah bahagian untuk mendapatkan nilai satu bahagian, kemudian darab dengan bahagian yang dikehendaki.", "Contoh: nisbah merah:biru 1:3 dengan 20 manik memberi 20 ÷ 4 = 5 manik merah."],
    numeric("Nisbah manik merah kepada manik biru ialah 2:3. Jumlah manik ialah 25. Berapa biji manik merah?",10,["Jumlah bahagian = 2 + 3 = 5; satu bahagian = 25 ÷ 5 = 5.","Manik merah = 2 × 5 = 10.","Jawapan: 10 biji."],"biji"),
    numeric("Nisbah manik hijau kepada manik putih ialah 3:5. Jumlah manik ialah 40. Berapa biji manik hijau?",15,["Jumlah bahagian = 3 + 5 = 8; satu bahagian = 40 ÷ 8 = 5.","Manik hijau = 3 × 5 = 15.","Jawapan: 15 biji."],"biji")),
  pair("d6",4,"mean","Purata data",
    ["Jumlah dibahagi bilangan data", "Purata diperoleh dengan membahagi jumlah semua nilai dengan bilangan nilai. Kira bilangan data dengan teliti, termasuk nilai yang berulang.", "Contoh: purata 4, 6 dan 8 ialah (4 + 6 + 8) ÷ 3 = 6."],
    numeric("Cari purata bagi 6, 8, 10 dan 12.",9,["Jumlah = 6 + 8 + 10 + 12 = 36.","Ada 4 nilai; purata = 36 ÷ 4 = 9.","Jawapan: 9."]),
    numeric("Cari purata bagi 10, 12, 14 dan 16.",13,["Jumlah = 10 + 12 + 14 + 16 = 52.","Ada 4 nilai; purata = 52 ÷ 4 = 13.","Jawapan: 13."])),
  pair("d6",5,"speed-distance","Laju, masa dan jarak",
    ["Samakan unit masa", "Jarak = laju × masa. Jika laju diberi dalam km/j, masa perlu dalam jam. Tukar minit kepada jam dengan membahagi 60, kemudian darab dengan laju.", "Contoh: 30 minit = 0.5 jam; pada 60 km/j, jarak = 60 × 0.5 = 30 km."],
    structured("Sebuah bas bergerak pada laju tetap 48 km/j selama 1 jam 30 minit. Hitung jarak perjalanan dalam km. Tunjukkan jalan kerja.",72,["1 jam 30 minit = 1 + 30/60 = 1.5 jam.","Jarak = 48 × 1.5 = 72 km.","Jawapan: 72 km."],"km",["Menukar 1 jam 30 minit kepada 1.5 jam.","Menggunakan jarak = laju × masa dan menggantikan 48 × 1.5."]),
    structured("Sebuah van bergerak pada laju tetap 40 km/j selama 2 jam 15 minit. Hitung jarak perjalanan dalam km. Tunjukkan jalan kerja.",90,["2 jam 15 minit = 2 + 15/60 = 2.25 jam.","Jarak = 40 × 2.25 = 90 km.","Jawapan: 90 km."],"km",["Menukar 2 jam 15 minit kepada 2.25 jam.","Menggunakan jarak = laju × masa dan menggantikan 40 × 2.25."])),
  pair("d6",6,"discount","Diskaun dan harga akhir",
    ["Bezakan diskaun dengan harga akhir", "Nilai diskaun = kadar diskaun × harga asal. Harga selepas diskaun ialah harga asal ditolak nilai diskaun. Semak jenis jawapan yang diminta.", "Contoh: diskaun 10% pada RM50 ialah RM5; harga akhir ialah RM45."],
    structured("Sebuah beg berharga RM80 mendapat diskaun 15%. Tiada caj lain. Hitung harga selepas diskaun. Tunjukkan jalan kerja.",68,["Diskaun = 15/100 × RM80 = RM12.","Harga akhir = RM80 − RM12 = RM68.","Jawapan: RM68.00."],"RM",["Mengira nilai diskaun 15/100 × RM80 = RM12.","Menulis harga akhir sebagai RM80 − RM12."]),
    structured("Sepasang kasut berharga RM150 mendapat diskaun 20%. Tiada caj lain. Hitung harga selepas diskaun. Tunjukkan jalan kerja.",120,["Diskaun = 20/100 × RM150 = RM30.","Harga akhir = RM150 − RM30 = RM120.","Jawapan: RM120.00."],"RM",["Mengira nilai diskaun 20/100 × RM150 = RM30.","Menulis harga akhir sebagai RM150 − RM30."])),
];

const spm = [
  pair("spm",1,"quadratic-roots","Punca persamaan kuadratik",
    ["Faktorkan sebelum memilih punca", "Jika hasil darab dua faktor ialah sifar, sekurang-kurangnya satu faktor bernilai sifar. Cari kedua-dua punca, kemudian pilih punca yang memenuhi arahan soalan.", "Contoh: x² − 7x + 10 = (x − 2)(x − 5) = 0 memberi x = 2 atau 5."],
    numeric("Diberi x² − 5x + 6 = 0. Nyatakan punca yang lebih kecil.",2,["x² − 5x + 6 = (x − 2)(x − 3).","x = 2 atau x = 3; punca lebih kecil ialah 2.","Jawapan: 2."]),
    numeric("Diberi x² − 7x + 12 = 0. Nyatakan punca yang lebih kecil.",3,["x² − 7x + 12 = (x − 3)(x − 4).","x = 3 atau x = 4; punca lebih kecil ialah 3.","Jawapan: 3."])),
  pair("spm",2,"dependent-probability","Kebarangkalian tanpa pengembalian",
    ["Kemas kini bilangan selepas cabutan", "Tanpa pengembalian, jumlah objek dan bilangan objek yang dikehendaki berubah selepas cabutan pertama. Darab kebarangkalian pertama dengan kebarangkalian kedua yang bersyarat pada kejadian pertama.", "Contoh: 2 kad merah daripada 4 kad; peluang dua merah tanpa pengembalian = 2/4 × 1/3 = 1/6."],
    numeric("Beg mengandungi 3 bola merah dan 2 bola biru yang sama saiz. Dua bola dipilih secara rawak tanpa pengembalian. Cari kebarangkalian kedua-duanya merah.",0.3,["P(merah pertama) = 3/5.","Selepas bola merah diambil, tinggal 2 merah daripada 4 bola: P(merah kedua | merah pertama) = 2/4.","P(kedua-duanya merah) = 3/5 × 2/4 = 3/10.","Jawapan: 3/10 = 0.3."]),
    numeric("Beg mengandungi 4 bola merah dan 2 bola hijau yang sama saiz. Dua bola dipilih secara rawak tanpa pengembalian. Cari kebarangkalian kedua-duanya merah.",0.4,["P(merah pertama) = 4/6.","Selepas bola merah diambil, tinggal 3 merah daripada 5 bola: P(merah kedua | merah pertama) = 3/5.","P(kedua-duanya merah) = 4/6 × 3/5 = 2/5.","Jawapan: 2/5 = 0.4."])),
  pair("spm",3,"gradient","Kecerunan garis lurus",
    ["Perubahan y dibahagi perubahan x", "Kecerunan m = (y₂ − y₁)/(x₂ − x₁). Gunakan susunan titik yang sama pada pengangka dan penyebut. Formula ini memerlukan x₂ berbeza daripada x₁.", "Contoh: titik (0,1) dan (4,9) memberi m = (9 − 1)/(4 − 0) = 2."],
    choice("Cari kecerunan garis lurus melalui titik (1,2) dan (5,4).",["0.25","0.5","2","4"],"b",["m = (4 − 2)/(5 − 1) = 2/4.","2/4 = 0.5, iaitu pilihan B.","Jawapan: B — 0.5."]),
    choice("Cari kecerunan garis lurus melalui titik (2,1) dan (6,7).",["0.5","1","1.5","2"],"c",["m = (7 − 1)/(6 − 2) = 6/4.","6/4 = 1.5, iaitu pilihan C.","Jawapan: C — 1.5."])),
  pair("spm",4,"standard-form","Pengiraan bentuk piawai",
    ["Bahagi pekali dan kuasa sepuluh", "Untuk membahagi nombor dalam bentuk piawai, bahagi pekali dan tolak indeks kuasa sepuluh. Jika diminta nombor biasa, selesaikan nilai kuasa itu pada akhir.", "Contoh: (6 × 10⁴) ÷ (2 × 10²) = 3 × 10² = 300."],
    numeric("Hitung (3.2 × 10⁴) ÷ (8 × 10²). Beri jawapan sebagai nombor biasa.",40,["(3.2 ÷ 8) × 10^(4 − 2) = 0.4 × 10².","0.4 × 100 = 40.","Jawapan: 40."]),
    numeric("Hitung (4.5 × 10⁵) ÷ (9 × 10³). Beri jawapan sebagai nombor biasa.",50,["(4.5 ÷ 9) × 10^(5 − 3) = 0.5 × 10².","0.5 × 100 = 50.","Jawapan: 50."])),
  pair("spm",5,"simple-interest","Faedah mudah dan nilai matang",
    ["Faedah mudah menggunakan prinsipal asal", "Faedah mudah I = Prt, dengan r dalam perpuluhan dan t dalam tahun. Nilai matang = P + I. Formula ini tidak menggunakan faedah kompaun.", "Contoh: P = RM1000, r = 0.02, t = 3 memberi I = RM60 dan nilai matang RM1060."],
    structured("Dalam model faedah mudah, RM2000 disimpan pada kadar 3% setahun selama 2 tahun. Tiada transaksi atau caj lain. Hitung nilai matang. Tunjukkan jalan kerja.",2120,["I = Prt = 2000 × 0.03 × 2 = RM120.","Nilai matang = RM2000 + RM120 = RM2120.","Jawapan: RM2120.00."],"RM",["Menggunakan I = Prt dengan 2000 × 0.03 × 2 dan mendapat RM120.","Menulis nilai matang = prinsipal + faedah = RM2000 + RM120."]),
    structured("Dalam model faedah mudah, RM1500 disimpan pada kadar 4% setahun selama 3 tahun. Tiada transaksi atau caj lain. Hitung nilai matang. Tunjukkan jalan kerja.",1680,["I = Prt = 1500 × 0.04 × 3 = RM180.","Nilai matang = RM1500 + RM180 = RM1680.","Jawapan: RM1680.00."],"RM",["Menggunakan I = Prt dengan 1500 × 0.04 × 3 dan mendapat RM180.","Menulis nilai matang = prinsipal + faedah = RM1500 + RM180."])),
  pair("spm",6,"pythagoras","Teorem Pythagoras",
    ["Kenal pasti hipotenus", "Dalam segi tiga bersudut tegak, kuasa dua hipotenus sama dengan jumlah kuasa dua dua sisi serenjang. Panjang ialah nilai positif; ambil punca kuasa dua selepas menjumlahkan kuasa dua.", "Contoh: sisi serenjang 6 cm dan 8 cm memberi hipotenus √(36 + 64) = 10 cm."],
    structured("Dua sisi yang bertemu pada sudut tegak sebuah segi tiga panjangnya 5 cm dan 12 cm. Hitung panjang hipotenus. Tunjukkan jalan kerja.",13,["c² = 5² + 12² = 25 + 144 = 169.","c = √169 = 13; panjang mestilah positif.","Jawapan: 13 cm."],"cm",["Menggunakan c² = 5² + 12² untuk hipotenus.","Mengira jumlah 169 dan menulis c = √169 sebelum jawapan akhir."]),
    structured("Dua sisi yang bertemu pada sudut tegak sebuah segi tiga panjangnya 8 cm dan 15 cm. Hitung panjang hipotenus. Tunjukkan jalan kerja.",17,["c² = 8² + 15² = 64 + 225 = 289.","c = √289 = 17; panjang mestilah positif.","Jawapan: 17 cm."],"cm",["Menggunakan c² = 8² + 15² untuk hipotenus.","Mengira jumlah 289 dan menulis c = √289 sebelum jawapan akhir."])),
];

export const EXAM_PAPERS: ExamPrivatePaper[] = [
  pack("d4",["d4"],"Darjah 4",d4),
  pack("d5",["d5"],"Darjah 5",d5),
  pack("d6",["d6"],"Darjah 6",d6),
  pack("spm",["t4","t5"],"SPM Tingkatan 4/5",spm),
];
