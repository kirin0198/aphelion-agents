# TASK.md

> Source: docs/design-notes/setup-improvement.md (PR-6 設計判断 section, 2026-05-30)

## Phase: PR-6 — SessionStart project-rules-check advisory hook (#130 final)
Last updated: 2026-05-30T00:00:00Z
Status: In progress

## Task List

### Phase PR-6
- [x] TASK-001: CREATE aphelion-project-rules-check.sh (advisory, startup-only, bypass, exec bit) | Target file: src/.claude/hooks/aphelion-project-rules-check.sh
- [x] TASK-002: EDIT settings.json (SessionStart block) | Target file: src/.claude/settings.json
- [ ] TASK-003: EDIT hooks-policy.md (hook D section + tables + distribution note) | Target file: src/.claude/rules/hooks-policy.md
- [ ] TASK-004: EDIT Hooks-Reference.md en+ja (bilingual sync) | Target files: docs/wiki/en/Hooks-Reference.md, docs/wiki/ja/Hooks-Reference.md
- [ ] TASK-005: EDIT bin/aphelion-agents.mjs (cmdUpdate SessionStart merge — decision E) | Target file: bin/aphelion-agents.mjs
- [ ] TASK-006: Manual verification (all hook paths + node --check + settings JSON valid)
- [ ] TASK-007: (final) Reset TASK.md to empty placeholder

## Recent Commits
(Record git log --oneline -3 after each task completion.)

## Session Interruption Notes
(Record session-suspension status here.)
