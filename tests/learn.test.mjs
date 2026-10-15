import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNote, renderIndex, mountLearn, renderDemo, renderPractice } from '../assets/core/learn.js';

const note = (o = {}) => ({
  id: 'a', title: 'T', what: 'w',
  steps: [1, 2, 3, 4, 5].map(i => ({ do: `do${i}`, why: `why${i}` })),
  tricks: ['t1'], traps: ['p1'], checklist: ['c1'],
  example: { text: 'The cat sat.', question: 'q', answer: 'a', evidence: 'cat sat', walk: ['s1'] },
  ...o,
});

test('renderNote escapes markup', () => {
  const h = renderNote(note({ what: 'A <b>x</b> & "y"' }));
  assert.ok(h.includes('&lt;b&gt;'));
  assert.ok(!h.includes('<b>x'));
});

test('renderNote lists every step with its why', () => {
  const h = renderNote(note());
  assert.ok(h.includes('<ol'));
  let at = 0;
  for (let i = 1; i <= 5; i++) for (const s of [`do${i}`, `why${i}`]) {
    const j = h.indexOf(s, at); assert.ok(j >= at, s); at = j;
  }
});

test('renderNote omits absent optional sections', () => {
  const h = renderNote(note());
  for (const s of ['Sentence frames', 'Signal words', 'undefined']) assert.ok(!h.includes(s), s);
});

test('renderNote shows evidence quote inside reading example', () => {
  assert.match(renderNote(note()), /<mark[^>]*>cat sat<\/mark>/);
});

test('renderIndex links every note and groups', () => {
  const ns = ['a', 'b', 'c'].map(id => note({ id }));
  const h = renderIndex(ns, [{ title: 'G', ids: ['a', 'b'] }]);
  for (const id of ['a', 'b', 'c']) assert.ok(h.includes(`href="#${id}"`));
  assert.ok(h.includes('More'));
});

test('mountLearn shows the index for a malformed hash', () => {
  const mount = {};
  mountLearn({ mount, notes: [note()], groups: [], win: { location: { hash: '#%E0%A4%A' }, addEventListener() {} } });
  assert.ok(mount.innerHTML.includes('href="#a"'));
});

const demoNote = (o = {}) => note({
  demo: {
    prompt: 'Which years?',
    text: 'Sales rises sharply in 2019.',
    moves: [
      { step: 1, say: 'I underline the years.' },
      { step: 1, say: 'Now I find the rise.', mark: 'rises sharply' },
      { step: 3, say: 'I check the build.', build: 'Sales rises sharply.' },
      { step: 4, say: 'Done.' },
    ],
    answer: 'Sales rises sharply.',
  },
  practice: [
    { prompt: 'Find the rise. Use the steps.', text: 'Costs fell in 2020.', answer: 'ANSWER-ONLY', why: 'unique-why-text', options: ['TRUE', 'FALSE', 'NOT GIVEN'], evidence: 'Costs fell' },
  ],
  ...o,
});

test('renderDemo lists every move with its step label', () => {
  const d = demoNote().demo;
  const h = renderDemo(demoNote());
  assert.match(h, /Watch how it(&#39;|')s done/);
  assert.equal(h.split('Step 1').length - 1, 2);
  assert.ok(h.includes('Step 3') && h.includes('Step 4'));
  let at = 0;
  for (const m of d.moves) { const j = h.indexOf(m.say, at); assert.ok(j >= at, m.say); at = j; }
});

test('renderDemo highlights marks and shows build', () => {
  const h = renderDemo(demoNote());
  assert.ok(h.includes('<mark>rises sharply</mark>'));
  assert.ok(h.includes('So far') && h.includes('Sales rises sharply.'));
});

test('renderDemo escapes markup', () => {
  const h = renderDemo(note({ demo: { prompt: 'p', moves: [{ step: 1, say: 'Check <b>"all"</b> & "only"' }], answer: 'a' } }));
  assert.ok(h.includes('&lt;b&gt;'));
  assert.ok(!h.includes('<b>"all"'));
});

test('renderPractice hides the answer inside details', () => {
  const h = renderPractice(demoNote());
  assert.match(h, /Your turn/);
  assert.ok(h.includes('Show the answer'));
  const d = h.indexOf('<details');
  assert.ok(d > 0);
  assert.ok(h.indexOf('ANSWER-ONLY') > d);
  assert.ok(h.indexOf('unique-why-text') > d);
});

test('renderPractice shows options and marks evidence', () => {
  const h = renderPractice(demoNote());
  for (const o of ['TRUE', 'FALSE', 'NOT GIVEN']) assert.ok(h.includes(o), o);
  const d = h.indexOf('<details');
  assert.ok(h.indexOf('<mark>Costs fell</mark>') > d);
});

test('renderNote omits demo and practice when absent', () => {
  const h = renderNote(note());
  for (const s of ['Your turn', 'Watch how', 'undefined']) assert.ok(!h.includes(s), s);
});

test('renderNote orders sections', () => {
  const h = renderNote(demoNote());
  const at = ['Do it in this order', 'Watch how', 'Your turn', 'Tricks'].map(s => h.indexOf(s));
  assert.ok(at.every(i => i >= 0));
  assert.ok(at[0] < at[1] && at[1] < at[2] && at[2] < at[3]);
});
