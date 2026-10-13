import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, RefreshCw, UserRoundPlus } from "lucide-react";
import { teacherContentApi, TeacherContentApiError, type TeacherLevelId, type TeacherMaterial, type TeacherMaterialReviewFilter, type TeacherSummary } from "../lib/teacherContentApi";
import { AdminTeacherApplications } from "./AdminTeacherApplications";
import "./AdminTeacherPanel.css";

const levelIds: TeacherLevelId[] = ["d1", "d2", "d3", "d4", "d5", "d6"];
const levelLabel = (id: string) => `Darjah ${id.slice(1)}`;
const filterLabel: Record<TeacherMaterialReviewFilter, string> = { unreviewed: "Belum disemak", pending: "Legacy menunggu", published: "Diterbitkan", rejected: "Ditolak", withdrawn: "Ditarik balik" };
export const materialReviewLabel = (item: TeacherMaterial) => item.status === "published"
  ? item.reviewedAt ? "Disemak IMAI" : "Belum disemak"
  : filterLabel[item.status ?? "pending"];

export function AdminTeacherPanel() {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [materials, setMaterials] = useState<TeacherMaterial[]>([]);
  const [email, setEmail] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<TeacherLevelId[]>(["d1"]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<TeacherMaterialReviewFilter>("unreviewed");
  const queueHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true); setError("");
    void Promise.all([teacherContentApi.listTeachers(controller.signal), teacherContentApi.listForReview(status, controller.signal)])
      .then(([teacherResult, materialResult]) => { if (alive) { setTeachers(teacherResult.teachers); setMaterials(materialResult.materials); } })
      .catch((caught: unknown) => {
        if (!alive) return;
        setError(caught instanceof TeacherContentApiError && [401, 403].includes(caught.status)
          ? "Sesi super admin telah tamat atau tidak dibenarkan."
          : "Modul guru belum dapat dimuatkan. Semak sambungan dan cuba lagi.");
      }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; controller.abort(); };
  }, [refresh, status]);

  const toggleLevel = (levelId: TeacherLevelId) => {
    setSelectedLevels((current) => current.includes(levelId) ? current.filter((item) => item !== levelId) : [...current, levelId].sort());
  };

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLevels.length || actionBusy) return;
    setActionBusy("assign"); setError(""); setNotice("");
    try {
      const result = await teacherContentApi.assignTeacher(email.trim(), selectedLevels);
      setTeachers((current) => [result.teacher, ...current.filter((item) => item.id !== result.teacher.id)]);
      setEmail(""); setNotice(`Akaun ${result.teacher.email} kini guru untuk ${result.teacher.levelIds.map(levelLabel).join(", ")}. Guru perlu log masuk semula.`);
    } catch (caught) {
      const code = caught instanceof TeacherContentApiError ? caught.code : "";
      setError(code === "USER_NOT_FOUND" ? "Email ini belum mempunyai akaun. Minta guru daftar akaun biasa dahulu."
        : code === "TEACHER_ACCOUNT_HAS_STUDENTS" ? "Akaun ini mempunyai profil anak dan tidak boleh dijadikan akaun guru."
        : code === "SUPER_ADMIN_ROLE_LOCKED" ? "Akaun super admin tidak boleh ditukar menjadi guru."
        : "Assignment guru belum dapat disimpan.");
    } finally { setActionBusy(""); }
  };

  const review = async (item: TeacherMaterial, decision: "approve" | "reject" | "withdraw") => {
    const note = notes[item.id]?.trim();
    if ((decision === "reject" || decision === "withdraw") && !note) { setError("Masukkan sebab sebelum menolak atau menarik balik bahan."); return; }
    setActionBusy(item.id); setError(""); setNotice("");
    try {
      const result = await teacherContentApi.review(item.id, decision, note);
      setMaterials((current) => current.filter((entry) => entry.id !== result.material.id));
      setNotice(decision === "approve" ? "Bahan telah disemak dan kekal tersedia kepada murid dalam kelas sasaran sahaja."
        : decision === "reject" ? "Bahan ditolak. Guru boleh melihat nota pembetulan."
        : "Bahan telah ditarik balik daripada paparan murid.");
      requestAnimationFrame(() => queueHeadingRef.current?.focus());
    } catch (caught) {
      setError(caught instanceof TeacherContentApiError && caught.code === "MATERIAL_STATE_CONFLICT"
        ? "Status bahan sudah berubah. Muat semula untuk melihat keputusan terkini."
        : "Keputusan review belum dapat disimpan.");
    } finally { setActionBusy(""); }
  };

  const deactivate = async (teacher: TeacherSummary) => {
    if (actionBusy || !window.confirm(`Nyahaktifkan akses guru untuk ${teacher.email}?`)) return;
    setActionBusy(teacher.id); setError(""); setNotice("");
    try {
      await teacherContentApi.assignTeacher(teacher.email, []);
      setTeachers((current) => current.filter((item) => item.id !== teacher.id));
      setNotice(`Akses guru ${teacher.email} telah dinyahaktifkan. Sesi lama akan ditolak oleh server.`);
    } catch {
      setError("Akses guru belum dapat dinyahaktifkan.");
    } finally { setActionBusy(""); }
  };

  return <section className="adminTeacherSection" aria-labelledby="admin-teacher-heading" aria-busy={busy}>
    <div className="adminUsersHeading"><div><span className="adminFeedbackEyebrow">Portal guru</span><h2 id="admin-teacher-heading">Guru &amp; bahan pembelajaran</h2><p>Bahan plain text daripada guru aktif diterbitkan terus dan masuk ke queue post-review ini.</p></div><button type="button" className="miniButton" disabled={busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw aria-hidden="true" />Muat semula</button></div>
    {busy && <p className="adminFeedbackLoading" role="status">Memuatkan modul guru...</p>}
    {error && <p className="adminFeedbackError" role="alert">{error}</p>}
    {notice && <p className="adminTeacherNotice" role="status">{notice}</p>}
    {!busy && <div className="adminTeacherGrid">
      <div className="adminTeacherAccounts"><AdminTeacherApplications /></div>
      <div className="adminMaterialQueue"><div className="adminMaterialQueueHead"><h3 ref={queueHeadingRef} tabIndex={-1}><BookOpenCheck aria-hidden="true" /> Semakan bahan</h3><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TeacherMaterialReviewFilter)}><option value="unreviewed">Belum disemak</option><option value="published">Diterbitkan</option><option value="pending">Legacy menunggu</option><option value="rejected">Ditolak</option><option value="withdrawn">Ditarik balik</option></select></label></div>{materials.length ? materials.map((item) => <article key={item.id} className="adminMaterialCard">
        <div className="adminMaterialMeta"><span className={`teacherStatus status-${item.status}`}>{materialReviewLabel(item)}</span><span>{item.className ?? levelLabel(item.levelId)} · {item.subjectId.toUpperCase()} · {item.kind === "note" ? "Nota" : "Bacaan"}</span></div>
        <h4>{item.title}</h4><p>{item.summary}</p><details><summary>Lihat kandungan penuh dan buat keputusan</summary><p className="adminMaterialBody">{item.body}</p><dl><div><dt>Guru</dt><dd>{item.teacherName}</dd></div><div><dt>Email</dt><dd>{item.teacherEmail}</dd></div><div><dt>Pengesahan</dt><dd>Ciptaan sendiri; tiada data peribadi murid</dd></div></dl>
        {(item.status === "pending" || (item.status === "published" && !item.reviewedAt)) && <><label>Nota reviewer<textarea rows={2} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1000} /></label><div className="adminReviewActions"><button className="primary" disabled={Boolean(actionBusy)} onClick={() => void review(item, "approve")}>Tandakan telah disemak</button><button className="dangerButton" disabled={Boolean(actionBusy)} onClick={() => void review(item, "reject")}>Tolak &amp; sembunyikan</button></div></>}
        {item.status === "published" && item.reviewedAt && <><label>Sebab tarik balik<textarea rows={2} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1000} /></label><button className="dangerButton" disabled={Boolean(actionBusy)} onClick={() => void review(item, "withdraw")}>Tarik balik</button></>}</details>
        {item.reviewNote && <p className="teacherReviewNote"><strong>Nota reviewer:</strong> {item.reviewNote}</p>}
      </article>) : <div className="teacherEmpty"><p>Tiada bahan dengan status {filterLabel[status].toLocaleLowerCase("ms-MY")}.</p></div>}</div>
    </div>}
  </section>;
}
