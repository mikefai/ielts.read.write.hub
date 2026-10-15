// Reading navigator, flags, per-passage pacing and option strike-through. DOM code is only inside the mount/add functions.
import { loadPref, savePref } from '../../../assets/core/prefs.js';
import { passagePace } from '../../../assets/core/tools/pace.js';

// Pure clock step: returns a new per-passage seconds array with dt added to the active passage only.
export function addSeconds(state, activeIndex, dt) {
  const out = [...state];
  if (activeIndex >= 0 && activeIndex < out.length && dt > 0) out[activeIndex] += dt;
  return out;
}
// "Question 7, answered, flagged"
export const stateLabel = (number, answered, flagged) => `Question ${number}, ${answered ? 'answered' : 'unanswered'}${flagged ? ', flagged' : ''}`;

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (el.className = v) : el.setAttribute(k, v);
  el.append(...kids);
  return el;
};
// shared row that sits between the tabs / header and the two panes
function navrow(root) {
  let r = root.querySelector('.navrow');
  if (!r) { r = h('div', { class: 'navrow' }); root.querySelector('.split')?.before(r); }
  return r;
}
const firstControl = el => el.querySelector('input:not([type=hidden]), select, textarea') || el.querySelector('button');

export function mountNavigator({ root, items, getAnswers, onGo, isFlagged = () => false }) {
  const nav = h('nav', { class: 'qnav', 'aria-label': 'Question navigator' });
  const btns = items.map((it, i) => {
    const b = h('button', { type: 'button', class: 'qn' }, h('span', {}, String(it.number)), h('i', { class: 'qs', 'aria-hidden': 'true' }));
    b.addEventListener('click', () => onGo(i));
    nav.append(b); return b;
  });
  navrow(root).prepend(nav);
  let current = -1, tab = 0; // roving tabindex: one tab stop for the whole strip
  const setTab = i => { tab = i; btns.forEach((b, k) => b.tabIndex = k === i ? 0 : -1); };
  nav.addEventListener('keydown', e => {
    const at = btns.indexOf(document.activeElement), to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: btns.length - 1 }[e.key];
    if (at < 0 || to === undefined || to < 0 || to >= btns.length) return;
    e.preventDefault(); setTab(to); btns[to].focus();
  });
  nav.addEventListener('focusin', e => { const i = btns.indexOf(e.target); if (i >= 0 && i !== tab) setTab(i); });
  const refresh = () => {
    const ans = getAnswers();
    items.forEach((it, i) => {
      const a = String(ans[i] ?? '').trim() !== '', f = !!isFlagged(i), b = btns[i];
      b.dataset.answered = a; b.dataset.flagged = f;
      b.setAttribute('aria-label', stateLabel(it.number, a, f));
      b.title = stateLabel(it.number, a, f);
      b.querySelector('.qs').textContent = (a ? '✓' : '') + (f ? '⚑' : '');
      i === current ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
    });
  };
  const setCurrent = i => { current = i; setTab(Math.max(0, i)); refresh(); btns[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); };
  const onChange = () => refresh();
  const onFocus = e => { const i = items.findIndex(it => it.el.contains(e.target)); if (i >= 0 && i !== current) setCurrent(i); };
  root.addEventListener('input', onChange); root.addEventListener('change', onChange); root.addEventListener('drop', onChange); root.addEventListener('focusin', onFocus);
  setTab(0); refresh();
  return {
    refresh, setCurrent,
    destroy() {
      root.removeEventListener('input', onChange); root.removeEventListener('change', onChange); root.removeEventListener('drop', onChange); root.removeEventListener('focusin', onFocus);
      const row = nav.parentElement; nav.remove(); if (row && !row.children.length) row.remove(); // drop sets a select value without a change event
    },
  };
}

// Focus and show a question: used by both runners as the navigator's onGo.
export function goTo(item) {
  item.el.scrollIntoView({ block: 'center' });
  firstControl(item.el)?.focus({ preventScroll: true });
}

export function addFlags({ root, items, storageKey }) {
  const saved = storageKey ? loadPref(storageKey, []) : [];
  const flagged = new Set(Array.isArray(saved) ? saved.filter(n => Number.isInteger(n) && n >= 0 && n < items.length) : []);
  const cbs = [];
  items.forEach((it, i) => {
    const b = h('button', { type: 'button', class: 'btn ghost mini flagbtn', 'aria-pressed': 'false' });
    const paint = () => {
      const on = flagged.has(i);
      b.setAttribute('aria-pressed', on); b.textContent = on ? '⚑ Flagged' : '⚑ Flag';
      b.setAttribute('aria-label', `Flag question ${it.number} for review`);
    };
    b.onclick = () => {
      flagged.has(i) ? flagged.delete(i) : flagged.add(i);
      paint(); if (storageKey) savePref(storageKey, [...flagged].sort((a, c) => a - c));
      cbs.forEach(f => f());
    };
    paint();
    (it.el.querySelector('.help') || it.el).prepend(b);
  });
  return { isFlagged: i => flagged.has(i), onChange: cb => cbs.push(cb) };
}

// Strike buttons sit beside (never inside) the option label / chip, so answers, chip text and drag handling are untouched.
export function addStrike({ root }) {
  const wrap = (el, cls, name) => {
    const w = h('span', { class: cls });
    el.replaceWith(w); w.append(el);
    const b = h('button', { type: 'button', class: 'strikebtn', 'aria-pressed': 'false', 'aria-label': `Cross out option "${name}"`, draggable: 'false' }, '✕');
    b.onclick = () => { const on = !w.classList.contains('struck'); w.classList.toggle('struck', on); b.setAttribute('aria-pressed', on); };
    w.append(b);
  };
  root.querySelectorAll('label.opt').forEach(l => wrap(l, 'optrow', l.querySelector('input')?.value ?? l.textContent.trim()));
  root.querySelectorAll('.pool .chip').forEach(c => wrap(c, 'chipwrap', c.dataset.v ?? c.textContent));
}

export function mountPassagePace({ root, tabs, getActive, now = () => Date.now() }) {
  let secs = tabs.map(() => 0), last = now();
  const stat = h('span', { class: 'pacestatus', 'aria-live': 'polite' });
  navrow(root).append(stat);
  const spans = tabs.map(t => { const s = h('span', { class: 'ppace' }); t.append(' ', s); return s; });
  let shown = '';
  const paint = () => {
    secs.forEach((s, i) => { const p = passagePace(s, 20); spans[i].textContent = p.label; tabs[i].dataset.pace = p.state; });
    const a = getActive(), p = passagePace(secs[a], 20), key = a + p.state;
    // status text changes only when the passage or state changes, so the live region does not chatter every second
    if (key !== shown) { shown = key; stat.textContent = `Passage ${a + 1}: ${p.state === 'ok' ? 'on pace.' : p.state === 'warn' ? 'aim to move on soon.' : 'over time, move on.'}`; }
  };
  const step = () => { const t = now(), dt = Math.min(5, (t - last) / 1000); last = t; secs = addSeconds(secs, getActive(), dt); paint(); };
  const id = setInterval(step, 1000);
  paint();
  return { seconds: () => secs, step, stop() { clearInterval(id); } };
}
