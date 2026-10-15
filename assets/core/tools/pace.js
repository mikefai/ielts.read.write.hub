const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ok < target; warn from target up to and including target+5 min; over beyond.
export function passagePace(seconds, targetMin = 20) {
  const label = mmss(seconds);
  if (seconds < targetMin * 60) return { state: 'ok', label, message: `${label} on this passage. On pace.` };
  if (seconds <= (targetMin + 5) * 60) return { state: 'warn', label, message: `${label} on this passage. Aim to move on soon.` };
  return { state: 'over', label, message: `${label} on this passage. Over time: move on to the next passage.` };
}

export function phaseAt(timing, elapsedSec) {
  const t = Math.max(0, elapsedSec);
  let end = 0;
  for (let i = 0; i < timing.length; i++) {
    end += timing[i].minutes * 60;
    if (t < end) return { index: i, what: timing[i].what, remainingSec: end - t, overrun: false };
  }
  const last = timing.length - 1;
  return { index: last, what: timing[last]?.what, remainingSec: 0, overrun: true };
}
