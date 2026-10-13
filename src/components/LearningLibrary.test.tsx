import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearningLibrary } from "./LearningLibrary";
import { getSubjectsForLevel } from "../data/curriculum";
import { resources } from "../data/resources";

const render = (allowExternalLinks: boolean) => renderToStaticMarkup(createElement(LearningLibrary, {
  levelId: "t6", stage: "STPM", levelLabel: "Tingkatan 6", subjects: getSubjectsForLevel("t6"),
  onOpenSubject: () => {}, allowExternalLinks,
}));
describe("expanded Library first view", () => {
  it("opens the exact teaching source selected from challenge feedback", () => {
    const resource=resources.find(r=>r.unitId&&r.levelIds?.includes("t6")&&r.kind==="note")!;
    const html=renderToStaticMarkup(createElement(LearningLibrary,{levelId:"t6",stage:"STPM",levelLabel:"Tingkatan 6",subjects:getSubjectsForLevel("t6"),initialResourceId:resource.id,onOpenSubject:()=>{}}));
    expect(html).toContain('class="readerCard"');
    expect(html).toContain(resource.title);
  });
  it("does not open a source for a different academic level", () => {
    const resource=resources.find(r=>r.unitId&&r.levelIds?.includes("t6")&&r.kind==="note")!;
    const html=renderToStaticMarkup(createElement(LearningLibrary,{levelId:"d1",stage:"KSSR",levelLabel:"Darjah 1",subjects:getSubjectsForLevel("d1"),initialResourceId:resource.id,onOpenSubject:()=>{}}));
    expect(html).not.toContain('class="readerCard"');
    expect(html).toContain("Library kamu");
  });
  it("renders a bounded first page and accessible discovery controls", () => {
    const html = render(true);
    expect((html.match(/class="resourceCard"/g) ?? [])).toHaveLength(12);
    expect(html).toContain("Library kamu");
    expect(html).toContain('aria-label="Cari bahan Library"');
    expect(html).toContain('aria-label="Subjek Library"');
    expect(html).toContain("Lihat 12 bahan lagi");
    expect(html).toContain("Disimpan pada peranti ini");
  });
  it("keeps focus sessions inside the learner's Library", () => {
    const html = render(false);
    expect(html).not.toContain("Rujukan GuruBesar &amp; KPM");
    expect(html).not.toContain("Sumber &amp; Lesen");
    // React may preload the local hero image using a link element.
    // Focus gating must block navigable anchors, not local asset preloads.
    expect(html).not.toMatch(/<a\b[^>]*\bhref=/);
    expect(html).toContain("Teks Latihan");
  });
});
