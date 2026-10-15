const BS = String.fromCharCode(92);
const esc = s => s.replace(/[.*+?^${}()|[\]\x5c]/g, c => BS + c);

export function suggest(selection, dict) {
  let text = (selection ?? '').toLowerCase();
  const out = [];
  for (const key of Object.keys(dict).sort((a, b) => b.length - a.length)) {
    const re = new RegExp('(?<![a-z])' + esc(key.toLowerCase()).replace(/\s+/g, BS + 's+') + '(?:s|es|ed|d|ing)?(?![a-z])');
    const m = re.exec(text);
    if (!m) continue;
    out.push({ key, options: dict[key] });
    text = text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length); // consume so shorter keys can't re-match inside a longer phrase
  }
  return out;
}
