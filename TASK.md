# TASK.md

> 参照元: docs/issues/typescript-cli.md (2026-04-19)

## フェーズ: Phase 1 — CLI新設 + TypeScript化
最終更新: 2026-04-19
ステータス: 進行中

## タスク一覧

### Phase 1
- [x] TASK-001: LICENSE ファイル追加 | 対象ファイル: LICENSE
- [x] TASK-002: package.json をnpm publish向けに更新 | 対象ファイル: package.json
- [x] TASK-003: 設定ファイル群追加 (tsconfig, tsup, biome, vitest) | 対象ファイル: tsconfig.json, tsup.config.ts, biome.json, vitest.config.ts
- [x] TASK-004: CLIエントリーポイントとソースパス解決 | 対象ファイル: src/cli.ts, src/lib/sources.ts
- [x] TASK-005: init コマンド実装 | 対象ファイル: src/commands/init.ts, src/lib/copy.ts
- [ ] TASK-006: update コマンド実装 | 対象ファイル: src/commands/update.ts
- [ ] TASK-007: ユニットテスト追加 | 対象ファイル: src/lib/copy.test.ts, src/lib/sources.test.ts
- [ ] TASK-008: CHANGELOG.md 追加 | 対象ファイル: CHANGELOG.md
- [ ] TASK-009: README / wiki に npx 手順を追記 | 対象ファイル: README.md, README.ja.md, docs/wiki/en/Getting-Started.md, docs/wiki/ja/Getting-Started.md

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
