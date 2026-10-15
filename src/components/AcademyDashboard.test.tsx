import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AcademyProgressCard, academyActivityDays, academyNextBooking } from "./AcademyDashboard";
import type { StudyState, AttemptRecord } from "../types";
import type { TuitionBooking } from "../lib/tuitionApi";

const now=Date.parse("2026-10-15T08:00:00Z");
const booking=(id:string,status:TuitionBooking["status"],studentId:string,start:string,end:string)=>({id,status,studentId,startsAt:start,endsAt:end} as TuitionBooking);
const past=booking("past","accepted","child-a","2026-10-14T08:00:00Z","2026-10-14T09:00:00Z");
const next=booking("next","accepted","child-a","2026-10-16T08:00:00Z","2026-10-16T09:00:00Z");
const other=booking("other","accepted","child-b","2026-10-15T09:00:00Z","2026-10-15T10:00:00Z");
const study={profile:{name:"Alia",levelId:"d1",goalMinutes:15},attempts:[],streak:0} as StudyState;
const attempt=(id:string,at:string,levelId="d1")=>({id,levelId,subjectId:"bm",topicId:"bm-topic",correct:1,total:2,completedAt:at} as AttemptRecord);

describe("dashboard schedule truth and selected-child boundaries",()=>{
 it("ignores pending, cancelled and finished sessions, and keeps the selected child's next class",()=>{
  const pending=booking("pending","pending","child-a","2026-10-15T08:30:00Z","2026-10-15T09:30:00Z");
  const cancelled={...pending,id:"cancelled",status:"cancelled" as const};
  expect(academyNextBooking([other,past,cancelled,pending,next],"parent","child-a",now)).toBe(next);
  expect(academyNextBooking([other,past,cancelled,pending,next],"student","child-a",now)).toBe(next);
 });
 it("never returns another child's booking without a selected profile",()=>{
  expect(academyNextBooking([next,other],"parent",undefined,now)).toBeUndefined();
  expect(academyNextBooking([next,other],"student","unknown",now)).toBeUndefined();
 });
 it("shows a currently running accepted class before a later session and scopes teacher data supplied by API",()=>{
  const running=booking("running","accepted","child-a","2026-10-15T07:30:00Z","2026-10-15T08:30:00Z");
  expect(academyNextBooking([next,other,running],"teacher",undefined,now)).toBe(running);
 });
});
describe("recorded activity rather than illustrative progress",()=>{
 it("counts Malaysia calendar days across UTC midnight, excluding future and other-grade attempts",()=>{
  const state={...study,attempts:[attempt("today","2026-10-14T16:30:00Z"),attempt("yesterday","2026-10-14T15:30:00Z"),attempt("future","2026-10-15T09:00:00Z"),attempt("other-grade","2026-10-15T07:00:00Z","d2"),attempt("old","2026-10-07T08:00:00Z")]};
  const days=academyActivityDays(state,new Date(now));
  expect(days).toHaveLength(7);expect(days.at(-1)).toMatchObject({key:"2026-10-15",count:1});expect(days.at(-2)).toMatchObject({key:"2026-10-14",count:1});expect(days.reduce((n,d)=>n+d.count,0)).toBe(2);
 });
 it("renders empty mastery as zero and names the source instead of inventing attendance",()=>{
  const html=renderToStaticMarkup(createElement(AcademyProgressCard,{study,onProgress:()=>{}}));
  expect(html).toContain("Belum ada latihan direkodkan");expect(html).toContain('aria-valuenow="0"');expect(html).not.toContain("92%");expect(html).not.toContain("Kehadiran");
 });
});
