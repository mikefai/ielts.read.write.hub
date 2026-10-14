import { TYPES } from './types.js';
import { markItem } from './marking.js';
import { STEPS, COACH } from './coach.js';
import { recordAttempt } from '../../../assets/core/store.js';

const base = new URL('../../../content/reading/', import.meta.url);
export const getJSON = async p => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`Cannot load ${p}`); return r.json(); };
export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// "Approach it again" analyses the trap, so it only appears after a first attempt (review screen)
export const helpHtml = (i, again) => `<div class="help" data-help="${i}"><button class="btn ghost" type="button" data-h="how" aria-expanded="false">How to answer</button>${again ? '<button class="btn ghost" type="button" data-h="again" aria-expanded="false">Approach it again</button>' : ''}<p class="hp" hidden></p></div>`;

// each button toggles its own text from the item; opening one closes the other
export function wireHelp(root, items) {
  root.querySelectorAll('.help').forEach(h => {
    const it = items[h.dataset.help], panel = h.querySelector('.hp');
    h.querySelectorAll('button').forEach(b => b.onclick = () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      h.querySelectorAll('button').forEach(x => x.setAttribute('aria-expanded', 'false'));
      b.setAttribute('aria-expanded', open);
      panel.hidden = !open; panel.textContent = it[b.dataset.h];
    });
  });
}

export async function startSet({ type, mount, render, minutes }) {
  const meta = TYPES.find(t => t.id === type);
  const setId = new URLSearchParams(location.search).get('set') || meta.set;
  let set, passage;
  try {
    set = await getJSON(`questions/${type}/${setId}.json`);
    passage = await getJSON(`passages/${set.passageId}.json`);
  } catch (e) { mount.innerHTML = `<p class="card">Could not load this set (${esc(e.message)}). Serve the folder over http, e.g. <code>npx serve .</code></p>`; return; }

  minutes ??= Math.ceil(set.items.length * 1.5); // real test: 60 min for 40 questions
  mount.innerHTML = `
    <header class="bar"><h1>${esc(meta.title)}</h1><span id="timer" role="timer" aria-live="off">${mmss(minutes * 60)}</span>
      <button class="btn ghost" id="hl" type="button">Highlight selection</button></header>
    <details class="coach card"><summary>How to find the answer</summary><ol>${COACH.map(([a, b]) => `<li><strong>${a}</strong> ${b}</li>`).join('')}</ol></details>
    <div class="split"><article class="card passage" id="passage"></article>
      <section class="card"><p class="muted">${esc(set.instructions ?? '')}</p><div id="items"></div><button class="btn" id="submit" type="button">Submit</button></section></div>`;

  const pEl = mount.querySelector('#passage');
  const paintPassage = (mark) => {
    pEl.innerHTML = `<h2>${esc(passage.title)}</h2>` + passage.paragraphs.map(p => {
      let t = esc(p.text);
      if (mark && mark.paragraph === p.label) { const q = esc(mark.quote); t = t.replace(q, `<mark id="ev">${q}</mark>`); }
      return `<p data-label="${p.label}"><strong>${p.label}</strong> ${t}</p>`;
    }).join('');
    mount.querySelector('#ev')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  paintPassage();
  mount.querySelector('#hl').onclick = () => {
    const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed || !pEl.contains(sel.anchorNode)) return;
    try { sel.getRangeAt(0).surroundContents(document.createElement('mark')); } catch { /* selection spans elements */ }
    sel.removeAllRanges();
  };

  const get = render(set, mount.querySelector('#items'));
  mount.querySelectorAll('#items .q, #items .box').forEach((el, i) => el.insertAdjacentHTML('beforeend', helpHtml(i)));
  wireHelp(mount, set.items);
  const start = Date.now(); let left = minutes * 60; let done = false;
  const timerEl = mount.querySelector('#timer');
  const tick = setInterval(() => { left = Math.max(0, left - 1); timerEl.textContent = mmss(left); if (!left) submit(); }, 1000);

  function submit() {
    if (done) return; done = true; clearInterval(tick);
    const answers = get();
    const results = set.items.map((it, i) => ({ it, a: answers[i], ok: markItem(it, answers[i], set.wordLimit) }));
    const score = results.filter(r => r.ok).length;
    recordAttempt({ type, setId, score, total: set.items.length, seconds: Math.round((Date.now() - start) / 1000) });
    mount.querySelector('#items').parentElement.innerHTML = `<h2>Score ${score}/${set.items.length}</h2>` + results.map((r, i) => `
      <div class="rev ${r.ok ? 'ok' : 'bad'}"><p><strong>${i + 1}. ${r.ok ? '\u2713' : '\u2717'}</strong> ${esc(r.it.prompt)}</p>
        <p>Your answer: ${esc(r.a || '(blank)')} \u00b7 Correct: <strong>${esc(r.it.answer)}</strong></p>
        <p class="muted">Step ${r.it.step}: ${STEPS[r.it.step - 1]}</p>
        <button class="btn ghost" type="button" data-i="${i}">Show evidence in passage</button>${helpHtml(i, true)}</div>`).join('')
      + `<p><a class="btn" href="../../index.html">Back to Reading</a> <a class="btn ghost" href="">Retry</a></p>`;
    mount.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => paintPassage(set.items[b.dataset.i].evidence));
    wireHelp(mount, set.items);
  }
  mount.querySelector('#submit').onclick = submit;
}


