import { mountDisplayMenu } from './core/display.js';
import { getProgress } from './core/store.js';
import { byType, nextPractice } from './core/progress.js';

const top = document.createElement('p'); document.querySelector('.wrap').prepend(top); mountDisplayMenu(top);
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
const rows = byType(attempts);
const strip = document.getElementById('strip');
if (!attempts.length) strip.innerHTML = '<div class="empty">No attempts yet. Start with Reading below.</div>';
else {
  const sc = attempts.reduce((s, a) => s + a.score, 0), tot = attempts.reduce((s, a) => s + a.total, 0);
  strip.innerHTML = [[streak() + ' day' + (streak() === 1 ? '' : 's'), 'Streak'], [Math.round(100 * sc / tot) + '%', 'Accuracy'], [rows[0].label, 'Weakest type'], [attempts.length, 'Sets done']]
    .map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('');
  const last = attempts.at(-1);
  document.getElementById('continue').innerHTML = `<a class="btn" href="${last.type === 'full-test' ? `skills/reading/test/?id=${last.setId}` : last.type === 'speaking-mock' ? `skills/speaking/mock/?id=${last.setId}` : last.type.startsWith('writing') ? `skills/writing/task/?id=${last.setId}` : `skills/reading/types/${last.type}/?set=${last.setId}`}">Continue where you left off &rarr;</a>`;
  const next = nextPractice(rows);
  document.getElementById('next').innerHTML = `<a class="btn" href="${next.href}">Practise next: ${rows[0].label} &rarr;</a>`;
  document.getElementById('bytype').innerHTML = `<h2 class="section-title">Progress by type</h2><ul class="bars">${rows.map(r =>
    `<li><span class="bl">${r.label}</span><span class="bar" aria-hidden="true"><i style="width:${r.pct}%"></i></span><span class="bt">${r.pct}% (${r.score}/${r.total})</span></li>`).join('')}</ul>`;
}

document.getElementById('skills').innerHTML = skills.map((s, i) => {
  const n = String(i + 1).padStart(2, '0');
  const inner = `<span class="num">${n}</span><div><h3>${s.title}</h3><p>${s.tagline}</p></div>`;
  return s.status === 'live'
    ? `<a class="skill" style="--c:${s.accent}" href="${s.path}">${inner}<span class="go" aria-hidden="true">&rarr;</span></a>`
    : `<div class="skill soon" aria-disabled="true">${inner}</div>`;
}).join('');



