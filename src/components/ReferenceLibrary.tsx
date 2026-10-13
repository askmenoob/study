import { ExternalLink } from "lucide-react";
import { findReferences, referenceMaterials } from "../data/referenceMaterials";
import type { LevelId } from "../types";
import "./referenceLibrary.css";

type Props = { levelId: LevelId; subjectId: string; query: string; allowExternalLinks: boolean };

export function ReferenceLibrary({ levelId, subjectId, query, allowExternalLinks }: Props) {
  if (!allowExternalLinks) return <p>Rujukan luar tersedia selepas sesi belajar tamat.</p>;
  const items = findReferences(levelId, subjectId, query);
  return <section className="referenceLibrary" aria-label="Rujukan GuruBesar dan KPM">
    <div className="referenceIntro">
      <h3>Rujukan latihan dan soalan</h3>
      <p>Pilihan mengikut tahap pelajar. GuruBesar.my menghimpunkan bahan penyumbang; KPM menyediakan panduan pentaksiran. Status di bawah menerangkan apa yang sudah diperiksa.</p>
      <p>Pautan dibuka di laman asal dan memerlukan internet. Soalan luar tidak disalin atau disemak secara automatik oleh Study.</p>
      <small>{items.length} rujukan sepadan</small>
    </div>
    <div className="sourceGrid">{items.map(item => <article className="sourceCard referenceCard" key={item.id}>
      <span className={`sourceStatus ${item.official ? "approved" : "conditional"}`}>{item.official ? "Dokumen KPM" : "Sumber komuniti"}</span>
      <h3>{item.title}</h3><small>{item.publisher} · {item.kind}</small><p>{item.summary}</p>
      <dl>
        <div><dt>Kredit</dt><dd>{item.creditedTo}</dd></div>
        <div><dt>Tahun bahan</dt><dd>{item.materialYear ?? "Belum disahkan"}</dd></div>
        <div><dt>Artikel / edisi</dt><dd>{item.pageYear}</dd></div>
        <div><dt>Skema</dt><dd>{item.answerKey}</dd></div>
      </dl>
      <details><summary>Status semakan · {item.checkedOn}</summary>
        <p>{item.verification}</p><p>{item.curriculumReview}.</p>
        <p>Pautan rujukan sahaja. Lesen untuk menerbitkan semula bahan dalam Study belum disahkan.</p>
      </details>
      <a href={item.url} target="_blank" rel="noopener noreferrer">Buka sumber asal <ExternalLink aria-hidden="true"/></a>
      {item.originalUrl && <a href={item.originalUrl} target="_blank" rel="noopener noreferrer">Laman pencipta <ExternalLink aria-hidden="true"/></a>}
    </article>)}</div>
    {!items.length && <div className="emptyState"><b>Belum ada rujukan sepadan.</b><p>Cuba subjek atau kata carian lain. Kami belum menyenaraikan sumber untuk semua tahap.</p></div>}
  </section>;
}

export function FurtherReading({ ids, allowExternalLinks }: { ids: string[]; allowExternalLinks: boolean }) {
  if (!allowExternalLinks) return <p className="resourceReview">Bacaan lanjut di laman luar tersedia selepas sesi belajar tamat.</p>;
  const items = referenceMaterials.filter(item => ids.includes(item.id));
  if (!items.length) return null;
  return <section className="referenceBox furtherReading"><h3>Bacaan lanjut</h3>
    <p>Pautan ini berkaitan topik pembelajaran. Soalan original Study bukan petikan daripada sumber ini dan belum mendapat pengesahan penyumbangnya.</p>
    <ul>{items.map(item => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} <ExternalLink aria-hidden="true"/></a><small>{item.publisher} · {item.curriculumReview}</small></li>)}</ul>
  </section>;
}
