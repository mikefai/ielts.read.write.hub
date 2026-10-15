import { overlapAmount } from './annotate.js';

export function evidenceRange(text, quote) {
  if (!quote) return null;
  const s = text.indexOf(quote);
  return s < 0 ? null : { s, e: s + quote.length };
}

export function coverage(marks, range) {
  const total = range ? range.e - range.s : 0;
  const covered = total ? overlapAmount(marks, range.s, range.e) : 0;
  const ratio = total ? covered / total : 0;
  return { covered, total, ratio, verdict: ratio >= 0.5 ? 'marked' : ratio > 0 ? 'partly' : 'missed' };
}
