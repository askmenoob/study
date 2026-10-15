import type { CSSProperties } from 'react';
import { BookOpen, ScanText, Shapes } from 'lucide-react';
import type { LearningResource } from '../data/resources';
import { readingArtPath, readingFocus, readingFractions, readingTheme, readingThemes } from '../data/readingGraphics';
import './ReadingGraphics.css';

type VisualResource = Pick<LearningResource,'subjectId'|'title'|'summary'|'body'|'language'> & Partial<Pick<LearningResource,'unitId'>>;
export function ReadingArtwork({ resource, preview=false }: {resource:VisualResource;preview?:boolean}) {
  const theme=readingTheme(resource), english=resource.language==='en';
  return <div className={`readingArtwork readingArtwork-${theme}${preview?' readingArtworkPreview':''}`} style={{'--reading-accent':readingThemes[theme].accent} as CSSProperties}>
    <span className="readingArtHalo" aria-hidden="true"/>
    <img src={readingArtPath(theme)} alt="" width="640" height="480" loading={preview?'lazy':'eager'} decoding="async"/>
    {!preview&&<span className="readingArtLabel"><Shapes aria-hidden="true"/>{english?readingThemes[theme].english:readingThemes[theme].name}</span>}
  </div>;
}
export function ReadingVisualGuide({resource,body=resource.body}:{resource:VisualResource;body?:string[]}) {
  const english=resource.language==='en', theme=readingTheme(resource), focus=readingFocus(body), fractions=readingFractions(resource,body);
  if (!focus.length) return null;
  return <section className="readingVisualGuide" style={{'--reading-accent':readingThemes[theme].accent} as CSSProperties} aria-label={english?'Visual reading guide':'Panduan grafik bacaan'}>
    <div className="readingVisualIntro"><div><span className="readingVisualEyebrow"><BookOpen aria-hidden="true"/>{english?'LOOK · READ · CONNECT':'LIHAT · BACA · HUBUNGKAN'}</span><h3>{english?'Explore this reading':'Terokai bacaan ini'}</h3><p dir="auto">{resource.summary}</p><small>{english?'The artwork introduces the theme. Use the passage for facts and details.':'Ilustrasi memperkenalkan tema. Rujuk teks untuk fakta dan butiran.'}</small></div><ReadingArtwork resource={resource}/></div>
    <details className="readingFocusDetails" open><summary><ScanText aria-hidden="true"/>{english?'Reading map':'Peta bacaan'}<span>{english?'From the passage':'Daripada teks'}</span></summary><ol className="readingFocusMap">{focus.map(point=><li key={point.paragraph}><span className="readingFocusNumber" aria-hidden="true">{String(point.paragraph+1).padStart(2,'0')}</span><div><b>{english?'Paragraph':'Perenggan'} {point.paragraph+1}</b><p dir="auto">{point.text}</p></div></li>)}</ol></details>
    {fractions.length>0&&<figure className="readingFractionFigure"><figcaption>{english?'Fractions named in the passage':'Pecahan yang disebut dalam teks'}</figcaption><div className="readingFractionGrid">{fractions.map(fraction=><div className="readingFractionModel" key={fraction.label}><b>{fraction.label}</b><div className="readingFractionStrip" role="img" aria-label={english?`${fraction.numerator} of ${fraction.denominator} equal parts shaded`:`${fraction.numerator} daripada ${fraction.denominator} bahagian sama besar dilorek`}>{Array.from({length:fraction.denominator},(_,i)=><span className={i<fraction.numerator?'shaded':''} key={i}/>)}</div></div>)}</div></figure>}
  </section>;
}
