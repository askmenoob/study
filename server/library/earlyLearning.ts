import type { LibraryUnit, LibraryQuestion } from "./catalog.js";

export type PictureKind = "ball"|"book"|"fish"|"cup"|"pencil"|"leaf"|"eye"|"ear"|"hand"|"plate"|"basket"|"emptyBasket"|"clearCup"|"fractionStrip"|"blocks"|"wash"|"thanks"|"spill"|"sleep"|"bin"|"ask"|"share"|"glyph"|"circle"|"square"|"triangle"|"rectangle"|"oval"|"star";
export interface LearningVisual { label: string; items: Array<{ kind: PictureKind; text?: string; count?: number; color?: "red"|"blue"|"yellow"|"green" }> }
export interface PictureSupport { scene?: LearningVisual; choices: LearningVisual[] }
export interface EarlyFrame { text: string; visual: LearningVisual }

export function validPictureSupport(value: unknown): value is PictureSupport {
  if (!value || typeof value !== "object") return false;
  const support=value as PictureSupport;
  const kinds: PictureKind[]=["ball","book","fish","cup","pencil","leaf","eye","ear","hand","plate","basket","emptyBasket","clearCup","fractionStrip","blocks","wash","thanks","spill","sleep","bin","ask","share","glyph","circle","square","triangle","rectangle","oval","star"];
  const validVisual=(v: LearningVisual) => v && typeof v.label === "string" && v.label.length>0 && v.label.length<=200 && Array.isArray(v.items) && v.items.length>0 && v.items.length<=10 && v.items.every(item=>item&&kinds.includes(item.kind)&&(item.kind!=="glyph"||(typeof item.text==="string"&&item.text.trim().length>0&&Array.from(item.text).length<=8))&&(item.color===undefined||["red","blue","yellow","green"].includes(item.color))&&(item.count===undefined||(Number.isInteger(item.count)&&item.count>=1&&item.count<=10))) && v.items.reduce((n,item)=>n+(item.count??1),0)<=10;
  return Array.isArray(support.choices) && support.choices.length===4 && support.choices.every(validVisual) && (support.scene===undefined||validVisual(support.scene));
}

const picture = (kind: PictureKind, label: string, color?: "red"|"blue"|"yellow"|"green", count = 1): LearningVisual => ({ label, items: [{ kind, color, count }] });
const ball = picture("ball", "Bola", "red"), book = picture("book", "Buku", "blue"), fish = picture("fish", "Ikan", "yellow"), cup = picture("cup", "Cawan", "green");
const wash = picture("wash", "Cuci tangan"), plate = picture("plate", "Ambil sedikit makanan dahulu"), thanks = picture("thanks", "Ucap terima kasih"), spill = picture("spill", "Makanan bertaburan"), ask = picture("ask", "Minta bantuan orang dewasa"), bin = picture("bin", "Buang makanan yang masih elok"), sleep = picture("sleep", "Tidur"), basket = picture("basket", "Simpan blok di dalam bakul"), blocks = picture("blocks", "Blok berselerak di lantai", "yellow", 3), share = picture("share", "Beri rakan giliran bermain");
type Choice = [string, LearningVisual];
const makeQuestion = (prompt: string, choices: Choice[], answer: number, explanation: string, hint: string, scene?: LearningVisual): LibraryQuestion => ({ prompt, options: choices.map(c => c[0]), answer, explanation, hint, support: { scene, choices: choices.map(c => c[1]) } });
const choice = (v: LearningVisual): Choice => [v.label, v];

const definitions: Array<{ subjectId: string; slug: string; title: string; summary: string; frames: EarlyFrame[]; questions: LibraryQuestion[] }> = [
  { subjectId: "bm", slug: "dengar-kenal-benda-v1", title: "Dengar dan Kenal Benda", summary: "Dengar nama empat benda dan padankan dengan gambar.", frames: [
    { text: "Ini bola. Kita boleh menggolek bola.", visual: ball },
    { text: "Ini buku. Kita boleh membuka buku.", visual: book },
    { text: "Ini ikan. Ikan hidup di dalam air.", visual: fish },
    { text: "Ini cawan. Kita boleh mengisi air ke dalam cawan.", visual: cup },
  ], questions: [
    makeQuestion("Tunjuk bola.", [choice(book), choice(ball), choice(cup), choice(fish)], 1, "Ini bola. Bola boleh digolek.", "Dengar nama benda: bola."),
    makeQuestion("Tunjuk buku.", [choice(fish), choice(cup), choice(book), choice(ball)], 2, "Ini buku. Buku mempunyai halaman.", "Dengar nama benda: buku."),
    makeQuestion("Cari gambar ikan.", [choice(fish), choice(book), choice(ball), choice(cup)], 0, "Ini ikan. Ikan hidup di dalam air.", "Dengar nama benda: ikan."),
    makeQuestion("Cari gambar cawan.", [choice(ball), choice(fish), choice(book), choice(cup)], 3, "Ini cawan. Kita boleh mengisinya dengan air.", "Dengar nama benda: cawan."),
    makeQuestion("Benda manakah boleh kita buka untuk membaca?", [choice(cup), choice(book), choice(fish), choice(ball)], 1, "Kita membuka buku untuk membaca.", "Ingat gambar buku dalam pelajaran tadi."),
    makeQuestion("Benda manakah boleh kita golek?", [choice(book), choice(cup), choice(ball), choice(fish)], 2, "Kita boleh menggolek bola di tempat yang selamat.", "Benda ini berbentuk bulat."),
  ] },
  { subjectId: "en", slug: "listen-and-match-colours-v1", title: "Listen and Find a Colour", summary: "Listen to red, blue, yellow and green, then choose a picture.", frames: [
    { text: "This ball is red. Look at the red ball.", visual: picture("ball", "Red ball", "red") },
    { text: "This ball is blue. Look at the blue ball.", visual: picture("ball", "Blue ball", "blue") },
    { text: "This ball is yellow. Look at the yellow ball.", visual: picture("ball", "Yellow ball", "yellow") },
    { text: "This ball is green. Look at the green ball.", visual: picture("ball", "Green ball", "green") },
  ], questions: (() => {
    const red: Choice = ["Red", picture("ball", "Red ball", "red")], blue: Choice = ["Blue", picture("ball", "Blue ball", "blue")], yellow: Choice = ["Yellow", picture("ball", "Yellow ball", "yellow")], green: Choice = ["Green", picture("ball", "Green ball", "green")];
    return [
      makeQuestion("Find the red ball.", [blue, red, green, yellow], 1, "This ball is red.", "Listen again: red."),
      makeQuestion("Find the blue ball.", [yellow, green, blue, red], 2, "This ball is blue.", "Listen again: blue."),
      makeQuestion("Find the yellow ball.", [yellow, red, blue, green], 0, "This ball is yellow.", "Listen again: yellow."),
      makeQuestion("Find the green ball.", [red, blue, yellow, green], 3, "This ball is green.", "Listen again: green."),
      makeQuestion("What colour is this book?", [red, green, blue, yellow], 2, "The book is blue, like the blue ball.", "Match the colour of the book.", picture("book", "Blue book", "blue")),
      makeQuestion("What colour is this cup?", [green, blue, red, yellow], 0, "The cup is green, like the green ball.", "Match the colour of the cup.", picture("cup", "Green cup", "green")),
    ];
  })() },
  { subjectId: "math", slug: "kira-gambar-hingga-sepuluh-v1", title: "Kira Bersama", summary: "Tunjuk objek satu demi satu, kemudian gabung atau ambil satu.", frames: [
    { text: "Tunjuk setiap bola sekali. Satu, dua, tiga. Ada tiga bola.", visual: picture("ball", "Tiga bola", "red", 3) },
    { text: "Ada dua blok biru dan satu blok kuning. Dua tambah satu jadi tiga.", visual: { label: "Dua blok biru dan satu blok kuning", items: [{kind:"blocks",count:2,color:"blue"},{kind:"blocks",count:1,color:"yellow"}] } },
    { text: "Ada lima buku. Jika satu buku diambil, tinggal empat buku. Kita boleh kira semula.", visual: picture("book", "Lima buku", "blue", 5) },
  ], questions: (() => {
    const numbers = (values: number[]): Choice[] => values.map(n => [String(n), picture("ball", `${n} bola`, "red", n)]);
    return [
      makeQuestion("Berapa bola?", numbers([1,2,3,4]), 1, "Kira satu, dua. Ada dua bola.", "Tunjuk setiap bola sekali.", picture("ball", "Dua bola", "blue", 2)),
      makeQuestion("Berapa buku?", numbers([2,4,3,5]), 2, "Kira satu, dua, tiga. Ada tiga buku.", "Kira setiap buku satu demi satu.", picture("book", "Tiga buku", "blue", 3)),
      makeQuestion("Berapa ikan semuanya?", numbers([4,2,5,3]), 0, "Ada empat ikan. Nombor terakhir ialah jumlahnya.", "Kira ikan dari kiri ke kanan.", picture("fish", "Empat ikan", "yellow", 4)),
      makeQuestion("Dua bola merah dan satu bola biru. Berapa semuanya?", numbers([1,4,2,3]), 3, "Dua tambah satu ialah tiga bola.", "Kira kedua-dua warna bersama-sama.", {label:"Dua bola merah dan satu bola biru",items:[{kind:"ball",count:2,color:"red"},{kind:"ball",count:1,color:"blue"}]}),
      makeQuestion("Tiga blok biru dan dua blok kuning. Berapa semuanya?", numbers([4,5,6,3]), 1, "Tiga tambah dua ialah lima blok.", "Kira sambung selepas tiga: empat, lima.", {label:"Tiga blok biru dan dua blok kuning",items:[{kind:"blocks",count:3,color:"blue"},{kind:"blocks",count:2,color:"yellow"}]}),
      makeQuestion("Lima bola. Ambil satu. Berapa yang tinggal?", numbers([3,5,4,6]), 2, "Lima tolak satu tinggal empat bola.", "Tutup satu bola dengan jari, kemudian kira baki.", picture("ball", "Lima bola sebelum satu diambil", "green", 5)),
    ];
  })() },
  { subjectId: "science", slug: "lihat-warna-dan-deria-v1", title: "Lihat dengan Mata", summary: "Perhatikan warna dan pilih deria yang digunakan.", frames: [
    { text: "Kita melihat dengan mata. Lihat daun ini. Warnanya hijau.", visual: picture("leaf", "Daun hijau", "green") },
    { text: "Kita mendengar dengan telinga. Telinga membantu kita mendengar suara.", visual: picture("ear", "Telinga") },
    { text: "Lihat dua bola ini. Satu merah, satu biru. Warnanya berbeza.", visual: {label:"Bola merah dan bola biru",items:[{kind:"ball",color:"red"},{kind:"ball",color:"blue"}]} },
  ], questions: (() => {
    const eye = picture("eye", "Mata"), ear = picture("ear", "Telinga"), hand = picture("hand", "Tangan");
    const colors = ["red","blue","yellow","green"] as const;
    const names = ["Merah","Biru","Kuning","Hijau"];
    const options = colors.map((c,i): Choice => [names[i],picture("ball",names[i],c)]);
    return [
      makeQuestion("Kita melihat dengan apa?", [choice(ear),choice(eye),choice(hand),choice(cup)], 1, "Mata membantu kita melihat warna dan bentuk.", "Ingat anggota badan yang digunakan untuk melihat."),
      makeQuestion("Kita mendengar dengan apa?", [choice(hand),choice(cup),choice(ear),choice(eye)], 2, "Telinga membantu kita mendengar bunyi dan suara.", "Ingat anggota badan yang digunakan untuk mendengar."),
      makeQuestion("Apakah warna daun ini?", options, 3, "Daun dalam gambar ini berwarna hijau.", "Padankan warna daun dengan pilihan gambar.", picture("leaf","Daun hijau","green")),
      makeQuestion("Apakah warna bola ini?", options, 0, "Bola dalam gambar ini berwarna merah.", "Lihat warna bola dalam gambar.", picture("ball","Bola merah","red")),
      makeQuestion("Pilih bola yang sama warna dengan cawan.", options, 1, "Cawan dan bola pilihan ini kedua-duanya biru.", "Bandingkan warnanya, bukan bentuknya.", picture("cup","Cawan biru","blue")),
      makeQuestion("Mahu tahu warna buku ini. Gunakan apa?", [choice(hand),choice(ear),choice(eye),choice(cup)], 2, "Kita menggunakan mata untuk melihat warna buku.", "Warna dapat diperhatikan dengan melihat.", picture("book","Buku kuning","yellow")),
    ];
  })() },
  { subjectId: "islam", slug: "adab-makan-berpandu-v1", title: "Syukur dan Jaga Makanan", summary: "Dengar contoh adab makan dan pilih tindakan yang baik.", frames: [
    { text: "Makanan ialah nikmat daripada Allah. Kita menghargainya. Cuci tangan sebelum makan.", visual: wash },
    { text: "Ambil sedikit makanan dahulu. Jika masih lapar, minta tambahan. Elakkan membazir makanan.", visual: plate },
    { text: "Ucap terima kasih kepada orang yang menyediakan makanan. Jika makanan tumpah, minta bantuan orang dewasa.", visual: thanks },
  ], questions: [
    makeQuestion("Sebelum makan, apa kita buat?", [choice(sleep),choice(wash),choice(spill),choice(bin)],1,"Cuci tangan sebelum makan supaya tangan bersih.","Ingat contoh tangan yang dibasuh."),
    makeQuestion("Mahu mula makan. Pilih cara mengambil makanan.",[choice(spill),choice(bin),choice(plate),choice(sleep)],2,"Ambil sedikit dahulu. Boleh tambah jika masih lapar.","Ambil mengikut keperluan supaya tidak membazir."),
    makeQuestion("Ibu menyediakan makanan. Apa kita ucapkan?",[choice(thanks),choice(sleep),choice(spill),choice(bin)],0,"Ucap terima kasih kepada ibu yang menyediakan makanan.","Pilih ucapan menghargai pertolongan ibu."),
    makeQuestion("Air tumpah. Apakah tindakan yang sesuai?",[choice(sleep),choice(bin),choice(spill),choice(ask)],3,"Minta bantuan orang dewasa membersihkan air yang tumpah.","Lantai basah perlu dibersihkan dengan selamat."),
    makeQuestion("Masih lapar selepas makan. Apa boleh dibuat?",[["Buang makanan elok",bin],["Minta sedikit tambahan",plate],["Tumpahkan air",spill],["Tidur",sleep]],1,"Minta sedikit tambahan apabila masih lapar.","Ingat cara mengambil makanan mengikut keperluan."),
    makeQuestion("Pilih perbuatan yang menjaga nikmat makanan.",[["Taburkan makanan",spill],["Buang makanan elok",bin],["Ambil secukupnya",plate],["Tidur",sleep]],2,"Mengambil secukupnya membantu kita menghargai makanan.","Cari tindakan yang mengelakkan pembaziran."),
  ] },
  { subjectId: "moral", slug: "main-dan-simpan-berpandu-v1", title: "Main, Kongsi dan Simpan", summary: "Dengar situasi bermain dan pilih cara menjaga mainan bersama.", frames: [
    { text: "Mainan kelas digunakan bersama. Beri rakan giliran bermain.", visual: share },
    { text: "Selepas bermain, simpan blok di dalam bakul. Laluan menjadi lapang.", visual: basket },
    { text: "Jika mainan rosak, beritahu guru. Minta izin sebelum membawa mainan kelas pulang.", visual: ask },
  ], questions: [
    makeQuestion("Sudah selesai bermain. Apa kita buat?",[choice(blocks),choice(basket),choice(sleep),choice(spill)],1,"Simpan blok di dalam bakul selepas bermain.","Ingat tempat simpanan blok."),
    makeQuestion("Rakan mahu bermain juga. Apa tindakan baik?",[choice(sleep),choice(bin),choice(share),choice(spill)],2,"Beri rakan giliran menggunakan mainan bersama.","Mainan kelas digunakan oleh ramai murid."),
    makeQuestion("Mainan rosak. Apa patut dibuat?",[choice(ask),choice(sleep),choice(blocks),choice(spill)],0,"Beritahu guru supaya mainan dapat diperiksa.","Minta bantuan orang dewasa."),
    makeQuestion("Di manakah blok disimpan selepas bermain?",[choice(spill),choice(sleep),choice(bin),choice(basket)],3,"Blok disimpan dalam bakul supaya tempat bermain kemas.","Cari gambar blok di dalam bakul."),
    makeQuestion("Mahu membawa mainan kelas pulang. Apa perlu dibuat dahulu?",[["Biarkan blok berselerak",blocks],["Minta izin guru",ask],["Buang mainan",bin],["Tidur",sleep]],1,"Minta izin guru kerana mainan itu digunakan bersama.","Mainan bersama bukan milik seorang murid."),
    makeQuestion("Pilih cara membuat laluan kelas lapang.",[["Tinggalkan blok",blocks],["Tumpahkan air",spill],["Simpan blok",basket],["Tidur",sleep]],2,"Menyimpan blok membantu mengosongkan laluan kelas.","Blok perlu berada di tempat simpanannya."),
  ] },
];

export const earlyFrames: Record<string, EarlyFrame[]> = Object.fromEntries(definitions.map(d => [`library-d1-${d.subjectId}-${d.slug}`, d.frames]));
export const earlyLibraryUnits: LibraryUnit[] = definitions.map(d => ({
  id: `library-d1-${d.subjectId}-${d.slug}`, levelId: "d1", subjectId: d.subjectId,
  note: { title: d.title, summary: d.summary, body: d.frames.map(f => f.text), keyPoints: d.frames.map(f => f.text) },
  reading: { title: `${d.title} · Lihat Bersama`, summary: "Lihat gambar, dengar arahan dan cuba dua aktiviti berpandu.", body: [`${d.title}. ${d.summary}`, "Dengar semula contoh jika perlu. Kamu boleh menunjuk gambar bersama orang dewasa."], questions: d.questions.slice(0,2) },
  practice: { title: `${d.title} · Giliran Kamu`, summary: "Empat aktiviti gambar daripada pelajaran yang sama.", body: [`Mari cuba pelajaran ${d.title}.`, "Pilih satu jawapan. Dengar penerangan selepas memilih, kemudian sambung atau berehat."], questions: d.questions.slice(2) },
}));
