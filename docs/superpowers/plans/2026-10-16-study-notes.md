# Study Notes ("Learn") Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Study notes" section to the Reading and Writing skills that teaches struggling students, in plain step-by-step language, exactly how to answer every Reading question type and every Writing task type, with tips, traps and worked examples.

**Architecture:** Notes are data (`content/learn/reading.json`, `content/learn/writing.json`), one object per question/task type, rendered by one shared DOM-light module (`assets/core/learn.js`) into a `learn/` page under each skill. A validator (`tools/validate-learn.mjs`) enforces completeness and plain-English limits, so content tasks are test-driven: validator fails on missing notes, then passes. Existing pages link into the notes by note id.

**Tech Stack:** Vanilla ES modules, `node:test`, existing `tokens.css` / `base.css` / `hub.css` classes (`.toc`, `.card`, `.section-title`). No build step, no dependencies.

**Spec:** The request that started this plan: "build a new section to reading and writing skills teaching how to answer each question correct like you're teaching a dummy. break everything down to notes the struggling students can study through to understand tips and tricks on how to answer each question type." Content brief per note is in Tasks 3-6. Existing patterns: `docs/superpowers/plans/2026-10-15-study-tools.md`, `content/writing/guides.json`, `skills/reading/engine/coach.js`.

## Global Constraints

- Static site, ES modules, no new dependencies. All existing tests and the four validators (`validate-content`, `validate-writing`, `validate-speaking`, `validate-toolbox`) stay green after every task.
- British spelling in all user-visible text.
- Plain English for beginners: every step `do` is 25 words or fewer; any technical term (e.g. "paraphrase", "overview", "qualifier") is explained in the note's `what` or the step's `why` the first time it appears.
- Note ids: Reading note ids are exactly the 13 `TYPES[].id` values in `skills/reading/engine/types.js` plus `start-here`. Writing note ids are exactly the 11 keys of `content/writing/guides.json` plus `band-criteria`, `timing-and-planning`, `grammar-fixes`.
- Never edit answer-marking, runner answer getters, or existing content files. Only additive changes to existing pages (a link each).
- Every `localStorage` access goes through `assets/core/prefs.js` (none is needed by this plan).
- Accessibility: notes are real headings/lists; links are real `<a>`; colour never the only signal; works in dark theme (use existing CSS variables only).
- Do not git commit unless a step says so.

## Review Focus

- Unknown or empty `#hash` on a learn page must show the index of notes, not a blank page or exception.
- Note text containing `<`, `&` or quotes (e.g. "TRUE <-> FALSE", `"rise" = "climb"`) must render as text, never as markup.
- A note missing an optional section (no `frames`, no `example.evidence`) must render without "undefined" or empty headings.
- Dark theme and a 375px-wide phone must keep every note readable with no horizontal scroll.
- Every "Study notes" link from a type/task page must land on the matching note (no dead anchors when a type is added later: validator enforces id coverage).

## File Structure

- Create `assets/core/learn.js` — `renderNote`, `renderIndex`, `mountLearn`. One responsibility: turn note objects into HTML and handle hash navigation.
- Create `assets/core/learn.css` — note styling (steps, trap/trick callouts, frames, example box).
- Create `tools/validate-learn.mjs` — `validateNotes`, CLI.
- Create `content/learn/reading.json`, `content/learn/writing.json` — the notes.
- Create `skills/reading/learn/index.html`, `skills/writing/learn/index.html` — thin pages calling `mountLearn`.
- Modify `skills/reading/index.html`, `skills/writing/index.html` — "Study notes" card at the top.
- Modify `skills/reading/engine/runner.js` — "Study the notes for this type" link on every type page.
- Modify `skills/writing/task.js` — link from the "Understand and plan" card to `../learn/#<task.guide>`.
- Modify `README.md` — mention learn section, add validator to the check chain.
- Tests: `tests/learn.test.mjs`, `tests/validate-learn.test.mjs`.

## Note schema (used by Tasks 1-2 and all content tasks)

```js
// one entry of content/learn/<skill>.json (an array)
{
  id: string,                 // see Global Constraints
  title: string,
  what: string,               // 1-3 plain sentences: what is this and what is the examiner really asking
  steps: [{ do: string, why: string }],   // 5+ ordered steps, "do" <= 25 words
  tricks: string[],           // 3+ shortcuts
  traps: string[],            // 3+ common mistakes, each says what to do instead
  checklist: string[],        // 3+ yes/no questions to ask before moving on
  example: Reading: { text, question, answer, evidence, walk: string[] }
           Writing: { prompt, weak, strong, why }
  frames?: [{ name: string, lines: string[] }],   // Writing only: fill-in-the-blank sentence frames, gaps in [square brackets]
  signals?: [{ word: string, means: string }]     // optional signal words / keywords table
}
```

---

### Task 1: Shared renderer and styles

**Files:**
- Create: `assets/core/learn.js`, `assets/core/learn.css`
- Test: `tests/learn.test.mjs`

**Interfaces:**
- Consumes: `esc` is NOT imported from the reading engine (that couples Writing to Reading); define a local `esc(s: string): string` escaping `& < > "` inside `learn.js`.
- Produces:
  - `renderNote(note: Note): string` — full HTML for one note (title, what, numbered steps with why, tricks, traps, example, frames, signals, checklist), omitting any absent optional section entirely.
  - `renderIndex(notes: Note[], groups?: {title: string, ids: string[]}[]): string` — `.toc` list of links `href="#<id>"`; with `groups`, a `.section-title` per group; notes not in any group are listed last under "More".
  - `mountLearn(opts: {mount: HTMLElement, notes: Note[], groups?: ..., win?: Window}): void` — renders the note named by `win.location.hash` (default `window`), else the index; re-renders on `hashchange`; each note page has a "← All notes" link and previous/next links by array order.

- [ ] **Step 1: Write the failing tests** in `tests/learn.test.mjs` (`node:test`, no DOM needed — string assertions only):
  - `renderNote escapes markup`: note with `what: 'A <b>x</b> & "y"'` → output contains `&lt;b&gt;` and does not contain `<b>x`.
  - `renderNote lists every step with its why`: 5 steps → output contains all five `do` and `why` strings in order and an `<ol`.
  - `renderNote omits absent optional sections`: note without `frames`/`signals` → output does not contain `Sentence frames` or `Signal words` or `undefined`.
  - `renderNote shows evidence quote inside reading example`: `example.evidence` appears wrapped in `<mark`.
  - `renderIndex links every note and groups`: 3 notes, groups covering 2 → output has 3 `href="#id"` links and a "More" heading.
- [ ] **Step 2: Run** `node --test tests/learn.test.mjs` → FAIL (module missing).
- [ ] **Step 3: Implement** the three functions in `assets/core/learn.js` per Interfaces. Headings used in output (tests rely on them): "What this is", "Do it in this order", "Tricks", "Traps to avoid", "Worked example", "Sentence frames", "Signal words", "Before you move on". Reading example renders text with `evidence` wrapped in `<mark>`, then question, answer, and `walk` as a list; Writing example renders prompt, "Weak:" `weak`, "Stronger:" `strong`, and `why`.
- [ ] **Step 4: Implement `assets/core/learn.css`** with classes `.note`, `.note .step`, `.note .trick`, `.note .trap`, `.note .frame`, `.note .example` using only existing CSS variables (`--ink`, `--paper`, `--line`, `--muted`, `--c`); trap and trick callouts carry a text label ("Trap" / "Trick"), not colour alone; `@media (max-width:600px)` single column, `overflow-wrap:anywhere` on frames.
- [ ] **Step 5: Run** `node --test tests/learn.test.mjs` → PASS, then full `node --test tests/*.test.mjs` → PASS.
- [ ] **Step 6: Commit** `git add assets/core/learn.js assets/core/learn.css tests/learn.test.mjs && git commit -m "feat: shared study-notes renderer"`

---

### Task 2: Validator

**Files:**
- Create: `tools/validate-learn.mjs`
- Test: `tests/validate-learn.test.mjs`

**Interfaces:**
- Consumes: `TYPES` from `skills/reading/engine/types.js`; keys of `content/writing/guides.json`.
- Produces: `validateNotes(notes: Note[], kind: 'reading' | 'writing', requiredIds: string[]): string[]` (error strings, empty = valid). CLI: `node tools/validate-learn.mjs` prints `N errors`, exits 1 on any.

- [ ] **Step 1: Write failing tests** in `tests/validate-learn.test.mjs` using a `good` Reading note fixture:
  - valid note → `[]`
  - missing required id → error matches `/missing note.*tfng/`
  - unknown extra id → error matches `/unknown note/`
  - duplicate id → error
  - `steps` with 4 entries → error `/steps needs 5/`; `tricks`/`traps`/`checklist` with 2 → error each (need 3)
  - a step `do` of 26 words → error `/over 25 words/`; empty `why` → error
  - reading: `example.evidence` not a substring of `example.text` → error `/evidence not in text/`
  - writing: `example.strong` not longer than `example.weak`, or empty `why` (under 10 words) → error
  - writing note whose id starts with `task1-` or equals an opinion-type key must have `frames` with 2+ entries, each 3+ lines → error otherwise
- [ ] **Step 2: Run** `node --test tests/validate-learn.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `validateNotes` and the CLI. CLI reads `content/learn/<kind>.json` (a missing file is an error, not a crash), builds `requiredIds` as: reading = `['start-here', ...TYPES.map(t=>t.id)]`; writing = `[...Object.keys(guides), 'band-criteria', 'timing-and-planning', 'grammar-fixes']`. Writing notes `band-criteria`, `timing-and-planning`, `grammar-fixes` are exempt from the `frames` and `example` rules (they use `steps/tricks/traps/checklist` only; `example` optional); Reading `start-here` is exempt from `example.evidence`.
- [ ] **Step 4: Run** tests → PASS; run `node tools/validate-learn.mjs` → expected FAIL listing all missing notes (content arrives in Tasks 3-6).
- [ ] **Step 5: Commit** `git add tools/validate-learn.mjs tests/validate-learn.test.mjs && git commit -m "feat: study-notes validator"`

---

### Task 3: Reading page, links, and the "start-here" + True/False/Not Given family notes

**Files:**
- Create: `skills/reading/learn/index.html`, `content/learn/reading.json`
- Modify: `skills/reading/index.html`, `skills/reading/engine/runner.js`

**Interfaces:**
- Consumes: `mountLearn` (Task 1), `validateNotes` CLI (Task 2), `COACH` from `skills/reading/engine/coach.js` (tone reference only).
- Produces: `content/learn/reading.json` array containing notes `start-here`, `tfng`, `ynng`, `mcq`; later tasks append to the same array. Page URL `skills/reading/learn/#<type-id>`.

- [ ] **Step 1: Verify failing** — `node tools/validate-learn.mjs` currently reports the reading file missing.
- [ ] **Step 2: Create `skills/reading/learn/index.html`** copying the head/back-link/`mountDisplayMenu` pattern of `skills/reading/index.html`; loads `tokens.css`, `base.css`, `hub.css`, `learn.css`; fetches `../../../content/learn/reading.json`; calls `mountLearn` with groups `[{title:'Start here', ids:['start-here']}, {title:'Is the statement true? (Yes/No, True/False)', ids:['tfng','ynng']}, {title:'Choosing and short answers', ids:['mcq','short-answer']}, {title:'Filling gaps', ids:['sentence-completion','summary-completion','summary-wordbank','notes-completion','diagram-labelling']}, {title:'Matching', ids:['matching-headings','matching-information','matching-features','matching-endings']}]`. Back link goes to `../index.html`.
- [ ] **Step 3: Add a "Study notes" card** as the first `.skill.wide` in `skills/reading/index.html` (href `learn/`, text "Study notes: how to answer every question type, step by step"), same markup as the Full test card.
- [ ] **Step 4: In `runner.js`**, where the type page title/header is rendered by `startSet`, add `<a class="back" href="../../learn/#${type}">Study the notes for this question type →</a>`; no other change to runner behaviour.
- [ ] **Step 5: Write the four notes** in `content/learn/reading.json` using the brief below. Voice: second person, one idea per sentence, no jargon unexplained, "Do this, because…".
  - `start-here`: the real test (3 passages, 40 questions, 60 minutes, no extra time to copy answers); the 5-step method from `STEPS`/`COACH` (skim, underline keywords, predict paraphrase, locate then read around, confirm with a line you can point to); 20 minutes per passage; never leave a blank; spelling counts; "answers in order" rule for most gap/True-False types; `signals`: what "paraphrase" means with 4 pairs (rise/climb, cause/lead to, begin/start, many/a great number of). No `example` required.
  - `tfng`: TRUE = text says the same thing; FALSE = text says the opposite; NOT GIVEN = text never says. Order test: "Can I point to a line that says it? TRUE. A line that says the opposite? FALSE. Neither after reading the whole paragraph? NOT GIVEN." Tricks: answers follow passage order; one wrong word makes it FALSE or NG; `signals`: qualifier words (all, only, always, never, some, may, most, first). Traps: using your own knowledge; picking FALSE when the text is simply silent (that is NOT GIVEN); stopping at the first matching keyword.
  - `ynng`: same three-way test but about the writer's opinion or claims, not facts; `signals`: believes, argues, claims, suggests, it seems; YES = agrees with writer, NO = contradicts writer; trap: confusing what another person in the text thinks with what the writer thinks.
  - `mcq`: read the question stem first, then all options; wrong options are usually true-but-not-asked, half-right, or too extreme; cross out options with a reason; multi-answer variant: pick exactly the number asked; answers in passage order.
  - Each `example` uses an invented 3-5 sentence text, not copied from `content/reading`, with `evidence` a verbatim substring.
- [ ] **Step 6: Verify** — `node tools/validate-learn.mjs` now reports only the other still-missing reading ids and no errors on the four written notes; `node --test tests/*.test.mjs` PASS; serve with `npx serve .` and open `/skills/reading/learn/` and `/skills/reading/learn/#tfng` (check dark theme and 375px width); open `/skills/reading/types/tfng/` and confirm the link reaches `#tfng`.
- [ ] **Step 7: Commit** `git add skills/reading content/learn/reading.json && git commit -m "feat: reading study notes page and first notes"`

---

### Task 4: Reading notes — answer-in-the-text types

**Files:**
- Modify: `content/learn/reading.json` (append)

**Interfaces:** Consumes the schema and validator; produces notes `short-answer`, `sentence-completion`, `summary-completion`, `summary-wordbank`, `notes-completion`, `diagram-labelling`.

- [ ] **Step 1: Verify failing** — `node tools/validate-learn.mjs` lists these six ids as missing.
- [ ] **Step 2: Append the six notes**, following this brief (each with 5+ steps, 3+ tricks/traps/checklist, one worked example):
  - `short-answer`: read the word limit ("NO MORE THAN THREE WORDS") first and obey it; question word tells the answer type (who = person, when = date, how many = number); copy words exactly, never change the form; numbers count as one word.
  - `sentence-completion`: read the sentence with the gap and guess the word type (noun, verb, number) from grammar; the completed sentence must be grammatically correct; the answers are in text order; copy exact words within the limit.
  - `summary-completion`: read the whole summary first for the topic; find which part of the passage the summary covers; summary words are paraphrases so the gap word is in the passage near the paraphrase; check grammar fits before and after the gap.
  - `summary-wordbank`: more words than gaps; decide the word type of each gap first; cross out each word you use; read the finished summary once for sense; the words in the list are not the passage's words, so match meaning.
  - `notes-completion`: notes follow the passage order and its headings; predict what is missing (a number, a name, a place); ONE WORD limits are strict; hyphenated words count as one word.
  - `diagram-labelling`: study the diagram and read arrows in order before touching the text; the passage describes the process in the same order; each box usually needs a noun or a verb from one sentence; check the word limit.
  - Signal-word tables where useful (e.g. sequence words first/then/finally in `diagram-labelling`).
- [ ] **Step 3: Verify** — `node tools/validate-learn.mjs` shows no errors on these six; spot-check one at `/skills/reading/learn/#notes-completion`.
- [ ] **Step 4: Commit** `git add content/learn/reading.json && git commit -m "content: reading notes for gap-fill types"`

---

### Task 5: Reading notes — matching types

**Files:**
- Modify: `content/learn/reading.json` (append)

**Interfaces:** produces notes `matching-headings`, `matching-information`, `matching-features`, `matching-endings`.

- [ ] **Step 1: Verify failing** — validator lists these four as missing.
- [ ] **Step 2: Append the four notes**, brief:
  - `matching-headings`: a heading is the main idea of a whole paragraph, not one detail; read the first and last sentence of each paragraph; there are extra headings and each is used once; start with the easiest paragraph and cross out headings as you use them; trap: a heading word appears in the paragraph but only as a minor detail.
  - `matching-information`: the question names a detail and you name the paragraph letter; answers are NOT in order; a paragraph can be used more than once; underline the detail's paraphrase, then scan paragraph by paragraph; do these last because they take the longest.
  - `matching-features`: underline each person/theory in the passage first; the options may be used more than once; match each claim to who said it, using the verb of opinion; not in order.
  - `matching-endings`: question starts are in passage order but endings are not; there are more endings than starts; first rule out endings that break grammar, then match meaning to the passage; confirm with a line.
- [ ] **Step 3: Verify** — `node tools/validate-learn.mjs` → `0 errors` (all 14 reading ids present).
- [ ] **Step 4: Commit** `git add content/learn/reading.json && git commit -m "content: reading notes for matching types"`

---

### Task 6: Writing page, links, and the foundation + Task 1 notes

**Files:**
- Create: `skills/writing/learn/index.html`, `content/learn/writing.json`
- Modify: `skills/writing/index.html`, `skills/writing/task.js`

**Interfaces:**
- Consumes: `mountLearn`, `validateNotes`. Note ids must equal `guide` keys in `content/writing/guides.json` (`task.guide` is already on every task).
- Produces: notes `band-criteria`, `timing-and-planning`, `grammar-fixes`, `task1-chart`, `task1-pie`, `task1-table`, `task1-map`, `task1-process`, `task1-mixed`. Page URL `skills/writing/learn/#<guide-key>`.

- [ ] **Step 1: Verify failing** — validator reports the writing file missing.
- [ ] **Step 2: Create `skills/writing/learn/index.html`** mirroring the Reading learn page (fetch `../../../content/learn/writing.json`; back link `../index.html`); groups `[{title:'Start here', ids:['band-criteria','timing-and-planning','grammar-fixes']}, {title:'Task 1 · Report (150+ words)', ids:['task1-chart','task1-pie','task1-table','task1-map','task1-process','task1-mixed']}, {title:'Task 2 · Essay (250+ words)', ids:['opinion','discussion','problem-solution','two-part','advantages']}]`.
- [ ] **Step 3: Add a "Study notes" link/card** at the top of `skills/writing/index.html` (above "Mock exams") and, in `task.js` inside the "Understand and plan" card markup, a link `<a href="../learn/#${task.guide}">Full study notes for this task type →</a>`.
- [ ] **Step 4: Write the nine notes** per brief. Writing notes use `frames` (fill-in sentences with `[gaps]`), and `example` = `{prompt, weak, strong, why}` showing one weak and one stronger version of the same sentence.
  - `band-criteria`: the four marks in plain English — answer the task fully (Task Achievement/Response), organise and link ideas (Coherence and Cohesion), use varied precise words (Lexical Resource), use varied correct grammar (Grammatical Range and Accuracy); each is worth 25%; Task 2 counts double Task 1; what "Band 6 vs Band 7" looks like for each, as concrete behaviours not numbers.
  - `timing-and-planning`: 5 min plan + 12 write + 3 check for Task 1; 5 + 30 + 5 for Task 2; start with Task 1; minimum 150/250 words, no padding; leave the last minutes for the checklist in `grammar-fixes`.
  - `grammar-fixes`: the eight most common errors with a wrong → right pair each (articles a/an/the, subject-verb agreement, tense for dates, comma splice, "there is/are", plural -s, spelling of words from the prompt, "the number of / the amount of").
  - `task1-chart`: overview sentence is mandatory and has no numbers; select 2-3 key features, do not list every figure; group data, don't describe left to right; frames for intro paraphrase, overview, rise/fall/peak/gap sentences.
  - `task1-pie`: compare slices within and across pies using fractions/percentages; "largest share / second largest / a fifth"; overview names the biggest and the biggest change.
  - `task1-table`: pick highest, lowest and one surprising row/column; compare, don't read out the table; frames for ranking and contrast.
  - `task1-map`: before-and-after; tenses past then present or future as the dates say; direction words (north-east of, adjacent to); overview says what was built, removed or converted.
  - `task1-process`: steps in order with sequencers (first, next, after that, finally); mostly present simple passive ("is heated"); overview counts the stages and says where it starts and ends; no opinions.
  - `task1-mixed`: when there are 2-3 visuals, intro covers all, one overview per whole, one body paragraph per visual, link them with one comparison sentence.
- [ ] **Step 5: Verify** — `node tools/validate-learn.mjs` shows no errors on the nine; `node --test tests/*.test.mjs` PASS; open `/skills/writing/learn/#task1-process` and `/skills/writing/task/?id=w1-process` and confirm the new link lands on `#task1-process`.
- [ ] **Step 6: Commit** `git add skills/writing content/learn/writing.json && git commit -m "feat: writing study notes page, Task 1 notes"`

---

### Task 7: Writing notes — Task 2 essay types, hub wording, README

**Files:**
- Modify: `content/learn/writing.json` (append), `skills.json`, `README.md`

**Interfaces:** produces notes `opinion`, `discussion`, `problem-solution`, `two-part`, `advantages`.

- [ ] **Step 1: Verify failing** — validator lists these five as missing.
- [ ] **Step 2: Append the five notes**, brief (each: step-by-step plan, a 4-paragraph structure frame set with sentence frames for intro, each body paragraph's topic sentence, and conclusion):
  - `opinion` ("To what extent do you agree"): state your position in the introduction and conclusion; one idea per body paragraph with reason, explanation, example; trap: sitting on the fence.
  - `discussion` ("Discuss both views and give your opinion"): one paragraph per view, then your opinion in the intro and conclusion; trap: forgetting to give an opinion.
  - `problem-solution`: each problem matched to a solution; frames for "One reason for this is…", "A practical solution would be…".
  - `two-part`: two questions, answer both in separate body paragraphs; trap: answering only one.
  - `advantages` ("Do the advantages outweigh the disadvantages"): choose a side, argue it first or second consistently; frames for weighing.
  - Shared traps across all five: memorised essays that ignore the question; new ideas in the conclusion; fewer than 250 words; informal words ("kids", "a lot of"); every note includes a "Relevant example" trick (a short, real-world example in one sentence).
- [ ] **Step 3: Verify** — `node tools/validate-learn.mjs` → `0 errors`; then full check chain: `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs` → all pass.
- [ ] **Step 4: Update `skills.json` taglines** for reading and writing to mention study notes (e.g. "13 question types, study notes and a full 40-question test"); add to `README.md` a "Study notes" bullet (content in `content/learn/*.json`, schema in this plan) and add `node tools/validate-learn.mjs` to the check chain line.
- [ ] **Step 5: Verify hub** — `npx serve .`, open `/`, confirm the taglines render and nothing overflows at 375px.
- [ ] **Step 6: Commit** `git add content/learn/writing.json skills.json README.md && git commit -m "content: writing Task 2 notes, hub wording and docs"`

---

## Self-Review

- **Spec coverage:** each Reading type (13) → Tasks 3-5 notes; each Writing task type (11 guide keys) → Tasks 6-7; "like teaching a dummy" → plain-English limits enforced in the validator (Task 2); "tips and tricks" → required `tricks`/`traps` (3+ each); "notes students can study" → dedicated Learn page + links from every type/task page.
- **Type consistency:** `renderNote`, `renderIndex`, `mountLearn`, `validateNotes`, note schema fields and ids are identical across tasks; note ids derive from `TYPES` and `guides.json`, so the validator catches drift.
- **Review Focus** items are covered by Task 1 tests (escaping, optional sections) and manual checks in Tasks 3 and 6 (hash fallback, dark/375px, link targets).
