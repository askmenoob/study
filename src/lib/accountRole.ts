import type { AccountUser } from "./api";

export function isSuperAdminRole(role: AccountUser["role"] | undefined): boolean {
  return role === "super_admin";
}

export function isTeacherRole(role: AccountUser["role"] | undefined): boolean {
  return role === "teacher";
}

export function shouldLoadFamily(role: AccountUser["role"]): boolean {
  return role === "parent" || role === "student";
}
