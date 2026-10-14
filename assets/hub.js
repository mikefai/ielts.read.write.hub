import { getProgress } from './core/store.js';
import { TYPES } from '../skills/reading/engine/types.js';

const skills = await (await fetch('skills.json')).json();
const { attempts } = getProgress();

const day = t => new Date(t).toDateString();
function streak() {
  const days = new Set(attempts.map(a => day(a.at)));
  let n = 0, d = new Date();
  if (!days.has(day(d))) d.setDate(d.getDate() - 1);
  while (days.has(day(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function weakest() {
  const by = {};
  for (const a of attempts) { const s = by[a.type] ??= { s: 0, t: 0 }; s.s += a.score; s.t += a.total; }
  const [id] = Object.entries(by).sort((x, y) => x[1].s / x[1].t - y[1].s / y[1].t)[0] ?? [];
  return TYPES.find(t => t.id === id)?.title ?? (id ? id.replace('writing-task', 'Writing Task ').replace('full-test', 'Full test') : undefined);
}

const strip = document.getElementById('strip');
if (!attempts.length) strip.innerHTML = '<div class="empty">No attempts yet. Start with Reading below.</div>';
else {
  const sc = attempts.reduce((s, a) => s + a.score, 0), tot = attempts.reduce((s, a) => s + a.total, 0);
  strip.innerHTML = [[streak() + ' day' + (streak() === 1 ? '' : 's'), 'Streak'], [Math.round(100 * sc / tot) + '%', 'Accuracy'], [weakest(), 'Weakest type'], [attempts.length, 'Sets done']]
    .map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('');
  const last = attempts.at(-1);
  document.getElementById('continue').innerHTML = `<a class="btn" href="${last.type === 'full-test' ? `skills/reading/test/?id=${last.setId}` : last.type.startsWith('writing') ? `skills/writing/task/?id=${last.setId}` : `skills/reading/types/${last.type}/?set=${last.setId}`}">Continue where you left off &rarr;</a>`;
}

document.getElementById('skills').innerHTML = skills.map((s, i) => {
  const n = String(i + 1).padStart(2, '0');
  const inner = `<span class="num">${n}</span><div><h3>${s.title}</h3><p>${s.tagline}</p></div>`;
  return s.status === 'live'
    ? `<a class="skill" style="--c:${s.accent}" href="${s.path}">${inner}<span class="go" aria-hidden="true">&rarr;</span></a>`
    : `<div class="skill soon" aria-disabled="true">${inner}</div>`;
}).join('');



