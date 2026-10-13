import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TutorMessageView, TutorPanel } from "./TutorPanel";

vi.mock("../data/resources", async (importOriginal) => {
  const original = await importOriginal<typeof import("../data/resources")>();
  return { ...original, resources: [...original.resources, {
    id: "d4-only-note", kind: "note", title: "Nota khusus Darjah 4", subjectId: "math",
    stages: ["KSSR"], levelIds: ["d4"], summary: "Nota mengikut tahap", minutes: 2, body: ["Kandungan Darjah 4"],
  }] };
});

const panel = (props: Partial<Parameters<typeof TutorPanel>[0]> = {}) =>
  renderToStaticMarkup(createElement(TutorPanel, { studentId: "child-1", levelId: "d4", initialSubjectId: "math", ...props }));

describe("tutor context controls", () => {
  it("offers a labelled multiline question, new conversation, and no premature solution action", () => {
    const html = panel();
    expect(html).toContain('for="tutor-question"');
    expect(html).toContain('<textarea');
    expect(html).toContain('maxLength="1200"');
    expect(html).not.toContain('minLength=');
    expect(html).toContain("Perbualan baharu");
    expect(html).toContain("Kongsi soalan sahaja; jangan masukkan nama penuh, nombor telefon atau maklumat peribadi.");
    expect(html).toContain('aria-describedby="tutor-question-help tutor-question-privacy"');
    expect(html).not.toContain("Tunjukkan langkah penyelesaian");
    expect(html).not.toContain("Saya perlukan petunjuk");
  });

  it("filters notes by subject, stage and explicit level, and excludes practice packs", () => {
    const primary = panel();
    expect(primary).toContain('value="library-d4-math-pecahan-bahagian-sama-note"');
    expect(primary).toContain('value="d4-only-note"');
    expect(primary).not.toContain('value="library-d4-science-cahaya-dan-bayang-note"');
    expect(primary).not.toContain('value="library-t1-math-persamaan-seimbang-note"');
    expect(primary).not.toContain('value="math-practice-word"');
    expect(panel({ levelId: "d3" })).not.toContain('value="d4-only-note"');
    const secondary = panel({ levelId: "t1" });
    expect(secondary).toContain('value="library-t1-math-persamaan-seimbang-note"');
    expect(secondary).not.toContain('value="library-d4-math-pecahan-bahagian-sama-note"');
  });

  it("opens an eligible local note with its subject and internal text", () => {
    const html = panel({ initialResourceId: "library-d4-science-cahaya-dan-bayang-note" });
    expect(html).toContain('value="science" selected=""');
    expect(html).toContain('value="library-d4-science-cahaya-dan-bayang-note" selected=""');
    expect(html).toContain("Baca nota dipilih:");
    expect(html).toContain("cahaya bergerak lurus");
    expect(html).not.toContain('href=');
  });

  it("ignores practice and out-of-level initial resources", () => {
    for (const initialResourceId of ["math-practice-word", "library-t1-math-persamaan-seimbang-note"]) {
      const html = panel({ initialResourceId });
      expect(html).not.toContain("Baca nota dipilih:");
      expect(html).toContain('value="" selected=""');
    }
  });

  it("requires a selected student instead of inventing a local reply", () => {
    const html = panel({ studentId: undefined });
    expect(html).toContain("Pilih atau tambah profil anak");
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });
});

describe("tutor response attribution", () => {
  it("renders supplied note excerpts as collapsible escaped text without external navigation", () => {
    const html = renderToStaticMarkup(createElement(TutorMessageView, { message: {
      role: "assistant", text: "<script>unsafe()</script>", provider: "gemini-free:test", support: "study-notes",
      sources: [{ id: "note-1", title: "<img src=x>", excerpt: '<a href="https://example.com">Petikan</a>' }],
    } }));
    expect(html).toContain("Nota yang dibekalkan kepada tutor");
    expect(html).toContain("<details>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).toContain("&lt;a href=&quot;https://example.com&quot;&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<a ");
  });

  it("identifies general guidance and an honest local fallback", () => {
    const html = renderToStaticMarkup(createElement(TutorMessageView, { message: {
      role: "assistant", text: "Cuba satu langkah.", provider: "local", support: "general",
    } }));
    expect(html).toContain("Panduan setempat");
    expect(html).toContain("AI dalam talian belum tersedia");
    expect(html).toContain("Panduan umum");
    expect(html).toContain("Tiada nota Study dibekalkan");
    expect(html).not.toContain("Nota yang dibekalkan kepada tutor");
  });
});
