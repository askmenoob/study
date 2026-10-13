import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LearningPicture } from "./LearningPicture";
import { validPictureSupport, type LearningVisual } from "../../server/library/earlyLearning";

it("renders visible syllables and zero with accessible labels", () => {
  for (const text of ["ba", "0", "بَ"]) {
    const visual: LearningVisual = {label: `Kad ${text}`, items: [{kind: "glyph", text}]};
    const html = renderToStaticMarkup(createElement(LearningPicture, {visual}));
    expect(html).toContain(`aria-label="Kad ${text}"`);
    expect(html).toContain(`>${text}</text>`);
    expect(validPictureSupport({choices: Array(4).fill(visual)})).toBe(true);
  }
});
it("rejects blank or oversized glyphs and keeps text escaped", () => {
  for (const text of [undefined, " ", "123456789"]) {
    expect(validPictureSupport({choices: Array(4).fill({label: "Kad",items:[{kind:"glyph",text}]})})).toBe(false);
  }
  const html = renderToStaticMarkup(createElement(LearningPicture, {visual:{label:"Simbol",items:[{kind:"glyph",text:"<a>"}]}}));
  expect(html).toContain("&lt;a&gt;");
  expect(html).not.toContain("<a>");
});
it("distinguishes a triangle from a square using actual geometry", () => {
  const render = (kind: "triangle" | "square") => renderToStaticMarkup(createElement(LearningPicture,{visual:{label:kind,items:[{kind}]}}));
  expect(render("triangle")).toContain('points="50,10 90,85 10,85"');
  expect(render("square")).toContain('width="68" height="68"');
});
