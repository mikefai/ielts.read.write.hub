import test from 'node:test';
import assert from 'node:assert/strict';
import { bandFor } from '../skills/reading/engine/band.js';

test('maps raw scores to approximate Academic bands at the boundaries', () => {
  for (const [raw, band] of [[40, 9], [39, 9], [38, 8.5], [37, 8.5], [36, 8], [35, 8], [34, 7.5], [33, 7.5], [32, 7], [30, 7], [29, 6.5], [27, 6.5], [26, 6], [23, 6], [22, 5.5], [19, 5.5], [18, 5], [15, 5], [14, 4.5], [13, 4.5], [12, 4], [10, 4], [9, 'below 4'], [0, 'below 4']])
    assert.equal(bandFor(raw), band, `raw ${raw}`);
});
