# ISSUE: 既存プロジェクト（SPEC/ARCHITECTURE なし）への対応ギャップ

> 作成日: 2026-04-10
> 種別: 機能追加
> ラベル: enhancement

## 問題

既存のコードベースがあるが SPEC.md / ARCHITECTURE.md が存在しないプロジェクトに対して、
Telescope ワークフローに参入するパスが存在しない。

### 現状のフロー

| シナリオ | 対応状況 |
|---------|---------|
| 新規プロジェクト | ✅ discovery-flow → delivery-flow |
| 既存プロジェクト（SPEC/ARCH あり）→ 変更 | ✅ analyst → delivery-flow |
| 既存プロジェクト（SPEC/ARCH なし）→ 変更 | ❌ 未対応 |

### 影響

- `analyst` は SPEC.md を前提とするため動作不可
- `delivery-flow` は新規開発前提のフローであり、既存コードを上書きするリスク
- `discovery-flow` は要件探索用であり、既存コードの理解は対象外

## 対応方針

**専用エージェント `codebase-analyzer` を新設する。**

既存コードベースを分析し、SPEC.md と ARCHITECTURE.md をリバースエンジニアリングで生成する。
生成後は通常の analyst → delivery-flow フローに合流可能になる。

### 想定フロー

```
/codebase-analyzer  （既存コードベースを分析）
    ↓
SPEC.md + ARCHITECTURE.md を生成 → ⏸ ユーザー承認
    ↓
以降は通常フロー:
  /analyst で機能追加・バグ修正・リファクタ
  /delivery-flow で実装
```

### codebase-analyzer の責務

1. プロジェクト構造の調査（ディレクトリ、設定ファイル、依存関係）
2. 技術スタックの特定（言語、フレームワーク、DB、ツール）
3. 機能の抽出（エンドポイント、画面、コマンド等）
4. データモデルの特定（DB スキーマ、エンティティ）
5. SPEC.md の生成（既存機能の仕様書化）
6. ARCHITECTURE.md の生成（既存設計の文書化）

### 変更対象

- 新規: `.claude/agents/codebase-analyzer.md`
- 新規: `.claude/commands/codebase-analyzer.md`
- 更新: `.claude/CLAUDE.md` — ディレクトリ構成、フロー図に追記
- 更新: `README.md` — エージェント一覧、フロー図に追記
