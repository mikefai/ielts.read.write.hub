// order = order of the groups on the Reading hub
export const GROUPS = [
  { id: 'judge', title: "Judge the writer's claims", blurb: 'Decide what the text says, denies or leaves out.' },
  { id: 'match', title: 'Match to the text', blurb: 'Link headings, details, people and endings to the right paragraph.' },
  { id: 'complete', title: 'Complete from the text', blurb: 'Find the exact words that fill a gap, note or label.' },
];

export const TYPES = [
  { id: 'tfng', title: 'True / False / Not Given', blurb: 'Does the text agree, contradict, or say nothing?', set: 't1-tfng', accent: '#b4532a', group: 'judge', sets: ['m1-tfng', 'm2-tfng', 'p6-tfng', 't1-tfng'] },
  { id: 'ynng', title: 'Yes / No / Not Given', blurb: "Does the text match the writer's view?", set: 't1-ynng', accent: '#8a4fb3', group: 'judge', sets: ['m1-ynng', 'p7-ynng', 't1-ynng'] },
  { id: 'mcq', title: 'Multiple Choice', blurb: 'Pick the option the text supports.', set: 't1-mcq', accent: '#2a7fb4', group: 'judge', sets: ['m1-mcq', 'm2-mcq', 'p7-mcq', 't1-mcq'] },
  { id: 'short-answer', title: 'Short Answer', blurb: 'Find a few exact words.', set: 'p6-short-answer', accent: '#2f7d4f', group: 'complete', sets: ['m2-short-answer', 'p6-short-answer', 'p10-short-answer'] },
  { id: 'sentence-completion', title: 'Sentence Completion', blurb: 'Complete sentences with words from the text.', set: 'p6-sentence-completion', accent: '#b48a2a', group: 'complete', sets: ['m2-sentence-completion', 'p6-sentence-completion', 'p10-sentence-completion'] },
  { id: 'summary-completion', title: 'Summary Completion', blurb: 'Fill the gaps in a summary.', set: 't1-summary-completion', accent: '#b42a6e', group: 'complete', sets: ['m1-summary-completion', 'm2-summary-completion', 'p7-summary-completion', 't1-summary-completion'] },
  { id: 'diagram-labelling', title: 'Diagram / Flow-chart Labelling', blurb: 'Label the stages of a process.', set: 'p6-diagram-labelling', accent: '#2ab49a', group: 'complete', sets: ['p6-diagram-labelling', 'p9-diagram-labelling'] },
  { id: 'matching-headings', title: 'Matching Headings', blurb: 'Give each paragraph its main idea.', set: 'p7-matching-headings', accent: '#6b4fb3', group: 'match', sets: ['m1-matching-headings', 'm2-matching-headings', 'p7-matching-headings'] },
  { id: 'matching-information', title: 'Matching Information', blurb: 'Which paragraph contains this detail?', set: 't1-matching-information', accent: '#b4532a', group: 'match', sets: ['m2-matching-information', 'p8-matching-information', 't1-matching-information'] },
  { id: 'matching-features', title: 'Matching Features', blurb: 'Match claims to people or theories.', set: 't1-matching-features', accent: '#4f7db3', group: 'match', sets: ['m1-matching-features', 'p8-matching-features', 't1-matching-features'] },
  { id: 'matching-endings', title: 'Matching Sentence Endings', blurb: 'Choose the ending that fits the text.', set: 'p8-matching-endings', accent: '#7d8a2a', group: 'match', sets: ['p8-matching-endings', 'p9-matching-endings'] },
  { id: 'notes-completion', title: 'Notes Completion', blurb: 'Complete bullet notes with ONE word from the text.', set: 't1-notes-completion', accent: '#a8553a', group: 'complete', sets: ['m1-notes-completion', 't1-notes-completion', 'p9-notes-completion'] },
  { id: 'summary-wordbank', title: 'Summary with a Word List', blurb: 'Choose words from a list to complete a summary.', set: 't1-summary-wordbank', accent: '#4f6fb3', group: 'complete', sets: ['t1-summary-wordbank', 'p10-summary-wordbank'] },
];


