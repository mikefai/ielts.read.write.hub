// Preferences in one localStorage object, with an in-memory fallback when storage is missing, blocked or full.
const KEY = 'ielts-hub-prefs-v1';
const mem = {};

function readStore() {
  try {
    const o = JSON.parse(globalThis.localStorage.getItem(KEY));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}

export function loadPref(key, fallback) {
  const o = readStore();
  if (o && key in o) return o[key];
  return key in mem ? mem[key] : fallback;
}

export function savePref(key, value) {
  mem[key] = value;
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify({ ...(readStore() || {}), [key]: value }));
  } catch { /* storage unavailable: memory copy still works for this page */ }
}
