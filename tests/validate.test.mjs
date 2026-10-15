import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, validatePassage } from '../tools/validate-content.mjs';

const passage = { id: 'p1', paragraphs: [{ label: 'A', text: 'Bees pollinate many crops worldwide and sustain farming in several regions.' }] };
const HOW = 'Underline the key nouns in the statement, then scan the paragraph for a synonym of each before reading closely around it.';
const AGAIN = 'If this went wrong, reread the sentence before and after your evidence and test whether a qualifier changes the meaning.';
const item = i => ({ id: `q${i}`, prompt: 'x', answer: 'TRUE', how: HOW, again: AGAIN, evidence: { paragraph: 'A', quote: 'Bees pollinate many crops' }, step: 4 });
const items = n => Array.from({ length: n }, (_, i) => item(i + 1));
const good = { id: 's1', type: 'tfng', passageId: 'p1', items: items(5) };

test('valid set has no errors', () => assert.deepEqual(validate(passage, good), []));
test('quote missing from paragraph is reported with item id', () => {
  const bad = structuredClone(good); bad.items[0].evidence.quote = 'not in text';
  assert.match(validate(passage, bad).join('|'), /q1/);
});
test('unknown type is reported', () => assert.ok(validate(passage, { ...good, type: 'nope' }).length > 0));
test('step outside 1-5 is reported', () => {
  const bad = structuredClone(good); bad.items[0].step = 9;
  assert.ok(validate(passage, bad).length > 0);
});
test('mcq answer must be among options', () => {
  const s = { id: 's2', type: 'mcq', passageId: 'p1', items: items(4).map(i => ({ ...i, answer: 'C', options: ['A', 'B'] })) };
  assert.ok(validate(passage, s).length > 0);
});
test('set with fewer than 4 or more than 7 items is reported', () => {
  assert.match(validate(passage, { ...good, items: items(3) }).join('|'), /items/);
  assert.match(validate(passage, { ...good, items: items(8) }).join('|'), /items/);
});
test('statement copying 6+ consecutive passage words is reported (too easy)', () => {
  const bad = structuredClone(good); bad.items[0].prompt = 'Bees pollinate many crops worldwide and sustain farming';
  assert.match(validate(passage, bad).join('|'), /q1.*wording/);
});
test('paraphrased statement is accepted', () => {
  const ok = structuredClone(good); ok.items[0].prompt = 'Insects help growers produce food across numerous areas.';
  assert.deepEqual(validate(passage, ok), []);
});
test('missing or thin how/again guidance is reported', () => {
  const bad = structuredClone(good); delete bad.items[0].how; bad.items[1].again = 'Too short.';
  const e = validate(passage, bad).join('|');
  assert.match(e, /q1.*how/); assert.match(e, /q2.*again/);
});
test('how guidance that gives away a gap answer is reported', () => {
  const bad = { ...good, type: 'sentence-completion', items: items(4).map((i, n) => ({ ...i, answer: 'solar power', how: n ? HOW : HOW + ' The answer is solar power.' })) };
  assert.match(validate(passage, bad).join('|'), /q1.*gives away/);
});
test('how guidance that hints the verdict is reported', () => {
  const bad = structuredClone(good);
  bad.items[0].how = 'The statement reverses which material is limited, so look for the word unlike and compare the two carefully.';
  assert.match(validate(passage, bad).join('|'), /q1.*hints/);
});
const words = n => Array(n).fill('word').join(' ');
const para = (label, n) => ({ label, text: words(n) });
test('passage of 850 words in 7 paragraphs passes', () =>
  assert.deepEqual(validatePassage({ id: 'p', paragraphs: 'ABCDEFG'.split('').map(l => para(l, 122)) }), []));
test('passage under 700 words is reported', () =>
  assert.match(validatePassage({ id: 'p', paragraphs: 'ABCDEF'.split('').map(l => para(l, 100)) }).join('|'), /words/));
test('passage with 5 paragraphs is reported', () =>
  assert.match(validatePassage({ id: 'p', paragraphs: 'ABCDE'.split('').map(l => para(l, 170)) }).join('|'), /paragraphs/));

import { validateTest } from '../tools/validate-content.mjs';
const STRUCT = [[['notes-completion', 7], ['tfng', 6]], [['matching-information', 4], ['summary-completion', 4], ['matching-features', 5]], [['mcq', 4], ['summary-wordbank', 6], ['ynng', 4]]];
const mkSet = (type, n) => ({
  type, wordLimit: ['notes-completion', 'summary-completion'].includes(type) ? 1 : undefined,
  items: Array.from({ length: n }, (_, i) => ({ id: 'q' + i, answer: 'a' + i, ...(type === 'summary-wordbank' ? { options: Array.from({ length: 9 }, (_, k) => 'a' + k) } : {}) })),
});
function mkTest() {
  const sets = {};
  const passages = STRUCT.map((gs, pi) => ({ passageId: 'p' + pi, groups: gs.map(([t, n]) => { const id = `${t}-${pi}`; sets[id] = mkSet(t, n); return { type: t, setId: id }; }) }));
  return { test: { id: 't1', minutes: 60, passages }, sets };
}
test('full test with the Cambridge structure passes', () => { const { test: t, sets } = mkTest(); assert.deepEqual(validateTest(t, sets), []); });
test('wrong item count in a group is reported', () => { const { test: t, sets } = mkTest(); sets['tfng-0'].items.pop(); assert.match(validateTest(t, sets).join('|'), /needs 6 items/); });
test('wrong group order is reported', () => { const { test: t, sets } = mkTest(); t.passages[1].groups.reverse(); assert.match(validateTest(t, sets).join('|'), /order/); });
test('missing set is reported', () => { const { test: t, sets } = mkTest(); delete sets['mcq-2']; assert.match(validateTest(t, sets).join('|'), /missing set/); });
test('completion groups need wordLimit 1-3', () => { const { test: t, sets } = mkTest(); sets['notes-completion-0'].wordLimit = 4; assert.match(validateTest(t, sets).join('|'), /wordLimit/); });
test('word list needs 9 distinct-use words', () => { const { test: t, sets } = mkTest(); sets['summary-wordbank-2'].items.forEach(i => i.options.pop()); assert.match(validateTest(t, sets).join('|'), /9 words/); });
test('passage of 800 words is now too short', () =>
  assert.match(validatePassage({ id: 'p', paragraphs: 'ABCDEFG'.split('').map(l => ({ label: l, text: Array(114).fill('w').join(' ') })) }).join('|'), /words/));
