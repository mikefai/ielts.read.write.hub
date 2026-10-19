import { mountDisplayMenu } from '../../../assets/core/display.js';
import { TYPES } from './types.js';
import { markItem } from './marking.js';
import { STEPS, COACH } from './coach.js';
import { recordAttempt, recordMistakes } from '../../../assets/core/store.js';
import { mountSaveBar } from '../../../assets/core/answers.js';
import { mountNavigator, addFlags, addStrike, goTo } from './tools-nav.js';
import { mountAnnotations, mountFindBar, mountRuler, evidenceVerdict } from './tools-annotate.js';

const base = new URL('../../../content/reading/', import.meta.url);
export const getJSON = async p => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`Cannot load ${p}`); return r.json(); };
export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// exam rubric: "given in the passage" / "writer in the passage" name the passage in the full test
export const rubric = (text, n) => text.replace(/(given|writer) in the passage/g, `$1 in Reading Passage ${n}`);
export const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// "Approach it again" analyses the trap, so it only appears after a first attempt (review screen)
export const helpHtml = (i, again) => `<div class="help" data-help="${i}"><button class="btn ghost" type="button" data-h="how" aria-expanded="false">How to answer</button>${again ? '<button class="btn ghost" type="button" data-h="again" aria-expanded="false">Approach it again</button>' : ''}<p class="hp" hidden></p></div>`;

// scrolls the visible passage to a paragraph and flashes it; used by "Show paragraph" buttons
export function flashPara(root, label) {
  const p = root.querySelector(`.passage:not([hidden]) p[data-label="${label}"]`);
  if (!p) return;
  const c = p.closest('.passage');
  c.scrollTo({ top: c.scrollTop + p.getBoundingClientRect().top - c.getBoundingClientRect().top - 12, behavior: 'smooth' });
  p.classList.add('flash'); setTimeout(() => p.classList.remove('flash'), 1800);
}

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
    <header class="bar"><h1>${esc(meta.title)}</h1><span id="timer" role="timer" aria-live="off">${mmss(minutes * 60)}</span><span id="dispslot"></span></header>
    <p><a class="back" href="../../learn/#${type}">Study the notes for this question type &rarr;</a></p>
    <details class="coach card"><summary>How to find the answer</summary><ol>${COACH.map(([a, b]) => `<li><strong>${a}</strong> ${b}</li>`).join('')}</ol></details>
    <div class="split"><article class="card passage" id="passage"></article>
      <section class="card"><p class="muted">${esc(set.instructions ?? '')}</p><div id="items"></div><button class="btn" id="submit" type="button">Submit</button></section></div>`;

  mountDisplayMenu(mount.querySelector('#dispslot'));
  const pEl = mount.querySelector('#passage');
  pEl.dataset.pid = passage.id;
  pEl.innerHTML = `<h2>${esc(passage.title)}</h2>` + passage.paragraphs.map(p => `<p data-label="${p.label}"><strong>${p.label}</strong> ${esc(p.text)}</p>`).join('');
  const ann = mountAnnotations({ root: mount, passageEls: [pEl], storageKey: 'reading-marks' });
  mountFindBar({ root: mount, getActivePassageIndex: () => 0, annotations: ann });
  mountRuler({ root: mount, passageSelector: '#passage' });
  // evidence flow: paint the quote through the annotation layer, then scroll to it
  const paintPassage = mark => {
    const map = {};
    passage.paragraphs.forEach(p => { map[p.label] = { ev: mark && mark.paragraph === p.label && p.text.includes(mark.quote) ? [{ s: p.text.indexOf(mark.quote), e: p.text.indexOf(mark.quote) + mark.quote.length }] : [] }; });
    ann.setExtra(0, map);
    mount.querySelector('#passage .ev')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const get = render(set, mount.querySelector('#items'));
  mount.querySelectorAll('#items .q, #items .box').forEach((el, i) => el.insertAdjacentHTML('beforeend', helpHtml(i)));
  wireHelp(mount, set.items);
  addStrike({ root: mount.querySelector('#items') });
  const navItems = [...mount.querySelectorAll('#items .q, #items .box')].map((el, i) => ({ el, passageIndex: 0, number: i + 1 }));
  const flags = addFlags({ root: mount, items: navItems, storageKey: `reading-flags:${type}:${setId}` });
  const nav = mountNavigator({ root: mount, items: navItems, getAnswers: get, isFlagged: flags.isFlagged, onGo: i => { goTo(navItems[i]); nav.setCurrent(i); } });
  flags.onChange(nav.refresh);
  mount.addEventListener('showpara', e => flashPara(mount, e.detail));
  const start = Date.now(); let left = minutes * 60; let done = false;
  const timerEl = mount.querySelector('#timer');
  const tick = setInterval(() => { left = Math.max(0, left - 1); timerEl.textContent = mmss(left); if (!left) submit(); }, 1000);

  function submit() {
    if (done) return; done = true; clearInterval(tick); nav.destroy();
    const answers = get();
    const results = set.items.map((it, i) => ({ it, a: answers[i], ok: markItem(it, answers[i], set.wordLimit) }));
    const score = results.filter(r => r.ok).length;
    const seconds = Math.round((Date.now() - start) / 1000);
    recordAttempt({ type, setId, score, total: set.items.length, seconds });
    recordMistakes({ type, setId, marks: results.map((r, i) => [i, r.ok]) });
    mount.querySelector('#items').parentElement.innerHTML = `<h2>Score ${score}/${set.items.length}</h2>` + results.map((r, i) => `
      <div class="rev ${r.ok ? 'ok' : 'bad'}"><p><strong>${i + 1}. ${r.ok ? '\u2713' : '\u2717'}</strong> ${esc(r.it.prompt)}</p>
        <p>Your answer: ${esc(r.a || '(blank)')} \u00b7 Correct: <strong>${esc(r.it.answer)}</strong></p>
        <p class="muted">Step ${r.it.step}: ${STEPS[r.it.step - 1]}</p>
        <p class="verdict">${esc(evidenceVerdict(passage, ann.getMarks(0), r.it.evidence))}</p>
        <button class="btn ghost" type="button" data-i="${i}">Show evidence in passage</button>${helpHtml(i, true)}</div>`).join('')
      + `<div id="savebar"></div><p><a class="btn" href="../../index.html">Back to Reading</a> <a class="btn ghost" href="">Retry</a></p>`;
    mountSaveBar(mount.querySelector('#savebar'), () => ({ id: `reading:${type}:${setId}:${start}`, skill: 'reading', kind: 'exercise', title: meta.title, setId, at: start, seconds, score, total: set.items.length,
      items: results.map((r, i) => ({ n: i + 1, prompt: r.it.prompt, answer: r.a || '', correct: r.it.answer, ok: r.ok })) }), '../../../../answers/');
    mount.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => paintPassage(set.items[b.dataset.i].evidence));
    wireHelp(mount, set.items);
  }
  mount.querySelector('#submit').onclick = submit;
}


