import { describe, expect, it } from "vitest";
import { parsePastedStudyLink } from "./studyLinkInput";
const origin = "https://study.imai.my";
const code = "Ab9_-".repeat(8) + "xyz";

describe("pasted links in a kiosk without an address bar", () => {
  it("accepts the generated child link and surrounding copy whitespace", () => {
    expect(parsePastedStudyLink("  " + origin + "/#join=" + code + "\n", origin)).toBe(code);
  });
  it("rejects a foreign site even when it contains a valid looking code", () => {
    for (const host of ["https://evil.example", "https://study.imai.my.evil.example", "http://study.imai.my"]) {
      expect(parsePastedStudyLink(host + "/#join=" + code, origin)).toBeNull();
    }
  });
  it("rejects userinfo, unrelated paths and query strings", () => {
    for (const prefix of ["https://parent:password@study.imai.my/", origin + "/other", origin + "/?code=secret"]) {
      expect(parsePastedStudyLink(prefix + "#join=" + code, origin)).toBeNull();
    }
  });
  it("rejects ambiguous fragments instead of choosing an arbitrary child", () => {
    for (const fragment of ["join=" + code + "&join=" + code, "join=" + code + "&other=x"]) {
      expect(parsePastedStudyLink(origin + "/#" + fragment, origin)).toBeNull();
    }
  });
  it("rejects missing, malformed and oversized input without navigation", () => {
    for (const value of ["", code, "/#join=" + code, "javascript:alert(1)", origin + "/", origin + "/#join=", origin + "/#join=invalid", origin + "/#join=" + code + "x", "x".repeat(4096)]) {
      expect(parsePastedStudyLink(value, origin)).toBeNull();
    }
  });
  it("decodes only URL fragment encoding and validates the exact token alphabet", () => {
    expect(parsePastedStudyLink(origin + "/#join=" + code.replace("A", "%41"), origin)).toBe(code);
    expect(parsePastedStudyLink(origin + "/#join=" + "a".repeat(42) + "%2F", origin)).toBeNull();
    expect(parsePastedStudyLink(origin + "/#join=" + "a".repeat(42) + "%0A", origin)).toBeNull();
  });
});
