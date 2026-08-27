// ชั้นเก็บข้อมูลในเครื่อง (localStorage) — session, progress, offline queue
const K_SESSION = "me.session";
const K_PROGRESS = "me.progress";
const K_QUEUE = "me.queue";

function readJSON(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function saveSession(s) { writeJSON(K_SESSION, s); }
export function loadSession() { return readJSON(K_SESSION); }
export function clearSession() { localStorage.removeItem(K_SESSION); }

export function saveProgress(p) { writeJSON(K_PROGRESS, p); }
export function loadProgress() { return readJSON(K_PROGRESS); }

export function enqueue(item) {
  const q = readJSON(K_QUEUE) || [];
  q.push(item);
  writeJSON(K_QUEUE, q);
}
export function dequeueAll() { return readJSON(K_QUEUE) || []; }
export function clearQueue() { localStorage.removeItem(K_QUEUE); }
