import test from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../skills/writing/checks.js';

const ok = (r, id) => r.checks.find(c => c.id === id).ok;
const w = n => Array(n).fill('word').join(' ') + '.';

test('counts words, sentences, paragraphs and targets', () => {
  const r = analyse(['One two three. Four five!', 'Six seven?'], 1);
  assert.deepEqual([r.words, r.sentences, r.paragraphs, r.target], [7, 3, 2, 150]);
  assert.equal(r.avgSentence, 2.3);
  assert.equal(analyse([], 2).target, 250);
});
test('task 1 checks true and false', () => {
  const good = analyse(['Intro.', 'Overall, sales rose.', 'It went from 10 to 20 and 30 then 40.', w(150)], 1);
  for (const id of ['paragraphs', 'overview', 'data', 'words']) assert.equal(ok(good, id), true, id);
  const bad = analyse(['Short text 1.', 'More.'], 1);
  for (const id of ['paragraphs', 'overview', 'data', 'words']) assert.equal(ok(bad, id), false, id);
});
test('task 2 checks true and false', () => {
  const good = analyse(['In my opinion this is true.', 'b', 'c', 'In conclusion, yes.', w(250)], 2);
  for (const id of ['paragraphs', 'position', 'conclusion', 'words']) assert.equal(ok(good, id), true, id);
  const bad = analyse(['Some text.', 'More.'], 2);
  for (const id of ['paragraphs', 'position', 'conclusion', 'words']) assert.equal(ok(bad, id), false, id);
});
test('warns on repeats, long sentences and contractions', () => {
  const r = analyse(['Education matters. '.repeat(5) + 'It doesn\'t help and we\'re sure. ' + Array(45).fill('x').join(' ') + '.'], 2);
  const types = r.warnings.map(x => x.type);
  assert.ok(r.warnings.find(x => x.type === 'repeat' && x.detail === 'education ×5'));
  assert.ok(types.includes('long'));
  assert.deepEqual(r.warnings.filter(x => x.type === 'contraction').map(x => x.detail), ["n't", "'re"]);
});
test('no warnings for clean text; stopwords are ignored', () => {
  assert.deepEqual(analyse(['There there there there there. Short one.'], 2).warnings, []);
});
