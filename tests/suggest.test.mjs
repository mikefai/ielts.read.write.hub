import test from 'node:test';
import assert from 'node:assert/strict';
import { suggest } from '../skills/writing/suggest.js';

const dict = { show: ['illustrate', 'depict', 'present'], 'a number of': ['several', 'many', 'various'], number: ['quantity', 'figure', 'amount'], increase: ['rise', 'grow', 'climb'] };

test('stem tolerance on the last word', () => {
  assert.deepEqual(suggest('The chart shows data', dict).map(x => x.key), ['show']);
  assert.deepEqual(suggest('It increased and is increasing', dict).map(x => x.key), ['increase']);
});
test('longest phrase first and not double-counted', () => {
  assert.deepEqual(suggest('A Number of people', dict).map(x => x.key), ['a number of']);
});
test('whole word only; no match gives []', () => {
  assert.deepEqual(suggest('The showroom is open', dict), []);
  assert.deepEqual(suggest('', dict), []);
});
test('returns options', () => assert.deepEqual(suggest('show', dict)[0].options, dict.show));
