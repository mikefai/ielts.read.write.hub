import test from 'node:test';
import assert from 'node:assert/strict';
import { mockNext } from '../skills/writing/mock.js';
import { validateMocks } from '../tools/validate-writing.mjs';

const mocks = [{ id: 'm1', title: 'Mock 1', task1: 'w1-m1', task2: 'w2-m1' }];
const bar = { kind: 'bar' };
const mixed = n => ({ kind: 'mixed', charts: Array.from({ length: n }, () => ({ kind: 'bar' })) });
const tasks = (chart) => ({ 'w1-m1': { chart }, 'w2-m1': {} });

test('mockNext chains task1 to task2 keeping the mock id', () =>
  assert.deepEqual(mockNext(mocks, 'm1', 'w1-m1'), { label: 'Next: Task 2', href: '?id=w2-m1&mock=m1' }));
test('mockNext after task2 returns to the mock list', () =>
  assert.deepEqual(mockNext(mocks, 'm1', 'w2-m1'), { label: 'Back to mock exams', href: '../#mocks' }));
test('mockNext returns null for unknown mock', () => assert.equal(mockNext(mocks, 'zz', 'w1-m1'), null));
test('validateMocks accepts a mixed chart with 2-3 visuals', () => {
  assert.deepEqual(validateMocks(mocks, tasks(mixed(2))), []);
  assert.deepEqual(validateMocks(mocks, tasks(mixed(3))), []);
});
test('validateMocks flags a Task 1 that is not a mixed chart', () =>
  assert.ok(validateMocks(mocks, tasks(bar)).some(e => e.includes('mixed'))));
test('validateMocks flags a mixed chart with fewer than 2 or more than 3 visuals', () => {
  for (const n of [1, 4]) assert.ok(validateMocks(mocks, tasks(mixed(n))).some(e => e.includes('2-3')));
});
test('validateMocks flags a missing task id', () =>
  assert.ok(validateMocks(mocks, { 'w2-m1': {} }).some(e => e.includes('w1-m1'))));
