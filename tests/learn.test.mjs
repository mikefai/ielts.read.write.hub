import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNote, renderIndex } from '../assets/core/learn.js';

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
