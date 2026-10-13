import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminFeedbackList } from "./AdminFeedbackInbox";

describe("super-admin feedback inbox", () => {
  it("renders escaped parent feedback without exposing raw markup or delivery state", () => {
    const html = renderToStaticMarkup(createElement(AdminFeedbackList, { feedback: [{
      id: "feedback-id",
      referenceId: "FB-20260912-1001",
      category: "problem",
      message: '<script>alert("unsafe")</script> Paparan sukar dibaca.',
      pagePath: "/settings",
      allowReply: true,
      parentEmail: "parent@example.test",
      parentDisplayName: "Ibu Arif",
      createdAt: "2026-09-12T08:00:00Z",
    }] }));

    expect(html).toContain("FB-20260912-1001");
    expect(html).toContain("Masalah");
    expect(html).toContain("Ibu Arif");
    expect(html).toContain("parent@example.test");
    expect(html).toContain("Akaun ibu bapa");
    expect(html).toContain("Boleh dihubungi semula");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html.toLowerCase()).not.toContain("delivery");
    expect(html.toLowerCase()).not.toContain("email");
  });

  it("shows an honest empty state", () => {
    const html = renderToStaticMarkup(createElement(AdminFeedbackList, { feedback: [] }));
    expect(html).toContain("Belum ada maklum balas");
  });
});
