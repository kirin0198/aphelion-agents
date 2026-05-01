# TASK.md

> Source: ARCHITECTURE.md equivalent = docs/design-notes/aphelion-hooks-architecture.md (Last updated: 2026-04-30)

## Phase: hooks MVP PR 1a (scripts + bin)
Last updated: 2026-05-01T09:00:00+09:00
Status: Completed (all tasks done, PR #111 created)

## Task List

### Phase 1a (PR 1a — code only: scripts + bin)

- [x] TASK-001: branch creation + initial commit (design notes) | Target file: docs/design-notes/*.md
- [x] TASK-002: secret-patterns.sh canonical lib | Target file: src/.claude/hooks/lib/secret-patterns.sh
- [x] TASK-003: hook A — secrets-precommit | Target file: src/.claude/hooks/aphelion-secrets-precommit.sh
- [x] TASK-004: hook B — sensitive-file-guard | Target file: src/.claude/hooks/aphelion-sensitive-file-guard.sh
- [x] TASK-005: hook E — deps-postinstall | Target file: src/.claude/hooks/aphelion-deps-postinstall.sh
- [x] TASK-006: settings.json template | Target file: src/.claude/settings.json
- [x] TASK-007: bin/aphelion-agents.mjs extensions | Target file: bin/aphelion-agents.mjs
- [x] TASK-008: package.json#files extensions | Target file: package.json
- [x] TASK-009: smoke-update.sh regression tests | Target file: scripts/smoke-update.sh
- [x] TASK-010: PR 1a submission | (gh pr create)

## Recent Commits

a0fbec1 test: add hooks MVP regression tests to smoke-update.sh (TASK-009)
4b5b217 feat: add hooks/ and settings.json to package.json#files (TASK-008)
87878a2 feat: extend bin/aphelion-agents.mjs for hooks MVP (TASK-007)

## Session Interruption Notes
(Record the situation here when a session is interrupted.)
