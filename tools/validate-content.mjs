import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES = ['tfng', 'ynng', 'mcq', 'short-answer', 'sentence-completion', 'summary-completion',
  'matching-headings', 'matching-information', 'matching-features', 'matching-endings', 'diagram-labelling', 'notes-completion', 'summary-wordbank'];
const NEEDS_OPTIONS = ['mcq', 'summary-wordbank', 'matching-headings', 'matching-information', 'matching-features', 'matching-endings'];

const COPY_CHECKED = ['tfng', 'ynng', 'matching-information', 'matching-features'];
const toks = s => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);

// longest run of consecutive words shared by both lists
function longestRun(a, b) {
  let best = 0, prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) best = Math.max(best, cur[j] = prev[j - 1] + 1);
    prev = cur;
  }
  return best;
}

// Real passages (Cambridge 21 Test 1) measure ~880-970 words; practice-only legacy passages may pass min=700.
export function validatePassage(passage, min = 850) {
  const n = passage.paragraphs.reduce((s, p) => s + p.text.trim().split(/\s+/).length, 0), k = passage.paragraphs.length;
  const errs = [];
  if (n < min || n > 1000) errs.push(`${passage.id}: ${n} words, needs ${min}-1000`);
  if (k < 6 || k > 8) errs.push(`${passage.id}: ${k} paragraphs, needs 6-8`);
  return errs;
}

export function validate(passage, set) {
  const errs = [];
  const passageToks = toks(passage.paragraphs.map(p => p.text).join(' '));
  if (!TYPES.includes(set.type)) errs.push(`${set.id}: unknown type "${set.type}"`);
  if (!((set.items?.length ?? 0) >= 4 && set.items.length <= 7)) errs.push(`${set.id}: needs 4-7 items, has ${set.items?.length ?? 0}`);
  for (const it of set.items ?? []) {
    const tag = `${set.id}/${it.id}`;
    if (COPY_CHECKED.includes(set.type) && longestRun(toks(it.prompt), passageToks) >= 6) errs.push(`${tag}: prompt copies passage wording (6+ words in a row); paraphrase it`);
    for (const k of ['how', 'again']) if ((it[k] ?? '').trim().split(/\s+/).filter(Boolean).length < 12) errs.push(`${tag}: "${k}" guidance needs 12+ words`);
    const ans = String(it.answer ?? '').toLowerCase();
    if (!['true', 'false', 'yes', 'no', 'not given'].includes(ans) && ans.length >= 5 && (it.how ?? '').toLowerCase().includes(ans)) errs.push(`${tag}: "how" gives away the answer`);
    if (/\b(reverses?|reversed|contradicts?|contradicted|opposite|trap|not given|the answer|is (true|false|correct|wrong|incorrect))\b/i.test(it.how ?? '')) errs.push(`${tag}: "how" hints at the verdict or answer; keep it to method`);
    const para = passage.paragraphs.find(p => p.label === it.evidence?.paragraph);
    if (!para) errs.push(`${tag}: evidence paragraph "${it.evidence?.paragraph}" not in passage`);
    else if (!it.evidence.quote || !para.text.includes(it.evidence.quote)) errs.push(`${tag}: evidence quote not found in paragraph ${para.label}`);
    if (!(it.step >= 1 && it.step <= 5)) errs.push(`${tag}: step must be 1-5`);
    if (it.answer === undefined || it.answer === '') errs.push(`${tag}: missing answer`);
    if (NEEDS_OPTIONS.includes(set.type) && !it.options?.includes(it.answer)) errs.push(`${tag}: answer not among options`);
  }
  return errs;
}

// Mirrors Cambridge IELTS 21 Academic Reading Test 1: [type, item count] per group, per passage.
export const STRUCTURE = [
  [['notes-completion', 7], ['tfng', 6]],
  [['matching-information', 4], ['summary-completion', 4], ['matching-features', 5]],
  [['mcq', 4], ['summary-wordbank', 6], ['ynng', 4]],
];
const ONE_WORD = ['notes-completion', 'summary-completion'];

export function validateTest(test, sets) {
  const errs = [];
  if (test.minutes !== 60) errs.push(`${test.id}: minutes must be 60`);
  if (test.passages?.length !== 3) errs.push(`${test.id}: needs 3 passages`);
  STRUCTURE.forEach((want, pi) => {
    const got = test.passages?.[pi]?.groups ?? [];
    if (got.map(g => g.type).join() !== want.map(w => w[0]).join()) errs.push(`${test.id}: passage ${pi + 1} group order must be ${want.map(w => w[0]).join(', ')}`);
    got.forEach((g, gi) => {
      const s = sets[g.setId];
      if (!s) { errs.push(`${test.id}: missing set ${g.setId}`); return; }
      if (s.type !== g.type) errs.push(`${g.setId}: type ${s.type} does not match group type ${g.type}`);
      const n = want[gi]?.[1];
      if (n && s.items.length !== n) errs.push(`${g.setId}: needs ${n} items, has ${s.items.length}`);
      if (ONE_WORD.includes(g.type) && s.wordLimit !== 1) errs.push(`${g.setId}: ONE WORD ONLY needs wordLimit 1`);
      if (g.type === 'summary-wordbank') {
        if ((s.items[0]?.options?.length ?? 0) !== 9) errs.push(`${g.setId}: word list needs 9 words`);
        const a = s.items.map(i => i.answer);
        if (new Set(a).size !== a.length) errs.push(`${g.setId}: each listed word may be used once`);
      }
    });
  });
  return errs;
}

const walk = d => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.json') ? [join(d, f)] : []);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'reading');
  const errs = [];
  const tests = existsSync(join(root, 'tests')) ? walk(join(root, 'tests')).map(f => JSON.parse(readFileSync(f, 'utf8'))) : [];
  const testPassages = new Set(tests.flatMap(t => t.passages.map(p => p.passageId)));
  for (const f of walk(join(root, 'passages'))) {
    const p = JSON.parse(readFileSync(f, 'utf8'));
    errs.push(...validatePassage(p, testPassages.has(p.id) ? 850 : 700));
  }
  const sets = {};
  for (const f of walk(join(root, 'questions'))) {
    const set = JSON.parse(readFileSync(f, 'utf8'));
    sets[set.id] = set;
    try { errs.push(...validate(JSON.parse(readFileSync(join(root, 'passages', set.passageId + '.json'), 'utf8')), set)); }
    catch (e) { errs.push(`${f}: ${e.message}`); }
  }
  for (const t of tests) errs.push(...validateTest(t, sets));
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
