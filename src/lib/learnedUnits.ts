const key = (profileKey: string) => `imai-study:learned-units:v1:${profileKey}`;
export function learnedUnits(profileKey: string): Set<string> {
  try { const value: unknown = JSON.parse(localStorage.getItem(key(profileKey)) ?? "[]"); return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.startsWith("library-")) : []); }
  catch { return new Set(); }
}
export function markUnitLearned(profileKey: string, unitId: string): boolean {
  try { const units = learnedUnits(profileKey); units.add(unitId); localStorage.setItem(key(profileKey),JSON.stringify([...units])); return true; }
  catch { return false; }
}
