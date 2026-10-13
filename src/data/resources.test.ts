import { describe, expect, it } from "vitest";
import { resources, sourceRegistry } from "./resources";
describe("learning library resources",()=>{
  it("has a useful seed library",()=>{expect(resources.length).toBeGreaterThanOrEqual(14);expect(new Set(resources.map(r=>r.kind))).toEqual(new Set(["note","reading","practice"]));});
  it("validates practice answers",()=>{for(const r of resources){expect(r.body.length).toBeGreaterThan(0);for(const q of r.questions??[]){expect(q.options.length).toBeGreaterThanOrEqual(2);expect(q.answer).toBeGreaterThanOrEqual(0);expect(q.answer).toBeLessThan(q.options.length);}}});
  it("keeps unclear-license repositories research-only",()=>{for(const s of sourceRegistry.filter(s=>s.license==="Belum disahkan")){expect(s.status).toBe("research-only");expect(s.commercial).toBe("Tidak digunakan");}});
});
