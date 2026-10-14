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
  const c = task.chart;
  if (task.task === 1) {
    if (!c) errs.push(`${id}: task 1 needs a chart`);
    else if (c.kind === 'process') { if ((c.stages?.length ?? 0) < 4) errs.push(`${id}: process needs 4+ stages`); }
    else for (const s of c.series ?? []) if (s.values.length !== c.labels.length) errs.push(`${id}: series "${s.name}" length differs from labels`);
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'writing');
  const roles = JSON.parse(readFileSync(join(root, 'roles.json'), 'utf8'));
  const guidesFile = join(root, 'guides.json');
  const guides = existsSync(guidesFile) ? JSON.parse(readFileSync(guidesFile, 'utf8')) : undefined;
  const errs = guides ? validateGuides(guides) : [];
  for (const dir of ['task1', 'task2']) for (const f of readdirSync(join(root, dir)).filter(f => f.endsWith('.json')))
    errs.push(...validateWriting(JSON.parse(readFileSync(join(root, dir, f), 'utf8')), roles, guides));
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
