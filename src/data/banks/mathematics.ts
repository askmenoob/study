import type { LevelId } from "../../types";
import { bankTopic, type BankRow, type LevelBank } from "./helpers";

function numeric(key: string, prompt: string, value: number, explanation: string, unit = ""): BankRow {
  const format = (n: number) => `${Number(n.toFixed(4))}${unit}`;
  const offsets = [-3, -2, -1, 1, 2, 3];
  const start = [...key].reduce((sum,char) => sum + char.charCodeAt(0), 0) % offsets.length;
  const alternatives = offsets.map((_,index) => value + offsets[(start + index) % offsets.length]).filter(n => n >= 0).slice(0,3).map(format);
  return [key, prompt, format(value), alternatives as [string,string,string], explanation];
}
const money = (cents: number) => `RM${(cents / 100).toFixed(2)}`;
export const mathematicsBank: LevelBank = {};
for (let year = 1; year <= 6; year++) {
  const level = `d${year}` as LevelId;
  const operations: BankRow[] = [], applications: BankRow[] = [], patterns: BankRow[] = [];
  for (let i = 1; i <= 16; i++) {
    const a = year === 1 ? i : year === 2 ? 20 + i : year === 3 ? 120 + i : year === 4 ? 1200 + i : year === 5 ? 12000 + i : 120000 + i;
    const b = year === 1 ? 1 + i % 3 : year === 2 ? 10 + i % 7 : 20 + i % 11;
    operations.push(numeric(`add-${i}`, `${a} + ${b} = ?`, a + b, `Tambah ${b} kepada ${a}. Jumlahnya ialah ${a + b}.`));
    operations.push(numeric(`subtract-${i}`, `${a + b} − ${b} = ?`, a, `Tolak ${b} daripada ${a + b}. Baki ialah ${a}. Semak: ${a} + ${b} = ${a + b}.`));
    if (year <= 2) {
      const cents = year === 1 ? 10 * i : 100 + 10 * i;
      const extra = year === 1 ? 10 : 50;
      applications.push(numeric(`coins-${i}`, `Aina ada ${cents} sen. Dia menerima ${extra} sen lagi. Berapakah jumlah wangnya dalam sen?`, cents + extra, `${cents} + ${extra} = ${cents + extra}. Jadi jumlah wang ialah ${cents + extra} sen.`, " sen"));
      const step = year;
      const start = (year === 1 ? 1 : 40) + i;
      patterns.push(numeric(`sequence-${i}`, `Lengkapkan pola tambah ${step}: ${start}, ${start + step}, ${start + 2 * step}, __.`, start + 3 * step, `Setiap nombor bertambah ${step}. ${start + 2 * step} + ${step} = ${start + 3 * step}.`));
    } else {
      const packs = i + year, perPack = year + 2;
      applications.push(numeric(`packs-${i}`, `Terdapat ${packs} pek pensel. Setiap pek mengandungi ${perPack} batang pensel. Berapakah jumlah pensel?`, packs * perPack, `Darab bilangan pek dengan isi setiap pek: ${packs} × ${perPack} = ${packs * perPack} batang.`, " batang"));
      const price = 100 * (10 * year + i) + 25, change = 25 * (i + year), paid = price + change;
      patterns.push([`change-${i}`, `Harga buku ialah ${money(price)}. Baki yang diterima selepas membayar ${money(paid)} ialah…`, money(change), (i % 2 ? [money(change - 25), money(change + 25), money(change + 50)] : [money(change - 50), money(change - 25), money(change + 25)]), `Kira dalam sen: ${paid} − ${price} = ${change} sen = ${money(change)}.`]);
    }
  }
  mathematicsBank[level] = { math: [
    bankTopic(level, "math", "number-lab", `Bengkel nombor · Darjah ${year}`, operations),
    bankTopic(level, "math", "daily-maths", `Matematik seharian · Darjah ${year}`, applications),
    bankTopic(level, "math", "patterns-money", year <= 2 ? "Pola nombor" : "Wang dan baki", patterns),
  ] };
}
for (let year = 1; year <= 5; year++) {
  const level = `t${year}` as LevelId;
  const algebra: BankRow[] = [], geometry: BankRow[] = [], data: BankRow[] = [];
  for (let i = 1; i <= 16; i++) {
    const x = i + 2 * year, k = year + 1, b = 3 * year;
    if (year <= 2) algebra.push(numeric(`linear-${i}`, `Selesaikan ${k}x + ${b} = ${k * x + b}. Apakah nilai x?`, x, `Tolak ${b} pada kedua-dua belah: ${k}x = ${k * x}. Bahagi dengan ${k}: x = ${x}.`));
    else if (year === 3) algebra.push(numeric(`indices-${i}`, `Permudahkan (a^${i + 2} × a^3) ÷ a^2 untuk a ≠ 0. Berapakah eksponen a dalam jawapan?`, i + 3, `Darab asas sama: tambah eksponen. Bahagi asas sama: tolak eksponen. ${i + 2} + 3 − 2 = ${i + 3}.`));
    else if (year === 4) algebra.push(numeric(`quadratic-${i}`, `Diberi x² − ${x + i}x + ${x * i} = 0 dan x > ${i}. Apakah nilai x?`, x, `Faktorkan: (x − ${i})(x − ${x}) = 0. Puncanya ${i} dan ${x}. Syarat x > ${i} memilih x = ${x}.`));
    else algebra.push(numeric(`variation-${i}`, `y berubah secara langsung dengan x. Apabila x = 2, y = ${2 * k}. Cari y apabila x = ${x}.`, x * k, `y = kx. Pemalar ialah ${2 * k} ÷ 2 = ${k}. Maka y = ${k} × ${x} = ${k * x}.`));
    if (year === 1) {
      const width = i + 2, length = i + 5;
      geometry.push(numeric(`perimeter-${i}`, `Segi empat tepat mempunyai panjang ${length} cm dan lebar ${width} cm. Berapakah perimeternya?`, 2 * (length + width), `Perimeter = 2 × (panjang + lebar) = 2 × (${length} + ${width}) = ${2 * (length + width)} cm.`, " cm"));
    } else if (year === 2) {
      const radius = 7, height = i + 2;
      geometry.push(numeric(`cylinder-${i}`, `Jejari silinder ialah 7 cm dan tingginya ${height} cm. Cari isi padu dengan π = 22/7.`, 154 * height, `Isi padu = πr²h = (22/7) × 7² × ${height} = ${154 * height} cm³.`, " cm³"));
    } else if (year === 3) {
      const scale = 1000, cm = i + 2;
      geometry.push(numeric(`scale-${i}`, `Skala pelan ialah 1:${scale}. Panjang pada pelan ialah ${cm} cm. Berapakah panjang sebenar dalam meter?`, cm * 10, `${cm} × ${scale} = ${cm * scale} cm. Bahagi 100 untuk menukar kepada meter: ${cm * 10} m.`, " m"));
    } else if (year === 4) {
      const speed = 20 + i;
      geometry.push(numeric(`distance-${i}`, `Objek bergerak pada laju tetap ${speed} m/s selama 5 s. Berapakah jarak yang dilalui?`, speed * 5, `Jarak = laju × masa = ${speed} × 5 = ${speed * 5} m.`, " m"));
    } else {
      const length = i + 3;
      geometry.push(numeric(`enlargement-${i}`, `Sebuah segi empat sama mempunyai sisi ${length} cm. Selepas pembesaran faktor skala 2, berapakah luas imejnya?`, 4 * length * length, `Sisi imej = 2 × ${length} = ${2 * length} cm. Luas imej = ${2 * length}² = ${4 * length * length} cm².`, " cm²"));
    }
    if (year <= 3) {
      const n = year * 20 + i;
      data.push(numeric(`mean-${i}`, `Cari min bagi ${n}, ${n + 2}, ${n + 4}, ${n + 6}.`, n + 3, `Jumlah = ${4 * n + 12}. Bahagikan dengan 4: min = ${n + 3}.`));
    } else if (year === 4) {
      const n = i + 3;
      data.push(numeric(`range-${i}`, `Data ialah ${n}, ${n + 3}, ${n + 5}, ${n + 10 + i}. Berapakah julat data?`, 10 + i, `Julat = nilai maksimum − minimum = ${n + 10 + i} − ${n} = ${10 + i}.`));
    } else {
      const score = 10 + i;
      data.push(numeric(`weighted-mean-${i}`, `Dalam jadual kekerapan, nilai ${score} mempunyai kekerapan 3 dan nilai ${score + 5} mempunyai kekerapan 2. Cari min bagi kelima-lima data.`, score + 2, `Min = jumlah fx ÷ jumlah f = (3 × ${score} + 2 × ${score + 5}) ÷ 5 = ${score + 2}.`));
    }
  }
  mathematicsBank[level] = { math: [
    bankTopic(level, "math", "algebra-lab", `Bengkel algebra · Tingkatan ${year}`, algebra),
    bankTopic(level, "math", "measure-lab", "Ukuran dan aplikasi", geometry),
    bankTopic(level, "math", "data-lab", "Data dalam kehidupan", data),
  ] };
}
