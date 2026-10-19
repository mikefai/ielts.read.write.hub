import { mountDisplayMenu } from '../../assets/core/display.js';
import { buildSteps } from './plan.js';
import { recordAttempt } from '../../assets/core/store.js';
import { mountSaveBar } from '../../assets/core/answers.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mmss = s => `${s < 0 ? '+' : ''}${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`;
const app = document.getElementById('app');
mountDisplayMenu(document.querySelector('.wrap > p'));
const CRITERIA = [
  ['Fluency and Coherence', ['I kept talking without long pauses', 'I linked my ideas clearly']],
  ['Lexical Resource', ['I used some less common vocabulary naturally', 'I paraphrased when I forgot a word']],
  ['Grammatical Range and Accuracy', ['I mixed simple and complex sentences', 'I kept my tenses accurate']],
  ['Pronunciation', ['My stress and intonation were easy to follow', 'I spoke clearly at a steady pace']],
];

try {
  const id = new URLSearchParams(location.search).get('id');
  const r = await fetch(`../../../content/speaking/${encodeURIComponent(id)}.json`);
  if (!r.ok) throw new Error('Unknown mock');
  run(await r.json());
} catch (e) {
  app.innerHTML = `<p class="card">Could not load this mock (${esc(e.message)}). Serve the folder over http, e.g. <code>npx serve .</code></p>`;
}

function run(mock) {
  const steps = buildSteps(mock), p2 = mock.part2, say = 'speechSynthesis' in window;
  let i = 0, exam = false, timer = null, prepNotes = '', left = 0;
  const start = Date.now();
  const stop = () => { clearInterval(timer); if (say) speechSynthesis.cancel(); };
  const countdown = (el, secs, onEnd) => {
    left = secs; el.textContent = mmss(left);
    timer = setInterval(() => { left--; el.textContent = mmss(left); el.classList.toggle('late', left <= 0); if (onEnd && left === 0) { clearInterval(timer); onEnd(); } }, 1000);
  };

  const help = s => {
    const src = s.kind === 'question' ? s.ref : p2;
    return `<aside class="card help"><h2>Vocabulary help</h2><h3>Useful words</h3><ul>${src.vocab.map(v => `<li><strong>${esc(v.word)}</strong><span class="band">Band ${v.band}</span> &mdash; ${esc(v.meaning)}<span class="ex">${esc(v.example)}</span></li>`).join('')}</ul>
      <h3>Phrases</h3><div class="phrases">${src.phrases.map(p => `<span>${esc(p)}</span>`).join('')}</div>
      ${s.kind === 'question' ? '' : `<h3>How to structure it</h3><ol>${p2.structure.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`}</aside>`;
  };

  function intro() {
    app.innerHTML = `<header class="head"><div><p class="kicker">Speaking mock interview</p><h1>${esc(mock.title)}</h1></div></header>
      <section class="card"><h2>Three parts, about 11&ndash;14 minutes</h2>
      <p><strong>Part 1</strong> &middot; short personal questions on three topics.<br><strong>Part 2</strong> &middot; a cue card: one minute to prepare, up to two minutes to talk.<br><strong>Part 3</strong> &middot; a discussion of two topics linked to Part 2.</p>
      <p>Speak your answers out loud. Vocabulary help and model answers are on; switch to Exam mode to hide them.</p>
      <div class="row"><button class="btn" id="go" type="button">Begin</button> <button class="tog" id="exam" type="button" aria-pressed="false">Exam mode</button></div></section>`;
    app.querySelector('#exam').onclick = e => { exam = !exam; e.target.setAttribute('aria-pressed', exam); };
    app.querySelector('#go').onclick = () => show();
  }

  function show(notes = '', resume) {
    stop();
    if (i >= steps.length) return finish();
    const s = steps[i], isQ = s.kind === 'question', c = p2.cue;
    const body = isQ ? `<h2>${esc(s.ref.q)}</h2>`
      : `<div class="cue"><p><strong>${esc(c.topic)}</strong></p><p>You should say:</p><ul>${c.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>` +
        '<p class="muted">You will have to talk about the topic for 1 to 2 minutes. You have 1 minute to think about what you are going to say. You can make some notes to help you if you wish.</p>' +
        (s.kind === 'prep' ? '<p><label for="notes">Make notes while you prepare</label></p><textarea id="notes" rows="5"></textarea>' : '');
    const model = s.kind === 'talk' ? p2.model : isQ ? s.ref.model : '';
    app.innerHTML = `<header class="head"><div><p class="kicker">Part ${s.part} &middot; ${esc(s.label)} &middot; ${i + 1} / ${steps.length}</p><h1>${esc(mock.title)}</h1></div>
      ${s.kind === 'cue' ? '' : '<span class="timer" id="timer" role="timer"></span>'}</header>
      <div class="split ${exam ? 'solo' : ''}"><section class="card step">${body}
        <div class="row">
          ${isQ && say ? '<button class="btn ghost" id="hear" type="button">Hear the examiner</button>' : ''}
          ${model && !exam ? '<button class="btn ghost" id="mdl" type="button" aria-expanded="false">Show model answer</button>' : ''}
          <button class="btn" id="next" type="button">${s.kind === 'cue' ? 'Start preparing' : s.kind === 'prep' ? 'Start talking' : i === steps.length - 1 ? 'Finish' : 'Next'}</button>
          <button class="tog" id="exam" type="button" aria-pressed="${exam}">Exam mode</button>
        </div><div id="model" class="model" hidden>${esc(model)}</div></section>
        ${exam ? '' : help(s)}</div>`;
    const next = () => { prepNotes = app.querySelector('#notes')?.value || prepNotes; i++; show(); }, t = app.querySelector('#timer');
    if (t) countdown(t, resume ?? (s.kind === 'prep' ? c.prepSeconds : s.kind === 'talk' ? c.talkSeconds : 30), isQ ? null : next); // question timer is soft: it counts past zero
    const ta = app.querySelector('#notes'); if (ta) ta.value = notes;
    app.querySelector('#next').onclick = next;
    app.querySelector('#exam').onclick = () => { exam = !exam; show(ta?.value, left); }; // keep the clock running across the re-render
    app.querySelector('#hear')?.addEventListener('click', () => { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(s.ref.q)); });
    app.querySelector('#mdl')?.addEventListener('click', e => { const m = app.querySelector('#model'); m.hidden = !m.hidden; e.target.setAttribute('aria-expanded', !m.hidden); e.target.textContent = m.hidden ? 'Show model answer' : 'Hide model answer'; });
  }

  function finish() {
    app.innerHTML = `<header class="head"><div><p class="kicker">Self-assessment</p><h1>${esc(mock.title)}</h1></div></header>
      <section class="card check"><h2>How did it go? Tick what is true.</h2>${CRITERIA.map(([h, items]) => `<fieldset><legend>${h}</legend>${items.map(x => `<label><input type="checkbox"> ${x}</label>`).join('')}</fieldset>`).join('')}
      <p><button class="btn" id="save" type="button">Save to my progress</button> <a class="btn ghost" href="../">Back to Speaking</a></p></section>
      <section class="card"><h2>Keep your notes and self-assessment</h2><div id="savebar"></div></section>`;
    mountSaveBar(app.querySelector('#savebar'), () => ({ id: `speaking:${mock.id}:${start}`, skill: 'speaking', kind: 'mock interview', title: mock.title, setId: mock.id, at: start, seconds: Math.round((Date.now() - start) / 1000),
      notes: prepNotes, ticks: [...app.querySelectorAll('.check input:checked')].map(c => c.parentElement.textContent.trim()) }), '../../../answers/');
    app.querySelector('#save').onclick = e => {
      recordAttempt({ type: 'speaking-mock', setId: mock.id, score: app.querySelectorAll('.check input:checked').length, total: 8, seconds: Math.round((Date.now() - start) / 1000) });
      e.target.textContent = 'Saved ✓'; e.target.disabled = true;
    };
  }

  intro();
}
