import test from 'node:test';
import assert from 'node:assert/strict';
import { trimRange, underlined, cleanMarks, verdictText, reviewPassageHtml, evidenceVerdict } from '../skills/reading/engine/tools-annotate.js';

test('trimRange drops edge whitespace, null when empty', () => {
  assert.deepEqual(trimRange(' ab c ', 0, 6), { s: 1, e: 5 });
  assert.equal(trimRange('a  b', 1, 3), null);
});
test('underlined needs one covering interval', () => {
  const m = { hl: [], ul: [{ s: 2, e: 8 }], notes: [] };
  assert.ok(underlined(m, 3, 6)); assert.ok(!underlined(m, 1, 6));
});
test('cleanMarks discards junk from storage', () => {
  assert.deepEqual(cleanMarks({ hl: [{ s: 3, e: 1, c: 'pink' }, { s: 0, e: 2, c: 'red' }, { s: 0, e: 2, c: 'blue' }], ul: 'x', notes: [{ id: 'n1', s: 0, e: 1, t: 'hi' }, null] }),
    { hl: [{ s: 0, e: 2, c: 'blue' }], ul: [], notes: [{ id: 'n1', s: 0, e: 1, t: 'hi' }] });
  assert.deepEqual(cleanMarks(null), { hl: [], ul: [], notes: [] });
});
test('verdict wording and review html', () => {
  assert.equal(verdictText('partly'), 'You partly marked the evidence');
  const ps = { paragraphs: [{ label: 'A', text: 'One <two> three.' }] };
  const ev = { paragraph: 'A', quote: 'two' };
  assert.equal(evidenceVerdict(ps, {}, ev), 'Your marks missed the evidence');
  assert.equal(evidenceVerdict(ps, { A: { hl: [{ s: 5, e: 10, c: 'pink' }], ul: [], notes: [] } }, ev), 'You marked the evidence');
  assert.match(reviewPassageHtml(ps, {}, ev), /&lt;<span class="seg ev">two<\/span>|<span class="seg ev">&lt;two&gt;|ev">/);
});
