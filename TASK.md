# TASK.md

> 参照元: docs/issues/unify-scripts-to-node.md (2026-04-19)

## フェーズ: scripts ランタイム統一 (Python → Node.js)
最終更新: 2026-04-19
ステータス: 完了

## タスク一覧

### Phase 1: scripts/generate.mjs 実装
- [x] TASK-001: generate.py を generate.mjs に移植 | 対象ファイル: scripts/generate.mjs

### Phase 2: 生成物 byte-for-byte 検証
- [x] TASK-002: Python版 と Node版 の出力差分ゼロを確認 | 対象ファイル: (検証のみ、コミットなし)

### Phase 3: package.json 新設
- [x] TASK-003: ルート package.json 作成 | 対象ファイル: package.json

### Phase 4: ドキュメント参照書換
- [x] TASK-004: python3 scripts/generate.py を node scripts/generate.mjs に置換 | 対象ファイル: README.md, README.ja.md, docs/wiki/en/*.md, docs/wiki/ja/*.md, docs/wiki/DESIGN.md, ISSUE.md, docs/issues/*.md

### Phase 5: generate.py 削除
- [x] TASK-005: git rm scripts/generate.py | 対象ファイル: scripts/generate.py

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
