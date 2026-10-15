import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPref, savePref } from '../assets/core/prefs.js';

test('memory fallback when localStorage is undefined', () => {
  delete globalThis.localStorage;
  assert.equal(loadPref('a', 'fb'), 'fb');
  savePref('a', { x: 1 });
  assert.deepEqual(loadPref('a', null), { x: 1 });
});

test('persists to localStorage under one key and survives corrupt data', () => {
  const data = {};
  globalThis.localStorage = { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  savePref('theme', 'dark');
  savePref('n', 3);
  assert.equal(JSON.parse(data['ielts-hub-prefs-v1']).theme, 'dark');
  assert.equal(JSON.parse(data['ielts-hub-prefs-v1']).n, 3);
  assert.equal(loadPref('theme', 'x'), 'dark');
  data['ielts-hub-prefs-v1'] = '{not json';
  assert.equal(loadPref('zzz', 'fb'), 'fb');
  assert.doesNotThrow(() => savePref('k', 1));
  delete globalThis.localStorage;
});

test('never throws when storage throws', () => {
  const boom = () => { throw new Error('blocked'); };
  globalThis.localStorage = { getItem: boom, setItem: boom };
  assert.doesNotThrow(() => savePref('q', 1));
  assert.equal(loadPref('q', 0), 1);
  delete globalThis.localStorage;
});
