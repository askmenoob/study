import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { ReferenceLibrary, FurtherReading } from "./ReferenceLibrary";

describe("references respect the child focus-session boundary", () => {
  it("exposes source links in ordinary sessions", () => {
    const html = renderToStaticMarkup(createElement(ReferenceLibrary, { levelId: "d4", subjectId: "math", query: "", allowExternalLinks: true }));
    expect(html).toContain('href="https://gurubesar.my/latihan-matematik-tahun-4/"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("does not render a source link in a focus session even if the panel is requested", () => {
    const html = renderToStaticMarkup(createElement(ReferenceLibrary, { levelId: "d4", subjectId: "math", query: "", allowExternalLinks: false }));
    expect(html).not.toContain("href=");
    expect(html).toContain("selepas sesi belajar tamat");
  });
  it("also blocks further-reading links inside a practice pack", () => {
    const html = renderToStaticMarkup(createElement(FurtherReading, { ids: ["gb-fractions"], allowExternalLinks: false }));
    expect(html).not.toContain("href=");
    expect(html).toContain("selepas sesi belajar tamat");
    const ordinary = renderToStaticMarkup(createElement(FurtherReading, { ids: ["gb-fractions"], allowExternalLinks: true }));
    expect(ordinary).toContain('href="https://gurubesar.my/nota-padat-matematik-pecahan/"');
  });
});
