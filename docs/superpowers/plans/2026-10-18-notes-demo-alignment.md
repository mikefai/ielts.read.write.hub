# Notes Demo Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Run every content task on a small model (Haiku).** The validator in Task 1 is the safety net: Haiku edits until it passes.

**Goal:** In every Reading and Writing study note, the "Watch how it's done" column performs exactly what the "Do it in this order" step beside it says, including body paragraph 1 AND body paragraph 2, and the notes match real IELTS Academic (computer-delivered) wording and rules.

**Architecture:** No renderer change and no step renumbering. Fix the data in `content/learn/*.json` (add missing demo moves) and tighten `tools/validate-learn.mjs` so the gap cannot return. Then one fact-check pass of the notes against real IELTS instructions.

**Tech Stack:** Vanilla ES modules, `node:test`, JSON content.

**Spec:** The user's request (screenshot of `#opinion`): step 6 "Write two body paragraphs" shows only body paragraph 1 moves; body paragraph 2 never appears. Builds on `docs/superpowers/plans/2026-10-17-study-notes-demos.md` (renderer `assets/core/learn.js`, validator `tools/validate-learn.mjs`).

## Global Constraints

- British spelling; each demo `say` is 30 words or fewer, first person, teacher thinking aloud ("I start body paragraph two with…").
- Do not change note ids, step `do`/`why` text, tricks, traps, checklist, example, frames, or practice, except Task 3 where it names the line.
- Edit `content/learn/*.json` in place (Edit tool on the specific move). Never re-serialise a whole file with `JSON.stringify`.
- A move's `build` is the whole text built so far (existing convention). Writing `demo.answer` must equal the last move that has a `build`.
- Real IELTS Academic facts to respect (computer-delivered): Writing is 60 minutes; Task 1 at least 150 words (about 20 min), Task 2 at least 250 words (about 40 min). Reading is 60 minutes, 40 questions, 3 passages, no extra transfer time (answers are typed on screen).
- Commit only named files by explicit path. Do not push.

## Review Focus

- Task 2 notes where the two body paragraphs are different in kind (discussion = view 1 then view 2; two-part = question 1 then question 2; advantages = stronger side then weaker side): body 2 moves must follow that note's own step text, not a copy of body 1.
- Task 1 notes where the body is "one paragraph per visual" (`task1-mixed`) or "describe in order" (`task1-map`, `task1-process`, `task1-pie`): the new moves must follow that note's step wording, not "two groups".
- A final "check" step (last step of most notes) has a move that does not alter the text: its `build` must equal the previous build so the answer still matches.
- `band-criteria`, `timing-and-planning`, `grammar-fixes` have no body paragraphs but still skip steps.
- Reading notes with a "no example" or "not needed" step must keep their explicit "not needed" move, not an empty gap.

## File Structure

- Modify `tools/validate-learn.mjs` — two new rules for writing notes; relax answer rule.
- Modify `tests/validate-learn.test.mjs` — tests for the rules.
- Modify `content/learn/writing.json` — add missing demo moves (14 notes).
- Modify `content/learn/reading.json` — fact fixes only (Task 3).

### Task 1: Validator rejects steps with no demo move

**Files:**
- Modify: `tools/validate-learn.mjs` (`checkDemoPractice`, around lines 36-44)
- Test: `tests/validate-learn.test.mjs` (follow its existing builders)

**Interfaces:**
- Produces: error strings used by Tasks 2-3 to know what is left:
  - `` `${at}: step ${n} has no demo move` `` for writing notes, for every step number 1..stepCount with no move.
  - `` `${at}: step ${n} says "${word}" but the demo has fewer moves than a body-paragraph pair` `` is NOT added; keep it to the one rule above.

- [ ] **Step 1: Write failing tests** in `tests/validate-learn.test.mjs`:
  - `writing note with a step that has no move is rejected`: a valid writing note fixture with 8 steps and moves covering only steps 1-5 and 7 gives an error matching `/step 6 has no demo move/`.
  - `reading note with a step that has no move is allowed`: a reading fixture with a gap passes (reading keeps its explicit "Not needed" convention).
  - `writing answer may differ from a trailing move without build`: moves end with a check move that has no `build`; `answer` equals the last move that has a `build`; no error.
- [ ] **Step 2: Run** `node --test tests/validate-learn.test.mjs` — expect the three new tests FAIL.
- [ ] **Step 3: Implement** in `checkDemoPractice`: (a) for `kind === 'writing'`, push the "has no demo move" error for each uncovered step; (b) replace `const last = moves.at(-1)` with the last move for which `hasBuild(m)` is true, and compare its `build` to `d.answer`.
- [ ] **Step 4: Run** `node --test tests/validate-learn.test.mjs` — expect PASS. Then `node tools/validate-learn.mjs` — expect it to FAIL, listing the writing gaps (this list is the work for Task 2; save it).
- [ ] **Step 5: Commit**

```bash
git add tools/validate-learn.mjs tests/validate-learn.test.mjs
git commit -m "test: require a demo move for every writing step"
```

### Task 2: Add the missing demo moves in Writing notes

**Files:**
- Modify: `content/learn/writing.json`

**Interfaces:**
- Consumes: the error list from Task 1 Step 4 plus the body-paragraph gaps below.
- Produces: all 14 writing notes pass `node tools/validate-learn.mjs`.

Known gaps (from the audit; the validator may list more, fix those too). Moves per step now → required:

| Note | Step wording to perform | Missing |
|---|---|---|
| opinion | S6 two body paragraphs | body 2 (topic sentence, explanation, example) for reason two (safer streets); S4 plans only reason 1: add a move for reason two |
| discussion | S6 body paragraph two for second view | body 2 moves ×3 (S5/S6 per its steps; follow the step numbers in the note) |
| problem-solution | S6 body paragraph two (problem two) | all S6 moves (currently none) |
| two-part | S6 body paragraph two answers question 2 | body 2 moves |
| advantages | S6/S7 per its step wording | the weaker-side body paragraph moves |
| task1-chart | S2, S3, S5.., S6 two body paragraphs, S7 check | S2, S3, second body paragraph, S7 |
| task1-pie | S1, S4, S5, S7 | S1, S4, S5, S7, body 2 |
| task1-table | S5, S7 | S5, S7 |
| task1-map | S7 | S7 |
| task1-process | S3, S7 | S3, S7 |
| task1-mixed | S3, S4, S7 | S3, S4, S7, one body move per visual |
| band-criteria, timing-and-planning, grammar-fixes | any uncovered step | one short move each |

- [ ] **Step 1: For each note, one at a time**, print its steps and moves with:
  `node -e "const n=JSON.parse(require('fs').readFileSync('content/learn/writing.json','utf8')).find(x=>x.id==='ID');n.steps.forEach((s,i)=>console.log('S'+(i+1),s.do));n.demo.moves.forEach(m=>console.log('M'+m.step,m.say))"`
- [ ] **Step 2: Insert the missing moves** with the Edit tool, in step order, so steps never go backwards. Each new body-paragraph move says which paragraph it writes ("Now body paragraph two. I start with a topic sentence for the second reason."). Each move that writes text carries a `build` = previous build + the new sentence(s) with a single space. A check move (S7/S8) carries `say` only plus `build` equal to the previous build. The demo's final text must still end with the conclusion; if the conclusion move comes before a trailing check move, give the check move `build` equal to the conclusion build and keep `demo.answer` equal to it.
- [ ] **Step 3: Run** `node tools/validate-learn.mjs` — expect `0 errors`. Then `node --test` — expect all pass.
- [ ] **Step 4: Look at the page** for `#opinion`, `#discussion`, `#task1-chart` (open `skills/writing/learn/`): each step cell now has a demo move beside it; body 1 and body 2 both appear under the body step.
- [ ] **Step 5: Commit**

```bash
git add content/learn/writing.json
git commit -m "content: demo shows body paragraph two and every writing step"
```

### Task 3: Fact-check notes against real IELTS Academic wording

**Files:**
- Modify: `content/learn/reading.json`, `content/learn/writing.json` (only lines that are wrong)

**Interfaces:**
- Consumes: Task 2 finished (so no merge clashes in `writing.json`).

Search each file for the phrases below with Grep and correct only where the note contradicts the fact. Keep length and tone.

- [ ] **Step 1: Checks** (fact → what to look for):
  - Computer-delivered Reading and Writing have **no paper answer sheet and no 10-minute transfer time**. A note that says you "write them on the answer sheet as you go" must say you type your answers on screen as you go (Reading is 60 minutes with no extra time).
  - True/False/Not Given is about **facts/information**; Yes/No/Not Given is about the **writer's views or claims**. Real wording: TRUE = "agrees with the information", FALSE = "contradicts the information", NOT GIVEN = "there is no information on this"; YES = "agrees with the views of the writer", NO = "contradicts the views of the writer". Make sure `tfng` and `ynng` do not swap these.
  - Completion tasks: the word limit is in the instructions (e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER, or ONE WORD ONLY); words are copied from the passage; spelling counts; a hyphenated word counts as one word; answers appear in passage order. Word-bank summaries: more words than gaps, and the word must fit grammatically.
  - Matching types: matching headings has more headings than paragraphs and each heading is used once; matching information and matching features may use a letter more than once when the instructions say so and are **not** in passage order; matching sentence endings has more endings than sentence starts, and the questions follow passage order.
  - MCQ: choose one letter A-D, or if the instruction says "Choose TWO letters", pick exactly that many, in any order.
  - Writing: Task 1 "Summarise the information by selecting and reporting the main features, and make comparisons where relevant" (at least 150 words, about 20 minutes). Task 2 "Give reasons for your answer and include any relevant examples from your own knowledge or experience" (at least 250 words, about 40 minutes). Task 1 needs an overview; Task 2 must answer every part of the question.
- [ ] **Step 2: Edit** each wrong line in place. If every check already holds, change nothing and say so.
- [ ] **Step 3: Run** `node tools/validate-learn.mjs` and `node --test` — expect `0 errors` and all tests pass.
- [ ] **Step 4: Commit**

```bash
git add content/learn/reading.json content/learn/writing.json
git commit -m "content: align notes with real IELTS Academic instructions"
```

## Self-Review

- Spec coverage: body 1 + body 2 match (Task 2), every step has a move (Task 1 rule + Task 2), real IELTS wording (Task 3), Reading unchanged where already 1:1 (audit showed all reading steps already have a move).
- Types: only error strings and the existing note schema are involved; no new names.
- Proportion: three tasks, data edits dominate; no code beyond one validator tweak.
- Not covered (by design): renumbering steps, a renderer label for "body 1 / body 2", lengthening demo essays to 250 words (the note already says it is a partial essay).
