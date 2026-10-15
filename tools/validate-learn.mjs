import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPES } from '../skills/reading/engine/types.js';

const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const WRITING_EXEMPT = ['band-criteria', 'timing-and-planning', 'grammar-fixes'];

export function validateNotes(notes, kind, requiredIds) {
  const errs = [], seen = new Set();
  for (const id of requiredIds) if (!notes.some(n => n.id === id)) errs.push(`${kind}: missing note "${id}"`);
  for (const n of notes) {
    const at = `${kind} "${n.id}"`;
    if (seen.has(n.id)) errs.push(`${at}: duplicate id`);
    seen.add(n.id);
    if (!requiredIds.includes(n.id)) errs.push(`${at}: unknown note id`);
    if (!n.title || !n.what) errs.push(`${at}: needs title and what`);
    const steps = n.steps ?? [];
    if (steps.length < 5) errs.push(`${at}: steps needs 5+ (has ${steps.length})`);
    steps.forEach((s, i) => {
      if (words(s.do) > 25) errs.push(`${at} step ${i + 1}: do is over 25 words`);
      if (!words(s.do)) errs.push(`${at} step ${i + 1}: empty do`);
      if (!words(s.why)) errs.push(`${at} step ${i + 1}: empty why`);
    });
    for (const k of ['tricks', 'traps', 'checklist'])
      if ((n[k]?.length ?? 0) < 3) errs.push(`${at}: ${k} needs 3+ (has ${n[k]?.length ?? 0})`);
    const ex = n.example;
    if (kind === 'reading') {
      if (n.id !== 'start-here' && !(ex?.evidence && ex?.text?.includes(ex.evidence))) errs.push(`${at}: example evidence not in text`);
    } else if (!WRITING_EXEMPT.includes(n.id)) {
      if (!ex || !(words(ex.strong) > words(ex.weak))) errs.push(`${at}: example strong must be longer than weak`);
      if (words(ex?.why) < 10) errs.push(`${at}: example why needs 10+ words`);
      const fr = n.frames ?? [];
      if (fr.length < 2 || fr.some(f => (f.lines?.length ?? 0) < 3)) errs.push(`${at}: frames needs 2+ frames of 3+ lines`);
    }
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
  const load = p => { try { return JSON.parse(readFileSync(join(root, p), 'utf8')); } catch (e) { return e; } };
  const guides = load('writing/guides.json');
  const req = {
    reading: ['start-here', ...TYPES.map(t => t.id)],
    writing: [...Object.keys(guides instanceof Error ? {} : guides), ...WRITING_EXEMPT],
  };
  const errs = [];
  if (guides instanceof Error) errs.push(`guides.json: ${guides.message}`);
  for (const kind of ['reading', 'writing']) {
    const notes = load(`learn/${kind}.json`);
    const ok = Array.isArray(notes);
    if (!ok) errs.push(`${kind}: cannot read content/learn/${kind}.json (${notes.message ?? 'not an array'})`);
    errs.push(...validateNotes(ok ? notes : [], kind, req[kind]));
  }
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
