import { describe,it,expect } from "vitest";
import { malaysiaTime,malaysiaInputToIso } from "./tuitionApi";
describe("Malaysia slot times",()=>{
  it("interprets form input as Malaysia time regardless of host timezone",()=>{
    expect(malaysiaInputToIso("2026-12-01T10:00")).toBe("2026-12-01T02:00:00.000Z");
    expect(malaysiaInputToIso("2026-12-01T00:30")).toBe("2026-11-30T16:30:00.000Z");
  });
  it("renders the Malaysia date across a UTC midnight boundary",()=>{
    expect(malaysiaTime("2026-11-30T16:30:00.000Z")).toContain("1 Dis 2026");
  });
});
