import test from 'node:test';
import assert from 'node:assert/strict';
import { clampScale, resolveTheme } from '../assets/core/display.js';

test('clampScale clamps to 0.9..1.5 in 0.1 steps and tolerates junk', () => {
  assert.equal(clampScale(0.5), 0.9);
  assert.equal(clampScale(2), 1.5);
  assert.equal(clampScale(1.04), 1);
  assert.equal(clampScale(0.7 + 0.2), 0.9);
  assert.equal(clampScale('1.3'), 1.3);
  assert.equal(clampScale('abc'), 1);
  assert.equal(clampScale(undefined), 1);
});

test('resolveTheme honours explicit choices and resolves auto from the system', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
  assert.equal(resolveTheme('nonsense', true), 'dark');
  assert.equal(resolveTheme(undefined, false), 'light');
});
