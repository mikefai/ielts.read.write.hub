import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAnswer, listAnswers, removeAnswer, answerText, answerFileName, allAnswersText } from '../assets/core/answers.js';

const reading = { skill: 'reading', kind: 'exercise', title: 'True / False / Not Given', setId: 't1-tfng', at: Date.UTC(2026, 9, 17, 9, 30), seconds: 125, score: 1, total: 2,
  items: [{ n: 1, prompt: 'Bees fly.', answer: 'TRUE', correct: 'TRUE', ok: true }, { n: 2, prompt: 'Bees swim.', answer: '', correct: 'FALSE', ok: false }] };

test.beforeEach(() => { delete globalThis.localStorage; for (const r of listAnswers()) removeAnswer(r.id); });

test('saveAnswer stores a record and listAnswers returns newest first', () => {
  saveAnswer({ ...reading, at: 1000 });
  saveAnswer({ ...reading, setId: 'other', at: 2000 });
  assert.deepEqual(listAnswers().map(r => r.at), [2000, 1000]);
});

test('saving the same id twice replaces instead of duplicating', () => {
  const a = saveAnswer(reading);
  saveAnswer({ ...reading, id: a.id, score: 2 });
  assert.equal(listAnswers().length, 1);
  assert.equal(listAnswers()[0].score, 2);
});

test('removeAnswer deletes one record', () => {
  const a = saveAnswer(reading), b = saveAnswer({ ...reading, setId: 'x', at: 5 });
  removeAnswer(a.id);
  assert.deepEqual(listAnswers().map(r => r.id), [b.id]);
});

test('only the newest 200 records are kept', () => {
  for (let i = 0; i < 205; i++) saveAnswer({ ...reading, setId: 's' + i, at: i + 1 });
  assert.equal(listAnswers().length, 200);
  assert.equal(listAnswers()[0].at, 205);
});

test('corrupt stored data gives an empty list', () => {
  globalThis.localStorage = { getItem: () => '{not json', setItem() {} };
  assert.deepEqual(listAnswers(), []);
});

test('reading text lists each question with your answer, the correct one and the result', () => {
  const t = answerText(reading);
  assert.match(t, /Score: 1\/2/);
  assert.match(t, /Time taken: 2:05/);
  assert.match(t, /1\. Bees fly\.\n {3}Your answer: TRUE\n {3}Correct answer: TRUE \(correct\)/);
  assert.match(t, /Your answer: \(blank\)\n {3}Correct answer: FALSE \(incorrect\)/);
});

test('writing text includes the task, word count and every paragraph', () => {
  const t = answerText({ skill: 'writing', kind: 'task', title: 'Bar chart', setId: 'w1-bar', at: 1, prompt: 'Summarise the chart.', words: 12, paragraphs: ['First para.', 'Second para.'] });
  assert.match(t, /Task:\nSummarise the chart\./);
  assert.match(t, /Your answer \(12 words\):\n\nFirst para\.\n\nSecond para\./);
  assert.ok(!t.includes('Score:'));
});

test('speaking text includes notes and ticked self-assessment items', () => {
  const t = answerText({ skill: 'speaking', kind: 'mock', title: 'Mock 1', setId: 's1', at: 1, notes: 'a holiday in Spain', ticks: ['I linked my ideas clearly'] });
  assert.match(t, /My notes:\na holiday in Spain/);
  assert.match(t, /- I linked my ideas clearly/);
});

test('file name is lower-case, safe and dated', () => {
  assert.equal(answerFileName(reading), 'reading-t1-tfng-2026-10-17.txt');
  assert.equal(answerFileName({ skill: 'Writing', setId: 'W1 / Bar?', at: Date.UTC(2026, 0, 2) }), 'writing-w1-bar-2026-01-02.txt');
});

test('answers with markup characters stay plain text', () => {
  const t = answerText({ ...reading, items: [{ n: 1, prompt: '<b>x</b> & "y"', answer: '<i>', correct: 'a', ok: false }] });
  assert.ok(t.includes('<b>x</b> & "y"') && t.includes('<i>'));
});

test('allAnswersText joins records with a separator', () => {
  const t = allAnswersText([reading, { ...reading, title: 'Second' }]);
  assert.ok(t.includes('True / False / Not Given') && t.includes('Second') && t.includes('===='));
});
