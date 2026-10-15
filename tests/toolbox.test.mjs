import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateParaphrase, validatePhrasebank } from '../tools/validate-toolbox.mjs';

const read = f => JSON.parse(readFileSync(new URL('../content/writing/' + f, import.meta.url), 'utf8'));
const sec = n => Array.from({ length: n }, (_, i) => ({ title: 't' + i, items: ['a','b','c','d','e','f'] }));

test('shipped content is valid', () => {
  assert.deepEqual(validateParaphrase(read('paraphrase.json')), []);
  assert.deepEqual(validatePhrasebank(read('phrasebank.json')), []);
});
test('paraphrase rules are enforced', () => {
  const errs = validateParaphrase({ Show: ['show', 'a'], rise: 'x' });
  assert.ok(errs.length >= 4);
});
test('phrasebank rules are enforced', () => {
  assert.deepEqual(validatePhrasebank({ task1: sec(6), task2: sec(7) }), []);
  assert.ok(validatePhrasebank({ task1: sec(5), task2: sec(7) }).length);
  assert.ok(validatePhrasebank({ task1: sec(6), task2: [...sec(6), { title: 'x', items: ['a'] }] }).length);
});
