import { saveAttemptCloud, type AttemptPayload } from "./api";

const KEY = "imai-study-pending-attempts-v1";

export function loadPendingAttempts(): AttemptPayload[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as AttemptPayload[] : [];
  } catch { return []; }
}

function savePending(items: AttemptPayload[]) {
  if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
  else localStorage.removeItem(KEY);
}

export function queueAttempt(payload: AttemptPayload) {
  const items = loadPendingAttempts();
  if (!items.some((item) => item.clientAttemptId === payload.clientAttemptId)) items.push(payload);
  savePending(items);
}

export async function flushPendingAttempts() {
  const pending = loadPendingAttempts();
  if (!pending.length) return { synced: 0, remaining: 0 };
  const remaining: AttemptPayload[] = [];
  let synced = 0;
  for (const payload of pending) {
    try { await saveAttemptCloud(payload); synced += 1; }
    catch { remaining.push(payload); }
  }
  savePending(remaining);
  return { synced, remaining: remaining.length };
}

export function discardStudentPendingAttempts(studentId: string) {
  savePending(loadPendingAttempts().filter((item) => item.studentId !== studentId));
}
