# Waterfall Agents

Claude Code のカスタムエージェント定義集です。
ウォーターフォール型のスペック駆動開発フローを、複数のエージェントが連携して自動化します。

## フロー概要

```
[新規開発（UIあり）]
  planner → designer → architect → developer → tester → reviewer
       ↑                                                         |
       └──────────────── PM が全体を管理 ────────────────────┘

[新規開発（UIなし）]
  planner → architect → developer → tester → reviewer

[既存プロジェクトへの変更]
  analyst → architect → developer → tester → reviewer
```

各フェーズの完了ごとにユーザーの承認を得てから次へ進みます。

## エージェント一覧

| エージェント | 役割 | 主な成果物 |
|---|---|---|
| **planner** | 要件から仕様書を策定 | `SPEC.md` |
| **designer** | UI仕様・デザインプロンプトを作成 | `UI_SPEC.md` |
| **architect** | 仕様から技術設計書を作成 | `ARCHITECTURE.md` |
| **developer** | 設計に従いコードを実装 | 実装コード, `TASK.md` |
| **tester** | テストを作成・実行 | テストコード, テストレポート |
| **reviewer** | コード品質・仕様適合をレビュー | レビューレポート |
| **PM** | フロー全体を管理・承認ゲート制御 | — |
| **analyst** | バグ/機能追加/リファクタの方針決定 | `ISSUE.md`, GitHub issue |

## 使い方

### 前提条件

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストールされていること

### セットアップ

`agents/` ディレクトリをプロジェクトの `.claude/agents/` にコピーします。

```bash
mkdir -p .claude/agents
cp agents/*.md .claude/agents/
```

`CLAUDE.md` はプロジェクトルートにコピーします。
既存の `CLAUDE.md` がある場合は内容をマージしてください。

```bash
cp CLAUDE.md /path/to/your-project/CLAUDE.md
```

### 実行

Claude Code 上で以下のように使用します。

**新規開発（フルフロー）:**

ウォーターフォールオーケストレーターを起動すると、仕様策定からレビューまで順番に進みます。

```
「ウォーターフォールで開発を始めて」
「TODOアプリを作りたい。最初から進めて」
```

**個別エージェントの直接起動:**

```
「仕様を作って」         → planner
「UIを設計して」         → designer
「設計書を作って」       → architect
「実装して」             → developer
「テストを書いて」       → tester
「レビューして」         → reviewer
「バグを修正したい」     → analyst
```

## ファイル構成

```
waterfall-agents/
├── CLAUDE.md                          # 全エージェント共通ルール
├── README.md
└── agents/
    ├── planner.md                  # 仕様策定
    ├── designer.md                 # UIデザイン
    ├── architect.md                # アーキテクチャ設計
    ├── developer.md             # 実装
    ├── tester.md                  # テスト
    ├── reviewer.md                # レビュー
    ├── PM.md      # オーケストレーター
    └── analyst.md                 # Issue対応
```

## 主な特徴

- **承認ゲート**: 各フェーズ完了時にユーザー承認を必須化し、自律エージェントの暴走を防止
- **セッション中断・再開**: `TASK.md` による状態管理で、長時間タスクの途中再開が可能
- **自動差し戻し**: テスト失敗やレビューCRITICAL指摘時に自動でimplementフェーズへ差し戻し（最大3回）
- **多言語対応**: Python (FastAPI) をデフォルトとしつつ、他言語プロジェクトにも対応
- **ドキュメント駆動**: SPEC.md → ARCHITECTURE.md → コードの一方向フローでトレーサビリティを確保

## ライセンス

MIT
