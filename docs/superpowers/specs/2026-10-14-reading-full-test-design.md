# Reading Full-Test Mode: Design Spec (addendum)
Date: 2026-10-14. Extends `2026-10-14-ielts-hub-reading-design.md`.

## Purpose
Learners are above Band 6.5 and train for 7.5+. Add a **Full test** that mirrors the structure of a real Cambridge Academic Reading test, and make the per-type practice pages draw from the same content. The structural reference is Cambridge IELTS 21 Test 1 (read as a model only; none of its text or questions is reused).

## Reference structure (to mirror exactly)
| Passage | Questions | Groups |
|---|---|---|
| 1 | 1-13 | notes-completion x7 (ONE WORD ONLY); tfng x6 |
| 2 | 14-26 | matching-information x4 (sections A-G); summary-completion x4 (ONE WORD ONLY); matching-features x5 ("any letter more than once") |
| 3 | 27-40 | mcq x4 (A-D); summary-wordbank x6 (list A-I, 9 words); ynng x4 |
Total 40 questions, 60 minutes, no transfer time.

## Success criteria
1. `skills/reading/test/?id=t1` runs the whole test: passage tabs 1-3, groups in the table's order, continuous numbering 1-40, one 60-minute timer, one Submit.
2. Result shows raw score /40, an approximate band (published raw-to-band table, labelled approximate), and per-group review with evidence highlight, plus the "How to answer" (during) and "Approach it again" (after submit) buttons per question.
3. Test content is original, passages 880-950 words (real passages measure ~880-970), at Band 7.5+ density (average sentence 20+ words, abstract vocabulary, nuanced claims).
4. The two new types (`notes-completion`, `summary-wordbank`) also have practice pages; types present in the test use its groups as their default set; the other types keep existing sets.
5. One content source: question sets stay in `content/reading/questions/<type>/<setId>.json`; the test file only references them.
6. Validators enforce the structure so it cannot drift.

## Content format
- `content/reading/tests/t1.json`: `{ id, title, minutes: 60, passages: [{ passageId, groups: [{ type, setId }] }] }`.
- Sets keep the existing schema. New: `notes-completion` items add optional `heading` (shown above a run of note lines; prompt contains `____`); `summary-wordbank` items carry the same 9-word `options` list and use each word once. Instructions text carries the NB / ONE WORD ONLY lines. `wordLimit: 1` for notes and summary-completion in the test.
- Every item keeps `answer, evidence{paragraph,quote}, step, how, again`.

## Engine changes
- Renderers take a third argument `offset` so numbering continues across groups (replace the hard-coded `i + 1`).
- `notes-completion` reuses the gap renderer in a notes layout; `summary-wordbank` reuses the matching renderer (chips + select, each word once).
- New `startTest({ testId, mount })` beside `startSet`: loads the test, renders one passage at a time with its groups, aggregates answers across all 40, marks with `markItem`, records one attempt `{type: 'full-test', setId: testId, score, total: 40}`.
- Band table (approximate, Academic): 39-40=9, 37-38=8.5, 35-36=8, 33-34=7.5, 30-32=7, 27-29=6.5, 23-26=6, 19-22=5.5, 15-18=5, 13-14=4.5, 10-12=4, else below 4.
- Hub: Reading home gets a featured **Full test** card above the type list; hub weakest/continue logic handles `full-test`.

## Validation (tools/validate-content.mjs)
- Passage range becomes 850-1000 words (real passages are ~880-970).
- New `validateTest(test, sets)`: group order and counts match the table, per-passage totals are 13/13/14 and overall 40, every referenced set exists, wordbank options are 9 and all answers are distinct, ONE WORD ONLY sets have `wordLimit: 1`.
- Existing rules stay (copy limit, how/again checks, evidence quotes).

## Content production
Passages and questions are written by a subagent on a stronger model than Haiku (Haiku under-delivered length and density). I validate every file, read the hardest groups, and measure passage density against the real-test numbers before accepting.

## Out of scope
More tests than t1, auto-generated tests, Listening/Speaking, accounts. Existing Writing skill untouched.

## Risks
- "Real-exam difficulty" cannot be measured exactly; mitigated by matching real length, density and question mix, and by the teacher trying the test.
- The band table is an approximation; the UI says so.
