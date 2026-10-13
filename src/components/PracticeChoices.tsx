import { CircleCheck } from "lucide-react";
import { PRACTICE_SET_SIZE, type PracticeMode, type PracticePool } from "../lib/practice";
import "./PracticeChoices.css";

export function PracticeChoices({ pool, onStart }: { pool: PracticePool; onStart: (mode: PracticeMode) => void }) {
  if (!pool.total) return <div className="practiceChoices"><p>Soalan untuk topik ini belum tersedia.</p></div>;
  return <div className="practiceChoices">
    <p>{pool.answered}/{pool.total} soalan telah dijawab · {pool.unseen.length} belum dijawab</p>
    {pool.hasLegacyHistory && <small>Rekod lama tidak menyimpan ID soalan. Sesetengah soalan mungkin muncul semula.</small>}
    {pool.unseen.length ? <button type="button" onClick={() => onStart("new")}>Sambung latihan · {Math.min(PRACTICE_SET_SIZE, pool.unseen.length)} soalan baharu</button>
      : <p className="practiceComplete"><CircleCheck aria-hidden="true" />Semua soalan yang tersedia untuk topik ini sudah dijawab. Tiada soalan baharu dalam set ini.</p>}
    {pool.answered > 0 && <div className="practiceReview">
      {pool.incorrect.length > 0 && <button type="button" onClick={() => onStart("incorrect")}>Ulang soalan salah ({pool.incorrect.length})</button>}
      <button type="button" onClick={() => onStart("review")}>Sambung ulang kaji · {Math.min(PRACTICE_SET_SIZE, pool.total)} soalan</button>
    </div>}
    <small>Tiada had sesi harian. Sambung apabila bersedia, atau berehat dahulu.</small>
  </div>;
}
