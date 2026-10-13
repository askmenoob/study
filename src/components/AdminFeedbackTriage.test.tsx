import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FeedbackTriageList } from "./AdminFeedbackTriage";

const record = {
  id: "11111111-1111-4111-8111-111111111111",
  referenceId: "FB-11111111-1111-4111-8111-111111111111",
  message: "<script>secret alert</script>",
  createdAt: "2026-10-14T00:00:00Z",
  status: "open" as const, version: 0, note: null, reviewedAt: null,
};
describe("moderation feedback queue",()=>{
  it("renders escaped messages and controls, no reply-delivery claims",()=>{
    const html=renderToStaticMarkup(createElement(FeedbackTriageList,{
      items:[record],onReview:vi.fn(),busy:"",
    }));
    expect(html).toContain("Baharu");
    expect(html).toContain("Simpan semakan");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("Email berjaya dihantar");
    expect(html).not.toContain("Balas ibu bapa");
  });
  it("uses honest empty state",()=>{
    const html=renderToStaticMarkup(createElement(FeedbackTriageList,{items:[],onReview:vi.fn(),busy:""}));
    expect(html).toContain("Tiada laporan masalah");
  });
});
