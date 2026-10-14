const KEY = 'ielts-hub-v1';
let mem = { attempts: [] };

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? mem; } catch { return mem; }
}

export function getProgress() { return read(); }

export function recordAttempt({ type, setId, score, total, seconds }) {
  const data = read();
  data.attempts.push({ type, setId, score, total, seconds, at: Date.now() });
  mem = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* blocked: memory only */ }
}
