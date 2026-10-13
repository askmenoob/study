import { expect, it } from "vitest";
import { challengeSubjects, validateChallengeQuestion } from "./challengeGenerator.js";
import { challengeTemplates } from "./challengeTemplates.js";

// Solve the displayed problems independently; never import the generator's answer calculation.
function solve(prompt: string): number | string {
  let m: RegExpMatchArray|null;
  if ((m=prompt.match(/^(\d+) \+ (\d+) =/))) return +m[1]+ +m[2];
  if ((m=prompt.match(/^(\d+) bekas masing-masing ada (\d+) pemadam/))) return +m[1]* +m[2];
  if ((m=prompt.match(/^(\d+) pemadam dibahagi sama rata ke dalam (\d+) bekas/))) return +m[1]/ +m[2];
  if ((m=prompt.match(/digunakan sebanyak (\d+)\/(\d+) dan 1\//))) return `${+m[1]+1}/${m[2]}`;
  if ((m=prompt.match(/kepada (\d+) bahagian sama panjang\. (\d+) bahagian digunakan/))) return `${+m[1]- +m[2]}/${m[1]}`;
  if ((m=prompt.match(/^Fail berharga RM(\d+\.\d+) dan pelekat RM(\d+\.\d+)/))) return `RM${(+m[1]+ +m[2]).toFixed(2)}`;
  if ((m=prompt.match(/^Jumlah belian RM(\d+\.\d+) dibayar dengan RM(\d+\.\d+)/))) return `RM${(+m[2]- +m[1]).toFixed(2)}`;
  if ((m=prompt.match(/^(\d+)% daripada (\d+) anak pokok/))) return prompt.includes("Bakinya") ? +m[2]*(100- +m[1])/100 : +m[1]* +m[2]/100;
  if ((m=prompt.match(/^Selesaikan (\d+)x \+ (\d+) = (\d+)/))) return (+m[3]- +m[2])/ +m[1];
  if ((m=prompt.match(/berdiameter (\d+) cm dan tinggi (\d+) cm/))) return 22/7*(+m[1]/2)**2* +m[2];
  if ((m=prompt.match(/berukuran (\d+) cm pada pelan berskala 1:(\d+)/))) return +m[1]* +m[2]/100;
  if ((m=prompt.match(/^Selesaikan x² − (\d+)x \+ (\d+) = 0 dengan syarat x > (\d+)/))) {
    const roots=[(+m[1]+Math.sqrt((+m[1])**2-4* +m[2]))/2,(+m[1]-Math.sqrt((+m[1])**2-4* +m[2]))/2];
    const valid=roots.filter(x=>x>+m![3]); expect(valid).toHaveLength(1); return valid[0];
  }
  if ((m=prompt.match(/secara (langsung|songsang).*Apabila x = (\d+), y = (\d+)\. Cari y apabila x = (\d+)/))) return m[1]==="langsung" ? +m[3]/ +m[2]* +m[4] : +m[2]* +m[3]/ +m[4];
  if ((m=prompt.match(/^For f\(x\) = (\d+)x² − (\d+)x \+ (\d+)/))) return +m[2]/(2* +m[1]);
  if ((m=prompt.match(/x \+ y ≤ (\d+), 2x \+ y ≤ (\d+)/))) {
    let best=0;
    // Half-integer lattice includes all vertices of these displayed constraints.
    for(let x=0;x<=+m[1];x+=.5) for(let y=0;y<=+m[1];y+=.5) if(x+y<=+m[1]&&2*x+y<=+m[2]) best=Math.max(best,30*x+20*y);
    return best;
  }
  throw new Error(`Unrecognised displayed problem: ${prompt}`);
}

it("solves every numeric template, varies distractor rank and changes concept between grades",()=>{
  const all=new Map<string,string>(), correctRanks=new Set<number>(), positions=new Set<number>();
  for(const subject of challengeSubjects()) {
    const questions=challengeTemplates({...subject,questions:[]});
    if(subject.levelId==="d1") { expect(questions).toEqual([]); continue; }
    for(const q of questions) {
      expect(validateChallengeQuestion(q),q.prompt).toBe(true);
      const answer=q.options[q.answer], expected=solve(q.prompt);
      if(typeof expected==="string") expect(answer,q.prompt).toBe(expected); else expect(Number(answer),q.prompt).toBeCloseTo(expected,8);
      expect(q.resourceIds?.[0]).toMatch(/^library-.*-note$/);
      expect(q.conceptId).toBe(q.resourceIds![0].replace(/-note$/,""));
      expect(all.has(q.prompt),`Repeated across ${all.get(q.prompt)} and ${subject.levelId}: ${q.prompt}`).toBe(false); all.set(q.prompt,subject.levelId);
      positions.add(q.answer);
      const values=q.options.map(v=>Number(v.replace(/^RM/,"").split("/")[0]));
      correctRanks.add(values.filter(v=>v<values[q.answer]).length);
    }
  }
  expect(all.size).toBeGreaterThan(400);
  expect(correctRanks).toEqual(new Set([0,1,2,3])); expect(positions).toEqual(new Set([0,1,2,3]));
});
