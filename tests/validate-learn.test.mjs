import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNotes } from '../tools/validate-learn.mjs';

const w = n => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
const good = (id = 'tfng') => ({
  id, title: 'T', what: 'What it is.',
  steps: Array.from({ length: 5 }, () => ({ do: 'Do a thing.', why: 'Because.' })),
  tricks: ['a', 'b', 'c'], traps: ['a', 'b', 'c'], checklist: ['a?', 'b?', 'c?'],
  example: { text: 'The sky is blue today.', question: 'q', answer: 'a', evidence: 'sky is blue', walk: ['x'] },
});
const wgood = (id = 'opinion') => ({
  ...good(id),
  example: { prompt: 'p', weak: 'short', strong: 'a much longer stronger answer', why: w(10) },
  frames: [{ name: 'A', lines: ['1', '2', '3'] }, { name: 'B', lines: ['1', '2', '3'] }],
});
const v = (notes, req = ['tfng'], kind = 'reading') => validateNotes(notes, kind, req);
const mod = (f, id) => { const n = good(id); f(n); return n; };

test('valid note', () => assert.deepEqual(v([good()]), []));
test('missing id', () => assert.match(v([good('mcq')]).join('\n'), /missing note.*tfng/));
test('unknown id', () => assert.match(v([good(), good('zzz')]).join('\n'), /unknown note/));
test('duplicate id', () => assert.match(v([good(), good()]).join('\n'), /duplicate/));
test('steps count', () => assert.match(v([mod(n => n.steps.pop())]).join('\n'), /steps needs 5/));
for (const k of ['tricks', 'traps', 'checklist'])
  test(k + ' count', () => assert.match(v([mod(n => n[k].pop())]).join('\n'), new RegExp(k + ' needs 3')));
test('do too long', () => assert.match(v([mod(n => n.steps[0].do = w(26))]).join('\n'), /over 25 words/));
test('empty why', () => assert.ok(v([mod(n => n.steps[0].why = ' ')]).length));
test('evidence not in text', () => assert.match(v([mod(n => n.example.evidence = 'nope')]).join('\n'), /evidence not in text/));
test('start-here exempt from evidence', () =>
  assert.deepEqual(v([mod(n => n.example.evidence = 'nope', 'start-here')], ['start-here']), []));
test('writing valid', () => assert.deepEqual(v([wgood()], ['opinion'], 'writing'), []));
test('writing strong not longer', () =>
  assert.ok(v([{ ...wgood(), example: { ...wgood().example, strong: 'x' } }], ['opinion'], 'writing').length));
test('writing short why', () =>
  assert.ok(v([{ ...wgood(), example: { ...wgood().example, why: 'too short' } }], ['opinion'], 'writing').length));
test('writing frames required', () => {
  for (const id of ['opinion', 'task1-chart']) {
    const n = wgood(id); delete n.frames;
    assert.match(v([n], [id], 'writing').join('\n'), /frames/);
  }
  const n = wgood(); n.frames[0].lines.pop();
  assert.match(v([n], ['opinion'], 'writing').join('\n'), /frames/);
});
test('writing exempt notes need no frames/example', () => {
  const n = good('band-criteria'); delete n.example;
  assert.deepEqual(v([n], ['band-criteria'], 'writing'), []);
});
