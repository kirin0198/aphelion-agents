# TASK.md

> Source: ARCHITECTURE.md / Implementation brief (PR-4, Issue #130)

## Phase: PR-4 — auto-detect npx cache staleness in cmdUpdate()
Last updated: 2026-05-28T01:00:00Z
Status: In progress

## Task List

### Phase PR-4
- [x] TASK-001: Add `fetchRemoteVersion()` helper using `node:https` | Target file: bin/aphelion-agents.mjs
- [x] TASK-002: Wire `fetchRemoteVersion()` call into `cmdUpdate()` | Target file: bin/aphelion-agents.mjs
- [x] TASK-003: Implement advisory block emission on version mismatch | Target file: bin/aphelion-agents.mjs
- [x] TASK-004: Implement silent-skip on fetch failure | Target file: bin/aphelion-agents.mjs
- [x] TASK-005: Manual verification (mismatch case + offline case + happy path) | Target file: bin/aphelion-agents.mjs
- [ ] TASK-006: Reset TASK.md to empty placeholder | Target file: TASK.md

## Recent Commits
(Record git log --oneline -3 each time a task is completed)

## Session Interruption Notes
(Record the situation here when a session is interrupted)
