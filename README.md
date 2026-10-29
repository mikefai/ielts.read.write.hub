# IELTS Academic Study Hub

Static site, no build step. Serve it over http (ES modules do not load from file://):

    npx serve .

- Add content: put a passage in `content/reading/passages/` and a question set in `content/reading/questions/<type>/`, then run `node tools/validate-content.mjs`.
- Tests: `node --test tests/*.test.mjs`
- Method guide: `docs/content/ielts-academic-method-guide.md`

- Full test: `skills/reading/test/?id=t1` (mirrors a real test: 3 passages, 40 questions, 60 minutes).
- Build a test: `node tools/sets.mjs --free` lists passages and the question sets no test uses yet. Then `node tools/new-test.mjs <id> "<title>" "<blurb>" <sets> <sets> <sets>` (one comma-separated list of set ids per passage) writes `content/reading/tests/<id>.json`, adds it to `tests/index.json` (which feeds the hub) and validates it. A test needs 3 passages, exactly 40 questions and 2,150-2,750 words, and must include tfng, matching-headings and summary-completion. Add an entry to `STRUCTURE` in `tools/validate-content.mjs` only if you want its group order and sizes pinned.

## Mock exams

- Reading: `skills/reading/test/?id=m1` and `?id=m2` (40 questions, 60 minutes, 2,150-2,750 words each).
- Writing: `skills/writing/#mocks` (3 mocks; Task 1 is one visual in mocks 1–2 and a mixed visual in mock 3, then Task 2).
- Speaking: `skills/speaking/` (3 mock interviews with vocabulary help and a language bank).
- Study notes: content in `content/learn/reading.json` and `content/learn/writing.json` (schema in `docs/superpowers/plans/2026-10-16-study-notes.md`); `node tools/validate-learn.mjs` checks them.
- Study-note demos and practice: each note has a `demo` (think-aloud walk-through) and two `practice` items, and `node tools/validate-learn.mjs` enforces them.
- Check everything: `node tools/validate-content.mjs && node tools/validate-writing.mjs && node tools/validate-speaking.mjs && node tools/validate-toolbox.mjs && node tools/validate-learn.mjs && node --test tests/*.test.mjs`
