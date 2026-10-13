import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const VERSION = "v1";
const JOIN_CODE_PATTERN = /^[A-Z0-9]{8}$/;

function keyFromSecret(secret: string) {
  if (secret.length < 32) throw new Error("Join-code encryption secret must be at least 32 characters");
  return createHmac("sha256", secret).update("imai-study:teacher-join-code:v1").digest();
}

function normalizeCode(code: string) {
  const normalized = code.normalize("NFKC").trim().toUpperCase();
  if (!JOIN_CODE_PATTERN.test(normalized)) throw new Error("Invalid teacher join code");
  return normalized;
}

function aadForClass(classId: string, teacherId: string) {
  return Buffer.from(`teacher-class:${classId}:owner:${teacherId}`, "utf8");
}

export function teacherJoinCodeSecret(keyFile = process.env.JOIN_CODE_ENCRYPTION_KEY_FILE?.trim()) {
  if (!keyFile) throw new Error("JOIN_CODE_ENCRYPTION_KEY_FILE is required");
  let secret = "";
  try { secret = readFileSync(keyFile, "utf8").trim(); }
  catch { throw new Error("Teacher join-code encryption key is unavailable"); }
  if (secret.length < 32) throw new Error("Teacher join-code encryption key must be at least 32 characters");
  return secret;
}

export function sealJoinCode(code: string, classId: string, teacherId: string, secret = teacherJoinCodeSecret()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  cipher.setAAD(aadForClass(classId, teacherId));
  const ciphertext = Buffer.concat([cipher.update(normalizeCode(code), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function openJoinCode(value: string, classId: string, teacherId: string, secret = teacherJoinCodeSecret()) {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue || extra !== undefined) {
    throw new Error("Invalid encrypted teacher join code");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), Buffer.from(ivValue, "base64url"));
  decipher.setAAD(aadForClass(classId, teacherId));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return normalizeCode(plaintext);
}
