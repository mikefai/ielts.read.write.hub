// Study notes: turn note objects into HTML and handle #hash navigation.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (a, cls, label) => `<ul>${a.map(t => `<li class="${cls}"><b>${label}:</b> ${esc(t)}</li>`).join('')}</ul>`;
const sec = (h, body) => `<section><h2>${h}</h2>${body}</section>`;

function example(ex) {
  if (!ex) return '';
  let b;
  if (ex.text != null) {
    const t = esc(ex.text), ev = esc(ex.evidence || '');
    b = `<p>${ev && t.includes(ev) ? t.replace(ev, `<mark>${ev}</mark>`) : t}</p>`
      + `<p><b>Question:</b> ${esc(ex.question)}</p><p><b>Answer:</b> ${esc(ex.answer)}</p>`
      + (ex.walk?.length ? `<ol>${ex.walk.map(w => `<li>${esc(w)}</li>`).join('')}</ol>` : '');
  } else {
    b = `<p>${esc(ex.prompt)}</p><p><b>Weak:</b> ${esc(ex.weak)}</p><p><b>Stronger:</b> ${esc(ex.strong)}</p><p>${esc(ex.why)}</p>`;
  }
  return sec('Worked example', `<div class="example">${b}</div>`);
}

export function renderNote(n) {
  return `<article class="note"><h1>${esc(n.title)}</h1>`
    + sec('What this is', `<p>${esc(n.what)}</p>`)
    + sec('Do it in this order', `<ol>${n.steps.map(s => `<li class="step"><b>${esc(s.do)}</b><span>${esc(s.why)}</span></li>`).join('')}</ol>`)
    + (n.tricks?.length ? sec('Tricks', list(n.tricks, 'trick', 'Trick')) : '')
    + (n.traps?.length ? sec('Traps to avoid', list(n.traps, 'trap', 'Trap')) : '')
    + example(n.example)
    + (n.frames?.length ? sec('Sentence frames', n.frames.map(f => `<div class="frame"><h3>${esc(f.name)}</h3><ul>${f.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('')) : '')
    + (n.signals?.length ? sec('Signal words', `<dl>${n.signals.map(s => `<dt>${esc(s.word)}</dt><dd>${esc(s.means)}</dd>`).join('')}</dl>`) : '')
    + (n.checklist?.length ? sec('Before you move on', `<ul class="check">${n.checklist.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`) : '')
    + '</article>';
}

export function renderIndex(notes, groups = []) {
  const by = Object.fromEntries(notes.map(n => [n.id, n]));
  const used = new Set();
  const toc = ns => `<ul class="toc">${ns.map(n => `<li><a href="#${esc(n.id)}">${esc(n.title)}</a></li>`).join('')}</ul>`;
  let h = '';
  for (const g of groups) {
    const ns = g.ids.map(i => by[i]).filter(Boolean);
    ns.forEach(n => used.add(n.id));
    if (ns.length) h += `<h2 class="section-title">${esc(g.title)}</h2>${toc(ns)}`;
  }
  const rest = notes.filter(n => !used.has(n.id));
  if (rest.length) h += (groups.length ? '<h2 class="section-title">More</h2>' : '') + toc(rest);
  return h;
}

export function mountLearn({ mount, notes, groups, win = window }) {
  const draw = () => {
    let id;
    try { id = decodeURIComponent(win.location.hash.slice(1)); } catch { id = ''; }
    const i = notes.findIndex(n => n.id === id);
    if (i < 0) { mount.innerHTML = renderIndex(notes, groups); return; }
    const p = notes[i - 1], n = notes[i + 1];
    mount.innerHTML = `<nav class="learn-nav"><a href="#">← All notes</a></nav>${renderNote(notes[i])}`
      + `<nav class="learn-nav">${p ? `<a href="#${esc(p.id)}">← ${esc(p.title)}</a>` : '<span></span>'}${n ? `<a href="#${esc(n.id)}">${esc(n.title)} →</a>` : ''}</nav>`;
    win.scrollTo?.(0, 0);
  };
  win.addEventListener('hashchange', draw);
  draw();
}
