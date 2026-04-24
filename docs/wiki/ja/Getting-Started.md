# はじめに

> **Language**: [English](../en/Getting-Started.md) | [日本語](../ja/Getting-Started.md)
> **Last updated**: 2026-04-24
> **EN canonical**: 2026-04-24 of wiki/en/Getting-Started.md
> **Audience**: 新規ユーザー

このページはAphelionを使い始めるために必要なすべてをカバーします：プラットフォーム別のセットアップ、初回実行のウォークスルー、利用シナリオ、コマンドリファレンス、トラブルシューティング。

## 目次

- [前提条件](#前提条件)
- [プラットフォーム別クイックスタート](#プラットフォーム別クイックスタート)
- [初回実行ウォークスルー](#初回実行ウォークスルー)
- [利用シナリオ](#利用シナリオ)
- [コマンドリファレンス](#コマンドリファレンス)
- [典型的なセッションの進み方](#典型的なセッションの進み方)
- [トラブルシューティング](#トラブルシューティング)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## 前提条件

| プラットフォーム | 必要条件 |
|---------------|---------|
| Claude Code | Claude Code CLIのインストールと認証 |
| GitHub Copilot | VS Code、JetBrains、またはNeovimのGitHub Copilot拡張機能 |
| OpenAI Codex | OpenAI Codex環境へのアクセス |

`npx github:kirin0198/aphelion-agents init` でインストールすることもできます（クローン不要）。または、リポジトリを手動でクローンする方法もあります：

```bash
git clone https://github.com/kirin0198/aphelion-agents.git
```

---

## プラットフォーム別クイックスタート

### npx でインストール（推奨）

クローン不要で最も手早く始められる方法です：

```bash
# プロジェクトに初回配置
npx github:kirin0198/aphelion-agents init

# ユーザーホーム (~/.claude/) に配置
npx github:kirin0198/aphelion-agents init --user

# 最新版に更新
npx github:kirin0198/aphelion-agents update
npx github:kirin0198/aphelion-agents update --user
```

### git clone でインストール（代替手順）

リポジトリをクローンしてから手動でファイルをコピーする方法：

### Claude Code（正規ソース）

`.claude/` ディレクトリをプロジェクトにコピーしてClaude Codeを起動：

```bash
cp -r .claude /path/to/your-project/
cd /path/to/your-project && claude

/discovery-flow TODOアプリを作りたい
```

### GitHub Copilot

生成済みのCopilotエージェントファイルをプロジェクトの `.github/` ディレクトリにコピー：

```bash
cp -r platforms/copilot/* /path/to/your-project/.github/
```

IDEでGitHub Copilotのエージェントモードを使用します。Copilotエージェントは `.github/agents/` に配置されます。

### OpenAI Codex

生成済みのCodexファイルをプロジェクトルートにコピー：

```bash
cp platforms/codex/AGENTS.md /path/to/your-project/
cp -r platforms/codex/skills/ /path/to/your-project/
```

Codexはグローバル指示として `AGENTS.md` ファイルを使用します。スキルは個別ユーティリティとして利用できます。

> **注意：** Codexはサブエージェントオーケストレーションをサポートしていません。マルチフェーズのフルフローはClaude CodeとGitHub Copilotでのみ利用可能です。詳細は[プラットフォームガイド](./Platform-Guide.md)を参照してください。

---

## 初回実行ウォークスルー

このウォークスルーは新規プロジェクトでClaude Codeを使用します。

**ステップ1：Aphelionをプロジェクトにコピー**

```bash
cp -r /path/to/aphelion-agents/.claude /path/to/your-project/
cd /path/to/your-project
claude
```

**ステップ2：Discoveryを開始**

```
/discovery-flow ユーザー認証付きのタスク管理Webアプリを作りたい
```

オーケストレーターがプランを決定するためにいくつかのトリアージ質問をします。認証付きWebアプリの場合、StandardまたはFullが選択されます。

**ステップ3：Discovery出力のレビュー**

すべてのDiscoveryフェーズが完了したら、`DISCOVERY_RESULT.md` をレビューします。満足したらDeliveryに進みます。

**ステップ4：Deliveryを開始**

```
/delivery-flow
```

オーケストレーターが `DISCOVERY_RESULT.md` を読み込み、実装フェーズのトリアージを再度行います。

**ステップ5：レビューと反復**

各フェーズ後、オーケストレーターが生成物を表示して承認を求めます。承認・修正依頼・停止を選択できます。

**ステップ6：Operationsを開始（serviceのみ）**

```
/operations-flow
```

`PRODUCT_TYPE: service` の場合のみ必要です。Dockerfile・CI/CD・運用計画を構築します。

---

## 利用シナリオ

### シナリオ1：新規プロジェクト（フルフロー）

ゼロから要件探索 → 設計・実装 → デプロイまで一貫して行う：

```
/discovery-flow ブログ管理システムを作りたい
```

Discoveryが完了し `DISCOVERY_RESULT.md` をレビューした後：

```
/delivery-flow
```

Deliveryが完了した後（serviceプロジェクトの場合）：

```
/operations-flow
```

### シナリオ2：サクッと作りたい（Deliveryのみ）

何を作るかが既に決まっている場合：

```
/pm 連絡先管理のREST APIを作りたい
```

または同等に：

```
/delivery-flow
```

`DISCOVERY_RESULT.md` がないため、オーケストレーターが直接インタビューします。

### シナリオ3：既存プロジェクトへの変更（ドキュメントあり）

プロジェクトに `SPEC.md` と `ARCHITECTURE.md` がある場合：

```
/analyst メールアドレスに特殊文字が含まれるとログインエンドポイントで500エラーが発生する
```

`analyst` がGitHub issueとアプローチ文書を生成した後：

```
/delivery-flow
```

フローはPhase 3（アーキテクチャ）から合流し、仕様・UIデザインをスキップします。

### シナリオ3b：Maintenance フロー (バグ / CVE / 小機能のトリアージ付き)

変更が小さくトリアージを自動化したい場合:

```
/maintenance-flow メールアドレスに特殊文字が含まれるとログインエンドポイントで 500 エラーが発生する
```

`change-classifier` がトリガーを分析して Patch / Minor / Major を提案します。Patch / Minor は単独で完結、Major は `MAINTENANCE_RESULT.md` 経由で `/delivery-flow` へ自動引き渡しされます。

`/maintenance-flow` を `/analyst` よりも優先する判断基準:
- 変更に緊急性がある (P1/P2 インシデント)
- 影響範囲の自動分析 (ファイル・依存関係・リグレッションリスク) を得たい
- 単一 issue ワークフローではなくガイド付きプラン選択が欲しい

### シナリオ4：既存プロジェクトへの変更（ドキュメントなし）

まず仕様書を逆生成：

```
/codebase-analyzer このプロジェクトを分析してSPEC.mdとARCHITECTURE.mdを生成してください
```

レビューと承認後：

```
/analyst OAuth2ソーシャルログインを追加したい
/delivery-flow
```

### シナリオ5：スタンドアロンエージェント

フローなしで任意のエージェントを直接起動できます：

```
/security-auditor  （既存コードにセキュリティ監査を実行）
/reviewer          （コードレビューのみ実行）
/doc-writer        （READMEとCHANGELOGを生成）
```

---

## コマンドリファレンス

| コマンド | 用途 | 入口 |
|---------|------|------|
| `/discovery-flow {説明}` | 要件探索を開始 | 新規プロジェクト |
| `/delivery-flow` | 設計・実装を開始 | Discovery後、または既存SPEC.mdがある場合 |
| `/pm {説明}` | Deliveryを直接開始（ショートハンド） | 要件が固まっている場合 |
| `/operations-flow` | デプロイ・運用を開始 | Delivery後、serviceタイプのみ |
| `/analyst {issue}` | 既存プロジェクトのバグ・機能を分析 | SPEC.mdがあるプロジェクト |
| `/maintenance-flow {トリガー}` | 既存プロジェクトの保守トリアージと実行 (Patch/Minor/Major) | SPEC.md + ARCHITECTURE.md があるプロジェクト |
| `/codebase-analyzer {指示}` | 既存コードから仕様を逆生成 | SPEC.mdがないプロジェクト |

> これらのコマンドは `.claude/commands/*.md` でスラッシュコマンドとして定義（Claude Code）されるか、エージェントモードのインターフェース（Copilot）を通じて起動されます。

---

## 典型的なセッションの進み方

### トリアージ質問

フロー開始時、オーケストレーターがプロジェクトについて4〜6問質問します。なるべく正確に答えてください — これがどのエージェントを実行するかを決定します。

### フェーズ承認

各エージェント完了後、オーケストレーターがサマリーを表示して以下を尋ねます：
- **承認して続行** — 次のフェーズへ進む
- **修正を依頼** — 変更を説明してエージェントが再実行される
- **停止** — フローを終了

### 成果物ファイル

各エージェントは1つ以上のファイルを生成します：

| フェーズ | 生成されるファイル |
|---------|----------------|
| Discovery | INTERVIEW_RESULT.md、RESEARCH_RESULT.md、POC_RESULT.md、SCOPE_PLAN.md、DISCOVERY_RESULT.md |
| Delivery | SPEC.md、UI_SPEC.md、ARCHITECTURE.md、TASK.md、実装コード、TEST_PLAN.md、SECURITY_AUDIT.md、README.md |
| Operations | Dockerfile、docker-compose.yml、.github/workflows/ci.yml、DB_OPS.md、OBSERVABILITY.md、OPS_PLAN.md |

### セッション再開

セッションが中断された場合（特に `developer` の途中）、再開できます：

```
/developer  （TASK.mdから再開）
```

またはフロー全体を再起動してください — 既存のファイルを検出して続きから始めるか最初からやり直すかを尋ねます。

---

## トラブルシューティング

### 「DISCOVERY_RESULT.md に必須フィールドがありません」

Delivery Flowは起動時に `DISCOVERY_RESULT.md` を検証します。必須フィールド（`PRODUCT_TYPE`、「プロジェクト概要」、「要件サマリー」）が不足していると報告された場合、ファイルを編集して不足セクションを追加し、`/delivery-flow` を再実行してください。

### 「エージェントがSTATUS: errorを返しました」

オーケストレーターがオプションを表示します：
- **再実行** — 同じエージェントを再実行
- **修正して再実行** — 修正内容を説明してから再実行
- **スキップ** — このエージェントをスキップして続行
- **停止** — フローを中断

### 「developerが止まっている / 時間がかかりすぎている」

`developer` は `TASK.md` を使用して進捗を追跡します。タスクに時間がかかりすぎる場合は中断して後で再開できます。次の実行では `TASK.md` の最初の未完了タスクから開始します。

### Copilot：エージェントが表示されない

エージェントファイルが `.github/agents/`（`.github/copilot-agents/` ではない）にあることを確認してください。また、Copilot拡張機能がプロジェクトの `.github/` ディレクトリへのアクセス権を持っていることを確認してください。

### Codex：フローコマンドが動作しない

Codexはマルチエージェントオーケストレーションをサポートしていません。フローコマンドの代わりに個別スキル（`/vuln-scan`、`/secrets-scan`）を使用してください。フルオーケストレーションにはClaude CodeまたはCopilotを使用してください。

---

## 関連ページ

- [アーキテクチャ](./Architecture.md)
- [トリアージシステム](./Triage-System.md)
- [プラットフォームガイド](./Platform-Guide.md)

## 正規ソース

- [README.ja.md](../../README.ja.md) — プロジェクト概要とクイックスタート
- [.claude/commands/](../../.claude/commands/) — スラッシュコマンド定義
- [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md) — Discovery フロー起動手順
- [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md) — Delivery フロー起動手順
