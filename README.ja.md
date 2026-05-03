# Aphelion — Frontier AI Agents

Claude Code 向け AI コーディングエージェント定義集です。40 の専門エージェントがプロジェクトの全工程を自動化します。

[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.com-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.com/)
![agents](https://img.shields.io/badge/agents-40-blueviolet) ![commands](https://img.shields.io/badge/commands-14-blue) ![rules](https://img.shields.io/badge/rules-13-green) ![hooks](https://img.shields.io/badge/hooks-3-orange) ![license](https://img.shields.io/badge/license-MIT-blue)

**[English README](README.md)**

---

## What's Aphelion

Aphelion はソフトウェア開発を 3 つの領域に分割し、それぞれ独立した Flow Orchestrator（フローオーケストレーター）が管理します。

```mermaid
flowchart LR
    DR["DISCOVERY_RESULT.md"]
    DLR["DELIVERY_RESULT.md"]
    OPR["OPS_RESULT.md"]

    Discovery["Discovery Flow\n(6 agents)"] -->|generates| DR
    DR -->|input for| Delivery["Delivery Flow\n(13 agents)"]
    Delivery -->|generates| DLR
    DLR -->|input for| Ops["Operations Flow\n(4 agents)\nservice only"]
    Ops -->|generates| OPR
```

各フェーズ完了ごとにユーザーの承認を得てから次へ進みます。`service` 以外（`tool` / `library` / `cli`）は Operations をスキップします。

---

## Why Aphelion

AI コーディングエージェントは強力ですが、単一セッションではプロジェクト全体を扱いきれません。コンテキストウィンドウが溢れ、品質ゲートが省略され、フェーズ間の構造的な引き継ぎがありません。Aphelion はライフサイクルを独立した領域に分割し、専門エージェント・承認ゲート・ドキュメント駆動のハンドオフでこれらの課題を解決します。

---

## クイックスタート

```bash
npx github:kirin0198/aphelion-agents init
cd /path/to/your-project && claude
/aphelion-init
```

`--user` インストール、キャッシュのトラブルシューティング、git clone による代替手順、利用シナリオの詳細は
[Wiki の Getting Started](docs/wiki/ja/Getting-Started.md) を参照してください。

コマンド一覧は init 後に `/aphelion-help` を実行するか、[Getting Started](docs/wiki/ja/Getting-Started.md) を参照してください。

---

## Features

- **3領域分離** — Discovery / Delivery / Operations を独立セッションで管理し、コンテキスト圧迫を防止
- **トリアージ適応** — プロジェクト規模に応じて Minimal〜Full を自動選択。手動設定不要
- **承認ゲート** — 各フェーズ完了時にユーザー承認を必須化。勝手に先へ進まない
- **セキュリティ必須** — `security-auditor` は全プランで実行（OWASP Top 10 + 依存脆弱性スキャン）
- **ドキュメント駆動** — 領域間は `.md` ハンドオフでトレーサビリティを確保

---

## 詳しく知るには

- **[Wiki Home](docs/wiki/ja/Home.md)** ([English](docs/wiki/en/Home.md)) — 全リファレンス、ペルソナ別エントリーポイント
- [Getting Started](docs/wiki/ja/Getting-Started.md) — 初回実行ウォークスルー、利用シナリオ、トラブルシューティング
- [Architecture: Domain Model](docs/wiki/ja/Architecture-Domain-Model.md) — 3領域モデルとハンドオフファイル
- [Triage System](docs/wiki/ja/Triage-System.md) — プランティアとエージェント選択
- [Agents Reference](docs/wiki/ja/Agents-Orchestrators.md) — 全 40 エージェント

---

## License

MIT
