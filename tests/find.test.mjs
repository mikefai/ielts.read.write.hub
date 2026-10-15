import test from 'node:test';
import assert from 'node:assert/strict';
import { findMatches } from '../assets/core/tools/find.js';

test('case-insensitive literal, ascending', () => {
  assert.deepEqual(findMatches('The cat. THE end', 'the'), [{ s: 0, e: 3 }, { s: 9, e: 12 }]);
});
test('non-overlapping', () => assert.deepEqual(findMatches('aaaa', 'aa'), [{ s: 0, e: 2 }, { s: 2, e: 4 }]));
test('short, blank and trimmed queries', () => {
  assert.deepEqual(findMatches('abc', 'a'), []);
  assert.deepEqual(findMatches('abc', '  '), []);
  assert.deepEqual(findMatches('abc', ''), []);
  assert.deepEqual(findMatches('a bc', ' bc '), [{ s: 2, e: 4 }]);
});
test('regex characters are literal', () => assert.deepEqual(findMatches('a.b axb', 'a.b'), [{ s: 0, e: 3 }]));
