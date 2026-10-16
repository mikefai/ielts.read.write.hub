import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNotes } from '../tools/validate-learn.mjs';

const w = n => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
const good = (id = 'tfng') => ({
  id, title: 'T', what: 'What it is.',
  steps: Array.from({ length: 5 }, () => ({ do: 'Do a thing.', why: 'Because.' })),
  tricks: ['a', 'b', 'c'], traps: ['a', 'b', 'c'], checklist: ['a?', 'b?', 'c?'],
  example: { text: 'The sky is blue today.', question: 'q', answer: 'a', evidence: 'sky is blue', walk: ['x'] },
  demo: {
    prompt: 'Is the sky blue?', text: 'The sky is blue today.',
    moves: [
      { step: 1, say: 'I read the question first.' },
      { step: 2, say: 'I underline sky and blue.', mark: 'sky is blue' },
      { step: 3, say: 'I check the line.', build: 'The sky is blue.' },
      { step: 5, say: 'I write the answer.', build: 'TRUE' },
    ],
    answer: 'TRUE',
  },
  practice: [
    { prompt: 'Use the steps.', text: 'The sky is blue today.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 'TRUE', why: 'Step 2 finds the line.', evidence: 'sky is blue' },
    { prompt: 'Use the steps again.', text: 'The sky is blue today.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 'NOT GIVEN', why: 'Step 3 finds no line about grass.' },
  ],
});
const wgood = (id = 'opinion') => {
  const n = {
    ...good(id),
    example: { prompt: 'p', weak: 'short', strong: 'a much longer stronger answer', why: w(10) },
    frames: [{ name: 'A', lines: ['1', '2', '3'] }, { name: 'B', lines: ['1', '2', '3'] }],
  };
  n.demo.moves.splice(3, 0, { step: 4, say: 'I plan the answer.' }); // writing needs a move for every step
  return n;
};
const v = (notes, req = ['tfng'], kind = 'reading') => validateNotes(notes, kind, req);
const mod = (f, id) => { const n = good(id); f(n); return n; };
const wm = f => { const n = wgood(); f(n); return n; };

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
  const n = wgood('band-criteria'); delete n.example; delete n.frames;
  assert.deepEqual(v([n], ['band-criteria'], 'writing'), []);
});

// demo rules (all notes)
test('needs a demo', () => assert.match(v([mod(n => delete n.demo)]).join('\n'), /needs a demo/));
test('demo needs 4 moves', () => assert.match(v([mod(n => n.demo.moves.pop())]).join('\n'), /demo needs 4/));
test('demo move say over 30 words', () => assert.match(v([mod(n => n.demo.moves[0].say = w(31))]).join('\n'), /demo move.*over 30 words/));
test('demo step out of range', () => assert.match(v([mod(n => n.demo.moves[1].step = 6)]).join('\n'), /demo step/));
test('demo step not integer', () => assert.match(v([mod(n => n.demo.moves[1].step = 1.5)]).join('\n'), /demo step/));
test('demo steps must not go backwards', () =>
  assert.match(v([mod(n => { n.demo.moves[1].step = 3; n.demo.moves[2].step = 2; })]).join('\n'), /demo steps must not go backwards/));
test('demo must cover 3 steps', () => assert.match(v([mod(n => n.demo.moves.forEach(m => m.step = 1))]).join('\n'), /demo must cover/));
test('demo needs prompt and answer', () => assert.match(v([mod(n => n.demo.answer = ' ')]).join('\n'), /demo needs a prompt and answer/));

// demo rules (Reading)
test('reading demo needs text', () => assert.match(v([mod(n => delete n.demo.text)]).join('\n'), /demo needs text/));
test('reading mark not in text', () => assert.match(v([mod(n => n.demo.moves[1].mark = 'nope')]).join('\n'), /mark not in text/));

// demo rules (Writing)
test('writing demo needs 2 builds', () =>
  assert.match(v([wm(n => n.demo.moves.forEach((m, i) => { if (i < 3) delete m.build; }))], ['opinion'], 'writing').join('\n'), /demo needs 2\+ builds/));
test('writing answer must equal last build', () =>
  assert.match(v([wm(n => n.demo.answer = 'FALSE')], ['opinion'], 'writing').join('\n'), /answer must equal last build/));
test('writing with a step that has no move is rejected', () => {
  const n = wgood();
  n.steps.push({ do: 'Do a thing.', why: 'Because.' }, { do: 'Do a thing.', why: 'Because.' }, { do: 'Do a thing.', why: 'Because.' });
  n.demo.moves = [
    { step: 1, say: 'I read the question first.' },
    { step: 2, say: 'I underline sky and blue.' },
    { step: 3, say: 'I check the line.', build: 'TRUE' },
    { step: 4, say: 'I plan the answer.' },
    { step: 5, say: 'I write the answer.', build: 'TRUE' },
    { step: 7, say: 'I check the answer.', build: 'TRUE' },
  ];
  assert.match(v([n], ['opinion'], 'writing').join('\n'), /step 6 has no demo move/);
});
test('reading note with a step that has no move is allowed', () => {
  // good() already leaves step 4 without a move; reading keeps its "Not needed" convention
  assert.deepEqual(v([good()]), []);
});
test('writing answer may differ from a trailing move without build', () => {
  const n = wgood();
  n.demo.moves = [
    { step: 1, say: 'I read the question first.' },
    { step: 2, say: 'I underline sky and blue.' },
    { step: 3, say: 'I check the line.', build: 'TRUE' },
    { step: 4, say: 'I plan the answer.' },
    { step: 5, say: 'I write the answer.', build: 'TRUE' },
    { step: 5, say: 'I look at it once more.' },
  ];
  assert.deepEqual(v([n], ['opinion'], 'writing'), []);
});

// practice rules (all notes)
test('practice needs 2 items', () => assert.match(v([mod(n => n.practice.pop())]).join('\n'), /needs 2 practice/));
test('practice missing', () => assert.match(v([mod(n => delete n.practice)]).join('\n'), /needs 2 practice/));
test('practice item needs prompt answer why', () => assert.match(v([mod(n => n.practice[0].why = ' ')]).join('\n'), /practice 1: needs prompt/));
test('practice why over 40 words', () => assert.match(v([mod(n => n.practice[1].why = w(41))]).join('\n'), /why over 40 words/));
test('reading practice needs text', () => assert.match(v([mod(n => delete n.practice[0].text)]).join('\n'), /practice 1: needs text/));
test('practice answer not in options', () => assert.match(v([mod(n => n.practice[0].answer = 'MAYBE')]).join('\n'), /answer not in options/));
test('practice answer in options ignores case', () => assert.deepEqual(v([mod(n => n.practice[0].answer = 'true')]), []));
test('practice evidence not in text', () => assert.match(v([mod(n => n.practice[0].evidence = 'nope')]).join('\n'), /evidence not in text/));
test('note without demo and practice reports both', () => {
  const n = good(); delete n.demo; delete n.practice;
  const out = v([n]).join('\n');
  assert.match(out, /needs a demo/);
  assert.match(out, /needs 2 practice/);
});

// malformed input must become error strings, never throw
const errsOf = f => v([mod(f)]).join('\n');
test('null demo move is reported, not thrown', () =>
  assert.match(errsOf(n => n.demo.moves[0] = null), /"tfng": demo move 1 is not an object/));
test('null practice item is reported, not thrown', () =>
  assert.match(errsOf(n => n.practice[0] = null), /"tfng" practice 1 is not an object/));
test('options must be a list', () => {
  for (const bad of ['TRUE', 5, { a: 1 }])
    assert.match(errsOf(n => n.practice[0].options = bad), /"tfng" practice 1: options must be a list/);
});
test('demo text must be text', () =>
  assert.match(errsOf(n => n.demo.text = 5), /"tfng": demo text must be text/));
test('non-string say is reported', () =>
  assert.match(errsOf(n => n.demo.moves[0].say = 5), /"tfng": demo move 1 say must be text/));
test('non-string mark is reported', () =>
  assert.match(errsOf(n => n.demo.moves[1].mark = 5), /"tfng": demo move 2 mark must be text/));
test('empty mark is rejected', () =>
  assert.match(errsOf(n => n.demo.moves[1].mark = ''), /"tfng": demo move 2 mark is empty/));
test('non-string evidence is reported', () =>
  assert.match(errsOf(n => n.practice[0].evidence = 5), /"tfng" practice 1 evidence must be text/));
test('empty evidence is rejected', () =>
  assert.match(errsOf(n => n.practice[0].evidence = ''), /"tfng" practice 1: evidence is empty/));
test('non-string build is reported', () =>
  assert.match(v([wm(n => n.demo.moves[2].build = 5)], ['opinion'], 'writing').join('\n'), /"opinion": demo move 3 build must be text/));
test('whitespace-only build does not count toward 2 builds', () =>
  assert.match(v([wm(n => n.demo.moves.forEach((m, i) => { if (i < 3) m.build = '  '; }))], ['opinion'], 'writing').join('\n'), /demo needs 2\+ builds/));
