# TASK.md

> Source: docs/design-notes/approval-mode-triage.md (§9 実装設計 — 2026-06-30 architect 追記)

## Phase: 承認モード（autonomous / interactive）のトリアージ連動とエスカレーション機構
Last updated: 2026-06-30T00:00:00
Status: In progress

## Task List

### Phase 1 — プロトコル & 規約基盤（直列）
- [x] TASK-001: ESCALATION フィールド追加 (agent-communication-protocol.md) | Target file: src/.claude/rules/agent-communication-protocol.md
- [x] TASK-002: Approval Mode セクション追加 (orchestrator-rules.md) | Target file: .claude/orchestrator-rules.md
- [x] TASK-003: Phase Execution Loop 三段判定 + Rollback 上限ゲート追記 (orchestrator-rules.md) | Target file: .claude/orchestrator-rules.md

### Phase 2 — フローオーケストレーター 5本への結線（並行可、Phase 1 完了後）
- [x] TASK-004: delivery-flow.md に承認モード決定 + エスカレーション検知追記 | Target file: .claude/agents/delivery-flow.md
- [x] TASK-005: discovery-flow.md に承認モード決定 + エスカレーション検知追記 | Target file: .claude/agents/discovery-flow.md
- [x] TASK-006: operations-flow.md に承認モード決定 + エスカレーション検知追記 | Target file: .claude/agents/operations-flow.md
- [ ] TASK-007: maintenance-flow.md に承認モード決定 + エスカレーション検知追記（必須 HITL ゲート注意） | Target file: .claude/agents/maintenance-flow.md
- [ ] TASK-008: doc-flow.md に承認モード決定 + エスカレーション検知追記 | Target file: .claude/agents/doc-flow.md

### Phase 3 — casing 一括検証（Phase 1+2 完了後）
- [ ] TASK-009: casing grep sweep 検証（5チェック必須） | Target file: 検証のみ（必要時に straggler 修正）

## Recent Commits
(TASK 完了のたびに git log --oneline -3 を記録)

## Session Interruption Notes
(セッション中断時の状況をここに記録)
