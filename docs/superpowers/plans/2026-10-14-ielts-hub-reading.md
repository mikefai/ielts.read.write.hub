# IELTS Hub + Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static study hub with a working Reading skill: 11 question-type environments, marking, evidence-based review, and persisted progress.

**Architecture:** Plain HTML/CSS/ES modules. Content is JSON. Shared engine in `skills/reading/engine/`; one folder per question type. `store.js` is the only persistence boundary.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Node (only for the test scripts, `node --test`). No dependencies, no build step.

**Spec:** `docs/superpowers/specs/2026-10-14-ielts-hub-reading-design.md`

## Global Constraints
- No build step and no dependencies; the site must work when served as static files (`npx serve` or any static host). ES modules need http, not `file://`, so the README line says to serve it.
- `store.js` is the only module that touches `localStorage` (wrapped in try/catch, falls back to memory).
- All passages and questions are original; none copied from real exams.
- Passage bands are 6, 7 and 8 (three passages, ~800 words each); at least one set of 4-6 questions for each of the 11 types.
- Dark mode via `prefers-color-scheme`; keyboard operable; stacked layout under 700px.
- Not a git repository: there are no commit steps; each task ends with its verification command.
- Content writing (passages, question JSON) is delegated to a Haiku-class subagent in small batches. The main agent validates every file with `validate-content.mjs` before use.

## Review Focus
- Completion answer typed with extra spaces, capitals or a trailing full stop is still marked correct.
- Completion answer over the word limit is marked wrong even if it contains the right word.
- Blank or skipped answers count as wrong, and the review screen still shows the evidence.
- `localStorage` unavailable (private mode) does not crash the page; progress simply does not persist.
- A question set whose `evidence.quote` is not found in the passage is rejected by the validator, not silently unhighlighted.

---

### Task 1: Core assets and store
**Files:** Create `assets/core/tokens.css`, `assets/core/base.css`, `assets/core/store.js`; Test `tests/store.test.mjs`
**Interfaces:**
- Produces: `getProgress(): {attempts: Attempt[]}`; `recordAttempt({type: string, setId: string, score: number, total: number, seconds: number}): void`; `Attempt` adds `at: number` (epoch ms).
- [ ] **Step 1:** Write tests: `recordAttempt` then `getProgress` returns the attempt with `at`; with `globalThis.localStorage` throwing on access, both calls still work and return in-memory data.
- [ ] **Step 2:** Run `node --test tests/` and confirm failure.
- [ ] **Step 3:** Implement `store.js` as specified, key `ielts-hub-v1`. Write `tokens.css` (paper background, serif passage font, sans UI font, `--accent`, dark-mode overrides) and `base.css` (reset, layout, focus styles, `@media (max-width:700px)` stacking).
- [ ] **Step 4:** Run `node --test tests/` and confirm pass.

### Task 2: Marking and content validator
**Files:** Create `skills/reading/engine/marking.js`, `tools/validate-content.mjs`; Test `tests/marking.test.mjs`, `tests/validate.test.mjs`
**Interfaces:**
- Produces: `markItem(item: Item, response: string|string[], wordLimit?: number): boolean`; `validate(passage: Passage, set: QuestionSet): string[]` (list of error messages, empty when valid). Types are the JSON shapes in the spec.
- [ ] **Step 1:** Write marking tests: `"  Solar Power. "` accepts `answer:"solar power"`; accepts any entry of `accept`; `wordLimit:2` rejects a 3-word response containing the answer; empty string is false; TRUE/FALSE/NOT GIVEN compare case-insensitively.
- [ ] **Step 2:** Write validate tests: missing `evidence.quote` in the paragraph text yields an error naming the item id; unknown `type` yields an error; a valid set yields `[]`.
- [ ] **Step 3:** Run, confirm failure. Implement both: normalise by lowercasing, trimming, stripping trailing punctuation and collapsing spaces; the validator also checks `step` is 1-5 and that matching/MC items have `options` containing `answer`. `validate-content.mjs` also runs as a CLI over `content/reading/` and exits 1 on any error.
- [ ] **Step 4:** Run `node --test tests/` and `node tools/validate-content.mjs`; expect pass and "0 errors".

### Task 3: Hub page
**Files:** Create `index.html`, `skills.json`, `assets/hub.js`, `assets/hub.css`
**Interfaces:** Consumes `getProgress()` from Task 1. Produces `skills.json` entries `{id, title, tagline, path, status: "live"|"soon", accent}`.
- [ ] **Step 1:** `skills.json` lists Reading (`live`, `skills/reading/`), Listening, Writing, Speaking (`soon`).
- [ ] **Step 2:** `hub.js` renders cards from the registry (`soon` cards are not links), a progress strip (current streak in days, overall accuracy, weakest question type by accuracy among attempted types), and a Continue button linking to the most recent attempt's type page.
- [ ] **Step 3:** Verify: serve the folder, open `/`, see 4 cards, Reading link works, no console errors, and with empty progress the strip shows "No attempts yet" and no Continue button.

### Task 4: Reading engine shared UI
**Files:** Create `skills/reading/engine/runner.js`, `timer.js`, `highlighter.js`, `coach.js`, `review.js`, `engine.css`
**Interfaces:**
- Produces: `startSet({passageUrl: string, setUrl: string, mount: HTMLElement, renderItems: (set, passage, state) => void}): Promise<void>`. The runner loads both JSON files, runs `validate`, renders the passage with a highlighter (select text, click to toggle highlight), a countdown timer (default 20 min), the collapsible coach panel (5-step method text from `coach.js`), calls the type's `renderItems`, and on Submit marks with `markItem`, calls `recordAttempt`, and shows the review: score, each item with your answer, the correct answer, the evidence quote highlighted in the passage and the method step name.
- [ ] **Step 1:** Implement the modules to this interface; `coach.js` holds the 5 step titles and one-line text from `docs/content/ielts-academic-method-guide.md` section 3.
- [ ] **Step 2:** Verify with Task 6's first type page (T/F/NG) once built; see Task 6 step 3.

### Task 5: Content batch 1 (Haiku subagent)
**Files:** Create `content/reading/passages/p6.json`, `p7.json`, `p8.json`
- [ ] **Step 1:** Brief the Haiku subagent with the Passage schema and the band descriptions: one original ~800-word passage per band, 5-6 labelled paragraphs, non-specialist academic topics, a different topic each, at least one with a clear argument and one with a process description.
- [ ] **Step 2:** Run `node tools/validate-content.mjs`; reject and resend if errors. Read each passage once for sense and band level.

### Task 6: Gap-based and choice types (6 environments)
**Files:** Create `skills/reading/types/{tfng,ynng,mcq,short-answer,sentence-completion,summary-completion}/index.html` and `.css`, plus matching `content/reading/questions/<type>/<id>.json` sets
**Interfaces:** Consumes `startSet` (Task 4), `markItem` (Task 2). Each page calls `startSet` with its own `renderItems`.
- [ ] **Step 1:** Subagent writes one set per type (4-6 items each, on p6/p7/p8 spread across types, with `evidence` and `step`); validate after each batch.
- [ ] **Step 2:** Implement the six `renderItems`: T/F/NG and Y/N/NG as a statement list with 3-option radio groups; MCQ as option radios; short-answer, sentence-completion and summary-completion as inputs with a live word counter against `wordLimit`. Each page has its own CSS layout.
- [ ] **Step 3:** Verify: open each page, answer, submit; score matches expectation, evidence highlights, a wrong-length answer is marked wrong, and a progress entry appears on the hub.

### Task 7: Matching types (4 environments)
**Files:** Create `skills/reading/types/{matching-headings,matching-information,matching-features,matching-endings}/index.html`/`.css` and their question sets
**Interfaces:** Items carry `options: string[]`; the response is the chosen option string (headings, features, endings) or a paragraph label (information).
- [ ] **Step 1:** Subagent writes the sets (4-6 items; headings have more options than paragraphs); validate.
- [ ] **Step 2:** Implement `renderItems` with a `<select>` fallback per item plus drag-and-drop from an option pool where `PointerEvent` is available; options can be used once for headings, many times for information and features.
- [ ] **Step 3:** Verify both input methods mark identically; keyboard-only completion works.

### Task 8: Diagram labelling
**Files:** Create `skills/reading/types/diagram-labelling/index.html`/`.css`, inline SVG process diagram, one question set
- [ ] **Step 1:** Subagent writes a process-description passage section and set; main agent draws the diagram as inline SVG with numbered gaps; validate.
- [ ] **Step 2:** Implement `renderItems` placing inputs next to the numbered gaps with a word counter.
- [ ] **Step 3:** Verify as in Task 6 step 3.

### Task 9: Reading home and final pass
**Files:** Create `skills/reading/index.html`, `skills/reading/home.js`, `README.md`
- [ ] **Step 1:** Home page lists the 11 types as tiles (title, one-line "what it tests", accuracy from progress, link).
- [ ] **Step 2:** README: how to serve (`npx serve .`), how to add a passage or question set, how to run `node --test tests/` and the validator.
- [ ] **Step 3:** Final verification: `node --test tests/` passes; the validator reports 0 errors; walk hub -> Reading -> each of the 11 types at desktop and 375px width; check dark mode and the hub with `localStorage` blocked.
