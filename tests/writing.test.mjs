import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWriting } from '../tools/validate-writing.mjs';

const roles = { topic: {}, thesis: {}, example: {} };
const words = n => Array(n).fill('word').join(' ');
const t2 = { id: 'a', task: 2, prompt: 'p', model: { paragraphs: [{ name: 'Intro', sentences: [{ role: 'thesis', text: words(130) }] }, { name: 'Body', sentences: [{ role: 'example', text: words(130) }] }] } };

test('valid task 2 passes', () => assert.deepEqual(validateWriting(t2, roles), []));
test('unknown role reported', () => {
  const b = structuredClone(t2); b.model.paragraphs[0].sentences[0].role = 'nope';
  assert.match(validateWriting(b, roles).join('|'), /nope/);
});
test('model answer under minimum words reported', () => {
  const b = structuredClone(t2); b.model.paragraphs[1].sentences[0].text = 'short';
  assert.match(validateWriting(b, roles).join('|'), /words/);
});
test('chart series length must match labels', () => {
  const t1 = { id: 'c', task: 1, prompt: 'p', chart: { kind: 'bar', labels: ['a', 'b'], series: [{ name: 's', values: [1] }] }, model: { paragraphs: [{ name: 'x', sentences: [{ role: 'topic', text: words(160) }] }, { name: 'y', sentences: [{ role: 'topic', text: 'z' }] }] } };
  assert.match(validateWriting(t1, roles).join('|'), /series/);
});

import { validateGuides } from '../tools/validate-writing.mjs';
const why = 'This sentence states the position clearly so the examiner sees a direct answer to the question.';
const guideKit = { opinion: { title: 'T', summary: 's', steps: ['a', 'b', 'c'], structure: [{ paragraph: 'p', purpose: 'x', sentences: ['y'] }, { paragraph: 'q', purpose: 'x', sentences: ['y'] }, { paragraph: 'r', purpose: 'x', sentences: ['y'] }], timing: [{ minutes: 5, what: 'a' }, { minutes: 30, what: 'b' }, { minutes: 5, what: 'c' }], pitfalls: ['a', 'b', 'c'], language: [{ use: 'u', phrases: ['p'] }, { use: 'v', phrases: ['p'] }], band8: ['a', 'b', 'c'] } };
const rich = () => { const t = structuredClone(t2); t.guide = 'opinion'; t.analysis = ['a', 'b', 'c']; t.plan = [{ paragraph: 'Body 1', idea: 'x' }, { paragraph: 'Body 2', idea: 'y' }]; t.model.paragraphs.forEach(p => p.sentences.forEach(s => s.why = why)); return t; };

test('task with guide, analysis, plan and why passes', () => assert.deepEqual(validateWriting(rich(), roles, guideKit), []));
test('unknown guide key is reported', () => { const t = rich(); t.guide = 'nope'; assert.match(validateWriting(t, roles, guideKit).join('|'), /guide/); });
test('thin analysis is reported', () => { const t = rich(); t.analysis = ['a']; assert.match(validateWriting(t, roles, guideKit).join('|'), /analysis/); });
test('thin plan is reported', () => { const t = rich(); t.plan = []; assert.match(validateWriting(t, roles, guideKit).join('|'), /plan/); });
test('sentence without a why is reported', () => { const t = rich(); delete t.model.paragraphs[0].sentences[0].why; assert.match(validateWriting(t, roles, guideKit).join('|'), /why/); });
test('valid guides pass', () => assert.deepEqual(validateGuides(guideKit), []));
test('guide missing pitfalls is reported', () => { const g = structuredClone(guideKit); g.opinion.pitfalls = ['a']; assert.match(validateGuides(g).join('|'), /pitfalls/); });
test('guide with one language group is reported', () => { const g = structuredClone(guideKit); g.opinion.language.pop(); assert.match(validateGuides(g).join('|'), /language/); });

import { validateChart } from '../tools/validate-writing.mjs';
const okPie = () => ({ kind: 'pie', title: 't', unit: '%', pies: [{ label: '1990', slices: [{ name: 'a', value: 60 }, { name: 'b', value: 40 }] }, { label: '2020', slices: [{ name: 'a', value: 30 }, { name: 'b', value: 70 }] }] });
const okMap = () => ({ kind: 'map', title: 't', panels: [{ label: '1990', features: [{ type: 'river', points: [[0, 5], [100, 20]] }, { type: 'building', x: 10, y: 10, w: 20, h: 10, label: 'School' }] }, { label: '2020', features: [{ type: 'houses', x: 10, y: 10, w: 30, h: 20 }] }] });
test('valid pie, table, map and mixed charts pass', () => {
  assert.deepEqual(validateChart(okPie(), 'x'), []);
  assert.deepEqual(validateChart(okMap(), 'x'), []);
  assert.deepEqual(validateChart({ kind: 'table', title: 't', columns: ['a', 'b'], rows: [{ label: 'r', values: [1, 2] }] }, 'x'), []);
  assert.deepEqual(validateChart({ kind: 'mixed', charts: [okPie(), okMap()] }, 'x'), []);
});
test('pie slices must sum to 100 when the unit is %', () => { const c = okPie(); c.pies[0].slices[0].value = 70; assert.match(validateChart(c, 'x').join('|'), /sum/); });
test('table rows must match the column count', () => assert.match(validateChart({ kind: 'table', title: 't', columns: ['a', 'b'], rows: [{ label: 'r', values: [1] }] }, 'x').join('|'), /row/));
test('map needs two panels', () => { const c = okMap(); c.panels.pop(); assert.match(validateChart(c, 'x').join('|'), /panels/); });
test('map features must stay inside the 100 x 70 canvas', () => { const c = okMap(); c.panels[0].features[1].x = 90; assert.match(validateChart(c, 'x').join('|'), /bounds/); });
test('map point outside the canvas is reported', () => { const c = okMap(); c.panels[0].features[0].points[1] = [120, 20]; assert.match(validateChart(c, 'x').join('|'), /bounds/); });
test('map unknown feature type is reported', () => { const c = okMap(); c.panels[0].features[1].type = 'dragon'; assert.match(validateChart(c, 'x').join('|'), /feature/); });
test('mixed needs two or more charts, each valid', () => {
  assert.match(validateChart({ kind: 'mixed', charts: [okPie()] }, 'x').join('|'), /mixed/);
  const bad = okPie(); bad.pies[0].slices[0].value = 99;
  assert.match(validateChart({ kind: 'mixed', charts: [okPie(), bad] }, 'x').join('|'), /sum/);
});
test('stacked bar series length must match labels', () => assert.match(validateChart({ kind: 'bar', stacked: true, title: 't', labels: ['a', 'b'], series: [{ name: 's', values: [1] }] }, 'x').join('|'), /series/));
test('unknown chart kind is reported', () => assert.match(validateChart({ kind: 'radar', title: 't' }, 'x').join('|'), /kind/));

test('map houses or trees block too small to draw is reported', () => {
  const c = okMap(); c.panels[0].features.push({ type: 'houses', x: 5, y: 30, w: 40, h: 4 });
  assert.match(validateChart(c, 'x').join('|'), /too small/);
});
test('map building too small for its label is reported', () => {
  const c = okMap(); c.panels[0].features[1].w = 10;
  assert.match(validateChart(c, 'x').join('|'), /too small/);
});
