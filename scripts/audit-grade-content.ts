import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { libraryUnits } from "../server/library/catalog";
import { EXAM_PAPERS } from "../server/examCatalog";
import { levels, getSubjectsForLevel, getTopics } from "../src/data/curriculum";
import { learningPolicy } from "../server/library/learningPolicy";

type Finding = { severity: string; evidence: string; issue: string; recommendation: string };
type Review = { unitId: string; status: string; findings: Finding[]; curriculumMapping: string; notes: string };
const directory = new URL("../docs/audits/", import.meta.url);
const reviews: Review[] = JSON.parse(readFileSync(new URL("grade-editorial-review.json",directory),"utf8"));
const byId = new Map(reviews.map(r => [r.unitId,r]));
if(byId.size!==libraryUnits.length||reviews.length!==libraryUnits.length||reviews.some(r=>!libraryUnits.some(u=>u.id===r.unitId))) throw new Error("Every published unit requires exactly one editorial review.");
const fixed: Record<string,string> = {
  "library-d2-math-puluh-dan-sa":"Tambah contoh menolak puluh penuh 42 − 20 = 22 sebelum latihan.",
  "library-d3-en-past-event-sequence":"Tambah pasangan draw → drew dan contoh ayat sebelum latihan.",
  "library-d6-math-peratus-daripada-jumlah":"Tambah kaedah bahagian ÷ jumlah × 100% dengan contoh 18/60 = 30%.",
  "library-d6-science-jarak-masa-laju":"Tambah contoh jarak = laju tetap × masa dan laju purata yang merangkumi berhenti.",
  "library-t2-en-reporting-words-in-context":"Tambah contoh have/has → had, will → would, kata ganti dan rujukan hari.",
  "library-t4-geo-kepadatan-dan-perubahan-penduduk":"Takrif pertambahan semula jadi dan persamaan penduduk akhir ditambah dengan contoh 1 030 orang.",
  "library-d5-math-perpuluhan-dan-wang":"Rujukan soalan terakhir dibuang; setiap soalan menyatakan kuantiti yang dikehendaki.",
  "library-t6-chemistry-reaction-quotient":"Keadaan pengembangan isipadu menggantikan rujukan Question 3; tetap sah apabila soalan disusun semula.",
  "library-t6-sports_science-momen-daya":"Kes pemindahan beban menggantikan rujukan soalan ketiga.",
  "library-t6-stpm_math-stationary-and-area-v2":"Dokumen sumber dikemas kini mengikut unit terbitan: selang menurun dan ekstremum setempat; versi endpoint diarkibkan.",
};
const partial: Record<string,string> = {
  "library-d1-islam-adab-makan-berpandu-v1":"Label tindakan yang tidak sepadan dengan gambar blok/pinggan diganti. Ikon bantuan dan penghargaan masih memerlukan ujian kefahaman kanak-kanak.",
  "library-d1-moral-main-dan-simpan-berpandu-v1":"Bulan tidak lagi dilabel menyembunyikan mainan; gambar pinggan tidak lagi dilabel makanan di lantai. Adegan sosial masih perlu penambahbaikan visual.",
  "library-t6-mgmt_math-linear-programming":"Dilabel sebagai asas dua pemboleh ubah; keperluan tiga pemboleh ubah, simplex dan Big-M Semester 3 dinyatakan belum diliputi.",
};
const gradeRisk = new Set(["library-d3-science-bahan-dan-daya-serap","library-t1-geo-skala-dan-laluan","library-t4-science-inersia-daya-pecutan"]);
const normal=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
const seen=new Map<string,{grade:string;id:string}>(); const duplicates: string[]=[];
const rows=levels.flatMap(level=>getSubjectsForLevel(level.id).flatMap(subject=>libraryUnits.filter(u=>u.levelId===level.id&&u.subjectId===subject.id).map(unit=>{
  const review=byId.get(unit.id)!;const topics=getTopics(level.id,subject.id).filter(t=>t.unitId===unit.id);
  const questions=topics.flatMap(t=>t.questions);
  for(const q of questions){
    if(!q.resourceIds?.length||q.resourceIds.some(id=>!id.startsWith(unit.id+"-")))throw new Error(`Unmapped question ${q.id}`);
    const key=normal(subject.id+" "+q.prompt+" "+q.options[q.answer]);const previous=seen.get(key);
    if(previous&&previous.grade!==level.id)duplicates.push(`${previous.id} / ${q.id}`);seen.set(key,{grade:level.id,id:q.id});
  }
  const papers=EXAM_PAPERS.filter(p=>p.levelIds.some(id=>id===level.id)&&p.subjectId===subject.id);
  return {unitId:unit.id,grade:level.id,gradeName:level.label,subject:subject.name,title:unit.note.title,
    sourceDigest:createHash("sha256").update(JSON.stringify(unit)).digest("hex"),
    libraryQuestions:(unit.reading.questions?.length??0)+(unit.practice.questions?.length??0),topicQuestions:questions.length,
    noteCharacters:unit.note.body.join(" ").length,readingCharacters:unit.reading.body.join(" ").length,
    teachingApproach:learningPolicy(level.id).approach,challengeMaximum:learningPolicy(level.id).maximum,
    reviewStatus:fixed[unit.id]?"corrected":partial[unit.id]?"partially-corrected":review.status,
    correction:fixed[unit.id]??partial[unit.id]??null,gradePlacementConcern:gradeRisk.has(unit.id),
    curriculumMapping:review.curriculumMapping,teacherApproved:false,fullSyllabus:false,
    examPacks:papers.map(p=>({id:p.id,review:p.source.review,questions:p.questions.length,libraryUnitMapping:"not-established"})),
    findings:review.findings,reviewNotes:review.notes};
})));
if(rows.length!==102||duplicates.length)throw new Error(`Audit coverage/duplicate failure: ${rows.length}; ${duplicates.join(", ")}`);
const totals={units:rows.length,topicQuestions:rows.reduce((n,r)=>n+r.topicQuestions,0),libraryQuestions:rows.reduce((n,r)=>n+r.libraryQuestions,0),
  correctedUnits:rows.filter(r=>r.reviewStatus==="corrected").length,partialUnits:rows.filter(r=>r.reviewStatus==="partially-corrected").length,
  unresolvedUnits:rows.filter(r=>r.reviewStatus==="needs-fix").length,teacherApprovedUnits:0,crossGradeExactDuplicates:duplicates.length,
  originalExamPacks:EXAM_PAPERS.length,approvedExamPacks:EXAM_PAPERS.filter(p=>p.source.review==="approved").length};
const report={scope:"Editorial audit of selected published units; not full curriculum certification",totals,rows};
mkdirSync(directory,{recursive:true});writeFileSync(new URL("grade-content-audit.json",directory),JSON.stringify(report,null,2)+"\n");
const cell=(v:unknown)=>String(v).replace(/\|/g,"/").replace(/\n/g," ");
const lines=["# Audit kandungan Darjah 1 hingga Tingkatan 6","",
  "Audit ini menyemak semua 102 unit pilihan yang diterbitkan dalam versi calon. Ia bukan pengesahan semua bab silibus. Tiada deployment dibuat.","",
  "Semakan editorial meliputi nota, bacaan, soalan, pilihan jawapan dan penjelasan. Pemeriksaan pautan dan pendua dijalankan pada bank 740 soalan; semakan terperinci baharu berfokus pada 612 soalan unit. 128 soalan tambahan Matematik menggunakan padanan dan ujian terdahulu.","",
  "## Hasil","",`- ${totals.correctedUnits} unit: dapatan pengajaran, konteks atau dokumentasi diperbetulkan.`,
  `- ${totals.partialUnits} unit: pembetulan sebahagian; batasnya dinyatakan di bawah.`,
  `- ${totals.unresolvedUnits} unit: masih memerlukan pembaikan atau pengesahan penempatan/kedalaman.`,
  "- Tiada kecacatan konkrit ditemui tidak bermaksud lulus DSKP, semester atau semakan pendidik.",
  "- 0 pendua tepat merentas gred dalam prompt berkonteks dan jawapan bagi subjek yang sama. Ini tidak mengesan semua variasi kosmetik atau pertindihan konsep.",
  "- Ukuran panjang teks di JSON ialah metrik pemeriksaan, bukan skor kebolehbacaan atau bukti sesuai umur.","",
  "## Matriks setiap gred dan subjek","",
  "| Gred | Subjek | Unit Library | Soalan unit / topik | Keputusan editorial | Exam |",
  "|---|---|---|---:|---|---|",
  ...rows.map(r=>`| ${cell(r.gradeName)} | ${cell(r.subject)} | ${cell(r.title)} | ${r.libraryQuestions} / ${r.topicQuestions} | ${cell(r.reviewStatus)}${r.gradePlacementConcern?" · semak penempatan gred":""} | ${r.examPacks.length?"Pack pending; belum dipadankan unit":"Tiada pack"} |`),"",
  "## Dapatan dan pembetulan setiap unit","",
  ...rows.flatMap(r=>[`### ${r.gradeName} · ${r.subject}`,"",`Unit: \`${r.unitId}\``,"",r.reviewNotes,"",...(r.findings.length?r.findings.flatMap(f=>[`- **${f.severity}:** ${f.issue}`,`  Bukti: ${f.evidence}`,`  Tindakan: ${f.recommendation}`]):["Tiada kecacatan konkrit ditemui dalam semakan ini."]),"",...(r.correction?[`Pembetulan calon: ${r.correction}`,""]:[]),`Padanan kurikulum: ${r.curriculumMapping}. Semakan pendidik: belum diluluskan.`,""]),
  "## Ulang kaji exam","",
  "Keempat-empat pack original Matematik D4, D5, D6 dan SPM T4/T5 mengandungi enam soalan utama dan enam retry setiap pack. Semua masih pending; tiada pack approved. Pack SPM yang sama meliputi T4/T5 sebagai preview gabungan, bukan bukti dua set gred berasingan.","",
  "Nota pendek dalam exam terikat pada soalan exam sendiri. Padanan kepada unit Library belum ditetapkan. Oleh itu, exam tidak boleh dikatakan hanya menguji kandungan Library yang telah dibaca. Darjah 1–3 menggunakan semakan kefahaman; STPM memerlukan tugasan berstruktur/esei dan liputan semester sebelum dakwaan exam-ready.","",
  "## Batas dan sumber","",
  "Rujukan KPM/MPM dan rekod semakan khusus terdapat dalam GRADE_ALIGNMENT.md, server/library/*-sources.md serta bukti URL pada setiap dapatan. Halaman DELIMa guru/PPD memberi petunjuk penempatan; ia tidak menggantikan dokumen DSKP penuh dan pengesahan guru.","",
  "Kod status editorial ialah keputusan semakan AI, bukan tandatangan pendidik. Dokumen ini mengekalkan dapatan sebelum pembetulan supaya perubahan boleh dijejaki. JSON menyimpan digest kandungan selepas pembetulan; jalankan semula skrip jika sumber berubah.",""];
writeFileSync(new URL("GRADE_CONTENT_AUDIT.md",directory),lines.join("\n"));console.log(JSON.stringify(totals));
