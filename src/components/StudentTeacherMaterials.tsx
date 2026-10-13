import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenCheck, RefreshCw, Search } from "lucide-react";
import { teacherContentApi, type TeacherMaterial } from "../lib/teacherContentApi";
import "./StudentTeacherMaterials.css";

export function StudentTeacherMaterialList({ materials, onOpen }: { materials: TeacherMaterial[]; onOpen: (material: TeacherMaterial) => void }) {
  if (!materials.length) return <div className="teacherStudentEmpty"><BookOpenCheck aria-hidden="true" /><h2>Belum ada bahan guru</h2><p>Jika kelas sudah aktif, guru anda belum berkongsi bahan.</p></div>;
  return <div className="teacherStudentGrid">{materials.map((item) => <article key={item.id}><span>{item.kind === "note" ? "Nota guru" : "Bacaan guru"}</span><small>{item.subjectId.toUpperCase()} · {item.className}</small><h2>{item.title}</h2><p>{item.summary}</p><p><strong>{item.teacherName}</strong><br/>{item.schoolName}</p><button className="primary" onClick={() => onOpen(item)}>Buka bahan</button></article>)}</div>;
}

export function StudentTeacherMaterialReader({material,levelLabel,subjects,onBack}:{material:TeacherMaterial;levelLabel:string;subjects:{id:string;name:string}[];onBack:()=>void}) {
  return <main className="teacherStudentPage"><button className="back" onClick={onBack}><ArrowLeft /> Kembali ke bahan guru</button><article className="teacherStudentReader"><span className="teacherStudentApproved">Bahan daripada Guru Disahkan IMAI</span><small>{levelLabel} · {subjects.find((item) => item.id === material.subjectId)?.name ?? material.subjectId} · {material.className}</small><h1>{material.title}</h1><p>{material.summary}</p><p><strong>{material.teacherName}</strong> · {material.schoolName}</p><div className="teacherStudentBody">{material.body}</div><footer>Bahan sumbangan guru ini diterbitkan oleh guru yang akaunnya telah disahkan IMAI. Ia boleh disemak atau ditarik balik oleh super admin dan bukan dokumen rasmi KPM atau keputusan PBD.</footer></article></main>;
}

export function StudentTeacherMaterials({ studentId, levelLabel, subjects, onOpenLibrary, onManageTeacher }: { studentId: string; levelLabel: string; subjects: { id: string; name: string }[]; onOpenLibrary?: () => void; onManageTeacher?: () => void }) {
  const [materials, setMaterials] = useState<TeacherMaterial[]>([]);
  const [active, setActive] = useState<TeacherMaterial | null>(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true); setError("");
    void teacherContentApi.listForStudent(studentId, controller.signal).then((result) => {
      if (alive) setMaterials(result.materials);
    }).catch(() => { if (alive) setError("Bahan guru belum dapat dimuatkan. Bahan Library lain masih boleh digunakan."); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; controller.abort(); };
  }, [studentId, refresh]);

  const visible = useMemo(() => {
    const term = query.normalize("NFKC").trim().toLocaleLowerCase("ms-MY");
    return materials.filter((item) => (subject === "all" || item.subjectId === subject) &&
      (!term || `${item.title} ${item.summary} ${item.body}`.normalize("NFKC").toLocaleLowerCase("ms-MY").includes(term)));
  }, [materials, query, subject]);

  if (active) return <StudentTeacherMaterialReader material={active} levelLabel={levelLabel} subjects={subjects} onBack={() => setActive(null)}/>;

  return <main className="teacherStudentPage"><div className="teacherStudentHead"><div><span className="adminFeedbackEyebrow">Bahan Guru Saya</span><h1>Daripada kelas aktif</h1><p>Bahan disasarkan kepada kelas guru anda untuk {levelLabel} dan hanya tersedia semasa guru serta sambungan kelas aktif.</p></div><button type="button" className="miniButton" disabled={busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw aria-hidden="true" />Muat semula</button></div>
    <div className="teacherStudentFilters"><label><Search aria-hidden="true" /><input aria-label="Cari bahan guru" placeholder="Cari tajuk atau isi..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Tapis subjek bahan guru" value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">Semua subjek</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    {busy && <p role="status">Memuatkan bahan guru...</p>}
    {error && <p className="teacherStudentError" role="alert">{error}</p>}
    {!busy && !error && <><StudentTeacherMaterialList materials={visible} onOpen={setActive} />{!materials.length&&<div className="teacherStudentFallback"><h2>Latihan Permulaan IMAI</h2><p>Library IMAI kekal tersedia dan dilabel berasingan. Ia bukan bahan guru anda.</p><div>{onManageTeacher&&<button className="miniButton" onClick={onManageTeacher}>Masukkan kod kelas</button>}{onOpenLibrary&&<button className="primary" onClick={onOpenLibrary}>Buka Library IMAI</button>}</div></div>}</>}
  </main>;
}
