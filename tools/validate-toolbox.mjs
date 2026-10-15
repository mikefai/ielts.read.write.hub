import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateParaphrase(dict) {
  const errs = [], keys = Object.keys(dict);
  if (keys.length < 150) errs.push(`paraphrase: needs 150+ keys (has ${keys.length})`);
  for (const k of keys) {
    const alts = dict[k];
    if (k !== k.toLowerCase() || k !== k.trim()) errs.push(`paraphrase "${k}": key must be trimmed lower-case`);
    if (!Array.isArray(alts) || alts.length < 3 || alts.length > 6) { errs.push(`paraphrase "${k}": needs 3-6 alternatives`); continue; }
    for (const a of alts) if (typeof a !== 'string' || !a.trim() || a.toLowerCase() === k) errs.push(`paraphrase "${k}": bad alternative "${a}"`);
    if (new Set(alts.map(a => String(a).toLowerCase())).size !== alts.length) errs.push(`paraphrase "${k}": duplicate alternatives`);
  }
  return errs;
}

export function validatePhrasebank(bank) {
  const errs = [];
  for (const [task, min] of [['task1', 6], ['task2', 7]]) {
    const secs = bank[task] ?? [];
    if (secs.length < min) errs.push(`phrasebank ${task}: needs ${min}+ sections (has ${secs.length})`);
    for (const s of secs) {
      if (!s.title) errs.push(`phrasebank ${task}: section missing title`);
      if ((s.items?.length ?? 0) < 6) errs.push(`phrasebank ${task} "${s.title}": needs 6+ items`);
      if (new Set(s.items).size !== (s.items?.length ?? 0)) errs.push(`phrasebank ${task} "${s.title}": duplicate items`);
    }
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'writing');
  const read = f => JSON.parse(readFileSync(join(root, f), 'utf8'));
  const errs = [...validateParaphrase(read('paraphrase.json')), ...validatePhrasebank(read('phrasebank.json'))];
  console.log(`${errs.length} errors`); errs.forEach(e => console.log(' ', e));
  process.exit(errs.length ? 1 : 0);
}
