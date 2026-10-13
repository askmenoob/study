import type { ChallengeBankSubject, ChallengeDifficulty, ChallengeQuestion } from "./challengeContracts.js";
import { libraryUnits } from "./library/catalog.js";

/** Finite, unit-grounded variations. A new academic grade selects a different concept family. */
export function challengeTemplates(subject: ChallengeBankSubject): ChallengeQuestion[] {
  const unit = libraryUnits.find(u => u.levelId === subject.levelId && u.subjectId === subject.subjectId);
  if (!unit || subject.levelId === "d1") return [];
  const result: ChallengeQuestion[] = [];
  const add = (key: string, difficulty: ChallengeDifficulty, prompt: string, correct: number, hint: string, explanation: string, format = (v: number) => String(v)) => {
    // Both smaller and larger plausible errors; neither position nor numeric rank reveals the key.
    const hash = [...key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
    const offsets = [[-3,-2,-1],[-2,-1,1],[-1,1,2],[1,2,3]][(hash >>> 7) % 4];
    const values = offsets.map(delta => correct + delta).filter(n => !subject.levelId.startsWith("d") || n >= 0);
    for (let delta=1; values.length<3; delta++) if (!values.includes(correct+delta)) values.push(correct+delta);
    const answer = hash % 4;
    values.splice(answer, 0, correct);
    result.push({ id: `template-v2-${subject.levelId}-${subject.subjectId}-${key}`, fingerprint: "", conceptId: unit.id, topicId: unit.id, topicName: unit.note.title, difficulty, prompt, options: values.map(format), answer, hint, explanation, source: "template", resourceIds: [`${unit.id}-note`] });
  };
  if (subject.subjectId === "math") {
    for (let i = 1; i <= 32; i++) {
      switch (subject.levelId) {
        case "d2": {
          const a = 10 * (1 + Math.floor((i - 1) / 8)) + 2 + i % 8, b = 30 - a % 10 + i % 3;
          add(`regroup-${i}`, 2, `${a} + ${b} = ?`, a + b, "Kumpulkan 10 sa menjadi 1 puluh. Masukkan puluh baharu itu.", `${a % 10} + ${b % 10} sa perlu digabungkan. Jumlah ${a} + ${b} ialah ${a + b}. Semak nilai puluh dan sa.`);
          break;
        }
        case "d3": {
          const groups = 2 + i % 8, each = 3 + Math.floor((i - 1) / 8);
          add(`groups-${i}`, 1, `${groups} bekas masing-masing ada ${each} pemadam. Berapa pemadam semuanya?`, groups * each, "Semua bekas sama banyak. Darab bilangan bekas dengan isi setiap bekas.", `${groups} × ${each} = ${groups * each}. Ada ${groups * each} pemadam.`);
          add(`sharing-${i}`, 2, `${groups * each} pemadam dibahagi sama rata ke dalam ${groups} bekas. Berapa dalam setiap bekas?`, each, "Gunakan fakta darab untuk menyemak pembahagian sama rata.", `${groups * each} ÷ ${groups} = ${each}, kerana ${groups} × ${each} = ${groups * each}.`);
          break;
        }
        case "d4": {
          const denominator = [6,8,10,12][Math.floor((i-1)/8)], numerator = 1 + (i-1)%Math.min(8,denominator-2);
          if (result.some(q => q.id.endsWith(`sum-${denominator}-${numerator}`))) break;
          add(`sum-${denominator}-${numerator}`, 1, `Pita yang sama digunakan sebanyak ${numerator}/${denominator} dan 1/${denominator}. Berapakah jumlah bahagian digunakan?`, numerator + 1, "Tambah pengangka dan kekalkan penyebut yang sama.", `${numerator}/${denominator} + 1/${denominator} = ${numerator+1}/${denominator}. Saiz setiap bahagian kekal.`, n => `${n}/${denominator}`);
          add(`left-${denominator}-${numerator}`, 2, `Satu pita dibahagi kepada ${denominator} bahagian sama panjang. ${numerator} bahagian digunakan. Nyatakan pecahan yang tinggal.`, denominator - numerator, "Satu keseluruhan mempunyai semua bahagian. Tolak bahagian yang digunakan.", `${denominator} − ${numerator} = ${denominator-numerator}. Pecahan baki ialah ${denominator-numerator}/${denominator}.`, n => `${n}/${denominator}`);
          break;
        }
        case "d5": {
          const first = 375 + i * 25, second = 160 + i * 10, total = first + second, paid = Math.ceil(total/100)*100+500;
          const rm = (v: number) => `RM${(v/100).toFixed(2)}`;
          add(`receipt-${i}`, 1, `Fail berharga ${rm(first)} dan pelekat ${rm(second)}. Berapakah jumlah belian?`, total, "Susun titik perpuluhan sebaris. 100 sen bersamaan satu ringgit.", `${rm(first)} + ${rm(second)} = ${rm(total)}.`, rm);
          add(`change-${i}`, 2, `Jumlah belian ${rm(total)} dibayar dengan ${rm(paid)}. Berapakah baki?`, paid-total, "Tolak jumlah belian daripada wang dibayar. Semak dengan tambah semula.", `${rm(paid)} − ${rm(total)} = ${rm(paid-total)}. Jumlah belian dan baki ialah ${rm(paid)}.`, rm);
          break;
        }
        case "d6": {
          const total = 50 + i*10, percent = 10 + (i%8)*10, correct = total*percent/100;
          add(`percent-${i}`, 1, `${percent}% daripada ${total} anak pokok ialah herba. Berapa anak pokok herba?`, correct, "Darab pecahan peratus dengan jumlah keseluruhan.", `${percent}/100 × ${total} = ${correct}. Ada ${correct} anak pokok herba.`);
          add(`remaining-${i}`, 2, `${percent}% daripada ${total} anak pokok ialah herba. Bakinya pokok bunga. Berapa pokok bunga?`, total-correct, "Cari bilangan herba dahulu, kemudian tolak daripada jumlah.", `Herba: ${percent}/100 × ${total} = ${correct}. Bunga: ${total} − ${correct} = ${total-correct}.`);
          break;
        }
        case "t1": {
          const a=2+i%7, x=i+2, b=i+3;
          add(`linear-${i}`, 2, `Selesaikan ${a}x + ${b} = ${a*x+b}. Apakah x?`, x, "Tolak pemalar pada kedua-dua belah, kemudian bahagi dengan pekali x.", `${a}x = ${a*x+b} − ${b} = ${a*x}. Maka x = ${x}. Semak: ${a}(${x}) + ${b} = ${a*x+b}.`);
          break;
        }
        case "t2": {
          const height=i+3, volume=154*height;
          add(`cylinder-${i}`, 2, `Silinder berdiameter 14 cm dan tinggi ${height} cm. Dengan π = 22/7, berapakah isi padunya dalam cm³?`, volume, "Jejari ialah separuh diameter. Gunakan V = πr²h.", `r = 14/2 = 7 cm. V = (22/7) × 7² × ${height} = ${volume} cm³.`);
          break;
        }
        case "t3": {
          const scale=[100,200,500,1000][(i-1)%4], length=2+Math.floor((i-1)/4);
          add(`scale-${i}`, 2, `Laluan berukuran ${length} cm pada pelan berskala 1:${scale}. Berapakah panjang sebenar dalam meter?`, length*scale/100, "Darab faktor skala dalam sentimeter, kemudian bahagi 100 untuk meter.", `${length} × ${scale} = ${length*scale} cm = ${length*scale/100} m.`);
          break;
        }
        case "t4": {
          const low=i, high=i+4;
          add(`roots-${i}`, 2, `Selesaikan x² − ${low+high}x + ${low*high} = 0 dengan syarat x > ${low}. Apakah x?`, high, "Faktorkan persamaan, cari kedua-dua punca dan semak syarat.", `(x − ${low})(x − ${high}) = 0. Punca ${low} tidak memenuhi x > ${low}; punca yang dipilih ialah ${high}.`);
          break;
        }
        case "t5": {
          const k=i+3, x=i+2;
          add(`direct-${i}`, 1, `y berubah secara langsung dengan x. Apabila x = 2, y = ${2*k}. Cari y apabila x = ${x}.`, k*x, "Dalam y = kx, nisbah y/x tetap.", `k = ${2*k}/2 = ${k}. Maka y = ${k} × ${x} = ${k*x}.`);
          const m=2+i%8;
          add(`inverse-${i}`, 2, `y berubah secara songsang dengan x. Apabila x = 3, y = ${m*x}. Cari y apabila x = ${x}.`, 3*m, "Dalam y = k/x, hasil darab xy tetap.", `k = 3 × ${m*x} = ${3*m*x}. Maka y = ${3*m*x}/${x} = ${3*m}.`);
          break;
        }
      }
    }
  }
  if (subject.levelId === "t6") for (let i=1;i<=32;i++) {
    if (subject.subjectId === "stpm_math") {
      const a=1+i%5, r=i+1, b=3*i;
      add(`stationary-${i}`, 2, `For f(x) = ${a}x² − ${2*a*r}x + ${b}, find the x-coordinate of the stationary point.`, r, "Differentiate, then solve f′(x) = 0.", `f′(x) = ${2*a}x − ${2*a*r}. Setting this to zero gives x = ${r}. Since f″(x) = ${2*a} > 0, this is a local minimum.`);
    }
    if (subject.subjectId === "mgmt_math") {
      const total=i+10, cap=2+i%7;
      add(`optimise-${i}`, 3, `Maximise Z = 30x + 20y subject to x + y ≤ ${total}, 2x + y ≤ ${total+cap}, and x, y ≥ 0. What is the maximum value of Z?`, 20*total+10*cap, "Find all feasible vertices and compare their objective values.", `Vertices: (0,0), (0,${total}), (${cap},${total-cap}), (${(total+cap)/2},0). Their Z values are 0, ${20*total}, ${20*total+10*cap}, ${15*(total+cap)}. The maximum is ${20*total+10*cap}.`);
    }
  }
  return result;
}
