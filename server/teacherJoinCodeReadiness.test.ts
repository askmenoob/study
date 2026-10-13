import { describe,expect,it } from "vitest";
import { sealJoinCode } from "./joinCodeCrypto.js";
import { verifyTeacherJoinCodeKey } from "./teacherNetworkStore.js";

const correctSecret="synthetic-readiness-key-that-is-long-enough";
const classId="class-a";
const teacherId="teacher-a";
const ciphertext=sealJoinCode("ABCD1234",classId,teacherId,correctSecret);

function pool(rows:unknown[]){return {query:async()=>({rows})} as any;}

describe("teacher join-code readiness",()=>{
  it("accepts an empty class-code table",async()=>{
    await expect(verifyTeacherJoinCodeKey(pool([]),correctSecret)).resolves.toBeUndefined();
  });

  it("accepts the key that decrypts a stored class code",async()=>{
    await expect(verifyTeacherJoinCodeKey(pool([{id:classId,teacher_id:teacherId,join_code_ciphertext:ciphertext}]),correctSecret)).resolves.toBeUndefined();
  });

  it("stops startup when the configured key is wrong",async()=>{
    await expect(verifyTeacherJoinCodeKey(pool([{id:classId,teacher_id:teacherId,join_code_ciphertext:ciphertext}]),"different-synthetic-key-that-is-long-enough"))
      .rejects.toThrow("cannot decrypt the stored class codes");
  });
});
