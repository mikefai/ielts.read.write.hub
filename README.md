# IELTS Academic Study Hub

Static site, no build step. Serve it over http (ES modules do not load from file://):

    npx serve .

- Add content: put a passage in `content/reading/passages/` and a question set in `content/reading/questions/<type>/`, then run `node tools/validate-content.mjs`.
- Tests: `node --test tests/*.test.mjs`
- Method guide: `docs/content/ielts-academic-method-guide.md`

- Full test: `skills/reading/test/?id=t1` (mirrors a real test: 3 passages, 40 questions, 60 minutes). Add a test as `content/reading/tests/<id>.json`; `node tools/validate-content.mjs` enforces the structure.
