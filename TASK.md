# TASK.md

> 参照元: docs/issues/typescript-cli.md (2026-04-23)

## フェーズ: Phase 1 再策定 — zero-deps .mjs CLI への置き換え
最終更新: 2026-04-23
ステータス: 進行中

## タスク一覧

### Phase 1: 削除
- [x] TASK-001: TypeScript ビルドチェーン設定ファイル削除 | 対象ファイル: tsconfig.json, tsup.config.ts, biome.json, vitest.config.ts
- [x] TASK-002: 旧 TypeScript CLI ソース削除 | 対象ファイル: src/ 以下全て
- [ ] TASK-003: package-lock.json 削除 | 対象ファイル: package-lock.json

### Phase 2: 追加
- [ ] TASK-004: package.json を npx github: 配布向けに簡素化 | 対象ファイル: package.json
- [ ] TASK-005: zero-deps mjs CLI 追加 (init/update + --user フラグ) | 対象ファイル: bin/aphelion-agents.mjs

### Phase 3: ドキュメント修正
- [ ] TASK-006: README / wiki / CHANGELOG を新コマンド形式に更新 | 対象ファイル: README.md, README.ja.md, docs/wiki/en/Getting-Started.md, docs/wiki/ja/Getting-Started.md, CHANGELOG.md
- [ ] TASK-007: TASK.md リセット + .gitignore 調整 | 対象ファイル: TASK.md, .gitignore

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
