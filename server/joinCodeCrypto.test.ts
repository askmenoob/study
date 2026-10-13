import { describe, expect, it } from "vitest";
import { openJoinCode, sealJoinCode, teacherJoinCodeSecret } from "./joinCodeCrypto.js";

const secret = "synthetic-join-code-secret-for-tests-only";

describe("teacher join-code encryption", () => {
  it("round-trips a normalized eight-character code without storing plaintext", () => {
    const encrypted = sealJoinCode("abcd1234", "class-a", "teacher-a", secret);
    const encryptedAgain = sealJoinCode("abcd1234", "class-a", "teacher-a", secret);
    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("ABCD1234");
    expect(encryptedAgain).not.toBe(encrypted);
    expect(openJoinCode(encrypted, "class-a", "teacher-a", secret)).toBe("ABCD1234");
  });

  it("binds ciphertext to its class and rejects tampering", () => {
    const encrypted = sealJoinCode("ABCD1234", "class-a", "teacher-a", secret);
    expect(() => openJoinCode(encrypted, "class-b", "teacher-a", secret)).toThrow();
    expect(() => openJoinCode(encrypted, "class-a", "teacher-b", secret)).toThrow();
    const parts=encrypted.split(".");
    const changedBytes=Buffer.from(parts[3],"base64url");
    changedBytes[0]^=1;
    parts[3]=changedBytes.toString("base64url");
    const changed=parts.join(".");
    expect(() => openJoinCode(changed, "class-a", "teacher-a", secret)).toThrow();
  });

  it("rejects weak secrets and malformed codes", () => {
    expect(() => sealJoinCode("ABCD1234", "class-a", "teacher-a", "too-short")).toThrow(/at least 32/);
    expect(() => sealJoinCode("ABC1234", "class-a", "teacher-a", secret)).toThrow(/Invalid teacher join code/);
    expect(() => teacherJoinCodeSecret("")).toThrow(/KEY_FILE is required/);
  });
});
