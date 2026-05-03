# TASK.md

> Source: docs/design-notes/archived/aphelion-hooks-architecture.md (Last updated: 2026-04-30) §12.4

## Phase: PR 1d/4 — secrets-scan refactor + hooks badge + changelog
Last updated: 2026-05-03T05:00:00+09:00
Status: completed

## Task list

### Phase 1d
- [x] TASK-001: Create TASK.md and branch feat/aphelion-hooks-mvp-1d | Target file: TASK.md
- [x] TASK-002: Fix P7 regex bug — add `--` separator to grep in secret-patterns.sh | Target file: src/.claude/hooks/lib/secret-patterns.sh
- [x] TASK-003: Refactor .claude/commands/secrets-scan.md to source patterns from secret-patterns.sh | Target file: .claude/commands/secrets-scan.md
- [x] TASK-004: Add hooks-3 badge to README.md and README.ja.md | Target file: README.md, README.ja.md
- [x] TASK-005: Update CHANGELOG.md [Unreleased] section | Target file: CHANGELOG.md
- [x] TASK-006: Create PR with Closes #107 | (gh pr create)

## Recent commits
a8b23f1 docs: add Aphelion hooks MVP entry to CHANGELOG.md [Unreleased] (TASK-005)
ff9d4af docs: add hooks-3 badge to README.md and README.ja.md (TASK-004)
3f1ddf2 refactor: source secret patterns from canonical lib in secrets-scan.md (TASK-003)

## Suspension notes
(なし)
