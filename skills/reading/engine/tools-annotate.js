// Reading study tools: highlight/underline/notes, find, ruler, and review helpers. Pure logic lives in assets/core/tools.
import { loadPref, savePref } from '../../../assets/core/prefs.js';
import { COLOURS, emptyMarks, setHighlight, setUnderline, addNote, updateNote, removeNote, clearRange, toHtml } from '../../../assets/core/tools/annotate.js';
import { findMatches } from '../../../assets/core/tools/find.js';
import { evidenceRange, coverage } from '../../../assets/core/tools/evidence.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NAMES = { yellow: 'Yellow', green: 'Green', pink: 'Pink', blue: 'Blue' };
const VERDICTS = { marked: 'You marked the evidence', partly: 'You partly marked the evidence', missed: 'Your marks missed the evidence' };
export const verdictText = v => VERDICTS[v] ?? '';
// true when [s,e) is entirely underlined (ul intervals are merged, so one interval must cover it)
export const underlined = (marks, s, e) => marks.ul.some(x => x.s <= s && x.e >= e);
// stored data comes from localStorage: keep only well-formed marks
export function cleanMarks(m) {
  const ok = (a, f) => Array.isArray(a) ? a.filter(x => x && Number.isFinite(x.s) && Number.isFinite(x.e) && x.s < x.e && f(x)) : [];
  return { hl: ok(m?.hl, x => COLOURS.includes(x.c)), ul: ok(m?.ul, () => true), notes: ok(m?.notes, x => typeof x.id === 'string' && typeof x.t === 'string') };
}
// Trim spaces off a [s,e) range of text; null if nothing is left.
export function trimRange(text, s, e) {
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  return s < e ? { s, e } : null;
}

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (el.className = v) : el.setAttribute(k, v);
  el.append(...kids);
  return el;
};

function strip(root) {
  let s = root.querySelector('.tstrip');
  if (!s) { s = h('div', { class: 'tstrip', role: 'group', 'aria-label': 'Study tools' }); (root.querySelector('.bar') || root.firstElementChild)?.after(s); }
  return s;
}

export function mountAnnotations({ root, passageEls, storageKey }) {
  const P = passageEls.map((el, pi) => {
    const pid = el.dataset.pid || String(pi);
    const texts = {}, ptexts = {};
    el.querySelectorAll('p[data-label]').forEach(p => {
      const label = p.dataset.label, lab = p.querySelector('strong');
      const text = p.textContent.slice((lab?.textContent.length ?? 0) + 1); // after label and the single space
      const span = h('span', { class: 'ptext' });
      p.replaceChildren(...(lab ? [lab, ' '] : []), span);
      texts[label] = text; ptexts[label] = span;
    });
    const key = `${storageKey}:${pid}`, saved = loadPref(key, {});
    const marks = {};
    for (const l of Object.keys(texts)) marks[l] = cleanMarks(saved?.[l]);
    return { el, key, texts, ptexts, marks, extra: {} };
  });

  const save = pi => savePref(P[pi].key, P[pi].marks);
  function renderPara(pi, label) {
    const p = P[pi], ex = p.extra[label] || {};
    const span = p.ptexts[label];
    span.innerHTML = toHtml(p.texts[label], p.marks[label], ex);
    span.querySelectorAll('.nend').forEach(n => {
      const note = p.marks[label].notes.find(x => x.id === n.dataset.n);
      n.setAttribute('role', 'button'); n.tabIndex = 0;
      n.title = note ? note.t : ''; n.setAttribute('aria-label', 'Edit note: ' + (note?.t ?? ''));
    });
  }
  const render = pi => Object.keys(P[pi].texts).forEach(l => renderPara(pi, l));
  P.forEach((_, pi) => render(pi));

  // ---- selection -> per-paragraph offsets (relative to .ptext text) ----
  function getParts() {
    const sel = getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return [];
    const r = sel.getRangeAt(0), out = [];
    P.forEach((p, pi) => Object.entries(p.ptexts).forEach(([label, span]) => {
      if (!r.intersectsNode(span)) return;
      const pr = document.createRange(); pr.selectNodeContents(span);
      const text = p.texts[label];
      let s = 0, e = text.length;
      if (r.compareBoundaryPoints(Range.START_TO_START, pr) > 0) { const m = pr.cloneRange(); m.setEnd(r.startContainer, r.startOffset); s = m.toString().length; }
      if (r.compareBoundaryPoints(Range.END_TO_END, pr) < 0) { const m = pr.cloneRange(); m.setEnd(r.endContainer, r.endOffset); e = m.toString().length; }
      const t = trimRange(text, s, e);
      if (t) out.push({ pi, label, ...t });
    }));
    return out;
  }

  // ---- floating toolbar ----
  let parts = [];
  const tb = h('div', { class: 'seltools', role: 'toolbar', 'aria-label': 'Mark selected text (Alt+H to focus, Escape to close)', hidden: '' });
  const btn = (label, cls, fn, title) => {
    const b = h('button', { type: 'button', class: 'st-btn ' + cls, title: title || label }, label);
    b.addEventListener('mousedown', e => e.preventDefault()); // keep the text selected
    b.addEventListener('click', fn);
    tb.append(b); return b;
  };
  COLOURS.forEach(c => { const b = btn('', 'st-colour st-' + c, () => apply(pp => { P[pp.pi].marks[pp.label] = setHighlight(P[pp.pi].marks[pp.label], pp.s, pp.e, c); }), `Highlight ${NAMES[c]}`); b.append(h('i', { class: 'sw hl-' + c }), NAMES[c]); b.setAttribute('aria-label', `Highlight ${NAMES[c]}`); });
  btn('Underline', 'st-ul', () => { const on = !parts.every(pp => underlined(P[pp.pi].marks[pp.label], pp.s, pp.e)); apply(pp => { P[pp.pi].marks[pp.label] = setUnderline(P[pp.pi].marks[pp.label], pp.s, pp.e, on); }); });
  btn('Note', 'st-note', () => { const pp = parts[0]; if (pp) openEditor(pp, null); }, 'Add a note');
  btn('Clear', 'st-clear', () => apply(pp => { P[pp.pi].marks[pp.label] = clearRange(P[pp.pi].marks[pp.label], pp.s, pp.e); }), 'Clear marks on selection');
  document.body.append(tb);

  function apply(fn) {
    const touched = new Set();
    parts.forEach(pp => { fn(pp); touched.add(pp.pi + '|' + pp.label); });
    touched.forEach(k => { const [pi, l] = k.split('|'); renderPara(+pi, l); save(+pi); });
    getSelection()?.removeAllRanges(); hideTb();
  }
  function hideTb() { tb.hidden = true; parts = []; }
  function showTb() {
    parts = getParts();
    if (!parts.length) { hideTb(); return; }
    const rect = getSelection().getRangeAt(0).getBoundingClientRect();
    tb.hidden = false;
    const w = tb.offsetWidth, ht = tb.offsetHeight;
    let top = rect.top - ht - 8; if (top < 4) top = rect.bottom + 8;
    tb.style.top = Math.max(4, Math.min(top, innerHeight - ht - 4)) + 'px';
    tb.style.left = Math.max(4, Math.min(rect.left + rect.width / 2 - w / 2, innerWidth - w - 4)) + 'px';
  }

  // ---- note editor ----
  const ed = h('div', { class: 'noteedit', role: 'dialog', 'aria-label': 'Note', hidden: '' });
  const ta = h('textarea', { rows: '3', 'aria-label': 'Note text' });
  const saveB = h('button', { type: 'button', class: 'btn mini' }, 'Save note');
  const delB = h('button', { type: 'button', class: 'btn ghost mini' }, 'Delete');
  const closeB = h('button', { type: 'button', class: 'btn ghost mini' }, 'Close');
  ed.append(ta, h('div', { class: 'ne-row' }, saveB, delB, closeB));
  document.body.append(ed);
  let edTarget = null, edFrom = null;
  function openEditor(pp, noteId, anchor) {
    const rect = anchor ? anchor.getBoundingClientRect() : getSelection().getRangeAt(0).getBoundingClientRect();
    edTarget = { ...pp, id: noteId };
    ta.value = noteId ? (P[pp.pi].marks[pp.label].notes.find(n => n.id === noteId)?.t ?? '') : '';
    delB.hidden = !noteId;
    hideTb(); ed.hidden = false; edFrom = document.activeElement;
    ed.style.top = Math.min(rect.bottom + 8, innerHeight - ed.offsetHeight - 4) + 'px';
    ed.style.left = Math.max(4, Math.min(rect.left, innerWidth - ed.offsetWidth - 4)) + 'px';
    ta.focus();
  }
  function closeEditor() { ed.hidden = true; edTarget = null; if (edFrom?.isConnected) edFrom.focus?.(); }
  saveB.onclick = () => {
    const t = edTarget, text = ta.value.trim(); if (!t) return;
    const m = P[t.pi].marks[t.label];
    if (!text) { if (t.id) P[t.pi].marks[t.label] = removeNote(m, t.id); }
    else if (t.id) P[t.pi].marks[t.label] = updateNote(m, t.id, text);
    else P[t.pi].marks[t.label] = addNote(m, t.s, t.e, text).marks;
    renderPara(t.pi, t.label); save(t.pi); getSelection()?.removeAllRanges(); closeEditor();
  };
  delB.onclick = () => { const t = edTarget; if (!t?.id) return; P[t.pi].marks[t.label] = removeNote(P[t.pi].marks[t.label], t.id); renderPara(t.pi, t.label); save(t.pi); closeEditor(); };
  closeB.onclick = closeEditor;

  function noteClick(e) {
    const n = e.target.closest?.('.nend'); if (!n || !getSelection().isCollapsed) return;
    const span = n.closest('.ptext'); const pi = P.findIndex(p => p.el.contains(span));
    if (pi < 0) return;
    const label = Object.keys(P[pi].ptexts).find(l => P[pi].ptexts[l] === span);
    openEditor({ pi, label }, n.dataset.n, n);
  }

  // ---- events ----
  const on = (t, ev, fn) => { t.addEventListener(ev, fn); offs.push(() => t.removeEventListener(ev, fn)); };
  const offs = [];
  on(root, 'mouseup', () => setTimeout(showTb, 0));
  on(root, 'keyup', e => { if (e.shiftKey || e.key.startsWith('Arrow') || e.key === 'Shift') showTb(); });
  on(root, 'click', noteClick);
  on(root, 'keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('nend')) { e.preventDefault(); noteClick(e); } });
  on(document, 'selectionchange', () => { if (!tb.hidden && getSelection().isCollapsed && !tb.contains(document.activeElement)) hideTb(); });
  on(document, 'keydown', e => {
    if (e.key === 'Escape') { if (!ed.hidden) closeEditor(); else if (!tb.hidden) { hideTb(); getSelection()?.removeAllRanges(); } }
    else if (e.altKey && e.key.toLowerCase() === 'h' && !tb.hidden) { e.preventDefault(); tb.querySelector('button').focus(); }
  });
  on(tb, 'keydown', e => {
    const bs = [...tb.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length].focus(); }
  });
  // hide the toolbar when clicking elsewhere
  on(document, 'mousedown', e => { if (!tb.contains(e.target) && !ed.contains(e.target)) { if (!tb.hidden) hideTb(); if (!ed.hidden) closeEditor(); } });

  // ---- clear marks button ----
  const clearB = h('button', { type: 'button', class: 'btn ghost mini' }, 'Clear marks');
  const active = () => Math.max(0, P.findIndex(p => !p.el.hidden));
  clearB.onclick = () => {
    const pi = active();
    Object.keys(P[pi].texts).forEach(l => { P[pi].marks[l] = emptyMarks(); });
    render(pi); save(pi);
  };
  strip(root).append(clearB);

  return {
    render, refresh: render,
    getMarks: pi => P[pi].marks,
    texts: pi => Object.entries(P[pi].texts).map(([label, text]) => ({ label, text })),
    setExtra(pi, map) {
      for (const [l, v] of Object.entries(map)) if (P[pi].texts[l] != null) P[pi].extra[l] = { ...P[pi].extra[l], ...v };
      render(pi);
    },
    destroy() { offs.forEach(f => f()); tb.remove(); ed.remove(); },
  };
}

export function mountFindBar({ root, getActivePassageIndex, annotations }) {
  const input = h('input', { type: 'search', placeholder: 'Find in passage', 'aria-label': 'Find in passage', autocomplete: 'off' });
  const count = h('span', { class: 'muted fcount', 'aria-live': 'polite' });
  const prev = h('button', { type: 'button', class: 'btn ghost mini', 'aria-label': 'Previous match' }, '↑');
  const next = h('button', { type: 'button', class: 'btn ghost mini', 'aria-label': 'Next match' }, '↓');
  const clr = h('button', { type: 'button', class: 'btn ghost mini' }, 'Clear find');
  const box = h('div', { class: 'findbar', role: 'search' }, input, prev, next, count, clr);
  strip(root).prepend(box);
  let hits = [], cur = 0, shownPi = -1;
  const paint = () => {
    const pi = getActivePassageIndex();
    const map = {}; annotations.texts(pi).forEach(({ label }) => { map[label] = { find: [] }; });
    hits.forEach((m, i) => map[m.label].find.push({ s: m.s, e: m.e, cur: i === cur }));
    // clear a previously searched passage that is no longer shown
    if (shownPi >= 0 && shownPi !== pi) { const o = {}; annotations.texts(shownPi).forEach(({ label }) => { o[label] = { find: [] }; }); annotations.setExtra(shownPi, o); }
    shownPi = pi;
    annotations.setExtra(pi, map);
    count.textContent = input.value.trim().length < 2 ? '' : hits.length ? `${cur + 1} of ${hits.length}` : 'No matches';
    root.querySelector('.find-cur')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const run = () => {
    const pi = getActivePassageIndex();
    hits = annotations.texts(pi).flatMap(({ label, text }) => findMatches(text, input.value).map(m => ({ label, ...m })));
    cur = 0; paint();
  };
  const step = d => { if (hits.length) { cur = (cur + d + hits.length) % hits.length; paint(); } };
  const clear = () => { input.value = ''; run(); };
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') clear(); });
  next.onclick = () => step(1); prev.onclick = () => step(-1); clr.onclick = clear;
  // switching passage tabs re-runs the search on the newly visible passage
  root.addEventListener('click', e => { if (e.target.closest?.('.ptabs')) setTimeout(() => { if (input.value.trim().length >= 2 || shownPi >= 0) run(); }, 0); });
  return { run, clear };
}

export function mountRuler({ root, passageSelector }) {
  if (matchMedia('(pointer: coarse)').matches) return null;
  const pane = root.querySelector(passageSelector); if (!pane) return null;
  const band = h('div', { class: 'ruler', 'aria-hidden': 'true', hidden: '' });
  document.body.append(band);
  const b = h('button', { type: 'button', class: 'btn ghost mini', 'aria-pressed': 'false' }, 'Ruler');
  strip(root).append(b);
  let on = false;
  b.onclick = () => { on = !on; b.setAttribute('aria-pressed', on); if (!on) band.hidden = true; };
  pane.addEventListener('pointermove', e => {
    if (!on || e.pointerType === 'touch') return;
    const r = pane.getBoundingClientRect(), hgt = band.offsetHeight || 40;
    band.hidden = false;
    band.style.left = r.left + 'px'; band.style.width = pane.clientWidth + 'px';
    band.style.top = Math.max(r.top, Math.min(e.clientY - hgt / 2, r.bottom - hgt)) + 'px';
  });
  pane.addEventListener('pointerleave', () => { band.hidden = true; });
  return { destroy: () => band.remove() };
}

// Static passage HTML for review screens: stored marks plus an optional evidence layer ({paragraph, quote}).
export function reviewPassageHtml(passage, marksByLabel, evidence) {
  return passage.paragraphs.map(p => {
    const marks = cleanMarks(marksByLabel?.[p.label]);
    const r = evidence && evidence.paragraph === p.label ? evidenceRange(p.text, evidence.quote) : null;
    return `<p data-label="${esc(p.label)}"><strong>${esc(p.label)}</strong> <span class="ptext">${toHtml(p.text, marks, r ? { ev: [r] } : {})}</span></p>`;
  }).join('');
}

// Verdict line for one question: how much of its evidence the student's marks cover.
export function evidenceVerdict(passage, marksByLabel, evidence) {
  const p = passage.paragraphs.find(x => x.label === evidence?.paragraph);
  const r = p && evidenceRange(p.text, evidence.quote);
  return r ? verdictText(coverage(cleanMarks(marksByLabel?.[p.label]), r).verdict) : '';
}
