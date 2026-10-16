import { mountDisplayMenu } from '../../../assets/core/display.js';
import { getJSON, esc, mmss, helpHtml, wireHelp, flashPara } from './runner.js';
import { renderers } from './renderers.js';
import { markItem } from './marking.js';
import { bandFor } from './band.js';
import { STEPS } from './coach.js';
import { recordAttempt } from '../../../assets/core/store.js';
import { mountSaveBar } from '../../../assets/core/answers.js';
import { mountNavigator, addFlags, addStrike, mountPassagePace, goTo } from './tools-nav.js';
import { mountAnnotations, mountFindBar, mountRuler, reviewPassageHtml, evidenceVerdict } from './tools-annotate.js';

export async function startTest({ mount, minutes = 60 }) {
  const id = new URLSearchParams(location.search).get('id') || 't1';
  let test, passages, sets;
  try {
    test = await getJSON(`tests/${id}.json`);
    passages = await Promise.all(test.passages.map(p => getJSON(`passages/${p.passageId}.json`)));
    sets = await Promise.all(test.passages.map(p => Promise.all(p.groups.map(g => getJSON(`questions/${g.type}/${g.setId}.json`)))));
  } catch (e) { mount.innerHTML = `<p class="card">Could not load this test (${esc(e.message)}). Serve the folder over http, e.g. <code>npx serve .</code></p>`; return; }

  const ranges = []; let n = 0;
  sets.forEach(gs => { const from = n + 1; gs.forEach(s => n += s.items.length); ranges.push([from, n]); });

  mount.innerHTML = `
    <header class="bar"><h1>${esc(test.title)}</h1><span id="timer" role="timer" aria-live="off">${mmss(minutes * 60)}</span><span id="dispslot"></span>
      <button class="btn" id="submit" type="button">Submit test</button></header>
    <div class="ptabs" role="tablist">${passages.map((_, i) => `<button type="button" role="tab" data-p="${i}" aria-selected="${i === 0}">Passage ${i + 1} <small>Q${ranges[i][0]}–${ranges[i][1]}</small></button>`).join('')}</div>
    <div class="split"><div id="ppanes"></div><div id="qpanes" class="sheet-col"></div></div>`;

  mountDisplayMenu(mount.querySelector('#dispslot'));
  const flat = [], getters = [], navItems = [];
  const ppanes = mount.querySelector('#ppanes'), qpanes = mount.querySelector('#qpanes');
  passages.forEach((ps, pi) => {
    const pp = document.createElement('article'); pp.className = 'card passage'; pp.hidden = pi > 0; pp.dataset.pid = ps.id;
    pp.innerHTML = `<h2>${esc(ps.title)}</h2>` + ps.paragraphs.map(p => `<p data-label="${p.label}"><strong>${p.label}</strong> ${esc(p.text)}</p>`).join('');
    ppanes.append(pp);
    const qp = document.createElement('section'); qp.className = 'card sheet'; qp.hidden = pi > 0; qpanes.append(qp);
    let from = ranges[pi][0];
    sets[pi].forEach(set => {
      const g = document.createElement('div'); g.className = 'group';
      g.innerHTML = `<h3>Questions ${from}–${from + set.items.length - 1}</h3><p class="muted">${esc(set.instructions ?? '')}</p>`;
      const box = document.createElement('div'); box.className = 'gbox'; box.style.counterReset = `q ${from - 1}`;
      g.append(box); qp.append(g);
      const base = flat.length;
      getters.push(renderers[set.type](set, box, from - 1));
      box.querySelectorAll('.q, .box').forEach((el, i) => { el.insertAdjacentHTML('beforeend', helpHtml(base + i)); navItems.push({ el, passageIndex: pi, number: from + i }); });
      set.items.forEach(it => flat.push({ it, wl: set.wordLimit, p: pi }));
      from += set.items.length;
    });
  });
  wireHelp(mount, flat.map(f => f.it));
  mount.addEventListener('showpara', e => flashPara(mount, e.detail));

  mount.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => {
    const pi = +b.dataset.p;
    mount.querySelectorAll('.ptabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    [...ppanes.children].forEach((el, i) => el.hidden = i !== pi);
    [...qpanes.children].forEach((el, i) => el.hidden = i !== pi);
  });
  const ann = mountAnnotations({ root: mount, passageEls: [...ppanes.children], storageKey: 'reading-marks' });
  const activePi = () => Math.max(0, [...ppanes.children].findIndex(el => !el.hidden));
  mountFindBar({ root: mount, getActivePassageIndex: activePi, annotations: ann });
  mountRuler({ root: mount, passageSelector: '#ppanes' });

  // navigator, flags, strike-through and per-passage pace (answered state reads the existing getters)
  addStrike({ root: qpanes });
  const tabBtns = [...mount.querySelectorAll('.ptabs button')];
  const flags = addFlags({ root: mount, items: navItems, storageKey: 'reading-flags:' + id });
  const nav = mountNavigator({ root: mount, items: navItems, getAnswers: () => getters.flatMap(g => g()), isFlagged: flags.isFlagged,
    onGo: i => { if (navItems[i].passageIndex !== activePi()) tabBtns[navItems[i].passageIndex].click(); goTo(navItems[i]); nav.setCurrent(i); } });
  flags.onChange(nav.refresh);
  const pace = mountPassagePace({ root: mount, tabs: tabBtns, getActive: activePi });

  const start = Date.now(); let left = minutes * 60, done = false;
  const timerEl = mount.querySelector('#timer');
  const tick = setInterval(() => { left = Math.max(0, left - 1); timerEl.textContent = mmss(left); if (!left) submit(); }, 1000);

  function submit() {
    if (done) return; done = true; clearInterval(tick); pace.stop(); nav.destroy();
    const answers = getters.flatMap(g => g());
    const res = flat.map((f, i) => ({ ...f, a: answers[i], ok: markItem(f.it, answers[i], f.wl) }));
    const score = res.filter(r => r.ok).length;
    const marks = passages.map((_, pi) => ann.getMarks(pi)); ann.destroy();
    const seconds = Math.round((Date.now() - start) / 1000);
    recordAttempt({ type: 'full-test', setId: id, score, total: flat.length, seconds });
    mount.innerHTML = `<section class="card sheet"><h2>${score}/${flat.length}</h2>
      <p><strong>Approximate band ${bandFor(score)}</strong> <span class="muted">(estimate from a published raw-score table, not an official IELTS result)</span></p>
      <div id="savebar"></div><p><a class="btn" href="../">Back to Reading</a> <a class="btn ghost" href="">Retake</a></p></section>` +
      passages.map((ps, pi) => `<h3 class="rev-h">Passage ${pi + 1}: ${esc(ps.title)}</h3><details class="rv-pass" data-p="${pi}"><summary>See the passage with your marks</summary><div class="rv-body">${reviewPassageHtml(ps, marks[pi], null)}</div></details>` + res.map((r, i) => r.p !== pi ? '' : `
        <div class="rev ${r.ok ? 'ok' : 'bad'}"><p><strong>${i + 1}. ${r.ok ? '✓' : '✗'}</strong> ${esc(r.it.prompt)}</p>
          <p>Your answer: ${esc(r.a || '(blank)')} · Correct: <strong>${esc(r.it.answer)}</strong></p>
          <p class="muted">Step ${r.it.step}: ${STEPS[r.it.step - 1]} · Evidence (paragraph ${esc(r.it.evidence.paragraph)}): <em>“${esc(r.it.evidence.quote)}”</em></p>
          <p class="verdict">${esc(evidenceVerdict(ps, marks[pi], r.it.evidence))}</p><button class="btn ghost mini" type="button" data-ev="${i}">Show evidence</button>
          ${helpHtml(i, true)}</div>`).join('')).join('');
    mountSaveBar(mount.querySelector('#savebar'), () => ({ id: `reading:test:${id}:${start}`, skill: 'reading', kind: 'full test', title: test.title, setId: id, at: start, seconds, score, total: flat.length,
      items: res.map((r, i) => ({ n: i + 1, prompt: r.it.prompt, answer: r.a || '', correct: r.it.answer, ok: r.ok })) }), '../../../answers/');
    wireHelp(mount, flat.map(f => f.it));
    mount.querySelectorAll('button[data-ev]').forEach(b => b.onclick = () => {
      const f = flat[b.dataset.ev], d = mount.querySelector(`details[data-p="${f.p}"]`);
      d.querySelector('.rv-body').innerHTML = reviewPassageHtml(passages[f.p], marks[f.p], f.it.evidence);
      d.open = true; d.querySelector('.ev')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
  mount.querySelector('#submit').onclick = submit;
}
