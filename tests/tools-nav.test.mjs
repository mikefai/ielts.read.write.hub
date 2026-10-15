import test from 'node:test';
import assert from 'node:assert/strict';
import { addSeconds, stateLabel } from '../skills/reading/engine/tools-nav.js';
import { passagePace } from '../assets/core/tools/pace.js';

test('addSeconds adds only to the active passage and does not mutate', () => {
  const s = [0, 0, 0], n = addSeconds(s, 1, 1.5);
  assert.deepEqual(n, [0, 1.5, 0]); assert.deepEqual(s, [0, 0, 0]);
  assert.deepEqual(addSeconds(n, 1, 2), [0, 3.5, 0]);
});
test('addSeconds ignores bad index and non-positive dt', () => {
  assert.deepEqual(addSeconds([1, 2], -1, 5), [1, 2]);
  assert.deepEqual(addSeconds([1, 2], 2, 5), [1, 2]);
  assert.deepEqual(addSeconds([1, 2], 0, 0), [1, 2]);
  assert.deepEqual(addSeconds([1, 2], 0, -3), [1, 2]);
});
test('stubbed clock reaches warn at 20:00 and over past 25:00', () => {
  let s = [0, 0];
  for (let i = 0; i < 1199; i++) s = addSeconds(s, 0, 1);
  assert.equal(passagePace(s[0]).state, 'ok');
  s = addSeconds(s, 0, 1); assert.equal(passagePace(s[0]).state, 'warn');
  s = addSeconds(s, 0, 300); assert.equal(passagePace(s[0]).state, 'warn');
  s = addSeconds(s, 0, 1); assert.equal(passagePace(s[0]).state, 'over');
  assert.equal(passagePace(s[1]).state, 'ok');
});
test('stateLabel wording', () => {
  assert.equal(stateLabel(7, true, true), 'Question 7, answered, flagged');
  assert.equal(stateLabel(8, false, false), 'Question 8, unanswered');
});
