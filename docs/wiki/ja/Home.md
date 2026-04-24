# Aphelion Wiki

> **Language**: [English](../en/Home.md) | [日本語](../ja/Home.md)
> **Last updated**: 2026-04-24
> **EN canonical**: 2026-04-24 of wiki/en/Home.md
> **Audience**: 全ユーザー

**Aphelion Wiki** へようこそ。このWikiはAphelionのマルチプラットフォーム対応AIコーディングエージェントワークフローの詳細リファレンスです。

**初めての方はこちら** → [はじめに](./Getting-Started.md)

---

## このWikiについて

Aphelionのリポジトリの README はクイックスタートと概要をカバーしています。このWikiはREADMEが意図的に省略している詳細なリファレンスを提供します。

| README | Wiki |
|--------|------|
| プロジェクト概要と背景 | [アーキテクチャ](./Architecture.md)：3ドメインモデルとセッション分離 |
| クイックスタートコマンド | [はじめに](./Getting-Started.md)：プラットフォーム別セットアップ、シナリオ、トラブルシューティング |
| トリアージプラン表（概要） | [トリアージシステム](./Triage-System.md)：選択ロジック、条件、エージェントマトリクス |
| エージェント一覧（名前のみ） | [エージェントリファレンス](./Agents-Reference.md)：29 エージェント × 4 フローの入出力と NEXT 条件 |
| — | [ルールリファレンス](./Rules-Reference.md)：9つの行動ルールのスコープとカスタマイズ方法 |
| プラットフォーム比較表 | [プラットフォームガイド](./Platform-Guide.md)：生成パイプライン、制約、デプロイ |
| — | [コントリビューション](./Contributing.md)：エージェント・ルール・プラットフォームの追加方法 |

---

## 目次

### コアページ

| ページ | 説明 | 主な読者 |
|--------|------|---------|
| [はじめに](./Getting-Started.md) | プラットフォーム別セットアップ、初回実行、利用シナリオ、コマンドリファレンス | 新規ユーザー |
| [アーキテクチャ](./Architecture.md) | 3ドメインモデル、ハンドオフファイル、セッション分離、AGENT_RESULTプロトコル | エージェント開発者 |
| [トリアージシステム](./Triage-System.md) | 4ティアプラン選択ロジック、ドメイン別エージェントマトリクス、必須エージェント | 全ユーザー |
| [エージェントリファレンス](./Agents-Reference.md) | 29 エージェント全件 (Discovery/Delivery/Operations/Maintenance)：責務・入力・出力・NEXT 条件 | エージェント開発者 |
| [ルールリファレンス](./Rules-Reference.md) | 9つの行動ルール：スコープ・自動ロード・相互関係 | エージェント開発者 |
| [プラットフォームガイド](./Platform-Guide.md) | Claude Code / Copilot / Codexの差異、generate.mjsパイプライン | プラットフォーム移植者 |
| [コントリビューション](./Contributing.md) | エージェント・ルール・プラットフォームの追加、バイリンガル同期ワークフロー | エージェント開発者 |

---

## ペルソナ別入口

### 「Aphelionを初めて使いたい」

1. [はじめに](./Getting-Started.md) を読む — 使用するプラットフォームのクイックスタート
2. `/discovery-flow` を実行（要件が固まっている場合は `/pm`）
3. [トリアージシステム](./Triage-System.md) を読んでどのエージェントが起動するか理解する

### 「Aphelionの内部動作を理解したい」

1. [アーキテクチャ](./Architecture.md) を読む — ドメインモデルとハンドオフ仕組み
2. [エージェントリファレンス](./Agents-Reference.md) を読む — 各エージェントの責務と連携
3. [ルールリファレンス](./Rules-Reference.md) を読む — 全エージェントに適用される行動制約

### 「新しいエージェントやルールを追加したい」

1. [コントリビューション](./Contributing.md) を読む — ファイルテンプレートとAGENT_RESULT契約
2. [アーキテクチャ](./Architecture.md) を読む — 新エージェントの配置場所を理解する
3. [ルールリファレンス](./Rules-Reference.md) を読む — 自動適用されるルールを理解する

### 「既存プロジェクトのバグ修正や小さな機能追加をしたい」

1. プロジェクトに `SPEC.md` と `ARCHITECTURE.md` があることを確認 (ない場合はまず `/codebase-analyzer` を実行)
2. `/maintenance-flow {トリガー説明}` を実行 — オーケストレーターが Patch / Minor / Major にトリアージします
3. 各プランの詳細は [トリアージシステム → Maintenance フローのトリアージ](./Triage-System.md#maintenance-フローのトリアージ) を参照

### 「GitHub CopilotまたはOpenAI CodexでAphelionを使いたい」

1. [プラットフォームガイド](./Platform-Guide.md) を読む — 機能差異と制限事項
2. [はじめに](./Getting-Started.md) を読む — プラットフォーム別クイックスタート

---

## 用語集

| 用語 | 定義 |
|------|------|
| **ドメイン** | ワークフローの3つの主要スコープのいずれか：Discovery（要件探索）、Delivery（設計・実装）、Operations（デプロイ・運用）。Maintenance は主パイプラインと並列で動く独立した第 4 のフロー |
| **フローオーケストレーター** | フロー全体を管理するエージェント（discovery-flow、delivery-flow、operations-flow、maintenance-flow） |
| **トリアージ** | フロー開始時にプロジェクト規模を評価してプランティアを選択するプロセス |
| **プラン** | 4段階の実行ティアのいずれか：Minimal / Light / Standard / Full |
| **ハンドオフファイル** | ドメイン間で情報を受け渡すために使用される `.md` ファイル（DISCOVERY_RESULT.md、DELIVERY_RESULT.md） |
| **AGENT_RESULT** | 完了時に各エージェントが出力する構造化ブロック |
| **NEXT** | 次に実行されるエージェントを指定するAGENT_RESULTのフィールド |
| **STATUS** | 完了ステータスフィールド：success / error / failure / suspended / blocked |
| **blocked** | 設計上の曖昧さによりエージェントが続行できない場合に使用するSTATUS |
| **正規ソース（canonical source）** | `.claude/` — Claude Codeの権威ある定義ファイル |
| **PRODUCT_TYPE** | プロジェクト成果物の分類：service / tool / library / cli |
| **HAS_UI** | プロジェクトにユーザーインターフェースが含まれるか（起動するエージェントに影響） |
| **自動承認モード** | `.aphelion-auto-approve` ファイルで有効化されるモード。自動評価のために承認ゲートをスキップ |
| **Maintenance フロー** | 3 ドメインパイプラインから独立した第 4 のフロー。`/maintenance-flow` で起動し、既存プロジェクトの保守 (バグ・CVE・リファクタ・小機能追加) を扱う。トリアージは Patch / Minor / Major |
| **MAINTENANCE_RESULT.md** | Major プランでのみ生成されるハンドオフファイル。Delivery Flow の前処理として引き渡される |

---

## 関連ページ

- [はじめに](./Getting-Started.md)
- [アーキテクチャ](./Architecture.md)
- [コントリビューション](./Contributing.md)

## 正規ソース

- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — Aphelionワークフロー概要（自動ロード）
- [README.ja.md](../../README.ja.md) — プロジェクト入口（日本語）
