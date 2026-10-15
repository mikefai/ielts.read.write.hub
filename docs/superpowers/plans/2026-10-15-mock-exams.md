# IELTS Academic Mock Exams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2 full Reading mocks, 3 Writing mocks (each a Task 1 with multiple visuals + a Task 2 essay) and 3 Speaking mocks with vocabulary help to the existing static IELTS hub, each built to the real exam format.

**Architecture:** Static site, no build step, JSON content validated by node scripts (`tools/validate-*.mjs`) and `node --test`. Reading mocks reuse the existing full-test runner (`skills/reading/test/?id=`); Writing mocks reuse the task page and add a light "mock" link-chain; Speaking is a new skill (`skills/speaking/`) driven by one JSON file per mock. Validators encode the exam format, so wrong-shaped content fails before a human sees it.

**Tech Stack:** Vanilla ES modules, JSON content, `node:test`, existing `assets/core/store.js` (`recordAttempt`).

**Spec:** The request of 2026-10-15, reproduced under Global Constraints (no separate spec file). Existing patterns: `docs/superpowers/specs/2026-10-14-reading-full-test-design.md`.

## Global Constraints

- **Reading (60 min):** 3 passages, total **2,150–2,750 words** (each passage 650–950 words, 6–8 lettered paragraphs), **exactly 40 questions** (13 / 13 / 14 per passage), question sets of 4–7 items; every mock includes True/False/Not Given, matching headings and summary completion. Existing `t1` is grandfathered (2,842 words) and must keep passing unchanged.
- **Writing (60 min):** Task 1 = 20 min, ≥150 words, describes several visuals; Task 2 = 40 min, ≥250 words, responds to an argument or problem. Mock ids `m1`–`m3`; each mock = one Task 1 + one Task 2.
- **Speaking (11–14 min):** Part 1 = 3 topics × 3–4 personal questions; Part 2 = cue card (topic, exactly 4 bullets, 60 s prep, 120 s talk) + one rounding-off question; Part 3 = 5–6 abstract questions on the Part 2 theme. Estimated total (`estimateMinutes`) must land in 11–14.
- Content must be original, British spelling, no real-person claims; every passage/essay in a different topic from existing content.
- Existing tests (`node --test tests/*.test.mjs`, 67) and `node tools/validate-content.mjs` / `validate-writing.mjs` stay green at every commit.
- Model use: **sonnet** for all content authoring and code; **haiku** only for the mechanical wiring in Task 10. Never run two writers on the same file.

## Review Focus

- A completion answer (summary/notes/sentence/short-answer) that is not literally in its evidence quote → validator rejects (Task 1).
- A TFNG/YNNG key that a careful reader would dispute (Not Given vs False) → blind-solve audit (Task 4).
- Matching-headings with a heading used twice or fewer extras than the real exam → validator rejects (Task 1).
- Task 1 pie slices not summing to 100, table rows with wrong column counts, or a "mixed" chart with one visual → existing `validateChart` plus new mock rule (Task 5).
- Speaking mock whose estimated length falls outside 11–14 min, or whose model answer never uses its own vocabulary list → `validateSpeaking` rejects (Task 7).

---

## File Structure

| File | Responsibility |
|---|---|
| `tools/validate-content.mjs` (modify) | Per-test structure registry (`t1`,`m1`,`m2`), 40-question and word-range rules |
| `tests/mock-structure.test.mjs` (create) | Tests for the new reading rules |
| `content/reading/{passages,questions/<type>,tests}/m1-*`, `m2-*` (create) | Reading mock content |
| `content/writing/mocks.json` (create) | `[{id,title,task1,task2}]` |
| `content/writing/task1/w1-m{1,2,3}.json`, `task2/w2-m{1,2,3}.json` (create) | Writing mock tasks |
| `content/writing/index.json` (modify) | 6 new entries with `"mock":"mN"` |
| `skills/writing/mock.js` (create) | `mockNext(mocks, mockId, taskId)` pure link logic |
| `skills/writing/task.js`, `skills/writing/index.html` (modify) | Mock link bar; mock exams section; hide `mock` entries from topic lists |
| `tools/validate-writing.mjs` (modify) | Mock rules |
| `skills/speaking/plan.js` (create) | `estimateMinutes(mock)`, `buildSteps(mock)` |
| `tools/validate-speaking.mjs` (create) | `validateSpeaking(mock)`, `validateBank(bank)` |
| `content/speaking/{mocks.json,s1.json,s2.json,s3.json,language-bank.json}` (create) | Speaking content |
| `skills/speaking/{index.html,speaking.css,runner.js,mock/index.html}` (create) | UI |
| `skills.json`, `assets/hub.js`, `skills/reading/index.html`, `README.md` (modify) | Wiring |

Dependency order: Task 1 → (2 ∥ 3) → 4. Task 5 → (6 ∥ 7a ∥ 7b ∥ 7c-style fan-out, see tasks). Task 8 → 9. Task 10 last. Reading, Writing and Speaking tracks are independent and run in parallel.

---

## READING TRACK

### Task 1: Reading validator for mock tests

**Files:** Modify `tools/validate-content.mjs`; Create `tests/mock-structure.test.mjs`

**Interfaces:**
- Produces: `STRUCTURE: Record<string, Array<Array<[type: string, count: number]>>>` keyed by test id; `validatePassage(passage, min = 850, max = 1000): string[]`; `validateTest(test, sets, passages = {}): string[]` where `passages` maps passageId → passage object; `wordCount(passage): number`.
- `STRUCTURE.t1` equals the current array. `STRUCTURE.m1` / `STRUCTURE.m2` exactly:
  - m1: P1 `[['tfng',7],['summary-completion',6]]`; P2 `[['matching-headings',6],['notes-completion',7]]`; P3 `[['ynng',5],['matching-features',5],['mcq',4]]`
  - m2: P1 `[['matching-headings',6],['sentence-completion',7]]`; P2 `[['tfng',6],['matching-information',7]]`; P3 `[['mcq',4],['summary-completion',6],['short-answer',4]]`

- [ ] **Step 1: Write failing tests** in `tests/mock-structure.test.mjs` using small in-memory fixtures:
  - `unknown test id has no structure` → `validateTest({id:'zz',...})` returns an error containing `no structure`.
  - `mock must total 40 questions` → m1 fixture with one item removed errors with `40`.
  - `mock word total outside 2150-2750 is rejected` → passages summing 2900 words errors with `2150-2750`; `t1` with 2842 words does **not** error (grandfathered).
  - `completion answer must be inside its evidence quote` → `validate(passage, set)` on a summary-completion item whose answer `"harbour"` is not in `quote` errors with `answer not in evidence quote`.
  - `matching headings: answers unique and options >= items + 2` → duplicated answer errors `heading used twice`; 6 items with 7 options errors `needs at least 8 headings`.
  - `completion sets need wordLimit 1-3` → missing `wordLimit` on `notes-completion` errors `wordLimit`.
  - `mock must include tfng, matching-headings and summary-completion` → a structure-valid test lacking one errors `must include`.
- [ ] **Step 2: Run** `node --test tests/mock-structure.test.mjs` — Expected: FAIL (new exports/rules missing).
- [ ] **Step 3: Implement** in `tools/validate-content.mjs`: `STRUCTURE` as an object (keep `t1` rows verbatim); `validatePassage` gains `max`; replace `ONE_WORD` check with “`notes-completion`, `summary-completion`, `sentence-completion`, `short-answer` need integer `wordLimit` 1–3”; in `validate()` add completion-answer-in-quote (case-insensitive, completion types only) and matching-headings uniqueness / `options.length >= items.length + 2` (error text from Step 1); in `validateTest` add total-40, word-range 2150–2750 for ids not in `LEGACY = ['t1']`, required-types rule for non-legacy. CLI main: passages used by non-legacy tests validate with `(650, 950)`; build the `passages` map and pass it to `validateTest`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs && node tools/validate-content.mjs` — Expected: all PASS, `0 errors` (t1 untouched).
- [ ] **Step 5: Commit** `git add tools/validate-content.mjs tests/mock-structure.test.mjs && git commit -m "feat: validator rules for reading mock exams"`

### Task 2: Reading Mock Exam 1 (`m1`)

**Files:** Create `content/reading/passages/m1-p{1,2,3}.json`; question sets (ids = filename) `questions/tfng/m1-tfng.json`, `questions/summary-completion/m1-summary-completion.json`, `questions/matching-headings/m1-matching-headings.json`, `questions/notes-completion/m1-notes-completion.json`, `questions/ynng/m1-ynng.json`, `questions/matching-features/m1-matching-features.json`, `questions/mcq/m1-mcq.json`; `content/reading/tests/m1.json`

**Interfaces:** Consumes `STRUCTURE.m1` (Task 1). Produces test id `m1` loadable at `skills/reading/test/?id=m1`.

Content brief (model: sonnet; copy the JSON shape of `t1-p1.json`, `t1-tfng.json`, `p7-matching-headings.json`, `t1-summary-completion.json`, `t1-notes-completion.json`, `t1-ynng.json`, `t1-matching-features.json`, `t1-mcq.json` field-for-field, including `how`/`again` (12+ words each, `how` never reveals the verdict) and `evidence.{paragraph,quote}` with a quote copied verbatim):
- `m1-p1` “Restoring Wetlands: The Return of the Beaver” (ecology, factual, paragraphs A–G, 700–900 words) → tfng ×7 (mix of ≥2 TRUE, ≥2 FALSE, ≥2 NOT GIVEN) + summary-completion ×6 (`wordLimit 1`).
- `m1-p2` “Time Zones and the Making of Modern Trade” (history/economics, A–G, 700–900) → matching-headings ×6 (paragraphs B–G, 9 headings in `options`, A is the worked example in `instructions`) + notes-completion ×7 (`wordLimit 1`).
- `m1-p3` “Can a Machine Be Creative?” (argument with named researchers and a clear writer’s view, A–G, 700–900) → ynng ×5, matching-features ×5 (≥3 named researchers as options), mcq ×4.
- Total words across the three passages 2,300–2,600. Question wording must paraphrase, never copy 6+ consecutive words.
- `m1.json`: `{id:'m1', title:'Mock Exam 1', minutes:60, passages:[{passageId, groups:[{type,setId}]}]}` in the `STRUCTURE.m1` order.

- [ ] **Step 1: Run** `node tools/validate-content.mjs` — Expected: FAIL (`m1` references missing sets) once `tests/m1.json` is written first; write `m1.json` first to see the red state.
- [ ] **Step 2: Author** the three passages (each as its own sonnet pass for style consistency), then each question set against its passage.
- [ ] **Step 3: Run** `node tools/validate-content.mjs` — Expected: `0 errors`.
- [ ] **Step 4: Commit** `git add content/reading && git commit -m "content: reading mock exam 1"`

### Task 3: Reading Mock Exam 2 (`m2`) — run in parallel with Task 2

**Files:** Create `content/reading/passages/m2-p{1,2,3}.json`; sets `questions/matching-headings/m2-matching-headings.json`, `questions/sentence-completion/m2-sentence-completion.json`, `questions/tfng/m2-tfng.json`, `questions/matching-information/m2-matching-information.json`, `questions/mcq/m2-mcq.json`, `questions/summary-completion/m2-summary-completion.json`, `questions/short-answer/m2-short-answer.json`; `content/reading/tests/m2.json`

**Interfaces:** Consumes `STRUCTURE.m2`. Same conventions as Task 2.

Brief: `m2-p1` “The Hidden History of Concrete” (matching-headings ×6 on B–G + sentence-completion ×7, `wordLimit 2`); `m2-p2` “Why We Forget: Sleep and Memory” (tfng ×6 incl. ≥2 each of TRUE/FALSE/NOT GIVEN, matching-information ×7 with paragraph letters as options); `m2-p3` “Cooling Cities with Tree Canopies” (mcq ×4, summary-completion ×6 `wordLimit 1`, short-answer ×4 `wordLimit 2`). Total 2,300–2,600 words. Topics must differ from `m1` and `t1`.

- [ ] **Step 1:** Write `m2.json`, run `node tools/validate-content.mjs` — Expected: FAIL (missing sets).
- [ ] **Step 2:** Author passages then sets (same rules as Task 2).
- [ ] **Step 3:** Run `node tools/validate-content.mjs` — Expected: `0 errors`.
- [ ] **Step 4:** Commit `content: reading mock exam 2`.

### Task 4: Blind-solve audit and hub link

**Files:** Modify `skills/reading/index.html` (add two “Mock Exam” cards beside the Full test card, hrefs `test/?id=m1`, `test/?id=m2`, same markup); fix any content found wrong.

- [ ] **Step 1:** For each of `m1`, `m2` spawn a **fresh sonnet** agent given only the three passage files plus the *questions with the `answer`, `evidence`, `how`, `again` fields stripped* (generate stripped copies in the scratchpad with a short node one-liner). It writes its 40 answers to a scratchpad JSON.
- [ ] **Step 2:** Compare against keys: `node -e` diff script prints every mismatch. Expected: 0 mismatches. For each mismatch decide by re-reading the passage: fix the question wording or key (an ambiguous TFNG/YNNG is rewritten, not defended). Re-run Step 1 on changed sets only until clean.
- [ ] **Step 3:** Run `node --test tests/*.test.mjs && node tools/validate-content.mjs` — Expected: PASS, `0 errors`.
- [ ] **Step 4:** Browser smoke (Playwright MCP, `npx serve .`): open `skills/reading/test/?id=m1` and `?id=m2`; assert 3 passage tabs, 40 inputs/selects, timer shows `60:00`, submit with blanks yields a band, no console errors.
- [ ] **Step 5:** Commit `feat: reading mocks linked and audited`.

---

## WRITING TRACK

### Task 5: Writing mock plumbing

**Files:** Create `content/writing/mocks.json`, `skills/writing/mock.js`, `tests/writing-mock.test.mjs`; Modify `tools/validate-writing.mjs`, `skills/writing/task.js`, `skills/writing/index.html`, `content/writing/index.json` (entries only after Tasks 6/7 exist — add them in Step 5 together with the mocks.json)

**Interfaces:**
- Produces: `mocks.json` = `[{ "id":"m1", "title":"Writing Mock Exam 1", "task1":"w1-m1", "task2":"w2-m1" }, … m2, m3]`; `mockNext(mocks: Mock[], mockId: string, taskId: string): { label: string, href: string } | null` (task1 → `{label:'Next: Task 2', href:'?id=<task2>&mock=<mockId>'}`; task2 → `{label:'Back to mock exams', href:'../#mocks'}`; unknown mock/task → `null`); `validateMocks(mocks, idsByTask): string[]` in `validate-writing.mjs`.
- Index entries: `{id, task, dir, title, blurb, mock:'mN'}`.

- [ ] **Step 1: Failing tests** in `tests/writing-mock.test.mjs`: `mockNext chains task1 to task2 keeping the mock id`; `mockNext after task2 returns to the mock list`; `mockNext returns null for unknown mock`; `validateMocks flags a Task 1 that is not a mixed chart` (chart kind `bar`) and `flags a mixed chart with fewer than 2 or more than 3 visuals`; `validateMocks flags a missing task id`.
- [ ] **Step 2:** `node --test tests/writing-mock.test.mjs` — Expected: FAIL.
- [ ] **Step 3: Implement** `mockNext` in `skills/writing/mock.js`; `validateMocks` in `validate-writing.mjs` and call it from the CLI main (mocks Task 1 must be `kind:'mixed'` with 2–3 sub-charts, model ≥150 words enforced by existing rule, Task 2 model ≥250). In `task.js` after `run()` builds the page: if `mock` query param present, fetch `mocks.json`, append `mockNext(...)` link into `.bar`’s sibling `<p class="mocknav">`. In `skills/writing/index.html` add a “Mock exams (60 min)” `<ol id="mocks">` with `id="mocks"` anchor listing `Task 1 → Task 2` links `task/?id=<task1>&mock=<id>`, and filter `t.mock` entries out of the Task 1/Task 2 topic lists.
- [ ] **Step 4:** Run `node --test tests/*.test.mjs` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: writing mock plumbing`. (Create `mocks.json` and index entries in Task 6/7 commits so validators pass at every commit: until then `mocks.json` is `[]`.)

### Task 6: Three Task 1 mocks with multiple visuals (3 parallel sonnet agents, one per file)

**Files:** Create `content/writing/task1/w1-m{1,2,3}.json`; Modify `content/writing/index.json`, `content/writing/mocks.json` (append by the orchestrator after all three land, not by the agents)

**Interfaces:** Consumes the shape of `w1-mixed.json` (fields `id, task:1, title, prompt, chart:{kind:'mixed',charts:[…]}, model, guide:'task1-mixed', analysis (≥3), plan (≥2)`), roles from `roles.json`, chart kinds from `chart.js`.

Per-mock brief (distinct themes from `w1-mixed` airport and `w1-bar` Eastbrook):
- `w1-m1`: **bar chart + table** — household energy sources by country and average annual cost.
- `w1-m2`: **line graph + two pie charts** — water consumption over time and its use by sector in two years (pie slices sum to 100).
- `w1-m3`: **three visuals: line graph + bar chart + table** — international student numbers, destinations, and fees.
- Prompt wording follows the real rubric (“Summarise the information by selecting and reporting the main features, and make comparisons where relevant.”). Model: Introduction, Overview (2 sentences, no numbers), two body paragraphs; 170–210 words; every sentence has a valid `role` and a `why` of 10+ words; figures in the model must match the chart data exactly.

- [ ] **Step 1:** Add the three index entries (`mock` field) and run `node tools/validate-writing.mjs` — Expected: FAIL (missing files).
- [ ] **Step 2:** Agents author the files.
- [ ] **Step 3:** Orchestrator appends `mocks.json` Task 1 ids; run `node tools/validate-writing.mjs` — Expected: `0 errors` except Task 2 ids not yet present (do Task 7 first or temporarily accept; simplest: run Tasks 6 and 7 together and commit once).
- [ ] **Step 4: Figure check:** a node script recomputes every number quoted in each model against the chart arrays (agent lists numbers; orchestrator spot-checks 100% of them against `values`). Expected: 0 discrepancies.
- [ ] **Step 5:** Commit `content: writing task 1 mocks`.

### Task 7: Three Task 2 mocks (3 parallel sonnet agents; run with Task 6)

**Files:** Create `content/writing/task2/w2-m{1,2,3}.json`; entries in `index.json`; `mocks.json` completed by orchestrator

**Interfaces:** Consumes shape of `w2-opinion.json` / `w2-discussion.json` / `w2-problem-solution.json` (`essayType`, `guide` key must exist in `guides.json`).
- `w2-m1` opinion (`guide:'opinion'`): remote working becomes the norm — agree/disagree.
- `w2-m2` discussion (`guide:'discussion'`): children’s structured activities vs free play.
- `w2-m3` problem-solution (`guide:'problem-solution'`): shortage of affordable housing in cities.
- Model: Introduction, two body paragraphs, Conclusion; 270–320 words; each sentence has `role` + `why` 10+ words; `analysis` ≥3, `plan` ≥2 entries. Topics must not repeat any existing Task 2 prompt.

- [ ] **Step 1:** Add index entries; `node tools/validate-writing.mjs` — Expected: FAIL (missing files).
- [ ] **Step 2:** Agents author; **Step 3:** run validator — Expected `0 errors`; **Step 4:** browser smoke: open `skills/writing/#mocks`, click Mock 1 → Task 1 page shows 2 charts and a 20:00 timer, “Compare with model” reveals the link “Next: Task 2”, Task 2 shows 40:00; no console errors. **Step 5:** commit `content: writing task 2 mocks` (single commit with Task 6 is acceptable).

---

## SPEAKING TRACK

### Task 8: Speaking skill code (plan logic, validator, UI)

**Files:** Create `skills/speaking/plan.js`, `tools/validate-speaking.mjs`, `tests/speaking.test.mjs`, `skills/speaking/{index.html,speaking.css,runner.js,mock/index.html}`, `content/speaking/mocks.json` (`[]` until Task 9); Modify `skills.json`, `assets/hub.js`

**Interfaces:**
- Mock schema (`content/speaking/sN.json`): `{ id, title, part1:{ topics:[{ name, questions:[Q] }] }, part2:{ cue:{ topic, bullets:[4 strings], prepSeconds:60, talkSeconds:120 }, model, vocab:[V], phrases:[string], structure:[string], roundingOff: Q }, part3:{ theme, questions:[Q] } }` where `Q = { q, model, vocab:[V], phrases:[string] }`, `V = { word, band:7|8|9, meaning, example }`.
- Produces: `estimateMinutes(mock): number` = `(part1Count*25 + 240 + part3Count*50) / 60`; `buildSteps(mock): Step[]` with `Step = { part:1|2|3, kind:'question'|'cue'|'prep'|'talk', ref: Q|cue, label: string }` in exam order (Part 2: `cue`, `prep`, `talk`, then `question` for `roundingOff`); `validateSpeaking(mock): string[]`; `validateBank(bank): string[]`.
- `validateSpeaking` rules: 3 topics × 3–4 questions; cue topic starts `Describe`; exactly 4 bullets, last starts `and explain` or `and say`; `prepSeconds===60`, `talkSeconds===120`; Part 3 has 5–6 questions; `estimateMinutes` within 11–14; model words: Part 1 answers 30–60, Part 2 200–300, Part 3 60–110; every Q has ≥3 vocab (all four fields non-empty, `example` ≥6 words) and ≥2 phrases; each model answer contains ≥2 of its own vocab words (match on `word.toLowerCase().slice(0, Math.max(4, word.length-3))`); `part2.structure` ≥4 entries.
- `validateBank`: `{ sections:[{ title, use, items:[{ phrase, example }] }] }` with ≥6 sections, each ≥6 items.
- `buildSteps` ordering is the contract Task 8’s runner uses; UI sends `recordAttempt({ type:'speaking-mock', setId: mock.id, score: ticked, total: 8, seconds })`.

- [ ] **Step 1: Failing tests** in `tests/speaking.test.mjs` with a compact fixture factory `okMock()`: `estimateMinutes of 12 + 6 questions is 14 and of 9 + 5 is under 12`; `buildSteps orders part1 then cue, prep, talk, roundingOff, then part3`; `buildSteps total equals q1+q3+4`; `validateSpeaking accepts okMock`; one test each rejecting: 2 topics, 3 bullets, `prepSeconds` 30, 7 Part 3 questions, estimate 10.5 min (too short), 2 vocab on a question, model that uses none of its vocab, Part 2 model of 120 words; `validateBank rejects 5 sections`.
- [ ] **Step 2:** `node --test tests/speaking.test.mjs` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `plan.js` and `tools/validate-speaking.mjs` (CLI: validates every `sN.json` listed in `content/speaking/mocks.json` plus `language-bank.json`; prints `N errors`, exit 1 on any).
- [ ] **Step 4:** `node --test tests/*.test.mjs` — Expected: PASS.
- [ ] **Step 5: Implement UI** (follow `skills/writing/index.html` + `task.js` structure, `tokens.css`/`base.css`/`hub.css`, accent `#c78a00`): `index.html` lists mocks from `mocks.json` and renders `language-bank.json` as collapsible sections; `mock/index.html?id=sN` + `runner.js`: intro screen (3 parts, 11–14 min), one step at a time from `buildSteps`; per-question 30 s soft timer, “Hear the examiner” button via `speechSynthesis` (hidden if unsupported), Part 2 cue card with 60 s prep countdown (notes textarea) then 120 s talk countdown, “Vocabulary help” side panel (words with band badge, meaning, example, phrases) default **on** with an “Exam mode” toggle that hides help and model answers, “Show model answer” after each step, final self-assessment of 8 ticks (2 per criterion: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation) → `recordAttempt`. Update `skills.json` speaking entry to `{ status:'live', path:'skills/speaking/', tagline:'3 full mock interviews with vocabulary help' }` and `assets/hub.js` line 29 so `type==='speaking-mock'` continues to `skills/speaking/mock/?id=${last.setId}` and `weakest()` labels it `Speaking mock`.
- [ ] **Step 6:** Commit `feat: speaking skill with mock interview runner`.

### Task 9: Speaking content (4 parallel sonnet agents, one file each)

**Files:** Create `content/speaking/s1.json`, `s2.json`, `s3.json`, `language-bank.json`; fill `content/speaking/mocks.json`

**Interfaces:** Consumes schema and rules in Task 8.
- `s1` — Part 1: Work or studies, Hometown, Weather; Part 2: “Describe a teacher who influenced you”; Part 3 theme: education.
- `s2` — Part 1: Food, Public transport, Reading; Part 2: “Describe a time you helped someone”; Part 3 theme: community and helping others.
- `s3` — Part 1: Home, Daily routine, Music; Part 2: “Describe a piece of technology you find useful”; Part 3 theme: technology and society.
- Vocab per question: 3–4 items mixing Band 7/8/9 (collocations, idioms, precise adjectives), each with plain meaning and a spoken-style example; models sound spoken (contractions allowed), not essay-like; Part 1 answers give a direct answer + reason + example.
- `language-bank.json`: ≥6 sections (e.g. buying thinking time, giving opinions, hedging and speculating, comparing, past experience, idioms by theme), ≥6 items each.
- `mocks.json`: `[{ id:'s1', title:'Speaking Mock 1', blurb }, …]`.

- [ ] **Step 1:** Fill `mocks.json` with three ids, run `node tools/validate-speaking.mjs` — Expected: FAIL (missing files).
- [ ] **Step 2:** Agents author their file; **Step 3:** run `node tools/validate-speaking.mjs` — Expected: `0 errors`. Fix by editing the flagged field only.
- [ ] **Step 4:** Browser smoke: `skills/speaking/mock/?id=s1` — step through to the end; confirm Part 2 shows 4 bullets, prep counts down from 01:00 then talk from 02:00, help panel toggles, exam mode hides help, finishing records an attempt (hub strip shows it), no console errors; repeat for `s2`, `s3` loading only.
- [ ] **Step 5:** Commit `content: speaking mocks and language bank`.

---

### Task 10: Wire-up, docs and final verification

**Files:** Modify `README.md`, `package.json`? (no), `assets/hub.js` only if Task 8 missed; model: **haiku** for README text, orchestrator for verification

- [ ] **Step 1:** Add to `README.md`: reading mocks `skills/reading/test/?id=m1|m2`, writing mocks at `skills/writing/#mocks`, speaking at `skills/speaking/`, and validation commands (`node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node --test tests/*.test.mjs`).
- [ ] **Step 2:** Run all four commands — Expected: `0 errors` ×3 and all tests pass.
- [ ] **Step 3:** Confirm counts with a node one-liner: reading mocks 40 items each and word totals within 2150–2750; 3 writing mocks each with 1 mixed Task 1 and 1 Task 2; 3 speaking mocks each estimating 11–14 min. Expected: printed table with no out-of-range values.
- [ ] **Step 4:** Hub smoke in browser: home page shows Speaking as live, all links resolve (no 404 in network log).
- [ ] **Step 5:** Commit `docs: mock exams readme`.

---

## Self-Review

- **Coverage:** 2 reading mocks (Tasks 1–4), 3 Task 1 multi-visual mocks (6), 3 Task 2 mocks (7), 3 speaking mocks with vocabulary help (8–9), format constraints enforced by validators; Review Focus lines map to Tasks 1, 4, 5, 7(8) as marked.
- **Known deviations to confirm with you:** existing `t1` is 2,842 words (above 2,750) and is left unchanged; “2 full mocks” is read as two *new* tests (`m1`, `m2`) alongside `t1`; Writing “mock exam” = Task 1 then Task 2 chained (20 + 40 min) rather than one combined 60-minute timer.
- **Risk:** reading question quality is the main way this can be wrong; Task 4’s independent blind-solve is the safeguard, and it costs about one extra agent run per mock.
