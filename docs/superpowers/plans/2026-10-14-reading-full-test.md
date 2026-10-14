# Reading Full-Test Implementation Plan
Spec: docs/superpowers/specs/2026-10-14-reading-full-test-design.md. Executed natively; content by a subagent; no git (verification command ends each task).
1. Validators (TDD): passage range 850-1000, `validateTest`, new types `notes-completion`, `summary-wordbank`. Verify: `node --test tests/*.test.mjs`.
2. Content: subagent writes t1 (3 passages, 8 sets, test file); validate with `node tools/validate-content.mjs`; measure density; read hardest groups.
3. Engine: renderer `offset`, new type pages, `bandFor(score)` (TDD), `startTest` + `skills/reading/test/`, Reading-home Full test card, hub `full-test` handling.
4. Verify in browser: full test run, per-type practice pages, hub progress.
