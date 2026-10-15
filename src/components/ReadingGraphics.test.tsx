import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { resources } from '../data/resources';
import { readingArtPath, readingFocus, readingFractions, readingTheme, readingThemes } from '../data/readingGraphics';
import { ReadingArtwork, ReadingVisualGuide } from './ReadingGraphics';
import { IllustratedReading } from './IllustratedReading';
import { LearningLibrary } from './LearningLibrary';
import { getSubjectsForLevel, levels } from '../data/curriculum';
import scienceReadingThemes from '../data/scienceReadingThemes.json';

it('covers all 1200 published readings with an actual local image and traceable reading map',()=>{
  const readings=resources.filter(resource=>resource.kind==='reading');
  expect(readings).toHaveLength(1200);
  const failures:string[]=[];
  for(const resource of resources) {
    if(resource.subjectId==='science') expect(resource.unitId! in scienceReadingThemes,resource.id).toBe(true);
    const theme=readingTheme(resource),path=readingArtPath(theme),html=renderToStaticMarkup(createElement(ReadingVisualGuide,{resource}));
    if(!existsSync(`public${path}`)||!html.includes(path)||!html.includes('<ol class="readingFocusMap">')) failures.push(resource.id);
    const points=readingFocus(resource.body);
    expect(points.length,resource.id).toBeGreaterThan(0);
    for(const point of points) expect(resource.body[point.paragraph].startsWith(point.text.replace(/…$/u,'')),resource.id).toBe(true);
  }
  expect(failures).toEqual([]);
},20000);
it('does not invent numerical models from dates, prose, attached answers or nonmathematical subjects',()=>{
  expect(readingFractions({subjectId:'math'},['Tarikh 3/4/2026.'])).toEqual([]);
  expect(readingFractions({subjectId:'bm'},['Cerita pecahan 1/2.'])).toEqual([]);
  expect(readingFractions({subjectId:'math'},['Pecahan 5/3, 1/0, 1/100 dan 3/4.'])).toEqual([{numerator:3,denominator:4,label:'3/4'}]);
  expect(readingFractions({subjectId:'math'},['Pecahan 1/2 dan 1/4; 1/2 sekali lagi.'])).toHaveLength(2);
  expect(readingFractions({subjectId:'math'},['Pecahan -1/2, −3/4 dan 0.1/2.'])).toEqual([]);
  const resource={subjectId:'math',title:'Pecahan',summary:'Contoh asal.',body:['Pecahan 3/4.'],questions:[{prompt:'Jawapan rahsia',options:[],answer:0,explanation:'',hint:''}]};
  const html=renderToStaticMarkup(createElement(ReadingVisualGuide,{resource}));
  expect(html).toContain('3 daripada 4 bahagian sama besar dilorek');
  expect((html.match(/class="shaded"/g)??[]).length).toBe(3);
  expect(html).not.toContain('Jawapan rahsia');
});
it('retains every authored paragraph illustration including resources without sourceIds',()=>{
  for(const resource of resources.filter(r=>r.illustrations?.length)) {
    const html=renderToStaticMarkup(createElement(IllustratedReading,{body:resource.body,illustrations:resource.illustrations}));
    expect((html.match(/<figure>/g)??[]).length,resource.id).toBe(resource.illustrations!.length);
  }
});
it('reaches the new graphics through every published reading entry, including the D1 teaching-first route',()=>{
  const failures:string[]=[];
  for(const resource of resources.filter(r=>r.kind==='reading')) {
    const level=levels.find(item=>item.id===resource.levelIds?.[0])!;
    const html=renderToStaticMarkup(createElement(LearningLibrary,{levelId:level.id,stage:level.stage,levelLabel:level.label,subjects:getSubjectsForLevel(level.id),onOpenSubject:()=>{},initialResourceId:resource.id,allowExternalLinks:false}));
    if(!html.includes(readingArtPath(readingTheme(resource)))||!html.includes('readingVisualGuide')) failures.push(resource.id);
    expect(html).not.toContain('href="http');
  }
  expect(failures).toEqual([]);
},20000);
it('uses meaningful subject themes, English copy, escaped multilingual text and lazy decorative thumbnails',()=>{
  expect(Object.keys(readingThemes)).toHaveLength(13);
  expect(readingTheme({subjectId:'chemistry',title:'Buffer',summary:'Acid'})).toBe('matter');
  expect(readingTheme({subjectId:'science',title:'Litar elektrik',summary:'Tenaga'})).toBe('energy');
  expect(readingTheme({subjectId:'science',title:'Benih mula bercambah',summary:'Bahan untuk tugas kelas.'})).toBe('nature');
  expect(readingTheme({subjectId:'science',unitId:'library-d4-science-cahaya-dan-bayang',title:'Bayang di halaman',summary:'Perhatikan satu penyiasatan.'})).toBe('energy');
  expect(readingTheme({subjectId:'science',title:'Gas dalam bekas',summary:'Perhatikan sifat jirim.'})).toBe('matter');
  expect(readingTheme({subjectId:'science',title:'Tugas pemerhatian',summary:'Catat pertumbuhan.'})).toBe('nature');
  expect(readingTheme({subjectId:'science',unitId:'library-t3-science-expand-pertukaran-gas-pada-alveolus',title:'Pertukaran gas',summary:'Tekanan udara.'})).toBe('nature');
  expect(readingTheme({subjectId:'science',unitId:'library-t5-science-expanded-c87b5804e3',title:'Kadar tindak balas',summary:'Pemboleh ubah.'})).toBe('matter');
  expect(readingTheme({subjectId:'tahfiz',title:'',summary:''})).toBe('faith');
  const resource={subjectId:'en',title:'The Book',summary:'Read and discover.',body:['A book is open.'],language:'en' as const};
  const html=renderToStaticMarkup(createElement(ReadingVisualGuide,{resource}));
  expect(html).toContain('Visual reading guide');expect(html).toContain('Reading map');
  const preview=renderToStaticMarkup(createElement(ReadingArtwork,{resource,preview:true}));
  expect(preview).toContain('loading="lazy"');expect(preview).toContain('alt=""');
  const multilingual=renderToStaticMarkup(createElement(ReadingVisualGuide,{resource:{...resource,summary:'<script>unsafe</script> العربية 中文 தமிழ்'}}));
  expect(multilingual).not.toContain('<script>');expect(multilingual).toContain('dir="auto"');
});
