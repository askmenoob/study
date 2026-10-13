import type { ReadingEvidence, ReadingIllustration } from "../../server/library/catalog";
import { LearningPicture } from "./LearningPicture";
import "./IllustratedReading.css";

export function IllustratedReading({ body, illustrations = [] }: { body: string[]; illustrations?: ReadingIllustration[] }) {
  return <div className="illustratedReading">{body.map((paragraph, index) => <section className="readingPanel" key={index}>
    <span className="readingParagraph">Perenggan {index + 1}</span><p dir="auto">{paragraph}</p>
    {illustrations.filter(picture => picture.afterParagraph === index).map((picture, pictureIndex) => <figure key={pictureIndex}>
      <LearningPicture visual={picture.visual}/><figcaption dir="auto">{picture.caption}</figcaption>
    </figure>)}
  </section>)}</div>;
}

export function ReadingEvidenceNote({ evidence }: { evidence?: ReadingEvidence }) {
  if (!evidence) return null;
  return <aside className="readingEvidence"><b>Bukti dalam bacaan · Perenggan {evidence.paragraph + 1}</b><blockquote dir="auto">{evidence.text}</blockquote></aside>;
}
