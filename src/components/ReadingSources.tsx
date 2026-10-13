import { ExternalLink } from "lucide-react";
import { readingSources } from "../../server/library/readingSources";
export function ReadingSources({ levelId, allowExternalLinks }: { levelId: string; allowExternalLinks: boolean }) {
  if (!allowExternalLinks || !levelId.startsWith("d")) return null;
  return <section aria-label="Bacaan tambahan di luar Study" className="readingSourceList">
    <div><h3>Terokai bacaan bersama</h3><p>Pautan ini membuka laman luar. Pilih buku bersama ibu bapa atau guru. Latihan dalam Study berpaut kepada bacaan dalam Study; buku luar ini belum mempunyai latihan yang dipadankan.</p></div>
    {readingSources.filter(source => source.levels.includes(levelId)).map(source => <article key={source.id}>
      <small>{source.language}{source.pictureBooks ? " · Bahan bergambar" : ""}</small><h3>{source.title}</h3><p>{source.description}</p>
      <a href={source.url} target="_blank" rel="noreferrer">Buka sumber <ExternalLink size={16}/></a>
      <details><summary>Asal dan penggunaan bahan</summary><p>{source.rights}</p><small>Disemak {source.checkedAt}. Cadangan darjah mengikut kesesuaian bacaan, bukan pengesahan silibus penuh.</small></details>
    </article>)}
  </section>;
}
