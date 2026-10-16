import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPES } from '../skills/reading/engine/types.js';

const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const WRITING_EXEMPT = ['band-criteria', 'timing-and-planning', 'grammar-fixes'];

function checkDemoPractice(n, at, kind, stepCount, errs) {
  const isObj = x => x !== null && typeof x === 'object';
  const d = n.demo;
  if (!d) errs.push(`${at}: needs a demo`);
  else {
    const moves = Array.isArray(d.moves) ? d.moves : [];
    if (moves.length < 4) errs.push(`${at}: demo needs 4+ moves (has ${moves.length})`);
    if (d.text !== undefined && typeof d.text !== 'string') errs.push(`${at}: demo text must be text`);
    const text = typeof d.text === 'string' ? d.text : '';
    const hasBuild = m => isObj(m) && typeof m.build === 'string' && m.build.trim() !== '';
    let prev = 0;
    moves.forEach((m, i) => {
      if (!isObj(m)) { errs.push(`${at}: demo move ${i + 1} is not an object`); return; }
      if (m.say !== undefined && typeof m.say !== 'string') errs.push(`${at}: demo move ${i + 1} say must be text`);
      else if (words(m.say) > 30) errs.push(`${at}: demo move ${i + 1} say is over 30 words`);
      if (!Number.isInteger(m.step) || m.step < 1 || m.step > stepCount) errs.push(`${at}: demo step ${i + 1} must be 1..${stepCount}`);
      else {
        if (m.step < prev) errs.push(`${at}: demo steps must not go backwards`);
        prev = m.step;
      }
      if (m.build !== undefined && typeof m.build !== 'string') errs.push(`${at}: demo move ${i + 1} build must be text`);
      if (m.mark != null) {
        if (typeof m.mark !== 'string') errs.push(`${at}: demo move ${i + 1} mark must be text`);
        else if (!m.mark.trim()) errs.push(`${at}: demo move ${i + 1} mark is empty`);
        else if (kind === 'reading' && !text.includes(m.mark)) errs.push(`${at}: demo move ${i + 1} mark not in text`);
      }
    });
    if (new Set(moves.filter(isObj).map(m => m.step)).size < 3) errs.push(`${at}: demo must cover 3+ steps`);
    if (!words(d.prompt) || !words(d.answer)) errs.push(`${at}: demo needs a prompt and answer`);
    if (kind === 'reading') {
      if (!words(d.text)) errs.push(`${at}: demo needs text`);
    } else {
      const covered = new Set(moves.filter(isObj).map(m => m.step));
      for (let s = 1; s <= stepCount; s++) if (!covered.has(s)) errs.push(`${at}: step ${s} has no demo move`);
      const builds = moves.filter(hasBuild);
      if (builds.length < 2) errs.push(`${at}: demo needs 2+ builds`);
      if (builds.at(-1)?.build !== d.answer) errs.push(`${at}: demo answer must equal last build`);
    }
  }
  const p = Array.isArray(n.practice) ? n.practice : [];
  if (p.length !== 2) errs.push(`${at}: needs 2 practice items (has ${p.length})`);
  p.forEach((it, i) => {
    const pa = `${at} practice ${i + 1}`;
    if (!(it !== null && typeof it === 'object')) { errs.push(`${pa} is not an object`); return; }
    if (!words(it.prompt) || !words(it.answer) || !words(it.why)) errs.push(`${pa}: needs prompt, answer and why`);
    if (words(it.why) > 40) errs.push(`${pa}: why over 40 words`);
    if (kind === 'reading' && !words(it.text)) errs.push(`${pa}: needs text`);
    if (it.options !== undefined) {
      if (!Array.isArray(it.options)) errs.push(`${pa}: options must be a list`);
      else if (!it.options.some(o => String(o).trim().toLowerCase() === String(it.answer ?? '').trim().toLowerCase())) errs.push(`${pa}: answer not in options`);
    }
    if (it.evidence !== undefined) {
      if (typeof it.evidence !== 'string') errs.push(`${pa} evidence must be text`);
      else if (!it.evidence.trim()) errs.push(`${pa}: evidence is empty`);
      else if (!String(it.text ?? '').includes(it.evidence)) errs.push(`${pa}: evidence not in text`);
    }
  });
}

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
    checkDemoPractice(n, at, kind, steps.length, errs);
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
