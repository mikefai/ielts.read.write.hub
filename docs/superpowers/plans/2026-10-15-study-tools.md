# Student Study Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give Reading and Writing practice the tools students get in the real computer-delivered test (highlight, underline, notes, flag, navigator) plus study aids (find, ruler, pacing, strike-through, word/self-check panels, phrase and paraphrase helpers, autosave, display settings, progress by question type).

**Architecture:** DOM-free logic lives in small tested ES modules (`assets/core/tools/*.js`, `assets/core/prefs.js`, `skills/writing/checks.js`, `skills/writing/suggest.js`). UI modules (`skills/reading/engine/tools-*.js`, additions in `skills/writing/task.js`) import them. All state persists in `localStorage` through `prefs.js` with an in-memory fallback. No build step, no dependencies.

**Tech Stack:** Vanilla ES modules, `node:test`, existing tokens/base CSS.

## Global Constraints

- Static site, ES modules, no new dependencies. Existing 97 tests and all three content validators stay green after every task.
- Every `localStorage` access goes through `assets/core/prefs.js` (try/catch, memory fallback). Pages must work with storage blocked.
- Text offsets for annotations are character offsets into a paragraph's plain text (the text after the paragraph label), never DOM-dependent.
- Never change what `renderers.js` returns from answer getters, and never change answer-marking behaviour.
- Accessibility: every control is a real `<button>`/`<input>` with a label; toolbars operable by keyboard; colour is never the only signal (flags and statuses also have text/icon).
- Tools must work in both full test (`test-runner.js`) and single question-type pages (`runner.js`).
- Use British spelling in user-visible text. Do not git commit; the orchestrator commits.

## Review Focus

- Selecting text across two paragraphs, or across an existing highlight, must not corrupt the paragraph text or lose neighbouring marks.
- Re-rendering a passage (tab switch, find, review) must keep all marks and never move text offsets.
- Storage blocked or full must not break the page.
- Dark theme must keep every control and mark legible.
- A tool must never alter answers the student has typed or selected.

---

## Contracts (exact signatures — build and import exactly these)

### `assets/core/prefs.js`
```js
export function loadPref(key, fallback)   // reads JSON from localStorage 'ielts-hub-prefs-v1' object; memory fallback; returns fallback if absent
export function savePref(key, value)      // writes; never throws
```

### `assets/core/tools/annotate.js`
Marks per paragraph: `{ hl: [{s,e,c}], ul: [{s,e}], notes: [{id,s,e,t}] }`, intervals half-open `[s,e)`, `s<e`.
```js
export const COLOURS = ['yellow','green','pink','blue']
export const emptyMarks = () => ({ hl: [], ul: [], notes: [] })
export function setHighlight(marks, s, e, colour)  // colour null erases; new object; hl sorted, non-overlapping, adjacent same colour merged; new colour overwrites overlap
export function setUnderline(marks, s, e, on)      // on=true unions, false subtracts; merged
export function addNote(marks, s, e, text)         // returns { marks, id }; id = 'n' + (max numeric suffix + 1)
export function updateNote(marks, id, text)
export function removeNote(marks, id)
export function clearRange(marks, s, e)            // erases hl+ul in [s,e) and removes notes fully inside
export function segments(text, marks, extra = {})  // extra = { ev:[{s,e}], find:[{s,e,cur?}] }; returns [{t,s,e,hl,ul,ev,find,note,noteEnd}] covering text exactly (concat of t === text); [] for ''. hl: colour|null; find: 'cur'|'hit'|null; note: boolean; noteEnd: id|null (segment ending exactly at a note's e)
export function toHtml(text, marks, extra = {})    // HTML-escaped; unstyled runs are plain text; styled runs <span class="seg hl-yellow ul ev find-hit find-cur note nend" data-n="n1">…
export function overlapAmount(marks, s, e)         // number of chars in [s,e) covered by any hl, ul or note
```

### `assets/core/tools/find.js`
```js
export function findMatches(text, query, opts = {})  // [{s,e}] case-insensitive literal, ascending, non-overlapping; query trimmed, <2 chars → []
```

### `assets/core/tools/evidence.js`
```js
export function evidenceRange(text, quote)           // {s,e} via exact indexOf, else null
export function coverage(marks, range)               // { covered, total, ratio, verdict: 'marked'(ratio>=0.5) | 'partly'(>0) | 'missed' }
```

### `assets/core/tools/pace.js`
```js
export function passagePace(seconds, targetMin = 20)  // { state:'ok'|'warn'|'over', label:'mm:ss', message }  ok < target; warn target..target+5 min; over beyond
export function phaseAt(timing, elapsedSec)           // timing=[{minutes:number,what}]; → { index, what, remainingSec, overrun }; past the end: last phase, remainingSec 0, overrun true
```

### `skills/writing/checks.js`
```js
export function analyse(paragraphs, taskNo)
// paragraphs: string[] (non-empty trimmed paragraphs). Returns
// { words, sentences, paragraphs, avgSentence, target, checks:[{id,label,ok}], warnings:[{type:'repeat'|'long'|'contraction',detail}] }
// target 150 (task 1) / 250 (task 2).
// Task 1 checks: 'paragraphs'(>=3), 'overview'(/overall|in general|generally|on the whole/i), 'data'(>=4 digit groups), 'words'(>=150).
// Task 2 checks: 'paragraphs'(>=4), 'position'(/in my (opinion|view)|i (firmly |strongly )?(believe|agree|disagree|think)|i would argue/i), 'conclusion'(/in conclusion|to conclude|to sum up|in summary|overall/i), 'words'(>=250).
// warnings: 'repeat' = a non-stopword (>=5 letters) used >=5 times (one warning per word, detail "word ×N"); 'long' = sentence >40 words (detail first 6 words + '…'); 'contraction' = n't/'m/'re/'ve/'ll/'d (detail the form).
```

### `skills/writing/suggest.js`
```js
export function suggest(selection, dict)  // dict: { "shows": ["illustrates","depicts",…], … } keys lower-case words or phrases; returns [{key, options}] for every dict key found in selection (longest phrase first, case-insensitive, whole-word; tolerate -s/-ed/-ing endings on the key's last word); [] if none
```

### Content
- `content/writing/paraphrase.json`: object `{ "<lower-case word or phrase>": ["alt1","alt2","alt3"+] }`, >=150 keys covering Task 1/2 prompt vocabulary (show, illustrate, proportion, percentage, increase, decrease, rise, fall, compare, significant, however, advantage, disadvantage, problem, solution, important, government, society, education, technology, environment, …), each with 3-6 alternatives that really are interchangeable in an academic context.
- `content/writing/phrasebank.json`: `{ "task1":[sections], "task2":[sections] }`, section = `{ title, items:[string] }`; task1 >=6 sections (introducing, overview, rising, falling/stable, comparing, approximating/proportions, maps/processes), task2 >=7 sections (introducing the topic, stating a position, giving reasons, giving examples, contrasting, cause and effect, concluding); >=6 items each; items are reusable sentence frames or linkers.

---

## Wave 1 (parallel, disjoint files)

### Task 1: Pure core modules
**Files:** Create `assets/core/prefs.js`, `assets/core/tools/{annotate,find,evidence,pace}.js`, tests `tests/{prefs,annotate,find,evidence,pace}.test.mjs`
- [ ] Write tests first from the Contracts (include: overlapping highlight overwrite, merge of adjacent same colour, erase middle splits an interval, underline union/subtract, note ids, `segments` concatenation equals text for random mark sets, `toHtml` escapes `<&>"`, find overlapping/short/case, evidence null, coverage verdict thresholds, pace boundaries, phaseAt cumulative + overrun, prefs memory fallback when `localStorage` undefined).
- [ ] Run → FAIL. Implement. Run `node --test tests/*.test.mjs` → all PASS.

### Task 2: Writing pure modules and content
**Files:** Create `skills/writing/checks.js`, `skills/writing/suggest.js`, `content/writing/paraphrase.json`, `content/writing/phrasebank.json`, `tools/validate-toolbox.mjs` (CLI + exported `validateParaphrase(dict)`, `validatePhrasebank(bank)` enforcing the content rules above and that every alternative differs from its key), tests `tests/{checks,suggest,toolbox}.test.mjs`
- [ ] Tests first (incl. each check true/false, contraction and repeat and long-sentence warnings, suggest longest-phrase-first, `shows`→`show` stem tolerance, no match → []).
- [ ] Implement; author both JSON files; `node tools/validate-toolbox.mjs` → `0 errors`; add it to the README check line.

### Task 3: Hub progress by question type
**Files:** Modify `assets/hub.js`, `index.html`, `assets/hub.css`; Create `assets/core/progress.js`, `tests/progress.test.mjs`
- Produces `byType(attempts): [{ type, label, score, total, pct, sets }]` sorted weakest first (label from reading `TYPES` title, `full-test` → "Full test", `writing-task1/2` → "Writing Task N", `speaking-mock` → "Speaking mock"), and `nextPractice(rows): { type, href } | null` (weakest type with >=1 attempt; href reading type → `skills/reading/types/<type>/`, full-test → `skills/reading/test/?id=m1`, writing → `skills/writing/`, speaking → `skills/speaking/`).
- [ ] Tests first, then implement; hub shows a "Progress by type" list (bar per row, accessible text "62% (25/40)") and a "Practise next: <label>" link under the strip, only when attempts exist.

## Wave 2 (after wave 1)

### Task 4: Reading annotation, notes, find, ruler, evidence review
**Files:** Create `skills/reading/engine/tools-annotate.js`, `skills/reading/engine/tools.css`; Modify `skills/reading/engine/runner.js`, `skills/reading/engine/test-runner.js`, the 13 `skills/reading/types/*/index.html` only if a `<link>` to `tools.css` is needed (add it to each).
**Interfaces (produced):**
```js
export function mountAnnotations({ root, passageEls, storageKey })  // passageEls: array of .passage article elements (each has <h2> and <p data-label><strong>A</strong> text</p>); adds .ptext spans; returns { render(pi), getMarks(pi), refresh(pi), setExtra(pi, labelToExtra) , destroy() }
export function mountFindBar({ root, getActivePassageIndex, annotations })
export function mountRuler({ root, passageSelector })
export function reviewPassageHtml(passage, marksByLabel, evidence)  // static HTML with marks + evidence layer, used on review screens
```
Behaviour: paragraph text is wrapped as `<span class="ptext">…</span>` after the label so offsets are relative to `.ptext.textContent`. Selecting text inside a passage shows a floating toolbar (4 colour swatches with names, Underline, Note, Clear) positioned by the selection rect; cross-paragraph selections are split per paragraph; toolbar actions call annotate.js ops then re-render affected paragraphs only. Click on a `.nend` marker opens a small editor (edit text / delete note). Marks persist per `storageKey + passageId` through prefs.js and survive tab switches and reloads. A "Clear marks" button clears the visible passage. Find bar: input + count ("3 of 12") + prev/next + clear; Enter = next, Escape = clear; matches painted via the `find` layer without altering stored marks. Ruler: toggle button; translucent band (2.2em tall) follows the pointer within the passage pane; off on touch. Replace the old `#hl` "Highlight selection" button in both runners. Review: full-test review gains, per passage, a `<details>` “See the passage with your marks” using `reviewPassageHtml`, and each wrong or right question shows the coverage verdict text (“You marked the evidence” / “You partly marked the evidence” / “Your marks missed the evidence”) plus a “Show evidence” button that opens the details and scrolls to the evidence paragraph with the `ev` layer on. In `runner.js` the existing `paintPassage(mark)` evidence flow keeps working (now rendered through the annotation layers) and shows the same verdict line.
- [ ] Unit-test pure helpers if you add any (e.g. offset splitting) in `tests/`; browser-verify with Playwright MCP against `npx serve .`: select a word and highlight it in each colour, underline, add and edit a note, clear, reload (marks persist), switch passage tabs and back, cross-paragraph selection, find counts, ruler follows pointer, review verdicts.

### Task 5: Writing UI tools
**Files:** Modify `skills/writing/task.js`, `skills/writing/writing.css`, `skills/writing/chart.js` (only to add `data-mark` hooks if needed); Create `skills/writing/tools-ui.js`
**Interfaces (consumed):** `analyse`, `suggest`, `phaseAt`, `loadPref`/`savePref`, `paraphrase.json`, `phrasebank.json`.
Behaviour:
1. **Meter** replacing the plain word count: words, paragraphs, sentences, average sentence length, a progress bar with a target tick (150/250) and “N to go”/“over by N”.
2. **Self-check panel** (live, debounced 300 ms): the checks from `analyse` as ✓/✗ lines and warnings as a list (repeat/long/contraction). Paragraphs come from guided slots grouped by paragraph, or free text split on newlines.
3. **Pacing:** under the timer show the current phase from the guide's `timing` via `phaseAt` (“Plan · 2:10 left”); when `overrun` or a phase ends show “Time to move on”. Mark the phase text with `aria-live="polite"`. A “Hide timer” control is added by Task 7, not here.
4. **Chart tools:** clicking a chart opens a zoomed `<dialog>` (Esc/close button) with the same chart rendered larger; clicking a bar/point/slice/table cell toggles `.marked` (outline + legend line “Marked: n”), persisted per task. A **Key features** list under the chart: add text, tick “covered”, delete; persisted per task.
5. **Toolbox card** (tabs): Phrase bank (sections from `phrasebank.json` by task; click an item inserts at the cursor of the last focused answer textarea, or appends to the first slot), Paraphrase (select text in the prompt or type a word → `suggest` results as buttons that insert), Language note when nothing matches (“No stored synonyms; try a broader word”).
6. **Autosave:** draft saved (debounced 400 ms) under `writing-draft:<task.id>` with mode, guided slot values, free text; restored on load with a notice “Draft restored from <time>” + Discard button; cleared when “Compare with model” is pressed.
7. **Last attempt:** on “Compare with model” store `{at, words, paragraphs:[…]}` under `writing-last:<task.id>`; on load show a collapsed `<details>` “Your last attempt (<date> · N words)” read-only; on the review screen show “Last time N words · Now M words (±D)”.
- [ ] Browser-verify each of the seven items, for Task 1 (mixed chart) and Task 2 pages, with storage cleared and with a reload mid-draft.

## Wave 3 (after Task 4)

### Task 6: Reading navigator, flags, pacing, strike-through
**Files:** Create `skills/reading/engine/tools-nav.js`; Modify `runner.js`, `test-runner.js`, `tools.css`
**Interfaces (produced):**
```js
export function mountNavigator({ root, items, getAnswers, onGo })  // items:[{ el, passageIndex, number }]; renders a numbered strip; states answered/unanswered/flagged/current exposed as text in aria-label (“Question 7, answered, flagged”) and visibly; click calls onGo(index)
export function addFlags({ root, items })                           // adds a “⚑ Flag” toggle button (aria-pressed) to each question; returns { isFlagged(i), onChange(cb) }
export function mountPassagePace({ tabs, getActive })               // full test only: accumulates seconds per passage while its tab is active; shows mm:ss on each tab and a status line using passagePace (aria-live)
export function addStrike({ root })                                 // ✕ buttons on .opt options and .chip pool chips toggling .struck (aria-pressed); never changes the selected answer
```
Full test: navigator under the passage tabs, clicking a number switches to that passage tab, scrolls the question into view and focuses its first control; answered state refreshes on `input`/`change`. Single-type pages: navigator strip + flags + strike only.
- [ ] Browser-verify: flag/unflag, answered state, jump across passages, tabs show elapsed time, warn state at 20:00 (fake it with a test hook `?pace=5` = target seconds is NOT allowed in production; instead unit-test `passagePace` and verify the DOM class by calling the exported function with a stubbed clock argument), strike toggles without altering the chosen radio.

## Wave 4 (after Tasks 4–6)

### Task 7: Display settings (dark mode, text size, hide timer, ruler default)
**Files:** Create `assets/core/display.js`, `assets/core/display.css`; Modify `assets/core/tokens.css` (add `:root[data-theme="dark"]` overrides for every token incl. `--bg --paper --ink --muted --line --accent --mark --shadow` with legible contrast), `skills/reading/engine/engine.css`/`skills/writing/writing.css`/`assets/hub.css` only to replace hard-coded light colours that break in dark, the reading and writing page headers to mount the menu.
```js
export function applyDisplay()                    // reads prefs 'theme' ('light'|'dark'|'auto' default auto → prefers-color-scheme), 'fontScale' (0.9..1.5, step 0.1), 'hideTimer'; sets data-theme, --uiscale on :root, class hide-timer on <html>
export function mountDisplayMenu(container)       // “Display” button + popover: Theme (Light/Dark/Auto), Text size A−/A+/reset, Hide timer checkbox
```
Passage text, question text and answer textareas scale with `--uiscale`. `hide-timer` hides `#timer` visually but keeps it in the DOM for the auto-submit logic.
- [ ] Browser-verify light/dark on hub, Reading full test, a type page, Writing task (screenshots), contrast of marks/toolbar/chips in dark, text size persists across reload.

### Task 8: Final verification
- [ ] `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node --test tests/*.test.mjs` all clean.
- [ ] Playwright walkthrough of every tool on Reading full test (m1), one Reading type page (tfng), Writing Task 1 mock and Task 2 mock, hub; zero console errors; storage-blocked run (disable localStorage via script before load).
- [ ] Fresh reviewer agent reads the diff for the Review Focus items; fix findings; update README; commit.
