import { describe, expect, it } from "vitest";
import { migrateTeacherNetwork } from "./teacherNetworkStore.js";

describe("teacher network schema", () => {
  it("stores verified applications, subject classes, parent-approved enrollment and audit history", async () => {
    let sql = "";
    await migrateTeacherNetwork({ query: async (value: string) => { sql = value; return { rows: [] }; } } as any);
    expect(sql).toContain("teacher_applications");
    expect(sql).toContain("teacher_profiles");
    expect(sql).toContain("teacher_classes");
    expect(sql).toContain("class_enrollments");
    expect(sql).toContain("parent_approved_at timestamptz NOT NULL");
    expect(sql).toContain("client_request_id uuid NOT NULL");
    expect(sql).toContain("consent_version text NOT NULL");
    expect(sql).toContain("UNIQUE(normalized_name,state,district)");
    expect(sql).toContain("replaces_enrollment_id");
    expect(sql).toContain("teacher_network_audit");
    expect(sql).toContain("join_code_digest");
    expect(sql).toContain("join_code_ciphertext");
    expect(sql).not.toContain("parent_email");
    expect(sql).not.toContain("password_hash");
  });
});
