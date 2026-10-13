import { describe, expect, it } from "vitest";
import { isSuperAdminRole, isTeacherRole, shouldLoadFamily } from "./accountRole";

describe("authenticated app role boundary", () => {
  it("keeps the super admin outside family and student bootstrap", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(shouldLoadFamily("super_admin")).toBe(false);
  });

  it("keeps existing parent and student bootstrap behavior", () => {
    expect(shouldLoadFamily("parent")).toBe(true);
    expect(shouldLoadFamily("student")).toBe(true);
    expect(isSuperAdminRole(undefined)).toBe(false);
  });

  it("keeps a teacher outside the family bootstrap", () => {
    expect(isTeacherRole("teacher")).toBe(true);
    expect(shouldLoadFamily("teacher")).toBe(false);
    expect(isTeacherRole("parent")).toBe(false);
  });
});
