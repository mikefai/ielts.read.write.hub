// Inventory for building a Reading test: every passage with its words, and every question set on it.
// Usage: node tools/sets.mjs            (all passages)
//        node tools/sets.mjs --free     (only sets no test uses yet)
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordCount } from './validate-content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'reading');
const read = f => JSON.parse(readFileSync(f, 'utf8'));
const json = d => readdirSync(d, { recursive: true }).filter(f => f.endsWith('.json')).map(f => join(d, f));

const passages = json(join(root, 'passages')).map(read);
const sets = json(join(root, 'questions')).map(read);
const used = {};
for (const f of json(join(root, 'tests')).filter(f => !f.endsWith('index.json')))
  for (const p of read(f).passages) for (const g of p.groups) (used[g.setId] ??= []).push(read(f).id);

const free = process.argv.includes('--free');
for (const p of passages) {
  const mine = sets.filter(s => s.passageId === p.id).filter(s => !free || !used[s.id]);
  if (!mine.length) continue;
  console.log(`${p.id}  ${wordCount(p)} words  band ${p.band}  ${p.title}`);
  for (const s of mine) console.log(`    ${s.id.padEnd(34)} ${s.type.padEnd(22)} ${String(s.items.length).padStart(2)} q  ${used[s.id] ? 'in ' + used[s.id].join(',') : 'free'}`);
}
