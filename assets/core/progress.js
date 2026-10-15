import { TYPES } from '../../skills/reading/engine/types.js';

const label = t => TYPES.find(x => x.id === t)?.title
  ?? (t === 'full-test' ? 'Full test' : t === 'speaking-mock' ? 'Speaking mock' : t.replace('writing-task', 'Writing Task '));

export function byType(attempts) {
  const by = {};
  for (const a of attempts) { const r = by[a.type] ??= { score: 0, total: 0, sets: 0 }; r.score += a.score; r.total += a.total; r.sets++; }
  return Object.entries(by)
    .map(([type, r]) => ({ type, label: label(type), ...r, pct: r.total ? Math.round(100 * r.score / r.total) : 0 }))
    .sort((a, b) => a.pct - b.pct);
}

export function nextPractice(rows) {
  const r = rows[0];
  if (!r) return null;
  const href = r.type === 'full-test' ? 'skills/reading/test/?id=m1' : r.type === 'speaking-mock' ? 'skills/speaking/'
    : r.type.startsWith('writing') ? 'skills/writing/' : `skills/reading/types/${r.type}/`;
  return { type: r.type, href };
}
