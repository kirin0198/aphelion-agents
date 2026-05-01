# TASK.md

> Source: docs/design-notes/archived/aphelion-hooks-architecture.md (2026-04-30) §12.3 / §13.3

## Phase: PR 1c — Aphelion hooks dogfooding
Last updated: 2026-05-01T00:00:00
Status: In progress

## Task List

### Phase 1c
- [x] TASK-001: Create branch feat/aphelion-hooks-mvp-1c | Target: git branch
- [x] TASK-002: Add .gitignore entry to ensure .claude/settings.json is commit target | Target: .gitignore
- [x] TASK-003: Create aphelion-md-sync.sh dogfooding hook | Target: src/.claude/hooks/aphelion-md-sync.sh
- [x] TASK-004: Create aphelion-agent-count-check.sh (discretionary, implemented) | Target: src/.claude/hooks/aphelion-agent-count-check.sh
- [x] TASK-005: Create aphelion-task-md-lifecycle.sh (discretionary, implemented) | Target: src/.claude/hooks/aphelion-task-md-lifecycle.sh
- [ ] TASK-006: Create this repo's .claude/settings.json with 3 user hooks + 3 dogfooding hooks | Target: .claude/settings.json
- [ ] TASK-007: Shellcheck all hooks | Target: src/.claude/hooks/*.sh
- [ ] TASK-008: Run dogfooding pass (10 commits through hook A) and record false-positive rate | Target: measurement
- [ ] TASK-009: Create PR 1c/4 | Target: GitHub PR

## Recent Commits
(Updated per task completion)

## Session Interruption Notes
(Empty — new session)
