<p align="center">
  <img src="docs/images/aphelion-logo.png" alt="Aphelion" width="480">
</p>

# Aphelion — Frontier AI Agents

マルチプラットフォーム対応の AI コーディングエージェント定義集です。26 の専門エージェントがプロジェクトの全工程を自動化します。

**[English README](README.md)**

---

## What's Aphelion

Aphelion はソフトウェア開発を3つの領域に分割し、それぞれ独立したフローオーケストレーターが管理します。

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (要件探索)                             (設計・実装)                            (デプロイ・運用)
 6 agents                               12 agents                              4 agents
```

各フェーズ完了ごとにユーザーの承認を得てから次へ進みます。`service` 以外（`tool` / `library` / `cli`）は Operations をスキップします。

### 対応プラットフォーム

| プラットフォーム | サブエージェント連携 | 状態 |
|---------------|-------------------|------|
| **Claude Code** | フル対応（Agent tool） | 正規ソース |
| **GitHub Copilot** | フル対応（agent tool） | ソースから生成 |
| **OpenAI Codex** | Skills のみ | ソースから生成 |

Claude Code ファイル（`.claude/`）が正規ソースです。Copilot / Codex ファイルは `scripts/generate.py` で生成されます。

---

## Why Aphelion

AI コーディングエージェントは強力ですが、単一セッションではプロジェクト全体を扱いきれません。コンテキストウィンドウが溢れ、品質ゲートが省略され、フェーズ間の構造的な引き継ぎがありません。Aphelion はライフサイクルを独立した領域に分割し、専門エージェント・承認ゲート・ドキュメント駆動のハンドオフでこれらの課題を解決します。

---

## Getting Started

### Quick Start

**Claude Code:**

```bash
cp -r .claude /path/to/your-project/
cd /path/to/your-project && claude

/discovery-flow TODOアプリを作りたい
```

**GitHub Copilot:**

```bash
cp -r platforms/copilot/* /path/to/your-project/.github/
```

**OpenAI Codex:**

```bash
cp platforms/codex/AGENTS.md /path/to/your-project/
cp -r platforms/codex/skills/ /path/to/your-project/
```

フローオーケストレーターがプロジェクト規模を自動判定し、必要なエージェントだけを起動します。

### 利用シナリオ

**新規プロジェクト（フルフロー）** — 要件探索から設計・実装・デプロイまで一気通貫:

```
/discovery-flow ブログ管理システムを作りたい
（Discovery 完了後）
/delivery-flow
（Delivery 完了後、service の場合）
/operations-flow
```

**サクッと作りたい（Delivery のみ）** — 要件が固まっている場合:

```
/pm TODOアプリを作りたい
```

**既存プロジェクトの変更（SPEC / ARCHITECTURE あり）** — バグ修正・機能追加・リファクタリング:

```
/analyst ログイン時に500エラーが発生するバグ
（分析完了後）
/delivery-flow
```

**既存プロジェクトの変更（SPEC / ARCHITECTURE なし）** — まず仕様書・設計書を逆生成:

```
/codebase-analyzer このプロジェクトの仕様と設計を分析して
（分析完了後）
/analyst ログイン機能を追加したい
/delivery-flow
```

### コマンド一覧

| コマンド | 用途 |
|---------|------|
| `/discovery-flow` | 要件探索フローを開始 |
| `/pm` `/delivery-flow` | 設計・実装フローを開始 |
| `/operations-flow` | デプロイ・運用フローを開始 |
| `/analyst` | 既存プロジェクトへの issue 分析 |
| `/codebase-analyzer` | 仕様書のない既存プロジェクトを分析 |

---

## Architecture

### 3領域モデル

各領域は独立セッションで動作し、`.md` ファイルでハンドオフします（自動チェーンなし）。

**Discovery**（要件探索） — interviewer → researcher → poc-engineer → concept-validator → rules-designer → scope-planner

**Delivery**（設計・実装） — spec-designer → ux-designer → architect → scaffolder → developer → test-designer → tester → security-auditor → reviewer → doc-writer → releaser

**Operations**（デプロイ・運用） — infra-builder → db-ops → observability → ops-planner

**スタンドアロン** — analyst（issue 分析）、codebase-analyzer（既存コード分析）

### トリアージシステム

フロー開始時にプロジェクト規模を判定し、4段階のプランから必要なエージェントを自動選択します。

| プラン | Discovery | Delivery | Operations |
|--------|-----------|----------|------------|
| **Minimal** | interviewer のみ | 最小構成（5 agents） | — |
| **Light** | + rules-designer, scope-planner | + reviewer, test-designer | infra + ops-planner |
| **Standard** | + researcher, poc-engineer | + scaffolder, doc-writer | + db-ops |
| **Full** | + concept-validator | + releaser | + observability |

`security-auditor` は全プランで必ず実行されます。`ux-designer` は UI を含むプロジェクトでのみ起動します。

### ファイル構成

```
.claude/                         # Claude Code（正規ソース）
├── CLAUDE.md                    # プロジェクト概要
├── rules/*.md                   # 行動ルール（自動ロード）
├── orchestrator-rules.md        # オーケストレーター専用ルール
├── agents/*.md                  # エージェント定義（26ファイル）
└── commands/*.md                # スラッシュコマンド定義

platforms/
├── copilot/                     # GitHub Copilot（生成物）
│   ├── copilot-instructions.md  # → .github/copilot-instructions.md
│   └── agents/*.md              # → .github/agents/*.agent.md
└── codex/                       # OpenAI Codex（生成物）
    ├── AGENTS.md                # → プロジェクトルート
    └── skills/                  # → プロジェクトルート
```

プラットフォームファイルの再生成:

```bash
python3 scripts/generate.py                    # 全プラットフォーム生成
python3 scripts/generate.py --platform copilot # Copilot のみ
python3 scripts/generate.py --platform codex   # Codex のみ
python3 scripts/generate.py --clean            # 生成物を削除
```

### プラットフォーム比較

| 機能 | Claude Code | GitHub Copilot | OpenAI Codex |
|------|------------|----------------|-------------|
| グローバル指示 | `.claude/CLAUDE.md` | `.github/copilot-instructions.md` | `AGENTS.md` |
| エージェント定義 | `.claude/agents/*.md` | `.github/agents/*.agent.md` | N/A（単一エージェント） |
| スキル/コマンド | `.claude/commands/*.md` | — | `skills/*/SKILL.md` |
| サブエージェント | あり（Agent tool） | あり（agent tool） | なし |
| フルオーケストレーション | 可能 | 可能 | 不可 |

> Aphelion は開発時ワークフローであり、CI/CD ランタイムではありません。`infra-builder` が GitHub Actions 等のパイプライン定義を生成します。

---

## ドキュメント

エージェントスキーマ、ルール説明、トリアージロジック、プラットフォーム内部の詳細は **[Wiki](wiki/ja/Home.md)** を参照してください。

| ページ | 説明 |
|-------|-----|
| [はじめに](wiki/ja/Getting-Started.md) | 全プラットフォームのセットアップ、初回実行ウォークスルー、利用シナリオ |
| [アーキテクチャ](wiki/ja/Architecture.md) | 3ドメインモデル、ハンドオフファイル、AGENT_RESULTプロトコル |
| [トリアージシステム](wiki/ja/Triage-System.md) | プランティア、エージェント選択ロジック、HAS_UI条件 |
| [エージェントリファレンス](wiki/ja/Agents-Reference.md) | 全26エージェント — 入力・出力・NEXT条件 |
| [ルールリファレンス](wiki/ja/Rules-Reference.md) | 全8行動ルール — スコープとインタラクション |
| [プラットフォームガイド](wiki/ja/Platform-Guide.md) | Copilot/Codexの差異、ジェネレーター使用方法、移植ガイド |
| [コントリビューティング](wiki/ja/Contributing.md) | エージェント追加方法、バイリンガル同期ポリシー、PRチェックリスト |

---

## Features

- **3領域分離** — Discovery / Delivery / Operations を独立セッションで管理し、コンテキスト圧迫を防止
- **トリアージ適応** — プロジェクト規模に応じて Minimal〜Full を自動選択。手動設定不要
- **承認ゲート** — 各フェーズ完了時にユーザー承認を必須化。勝手に先へ進まない
- **セキュリティ必須** — security-auditor は全プランで実行（OWASP Top 10 + 依存脆弱性スキャン）
- **自動差し戻し** — テスト失敗・レビュー指摘時に原因分析後ロールバック（最大3回）
- **セッション中断・再開** — TASK.md による状態管理で途中再開が可能
- **ドキュメント駆動** — 領域間は `.md` ハンドオフでトレーサビリティを確保
- **マルチプラットフォーム** — Claude Code（正規）、GitHub Copilot、OpenAI Codex
- **多言語対応** — Python / TypeScript / Go / Rust に対応

---

## License

MIT
