import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, validateTest, STRUCTURE } from '../tools/validate-content.mjs';

const HOW = 'Underline the key nouns in the statement, then scan the paragraph for a synonym of each before reading closely around it.';
const AGAIN = 'If this went wrong, reread the sentence before and after your evidence and test whether a qualifier changes the meaning.';
const item = (i, extra = {}) => ({ id: `q${i}`, prompt: 'x', answer: 'TRUE', how: HOW, again: AGAIN, evidence: { paragraph: 'A', quote: 'q' }, step: 4, ...extra });
const mkSet = (type, n, extra = {}) => ({ id: `${type}-s`, type, items: Array.from({ length: n }, (_, i) => item(i + 1)), ...extra });
const LIMITED = ['notes-completion', 'summary-completion', 'sentence-completion', 'short-answer'];

// Builds a test + sets + passages that follow STRUCTURE[id]; words = total words split over 3 passages.
function fixture(id, words = 2400) {
  const sets = {}, passages = {};
  const test = { id, minutes: 60, passages: STRUCTURE[id].map((groups, pi) => {
    const pid = `${id}-p${pi + 1}`;
    passages[pid] = { id: pid, paragraphs: [{ label: 'A', text: Array(Math.round(words / 3)).fill('w').join(' ') }] };
    return { passageId: pid, groups: groups.map(([type, n]) => {
      const setId = `${id}-${type}-${pi}`;
      sets[setId] = { ...mkSet(type, n), id: setId, ...(LIMITED.includes(type) ? { wordLimit: 1 } : {}) };
      return { type, setId };
    }) };
  }) };
  return { test, sets, passages };
}

test('unknown test id has no structure', () =>
  assert.match(validateTest({ id: 'zz', minutes: 60, passages: [] }, {}).join('|'), /no structure/));
test('valid m1 fixture passes', () => {
  const f = fixture('m1');
  assert.deepEqual(validateTest(f.test, f.sets, f.passages), []);
});
test('mock must total 40 questions', () => {
  const f = fixture('m1'); f.sets['m1-tfng-0'].items.pop();
  assert.match(validateTest(f.test, f.sets, f.passages).join('|'), /40/);
});
test('mock word total outside 2150-2750 is rejected; t1 is grandfathered', () => {
  const f = fixture('m1', 2900);
  assert.match(validateTest(f.test, f.sets, f.passages).join('|'), /2150-2750/);
  const t = fixture('t1', 2842);
  assert.doesNotMatch(validateTest(t.test, t.sets, t.passages).join('|'), /2150-2750/);
});
test('completion answer must be inside its evidence quote', () => {
  const passage = { id: 'p', paragraphs: [{ label: 'A', text: 'The boats left the quay at dawn.' }] };
  const mk = answer => ({ id: 's', type: 'summary-completion', items: [4, 5, 6, 7].map(i => item(i, { answer, evidence: { paragraph: 'A', quote: 'boats left the quay' } })) });
  assert.match(validate(passage, mk('harbour')).join('|'), /answer not in evidence quote/);
  assert.deepEqual(validate(passage, mk('Quay')), []);
});
test('matching headings: answers unique and options >= items + 2', () => {
  const passage = { id: 'p', paragraphs: [{ label: 'A', text: 'q' }] };
  const opts = n => Array.from({ length: n }, (_, i) => `H${i}`);
  const mk = (n, ans) => ({ id: 's', type: 'matching-headings', items: Array.from({ length: 6 }, (_, i) => item(i + 1, { answer: ans(i), options: opts(n) })) });
  assert.match(validate(passage, mk(9, () => 'H0')).join('|'), /heading used twice/);
  assert.match(validate(passage, mk(7, i => `H${i}`)).join('|'), /needs at least 8 headings/);
  assert.deepEqual(validate(passage, mk(8, i => `H${i}`)), []);
});
test('completion sets need wordLimit 1-3', () => {
  const g = fixture('m1'); delete g.sets['m1-summary-completion-0'].wordLimit;
  assert.match(validateTest(g.test, g.sets, g.passages).join('|'), /wordLimit/);
});
test('mock must include tfng, matching-headings and summary-completion', () => {
  const f = fixture('m2'); // m2 has no summary-completion? it does; drop tfng by retyping
  f.test.passages[1].groups[0].type = 'ynng'; f.sets['m2-tfng-1'].type = 'ynng';
  assert.match(validateTest(f.test, f.sets, f.passages).join('|'), /must include/);
});
