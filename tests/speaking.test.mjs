import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMinutes, buildSteps } from '../skills/speaking/plan.js';
import { validateSpeaking, validateBank } from '../tools/validate-speaking.mjs';

const W = (n, w = 'word') => Array(Math.max(0, n)).fill(w).join(' ');
// model = 'alpha beta gamma ' + filler, vocab words alpha/beta/gamma are used by it
const q = (n) => ({ q: 'Question?', model: 'alpha one beta two gamma three ' + W(n - 6), vocab: ['alpha one', 'beta two', 'gamma three'].map(word => ({ word, band: 7, meaning: 'm', example: 'this is a long example sentence' })), phrases: ['p1', 'p2'] });
const okMock = (p1 = [3, 3, 3], p3 = 5) => ({
  id: 's0', title: 't',
  part1: { topics: p1.map((n, i) => ({ name: 'T' + i, questions: Array.from({ length: n }, () => q(40)) })) },
  part2: { cue: { topic: 'Describe a thing', bullets: ['a', 'b', 'c', 'and explain why'], prepSeconds: 60, talkSeconds: 120 }, model: q(250).model, vocab: q(5).vocab, phrases: ['a', 'b'], structure: ['1', '2', '3', '4'], roundingOff: q(40) },
  part3: { theme: 'x', questions: Array.from({ length: p3 }, () => q(80)) },
});
const errs = m => validateSpeaking(m).join('|');
const mut = (f, m = okMock()) => { f(m); return m; };

test('estimateMinutes: 12 + 6 is 14, 9 + 5 is under 12', () => {
  assert.equal(estimateMinutes(okMock([4, 4, 4], 6)), 14);
  assert.ok(estimateMinutes(okMock()) < 12);
});
test('buildSteps order', () => {
  const s = buildSteps(okMock());
  assert.deepEqual(s.map(x => x.part + x.kind[0]).join(' '), '1q '.repeat(9) + '2c 2p 2t 2q ' + '3q '.repeat(5).trim());
});
test('buildSteps total = q1 + q3 + 4', () => assert.equal(buildSteps(okMock([4, 3, 3], 6)).length, 10 + 6 + 4));
test('accepts okMock', () => assert.deepEqual(validateSpeaking(okMock()), []));
test('rejects 2 topics', () => assert.match(errs(mut(m => m.part1.topics.pop())), /3 topics/));
test('rejects 3 bullets', () => assert.match(errs(mut(m => m.part2.cue.bullets.pop())), /4 bullets/));
test('rejects prepSeconds 30', () => assert.match(errs(mut(m => m.part2.cue.prepSeconds = 30)), /prepSeconds/));
test('rejects 7 part 3 questions', () => assert.match(errs(okMock([3, 3, 3], 7)), /Part 3/));
test('rejects short estimate', () => assert.match(errs(okMock([3, 3, 3], 3)), /minutes/));
test('rejects 2 vocab', () => assert.match(errs(mut(m => m.part1.topics[0].questions[0].vocab.pop())), /vocab/));
test('rejects model using none of its vocab', () => assert.match(errs(mut(m => m.part1.topics[0].questions[0].model = W(40))), /uses/));
test('rejects 120-word part 2 model', () => assert.match(errs(mut(m => m.part2.model = q(120).model)), /words/));
test('validateBank rejects 5 sections', () => {
  const sec = { title: 't', use: 'u', items: Array.from({ length: 6 }, () => ({ phrase: 'p', example: 'e' })) };
  assert.match(validateBank({ sections: Array(5).fill(sec) }).join('|'), /6 sections/);
  assert.deepEqual(validateBank({ sections: Array(6).fill(sec) }), []);
});

test('rejects a basic vocab word', () => assert.match(errs(mut(m => m.part1.topics[0].questions[0].vocab[2].word = 'definitely')), /too basic/));
test('rejects fewer than 2 multi-word vocab', () => assert.match(errs(mut(m => { const v = m.part1.topics[0].questions[0].vocab; v[0].word = 'alphaone'; v[1].word = 'betatwo'; })), /multi-word/));
