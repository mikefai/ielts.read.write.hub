import { renderChart } from './chart.js';
import { recordAttempt } from '../../assets/core/store.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const json = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`Cannot load ${u}`); return r.json(); };
const words = s => s.trim() ? s.trim().split(/\s+/).length : 0;
const mmss = s => `${s < 0 ? '+' : ''}${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`;
const app = document.getElementById('app');
const list = (items, tag = 'ul') => `<${tag}>${items.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}>`; // must precede the top-level load below

const CHECKS = (ta) => [
  [ta, ['I covered every part of the task (overview and key data, or every part of the question)', 'My position or main message is clear throughout']],
  ['Coherence and Cohesion', ['Each paragraph has one clear main idea', 'I linked ideas naturally, not mechanically']],
  ['Lexical Resource', ['I paraphrased instead of copying the prompt', 'I used precise, less common vocabulary']],
  ['Grammatical Range and Accuracy', ['I mixed simple and complex sentences', 'I checked tenses and agreement']],
];

try {
  const id = new URLSearchParams(location.search).get('id');
  const meta = (await json('../../../content/writing/index.json')).find(t => t.id === id);
  if (!meta) throw new Error('Unknown task');
  const [task, roles, guides] = await Promise.all([json(`../../../content/writing/${meta.dir}/${id}.json`), json('../../../content/writing/roles.json'), json('../../../content/writing/guides.json')]);
  run(task, roles, meta, guides[task.guide]);
} catch (e) {
  app.innerHTML = `<p class="card">Could not load this task (${esc(e.message)}). Serve the folder over http, e.g. <code>npx serve .</code></p>`;
}

// one panel per button under "Understand and plan"; text comes from the task and its guide
function guidePanels(task, g) {
  return {
    analyse: `<h3>This question</h3>${list(task.analysis, 'ol')}<h3>Method for every ${esc(g.title)}</h3>${list(g.steps, 'ol')}`,
    plan: `<h3>A plan for this question</h3><ul>${task.plan.map(p => `<li><strong>${esc(p.paragraph)}</strong> ${esc(p.idea)}</li>`).join('')}</ul>
      <h3>Timing</h3><ul>${g.timing.map(t => `<li><strong>${esc(t.minutes)} min</strong> ${esc(t.what)}</li>`).join('')}</ul>`,
    how: `<p>${esc(g.summary)}</p><h3>Structure</h3>${g.structure.map(s => `<h4>${esc(s.paragraph)}</h4><p>${esc(s.purpose)}</p>${list(s.sentences)}`).join('')}
      <h3>Lifting your score to Band 8+</h3>${list(g.band8)}<h3>Avoid</h3>${list(g.pitfalls)}`,
    lang: g.language.map(l => `<h4>${esc(l.use)}</h4><p class="phrases">${l.phrases.map(p => `<span>${esc(p)}</span>`).join('')}</p>`).join(''),
  };
}

function run(task, roles, meta, guide) {
  const minutes = task.task === 1 ? 20 : 40, minWords = task.task === 1 ? 150 : 250;
  const paras = task.model.paragraphs;
  app.innerHTML = `
    <header class="head"><div><p class="kicker">Task ${task.task} &middot; ${esc(task.essayType ?? meta.title)}</p><h1>${esc(task.title ?? meta.title)}</h1></div>
      <span id="timer" role="timer">${mmss(minutes * 60)}</span></header>
    <div class="split">
      <div class="left"><section class="card prompt"><h2>The task</h2><p>${esc(task.prompt)}</p>${task.chart ? `<div class="chart">${renderChart(task.chart)}</div>` : ''}</section>
      ${guide ? `<section class="card guide"><h2>Understand and plan</h2>
        <div class="gtabs" role="group" aria-label="Guidance"><button type="button" data-g="analyse" aria-expanded="false">Analyse the question</button><button type="button" data-g="plan" aria-expanded="false">Plan your answer</button><button type="button" data-g="how" aria-expanded="false">How this ${task.task === 1 ? 'report' : 'essay'} works</button><button type="button" data-g="lang" aria-expanded="false">Language bank</button></div>
        <div class="gpanel" hidden></div></section>` : ''}</div>
      <section class="card write"><h2>Your answer</h2>
        <div class="tabs" role="group" aria-label="Mode"><button type="button" data-m="guided" aria-pressed="true">Guided build</button><button type="button" data-m="free" aria-pressed="false">Free write</button></div>
        <div id="guided">${paras.map((p, pi) => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map((s, si) => `
          <div class="slot"><label for="s${pi}_${si}"><span class="chip">${esc(roles[s.role].label)}</span><span class="hint">${esc(roles[s.role].hint)}</span></label>
          <textarea id="s${pi}_${si}" rows="2"></textarea></div>`).join('')).join('')}</div>
        <div id="free" hidden><textarea id="freeText" rows="18" aria-label="Your answer"></textarea></div>
        <div class="bar"><span class="wc" id="wc"></span><button class="btn" id="done" type="button">Compare with model</button></div>
      </section></div>`;

  let mode = 'guided';
  const $ = s => app.querySelector(s), wc = $('#wc');
  const text = () => mode === 'free' ? $('#freeText').value : [...app.querySelectorAll('#guided textarea')].map(t => t.value).join(' ');
  const count = () => { const n = words(text()); wc.textContent = `${n} / ${minWords}+ words`; wc.className = 'wc ' + (n >= minWords ? 'ok' : 'low'); };
  app.addEventListener('input', count); count();
  app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    mode = b.dataset.m;
    app.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#guided').hidden = mode !== 'guided'; $('#free').hidden = mode !== 'free'; count();
  });

  if (guide) {
    const panels = guidePanels(task, guide), panel = $('.gpanel');
    app.querySelectorAll('.gtabs button').forEach(b => b.onclick = () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      app.querySelectorAll('.gtabs button').forEach(x => x.setAttribute('aria-expanded', 'false'));
      b.setAttribute('aria-expanded', open); panel.hidden = !open; if (open) panel.innerHTML = panels[b.dataset.g];
    });
    app.querySelector('.gtabs button[data-g="analyse"]').click(); // open by default so the left pane is never empty
  }

  const start = Date.now(); let left = minutes * 60;
  const timerEl = $('#timer');
  const tick = setInterval(() => { left--; timerEl.textContent = mmss(left); timerEl.classList.toggle('late', left <= 0); }, 1000);

  $('#done').onclick = () => {
    clearInterval(tick);
    const mine = mode === 'free'
      ? $('#freeText').value.split(/\n+/).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')
      : paras.map((p, pi) => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map((_, si) => $(`#s${pi}_${si}`).value).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')).join('');
    const model = paras.map(p => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map(s => `<p><span class="chip">${esc(roles[s.role].label)}</span>${esc(s.text)}${s.why ? ` <button class="why-btn" type="button" aria-expanded="false">Why it works</button><span class="why" hidden>${esc(s.why)}</span>` : ''}</p>`).join('')).join('');
    const checks = CHECKS(task.task === 1 ? 'Task Achievement' : 'Task Response').map(([h, items]) =>
      `<fieldset><legend>${h}</legend>${items.map(i => `<label><input type="checkbox"> ${i}</label>`).join('')}</fieldset>`).join('');
    app.innerHTML = `<header class="head"><div><p class="kicker">Review</p><h1>${esc(task.title ?? meta.title)}</h1></div><span class="wc">${words(text())} words</span></header>
      <div class="res"><section class="card"><h2>Your answer</h2>${mine || '<p class="muted">(nothing written)</p>'}</section>
        <section class="card"><h2>Model answer, sentence by sentence</h2><p><button class="btn ghost" id="whyAll" type="button">Show all explanations</button></p>${model}</section></div>
      ${guide ? `<section class="card check"><h2>Check yourself against these</h2><h3>Common mistakes</h3>${list(guide.pitfalls)}<h3>What lifts an answer to Band 8+</h3>${list(guide.band8)}</section>` : ''}
      <section class="card check"><h2>Self-check against the four marking criteria</h2>${checks}
        <p><button class="btn" id="save" type="button">Save to my progress</button> <a class="btn ghost" href="../">Back to Writing</a></p></section>`;
    const setWhy = (b, open) => { b.setAttribute('aria-expanded', open); b.nextElementSibling.hidden = !open; };
    app.querySelectorAll('.why-btn').forEach(b => b.onclick = () => setWhy(b, b.getAttribute('aria-expanded') !== 'true'));
    const whyAll = app.querySelector('#whyAll');
    whyAll.onclick = () => { const open = whyAll.dataset.open !== '1'; whyAll.dataset.open = open ? '1' : ''; whyAll.textContent = open ? 'Hide all explanations' : 'Show all explanations'; app.querySelectorAll('.why-btn').forEach(b => setWhy(b, open)); };
    app.querySelector('#save').onclick = e => {
      recordAttempt({ type: `writing-task${task.task}`, setId: task.id, score: app.querySelectorAll('.check input:checked').length, total: 8, seconds: Math.round((Date.now() - start) / 1000) });
      e.target.textContent = 'Saved \u2713'; e.target.disabled = true;
    };
  };
}

