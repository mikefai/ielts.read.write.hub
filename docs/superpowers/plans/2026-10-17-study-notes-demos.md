# Study Notes: "Watch it done" Demos and "Your turn" Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every study note (14 Reading, 14 Writing) first shows a student HOW the steps are done on a real example, thinking aloud one step at a time, and then lets them try two practice items themselves with a hidden answer and explanation.

**Architecture:** Two new optional-in-renderer, required-in-content fields on each note object, `demo` and `practice`, rendered by the existing `assets/core/learn.js` as two new sections placed right after "Do it in this order". No JavaScript interaction: practice answers hide behind native `<details>`. The validator enforces the new fields so content tasks are test-driven (CLI fails until a note has them).

**Tech Stack:** Vanilla ES modules, `node:test`, existing `learn.css`. No dependencies.

**Spec:** The user's request: "add practices where you show how it's done for all study notes. the student shouldn't just understand what they need to do but see how it's done first." Builds on `docs/superpowers/plans/2026-10-16-study-notes.md` (already merged: renderer `assets/core/learn.js`, validator `tools/validate-learn.mjs`, notes in `content/learn/reading.json` and `content/learn/writing.json`).

## Global Constraints

- Static site, ES modules, no new dependencies, no new JavaScript behaviour (practice answers use `<details>`/`<summary>`). All existing tests and the five validators stay green after every task except `node tools/validate-learn.mjs`, which is allowed to fail on notes not yet given a demo/practice until Task 8 completes.
- British spelling. Plain English for beginners: every demo `say` is 30 words or fewer and written as the teacher thinking aloud ("I underline…", "Now I check…"); every practice `why` is 40 words or fewer.
- Do not change note ids, `steps`, `tricks`, `traps`, `checklist`, `example` or `frames` text except where a task says so. Keep `content/learn/*.json` formatting (do not re-serialise whole files with `JSON.stringify`; append fields in place).
- All text is escaped on render. Colour is never the only signal; works in dark theme (existing CSS variables only) and at 375px with no horizontal scroll.
- Practice items use invented texts and prompts, never copied from `content/reading` or `content/writing`.
- Commit only files named in each task, by explicit path (the tree may hold unrelated uncommitted changes). Do not push.

## Review Focus

- A demo move whose `step` is out of range or goes backwards would show a wrong step label: validator rejects it.
- A `mark` (Reading) that is not a verbatim substring of the demo `text`, or a practice `evidence` not in its `text`, would render nothing or the wrong highlight: validator rejects it.
- Note objects with no `demo`/`practice` (old data, future types) must still render with no empty headings or the word "undefined".
- Practice answers must be hidden until the student opens them (no answer visible in the initial HTML outside `<details>`).
- Text containing `<`, `&` and quotes in demo/practice fields (e.g. `"rise" = "climb"`) renders as text, not markup.

## File Structure

- Modify `assets/core/learn.js` — add `renderDemo`, `renderPractice` (exported) and call them from `renderNote`.
- Modify `assets/core/learn.css` — styles for `.demo`, `.move`, `.practice`.
- Modify `tools/validate-learn.mjs` — validate `demo`/`practice`.
- Modify `content/learn/reading.json`, `content/learn/writing.json` — the 28 demos and 56 practice items.
- Modify `README.md` — one line describing demo/practice authoring.
- Tests: `tests/learn.test.mjs`, `tests/validate-learn.test.mjs`.

## Schema additions (used by every task)

```js
// added to each note object
demo: {
  prompt: string,            // Reading: the question/statement. Writing: the task prompt or the sentence to improve
  text?: string,             // Reading only: the short invented passage (labelled paragraphs inline, e.g. "A: ... B: ...")
  moves: [{                  // 4+ moves, in order; the teacher thinking aloud
    step: number,            // 1-based index into this note's `steps`, non-decreasing, <= steps.length
    say: string,             // <= 30 words, first person ("I underline...")
    mark?: string,           // Reading: verbatim substring of demo.text this move points at
    build?: string           // Writing: the sentence/paragraph as built SO FAR after this move
  }],
  answer: string             // Reading: the final answer. Writing: the finished sentence/paragraph (must equal the last move's `build`)
},
practice: [{                 // exactly 2 items; item 2 is slightly harder than item 1
  prompt: string,            // the question or instruction, ends by telling the student to use the steps
  text?: string,             // Reading: short invented passage
  options?: string[],        // Reading, where the type has fixed options (TFNG/YNNG options, MCQ A-D, heading list...)
  answer: string,
  why: string,               // <= 40 words: which step gives the answer and the proof
  evidence?: string          // Reading: verbatim substring of `text` proving the answer
}]
```

---

### Task 1: Render demo and practice

**Files:**
- Modify: `assets/core/learn.js`, `assets/core/learn.css`
- Test: `tests/learn.test.mjs`

**Interfaces:**
- Consumes: existing `renderNote(note: Note): string`, local `esc(s: string): string`, and the `<mark>` highlighting helper already used for `example.evidence` in `learn.js` (reuse it, do not duplicate).
- Produces:
  - `renderDemo(note: Note): string` — `''` when `note.demo` is absent; otherwise a section headed exactly **"Watch how it's done"** containing the prompt, the passage once (Reading), an `<ol class="demo">` with one `<li class="move">` per move showing a label `Step N` (N = `move.step`), the `say` text, a quoted `<mark>` snippet when `mark` is set, and a "So far:" block with `build` when set, then a final "Answer:" line with `demo.answer`.
  - `renderPractice(note: Note): string` — `''` when `note.practice` is absent/empty; otherwise a section headed exactly **"Your turn"** with one `.practice` block per item: its `prompt`, `text`, an options list when `options` exists, and a `<details><summary>Show the answer</summary>` holding the answer, the `why`, and the `evidence` marked inside `text` when both exist. Nothing of `answer`/`why` appears outside the `<details>`.
  - `renderNote` places both sections directly after the steps ("Do it in this order") and before "Tricks".

- [ ] **Step 1: Write failing tests** in `tests/learn.test.mjs`:
  - `renderDemo lists every move with its step label`: demo with 4 moves (steps 1,1,3,4) → output contains `Step 1` twice, `Step 3`, `Step 4`, every `say` string in order, and the heading `Watch how it&#39;s done` or `Watch how it's done` (match whichever form `esc` produces; assert on the rendered heading text with a regex `/Watch how it(&#39;|')s done/`).
  - `renderDemo highlights marks and shows build`: a move with `mark: 'rises sharply'` → output contains `<mark>rises sharply</mark>`; a move with `build` → output contains `So far` and the build text.
  - `renderDemo escapes markup`: `say: 'Check <b>"all"</b> & "only"'` → output contains `&lt;b&gt;` and not `<b>"all"`.
  - `renderPractice hides the answer inside details`: item with `answer: 'NOT GIVEN'`, `why: 'unique-why-text'` → both appear only after the index of `<details` in the output; `Show the answer` present; heading `Your turn` present.
  - `renderPractice shows options and marks evidence`: `options: ['TRUE','FALSE','NOT GIVEN']` → all three listed; `evidence` inside `text` wrapped in `<mark>` within the details.
  - `renderNote omits demo and practice when absent`: note without them → output has no `Your turn`, no `Watch how`, no `undefined`.
  - `renderNote orders sections`: for a note with both, index of "Do it in this order" < "Watch how" < "Your turn" < "Tricks".
- [ ] **Step 2: Run** `node --test tests/learn.test.mjs` → FAIL (`renderDemo` not exported).
- [ ] **Step 3: Implement** `renderDemo` and `renderPractice` per Interfaces in `assets/core/learn.js` and wire them into `renderNote`.
- [ ] **Step 4: Add CSS** in `learn.css`: `.note .demo` ordered list with each `.move` as a card (like `.step`) with a `.move-label` pill reading "Step N" (text label, not colour alone); `.note .build` as a left-bordered block; `.note .practice` card with a bold "Try {n}" label; `details > summary` styled as a button-like line with visible focus ring; only existing variables (`--ink`, `--paper`, `--line`, `--muted`, `--c`, `--accent`); `@media (max-width:600px)` stacks and `overflow-wrap:anywhere`.
- [ ] **Step 5: Run** `node --test tests/*.test.mjs` → all pass.
- [ ] **Step 6: Commit** `git add assets/core/learn.js assets/core/learn.css tests/learn.test.mjs && git commit -m "feat: render study-note demos and practice"`

---

### Task 2: Validator rules for demo and practice

**Files:**
- Modify: `tools/validate-learn.mjs`
- Test: `tests/validate-learn.test.mjs`

**Interfaces:**
- Consumes: `validateNotes(notes: Note[], kind: 'reading' | 'writing', requiredIds: string[]): string[]` as it exists.
- Produces: the same function now also checks, for EVERY note (no exemptions — the three Writing foundation notes and Reading `start-here` included): `demo` and `practice` rules below.

Rules to implement (error strings must contain the note id):
- `demo` missing → `/needs a demo/`; `demo.moves` fewer than 4 → `/demo needs 4/`; any `say` over 30 words → `/demo move.*over 30 words/`; `move.step` not an integer in `1..steps.length` → `/demo step/`; steps decreasing → `/demo steps must not go backwards/`; moves must reach at least 3 distinct step numbers → `/demo must cover/`; empty `answer` or `prompt` → error.
- Reading: `demo.text` required; every `mark` must be a substring of `demo.text` → `/mark not in text/`.
- Writing: the last move's `build` must equal `demo.answer` exactly → `/answer must equal last build/`; at least 2 moves must have `build`.
- `practice` missing or not exactly 2 items → `/needs 2 practice/`; each item needs non-empty `prompt`, `answer`, `why` (≤40 words → `/why over 40 words/`); Reading items need `text`; if `options` exists then `answer` must be among them (case-insensitive for TRUE/FALSE-style) → `/answer not in options/`; if `evidence` exists it must be a substring of `text` → `/evidence not in text/`.

- [ ] **Step 1: Write failing tests** (extend the existing `good` fixtures with `demo`/`practice`): valid reading and writing note → `[]`; one test per rule above asserting the matching regex; plus `note without demo and practice reports both`.
- [ ] **Step 2: Run** `node --test tests/validate-learn.test.mjs` → FAIL.
- [ ] **Step 3: Implement** the rules in `validateNotes`; keep existing rules untouched. Update the existing `good` fixtures in the test file so previously passing tests still pass.
- [ ] **Step 4: Run** the test file → PASS; `node --test tests/*.test.mjs` → PASS; `node tools/validate-learn.mjs` → expected to FAIL listing every note as needing a demo (content arrives in Tasks 3-8).
- [ ] **Step 5: Commit** `git add tools/validate-learn.mjs tests/validate-learn.test.mjs && git commit -m "feat: validate study-note demos and practice"`

---

### Task 3: Reading demos and practice — start-here, tfng, ynng, mcq

**Files:**
- Modify: `content/learn/reading.json` (add `demo` and `practice` to four existing notes in place)

**Interfaces:** Consumes the schema above, the validator (Task 2) and renderer (Task 1). Produces `demo`/`practice` on notes `start-here`, `tfng`, `ynng`, `mcq`.

- [ ] **Step 1: Verify failing** — `node tools/validate-learn.mjs` reports these four ids as needing a demo.
- [ ] **Step 2: Write the four demos and eight practice items.** Read each note's `steps` first: the demo applies THOSE steps in order, each move naming its `step` number, thinking aloud on a NEW invented passage (4-6 sentences, labelled paragraphs inline if more than one) so the student watches every step happen: underline keywords, predict the paraphrase, find the place, read around it, test the three answers, check small words. Brief per note:
  - `start-here`: demo the 5-step method on one TFNG-style statement over a 2-paragraph text (skim and label topics, keywords, predicted paraphrase, locate-and-read, confirm with a line). Practice: two short "which step goes wrong here?" items — prompt shows a student's wrong approach, the answer names the step they skipped (text may be empty; `options` lists the five step names).
  - `tfng`: demo one statement ending in NOT GIVEN (the hardest to see) showing the "line that says it / line that says opposite / neither" test and the silence-is-not-disagreement point. Practice 1 = TRUE answer, practice 2 = FALSE caused by one small word ("all"/"only"); `options` ['TRUE','FALSE','NOT GIVEN']; `evidence` set.
  - `ynng`: demo a writer's-view statement; show separating the writer's opinion from another person's. Practice 1 = YES, practice 2 = NOT GIVEN where another expert's view is quoted; `options` ['YES','NO','NOT GIVEN'].
  - `mcq`: demo reading the stem, then eliminating options one by one with a reason each (true-but-not-asked, half-right, too extreme). Practice 1 = single answer A-D, practice 2 = where one distractor is "true but not asked"; `options` four lettered strings; answer is the letter plus text, e.g. "C".
- [ ] **Step 3: Verify** — `node tools/validate-learn.mjs` reports no errors mentioning these four ids; `node --test tests/*.test.mjs` passes; JSON valid; open `/skills/reading/learn/#tfng` (`npx serve .`) and check the demo reads clearly, the answer is hidden until "Show the answer" is opened, and dark theme plus 375px look right.
- [ ] **Step 4: Commit** `git add content/learn/reading.json && git commit -m "content: reading demos and practice, part 1"`

---

### Task 4: Reading demos and practice — gap-fill types

**Files:**
- Modify: `content/learn/reading.json`

**Interfaces:** produces `demo`/`practice` on `short-answer`, `sentence-completion`, `summary-completion`, `summary-wordbank`, `notes-completion`, `diagram-labelling`.

- [ ] **Step 1: Verify failing** — validator lists these six ids.
- [ ] **Step 2: Write six demos and twelve practice items**, same method as Task 3 (new invented passages; each move names its step; thinking aloud). Brief:
  - `short-answer`: demo reading the word limit first, using the question word to predict the answer type, locating via the question's keywords, copying exactly. Practice: one "how many/when" answer and one "NO MORE THAN TWO WORDS" answer.
  - `sentence-completion`: demo predicting the word type from grammar around the gap, then finding and copying exact words. Practice: a noun gap; a gap after "an" (vowel sound).
  - `summary-completion`: demo finding which part of the passage the summary covers, then paraphrase-matching two gaps in order. Practice: two-gap summaries.
  - `summary-wordbank`: demo deciding each gap's word type, crossing out used words, reading the finished summary. `options` = the word list (more words than gaps); practice answers are the correct word per item (one gap per item).
  - `notes-completion`: demo following the passage order/headings, predicting a number or name, obeying ONE WORD (include a hyphenated word counting as one). Practice: a number gap; a ONE WORD gap.
  - `diagram-labelling`: the diagram cannot be drawn, so describe it in `prompt` as a short flow ("Box 1 → Box 2 → Box 3 with Box 2 missing") and demo following the process in order. Practice: two missing-box items from a described 3-stage process.
- [ ] **Step 3: Verify** — validator shows no errors for these six; full tests pass; spot-check `/skills/reading/learn/#notes-completion` (answer hidden until opened, 375px, dark theme).
- [ ] **Step 4: Commit** `git add content/learn/reading.json && git commit -m "content: reading demos and practice, part 2"`

---

### Task 5: Reading demos and practice — matching types

**Files:**
- Modify: `content/learn/reading.json`

**Interfaces:** produces `demo`/`practice` on `matching-headings`, `matching-information`, `matching-features`, `matching-endings`. After this task `node tools/validate-learn.mjs` has no Reading errors.

- [ ] **Step 1: Verify failing** — validator lists these four ids.
- [ ] **Step 2: Write four demos and eight practice items.** Matching needs a multi-paragraph `text` (3 short labelled paragraphs inline: "A: … B: … C: …") and `options` (headings / names / sentence endings). Brief:
  - `matching-headings`: demo reading the first and last sentence of a paragraph, naming its main idea, rejecting a heading that matches only a detail, crossing out used headings. Practice: two paragraphs each needing a heading from a list that includes extras.
  - `matching-information`: demo scanning for the paraphrase of one detail across paragraphs and finding the letter. Practice: two details, one whose paragraph letter was already used.
  - `matching-features`: demo underlining each name, then matching a claim to the speaker via the opinion verb. Practice: two claims, options reusable.
  - `matching-endings`: demo ruling out endings by grammar first, then matching meaning, then confirming with a line (the grammar filter must remove at least one ending). Practice: two sentence starts with the same five endings.
- [ ] **Step 3: Verify** — `node tools/validate-learn.mjs` shows no errors for ANY Reading id (only Writing ids remain); tests pass; spot-check `/skills/reading/learn/#matching-headings`.
- [ ] **Step 4: Commit** `git add content/learn/reading.json && git commit -m "content: reading demos and practice, part 3"`

---

### Task 6: Writing demos and practice — foundation notes and Task 1 chart/pie

**Files:**
- Modify: `content/learn/writing.json` (add fields in place; do not re-serialise the file)

**Interfaces:** produces `demo`/`practice` on `band-criteria`, `timing-and-planning`, `grammar-fixes`, `task1-chart`, `task1-pie`.

- [ ] **Step 1: Verify failing** — validator lists these five ids.
- [ ] **Step 2: Write five demos and ten practice items.** Writing demos are BUILT step by step: each move names its note `step`, says what the teacher is deciding, and `build` shows the sentence/paragraph so far, growing until `answer` equals the last `build`. Writing practice: `prompt` gives a small task with the weak or incomplete text embedded; `answer` is a model; `why` names the step. Brief:
  - `band-criteria`: demo scoring ONE short paragraph against the four criteria in turn, then improving one criterion and showing the `build` change. Practice: "Which criterion is weak here?" with `options` the four criteria; answers differ between the two items.
  - `timing-and-planning`: demo spending 5 planning minutes on a Task 1 prompt: read the visual, pick 2-3 features, group, choose overview words; `build` = the plan notes. Practice: split 40 minutes for a Task 2 essay; fix a plan that starts writing at minute 2.
  - `grammar-fixes`: demo correcting one learner sentence with three errors one at a time (`build` shows it improving). Practice: two sentences to correct; `answer` the corrected sentence.
  - `task1-chart`: demo building intro paraphrase, then an overview, then one comparison sentence for an invented bar-chart prompt (state the data in the `prompt`, e.g. "Cycling rose from 20% to 35%, cars fell from 50% to 40%"). Practice: write an overview from given data; write a peak/trough sentence.
  - `task1-pie`: demo comparing slices within and across two pies in an invented prompt. Practice: a "largest share" sentence; a "doubled" comparison sentence.
- [ ] **Step 3: Verify** — validator no errors for these five; the last `build` equals `answer` in each (validator enforces); full tests pass; spot-check `/skills/writing/learn/#task1-chart` (build blocks grow readably, answer hidden, 375px, dark theme).
- [ ] **Step 4: Commit** `git add content/learn/writing.json && git commit -m "content: writing demos and practice, part 1"`

---

### Task 7: Writing demos and practice — table, map, process, mixed

**Files:**
- Modify: `content/learn/writing.json`

**Interfaces:** produces `demo`/`practice` on `task1-table`, `task1-map`, `task1-process`, `task1-mixed`.

- [ ] **Step 1: Verify failing** — validator lists these four ids.
- [ ] **Step 2: Write four demos and eight practice items** as in Task 6 (invented data stated in `prompt`; only facts in the prompt may appear in `build`). Brief:
  - `task1-table`: demo picking the highest, lowest and one surprising cell, then writing a ranking sentence and a contrast sentence.
  - `task1-map`: demo writing a "was demolished and replaced by" sentence with correct past tense and a compass direction ("to the north-east of"), then the overview sentence.
  - `task1-process`: demo turning three stages into sentences with sequencers and present simple passive ("is heated"), then an overview that counts the stages.
  - `task1-mixed`: demo a combined intro covering two visuals, then one linking comparison sentence.
- [ ] **Step 3: Verify** — validator no errors for these four; tests pass; spot-check `/skills/writing/learn/#task1-process`.
- [ ] **Step 4: Commit** `git add content/learn/writing.json && git commit -m "content: writing demos and practice, part 2"`

---

### Task 8: Writing demos and practice — Task 2 essays; docs

**Files:**
- Modify: `content/learn/writing.json`, `README.md`

**Interfaces:** produces `demo`/`practice` on `opinion`, `discussion`, `problem-solution`, `two-part`, `advantages`. After this task `node tools/validate-learn.mjs` → `0 errors`.

- [ ] **Step 1: Verify failing** — validator lists these five ids.
- [ ] **Step 2: Write five demos and ten practice items** (same method; `prompt` is an invented essay question). Each demo builds the four-part structure in order: analyse the question, state the position or answer plan, write a topic sentence, add reason/explanation/example for one body paragraph (`build` = that paragraph growing sentence by sentence). Practice items: write a thesis/introduction sentence; fix a body paragraph topic sentence that is off-question. Brief:
  - `opinion`: clear position in the introduction.
  - `discussion`: both views plus own opinion.
  - `problem-solution`: problem one + its solution in one paragraph (house rule: one problem and its solution per body paragraph).
  - `two-part`: two questions answered in separate paragraphs; neutral intro line.
  - `advantages`: strongest side first, weaker side second (house rule).
- [ ] **Step 3: Update `README.md`**: one bullet under the Study notes line saying each note has a `demo` (think-aloud walk-through) and two `practice` items, and that `node tools/validate-learn.mjs` enforces them.
- [ ] **Step 4: Verify** the full chain: `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs` → all pass.
- [ ] **Step 5: Commit** `git add content/learn/writing.json README.md && git commit -m "content: writing demos and practice, part 3; docs"`

---

## Self-Review

- **Spec coverage:** "all study notes" → Tasks 3-8 cover all 28 ids (4 + 6 + 4 Reading = 14; 5 + 4 + 5 Writing = 14). "See how it's done first" → `demo` sits directly after the steps and before tricks/traps (Task 1 ordering test). "Practices" → exactly 2 `practice` items per note with hidden answers.
- **Type consistency:** `demo.moves[].step/say/mark/build`, `demo.answer`, `practice[].prompt/text/options/answer/why/evidence` are identical in the Schema block, Task 1 renderer, Task 2 validator and content tasks.
- **Review Focus coverage:** out-of-range/backwards steps, bad `mark`/`evidence`, absent fields, hidden answers, escaping — each has a Task 1 test or a Task 2 rule.
- **Proportion:** code is small (two render functions, one validator extension); the bulk is content, which is the point of the request.
