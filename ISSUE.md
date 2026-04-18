# ISSUE: Add wiki for agent/rule/platform references

> 最終更新: 2026-04-18
> 更新履歴:
>   - 2026-04-18: 初版作成（analyst 分析結果および承認済み方針の記録）

---

## 1. ユーザー要件

Aphelion は 26 個のエージェント定義、複数の行動ルール (`.claude/rules/`)、3 プラットフォーム向けの生成物（Claude Code / GitHub Copilot / OpenAI Codex）を含む多層構成のワークフロー集である。
現状、README は「何ができるか」「どう始めるか」を簡潔にまとめているが、以下の詳細リファレンスは不足している。

- 各エージェントの責務・入出力・前後関係（26 個分）
- 行動ルール（`.claude/rules/*.md`, `orchestrator-rules.md`）の適用コンテキストとカスタマイズ方法
- プラットフォーム別の配置・生成・差異の実践的ガイド
- Triage System の判定ロジックと各プランの詳細比較
- 既存プロジェクトへの導入フロー（standalone エージェントの使い方を含む）

これらを README に追記すると肥大化するため、**専用の Wiki として分離**する。

---

## 2. Issue 分類

| 項目 | 内容 |
|------|------|
| 種別 | **機能追加（ドキュメント）** |
| GitHub ラベル | `enhancement`, `documentation` |
| 影響範囲 | リポジトリ直下に `wiki/` ディレクトリを新設（コード本体・SPEC.md・ARCHITECTURE.md には変更なし） |
| 既存ドキュメントへの影響 | README はエントリーポイントとして現状維持。Wiki へのリンクを 1 箇所追加する程度 |

---

## 3. 現状分析 — README でカバーされていないギャップ

### 3.1 README がカバーしている内容

- プロジェクトの概要 / ドメインモデル
- サポートプラットフォーム一覧
- Quick Start / Usage Scenarios / Command Reference
- Triage System のプラン表（概要のみ）
- File Structure / Platform Comparison

### 3.2 README でカバーされていないギャップ

| ギャップ | 想定読者 | 現状の参照先 |
|----------|---------|------------|
| 各エージェントの詳細仕様（責務・入出力・STATUS・NEXT） | エージェント開発者 | `.claude/agents/*.md` を直接読む必要あり |
| ルールの適用範囲と上書きポリシー | エージェント開発者 | `.claude/rules/*.md` を直接読む必要あり |
| Triage 判定ロジック（どの条件で Minimal/Light/Standard/Full が選ばれるか） | 新規ユーザー | `.claude/orchestrator-rules.md` のみ |
| プラットフォーム移植（Copilot/Codex の生成物が何をどう削減しているか） | プラットフォーム移植者 | `scripts/generate.py` のソースコードを読む必要あり |
| 既存プロジェクトへの段階導入（analyst / codebase-analyzer の使い分け） | 新規ユーザー | README の 1 シナリオ分のみ |
| 貢献ガイド（エージェント追加時の手順、canonical source の扱い） | エージェント開発者 | 不在 |

---

## 4. 決定事項（承認済み）

前回の analyst セッション（agentId: `aac7e740328d87daf`）で blocked ステータスとなった 4 項目は、ユーザーにより以下のとおり承認された。

| # | 決定項目 | 採用案 | 備考 |
|---|---------|--------|------|
| 1 | 配信方法 | **リポジトリ内 `wiki/` ディレクトリ** | GitHub Wiki は採用しない。バージョン管理と PR レビューを同一リポで完結させる |
| 2 | 主な読者 | **エージェント開発者**（副: 新規ユーザー / プラットフォーム移植者） | ページ構成・深度はエージェント開発者向けを主軸とする |
| 3 | 言語 | **バイリンガル (`wiki/en/` と `wiki/ja/`)、英語 canonical** | 英語を原典とし、日本語は同期翻訳。同期モデルは architect が設計 |
| 4 | README 棲み分け | **エントリー／詳細の分離** | README は現状維持し、Wiki の入り口リンクを 1 箇所追加する |

---

## 5. ページ構成（8 ページ × 2 言語 = 16 ファイル）

各ページは `wiki/en/<slug>.md` と `wiki/ja/<slug>.md` にミラー配置する。

| # | slug | タイトル | 対象読者 | 概要 |
|---|------|---------|---------|------|
| 1 | `Home` | Home | 全員 | Wiki の入口。ページ一覧、ナビゲーション、README との役割分担の説明 |
| 2 | `Getting-Started` | Getting Started | 新規ユーザー | 3 プラットフォーム別のセットアップ、最初の `/discovery-flow` 実行、典型的なセッションの進み方 |
| 3 | `Architecture` | Architecture | エージェント開発者 | 3 ドメインモデル、handoff ファイル（DISCOVERY_RESULT.md / DELIVERY_RESULT.md）、セッション分離、AGENT_RESULT プロトコル |
| 4 | `Triage-System` | Triage System | 新規ユーザー / エージェント開発者 | 4 ティア（Minimal/Light/Standard/Full）の判定基準、各プランに含まれるエージェント、プロダクトタイプ別分岐（service/tool/library/cli） |
| 5 | `Agents-Reference` | Agents Reference | エージェント開発者 | 26 エージェント全件の責務・入力・出力・前後関係・STATUS。ドメインごとに節分け |
| 6 | `Rules-Reference` | Rules Reference | エージェント開発者 | `.claude/rules/*.md` および `orchestrator-rules.md` の全ルール解説、自動ロードの仕組み、カスタマイズ時の注意 |
| 7 | `Platform-Guide` | Platform Guide | プラットフォーム移植者 | Claude Code / Copilot / Codex の差異、`scripts/generate.py` の役割、生成物の配置、機能低下項目（Codex はサブエージェント不可 等） |
| 8 | `Contributing` | Contributing | エージェント開発者 | canonical source の編集ルール、新エージェント追加手順、ルール追加時の影響範囲、生成物の再生成と PR 作法、バイリンガル同期の運用 |

**Agents Reference のページ内構造**（参考）:

```
## Discovery Domain (6)
### interviewer
- Responsibility:
- Inputs:
- Outputs:
- NEXT:
- AGENT_RESULT fields:
### researcher
...
## Delivery Domain (12)
...
## Operations Domain (4)
...
## Standalone (2)
```

---

## 6. 今回のスコープ外

以下は **本 issue では実施しない**。理由とあわせて明記する。

| 項目 | 実施しない理由 |
|------|-------------|
| SPEC.md の作成 | Aphelion はエージェント定義集であり、プロダクトコードとしての UC を持たない。Wiki は「既存のエージェント定義とルールをリファレンス化」する作業であり、新たな UC 導入ではない |
| ARCHITECTURE.md の作成 | 同上。既存の構造（`.claude/` / `platforms/` / `scripts/`）を変更せず、それを解説するドキュメントを追加するのみ |
| Wiki ページ本体の執筆 | 本 issue は方針書（ISSUE.md）とブランチ・GitHub issue 作成のみを扱う。ページ本体は architect（情報アーキテクチャ確定）→ developer（ページ執筆）のフローで進める |
| README の全面書き換え | 決定事項 #4「エントリー／詳細の分離」に従い、README は現状維持。Wiki 入口へのリンク追加のみを発生させる（その追加自体も developer 工程で行う） |
| `scripts/generate.py` の改変決定 | Wiki ファイルがプラットフォーム生成物に含まれるべきか否かは architect の判断に委ねる（§7 でブリーフ） |

---

## 7. architect へのブリーフ

architect は本 ISSUE.md を入力として、**Wiki 専用の軽量な設計書**（フル ARCHITECTURE.md ではなく、Wiki 用の情報アーキテクチャと運用モデルを定義する設計メモ）を作成すること。具体的には以下の項目を決定してほしい。

### 7.1 情報アーキテクチャ

- §5 の 8 ページ構成を確定する（名称・粒度・ページ間リンクの方向性）
- Agents Reference を 1 ページにまとめるか、ドメイン別に分割するかの最終判断
- サイドバー / TOC の提供有無（`_Sidebar.md` 等）

### 7.2 ページテンプレート

各ページ共通のテンプレート（フロントマター、更新履歴ブロック、関連リンクセクション）を定義する。
特に Agents Reference / Rules Reference は項目が多いため、統一フォーマットを先に決めること。

### 7.3 バイリンガル同期モデル

- 英語 canonical と日本語訳の同期ポリシー（同一 PR で必ず揃える / 英語が先行し日本語は追随許容、など）
- 同期状態を可視化する仕組み（例: 各ページ冒頭に `> EN canonical: {commit SHA or date}` を記録）
- 未翻訳時のフォールバック挙動（日本語未整備ページを英語にリダイレクト等）

### 7.4 `scripts/generate.py` 拡張の是非

- Wiki をプラットフォーム生成物（Copilot/Codex 側）にも配布するかを判断する
- 配布する場合の対象ファイル範囲と変換ルール（パス書き換え、画像参照、など）
- 配布しない場合、`.gitignore` や CI への影響を確認する

### 7.5 ディレクトリレイアウト案

architect は少なくとも以下を確定すること。

```
wiki/
├── en/
│   ├── Home.md
│   ├── Getting-Started.md
│   ├── Architecture.md
│   ├── Triage-System.md
│   ├── Agents-Reference.md  # or agents/*.md に分割
│   ├── Rules-Reference.md
│   ├── Platform-Guide.md
│   └── Contributing.md
└── ja/
    └── （同一構成）
```

### 7.6 出力物

architect は以下のいずれかで出力すること（軽量方針を推奨）:

- 推奨: `wiki/DESIGN.md`（Wiki 用の情報アーキテクチャ設計メモ）
- 代替: `ARCHITECTURE.md` の新規セクション追記は不要。Aphelion のコード設計とは分離する

---

## 8. GitHub Issue / PR

- GitHub Issue: 本 analyst セッションで `gh issue create` により作成する（title: "Add wiki for agent/rule/platform references"）
- 作業ブランチ: `feat/add-wiki`（main から分岐）
- PR: **本 analyst セッションでは作成しない**。ISSUE.md のコミット＆プッシュまで。PR は architect → developer のいずれかが成果物を揃えた段階で作成する

---

## 9. 次アクション

- 次エージェント: **architect**
- architect は本 ISSUE.md の §7 をインプットとして Wiki の設計メモを作成する
- その後、developer が §5 の 8 ページ × 2 言語を順次執筆する
