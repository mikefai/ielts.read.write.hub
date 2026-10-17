import test from 'node:test';
import assert from 'node:assert/strict';
import { rubric } from '../skills/reading/engine/runner.js';

test('TFNG rubric names the passage number', () => {
  assert.ok(rubric('Do the following statements agree with the information given in the passage? Write TRUE…', 1).includes('given in Reading Passage 1?'));
});
test('YNNG rubric names the passage number', () => {
  assert.ok(rubric('…the views of the writer in the passage? Write YES…', 3).includes('writer in Reading Passage 3?'));
});
test('instructions without the passage phrase are unchanged', () => {
  assert.equal(rubric('Choose ONE WORD ONLY from the passage for each answer.', 2), 'Choose ONE WORD ONLY from the passage for each answer.');
});
