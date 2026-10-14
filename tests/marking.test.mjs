import test from 'node:test';
import assert from 'node:assert/strict';
import { markItem } from '../skills/reading/engine/marking.js';

const gap = { answer: 'solar power', accept: ['solar energy'] };
test('normalises case, spaces and trailing punctuation', () => assert.equal(markItem(gap, '  Solar  Power. '), true));
test('accepts listed variants', () => assert.equal(markItem(gap, 'solar energy'), true));
test('rejects over the word limit even if it contains the answer', () => assert.equal(markItem(gap, 'the solar power', 2), false));
test('blank is wrong', () => assert.equal(markItem(gap, ''), false));
test('TFNG compares case-insensitively', () => assert.equal(markItem({ answer: 'NOT GIVEN' }, 'not given'), true));
test('wrong answer is wrong', () => assert.equal(markItem(gap, 'wind power'), false));
