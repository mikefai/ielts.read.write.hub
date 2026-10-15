// Literal, case-insensitive search. Regex on the original text keeps offsets valid for any Unicode.
export function findMatches(text, query, opts = {}) {
  const q = String(query ?? '').trim();
  if (q.length < 2) return [];
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return [...String(text).matchAll(re)].map(m => ({ s: m.index, e: m.index + m[0].length }));
}
