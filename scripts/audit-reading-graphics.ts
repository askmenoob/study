import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resources } from '../src/data/resources';
import { readingArtPath, readingFocus, readingFractions, readingTheme, readingThemes } from '../src/data/readingGraphics';
import { earlyFrames } from '../server/library/earlyLearning';

const errors:string[]=[];
const rows=resources.map(resource=>{
  const theme=readingTheme(resource),art=readingArtPath(theme),focus=readingFocus(resource.body);
  if(!existsSync(`public${art}`)) errors.push(`${resource.id}: missing ${art}`);
  if(!focus.length) errors.push(`${resource.id}: empty reading map`);
  for(const illustration of resource.illustrations??[]) {
    if(!resource.body[illustration.afterParagraph]||!illustration.caption.trim()||!illustration.visual.label.trim()||!illustration.visual.items.length) errors.push(`${resource.id}: invalid authored illustration`);
  }
  return {id:resource.id,kind:resource.kind,levels:resource.levelIds?.join(',')??'',subject:resource.subjectId,title:resource.title,theme,art,
    previousVisible:Boolean(resource.unitId&&resource.levelIds?.includes('d1')||resource.sourceIds&&resource.illustrations?.length),
    authoredParagraphGraphics:resource.illustrations?.length??0,earlyPictureFrames:resource.unitId?earlyFrames[resource.unitId]?.length??0:0,
    sourceParagraphs:resource.body.length,mapParagraphs:focus.map(point=>point.paragraph+1).join(','),fractionModels:readingFractions(resource,resource.body).map(f=>f.label).join(','),
    newGraphicAvailable:existsSync(`public${art}`),audit:'Structural/render coverage; theme illustration is shared, reading-map excerpts are resource-specific. Not educator approval.'};
});
const readings=rows.filter(row=>row.kind==='reading');
const summary={resources:rows.length,readings:readings.length,previousReadingsWithVisibleGraphics:readings.filter(row=>row.previousVisible).length,newReadingsWithGraphics:readings.filter(row=>row.newGraphicAvailable).length,
  existingReadingParagraphGraphics:readings.reduce((n,row)=>n+row.authoredParagraphGraphics,0),
  byLevel:[...new Set(readings.map(row=>row.levels))].sort().map(level=>({level,readings:readings.filter(row=>row.levels===level).length,withGraphics:readings.filter(row=>row.levels===level&&row.newGraphicAvailable).length})),
  themes:Object.keys(readingThemes).map(theme=>({theme,readings:readings.filter(row=>row.theme===theme).length,bytes:existsSync(`public${readingArtPath(theme as keyof typeof readingThemes)}`)?statSync(`public${readingArtPath(theme as keyof typeof readingThemes)}`).size:0})),errors};
mkdirSync('docs/audits',{recursive:true});
writeFileSync('docs/audits/READING_GRAPHICS_INVENTORY.json',JSON.stringify({summary,rows},null,2)+'\n');
const csv=(value:unknown)=>'"'+String(value).replaceAll('"','""')+'"';
const keys=Object.keys(rows[0]) as Array<keyof typeof rows[0]>;
writeFileSync('docs/audits/READING_GRAPHICS_INVENTORY.csv','\uFEFF'+[keys.map(csv).join(','),...rows.map(row=>keys.map(key=>csv(row[key])).join(','))].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
process.exitCode=errors.length?1:0;
