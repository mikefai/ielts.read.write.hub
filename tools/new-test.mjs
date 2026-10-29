// Scaffold a Reading test from existing question sets, then validate it.
// Usage: node tools/new-test.mjs <id> "<title>" "<blurb>" <sets for passage 1> <sets for passage 2> <sets for passage 3>
//   each "sets" argument is a comma-separated list of set ids, e.g. m1-tfng,m1-summary-completion
// Find set ids with: node tools/sets.mjs
// The passage of each group is taken from its sets, so every set in one argument must share a passage.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'reading');
const [id, title, blurb, ...parts] = process.argv.slice(2);
if (!id || !title || !blurb || parts.length !== 3) { console.error('usage: node tools/new-test.mjs <id> "<title>" "<blurb>" <sets> <sets> <sets>'); process.exit(2); }

const sets = {};
for (const f of readdirSync(join(root, 'questions'), { recursive: true }).filter(f => f.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(root, 'questions', f), 'utf8')); sets[s.id] = s;
}
const manifest = join(root, 'tests', 'index.json'), listed = JSON.parse(readFileSync(manifest, 'utf8'));
if (listed.includes(id)) { console.error(`test "${id}" already exists`); process.exit(2); }

const passages = parts.map((list, i) => {
  const ids = list.split(',');
  for (const s of ids) if (!sets[s]) { console.error(`unknown set "${s}" (see node tools/sets.mjs)`); process.exit(2); }
  const pids = new Set(ids.map(s => sets[s].passageId));
  if (pids.size !== 1) { console.error(`passage ${i + 1}: sets belong to different passages (${[...pids].join(', ')})`); process.exit(2); }
  return { passageId: [...pids][0], groups: ids.map(s => ({ type: sets[s].type, setId: s })) };
});

writeFileSync(join(root, 'tests', `${id}.json`), JSON.stringify({ id, title, minutes: 60, blurb, passages }, null, 2) + '\n');
writeFileSync(manifest, JSON.stringify([...listed, id]) .replace(/,/g, ', ') + '\n');
console.log(`wrote content/reading/tests/${id}.json and listed it in index.json; validating...`);
process.exit(spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'validate-content.mjs')], { stdio: 'inherit' }).status ?? 1);
