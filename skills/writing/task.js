import { mountDisplayMenu } from '../../assets/core/display.js';
import { renderChart } from './chart.js';
import { mockNext } from './mock.js';
import { recordAttempt } from '../../assets/core/store.js';
import { mountSaveBar } from '../../assets/core/answers.js';
import { mountLive, mountPace, mountChartTools, mountToolbox, mountDraft, loadLast, saveLast, lastDetailsHtml, lastNote } from './tools-ui.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const json = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`Cannot load ${u}`); return r.json(); };
const arr = v => Array.isArray(v) ? v : [];
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
  const [task, roles, guides, bank, dict] = await Promise.all([json(`../../../content/writing/${meta.dir}/${id}.json`), json('../../../content/writing/roles.json'), json('../../../content/writing/guides.json'), json('../../../content/writing/phrasebank.json').catch(() => null), json('../../../content/writing/paraphrase.json').catch(() => null)]);
  run(task, roles, meta, guides[task.guide], bank, dict);
  const mockId = new URLSearchParams(location.search).get('mock');
  const next = mockId && mockNext(await json('../../../content/writing/mocks.json'), mockId, id);
  if (next) app.insertAdjacentHTML('afterend', `<p class="mocknav"><a class="btn" href="${esc(next.href)}">${esc(next.label)}</a></p>`);
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

function run(task, roles, meta, guide, bank, dict) {
  const minutes = task.task === 1 ? 20 : 40, minWords = task.task === 1 ? 150 : 250;
  const paras = task.model.paragraphs, last = loadLast(task.id);
  const rub = t => t && !task.prompt.includes(t) ? `<p class="muted">${esc(t)}</p>` : ''; // exam rubric line, skipped if the prompt already says it
  app.innerHTML = `
    <header class="head"><div><p class="kicker">Task ${task.task} &middot; ${esc(task.essayType ?? meta.title)}</p><h1>${esc(task.title ?? meta.title)}</h1></div>
      <div class="timebox"><span id="timer" role="timer">${mmss(minutes * 60)}</span><p id="phase" class="phase" aria-live="polite"></p><span id="dispslot"></span></div></header>
    <div class="split">
      <div class="left"><section class="card prompt"><h2>The task</h2><p class="muted">You should spend about ${minutes} minutes on this task.</p>${rub(task.task === 2 && 'Write about the following topic:')}<p>${esc(task.prompt)}</p>${rub(task.task === 2 && 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.')}${task.chart ? `<div class="chart">${renderChart(task.chart)}</div><div class="kf"></div>` : ''}<p class="muted">Write at least ${minWords} words.</p></section>
      ${guide ? `<section class="card guide"><h2>Understand and plan</h2>
        <div class="gtabs" role="group" aria-label="Guidance"><button type="button" data-g="analyse" aria-expanded="false">Analyse the question</button><button type="button" data-g="plan" aria-expanded="false">Plan your answer</button><button type="button" data-g="how" aria-expanded="false">How this ${task.task === 1 ? 'report' : 'essay'} works</button><button type="button" data-g="lang" aria-expanded="false">Language bank</button></div>
        <div class="gpanel" hidden></div><p><a href="../learn/#${task.guide}">Full study notes for this task type &rarr;</a></p></section>` : ''}
      <section class="card toolbox"></section></div>
      <section class="card write"><h2>Your answer</h2><p class="notice" id="restored" hidden></p>${last ? lastDetailsHtml(last) : ''}
        <div class="tabs" role="group" aria-label="Mode"><button type="button" data-m="guided" aria-pressed="true">Guided build</button><button type="button" data-m="free" aria-pressed="false">Free write</button></div>
        <div id="guided">${paras.map((p, pi) => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map((s, si) => `
          <div class="slot"><label for="s${pi}_${si}"><span class="chip">${esc(roles[s.role].label)}</span><span class="hint">${esc(roles[s.role].hint)}</span></label>
          <textarea id="s${pi}_${si}" rows="2"></textarea></div>`).join('')).join('')}</div>
        <div id="free" hidden><textarea id="freeText" rows="18" aria-label="Your answer"></textarea></div>
        <details class="selfcheck" open><summary>Self-check</summary><div id="selfcheck"></div></details>
        <div class="bar"><div class="meter" id="meter"></div><button class="btn" id="done" type="button">Compare with model</button></div>
      </section></div>`;

  let mode = 'guided';
  const $ = s => app.querySelector(s);
  const text = () => mode === 'free' ? $('#freeText').value : [...app.querySelectorAll('#guided textarea')].map(t => t.value).join(' ');
  const slots = () => [...app.querySelectorAll('#guided textarea')];
  // guided slots grouped by paragraph (sentences joined with a space); free text split on newlines
  const getParas = () => (mode === 'free' ? $('#freeText').value.split(/\n+/) : paras.map((p, pi) => p.sentences.map((_, si) => $(`#s${pi}_${si}`).value.trim()).filter(Boolean).join(' '))).map(t => t.trim()).filter(Boolean);
  const live = mountLive({ meterEl: $('#meter'), checkEl: $('#selfcheck'), getParas, taskNo: task.task });
  app.addEventListener('input', live);
  app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    mode = b.dataset.m;
    app.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#guided').hidden = mode !== 'guided'; $('#free').hidden = mode !== 'free'; live.flush();
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

  mountDisplayMenu($('#dispslot'));
  const start = Date.now(); let left = minutes * 60;
  const timerEl = $('#timer'), phase = mountPace($('#phase'), guide?.timing);
  phase(0);
  const tick = setInterval(() => { left--; timerEl.textContent = mmss(left); timerEl.classList.toggle('late', left <= 0); phase(minutes * 60 - left); }, 1000);

  if (task.chart) mountChartTools({ chartEl: $('.chart'), featuresEl: $('.kf'), id: task.id });
  let lastTa = null;
  $('.write').addEventListener('focusin', e => { if (e.target.matches('textarea')) lastTa = e.target; });
  mountToolbox({ el: $('.toolbox'), promptEl: $('.prompt'), taskNo: task.task, bank, dict,
    getTarget: () => lastTa && !lastTa.closest('[hidden]') ? { ta: lastTa } : { ta: mode === 'free' ? $('#freeText') : slots()[0], append: true } });
  const draft = mountDraft({ app, id: task.id, noticeEl: $('#restored'),
    read: () => ({ mode, slots: slots().map(t => t.value), free: $('#freeText').value }),
    write: d => { slots().forEach((t, i) => t.value = String(arr(d.slots)[i] ?? '')); $('#freeText').value = String(d.free ?? ''); if (d.mode === 'free') app.querySelector('.tabs button[data-m="free"]').click(); live.flush(); },
    onDiscard: () => { slots().forEach(t => t.value = ''); $('#freeText').value = ''; live.flush(); } });

  $('#done').onclick = () => {
    clearInterval(tick); live.cancel(); app.removeEventListener('input', live); draft.stop(); // review checkboxes fire input too
    const paraList = getParas(), nowWords = paraList.join(' ').split(/\s+/).filter(Boolean).length;
    const lastLine = lastNote(last, nowWords);
    saveLast(task.id, { at: Date.now(), words: nowWords, paragraphs: paraList });
    const mine = mode === 'free'
      ? $('#freeText').value.split(/\n+/).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')
      : paras.map((p, pi) => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map((_, si) => $(`#s${pi}_${si}`).value).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')).join('');
    const model = paras.map(p => `<p class="pname">${esc(p.name)}</p>` + p.sentences.map(s => `<p><span class="chip">${esc(roles[s.role].label)}</span>${esc(s.text)}${s.why ? ` <button class="why-btn" type="button" aria-expanded="false">Why it works</button><span class="why" hidden>${esc(s.why)}</span>` : ''}</p>`).join('')).join('');
    const checks = CHECKS(task.task === 1 ? 'Task Achievement' : 'Task Response').map(([h, items]) =>
      `<fieldset><legend>${h}</legend>${items.map(i => `<label><input type="checkbox"> ${i}</label>`).join('')}</fieldset>`).join('');
    app.innerHTML = `<header class="head"><div><p class="kicker">Review</p><h1>${esc(task.title ?? meta.title)}</h1></div><span class="wc">${words(text())} words</span></header>
      ${lastLine ? `<p class="lastnote">${esc(lastLine)}</p>` : ''}
      <div class="res"><section class="card"><h2>Your answer</h2>${mine || '<p class="muted">(nothing written)</p>'}</section>
        <section class="card"><h2>Model answer, sentence by sentence</h2><p><button class="btn ghost" id="whyAll" type="button">Show all explanations</button></p>${model}</section></div>
      ${guide ? `<section class="card check"><h2>Check yourself against these</h2><h3>Common mistakes</h3>${list(guide.pitfalls)}<h3>What lifts an answer to Band 8+</h3>${list(guide.band8)}</section>` : ''}
      <section class="card check"><h2>Self-check against the four marking criteria</h2>${checks}
        <p><button class="btn" id="save" type="button">Save to my progress</button> <a class="btn ghost" href="../">Back to Writing</a></p></section>
      <section class="card"><h2>Keep your answer</h2><div id="savebar"></div></section>`;
    const mockId = new URLSearchParams(location.search).get('mock');
    mountSaveBar(app.querySelector('#savebar'), () => ({ id: `writing:${task.id}:${start}`, skill: 'writing', kind: mockId ? `mock exam, task ${task.task}` : `task ${task.task}`, title: task.title ?? meta.title, setId: task.id, mockId, at: start,
      seconds: Math.round((Date.now() - start) / 1000), prompt: task.prompt, words: nowWords, paragraphs: paraList }), '../../../answers/');
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

