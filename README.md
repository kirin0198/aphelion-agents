# Waterfall Agents

Claude Code のカスタムエージェント定義集です。
ウォーターフォール型のスペック駆動開発フローを、複数のエージェントが連携して自動化します。

## フロー概要

```
[新規開発]
  spec-agent → architect-agent → implement-agent → test-agent → review-agent
       ↑                                                              |
       └──────────── waterfall-orchestrator が全体を管理 ─────────────┘

[既存プロジェクトへの変更]
  issue-agent → architect-agent → implement-agent → test-agent → review-agent
```

各フェーズの完了ごとにユーザーの承認を得てから次へ進みます。

## エージェント一覧

| エージェント | 役割 | 主な成果物 |
|---|---|---|
| **spec-agent** | 要件から仕様書を策定 | `SPEC.md`, `UI_SPEC.md` |
| **architect-agent** | 仕様から技術設計書を作成 | `ARCHITECTURE.md` |
| **implement-agent** | 設計に従いコードを実装 | 実装コード, `TASK.md` |
| **test-agent** | テストを作成・実行 | テストコード, テストレポート |
| **review-agent** | コード品質・仕様適合をレビュー | レビューレポート |
| **waterfall-orchestrator** | フロー全体を管理・承認ゲート制御 | — |
| **issue-agent** | バグ/機能追加/リファクタの方針決定 | `ISSUE.md`, GitHub issue |

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
「仕様を作って」         → spec-agent
「設計書を作って」       → architect-agent
「実装して」             → implement-agent
「テストを書いて」       → test-agent
「レビューして」         → review-agent
「バグを修正したい」     → issue-agent
```

## ファイル構成

```
waterfall-agents/
├── CLAUDE.md                          # 全エージェント共通ルール
├── README.md
└── agents/
    ├── spec-agent.md                  # 仕様策定
    ├── architect-agent.md             # アーキテクチャ設計
    ├── implement-agent.md             # 実装
    ├── test-agent.md                  # テスト
    ├── review-agent.md                # レビュー
    ├── waterfall-orchestrator.md      # オーケストレーター
    └── issue-agent.md                 # Issue対応
```

## 主な特徴

- **承認ゲート**: 各フェーズ完了時にユーザー承認を必須化し、自律エージェントの暴走を防止
- **セッション中断・再開**: `TASK.md` による状態管理で、長時間タスクの途中再開が可能
- **自動差し戻し**: テスト失敗やレビューCRITICAL指摘時に自動でimplementフェーズへ差し戻し（最大3回）
- **多言語対応**: Python (FastAPI) をデフォルトとしつつ、他言語プロジェクトにも対応
- **ドキュメント駆動**: SPEC.md → ARCHITECTURE.md → コードの一方向フローでトレーサビリティを確保

## ライセンス

MIT
