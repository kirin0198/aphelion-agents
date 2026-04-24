# TASK.md

> 参照元: docs/issues/project-rules-schema.md (2026-04-24)

## フェーズ: Issue #30 + #32 統合実装 (PR #33)
最終更新: 2026-04-24
ステータス: 進行中

## タスク一覧

### Phase 1 — ルールドキュメント改訂

- [x] TASK-001: language-rules.md と git-rules.md を project-rules 参照型に改訂 | 対象ファイル: .claude/rules/language-rules.md, .claude/rules/git-rules.md
- [x] TASK-002: localization-dictionary.md 新規追加（en/ja 固定文字列辞書） | 対象ファイル: .claude/rules/localization-dictionary.md

### Phase 2 — エージェント実装

- [ ] TASK-003: rules-designer に Output Language / Co-Authored-By 質問ラウンドを追加 | 対象ファイル: .claude/agents/rules-designer.md
- [ ] TASK-004: 全対象エージェント本文冒頭に Project-Specific Behavior ブロックを挿入 | 対象ファイル: .claude/agents/*.md (全31ファイル)

### Phase 3 — Aphelion 本体設定

- [ ] TASK-005: Aphelion 本体 project-rules.md 作成（後方互換） | 対象ファイル: .claude/rules/project-rules.md

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
