export type MathHistoryRow = { question: string; answer: string; provider: string };
export type VerifiedMathResult = { answer: string; provider: "verified-math-teach" | "verified-math" };

type Rational = { n: bigint; d: bigint };
type Problem = {
  kind: "missing-add" | "add" | "subtract" | "multiply" | "divide" | "fraction-add" | "fraction-subtract" | "linear";
  a: Rational; b: Rational; result: Rational; target?: Rational;
};

// Exact, bounded literals prevent rounding from marking a near miss correct.
// No expression evaluation: each supported grammar consumes the whole input.
const decimal = String.raw`-?(?:\d{1,12}(?:\.\d{1,12})?|\.\d{1,12})`;
const fraction = String.raw`-?\d{1,12}\s*/\s*\d{1,12}`;
const operand = `(?:${fraction}|${decimal})`;
const normalize = (text: string) => text.toLowerCase().replace(/−/g, "-").replace(/×/g, "*").trim();
const abs = (n: bigint) => n < 0n ? -n : n;

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return abs(a);
}
function rational(n: bigint, d = 1n): Rational {
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}
function literal(text: string): Rational | null {
  const value = text.trim();
  if (new RegExp(`^${fraction}$`).test(value)) {
    const [n, d] = value.split("/").map(part => BigInt(part.trim()));
    return d === 0n ? null : rational(n, d);
  }
  if (!new RegExp(`^${decimal}$`).test(value)) return null;
  const places = value.split(".")[1]?.length ?? 0;
  return rational(BigInt(value.replace(".", "")), 10n ** BigInt(places));
}
const add = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a: Rational, b: Rational) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
const divide = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
const equal = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
const fractionText = (a: Rational) => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
function fmt(a: Rational): string {
  let denominator = a.d;
  while (denominator % 2n === 0n) denominator /= 2n;
  while (denominator % 5n === 0n) denominator /= 5n;
  if (denominator !== 1n) return fractionText(a);
  const whole = abs(a.n) / a.d;
  let rest = abs(a.n) % a.d;
  let digits = "";
  while (rest !== 0n) {
    rest *= 10n;
    digits += String(rest / a.d);
    rest %= a.d;
  }
  return `${a.n < 0n ? "-" : ""}${whole}${digits ? "." + digits : ""}`;
}

function parseProblem(message: string): Problem | null {
  if (message.length > 200) return null;
  // Only these wrappers are accepted; arbitrary suffixes remain invalid.
  const text = normalize(message)
    .replace(/[?]+$/, "").trim()
    .replace(/^(?:berapakah|berapa|kira|kirakan|hitung|hitungkan|selesaikan)\s+/, "")
    .replace(/\s+(?:berapa(?:kah)?(?: jumlahnya)?|jumlahnya berapa)$/, "").trim();
  let m = text.match(new RegExp(`^(${decimal})\\s*(?:tambah|\\+)\\s*berapa(?:\\s+yang)?(?:\\s+perlu)?(?:\\s+ditambah)?\\s*(?:menjadi|jadi|sama dengan)?\\s*(${decimal})$`));
  if (!m) m = normalize(message).replace(/[?]+$/, "").trim().match(new RegExp(`^berapa(?:\\s+yang)?\\s+(?:perlu\\s+)?(?:ditambah|tambah)\\s+(?:kepada\\s+)?(${decimal})\\s*(?:untuk\\s+)?(?:menjadi|jadi|sama dengan)\\s*(${decimal})$`));
  if (m) {
    const a = literal(m[1])!, target = literal(m[2])!, result = subtract(target, a);
    return { kind: "missing-add", a, b: result, result, target };
  }

  // Pilot equation grammar: ax +/- b = c, with integer coefficients and constants.
  m = text.match(/^(-?\d{1,12}|-)?\s*x\s*([+-])\s*(\d{1,12})\s*=\s*(-?\d{1,12})$/);
  if (m) {
    const a = rational(m[1] === "-" ? -1n : BigInt(m[1] || "1"));
    if (a.n === 0n) return null;
    const b = rational(BigInt(m[3]) * (m[2] === "-" ? -1n : 1n));
    const target = rational(BigInt(m[4]));
    return { kind: "linear", a, b, target, result: divide(subtract(target, b), a) };
  }

  // Fractions are matched before ordinary division, never as an expression prefix.
  m = text.match(new RegExp(`^(${operand})\\s*(\\+|-|tambah|tolak)\\s*(${operand})$`));
  if (m) {
    const a = literal(m[1]), b = literal(m[3]);
    if (!a || !b) return null;
    const isAdd = m[2] === "+" || m[2] === "tambah";
    const isFraction = m[1].includes("/") || m[3].includes("/");
    return {
      kind: isFraction ? (isAdd ? "fraction-add" : "fraction-subtract") : (isAdd ? "add" : "subtract"),
      a, b, result: isAdd ? add(a, b) : subtract(a, b),
    };
  }
  m = text.match(new RegExp(`^(${decimal})\\s*(x|\\*|/|÷|darab|bahagi)\\s*(${decimal})$`));
  if (!m) return null;
  const a = literal(m[1])!, b = literal(m[3])!;
  if (m[2] === "x" || m[2] === "*" || m[2] === "darab") return { kind: "multiply", a, b, result: multiply(a, b) };
  return b.n === 0n ? null : { kind: "divide", a, b, result: divide(a, b) };
}

const isHint = (text: string) => /^(teruskan|saya perlukan petunjuk|saya tak tahu|tak tahu|bantu lagi|beri jawapan|bagi jawapan|jawapan apa|berapa)$/.test(text);
function parseAttempt(message: string, problem: Problem): Rational | null {
  // A concise fraction on an active exercise is an attempt, not a new division.
  const text = normalize(message);
  return literal(problem.kind === "linear" ? text.replace(/^x\s*=\s*/, "") : text);
}
function sameProblem(a: Problem, b: Problem) {
  return a.kind === b.kind && equal(a.a, b.a) && equal(a.b, b.b)
    && ((!a.target && !b.target) || (!!a.target && !!b.target && equal(a.target, b.target)));
}
function activeExercise(history: MathHistoryRow[]): { problem: Problem; hints: number } | null {
  const rows: MathHistoryRow[] = [];
  for (const row of history) {
    if (row.provider !== "verified-math-teach") break;
    rows.push(row);
  }
  let active: { problem: Problem; hints: number } | null = null;
  // Replaying oldest first disambiguates fraction attempts from division exercises.
  for (const row of rows.reverse()) {
    if (active && (parseAttempt(row.question, active.problem) || isHint(normalize(row.question)))) {
      active.hints++;
      continue;
    }
    const problem = parseProblem(row.question);
    if (!problem) active = null;
    else if (active && sameProblem(problem, active.problem)) active.hints++;
    else active = { problem, hints: 0 };
  }
  return active;
}

const teaching = (answer: string): VerifiedMathResult => ({ answer, provider: "verified-math-teach" });
function equationLeft(problem: Problem): string {
  const coefficient = problem.a.n === 1n ? "" : problem.a.n === -1n ? "-" : fmt(problem.a);
  return `${coefficient}x ${problem.b.n < 0n ? "−" : "+"} ${fmt(rational(abs(problem.b.n), problem.b.d))}`;
}
function balanceInstruction(problem: Problem): string {
  return `${problem.b.n < 0n ? "Tambah" : "Tolak"} ${fmt(rational(abs(problem.b.n), problem.b.d))} pada kedua-dua belah`;
}
function commonFractions(problem: Problem) {
  const d = problem.a.d / gcd(problem.a.d, problem.b.d) * problem.b.d;
  return { d, a: problem.a.n * (d / problem.a.d), b: problem.b.n * (d / problem.b.d) };
}

function teach(problem: Problem): VerifiedMathResult {
  const a = fmt(problem.a), b = fmt(problem.b);
  if (problem.kind === "missing-add") return teaching(`Kita cari nombor yang hilang. Guna operasi songsang: daripada ${a} + ? = ${fmt(problem.target!)}, tukar kepada ${fmt(problem.target!)} − ${a}. Cuba kira dahulu. Berapa awak dapat?`);
  if (problem.kind === "linear") return teaching(`Persamaan seperti penimbang yang seimbang: ${equationLeft(problem)} = ${fmt(problem.target!)}. Operasi yang sama mesti dibuat pada kedua-dua belah supaya persamaan kekal seimbang. ${balanceInstruction(problem)} dahulu. Teruskan sehingga x tinggal sendirian, kemudian beritahu nilai x.`);
  if (problem.kind === "fraction-add" || problem.kind === "fraction-subtract") return teaching(`Pecahan mesti mempunyai penyebut yang sama supaya saiz bahagiannya sama. Untuk ${fractionText(problem.a)} ${problem.kind === "fraction-add" ? "+" : "−"} ${fractionText(problem.b)}, cari penyebut sepunya dahulu. Darab pengangka dan penyebut dengan nombor yang sama untuk mendapat pecahan setara. Gunakan penyebut sepunya itu untuk mengira, kemudian tulis jawapan akhir sebagai pecahan.`);
  if (problem.kind === "multiply") return teaching(`Kita gunakan nilai tempat untuk ${a} × ${b}. Darab bermaksud menskalakan satu nombor dengan nombor yang lain; bagi nombor bulat positif, kita boleh fikir sebagai kumpulan berulang. Cuba kira dahulu dan beritahu jawapan awak.`);
  if (problem.kind === "add") return teaching(`Kita tambah secara langkah demi langkah. Mulakan dengan ${a}, kemudian tambah ${b}. Cuba kira dahulu dan beritahu jawapan awak.`);
  if (problem.kind === "subtract") return teaching(`Kita cari beza antara dua nombor. Mulakan dengan ${a} dan tolak ${b}. Cuba kira dahulu. Berapa yang tinggal?`);
  return teaching(`Bahagi ialah operasi songsang bagi darab. Untuk ${a} ÷ ${b}, fikir nombor yang apabila didarab ${b} menghasilkan ${a}. Cuba kira dahulu.`);
}

function hint(problem: Problem, stage: number, wrong = false): VerifiedMathResult {
  const a = fmt(problem.a), b = fmt(problem.b);
  let answer: string;
  if (problem.kind === "linear") {
    answer = stage === 0
      ? `${balanceInstruction(problem)}: bahagian nombor tetap pada sebelah kiri akan menjadi sifar. Pada sebelah kanan, kira ${fmt(problem.target!)} ${problem.b.n < 0n ? "+" : "−"} ${fmt(rational(abs(problem.b.n), problem.b.d))}. Gunakan persamaan yang tinggal untuk mencari x, kemudian tulis nilai x.`
      : `Selepas membuang nombor tetap dengan operasi yang sama pada kedua-dua belah, ${a === "1" ? "x tinggal sendirian" : `bahagikan kedua-dua belah dengan ${a} untuk mendapatkan x`}. Semak calon nilai awak dengan menggantikannya ke dalam ${equationLeft(problem)} = ${fmt(problem.target!)}.`;
  } else if (problem.kind === "fraction-add" || problem.kind === "fraction-subtract") {
    const common = commonFractions(problem);
    answer = stage === 0
      ? `Gunakan penyebut ${common.d}: ${fractionText(problem.a)} = ${common.a}/${common.d} dan ${fractionText(problem.b)} = ${common.b}/${common.d}. Nilai pecahan kekal sama kerana pengangka dan penyebut didarab dengan faktor yang sama. Sekarang ${problem.kind === "fraction-add" ? "tambah" : "tolak"} pengangka sahaja, kekalkan penyebut itu dan tulis jawapan akhir sebagai pecahan.`
      : `Kekalkan penyebut ${common.d}. Kira pengangka ${common.a} ${problem.kind === "fraction-add" ? "+" : "−"} ${common.b}, kemudian tulis hasilnya di atas ${common.d}. Jika pengangka dan penyebut berkongsi faktor, bahagikan kedua-duanya dengan faktor itu. Berapa pecahan yang awak dapat?`;
  } else if (problem.kind === "missing-add") {
    answer = stage === 0
      ? `Mulakan pada ${fmt(problem.target!)} dan undur sebanyak ${a}. Susun nilai tempat supaya sa, puluh dan ratus sejajar; tolak pada nilai tempat yang sepadan. Cuba kira ${fmt(problem.target!)} − ${a}.`
      : `Semak dengan operasi songsang: ${a} + jawapan awak mesti menjadi ${fmt(problem.target!)}. Jika jumlahnya terlalu kecil, nombor yang hilang perlu dibesarkan; jika terlalu besar, kecilkan. Cuba semak satu nilai tempat pada satu masa.`;
  } else if (problem.kind === "multiply") {
    const byTen = equal(problem.a, rational(10n)) || equal(problem.b, rational(10n));
    answer = stage === 0
      ? byTen
        ? `Apabila didarab 10, setiap digit bergerak satu nilai tempat ke kiri. Bagi nombor bulat, satu sifar mengisi tempat sa; bagi perpuluhan, gunakan jadual nilai tempat. Cuba gunakan langkah itu pada ${a} × ${b}.`
        : `Pisahkan satu faktor mengikut nilai tempat, darab setiap bahagian dengan faktor yang satu lagi, kemudian tambah hasil bahagiannya. Pastikan tanda negatif, jika ada, diambil kira. Cuba pada ${a} × ${b}.`
      : `Semak menggunakan bahagi: hasil darab awak dibahagi dengan faktor bukan sifar mesti memberi faktor yang satu lagi. Untuk ${a} × ${b}, periksa nilai tempat dan tanda setiap digit dahulu.`;
  } else if (problem.kind === "divide") {
    answer = stage === 0
      ? `Tulis ${b} × ? = ${a}. Cuba satu hasil darab yang awak tahu, kemudian bandingkan dengan ${a} untuk melaras calon jawapan. Jika tidak habis dibahagi, jawapan boleh ditulis sebagai pecahan.`
      : `Tulis pembahagian sebagai pecahan (${a})/(${b}). Jika ada perpuluhan, darab kedua-duanya dengan kuasa 10 yang sama dahulu. Permudahkan dengan membahagi pengangka dan penyebut dengan faktor sepunya, kemudian semak melalui darab.`;
  } else {
    answer = stage === 0
      ? `Susun ${a} dan ${b} dengan titik perpuluhan serta nilai tempat sejajar. Mulakan pada lajur paling kanan, kemudian ${problem.kind === "add" ? "tambah dan kumpulkan semula jika perlu" : "tolak dan tukar satu unit daripada lajur kiri jika perlu"}. Cuba satu lajur dahulu, teruskan hingga selesai, kemudian beritahu jawapan akhir.`
      : `Semak dengan operasi songsang: ${problem.kind === "add" ? `jawapan awak − (${b}) mesti sama dengan ${a}` : `jawapan awak + (${b}) mesti sama dengan ${a}`}. Periksa semula lajur yang tidak sepadan dan cuba lagi.`;
  }
  return teaching((wrong ? "Belum tepat. " : "") + answer);
}

function reveal(problem: Problem): VerifiedMathResult {
  const a = fmt(problem.a), b = fmt(problem.b);
  let answer: string;
  if (problem.kind === "missing-add") answer = `${fmt(problem.target!)} − ${a} = ${fmt(problem.result)}. Jadi nombor yang hilang ialah ${fmt(problem.result)}, kerana ${a} + ${fmt(problem.result)} = ${fmt(problem.target!)}.`;
  else if (problem.kind === "linear") {
    const remaining = subtract(problem.target!, problem.b);
    const coefficient = problem.a.n === 1n ? "" : problem.a.n === -1n ? "-" : a;
    answer = `${equationLeft(problem)} = ${fmt(problem.target!)}. ${balanceInstruction(problem)} supaya persamaan kekal seimbang: ${coefficient}x = ${fmt(remaining)}. Bahagikan kedua-dua belah dengan ${a}: x = ${fractionText(problem.result)}. Semakan: (${a}) × (${fractionText(problem.result)}) + (${b}) = ${fmt(problem.target!)}.`;
  } else if (problem.kind === "fraction-add" || problem.kind === "fraction-subtract") {
    const common = commonFractions(problem), symbol = problem.kind === "fraction-add" ? "+" : "−";
    answer = `Samakan penyebut: ${fractionText(problem.a)} ${symbol} ${fractionText(problem.b)} = ${common.a}/${common.d} ${symbol} ${common.b}/${common.d}. ${problem.kind === "fraction-add" ? "Tambah" : "Tolak"} pengangka dan kekalkan penyebut: (${common.a} ${symbol} ${common.b})/${common.d} = ${fractionText(problem.result)}. Permudahkan pecahan dengan faktor sepunya jika perlu.`;
  } else {
    const symbol = problem.kind === "add" ? "+" : problem.kind === "subtract" ? "−" : problem.kind === "multiply" ? "×" : "÷";
    answer = `${a} ${symbol} ${b} = ${fmt(problem.result)}.`;
  }
  return { answer: `Sekarang kita semak langkah penyelesaian: ${answer} Cuba terangkan semula langkah itu dengan ayat awak sendiri.`, provider: "verified-math" };
}

export function solveBasicMath(message: string, history: MathHistoryRow[] = []): VerifiedMathResult | null {
  if (message.length > 200) return null;
  const active = activeExercise(history);
  if (active) {
    const attempt = parseAttempt(message, active.problem);
    if (attempt) {
      return equal(attempt, active.problem.result)
        ? { answer: `Betul. ${reveal(active.problem).answer} Bagus kerana awak cuba sendiri dahulu.`, provider: "verified-math" }
        : hint(active.problem, active.hints, true);
    }
    if (normalize(message) === "tunjukkan langkah penyelesaian") return reveal(active.problem);
    if (isHint(normalize(message))) return hint(active.problem, active.hints);
  }
  const current = parseProblem(message);
  if (!current) return null;
  if (active && sameProblem(current, active.problem)) return hint(current, active.hints);
  return teach(current);
}
