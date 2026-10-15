const STOP = new Set('about above after again against along also because before being below between could does doing during each either every first found further having their there these they this those through under until very were what when where which while whose will with would other should than then them from have into more most only over such same some that your'.split(' '));
const norm = s => s.replace(/[\u2018\u2019]/g, "'");
const count = s => s.trim().split(/\s+/).filter(Boolean).length;

const RULES = {
  1: { target: 150, min: 3, a: ['overview', /overall|in general|generally|on the whole/i] },
  2: { target: 250, min: 4, a: ['position', /in my (opinion|view)|i (firmly |strongly )?(believe|agree|disagree|think)|i would argue/i], b: ['conclusion', /in conclusion|to conclude|to sum up|in summary|overall/i] }
};

export function analyse(paragraphs, taskNo) {
  const R = RULES[taskNo] ?? RULES[2];
  const text = norm(paragraphs.join('\n'));
  const words = count(text);
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => /\w/.test(s));
  const avgSentence = sentences.length ? Math.round(words / sentences.length * 10) / 10 : 0;
  const pass = (re) => re.test(text);
  const checks = [{ id: 'paragraphs', label: `At least ${R.min} paragraphs`, ok: paragraphs.length >= R.min }];
  if (taskNo === 1) {
    checks.push({ id: 'overview', label: 'Has an overview', ok: pass(R.a[1]) },
      { id: 'data', label: 'Uses specific data', ok: (text.match(/\d+/g) ?? []).length >= 4 });
  } else {
    checks.push({ id: R.a[0], label: 'States a clear position', ok: pass(R.a[1]) },
      { id: R.b[0], label: 'Has a conclusion', ok: pass(R.b[1]) });
  }
  checks.push({ id: 'words', label: `At least ${R.target} words`, ok: words >= R.target });

  const warnings = [];
  const freq = {};
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  for (const [w, n] of Object.entries(freq)) if (n >= 5) warnings.push({ type: 'repeat', detail: `${w} ×${n}` });
  for (const s of sentences) if (count(s) > 40) warnings.push({ type: 'long', detail: s.split(/\s+/).slice(0, 6).join(' ') + '…' });
  const seen = new Set();
  for (const m of text.matchAll(/\w(n't|'m|'re|'ve|'ll|'d)\b/gi)) if (!seen.has(m[1].toLowerCase())) { seen.add(m[1].toLowerCase()); warnings.push({ type: 'contraction', detail: m[1].toLowerCase() }); }
  return { words, sentences: sentences.length, paragraphs: paragraphs.length, avgSentence, target: R.target, checks, warnings };
}
