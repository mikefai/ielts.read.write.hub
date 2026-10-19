const KEY = 'ielts-hub-v1';
let mem = { attempts: [] };

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? mem; } catch { return mem; }
}

function write(data) {
  mem = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* blocked: memory only */ }
}

export function getProgress() { return read(); }

export function recordAttempt({ type, setId, score, total, seconds }) {
  const data = read();
  data.attempts.push({ type, setId, score, total, seconds, at: Date.now() });
  write(data);
}

// wrong reading items per question set, keyed "type:setId" -> sorted item indexes
export function getMistakes() { return read().mistakes ?? {}; }

// marks: [itemIndex, ok] pairs; wrong items are added, correct ones removed
export function recordMistakes({ type, setId, marks }) {
  const data = read(), all = data.mistakes ??= {}, key = `${type}:${setId}`;
  const s = new Set(all[key]);
  marks.forEach(([i, ok]) => ok ? s.delete(i) : s.add(i));
  if (s.size) all[key] = [...s].sort((a, b) => a - b); else delete all[key];
  write(data);
}
