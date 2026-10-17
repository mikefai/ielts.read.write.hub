# Exam Structure Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Reading tests, Writing mocks and Speaking mocks present the same core structure and rubric wording as the model exam (Cambridge-style Academic Test 1, `test1.pdf`).

**Architecture:** Static site, no build. Rubric text is added at render time in the existing runners; content changes are JSON edits checked by the existing `tools/validate-*.mjs` validators and `node --test tests/*.test.mjs`.

**Tech Stack:** Vanilla ES modules, JSON content, `node:test`.

**Spec:** the model exam `C:\Users\MIKE\OneDrive\Desktop\test1.pdf` (scanned, 22 pages). Its structure, as read:

| Paper | Model exam |
|---|---|
| Reading | Header "READING PASSAGE n", then "You should spend about 20 minutes on Questions X–Y, which are based on Reading Passage n below." P1: notes completion 1–7 (ONE WORD ONLY), TFNG 8–13. P2 (sections A–G): matching information 14–17 ("Reading Passage 2 has seven sections, A–G. Which section contains the following information?"), summary completion 18–21, matching features 22–26 ("Match each statement with the correct person, A, B, C or D. NB You may use any letter more than once."). P3: MCQ 27–30 (A–D), summary word list 31–36 (A–I), YNNG 37–40. TFNG/YNNG ask "...given in Reading Passage 1?" / "...views of the writer in Reading Passage 3?" |
| Writing T1 | "You should spend about 20 minutes on this task." One visual (line graph). Prompt ends "Summarise the information by selecting and reporting the main features, and make comparisons where relevant." "Write at least 150 words." |
| Writing T2 | "You should spend about 40 minutes on this task." "Write about the following topic:" prompt; "Give reasons for your answer and include any relevant examples from your own knowledge or experience." "Write at least 250 words." |
| Speaking | P1: familiar topics, ~4 questions each. P2 cue: "Describe…", "You should say:" 3 prompts + "and explain…"; side note "You will have to talk about the topic for 1 to 2 minutes. You have 1 minute to think about what you are going to say. You can make some notes to help you if you wish." P3: "Discussion topics:" **two** named topics, 3 example questions each. |
| Listening | 4 parts, 40 questions. **No Listening module exists in this site — out of scope here; proposed as a separate project.** |

Current state (audited): Reading `t1` already mirrors the PDF type order and counts exactly; `m1`/`m2` match 3 passages, 13/13/14, 60 min. Study notes (`content/learn/*.json`) already state the right counts, timings and word minimums and cover every PDF question type. The gaps are below.

## Global Constraints

- No new dependencies, no build step. Match surrounding code style (terse, one-line comments only for the why).
- Exact rubric strings are copied verbatim from the table above (en dash `–` in ranges).
- Every task ends with the full check passing: `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs`
- Content is original (never copy PDF passages, data or questions); only rubric wording is copied.
- Commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Instruction text that does not contain "in the passage" (MCQ, completion) must render unchanged — pinned in Task 1 test.
- Speaking mocks whose Part 3 has 5 questions (s1, s3) must still validate as 3 + 2 — pinned in Task 3 test.
- Old saved speaking progress / `estimateMinutes` must count Part 3 questions across both topics — pinned in Task 3 test.
- Writing Task 1 pages that are not mocks keep their prompt and chart (rubric lines are added around, not replacing) — checked in browser (Task 4).
- Mixed-chart validation still works for `w1-m3` and `w1-mixed` after the mock rule changes — pinned in Task 2 test.

---

### Task 1: Reading test rubric

**Files:**
- Modify: `skills/reading/engine/runner.js` (add one export)
- Modify: `skills/reading/engine/test-runner.js:34-45`
- Modify: `content/reading/questions/matching-information/t1-matching-information.json`, `content/reading/questions/matching-features/t1-matching-features.json` (instructions only)
- Test: `tests/reading-rubric.test.mjs` (create)

**Interfaces:**
- Produces: `rubric(text: string, n: number) => string` in `runner.js` — replaces `given in the passage` → `given in Reading Passage n` and `writer in the passage` → `writer in Reading Passage n`; everything else unchanged.

- [ ] **Step 1: Write the failing test** `tests/reading-rubric.test.mjs`:
  - `rubric('Do the following statements agree with the information given in the passage? Write TRUE…', 1)` contains `given in Reading Passage 1?`
  - `rubric('…the views of the writer in the passage? Write YES…', 3)` contains `writer in Reading Passage 3?`
  - `rubric('Choose ONE WORD ONLY from the passage for each answer.', 2)` is returned unchanged.
- [ ] **Step 2:** `node --test tests/reading-rubric.test.mjs` → FAIL (no export `rubric`).
- [ ] **Step 3: Implement** `rubric` in `runner.js`; in `test-runner.js` render, per passage pane: `<p class="kicker">Reading Passage ${pi + 1}</p>` above the passage `<h2>`, and at the top of the question pane `<p class="muted">You should spend about 20 minutes on Questions ${ranges[pi][0]}–${ranges[pi][1]}, which are based on Reading Passage ${pi + 1} below.</p>`; pass group instructions through `rubric(set.instructions ?? '', pi + 1)`.
- [ ] **Step 4: Edit t1 content** so instructions match the PDF:
  - matching-information: `Reading Passage 2 has seven sections, A–G. Which section contains the following information? Write the correct letter, A–G.` (drop the NB; the PDF has none here — confirm no item answer repeats a letter, else keep the NB).
  - matching-features: `Look at the following statements and the list of people below. Match each statement with the correct person, A, B, C or D. NB You may use any letter more than once.` (only if the set has exactly 4 options; otherwise use the right letter range).
- [ ] **Step 5:** run the full check (Global Constraints) → all pass.
- [ ] **Step 6: Commit** `feat: reading tests show the exam rubric for each passage`

### Task 2: Writing rubric and single-visual mock Task 1

**Files:**
- Modify: `skills/writing/task.js:49-56` (prompt card)
- Modify: `tools/validate-writing.mjs:44-52` (mock rule)
- Modify: `tests/writing-mock.test.mjs` (mixed-rule tests)
- Replace content: `content/writing/task1/w1-m1.json` (single **line graph**), `content/writing/task1/w1-m2.json` (single **bar chart**). Keep `w1-m3.json` mixed.
- Modify: `README.md` line "Writing: … each Task 1 with several visuals" → "Task 1 is one visual in mocks 1–2 and a mixed visual in mock 3, then Task 2".

**Interfaces:**
- Consumes: existing task JSON shape — copy the shape of `content/writing/task1/w1-line.json` (keys `id, task, title, prompt, chart, model, guide, analysis, plan`) and `w1-bar.json`; `guide` must be `task1-chart`.

- [ ] **Step 1: Write the failing tests** in `tests/writing-mock.test.mjs`: a mocks list where two Task 1s are `mixed` → error matching `/one mixed/`; where only one is `mixed` → no mock-structure error; where none are mixed → no error. Delete/replace the old "must be a mixed chart" test.
- [ ] **Step 2:** `node --test tests/writing-mock.test.mjs` → FAIL.
- [ ] **Step 3:** In `validate-writing.mjs` replace `Task 1 must be a mixed chart` with: more than one mock whose Task 1 `chart.kind === 'mixed'` → `mocks: only one mock may use a mixed Task 1 (the exam usually shows one visual)`. Update the comment on line 44.
- [ ] **Step 4:** run test → PASS.
- [ ] **Step 5: Rewrite `w1-m1.json`** as one line graph (4 series, 4 time points, original topic and data — not US jobs), prompt in the PDF form: `The graph below gives information about … between … and …. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.` Full model, analysis and plan in the same depth as `w1-line.json`; model ≥ 150 words. **Rewrite `w1-m2.json`** the same way as a single bar chart (`The chart below shows …`). Keep titles meaningful; ids unchanged so `content/writing/mocks.json` is untouched.
- [ ] **Step 6: Rubric in `task.js`:** in the prompt card render `You should spend about ${minutes} minutes on this task.` before the prompt; for Task 2 also `Write about the following topic:` before the prompt (prompt in a bordered/bold box as now) and `Give reasons for your answer and include any relevant examples from your own knowledge or experience.` after it; then `Write at least ${minWords} words.` after the prompt/chart. Do not duplicate a sentence the prompt already contains (check `task.prompt.includes`).
- [ ] **Step 7:** run the full check → all pass.
- [ ] **Step 8: Commit** `feat: writing tasks show exam rubric; mock 1-2 Task 1 use one visual`

### Task 3: Speaking Part 3 as two discussion topics

**Files:**
- Modify: `skills/speaking/plan.js` (`estimateMinutes`, `buildSteps`)
- Modify: `skills/speaking/runner.js:44-60` (intro text, cue side note)
- Modify: `tools/validate-speaking.mjs:44-47`
- Modify: `tests/speaking.test.mjs`
- Modify content: `content/speaking/s1.json` … `s13.json` (`part3` only)

**Interfaces:**
- Produces: new shape `part3: { topics: [ { theme: string, questions: Question[] }, { theme, questions } ] }` (replaces `part3.theme` / `part3.questions`). Step `label` for Part 3 = that topic's `theme`.

- [ ] **Step 1: Update tests** in `tests/speaking.test.mjs`: `okMock(p1, p3 = [3, 3])` builds `part3.topics` from the array. Tests: `okMock()` validates clean; `okMock([3,3,3],[3,2])` validates clean; one topic → `/2 discussion topics/`; a topic with 4 questions → `/2-3 questions/`; `estimateMinutes(okMock([4,4,4],[3,3]))` equals 14; `buildSteps` Part 3 labels are `T3a`/`T3b` style theme names in order.
- [ ] **Step 2:** `node --test tests/speaking.test.mjs` → FAIL.
- [ ] **Step 3: Implement**: `plan.js` flattens `m.part3.topics` for the count and steps; validator requires exactly 2 topics, each a non-empty `theme` and 2–3 questions (errors `${id}: Part 3 needs 2 discussion topics`, `${id}: Part 3 topic "${theme}" needs 2-3 questions`), keeps the per-question `validateQ(…, [60, 110])` and the 11–14 minute check.
- [ ] **Step 4:** run test → PASS.
- [ ] **Step 5: Runner text**: intro Part 3 line → `<strong>Part 3</strong> &middot; a discussion of two topics linked to Part 2.`; on the `cue` and `prep` steps add under the cue box: `<p class="muted">You will have to talk about the topic for 1 to 2 minutes. You have 1 minute to think about what you are going to say. You can make some notes to help you if you wish.</p>`.
- [ ] **Step 6: Migrate content** for all 13 mocks: split the existing Part 3 questions into two named sub-topics in the PDF style (short noun-phrase names, e.g. for s4 "Holidays abroad" / "Effects of tourism"), 3 + 3 (or 3 + 2 for s1, s3). Questions, models, vocab and phrases are moved unchanged; reorder only. Keep the old theme idea in the sub-topic names.
- [ ] **Step 7:** run the full check → all pass.
- [ ] **Step 8: Commit** `feat: speaking Part 3 has two discussion topics like the exam`

### Task 4: Browser verification (controller)

- [ ] Serve with the preview server; open `skills/reading/test/?id=t1`, `?id=m1`: passage kicker, "You should spend about 20 minutes on Questions 1–13…", TFNG says "Reading Passage 1".
- [ ] `skills/writing/task/?id=w1-m1` (and via `#mocks`): one line graph, the 20-minute and 150-word lines; a Task 2 page shows "Write about the following topic:" and the 250-word line; `w1-line` still renders.
- [ ] `skills/speaking/mock/?id=s4`: cue side note present; Part 3 steps show two topic labels.
- [ ] No console errors on any page.
