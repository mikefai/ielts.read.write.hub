import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_WORDS = { 1: 150, 2: 250 };

const wc = s => (s ?? '').trim().split(/\s+/).filter(Boolean).length;

// guides.json: one teaching guide per task type, referenced by task.guide
export function validateGuides(guides) {
  const errs = [];
  for (const [k, g] of Object.entries(guides)) {
    for (const f of ['title', 'summary']) if (!g[f]) errs.push(`guide ${k}: missing ${f}`);
    for (const [f, n] of [['steps', 3], ['structure', 3], ['timing', 3], ['pitfalls', 3], ['language', 2], ['band8', 3]])
      if ((g[f]?.length ?? 0) < n) errs.push(`guide ${k}: ${f} needs ${n}+ entries`);
  }
  return errs;
}

export function validateWriting(task, roles, guides) {
  const errs = [], id = task.id;
  if (guides) {
    if (!guides[task.guide]) errs.push(`${id}: unknown guide "${task.guide}"`);
    if ((task.analysis?.length ?? 0) < 3) errs.push(`${id}: analysis needs 3+ points`);
    if ((task.plan?.length ?? 0) < 2) errs.push(`${id}: plan needs 2+ entries`);
  }
  if (!task.prompt) errs.push(`${id}: missing prompt`);
  const paras = task.model?.paragraphs ?? [];
  if (paras.length < 2) errs.push(`${id}: model needs at least 2 paragraphs`);
  let words = 0;
  for (const p of paras) for (const s of p.sentences) {
    if (!roles[s.role]) errs.push(`${id}: unknown role "${s.role}"`);
    if (guides && wc(s.why) < 10) errs.push(`${id}: sentence "${s.text.slice(0, 30)}" needs a why (10+ words)`);
    words += s.text.trim().split(/\s+/).length;
  }
  if (words < MIN_WORDS[task.task]) errs.push(`${id}: model has ${words} words, needs ${MIN_WORDS[task.task]}`);
  if (task.task === 1) {
    if (!task.chart) errs.push(`${id}: task 1 needs a chart`);
    else errs.push(...validateChart(task.chart, id));
  }
  return errs;
}

// tasks: id -> task object. Each mock = a mixed Task 1 (2-3 visuals) + a Task 2.
export function validateMocks(mocks, tasks) {
  const errs = [];
  for (const m of mocks) for (const k of ['task1', 'task2']) {
    const t = tasks[m[k]];
    if (!t) { errs.push(`mock ${m.id}: missing ${k} "${m[k]}"`); continue; }
    if (k === 'task1') {
      if (t.chart?.kind !== 'mixed') errs.push(`mock ${m.id}: Task 1 must be a mixed chart`);
      else if (t.chart.charts.length < 2 || t.chart.charts.length > 3) errs.push(`mock ${m.id}: Task 1 needs 2-3 visuals`);
    }
  }
  return errs;
}

export const MAP_FEATURES = ['river', 'road', 'railway', 'lake', 'sea', 'beach', 'field', 'trees', 'building', 'houses', 'carpark', 'pier', 'bridge', 'label'];
const CHART_KINDS = ['bar', 'line', 'pie', 'table', 'process', 'map', 'mixed'];

// maps are drawn on a 100 x 70 canvas; everything must stay inside it
export function validateChart(c, id) {
  if (!CHART_KINDS.includes(c.kind)) return [`${id}: unknown chart kind "${c.kind}"`];
  const errs = [];
  if (c.kind === 'mixed') {
    if ((c.charts?.length ?? 0) < 2) errs.push(`${id}: mixed needs 2+ charts`);
    for (const s of c.charts ?? []) errs.push(...validateChart(s, id));
  } else if (c.kind === 'process') {
    if ((c.stages?.length ?? 0) < 4) errs.push(`${id}: process needs 4+ stages`);
  } else if (c.kind === 'pie') {
    if (!c.pies?.length) errs.push(`${id}: pie needs pies`);
    for (const p of c.pies ?? []) {
      const sum = p.slices.reduce((s, x) => s + x.value, 0);
      if (c.unit === '%' && Math.abs(sum - 100) > 1) errs.push(`${id}: pie "${p.label}" slices sum to ${sum}, needs 100`);
    }
  } else if (c.kind === 'table') {
    for (const r of c.rows ?? []) if (r.values.length !== c.columns.length) errs.push(`${id}: table row "${r.label}" has ${r.values.length} values for ${c.columns.length} columns`);
  } else if (c.kind === 'map') {
    if ((c.panels?.length ?? 0) < 2) errs.push(`${id}: map needs 2+ panels`);
    for (const p of c.panels ?? []) for (const f of p.features) {
      if (!MAP_FEATURES.includes(f.type)) { errs.push(`${id}: unknown map feature "${f.type}"`); continue; }
      const pointOut = (f.points ?? []).some(([x, y]) => x < 0 || x > 100 || y < 0 || y > 70);
      const boxOut = f.x !== undefined && (f.x < 0 || f.y < 0 || f.x + (f.w ?? 0) > 100 || f.y + (f.h ?? 0) > 70);
      if (pointOut || boxOut) errs.push(`${id}: map feature "${f.type}" out of bounds (canvas 100 x 70)`);
      // blocks smaller than this draw no houses/trees, or clip their label
      if (['houses', 'trees'].includes(f.type) && (f.w < 10 || f.h < 8)) errs.push(`${id}: map ${f.type} block too small to draw (min 10 x 8)`);
      if (f.type === 'building' && f.label && (f.w < 16 || f.h < 9)) errs.push(`${id}: map building "${f.label}" too small for its label (min 16 x 9)`);
    }
  } else {
    for (const s of c.series ?? []) if (s.values.length !== c.labels.length) errs.push(`${id}: series "${s.name}" length differs from labels`);
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'writing');
  const roles = JSON.parse(readFileSync(join(root, 'roles.json'), 'utf8'));
  const guidesFile = join(root, 'guides.json');
  const guides = existsSync(guidesFile) ? JSON.parse(readFileSync(guidesFile, 'utf8')) : undefined;
  const errs = guides ? validateGuides(guides) : [];
  const tasks = {};
  for (const dir of ['task1', 'task2']) for (const f of readdirSync(join(root, dir)).filter(f => f.endsWith('.json'))) {
    const t = JSON.parse(readFileSync(join(root, dir, f), 'utf8'));
    tasks[t.id] = t;
    errs.push(...validateWriting(t, roles, guides));
  }
  errs.push(...validateMocks(JSON.parse(readFileSync(join(root, 'mocks.json'), 'utf8')), tasks));
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
