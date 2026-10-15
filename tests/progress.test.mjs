import test from 'node:test';
import assert from 'node:assert/strict';
import { byType, nextPractice } from '../assets/core/progress.js';

const A = (type, score, total) => ({ type, setId: 'x', score, total });

test('byType aggregates, labels and sorts weakest first', () => {
  const rows = byType([A('tfng', 5, 10), A('tfng', 7, 10), A('full-test', 30, 40), A('writing-task1', 1, 4), A('writing-task2', 2, 4), A('speaking-mock', 7, 10)]);
  assert.deepEqual(rows.map(r => r.type), ['writing-task1', 'writing-task2', 'tfng', 'speaking-mock', 'full-test']);
  const t = rows.find(r => r.type === 'tfng');
  assert.deepEqual(t, { type: 'tfng', label: 'True / False / Not Given', score: 12, total: 20, pct: 60, sets: 2 });
  assert.equal(rows.find(r => r.type === 'full-test').label, 'Full test');
  assert.equal(rows[0].label, 'Writing Task 1');
  assert.equal(rows.find(r => r.type === 'speaking-mock').label, 'Speaking mock');
});

test('byType handles empty and zero totals', () => {
  assert.deepEqual(byType([]), []);
  assert.equal(byType([A('tfng', 0, 0)])[0].pct, 0);
});

test('nextPractice picks weakest and builds href', () => {
  assert.equal(nextPractice([]), null);
  assert.deepEqual(nextPractice(byType([A('tfng', 1, 10), A('mcq', 9, 10)])), { type: 'tfng', href: 'skills/reading/types/tfng/' });
  assert.equal(nextPractice(byType([A('full-test', 1, 10)])).href, 'skills/reading/test/?id=m1');
  assert.equal(nextPractice(byType([A('writing-task2', 1, 10)])).href, 'skills/writing/');
  assert.equal(nextPractice(byType([A('speaking-mock', 1, 10)])).href, 'skills/speaking/');
});
