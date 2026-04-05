# Telescope Agents

Claude Code のカスタムエージェント定義集です。
**Telescope ワークフロー** に基づき、プロジェクトの全工程を **Discovery（要件探索）→ Delivery（設計・実装）→ Operations（デプロイ・運用）** の3領域に分割し、各領域を専門エージェントが自動化します。

## フロー概要

```
Discovery PM ──[DISCOVERY_RESULT.md]──▶ Delivery PM ──[DELIVERY_RESULT.md]──▶ Operations PM
 (要件探索)                             (設計・実装)                            (デプロイ・運用)
 5 agents                               12 agents                              4 agents
```

各フェーズの完了ごとにユーザーの承認を得てから次へ進みます。
領域間は `.md` ファイルで接続され、自動チェーンはしません。

### 成果物の性質による分岐

| PRODUCT_TYPE | Discovery | Delivery | Operations |
|-------------|-----------|----------|------------|
| `service` | 実行 | 実行 | 実行 |
| `tool` / `library` / `cli` | 実行 | 実行 | **スキップ** |

## エージェント一覧

### Discovery 領域（要件探索）

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **Discovery PM** | 要件探索フロー全体を管理 | DISCOVERY_RESULT.md | — |
| **interviewer** | 要件ヒアリング・構造化 | INTERVIEW_RESULT.md | Minimal〜 |
| **researcher** | ドメイン調査・競合分析 | RESEARCH_RESULT.md | Standard〜 |
| **poc-engineer** | 技術PoC・実現可能性検証 | POC_RESULT.md | Standard〜 |
| **concept-validator** | UIプロトタイプ検証 | CONCEPT_VALIDATION.md | Full (UI時) |
| **scope-planner** | MVP定義・優先順位・リスク評価 | SCOPE_PLAN.md | Light〜 |

### Delivery 領域（設計・実装）

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **Delivery PM** | 設計・実装フロー全体を管理 | DELIVERY_RESULT.md | — |
| **spec-designer** | 要件から仕様書を策定 | SPEC.md | 全プラン |
| **ux-designer** | UI仕様・デザインプロンプトを作成 | UI_SPEC.md | UI時のみ |
| **architect** | 仕様から技術設計書を作成 | ARCHITECTURE.md | 全プラン |
| **scaffolder** | プロジェクト初期化・雛形作成 | プロジェクト構造 | Standard〜 |
| **developer** | 設計に従いコードを実装 | 実装コード, TASK.md | 全プラン |
| **test-designer** | テスト計画を策定 | TEST_PLAN.md | Light〜 |
| **tester** | テストコードを作成・実行 | テストコード, レポート | 全プラン |
| **reviewer** | コード品質・仕様適合をレビュー | レビューレポート | Light〜 |
| **security-auditor** | セキュリティ監査（OWASP Top 10） | SECURITY_AUDIT.md | **全プラン必須** |
| **doc-writer** | README・CHANGELOG を作成 | README.md, CHANGELOG.md | Standard〜 |
| **releaser** | バージョニング・リリース準備 | RELEASE_NOTES.md, git tag | Full |
| **analyst** | バグ/機能追加/リファクタの方針決定 | ISSUE.md, GitHub issue | issue経由 |

### Operations 領域（デプロイ・運用）— サービス専用

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **Operations PM** | デプロイ・運用フロー全体を管理 | OPS_RESULT.md | — |
| **infra-builder** | Dockerfile・CI/CD・環境設定 | Dockerfile, CI/CD | Light〜 |
| **db-ops** | DB運用・マイグレーション手順 | DB_OPS.md | Standard〜 |
| **observability** | 監視・ログ・メトリクス設計 | OBSERVABILITY.md | Full |
| **ops-planner** | デプロイ手順・インシデント対応 | OPS_PLAN.md | Light〜 |

## トリアージシステム

各PMはフロー開始時にプロジェクト特性を判定し、4段階のプラン（Minimal / Light / Standard / Full）から選択します。

| プラン | Discovery | Delivery | Operations |
|--------|-----------|----------|------------|
| **Minimal** | interviewer のみ | 最小構成（5 agents） | — |
| **Light** | + scope-planner | + reviewer + test-designer | infra + ops-planner |
| **Standard** | + researcher + poc-engineer | + scaffolder + doc-writer | + db-ops |
| **Full** | + concept-validator | + releaser | + observability |

## 使い方

### 前提条件

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストールされていること

### セットアップ

`agents/` ディレクトリと `.claude/` ディレクトリをプロジェクトにコピーします。

```bash
# エージェント定義をコピー
mkdir -p .claude/agents
cp agents/delivery/*.md .claude/agents/
cp agents/discovery/*.md .claude/agents/
cp agents/operations/*.md .claude/agents/

# PM ファイルは名前を変更してコピー（重複回避）
cp agents/discovery/PM.md .claude/agents/discovery-PM.md
cp agents/delivery/PM.md .claude/agents/delivery-PM.md
cp agents/operations/PM.md .claude/agents/operations-PM.md

# スラッシュコマンドをコピー
mkdir -p .claude/commands
cp .claude/commands/*.md /path/to/your-project/.claude/commands/
```

`CLAUDE.md` はプロジェクトルートにコピーします。
既存の `CLAUDE.md` がある場合は内容をマージしてください。

```bash
cp CLAUDE.md /path/to/your-project/CLAUDE.md
```

### 実行

Claude Code 上でスラッシュコマンドを使って各エージェントを起動できます。

**フルフロー（Discovery → Delivery → Operations）:**

```
/discovery-pm TODOアプリを作りたい
（Discovery 完了後）
/delivery-pm
（Delivery 完了後、service の場合）
/operations-pm
```

**Delivery のみ（従来の使い方）:**

```
/pm TODOアプリを作りたい
```

**個別エージェントの直接起動:**

| コマンド | エージェント | 用途 |
|---------|------------|------|
| `/discovery-pm` | Discovery PM | 要件探索フロー全体を管理 |
| `/pm` / `/delivery-pm` | Delivery PM | 設計・実装フロー全体を管理 |
| `/operations-pm` | Operations PM | デプロイ・運用フローを管理 |
| `/interviewer` | interviewer | 要件ヒアリング |
| `/researcher` | researcher | ドメイン調査 |
| `/poc-engineer` | poc-engineer | 技術PoC |
| `/concept-validator` | concept-validator | コンセプト検証 |
| `/scope-planner` | scope-planner | スコープ策定 |
| `/spec-designer` | spec-designer | 仕様策定 |
| `/ux-designer` | ux-designer | UIデザイン仕様策定 |
| `/architect` | architect | アーキテクチャ設計 |
| `/scaffolder` | scaffolder | プロジェクト初期化 |
| `/developer` | developer | 実装 |
| `/test-designer` | test-designer | テスト設計 |
| `/tester` | tester | テスト実行 |
| `/reviewer` | reviewer | コードレビュー |
| `/security-auditor` | security-auditor | セキュリティ監査 |
| `/doc-writer` | doc-writer | ドキュメント作成 |
| `/releaser` | releaser | リリース準備 |
| `/analyst` | analyst | バグ/機能追加/リファクタ分析 |
| `/infra-builder` | infra-builder | インフラ構築 |
| `/db-ops` | db-ops | DB運用 |
| `/observability` | observability | 可観測性設計 |
| `/ops-planner` | ops-planner | 運用計画 |

**使用例:**

```
/interviewer ブログ管理システムの要件をヒアリングして
/spec-designer
/architect
/developer フェーズ1を実装して
/analyst ログイン時に500エラーが発生するバグ
/infra-builder
```

引数なしで実行した場合は、エージェントが前提ドキュメントを確認して作業を開始します。

## ファイル構成

```
telescope-agents/
├── CLAUDE.md                          # 全エージェント共通ルール
├── README.md
├── templates/
│   └── REQUIREMENTS_TEMPLATE.md       # 要件定義テンプレート
├── agents/
│   ├── discovery/                     # Discovery 領域 (6 files)
│   │   ├── PM.md
│   │   ├── interviewer.md
│   │   ├── researcher.md
│   │   ├── poc-engineer.md
│   │   ├── concept-validator.md
│   │   └── scope-planner.md
│   ├── delivery/                      # Delivery 領域 (13 files)
│   │   ├── PM.md
│   │   ├── spec-designer.md
│   │   ├── ux-designer.md
│   │   ├── architect.md
│   │   ├── scaffolder.md
│   │   ├── developer.md
│   │   ├── test-designer.md
│   │   ├── tester.md
│   │   ├── reviewer.md
│   │   ├── security-auditor.md
│   │   ├── doc-writer.md
│   │   ├── releaser.md
│   │   └── analyst.md
│   └── operations/                    # Operations 領域 (5 files)
│       ├── PM.md
│       ├── infra-builder.md
│       ├── db-ops.md
│       ├── observability.md
│       └── ops-planner.md
└── .claude/
    ├── agents/                        # Claude Code が参照するエージェント定義
    │   └── *.md                       # agents/ のコピー（フラット配置）
    └── commands/                      # スラッシュコマンド定義
        └── *.md                       # 各エージェントの起動コマンド
```

## 主な特徴

- **3領域分離**: Discovery / Delivery / Operations を独立セッションで管理し、コンテキスト圧迫を防止
- **トリアージ適応**: プロジェクト規模に応じて Minimal〜Full の4段階で自動選択
- **承認ゲート**: 各フェーズ完了時にユーザー承認を必須化し、自律エージェントの暴走を防止
- **セキュリティ必須**: security-auditor は全プランで必ず実行（OWASP Top 10 + 依存脆弱性スキャン）
- **セッション中断・再開**: TASK.md による状態管理で、長時間タスクの途中再開が可能
- **自動差し戻し**: テスト失敗時は原因切り分け判断木による分析後に差し戻し（最大3回）
- **blocked STATUS**: 設計の曖昧さを検出時に自動で該当エージェントに確認を依頼
- **多言語対応**: Python (FastAPI) をデフォルトとしつつ、TypeScript / Go / Rust にも対応
- **ドキュメント駆動**: 領域間は `.md` ファイルのハンドオフでトレーサビリティを確保

## ライセンス

MIT
