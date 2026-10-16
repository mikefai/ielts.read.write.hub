// Saved answers: kept in this browser (via prefs.js) and downloadable as .txt / .json for later evaluation.
import { loadPref, savePref } from './prefs.js';

const KEY = 'answers', MAX = 200;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const day = at => new Date(at).toISOString().slice(0, 10);
const arr = v => Array.isArray(v) ? v : [];

// Newest first. Corrupt or missing storage gives [].
export const listAnswers = () => arr(loadPref(KEY, [])).filter(r => r && typeof r === 'object' && r.id).sort((a, b) => b.at - a.at);

// rec: { skill, kind, title, setId, at, seconds?, score?, total?, items?, paragraphs?, notes?, ticks?, prompt?, mockId? }
// The same id replaces the earlier copy, so saving twice never duplicates.
export function saveAnswer(rec) {
  const at = rec.at ?? Date.now(), saved = { ...rec, at, id: rec.id ?? `${rec.skill}:${rec.setId}:${at}` };
  savePref(KEY, [saved, ...listAnswers().filter(r => r.id !== saved.id)].slice(0, MAX));
  return saved;
}

export const removeAnswer = id => savePref(KEY, listAnswers().filter(r => r.id !== id));

export function answerFileName(rec) {
  const clean = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${[clean(rec.skill), clean(rec.setId) || 'answers', day(rec.at)].filter(Boolean).join('-')}.txt`;
}

export function answerText(rec) {
  const L = ['IELTS Study Hub: my answers', '', `${rec.title ?? rec.setId}`, `Skill: ${rec.skill}${rec.kind ? ` (${rec.kind})` : ''}`, `Date: ${new Date(rec.at).toISOString().slice(0, 16).replace('T', ' ')}`];
  if (rec.total) L.push(`Score: ${rec.score}/${rec.total}`);
  if (Number.isFinite(rec.seconds)) L.push(`Time taken: ${mmss(rec.seconds)}`);
  L.push('');
  if (rec.prompt) L.push('Task:', rec.prompt, '');
  for (const it of arr(rec.items)) L.push(`${it.n}. ${it.prompt}`, `   Your answer: ${it.answer || '(blank)'}`, `   Correct answer: ${it.correct} ${it.ok ? '(correct)' : '(incorrect)'}`, '');
  if (arr(rec.paragraphs).length) L.push(`Your answer${Number.isFinite(rec.words) ? ` (${rec.words} words)` : ''}:`, '', ...rec.paragraphs.flatMap(p => [p, '']));
  if (rec.notes) L.push('My notes:', rec.notes, '');
  if (arr(rec.ticks).length) L.push('Self-assessment, ticked:', ...rec.ticks.map(t => `  - ${t}`), '');
  return L.join('\n').trimEnd() + '\n';
}

export const allAnswersText = recs => recs.map(answerText).join('\n' + '='.repeat(40) + '\n\n');

export function downloadFile(name, text, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Result-screen bar: saves automatically, then offers download and a link to all saved answers.
// getRec is called again on each click so answers ticked or typed after the first save are included.
export function mountSaveBar(el, getRec, answersHref) {
  const save = () => saveAnswer(getRec());
  let rec = save();
  el.innerHTML = `<p class="savebar" style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center"><span role="status">Answers saved in this browser &#10003;</span>`
    + `<button class="btn ghost" type="button" data-a="save">Save again</button><button class="btn" type="button" data-a="dl">Download my answers</button>`
    + `<a href="${esc(answersHref)}">My saved answers &rarr;</a></p>`;
  const status = el.querySelector('[role=status]');
  el.querySelector('[data-a=save]').onclick = () => { rec = save(); status.textContent = 'Saved again ✓'; };
  el.querySelector('[data-a=dl]').onclick = () => { rec = save(); downloadFile(answerFileName(rec), answerText(rec)); };
}
