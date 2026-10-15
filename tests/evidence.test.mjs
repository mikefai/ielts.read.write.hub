import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceRange, coverage } from '../assets/core/tools/evidence.js';
import { emptyMarks, setHighlight } from '../assets/core/tools/annotate.js';

test('evidenceRange exact or null', () => {
  assert.deepEqual(evidenceRange('hello big world', 'big'), { s: 6, e: 9 });
  assert.equal(evidenceRange('hello', 'Hello'), null);
  assert.equal(evidenceRange('hello', 'zzz'), null);
  assert.equal(evidenceRange('hello', ''), null);
});
test('coverage verdict thresholds', () => {
  const r = { s: 0, e: 10 };
  const m = (a, b) => setHighlight(emptyMarks(), a, b, 'yellow');
  assert.deepEqual(coverage(m(0, 5), r), { covered: 5, total: 10, ratio: 0.5, verdict: 'marked' });
  assert.equal(coverage(m(0, 4), r).verdict, 'partly');
  assert.equal(coverage(m(20, 30), r).verdict, 'missed');
  assert.equal(coverage(m(0, 10), r).verdict, 'marked');
  assert.equal(coverage(emptyMarks(), null).verdict, 'missed');
});
