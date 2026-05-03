# TASK.md

> Source: docs/design-notes/init-settings-json-merge.md (2026-05-01) + ARCHITECT_BRIEF (issue #114)

## Phase: fix/init-settings-json-merge
Last updated: 2026-05-03T01:00:00Z
Status: Completed

## Task List

### Phase 1: bin/aphelion-agents.mjs 改修
- [x] TASK-001: writeFile import 追加 + APHELION_HOOK_MARKER 定数定義 | Target file: bin/aphelion-agents.mjs
- [x] TASK-002: mergeSettingsJson() ヘルパー実装 | Target file: bin/aphelion-agents.mjs
- [x] TASK-003: reportMergeResult() ヘルパー実装 | Target file: bin/aphelion-agents.mjs
- [x] TASK-004: cmdInit の settings.json 配置ロジックを mergeSettingsJson() 呼び出しに置換 | Target file: bin/aphelion-agents.mjs
- [x] TASK-005: cmdUpdate の settings.json 配置ロジックを mergeSettingsJson() 呼び出しに置換 | Target file: bin/aphelion-agents.mjs
- [x] TASK-006: showHelp() のヘルプテキスト更新 (merge 動作の説明) | Target file: bin/aphelion-agents.mjs
- [x] TASK-007: smoke-update.sh に merge シナリオのテストを追加 | Target file: scripts/smoke-update.sh
- [x] TASK-008: smoke-update.sh を実行して全シナリオ PASS を確認 | Target file: scripts/smoke-update.sh

## Recent Commits
(各タスク完了後に git log --oneline -3 を記録する)

## Session Interruption Notes
(なし)
