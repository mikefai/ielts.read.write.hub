# Band 8 Strategies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every study note a "From band 6.5 to band 8" strategy layer, and add Speaking study notes, all matched to the current (October 2026) IELTS Academic exam.

**Architecture:** One new optional note field, `band8`, rendered by the shared `assets/core/learn.js` and checked by `tools/validate-learn.mjs`. Content is added to `content/learn/reading.json` and `writing.json`, plus a new `content/learn/speaking.json` shown on a new `skills/speaking/learn/` page that reuses `mountLearn`. A last task makes `band8` required everywhere.

**Tech Stack:** Vanilla ES modules, JSON content, `node:test`. No build, no new dependencies.

**Spec:** the user's request ("strategies to answer each question correctly and improve their score as high as band 8 … match the current IELTS Academic exam") and the exam facts below. Checked 17 Oct 2026 on ielts.org format pages, plus the ielts-academic-instructor snapshot (verified 7 Oct 2026):

| Paper | Current facts to match |
|---|---|
| Delivery | Computer-delivered everywhere since mid-2026 (Writing on Paper in some markets, including Turkey). Answers are typed on screen as you go; there is **no transfer time**. On-screen word count; highlight and notes tools exist. Speaking is **face-to-face** with an examiner and is recorded. |
| Reading | 60 min, 3 passages, 40 questions, 2,150–2,750 words, 11 question types, 1 mark each. Band 8 ≈ **35/40** (the site's `skills/reading/engine/band.js` table: 35 → 8, 33 → 7.5, 30 → 7, 27 → 6.5). This is approximate, not an official conversion; always say "about". |
| Writing | 60 min. Task 1: ≥150 words, ~20 min, "one or more graphs, charts or tables, or a diagram". Task 2: ≥250 words, ~40 min, and it counts **twice as much** as Task 1. Criteria (25% each): Task Achievement (T1) / Task Response (T2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Full sentences only, no bullet points. |
| Speaking | 11–14 min. Part 1: 4–5 min, familiar topics. Part 2: 1 min preparation with notes, talk for up to 2 min (the examiner stops you), then 1–2 follow-up questions. Part 3: 4–5 min, abstract discussion linked to Part 2. Criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation. |

No newer public band descriptors were found, so band 8 wording follows the current public descriptors (Writing: "fully developed", "skilfully manages paragraphing", "wide range … precise meaning", "majority of sentences error-free"; Speaking: "fluent with only very occasional repetition", "wide vocabulary resource readily and flexibly", "wide range of structures flexibly", "easy to understand throughout"). Paraphrase these; do not quote long stretches.

## Global Constraints

- `band8` item shape: `{ "typical": string, "band8": string }`, plus `"criterion": string` for writing and speaking notes. Each text is **≤ 35 words**; a note has **4–6** items.
- Writing `criterion` is one of: `Task Achievement`, `Task Response`, `Coherence and Cohesion`, `Lexical Resource`, `Grammatical Range and Accuracy`. Speaking `criterion` is one of: `Fluency and Coherence`, `Lexical Resource`, `Grammatical Range and Accuracy`, `Pronunciation`.
- `typical` = what a band 6–6.5 learner actually does (concrete, observable). `band8` = the specific move that fixes it (an action the learner can do next time, not "be more accurate").
- Plain learner English, the same register as the existing notes (short sentences, second person). Original content only; never copy Cambridge or other published material.
- Never state unconfirmed computer-test details as fact (Listening review time, spell-check, keyboard layout, drag-and-drop mechanics). Never quote fees or dates.
- Do not change existing note fields except where a task says so.
- Full check, run before every commit: `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs`
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A note without `band8` (before Task 5) must still render and validate: covered by a Task 1 test.
- A `band8` text with `<`, `&` or quotes must be escaped: covered by a Task 1 test.
- Reading `band8` items must not carry a `criterion`, because Reading has no criteria: covered by a Task 1 test.
- Speaking `start-here` has no worked example or frames and must still validate: covered by a Task 4 test.
- The new Speaking notes page loads on phone width with no horizontal scroll: checked in the browser in Task 5.

---

### Task 1: `band8` field: render and validate

**Files:**
- Modify: `assets/core/learn.js` (`renderNote`)
- Modify: `tools/validate-learn.mjs` (`validateNotes`)
- Modify: `assets/core/learn.css` (one small block for the new section)
- Test: `tests/learn.test.mjs`, `tests/validate-learn.test.mjs`

**Interfaces:**
- Produces: `renderNote(n)` outputs, when `n.band8?.length`, a section titled `From band 6.5 to band 8` placed right after "Your turn" (practice). Each item renders as `<li class="b8">` with an optional `<span class="chip">criterion</span>`, `<p class="typical"><b>Typical 6.5:</b> …</p>` and `<p class="band8"><b>Band 8:</b> …</p>`.
- Produces: `validateNotes(notes, kind, requiredIds, { requireBand8 = false } = {})`. Rules when `band8` is present (or required): 4–6 items; `typical` and `band8` are non-empty and ≤ 35 words; `criterion` must be absent for `reading`, and present and in the kind's list for `writing`/`speaking`. Export `CRITERIA = { writing: [...], speaking: [...] }`. Error text starts `${kind} "${id}": band8 …`.

- [ ] **Step 1: Write the failing tests.** `learn.test.mjs`: a note with 4 band8 items renders the `From band 6.5 to band 8` heading and 4 `class="b8"` items; `typical: 'a < b & "c"'` comes out escaped; a note without `band8` has no such heading. `validate-learn.test.mjs`: a valid reading note with 4 items gives no band8 errors; 3 items → `/band8/`; a 36-word `band8` text → `/35 words/`; a reading item with `criterion` → `/criterion/`; a writing item with `criterion: 'Vocabulary'` → `/criterion/`; with `{ requireBand8: true }`, a note without `band8` → `/band8/`.
- [ ] **Step 2:** `node --test tests/learn.test.mjs tests/validate-learn.test.mjs` → FAIL.
- [ ] **Step 3: Implement** both functions and the CSS (two-line card: the typical line muted, the band 8 line bold, in the existing theme tokens; works in dark mode).
- [ ] **Step 4:** run the tests → PASS; run the full check → PASS (existing content has no `band8`, so nothing changes).
- [ ] **Step 5: Commit** `feat: study notes can show a band 6.5 to band 8 strategy section`

### Task 2: Reading band 8 strategies (14 notes)

**Files:** Modify `content/learn/reading.json` (add `band8` to all 14 notes).

**Interfaces:** Consumes the Task 1 item shape (no `criterion`).

- [ ] **Step 1:** For each note add 4–6 items specific to that question type. Make every item a concrete answering habit. Examples of the level wanted (do not reuse word-for-word): TFNG, typical "chooses False when the passage simply doesn't mention it" → band 8 "before writing False, find the line that says the opposite; no line means Not Given". Matching headings: typical "matches a heading to a word in the first sentence" → band 8 "reads the whole paragraph and picks the heading for its main point, not its first detail".
- [ ] **Step 2: `start-here` must cover the score plan:** band 8 is about 35/40, so at most about 5 mistakes in the whole paper, about 1–2 per passage. Leave about 2 minutes per passage to check gaps for spelling and word limits. Answers are typed as you go and there is no transfer time. Only one 60-minute clock runs; 20 minutes per passage is a guide.
- [ ] **Step 3:** `node tools/validate-learn.mjs` → 0 errors; full check → PASS.
- [ ] **Step 4: Commit** `content: band 8 strategies for every reading question type`

### Task 3: Writing band 8 strategies (14 notes) and one computer-test fix

**Files:** Modify `content/learn/writing.json`.

**Interfaces:** Consumes the Task 1 item shape with `criterion` (writing list).

- [ ] **Step 1:** Add `band8` (4–6 items) to all 14 notes. Each Task 1/Task 2 note covers all four criteria at least once, using `Task Achievement` for task1-* and `Task Response` for Task 2 types. Align with, and never contradict, the `band8` lists for the same type in `content/writing/guides.json`. Use concrete moves, e.g. Task 1, typical "describes every number in order" → band 8 "groups the data, gives the overview first, and supports it with 2–3 selected figures per paragraph".
- [ ] **Step 2:** `band-criteria`: the items explain what band 8 looks like per criterion in learner terms, and that Task 2 counts twice as much as Task 1. `timing-and-planning`: replace the step/trick that says "Learn how many lines about 150 or 250 words takes in your handwriting" with typing on screen and the on-screen word count, adding "if you take Writing on Paper, count lines in your handwriting". Edit only that sentence.
- [ ] **Step 3:** `node tools/validate-learn.mjs` → 0 errors; full check → PASS.
- [ ] **Step 4: Commit** `content: band 8 strategies for every writing note`

### Task 4: Speaking study notes

**Files:**
- Create: `content/learn/speaking.json`, `skills/speaking/learn/index.html` (copy the structure of `skills/reading/learn/index.html`: back link `../index.html` "← Speaking", kicker "Speaking · Study notes", accent `#c78a00`)
- Modify: `tools/validate-learn.mjs` (add kind `speaking`, required ids `['start-here', 'part1', 'part2', 'part3']`; it follows the writing rules, with `start-here` exempt from example and frames)
- Modify: `skills/speaking/index.html` (a "Study notes" link above "Mock interviews"), `skills.json` (speaking tagline → `Study notes, 13 mock interviews and a language bank`; the current "3" is stale)
- Test: `tests/validate-learn.test.mjs`

**Interfaces:** Consumes `mountLearn` and `renderNote` from Task 1 and the `speaking` criteria list.

- [ ] **Step 1: Failing test:** `validateNotes` for kind `speaking` with a `start-here` note that has no example and no frames gives no example/frames errors, and a `part1` note without frames gives `/frames/`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement the validator change → PASS.
- [ ] **Step 4: Write the 4 notes** in the existing note schema (`what`, 5+ `steps`, `tricks`/`traps`/`checklist` 3+, `demo` with builds covering every step, 2 `practice`, `band8` 4–6 with speaking criteria; parts also have `frames` 2+×3+ and `example` weak/strong/why):
  - `start-here`: format and timings from the spec table, the four criteria, and that the interview is face-to-face and recorded. Answers are not scored for "correct" opinions.
  - `part1`: direct answer + reason + example (1–3 sentences, about 20–30 seconds); natural, not memorised.
  - `part2`: use the minute to note keywords for each prompt, follow the prompt order, keep talking until stopped, and handle the follow-up questions.
  - `part3`: give an opinion, explain it, compare or speculate, use hedging; abstract and general, not personal stories.
  - Demos build a spoken answer step by step (`build` = the answer so far). Practice items give a question and a model answer with `why`.
- [ ] **Step 5:** full check → PASS.
- [ ] **Step 6: Commit** `feat: speaking study notes with band 8 strategies`

### Task 5: Require `band8` everywhere and verify (controller)

- [ ] **Step 1:** in the `validate-learn.mjs` CLI block, call `validateNotes(..., { requireBand8: true })` for all three kinds; full check → PASS.
- [ ] **Step 2:** browser at `http://localhost:8123`: `skills/reading/learn/#tfng`, `skills/writing/learn/#opinion` and `skills/speaking/learn/#part2` show the band 8 section with criterion chips (writing and speaking only); the speaking hub links to the notes; there are no console errors; at 375 px there is no horizontal scroll; dark mode is readable.
- [ ] **Step 3: Commit** `test: every study note must carry band 8 strategies`
