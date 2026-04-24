# TASK.md

> 参照元: docs/issues/maintenance-flow-wiki-sync.md (2026-04-24)

## フェーズ: maintenance-flow wiki 反映
最終更新: 2026-04-24
ステータス: 進行中

## タスク一覧

### Commit 1 (P1 必須・8 ファイル)
- [x] TASK-001: Architecture.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Architecture.md, docs/wiki/ja/Architecture.md
- [x] TASK-002: Triage-System.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Triage-System.md, docs/wiki/ja/Triage-System.md
- [x] TASK-003: Agents-Reference.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Agents-Reference.md, docs/wiki/ja/Agents-Reference.md
- [x] TASK-004: Home.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Home.md, docs/wiki/ja/Home.md

### Commit 2 (P2 推奨・6 ファイル)
- [x] TASK-005: Getting-Started.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Getting-Started.md, docs/wiki/ja/Getting-Started.md
- [x] TASK-006: Contributing.md (en/ja) 更新 | 対象ファイル: docs/wiki/en/Contributing.md, docs/wiki/ja/Contributing.md
- [x] TASK-007: index.mdx (en/ja) 更新 | 対象ファイル: site/src/content/docs/en/index.mdx, site/src/content/docs/ja/index.mdx

### Commit 3 (自動反映)
- [ ] TASK-008: sync-wiki.mjs 実行・生成物コミット | 対象ファイル: site/src/content/docs/{en,ja}/*.md

### 検証
- [ ] TASK-009: npm run build でビルド検証

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
