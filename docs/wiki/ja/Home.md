# Aphelion Wiki

> **Language**: [English](../en/Home.md) | [日本語](../ja/Home.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 (updated 2026-04-25) of wiki/en/Home.md
> **Audience**: 全ユーザー

**Aphelion Wiki** へようこそ。このWikiはAphelion Claude Codeエージェントワークフローの詳細リファレンスです。

**初めての方はこちら** → [Getting Started](./Getting-Started.md)

---

## このWikiについて

Aphelion のリポジトリの README はクイックスタートと概要をカバーしています。この Wiki は README が意図的に省略している詳細なリファレンスを提供します。

| README | Wiki |
|--------|------|
| プロジェクト概要と背景 | [Architecture: Domain Model](./Architecture-Domain-Model.md): 3 ドメインモデルとセッション分離 |
| クイックスタートコマンド | [Getting Started](./Getting-Started.md): Claude Code セットアップ、初回実行ウォークスルー、シナリオ、トラブルシューティング |
| トリアージプラン表（概要） | [Triage System](./Triage-System.md): 選択ロジック、条件、エージェントマトリクス |
| エージェント一覧（名前のみ） | Agents Reference（ドメイン別）: [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md) — 39 エージェントの入出力と NEXT 条件 |
| — | [Rules Reference](./Rules-Reference.md): 9 つの行動ルールのスコープとカスタマイズ方法 |
| — | [Contributing](./Contributing.md): エージェント・ルールの追加方法、Wiki メンテナンス |

---

## 目次

### コアページ

| ページ | 説明 | 主な読者 |
|--------|------|---------|
| [Getting Started](./Getting-Started.md) | Claude Code セットアップ、初回実行、利用シナリオ、コマンドリファレンス | 新規ユーザー |
| Architecture（3 ページ） | [Domain Model](./Architecture-Domain-Model.md), [Protocols](./Architecture-Protocols.md), [Operational Rules](./Architecture-Operational-Rules.md) — 3 ドメインモデル、ハンドオフファイル、`AGENT_RESULT` プロトコル、ランタイム挙動 | エージェント開発者 |
| [Triage System](./Triage-System.md) | 4 ティアプラン選択ロジック、ドメイン別エージェントマトリクス、必須エージェント | 全ユーザー |
| Agents Reference（5 ページ） | [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md) — 39 エージェント全件 | エージェント開発者 |
| [Rules Reference](./Rules-Reference.md) | 9 つの行動ルール: スコープ・自動ロード・相互関係 | エージェント開発者 |
| [Contributing](./Contributing.md) | エージェント・ルールの追加、バイリンガル同期ワークフロー | エージェント開発者 |

---

## ペルソナ別入口

### 「Aphelionを初めて使いたい」

1. [Getting Started](./Getting-Started.md) を読む — 使用するプラットフォームのクイックスタート
2. `/discovery-flow` を実行
3. [Triage System](./Triage-System.md) を読んでどのエージェントが起動するか理解する

### 「Aphelion の内部動作を理解したい」

1. [Architecture: Domain Model](./Architecture-Domain-Model.md) を読む — ドメインモデルとセッション分離
2. [Architecture: Protocols](./Architecture-Protocols.md) を読む — ハンドオフファイルと AGENT_RESULT
3. [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md) と各ドメイン 4 ページを読む — 各エージェントの責務と連携
4. [Rules Reference](./Rules-Reference.md) を読む — 全エージェントに適用される行動制約

### 「新しいエージェントやルールを追加したい」

1. [Contributing](./Contributing.md) を読む — ファイルテンプレートと AGENT_RESULT 契約
2. [Architecture: Domain Model](./Architecture-Domain-Model.md) を読む — 新エージェントの配置場所を理解する
3. [Rules Reference](./Rules-Reference.md) を読む — 自動適用されるルールを理解する

### 「既存プロジェクトのバグ修正や小さな機能追加をしたい」

1. プロジェクトに `SPEC.md` と `ARCHITECTURE.md` があることを確認 (ない場合はまず `/codebase-analyzer` を実行)
2. `/maintenance-flow {トリガー説明}` を実行 — Flow Orchestrator が Patch / Minor / Major にトリアージします
3. 各プランの詳細は [Triage System: Maintenance Flow Triage](./Triage-System.md#maintenance-フローのトリアージ) を参照

---

## 用語集

| 用語 | 定義 |
|------|------|
| **ドメイン** | ワークフローの3つの主要スコープのいずれか：Discovery（要件探索）、Delivery（設計・実装）、Operations（デプロイ・運用）。Maintenance は主パイプラインと並列で動く独立した第 4 のフロー |
| **Flow Orchestrator**（フローオーケストレーター） | フロー全体を管理する agent（discovery-flow / delivery-flow / operations-flow / maintenance-flow） |
| **トリアージ** | フロー開始時にプロジェクト規模を評価してプランティアを選択するプロセス |
| **プラン** | 4段階の実行ティアのいずれか：Minimal / Light / Standard / Full |
| **ハンドオフファイル** | ドメイン間で情報を受け渡すために使用される `.md` ファイル（DISCOVERY_RESULT.md、DELIVERY_RESULT.md） |
| **AGENT_RESULT** | 完了時に各エージェントが出力する構造化ブロック |
| **NEXT** | 次に実行されるエージェントを指定する `AGENT_RESULT` のフィールド |
| **STATUS** | 完了ステータスフィールド：success / error / failure / suspended / blocked |
| **blocked** | 設計上の曖昧さによりエージェントが続行できない場合に使用する STATUS |
| **正規ソース（canonical source）** | `.claude/` — Claude Code の権威ある定義ファイル |
| **PRODUCT_TYPE** | プロジェクト成果物の分類：service / tool / library / cli |
| **HAS_UI** | プロジェクトにユーザーインターフェースが含まれるか（起動するエージェントに影響） |
| **自動承認モード** | `.aphelion-auto-approve` ファイルで有効化されるモード。自動評価のために承認ゲートをスキップ |
| **Maintenance フロー** | 3 ドメインパイプラインから独立した第 4 のフロー。`/maintenance-flow` で起動し、既存プロジェクトの保守 (バグ・CVE・リファクタ・小機能追加) を扱う。トリアージは Patch / Minor / Major |
| **MAINTENANCE_RESULT.md** | Major プランでのみ生成されるハンドオフファイル。Delivery Flow の前処理として引き渡される |

---

## 関連ページ

- [Getting Started](./Getting-Started.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — Aphelionワークフロー概要（自動ロード）
- [README.ja.md](../../README.ja.md) — プロジェクト入口（日本語）
