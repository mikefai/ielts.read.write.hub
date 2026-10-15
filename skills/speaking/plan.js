const p1 = m => m.part1.topics.flatMap(t => t.questions);

// seconds: 25 per Part 1 answer, 4 min for Part 2 (1 prep + 2 talk + rounding off), 50 per Part 3 answer
export const estimateMinutes = m => (p1(m).length * 25 + 240 + m.part3.questions.length * 50) / 60;

// exam order; the runner walks this list one step at a time
export function buildSteps(m) {
  const { cue, roundingOff } = m.part2;
  return [
    ...m.part1.topics.flatMap(t => t.questions.map(ref => ({ part: 1, kind: 'question', ref, label: t.name }))),
    { part: 2, kind: 'cue', ref: cue, label: 'Your cue card' },
    { part: 2, kind: 'prep', ref: cue, label: 'Preparation time' },
    { part: 2, kind: 'talk', ref: cue, label: 'Speak for two minutes' },
    { part: 2, kind: 'question', ref: roundingOff, label: 'Rounding off' },
    ...m.part3.questions.map(ref => ({ part: 3, kind: 'question', ref, label: m.part3.theme })),
  ];
}
