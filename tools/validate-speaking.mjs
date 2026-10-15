import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimateMinutes } from '../skills/speaking/plan.js';

const wc = s => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';

function validateQ(q, where, [lo, hi], errs) {
  if (!nonEmpty(q.q)) errs.push(`${where}: missing question`);
  const n = wc(q.model);
  if (n < lo || n > hi) errs.push(`${where}: model has ${n} words, needs ${lo}-${hi}`);
  const vocab = q.vocab ?? [];
  if (vocab.length < 3) errs.push(`${where}: needs 3+ vocab`);
  for (const v of vocab) {
    if (![7, 8, 9].includes(v.band) || !nonEmpty(v.word) || !nonEmpty(v.meaning) || wc(v.example) < 6) errs.push(`${where}: bad vocab "${v.word}" (band 7-9, word, meaning, example 6+ words)`);
  }
  if ((q.phrases?.length ?? 0) < 2) errs.push(`${where}: needs 2+ phrases`);
  const m = (q.model ?? '').toLowerCase();
  const used = vocab.filter(v => nonEmpty(v.word) && m.includes(v.word.toLowerCase().slice(0, Math.max(4, v.word.length - 3)))).length;
  if (used < 2) errs.push(`${where}: model uses only ${used} of its own vocab words, needs 2+`);
}

export function validateSpeaking(mock) {
  const errs = [], id = mock.id, { part1, part2, part3 } = mock;
  if (part1?.topics?.length !== 3) errs.push(`${id}: Part 1 needs 3 topics`);
  (part1?.topics ?? []).forEach((t, i) => {
    const n = t.questions?.length ?? 0;
    if (n < 3 || n > 4) errs.push(`${id}: Part 1 topic "${t.name}" needs 3-4 questions`);
    (t.questions ?? []).forEach((q, j) => validateQ(q, `${id} P1.${i + 1}.${j + 1}`, [30, 60], errs));
  });
  const c = part2?.cue ?? {};
  if (!/^Describe/.test(c.topic ?? '')) errs.push(`${id}: cue topic must start "Describe"`);
  if (c.bullets?.length !== 4) errs.push(`${id}: cue card needs exactly 4 bullets`);
  else if (!/^and (explain|say)/i.test(c.bullets[3])) errs.push(`${id}: last bullet must start "and explain" or "and say"`);
  if (c.prepSeconds !== 60) errs.push(`${id}: prepSeconds must be 60`);
  if (c.talkSeconds !== 120) errs.push(`${id}: talkSeconds must be 120`);
  validateQ({ q: c.topic, model: part2?.model, vocab: part2?.vocab, phrases: part2?.phrases }, `${id} P2`, [200, 300], errs);
  if ((part2?.structure?.length ?? 0) < 4) errs.push(`${id}: Part 2 structure needs 4+ entries`);
  validateQ(part2?.roundingOff ?? {}, `${id} P2 rounding off`, [30, 60], errs);
  const n3 = part3?.questions?.length ?? 0;
  if (n3 < 5 || n3 > 6) errs.push(`${id}: Part 3 needs 5-6 questions`);
  (part3?.questions ?? []).forEach((q, i) => validateQ(q, `${id} P3.${i + 1}`, [60, 110], errs));
  if (part1?.topics && part3?.questions) { const min = estimateMinutes(mock); if (min < 11 || min > 14) errs.push(`${id}: estimated ${min.toFixed(1)} minutes, needs 11-14`); }
  return errs;
}

export function validateBank(bank) {
  const errs = [], s = bank.sections ?? [];
  if (s.length < 6) errs.push(`bank: needs 6 sections, has ${s.length}`);
  for (const x of s) {
    if (!nonEmpty(x.title) || !nonEmpty(x.use)) errs.push(`bank: section missing title/use`);
    if ((x.items?.length ?? 0) < 6) errs.push(`bank: "${x.title}" needs 6+ items`);
    for (const i of x.items ?? []) if (!nonEmpty(i.phrase) || !nonEmpty(i.example)) errs.push(`bank: "${x.title}" has an empty phrase/example`);
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'speaking');
  const read = f => JSON.parse(readFileSync(join(root, f), 'utf8'));
  const errs = [];
  for (const { id } of read('mocks.json')) errs.push(...(existsSync(join(root, id + '.json')) ? validateSpeaking(read(id + '.json')) : [`${id}: missing ${id}.json`]));
  if (existsSync(join(root, 'language-bank.json'))) errs.push(...validateBank(read('language-bank.json')));
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
