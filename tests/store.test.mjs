import test from 'node:test';
import assert from 'node:assert/strict';
import { getProgress, recordAttempt, getMistakes, recordMistakes } from '../assets/core/store.js';

test('recordAttempt then getProgress returns attempt with timestamp', () => {
  recordAttempt({ type: 'tfng', setId: 's1', score: 3, total: 5, seconds: 100 });
  const a = getProgress().attempts.at(-1);
  assert.equal(a.type, 'tfng');
  assert.equal(a.score, 3);
  assert.ok(typeof a.at === 'number');
});

test('works when localStorage throws', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  recordAttempt({ type: 'mcq', setId: 's2', score: 1, total: 2, seconds: 5 });
  assert.ok(getProgress().attempts.some(a => a.setId === 's2'));
});

test('recordMistakes adds wrong items, clears them when answered correctly', () => {
  recordMistakes({ type: 'tfng', setId: 't1-tfng', marks: [[0, true], [3, false], [1, false]] });
  assert.deepEqual(getMistakes()['tfng:t1-tfng'], [1, 3]);
  recordMistakes({ type: 'tfng', setId: 't1-tfng', marks: [[3, true]] }); // redo of a subset keeps the others
  assert.deepEqual(getMistakes()['tfng:t1-tfng'], [1]);
  recordMistakes({ type: 'tfng', setId: 't1-tfng', marks: [[1, true]] });
  assert.equal('tfng:t1-tfng' in getMistakes(), false);
});
