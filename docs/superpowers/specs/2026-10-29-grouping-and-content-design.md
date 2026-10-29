# Grouping and exam-level content (Reading and Writing)

Date: 2026-10-29. Scope: small first pass, approved in chat.

## Goal
Learners find Reading and Writing practice by skill instead of one flat list, can reach every practice set, and get more content at real IELTS Academic length and difficulty (Cambridge 21 level: about 880-970 words per passage).

## Grouping
- Reading: `skills/reading/engine/types.js` gets `group` and `sets` on each type. Three groups: Judge the writer's claims (tfng, ynng, mcq), Match to the text (headings, information, features, endings), Complete from the text (short answer, sentence, notes, summary, word list, diagram). The hub renders group headings. Each type page lists its sets (`?set=`) so extra sets are reachable.
- Writing: `content/writing/index.json` gets `group` on each entry. Task 1: Data charts, Process and maps, Combined. Task 2: grouped under one heading per essay type, so second prompts sit beside the first.
- `tools/validate-content.mjs` checks every question file is listed in `TYPES[type].sets` and vice versa.

## Content
- `p6` extended to at least 850 words; no existing answer or evidence quote changes.
- Reading `p9` and `p10`, about 900 words each, band 7.5, with sets for the thinnest types: matching-endings, diagram-labelling, notes-completion (p9); summary-wordbank, short-answer, sentence-completion (p10).
- Writing: `w1-line2`, `w1-table2` (Task 1) and `w2-discussion2`, `w2-problem-solution2` (Task 2), following the 2026-10-18 model structures, with a "why" on every sentence.

## Not in scope
Speaking; other older passages (770-854 words); auditing existing Writing prompts; band filters.

## Check
`node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs`, then load both hubs.
