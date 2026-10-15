// UI for the Writing study tools. DOM glue only: the logic lives in checks.js, suggest.js, pace.js and prefs.js.
import { analyse } from './checks.js';
import { suggest } from './suggest.js';
import { phaseAt } from '../../assets/core/tools/pace.js';
import { loadPref, savePref } from '../../assets/core/prefs.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const arr = v => Array.isArray(v) ? v : [];

// 1 + 2. Meter (immediate) and self-check panel (debounced 300 ms)
export function mountLive({ meterEl, checkEl, getParas, taskNo }) {
  const meter = () => {
    const a = analyse(getParas(), taskNo), togo = a.target - a.words;
    const scale = Math.max(a.target * 1.3, a.words, 1);
    meterEl.innerHTML = `<div class="mstats"><b>${a.words}</b> words &middot; ${a.paragraphs} paragraphs &middot; ${a.sentences} sentences &middot; avg ${a.avgSentence} words/sentence</div>
      <div class="mbar" role="progressbar" aria-label="Word count" aria-valuemin="0" aria-valuemax="${a.target}" aria-valuenow="${Math.min(a.words, a.target)}"><i class="${togo > 0 ? 'low' : 'ok'}" style="width:${(a.words / scale * 100).toFixed(1)}%"></i><u style="left:${(a.target / scale * 100).toFixed(1)}%" title="Target ${a.target}"></u></div>
      <div class="mgo ${togo > 0 ? 'low' : 'ok'}">${togo > 0 ? `${togo} to go (target ${a.target})` : togo === 0 ? `Target of ${a.target} reached` : `Target ${a.target}: over by ${-togo}`}</div>`;
  };
  const WARN = { repeat: 'Repeated word', long: 'Long sentence', contraction: 'Avoid contraction' };
  const checks = () => {
    const a = analyse(getParas(), taskNo);
    checkEl.innerHTML = `<ul class="cks">${a.checks.map(c => `<li class="${c.ok ? 'yes' : 'no'}"><span aria-hidden="true">${c.ok ? '✓' : '✗'}</span> ${esc(c.label)}<span class="sr"> (${c.ok ? 'done' : 'not yet'})</span></li>`).join('')}</ul>
      ${a.warnings.length ? `<p class="wh">Things to look at</p><ul class="wns">${a.warnings.map(w => `<li>${WARN[w.type]}: ${esc(w.detail)}</li>`).join('')}</ul>` : ''}`;
  };
  const slow = debounce(checks, 300);
  const update = () => { meter(); slow(); };
  update.flush = () => { meter(); slow.flush(); };
  update.cancel = slow.cancel;
  update.flush();
  return update;
}

// 3. Pacing phase from the guide's timing
export function mountPace(el, timing) {
  if (!timing?.length) return () => {};
  const starts = timing.reduce((a, t, i) => (a.push(i ? a[i - 1] + timing[i - 1].minutes * 60 : 0), a), []);
  return elapsed => {
    const p = phaseAt(timing, elapsed), short = String(p.what ?? '').split(/[:,(]/)[0].trim();
    const justEnded = !p.overrun && p.index > 0 && elapsed - starts[p.index] < 15;
    el.textContent = p.overrun ? 'Time to move on: planned time is up' : `${justEnded ? 'Time to move on · ' : ''}${short} · ${clock(p.remainingSec)} left`;
    el.classList.toggle('late', p.overrun || justEnded);
  };
}

// 4. Chart zoom, marked data points, key features
const MARK = '.bar, .slice, circle.pt, td';
export function mountChartTools({ chartEl, featuresEl, id }) {
  const html = chartEl.innerHTML, kMarks = `writing-marks:${id}`, kFeat = `writing-features:${id}`;
  const marked = new Set(arr(loadPref(kMarks, [])));
  chartEl.insertAdjacentHTML('afterbegin', '<div class="ctools"><button type="button" class="btn ghost zoombtn">Zoom chart</button><span class="markcount" aria-live="polite"></span></div>');
  const dlg = document.createElement('dialog');
  dlg.className = 'zoomdlg'; dlg.setAttribute('aria-label', 'Zoomed chart');
  dlg.innerHTML = `<div class="dhead"><span class="markcount" aria-live="polite"></span><button type="button" class="btn dclose">Close</button></div><div class="chart">${html}</div>`;
  chartEl.after(dlg);
  const roots = [chartEl, dlg];
  const paint = () => roots.forEach(r => {
    r.querySelectorAll(MARK).forEach((m, i) => {
      const on = marked.has(i);
      m.classList.toggle('marked', on); m.setAttribute('aria-pressed', on);
      if (!m.hasAttribute('tabindex')) { m.setAttribute('tabindex', '0'); m.setAttribute('role', 'button'); m.setAttribute('aria-label', `Data point ${i + 1}`); }
    });
    r.querySelectorAll('.markcount').forEach(c => c.textContent = marked.size ? `Marked: ${marked.size}` : '');
  });
  const toggle = i => { marked.has(i) ? marked.delete(i) : marked.add(i); savePref(kMarks, [...marked]); paint(); };
  const open = () => { if (!dlg.open) dlg.showModal(); };
  for (const r of roots) {
    r.addEventListener('click', e => {
      const m = e.target.closest(MARK);
      if (m) return toggle([...r.querySelectorAll(MARK)].indexOf(m));
      if (r === chartEl && !e.target.closest('.ctools')) open();
    });
    r.addEventListener('keydown', e => { const m = e.target.closest?.(MARK); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle([...r.querySelectorAll(MARK)].indexOf(m)); } });
  }
  chartEl.querySelector('.zoombtn').onclick = open;
  dlg.querySelector('.dclose').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  paint();

  let feats = arr(loadPref(kFeat, [])).filter(f => f && typeof f.t === 'string');
  featuresEl.innerHTML = `<h3>Key features</h3><form class="kfadd"><label class="sr" for="kfin">Add a key feature</label><input id="kfin" type="text" placeholder="e.g. Cars were the most popular choice"><button class="btn ghost" type="submit">Add</button></form><ul class="kfl"></ul>`;
  const ul = featuresEl.querySelector('.kfl'), inp = featuresEl.querySelector('#kfin');
  const draw = () => {
    ul.innerHTML = feats.map((f, i) => `<li><label><input type="checkbox" data-i="${i}" ${f.done ? 'checked' : ''}> <span class="${f.done ? 'cov' : ''}">${esc(f.t)}</span><span class="sr">${f.done ? ' (covered)' : ''}</span></label><button type="button" class="kfdel" data-i="${i}" aria-label="Delete: ${esc(f.t)}">&times;</button></li>`).join('') || '<li class="muted">Note two or three features to cover in your overview and body paragraphs.</li>';
  };
  featuresEl.querySelector('form').onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; feats.push({ t, done: false }); inp.value = ''; savePref(kFeat, feats); draw(); };
  ul.addEventListener('change', e => { const i = e.target.dataset.i; if (i === undefined) return; feats[i].done = e.target.checked; savePref(kFeat, feats); draw(); });
  ul.addEventListener('click', e => { const b = e.target.closest('.kfdel'); if (!b) return; feats.splice(+b.dataset.i, 1); savePref(kFeat, feats); draw(); });
  draw();
}

// 5. Toolbox: phrase bank and paraphrase
export function mountToolbox({ el, promptEl, taskNo, bank, dict, getTarget }) {
  const sections = arr(bank?.[`task${taskNo}`]);
  if (!sections.length && !dict) { el.hidden = true; return; }
  el.innerHTML = `<h2>Toolbox</h2><div class="ttabs" role="group" aria-label="Toolbox"><button type="button" data-t="bank" aria-pressed="true">Phrase bank</button><button type="button" data-t="para" aria-pressed="false">Paraphrase</button></div>
    <div id="tbank">${sections.map(s => `<details><summary>${esc(s.title)}</summary><div class="items">${s.items.map(i => `<button type="button" class="ins">${esc(i)}</button>`).join('')}</div></details>`).join('')}</div>
    <div id="tpara" hidden><label for="pin">Type a word or phrase, or select text in the task</label><input id="pin" type="text" autocomplete="off"><div id="pres" aria-live="polite"><p class="muted">Select a word in the task or type one above.</p></div></div>`;
  const bankEl = el.querySelector('#tbank'), paraEl = el.querySelector('#tpara'), pin = el.querySelector('#pin'), pres = el.querySelector('#pres');
  el.querySelectorAll('.ttabs button').forEach(b => b.onclick = () => {
    el.querySelectorAll('.ttabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
    bankEl.hidden = b.dataset.t !== 'bank'; paraEl.hidden = b.dataset.t !== 'para';
  });
  const insert = text => {
    const { ta, append } = getTarget(); if (!ta) return;
    const v = ta.value, s = append ? v.length : ta.selectionStart, e = append ? v.length : ta.selectionEnd;
    const pre = v.slice(0, s), post = v.slice(e);
    const out = (pre && !/\s$/.test(pre) ? ' ' : '') + text + (post && !/^[\s.,;:!?]/.test(post) ? ' ' : '');
    ta.value = pre + out + post;
    const c = (pre + out).length; ta.focus(); ta.setSelectionRange(c, c);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  };
  bankEl.addEventListener('click', e => { const b = e.target.closest('.ins'); if (b) insert(b.textContent); });
  const lookup = () => {
    const q = pin.value.trim();
    if (!q) { pres.innerHTML = '<p class="muted">Select a word in the task or type one above.</p>'; return; }
    const hits = dict ? suggest(q, dict) : [];
    pres.innerHTML = hits.length ? hits.map(h => `<div class="sg"><p class="sk">${esc(h.key)}</p><div class="items">${h.options.map(o => `<button type="button" class="ins">${esc(o)}</button>`).join('')}</div></div>`).join('')
      : '<p class="muted">No stored synonyms; try a broader word.</p>';
  };
  pin.addEventListener('input', lookup);
  pres.addEventListener('click', e => { const b = e.target.closest('.ins'); if (b) insert(b.textContent); });
  promptEl.addEventListener('mouseup', () => {
    const t = String(getSelection()).trim();
    if (t && promptEl.contains(getSelection().anchorNode)) { pin.value = t.slice(0, 80); lookup(); }
  });
}

// 6 + 7. Autosave draft and last attempt (prefs.js never throws)
export function mountDraft({ app, id, noticeEl, read, write, onDiscard }) {
  const kd = `writing-draft:${id}`;
  const d = loadPref(kd, null);
  if (d && typeof d === 'object' && (d.free || arr(d.slots).some(Boolean))) {
    write(d);
    const at = new Date(d.at);
    noticeEl.innerHTML = `<span>Draft restored from ${isNaN(at) ? 'earlier' : esc(at.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}.</span> <button type="button" class="btn ghost">Discard</button>`;
    noticeEl.hidden = false;
    noticeEl.querySelector('button').onclick = () => { savePref(kd, null); onDiscard(); noticeEl.hidden = true; };
  }
  let stopped = false;
  const save = debounce(() => { if (!stopped) savePref(kd, { at: Date.now(), ...read() }); }, 400);
  app.addEventListener('input', save);
  return { stop() { stopped = true; save.cancel(); savePref(kd, null); } };
}

export const loadLast = id => { const l = loadPref(`writing-last:${id}`, null); return l && typeof l === 'object' && Array.isArray(l.paragraphs) ? l : null; };
export const saveLast = (id, v) => savePref(`writing-last:${id}`, v);
export const lastDetailsHtml = l => `<details class="lastatt"><summary>Your last attempt (${esc(new Date(l.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))} &middot; ${l.words} words)</summary>${l.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</details>`;
export const lastNote = (l, now) => l ? `Last time ${l.words} words · Now ${now} words (${now - l.words >= 0 ? '+' : '−'}${Math.abs(now - l.words)})` : '';
