// Study notes: turn note objects into HTML and handle #hash navigation.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (a, cls, label) => `<ul>${a.map(t => `<li class="${cls}"><b>${label}:</b> ${esc(t)}</li>`).join('')}</ul>`;
const sec = (h, body) => `<section><h2>${h}</h2>${body}</section>`;
const markIn = (t, ev) => ev && t.includes(ev) ? t.replace(ev, `<mark>${ev}</mark>`) : t; // t, ev already escaped

function example(ex) {
  if (!ex) return '';
  let b;
  if (ex.text != null) {
    const t = esc(ex.text), ev = esc(ex.evidence || '');
    b = `<p>${markIn(t, ev)}</p>`
      + `<p><b>Question:</b> ${esc(ex.question)}</p><p><b>Answer:</b> ${esc(ex.answer)}</p>`
      + (ex.walk?.length ? `<ol>${ex.walk.map(w => `<li>${esc(w)}</li>`).join('')}</ol>` : '');
  } else {
    b = `<p>${esc(ex.prompt)}</p><p><b>Weak:</b> ${esc(ex.weak)}</p><p><b>Stronger:</b> ${esc(ex.strong)}</p><p>${esc(ex.why)}</p>`;
  }
  return sec('Worked example', `<div class="example">${b}</div>`);
}

const moveHtml = m => `<li class="move"><span class="move-label">Step ${m.step}</span><p>${esc(m.say)}</p>`
  + (m.mark ? `<p class="quote">"<mark>${esc(m.mark)}</mark>"</p>` : '')
  + (m.build ? `<div class="build"><b>So far:</b> ${esc(m.build)}</div>` : '') + '</li>';
const demoIntro = d => `<p><b>Prompt:</b> ${esc(d.prompt)}</p>` + (d.text ? `<p class="passage">${esc(d.text)}</p>` : '');

export function renderDemo(n) {
  const d = n.demo;
  if (!d) return '';
  return sec("Watch how it's done", demoIntro(d) + `<ol class="demo">${d.moves.map(moveHtml).join('')}</ol><p><b>Answer:</b> ${esc(d.answer)}</p>`);
}

// Steps and demo side by side: each step sits in the same row as the demo moves that perform it.
export function renderPaired(n) {
  const d = n.demo;
  const rows = n.steps.map((s, i) => {
    const ms = d.moves.filter(m => m.step === i + 1);
    return `<li class="row"><div class="step-cell step"><span class="n">${i + 1}</span><b>${esc(s.do)}</b><span class="why">${esc(s.why)}</span></div>`
      + `<div class="demo-cell"><span class="cell-label">How it's done</span>`
      + (ms.length ? `<ol class="demo">${ms.map(moveHtml).join('')}</ol>` : '<p class="no-move">Not needed in this example.</p>') + '</div></li>';
  }).join('');
  return `<section class="pairing"><h3 class="example-q">The example</h3>${demoIntro(d)}`
    + `<div class="pair-head"><h2>Do it in this order</h2><h2>Watch how it's done</h2></div><ol class="pair">${rows}</ol>`
    + `<p class="answer"><b>Answer:</b> ${esc(d.answer)}</p></section>`;
}

export function renderPractice(n) {
  if (!n.practice?.length) return '';
  return sec('Your turn', n.practice.map((p, i) => `<div class="practice"><p><b>Try ${i + 1}</b></p><p>${esc(p.prompt)}</p>`
    + (p.text ? `<p class="passage">${esc(p.text)}</p>` : '')
    + (p.options?.length ? `<ul class="options">${p.options.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : '')
    + `<details><summary>Show the answer</summary><p><b>Answer:</b> ${esc(p.answer)}</p><p><b>Why:</b> ${esc(p.why)}</p>`
    + (p.text && p.evidence ? `<p><b>Evidence:</b></p><p class="passage">${markIn(esc(p.text), esc(p.evidence))}</p>` : '')
    + '</details></div>').join(''));
}

export function renderNote(n) {
  return `<article class="note"><h1>${esc(n.title)}</h1>`
    + sec('What this is', `<p>${esc(n.what)}</p>`)
    + (n.demo ? renderPaired(n)
      : sec('Do it in this order', `<ol>${n.steps.map(s => `<li class="step"><b>${esc(s.do)}</b><span>${esc(s.why)}</span></li>`).join('')}</ol>`))
    + renderPractice(n)
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
