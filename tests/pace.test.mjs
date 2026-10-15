import test from 'node:test';
import assert from 'node:assert/strict';
import { passagePace, phaseAt } from '../assets/core/tools/pace.js';

test('passagePace boundaries', () => {
  assert.equal(passagePace(0).state, 'ok');
  assert.equal(passagePace(1199).state, 'ok');
  assert.equal(passagePace(1200).state, 'warn');
  assert.equal(passagePace(1500).state, 'warn');
  assert.equal(passagePace(1501).state, 'over');
  assert.equal(passagePace(65).label, '01:05');
  assert.equal(passagePace(1501).label, '25:01');
  assert.equal(passagePace(700, 10).state, 'warn');
  assert.ok(passagePace(0).message.length > 0);
});
test('phaseAt cumulative and overrun', () => {
  const t = [{ minutes: 2, what: 'Plan' }, { minutes: 3, what: 'Write' }];
  assert.deepEqual(phaseAt(t, 0), { index: 0, what: 'Plan', remainingSec: 120, overrun: false });
  assert.deepEqual(phaseAt(t, 119), { index: 0, what: 'Plan', remainingSec: 1, overrun: false });
  assert.deepEqual(phaseAt(t, 120), { index: 1, what: 'Write', remainingSec: 180, overrun: false });
  assert.deepEqual(phaseAt(t, 299), { index: 1, what: 'Write', remainingSec: 1, overrun: false });
  assert.deepEqual(phaseAt(t, 300), { index: 1, what: 'Write', remainingSec: 0, overrun: true });
  assert.deepEqual(phaseAt(t, 9999), { index: 1, what: 'Write', remainingSec: 0, overrun: true });
});
