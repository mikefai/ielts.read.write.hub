import test from 'node:test';
import assert from 'node:assert/strict';
import { renderChart } from '../skills/writing/chart.js';

const count = (html, re) => (html.match(re) ?? []).length;
const pie = { kind: 'pie', title: 'Energy sources', unit: '%', pies: [
  { label: '1990', slices: [{ name: 'Coal', value: 50 }, { name: 'Gas', value: 30 }, { name: 'Wind', value: 20 }] },
  { label: '2020', slices: [{ name: 'Coal', value: 20 }, { name: 'Gas', value: 40 }, { name: 'Wind', value: 40 }] }] };
const bars = (extra) => ({ kind: 'bar', title: 'Sales', unit: '$m', labels: ['A', 'B', 'C'], series: [{ name: '2010', values: [1, 2, 3] }, { name: '2020', values: [2, 3, 4] }], ...extra });

test('pie: one slice per value, one legend entry per distinct name, a label per pie', () => {
  const h = renderChart(pie);
  assert.equal(count(h, /class="slice"/g), 6);
  assert.equal(count(h, /class="lg"/g), 3);
  assert.ok(h.includes('1990') && h.includes('2020'));
});
test('pie: slice labels show the values', () => assert.ok(renderChart(pie).includes('50%')));
test('table: header and body cells match the data', () => {
  const h = renderChart({ kind: 'table', title: 'Costs', unit: '$', columns: ['2000', '2010'], rows: [{ label: 'Food', values: [5, 6] }, { label: 'Rent', values: [7, 9] }] });
  assert.equal(count(h, /<th[\s>]/g), 3 + 2); // 1 corner + 2 column heads + 2 row heads (not <thead>)
  assert.equal(count(h, /<td/g), 4);
});
test('bar: one rect per value, grouped or stacked, vertical or horizontal', () => {
  for (const extra of [{}, { stacked: true }, { orientation: 'horizontal' }, { orientation: 'horizontal', stacked: true }])
    assert.equal(count(renderChart(bars(extra)), /class="bar"/g), 6, JSON.stringify(extra));
});
test('stacked bar axis reaches the largest total, not the largest value', () => {
  const h = renderChart(bars({ stacked: true, labels: ['A'], series: [{ name: 'x', values: [60] }, { name: 'y', values: [60] }] }));
  const ticks = [...h.matchAll(/class="tick"[^>]*>([\d.]+)</g)].map(m => +m[1]);
  assert.ok(Math.max(...ticks) >= 120, `top tick ${Math.max(...ticks)} should reach the stacked total of 120`);
});
test('line renders one polyline per series', () => {
  assert.equal(count(renderChart({ kind: 'line', title: 'T', unit: 'm', labels: ['1', '2'], series: [{ name: 'a', values: [1, 2] }, { name: 'b', values: [2, 1] }] }), /<polyline/g), 2);
});
test('process: linear has n-1 arrows, cycle has n', () => {
  const stages = ['one', 'two', 'three', 'four', 'five'];
  assert.equal(count(renderChart({ kind: 'process', title: 'P', stages }), /class="node"/g), 5);
  assert.equal(count(renderChart({ kind: 'process', title: 'P', stages }), /class="arrow"/g), 4);
  assert.equal(count(renderChart({ kind: 'process', layout: 'cycle', title: 'P', stages }), /class="arrow"/g), 5);
});
test('process: stage icons render when named', () => {
  assert.ok(renderChart({ kind: 'process', title: 'P', stages: [{ text: 'a', icon: 'drop' }, 'b', 'c', 'd'] }).includes('class="icon"'));
});
test('map: one panel per period, every feature drawn, with a compass', () => {
  const h = renderChart({ kind: 'map', title: 'Village', panels: [
    { label: '1990', features: [{ type: 'river', points: [[0, 10], [100, 30]] }, { type: 'building', x: 10, y: 10, w: 20, h: 10, label: 'School' }] },
    { label: '2020', features: [{ type: 'river', points: [[0, 10], [100, 30]] }, { type: 'houses', x: 10, y: 10, w: 30, h: 20 }, { type: 'carpark', x: 50, y: 40, w: 20, h: 10 }] }] });
  assert.equal(count(h, /class="mapp"/g), 2);
  assert.equal(count(h, /class="feat"/g), 5);
  assert.ok(h.includes('>N<'));
});
test('mixed: renders every sub-chart in order', () => {
  const h = renderChart({ kind: 'mixed', charts: [bars({ title: 'First chart' }), { kind: 'table', title: 'Second table', columns: ['a'], rows: [{ label: 'r', values: [1] }] }] });
  assert.ok(h.indexOf('First chart') > -1 && h.indexOf('Second table') > h.indexOf('First chart'));
});
test('unknown kind throws', () => assert.throws(() => renderChart({ kind: 'radar', title: 'x' }), /unknown chart kind/));
test('titles are escaped', () => assert.ok(!renderChart(bars({ title: '<script>x</script>' })).includes('<script>')));
test('source line renders when given', () => assert.ok(renderChart(bars({ source: 'National Statistics Office' })).includes('Source: National Statistics Office')));
