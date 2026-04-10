# Telescope Agents

Claude Code のカスタムエージェント定義集です。
**Telescope ワークフロー** に基づき、プロジェクトの全工程を **Discovery（要件探索）→ Delivery（設計・実装）→ Operations（デプロイ・運用）** の3領域に分割し、各領域を専門エージェントが自動化します。

## フロー概要

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
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
| **Discovery Flow** | 要件探索フロー全体を管理 | DISCOVERY_RESULT.md | — |
| **interviewer** | 要件ヒアリング・構造化 | INTERVIEW_RESULT.md | Minimal〜 |
| **researcher** | ドメイン調査・競合分析 | RESEARCH_RESULT.md | Standard〜 |
| **poc-engineer** | 技術PoC・実現可能性検証 | POC_RESULT.md | Standard〜 |
| **concept-validator** | UIプロトタイプ検証 | CONCEPT_VALIDATION.md | Full (UI時) |
| **scope-planner** | MVP定義・優先順位・リスク評価 | SCOPE_PLAN.md | Light〜 |

### Delivery 領域（設計・実装）

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **Delivery Flow** | 設計・実装フロー全体を管理 | DELIVERY_RESULT.md | — |
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

### スタンドアロンエージェント

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **codebase-analyzer** | 既存コードから SPEC/ARCHITECTURE を逆生成 | SPEC.md, ARCHITECTURE.md | SPEC なしの既存プロジェクト |

### Operations 領域（デプロイ・運用）— サービス専用

| エージェント | 役割 | 主な成果物 | 起動条件 |
|---|---|---|---|
| **Operations Flow** | デプロイ・運用フロー全体を管理 | OPS_RESULT.md | — |
| **infra-builder** | Dockerfile・CI/CD・環境設定 | Dockerfile, CI/CD | Light〜 |
| **db-ops** | DB運用・マイグレーション手順 | DB_OPS.md | Standard〜 |
| **observability** | 監視・ログ・メトリクス設計 | OBSERVABILITY.md | Full |
| **ops-planner** | デプロイ手順・インシデント対応 | OPS_PLAN.md | Light〜 |

## トリアージシステム

各フローオーケストレーターはフロー開始時にプロジェクト特性を判定し、4段階のプラン（Minimal / Light / Standard / Full）から選択します。

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

`.claude/` ディレクトリをプロジェクトにコピーします。

```bash
cp -r .claude /path/to/your-project/
```

### 実行

Claude Code 上でスラッシュコマンドを使って各エージェントを起動できます。

**フルフロー（Discovery → Delivery → Operations）:**

```
/discovery-flow TODOアプリを作りたい
（Discovery 完了後）
/delivery-flow
（Delivery 完了後、service の場合）
/operations-flow
```

**Delivery のみ（従来の使い方）:**

```
/pm TODOアプリを作りたい
```

**既存プロジェクト（SPEC/ARCHITECTURE なし）:**

```
/codebase-analyzer このプロジェクトを分析して
（分析完了後、変更を加える場合）
/analyst ログイン機能を追加したい
/delivery-flow
```

**利用可能なコマンド:**

| コマンド | 用途 |
|---------|------|
| `/discovery-flow` | Discovery フロー（要件探索）を開始 |
| `/pm` / `/delivery-flow` | Delivery フロー（設計・実装）を開始 |
| `/operations-flow` | Operations フロー（デプロイ・運用）を開始 |
| `/analyst` | 既存プロジェクトへの issue 分析（サイドエントリー） |
| `/codebase-analyzer` | SPEC/ARCHITECTURE のない既存プロジェクトを分析 |

各フローオーケストレーターが内部でトリアージを行い、必要なエージェントを自動的に起動します。

**使用例:**

```
/discovery-flow ブログ管理システムを作りたい
/pm TODOアプリを作りたい
/analyst ログイン時に500エラーが発生するバグ
/codebase-analyzer このプロジェクトの仕様と設計を分析して
```

## ファイル構成

```
telescope-agents/
├── README.md
└── .claude/
    ├── CLAUDE.md                      # 全エージェント共通ルール
    ├── agents/                        # エージェント定義（Claude Code 標準配置）
    │   ├── discovery-flow.md
    │   ├── interviewer.md
    │   ├── researcher.md
    │   ├── poc-engineer.md
    │   ├── concept-validator.md
    │   ├── scope-planner.md
    │   ├── delivery-flow.md
    │   ├── spec-designer.md
    │   ├── ux-designer.md
    │   ├── architect.md
    │   ├── scaffolder.md
    │   ├── developer.md
    │   ├── test-designer.md
    │   ├── tester.md
    │   ├── reviewer.md
    │   ├── security-auditor.md
    │   ├── doc-writer.md
    │   ├── releaser.md
    │   ├── analyst.md
    │   ├── codebase-analyzer.md
    │   ├── operations-flow.md
    │   ├── infra-builder.md
    │   ├── db-ops.md
    │   ├── observability.md
    │   └── ops-planner.md
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

## CI/CD との関係

Telescope は**開発時ワークフロー**であり、CI/CD ランタイムではありません。

- `infra-builder` エージェントが GitHub Actions 等の CI/CD パイプライン定義を生成します

## ライセンス

MIT
