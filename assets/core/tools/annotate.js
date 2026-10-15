// Pure paragraph annotation model. Intervals are half-open [s,e) character offsets.
export const COLOURS = ['yellow', 'green', 'pink', 'blue'];
export const emptyMarks = () => ({ hl: [], ul: [], notes: [] });

// Remove [s,e) from a sorted non-overlapping interval list (splitting as needed).
function subtract(list, s, e) {
  if (!(s < e)) return list.map(x => ({ ...x }));
  const out = [];
  for (const x of list) {
    if (x.e <= s || x.s >= e) { out.push({ ...x }); continue; }
    if (x.s < s) out.push({ ...x, e: s });
    if (x.e > e) out.push({ ...x, s: e });
  }
  return out;
}
// Sort and merge touching/overlapping intervals; hl only merges equal colours.
function normalise(list) {
  const out = [];
  for (const x of [...list].sort((a, b) => a.s - b.s || a.e - b.e)) {
    const p = out[out.length - 1];
    if (p && x.s <= p.e && p.c === x.c) p.e = Math.max(p.e, x.e);
    else out.push({ ...x });
  }
  return out;
}
const sortNotes = notes => [...notes].sort((a, b) => a.s - b.s || a.e - b.e);
const valid = (s, e) => Number.isFinite(s) && Number.isFinite(e) && s < e;

export function setHighlight(marks, s, e, colour) {
  if (!valid(s, e)) return { ...marks, hl: marks.hl.map(x => ({ ...x })) };
  const hl = subtract(marks.hl, s, e);
  if (colour) hl.push({ s, e, c: colour });
  return { ...marks, hl: normalise(hl) };
}

export function setUnderline(marks, s, e, on) {
  if (!valid(s, e)) return { ...marks, ul: marks.ul.map(x => ({ ...x })) };
  const ul = subtract(marks.ul, s, e);
  if (on) ul.push({ s, e });
  return { ...marks, ul: normalise(ul) };
}

export function addNote(marks, s, e, text) {
  const max = marks.notes.reduce((m, n) => Math.max(m, parseInt(String(n.id).slice(1), 10) || 0), 0);
  const id = 'n' + (max + 1);
  return { marks: { ...marks, notes: sortNotes([...marks.notes, { id, s, e, t: text }]) }, id };
}

export const updateNote = (marks, id, text) => ({ ...marks, notes: marks.notes.map(n => n.id === id ? { ...n, t: text } : { ...n }) });
export const removeNote = (marks, id) => ({ ...marks, notes: marks.notes.filter(n => n.id !== id).map(n => ({ ...n })) });

export function clearRange(marks, s, e) {
  return {
    hl: subtract(marks.hl, s, e),
    ul: subtract(marks.ul, s, e),
    notes: marks.notes.filter(n => !(n.s >= s && n.e <= e)).map(n => ({ ...n })),
  };
}

export function segments(text, marks, extra = {}) {
  const len = text.length;
  if (!len) return [];
  const find = extra.find || [], ev = extra.ev || [];
  const cuts = new Set([0, len]);
  for (const x of [...marks.hl, ...marks.ul, ...marks.notes, ...ev, ...find])
    for (const p of [x.s, x.e]) if (p > 0 && p < len) cuts.add(p);
  const pts = [...cuts].sort((a, b) => a - b);
  const cover = (list, a) => list.filter(x => x.s <= a && a < x.e);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const f = cover(find, a);
    out.push({
      t: text.slice(a, b), s: a, e: b,
      hl: cover(marks.hl, a)[0]?.c ?? null,
      ul: cover(marks.ul, a).length > 0,
      ev: cover(ev, a).length > 0,
      find: f.length ? (f.some(x => x.cur) ? 'cur' : 'hit') : null,
      note: cover(marks.notes, a).length > 0,
      noteEnd: marks.notes.find(n => n.e === b)?.id ?? null,
    });
  }
  return out;
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toHtml(text, marks, extra = {}) {
  return segments(text, marks, extra).map(g => {
    const cls = [g.hl && 'hl-' + g.hl, g.ul && 'ul', g.ev && 'ev', g.find && 'find-' + g.find, g.note && 'note', g.noteEnd && 'nend'].filter(Boolean);
    if (!cls.length) return esc(g.t);
    return `<span class="seg ${cls.join(' ')}"${g.noteEnd ? ` data-n="${esc(g.noteEnd)}"` : ''}>${esc(g.t)}</span>`;
  }).join('');
}

export function overlapAmount(marks, s, e) {
  const all = normalise([...marks.hl, ...marks.ul, ...marks.notes].map(x => ({ s: x.s, e: x.e })));
  return all.reduce((sum, x) => sum + Math.max(0, Math.min(x.e, e) - Math.max(x.s, s)), 0);
}
