import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOURS, emptyMarks, setHighlight, setUnderline, addNote, updateNote, removeNote, clearRange, segments, toHtml, overlapAmount } from '../assets/core/tools/annotate.js';

test('colours', () => assert.deepEqual(COLOURS, ['yellow', 'green', 'pink', 'blue']));

test('highlight overwrite, merge, immutability', () => {
  const m0 = emptyMarks();
  const m1 = setHighlight(m0, 2, 8, 'yellow');
  assert.deepEqual(m0, emptyMarks());
  const m2 = setHighlight(m1, 5, 12, 'green');
  assert.deepEqual(m2.hl, [{ s: 2, e: 5, c: 'yellow' }, { s: 5, e: 12, c: 'green' }]);
  const m3 = setHighlight(m2, 12, 15, 'green');
  assert.deepEqual(m3.hl[1], { s: 5, e: 15, c: 'green' });
  const m4 = setHighlight(m3, 0, 2, 'yellow');
  assert.deepEqual(m4.hl[0], { s: 0, e: 5, c: 'yellow' });
});
test('erase middle splits; erase all; empty range no-op', () => {
  const m = setHighlight(emptyMarks(), 0, 10, 'blue');
  assert.deepEqual(setHighlight(m, 3, 6, null).hl, [{ s: 0, e: 3, c: 'blue' }, { s: 6, e: 10, c: 'blue' }]);
  assert.deepEqual(setHighlight(m, -5, 50, null).hl, []);
  assert.deepEqual(setHighlight(m, 4, 4, 'pink'), m);
});
test('same colour re-highlight inside keeps one interval', () => {
  const m = setHighlight(setHighlight(emptyMarks(), 0, 10, 'pink'), 3, 5, 'pink');
  assert.deepEqual(m.hl, [{ s: 0, e: 10, c: 'pink' }]);
});
test('underline union and subtract', () => {
  let m = setUnderline(emptyMarks(), 0, 4, true);
  m = setUnderline(m, 4, 8, true);
  m = setUnderline(m, 6, 12, true);
  assert.deepEqual(m.ul, [{ s: 0, e: 12 }]);
  m = setUnderline(m, 3, 5, false);
  assert.deepEqual(m.ul, [{ s: 0, e: 3 }, { s: 5, e: 12 }]);
});
test('note ids, update, remove', () => {
  let r = addNote(emptyMarks(), 0, 3, 'a');
  assert.equal(r.id, 'n1');
  r = addNote(r.marks, 5, 9, 'b');
  assert.equal(r.id, 'n2');
  let m = removeNote(r.marks, 'n1');
  r = addNote(m, 1, 2, 'c');
  assert.equal(r.id, 'n3');
  m = updateNote(r.marks, 'n2', 'B!');
  assert.equal(m.notes.find(n => n.id === 'n2').t, 'B!');
  assert.equal(r.marks.notes.find(n => n.id === 'n2').t, 'b');
  assert.deepEqual(m.notes.map(n => n.s), [1, 5]);
});
test('clearRange erases hl+ul and fully-inside notes only', () => {
  let m = setHighlight(emptyMarks(), 0, 20, 'yellow');
  m = setUnderline(m, 0, 20, true);
  m = addNote(m, 4, 6, 'in').marks;
  m = addNote(m, 8, 14, 'straddle').marks;
  m = clearRange(m, 3, 10);
  assert.deepEqual(m.hl, [{ s: 0, e: 3, c: 'yellow' }, { s: 10, e: 20, c: 'yellow' }]);
  assert.deepEqual(m.ul, [{ s: 0, e: 3 }, { s: 10, e: 20 }]);
  assert.deepEqual(m.notes.map(n => n.t), ['straddle']);
});
test('segments basics', () => {
  assert.deepEqual(segments('', setHighlight(emptyMarks(), 0, 3, 'pink')), []);
  const m = addNote(setHighlight(emptyMarks(), 2, 6, 'green'), 4, 8, 'x').marks;
  const segs = segments('0123456789', m, { ev: [{ s: 0, e: 3 }], find: [{ s: 5, e: 7, cur: true }, { s: 8, e: 9 }] });
  assert.equal(segs.map(s => s.t).join(''), '0123456789');
  const at = i => segs.find(s => s.s <= i && i < s.e);
  assert.equal(at(1).ev, true);
  assert.equal(at(2).hl, 'green');
  assert.equal(at(0).hl, null);
  assert.equal(at(5).find, 'cur');
  assert.equal(at(8).find, 'hit');
  assert.equal(at(9).find, null);
  assert.equal(at(5).note, true);
  assert.equal(at(3).note, false);
  assert.equal(segs.find(s => s.e === 8).noteEnd, 'n1');
  assert.equal(segs.filter(s => s.noteEnd).length, 1);
});
test('toHtml escapes and styles', () => {
  const t = '<b>&"x"';
  assert.equal(toHtml(t, emptyMarks()), '&lt;b&gt;&amp;&quot;x&quot;');
  const h = toHtml(t, setHighlight(emptyMarks(), 0, 3, 'yellow'));
  assert.ok(h.startsWith('<span class="seg hl-yellow">&lt;b&gt;</span>'), h);
  assert.ok(!h.includes('<b>'));
  const n = addNote(emptyMarks(), 0, 2, 'q').marks;
  const hn = toHtml('abcd', n, { find: [{ s: 0, e: 1, cur: true }] });
  assert.match(hn, /class="seg find-cur note"/);
  assert.match(hn, /class="seg note nend" data-n="n1"/);
});
test('overlapAmount counts union once', () => {
  let m = setHighlight(emptyMarks(), 0, 5, 'pink');
  m = setUnderline(m, 3, 8, true);
  m = addNote(m, 7, 10, 'z').marks;
  assert.equal(overlapAmount(m, 0, 20), 10);
  assert.equal(overlapAmount(m, 4, 9), 5);
  assert.equal(overlapAmount(m, 10, 20), 0);
});

// property-style: random operations, invariants
function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
function check(m, len) {
  for (const [k, list] of [['hl', m.hl], ['ul', m.ul]]) {
    list.forEach((x, i) => {
      assert.ok(x.s < x.e, k + ' s<e');
      assert.ok(x.s >= 0 && x.e <= len, k + ' in range');
      if (i) {
        const p = list[i - 1];
        assert.ok(p.e <= x.s, k + ' sorted non-overlapping');
        if (p.e === x.s) assert.ok(k === 'hl' && p.c !== x.c, k + ' adjacent merged');
      }
    });
  }
  const ids = m.notes.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
  m.notes.forEach(n => assert.ok(n.s < n.e && n.s >= 0 && n.e <= len));
}
test('property: random ops keep invariants; segments concat to text and match brute force', () => {
  const alphabet = '<&>"ab';
  for (let seed = 1; seed <= 60; seed++) {
    const r = rng(seed), len = 1 + Math.floor(r() * 40);
    const text = Array.from({ length: len }, (_, i) => alphabet[i % 6]).join('');
    let m = emptyMarks();
    const hlRef = Array(len).fill(null), ulRef = Array(len).fill(false);
    for (let step = 0; step < 40; step++) {
      let s = Math.floor(r() * len), e = Math.floor(r() * (len + 1));
      if (s > e) [s, e] = [e, s];
      const op = Math.floor(r() * 5);
      if (op === 0) { const c = r() < 0.2 ? null : COLOURS[Math.floor(r() * 4)]; m = setHighlight(m, s, e, c); for (let i = s; i < e; i++) hlRef[i] = c; }
      else if (op === 1) { const on = r() < 0.6; m = setUnderline(m, s, e, on); for (let i = s; i < e; i++) ulRef[i] = on; }
      else if (op === 2 && s < e) m = addNote(m, s, e, 't').marks;
      else if (op === 3 && m.notes.length) m = removeNote(m, m.notes[0].id);
      else if (op === 4) { m = clearRange(m, s, e); for (let i = s; i < e; i++) { hlRef[i] = null; ulRef[i] = false; } }
      check(m, len);
    }
    const f = []; for (let i = 0; i < len; i += 3) f.push({ s: i, e: Math.min(len, i + 2) });
    const segs = segments(text, m, { ev: [{ s: 1, e: len }], find: f });
    assert.equal(segs.map(x => x.t).join(''), text);
    let pos = 0;
    for (const sg of segs) {
      assert.equal(sg.s, pos); pos = sg.e;
      assert.ok(sg.e > sg.s);
      for (let i = sg.s; i < sg.e; i++) { assert.equal(sg.hl, hlRef[i]); assert.equal(sg.ul, ulRef[i]); }
    }
    assert.equal(pos, len);
    assert.equal(toHtml(text, m).replace(/<\/?span[^>]*>/g, '').includes('<'), false);
    assert.equal(segments(text, emptyMarks()).map(x => x.t).join(''), text);
  }
});
