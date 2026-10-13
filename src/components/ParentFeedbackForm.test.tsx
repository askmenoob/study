import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedbackApiError } from "../lib/feedbackApi";
import { ParentFeedbackForm, shouldRetryFeedbackWithSameRequestId, validateParentFeedback } from "./ParentFeedbackForm";

describe("parent feedback form", () => {
  it("renders the parent-only feedback fields, privacy guidance and accessible status targets", () => {
    const html = renderToStaticMarkup(createElement(ParentFeedbackForm));
    expect(html).toContain("Cadangan &amp; maklum balas");
    expect(html).toContain('value="suggestion"');
    expect(html).toContain('value="problem"');
    expect(html).toContain('value="other"');
    expect(html).toContain("Saya bersetuju untuk dihubungi bagi tindakan lanjut");
    expect(html.toLowerCase()).not.toContain("email");
    expect(html).toContain('maxLength="2000"');
    expect(html).toContain('aria-describedby="parent-feedback-help parent-feedback-privacy"');
    expect(html).toContain("Jangan masukkan kata laluan");
    expect(html).toContain('type="submit"');
  });

  it("validates meaningful trimmed feedback at the same public seam as submission", () => {
    expect(validateParentFeedback("  ")).toContain("maklum balas");
    expect(validateParentFeedback("Pendek")).toContain("sekurang-kurangnya");
    expect(validateParentFeedback("x".repeat(2001))).toContain("2,000");
    expect(validateParentFeedback("  Sila tambah latihan membaca yang lebih pendek.  ")).toBeNull();
  });

  it("locks the same idempotent request only when the save result is uncertain", () => {
    expect(shouldRetryFeedbackWithSameRequestId(new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetryFeedbackWithSameRequestId(new FeedbackApiError("HTTP_500", 500))).toBe(true);
    expect(shouldRetryFeedbackWithSameRequestId(new FeedbackApiError("INVALID_INPUT", 400))).toBe(false);
    expect(shouldRetryFeedbackWithSameRequestId(new FeedbackApiError("UNAUTHORIZED", 401))).toBe(false);
  });
});
