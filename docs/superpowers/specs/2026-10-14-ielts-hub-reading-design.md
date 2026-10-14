# IELTS Academic Study Hub + Reading: Design Spec
Date: 2026-10-14

## Purpose
A web study hub for the user's IELTS Academic learners, later open to other learners. This spec covers the **hub and the Reading skill only**. Listening, Writing and Speaking are separate later specs, added through the same registry.

## Success criteria
1. A learner opens `index.html`, sees the hub, and enters Reading.
2. Each of the 11 Reading question types has its own environment, with a different layout where the task needs one.
3. A learner can complete a set, get marked, and see for every answer the evidence sentence highlighted in the passage plus the method step that finds it.
4. Progress persists in the browser and the hub shows it (streak, accuracy per type, weakest type, continue button).
5. Adding a passage or question set means adding JSON files only.
6. Works with no build step and no dependencies. Keyboard operable, mobile-stacked layout.

## Out of scope
Accounts, backend, teacher tools, audio, AI marking, Listening/Writing/Speaking.

## Architecture (static site, ES modules)
```
/index.html                      hub
/skills.json                     registry: id, title, path, status (live | soon), accent
/assets/core/tokens.css base.css store.js
/skills/reading/index.html       Reading home (11 type tiles + progress)
/skills/reading/engine/          timer, highlighter, marking, review, coach panel
/skills/reading/types/<type>/    index.html + own CSS per question type
/content/reading/passages/<id>.json
/content/reading/questions/<type>/<id>.json
/docs/content/ielts-academic-method-guide.md   source for coach-panel text
```
- Hub renders cards from `skills.json`. `soon` entries are non-links.
- `store.js` is the only module that touches `localStorage` (try/catch, falls back to memory). Interface: `getProgress()`, `recordAttempt({type, setId, score, total, seconds})`. A backend later replaces this file only.

## Content format (JSON)
- Passage: `{ id, title, band, paragraphs: [{label, text}] }`.
- Question set: `{ id, type, passageId, instructions, wordLimit?, items: [{ id, prompt, answer, accept?: [...], evidence: {paragraph, quote}, step }] }`. Matching and multiple-choice types add `options`.
- `evidence.quote` must appear verbatim in the paragraph, and the highlighter finds it by that text. `step` is 1-5 from the method guide.
- Marking is case-insensitive and trims whitespace. A completion answer is correct if it equals `answer` or any `accept` entry and respects `wordLimit`.

## Environments (layout per type)
- T/F/NG and Y/N/NG: statement list beside passage, three-way choice per statement.
- Matching headings / information / features / sentence endings: option pool plus drag or select target (select fallback for keyboard and touch).
- Multiple choice: option list per question.
- Completion types: inline gaps with a live word counter against the limit.
- Diagram labelling: an inline SVG/HTML diagram with numbered gaps.
- Short answer: single input with the limit shown.
- Shared in every environment: timer, passage highlighter, collapsible coach panel, review screen.

## Look
Shared tokens: warm off-white paper background, serif for passages, sans for UI, one accent per skill, dark mode via `prefers-color-scheme`. Hub: skill cards, progress strip, continue button. Reading home: 11 tiles with accuracy and a one-line description.

## Initial content (MVP)
3 original passages at roughly Band 6, 7 and 8 level (~800 words each), and at least one set of 4-6 questions for every one of the 11 types. All content is original, none copied from real exams.

## Build approach
Design, architecture, engine and review are done by the main agent. A Haiku-class subagent writes passages and question JSON in small batches against the schema above. The main agent validates every file (schema check, evidence quote present in the passage) before it is used.

## Testing
- One assert-based self-check script: marking function (case, whitespace, word limit, accepted variants) and a content validator (every `evidence.quote` is found in its paragraph, every `answer` is valid for its type).
- Manual browser pass: hub to Reading to each type, complete a set, check review and persisted progress, check mobile width and keyboard use.

## Risks
- Diagram labelling and drag matching are the most UI-heavy types, so they are built last.
- Passage difficulty by band is a judgement call. The user should review the band labels.
- Not a git repository, so there is no commit step yet.
