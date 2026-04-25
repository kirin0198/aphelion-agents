# Maintenance Flow — Wiki 反映方針ドキュメント

> 最終更新: 2026-04-24
> 更新履歴:
>   - 2026-04-24: 初版作成 (analyst フェーズ・wiki 反映漏れ方針決定)
> ブランチ: `feat/maintenance-flow` (PR #29 に追加コミットとして反映)
> 関連: [maintenance-flow.md](./maintenance-flow.md) (一次仕様)
> 対応フェーズ: 本ドキュメントは方針策定のみ。実装 (実テキスト差し込み) は developer フェーズに委譲する

---

## 0. 本ドキュメントの位置付け

PR #29 で `/maintenance-flow` の実体 (3 エージェント + 1 コマンド + ルール差分) を実装したが、
**ユーザー向けドキュメント層 (`docs/wiki/` + `site/` 生成物)** に変更が反映されていない。

本ドキュメントは:

1. wiki への反映漏れを**網羅的に洗い出し**
2. 各ファイルについて**どこに / どんなテキストを挿入するか**を具体化
3. **ja / en の対訳**を developer がそのまま貼れる粒度で用意
4. Mermaid 図の差分を diff 形式で提示
5. Astro サイトへの影響 (sidebar・sync 挙動) を明確化

を目的とする。

---

## 1. 更新対象ファイル一覧 (網羅)

### 1.1 必須更新 (must)

| # | ファイル | 変更種別 | 優先度 | 根拠 |
|---|---------|---------|--------|------|
| 1 | `docs/wiki/en/Architecture.md` | 差分 (第 4 フロー記述・図更新) | **必須** | Home からリンクされる中核ページ。3 ドメインモデル記述の真正性が崩れる |
| 2 | `docs/wiki/ja/Architecture.md` | 差分 | **必須** | 同上 (ja 同期) |
| 3 | `docs/wiki/en/Triage-System.md` | 差分 (Maintenance Flow Triage セクション追加) | **必須** | トリアージ判定基準を唯一掲載している。`change-classifier` の 3 段階トリアージが欠落 |
| 4 | `docs/wiki/ja/Triage-System.md` | 差分 | **必須** | 同上 |
| 5 | `docs/wiki/en/Agents-Reference.md` | 差分 (3 エージェント追加・目次更新) | **必須** | 27 → 30 エージェント。Contributing.md でも「新エージェントは必ず追加」と明記されている |
| 6 | `docs/wiki/ja/Agents-Reference.md` | 差分 | **必須** | 同上 |
| 7 | `docs/wiki/en/Home.md` | 差分 (数値・ペルソナ入口) | **必須** | 「27エージェント」などの数値が実体と乖離する |
| 8 | `docs/wiki/ja/Home.md` | 差分 | **必須** | 同上 |

### 1.2 推奨更新 (should)

| # | ファイル | 変更種別 | 優先度 | 根拠 |
|---|---------|---------|--------|------|
| 9 | `docs/wiki/en/Getting-Started.md` | 差分 (コマンド表・シナリオ追加) | 推奨 | `/maintenance-flow` の使い方を新規ユーザーに示さないと発見不可能になる |
| 10 | `docs/wiki/ja/Getting-Started.md` | 差分 | 推奨 | 同上 |
| 11 | `docs/wiki/en/Contributing.md` | 差分 (新オーケストレーター追加時のチェックリスト言及) | 推奨 | 将来同種の追加時のワークフロー明文化。ただし今回の影響は軽微 |
| 12 | `docs/wiki/ja/Contributing.md` | 差分 | 推奨 | 同上 |
| 13 | `site/src/content/docs/en/index.mdx` | 差分 (27 → 30, カード構成) | 推奨 | splash ページのカード数字がズレる |
| 14 | `site/src/content/docs/ja/index.mdx` | 差分 | 推奨 | 同上 |

### 1.3 任意 (may)

| # | ファイル | 変更種別 | 優先度 | 根拠 |
|---|---------|---------|--------|------|
| 15 | `docs/wiki/en/Platform-Guide.md` | 差分 (`/maintenance-flow` コマンド追記) | 任意 | Claude Code スラッシュコマンド表に 1 行追加するのみ |
| 16 | `docs/wiki/ja/Platform-Guide.md` | 差分 | 任意 | 同上 |
| 17 | `docs/wiki/en/Rules-Reference.md` | 差分なし (既存ルール数は 10 件で変化なし) | **不要** | maintenance-flow は新規ルールを追加しない |

### 1.4 自動反映 (手動更新不要)

| ファイル | 自動化元 | 備考 |
|---------|---------|------|
| `site/src/content/docs/en/*.md` (home/getting-started/architecture/...) | `scripts/sync-wiki.mjs` | `docs/wiki/en/*.md` をコピーし frontmatter を自動付与する。**wiki を更新すれば自動追随する** |
| `site/src/content/docs/ja/*.md` | 同上 | 同上 |
| `platforms/copilot/`, `platforms/codex/` | `scripts/generate.mjs` | 既に PR #29 で `ORCHESTRATOR_NAMES` に `maintenance-flow` が追加済み。wiki は配布対象外 (DESIGN.md §4.1) |

> **重要**: `sync-wiki.mjs` は `docs/wiki/en/` と `docs/wiki/ja/` の Markdown を読んで `site/src/content/docs/{en,ja}/` に出力する単方向同期である。
> したがって **「wiki を更新する」=「site も自動更新される」** と考えてよい。site 側のファイルを直接編集してはならない。

---

## 2. Astro サイト側への影響

### 2.1 sidebar (`site/astro.config.mjs`) の更新要否

**結論: 更新不要** (方針 A を推奨)。

判断根拠:
- 現行の `PAGES` 配列は 8 ページ構成 (Home / Getting-Started / Architecture / Triage-System / Agents-Reference / Rules-Reference / Platform-Guide / Contributing) で、DESIGN.md §1.1 の構成を厳密に維持している
- maintenance-flow 関連情報は既存ページ内のセクション追記で吸収可能 (Architecture.md / Triage-System.md / Agents-Reference.md)
- 専用ページ (例: `Maintenance-Flow.md`) を新設すると DESIGN.md §1.1 を逸脱する (8 ページ構成は ADR 事項)

#### 方針 A (推奨): 新規ページは作らず既存 8 ページ内に統合
- メリット: DESIGN.md を維持、sidebar 無変更、翻訳同期コスト最小
- デメリット: Architecture / Triage / Agents-Reference の 3 ページに分散するため発見性がやや劣化

#### 方針 B (却下): `docs/wiki/{en,ja}/Maintenance-Flow.md` を新規追加
- メリット: 単一ページで完結、発見性が高い
- デメリット: DESIGN.md §1.1 の 8 ページ制約を破る。`PAGES` 配列と翻訳対を追加する必要。保守負荷増
- **却下理由**: maintenance-flow は独立ドメインだが、ドキュメント量は現状の追記量で十分吸収できる範囲。専用ページは ADR-005 相当の判断が必要で本 issue スコープ外

### 2.2 新規コンポーネントの要否

**結論: 不要**。

- `site/src/components/` は現状 `Head.astro` のみ (mermaid 初期化用)
- splash ページ (`index.mdx`) のカード構成に `Card` が 1 枚増えるかどうかの問題のみ (§7 参照)
- Starlight 標準コンポーネントで十分

### 2.3 `site/` 配下で手動更新が必要なファイル

| ファイル | 変更内容 | 自動同期対象か |
|---------|---------|--------------|
| `site/src/content/docs/en/index.mdx` | カード数字・構成更新 | **手動** (sync-wiki.mjs は `wiki/*.md` のみ処理、`.mdx` は対象外) |
| `site/src/content/docs/ja/index.mdx` | 同上 | **手動** |
| `site/src/content/docs/{en,ja}/*.md` | wiki の変更が自動反映 | **自動** (`sync-wiki.mjs` が処理) |

> `index.mdx` は `sync-wiki.mjs` のコピー対象ではなく、`docs/wiki/` 側にも対応する source が無い (splash 専用)。§7 で対応する。

---

## 3. `sync-wiki.mjs` の自動生成範囲 (重複作業回避)

`scripts/sync-wiki.mjs` の挙動を精査した結果、以下が明らかになった。

### 3.1 自動処理されるもの

1. `docs/wiki/{en,ja}/*.md` のコピー → `site/src/content/docs/{en,ja}/{slug}.md`
2. frontmatter 自動付与 (`title` / `description`)
3. H1 タイトル削除 (Starlight が frontmatter.title を使うため)
4. 相対リンク (`./Foo.md`) の Starlight 絶対パス (`/{locale}/foo/`) への書き換え
5. wiki 外 Markdown リンク (例: `../../.claude/rules/foo.md`) の GitHub blob URL 化
6. 画像アセット (`docs/images/*`) → `site/src/assets/` または `site/public/`

### 3.2 自動処理されないもの (手動更新必須)

- `site/src/content/docs/{en,ja}/index.mdx` (splash ページ本体) — §7 で対応
- `site/astro.config.mjs` (sidebar 定義) — §2.1 より今回は変更不要
- `.claude/agents/*.md` や `.claude/rules/*.md` のリンク先実体 (wiki 内リンクから参照されるが、自動同期対象ではない)

### 3.3 重複作業回避の結論

> **wiki 側の 8 ページ (ja/en) を正しく更新すれば、site/ 側の `.md` は自動で追随する。**
> developer が手動で更新すべき site ファイルは `index.mdx` (en/ja) のみ。

---

## 4. 更新の優先順位

| 優先度 | ファイル群 | 目安 |
|-------|----------|------|
| **P1 (必須・即時)** | Architecture.md, Triage-System.md, Agents-Reference.md, Home.md (ja/en それぞれ) | 1 コミット目 |
| **P2 (推奨)** | Getting-Started.md (ja/en), index.mdx (ja/en), Contributing.md (ja/en) | 2 コミット目 |
| **P3 (任意)** | Platform-Guide.md (ja/en) | 3 コミット目 or スキップ |

コミット分割推奨案:
- Commit 1: `docs: reflect maintenance-flow in wiki core pages (Home/Architecture/Triage/Agents)` (P1)
- Commit 2: `docs: add /maintenance-flow entry to Getting-Started, Contributing, and splash` (P2)
- Commit 3: `docs: list /maintenance-flow in Platform-Guide slash command table` (P3, 任意)

---

## 5. Triage-System.md への追記方針

### 5.1 方針判断

ユーザー質問: 「Maintenance Flow Triage を独立セクションとして追加するか、既存 Triage 表に列を増やすか」

#### 方針 A (推奨): **独立セクションとして追加**
- 理由 1: 判定基準が既存 3 フロー (Minimal/Light/Standard/Full) と根本的に異なる (緊急度・破壊的変更・SPEC 影響度の 4 観点総合判定)
- 理由 2: プラン名 (Patch/Minor/Major) も既存と重複しない
- 理由 3: maintenance-flow.md §4.1・10.3 で「独立テーブル」として設計されている
- 理由 4: 既存表に列追加すると「Minimal プラン × Maintenance Flow」のような意味不明なセルが生まれる

#### 方針 B (却下): 既存 Triage 表に列追加
- 形状が合わない (4 段階 vs 3 段階)
- 既存表は「Discovery/Delivery/Operations Flow Triage」の 3 つの独立表であり、maintenance の 4 つ目として追加するのは自然だが内容は完全独立

#### 最終方針

> **既存の Discovery/Delivery/Operations のそれぞれのセクションと並列に、「Maintenance Flow Triage」という新規セクションを追加する。**
> 表は Plan / Trigger Condition / Agents Launched / Phase Sequence の 4 項目で、既存形式を踏襲する。

### 5.2 挿入位置

`docs/wiki/en/Triage-System.md`:
- L145 直後 (`## Operations Flow Triage` セクションの終端、`### Operations Assessment Criteria` の後)
- `## Mandatory Agents (Always Run)` の直前に挿入

`docs/wiki/ja/Triage-System.md`:
- L152 直後 (同等位置)

### 5.3 追記テキスト (en 版)

```markdown
---

## Maintenance Flow Triage

The Maintenance Flow is a **fourth flow independent from Discovery / Delivery / Operations**, invoked manually via `/maintenance-flow` for existing-project maintenance tasks (bug fixes, CVE responses, performance regressions, tech-debt cleanup, small feature extensions). Triage is performed by `change-classifier` based on **4 dimensions**: priority (P1–P4), estimated file count, breaking-change presence, and SPEC.md impact.

| Plan | Trigger Condition | Agents Launched |
|------|-----------------|----------------|
| **Patch** | Bug fix / security patch / 1–3 files / no breaking change | `change-classifier` → `analyst` → `developer` → `tester` |
| **Minor** | Feature addition / refactor / 4–10 files / no breaking change | + `impact-analyzer` → `architect` (differential mode) → `reviewer` |
| **Major** | Breaking change / DB schema change / 11+ files / major SPEC impact | + `security-auditor` → handoff to `delivery-flow` via `MAINTENANCE_RESULT.md` |

`security-auditor` is mandatory only for Major. Patch and Minor may skip it unless trigger type is `security`.

### Maintenance Phase Sequence by Plan

**Patch:**
```
Phase 1: Classification         → change-classifier → approval
Phase 2: Issue creation         → analyst           → approval
Phase 3: Implementation         → developer         → approval
Phase 4: Test execution         → tester            → approval → done
```

**Minor:**
```
Phase 1: Classification         → change-classifier  → approval
Phase 2: Impact analysis        → impact-analyzer    → approval
Phase 3: Issue creation         → analyst            → approval
Phase 4: Differential design    → architect          → approval
Phase 5: Implementation         → developer          → approval
Phase 6: Test execution         → tester             → approval
Phase 7: Review                 → reviewer           → approval → done
```

**Major (handoff to delivery-flow):**
```
Phase 1: Classification         → change-classifier  → approval
Phase 2: Impact analysis        → impact-analyzer    → approval
Phase 3: Issue creation         → analyst            → approval
Phase 4: Pre-audit              → security-auditor   → approval
Phase 5: Handoff                → MAINTENANCE_RESULT.md → delivery-flow
```

### SPEC.md / ARCHITECTURE.md Preconditions

If either is missing at flow start, `change-classifier` proposes inserting `codebase-analyzer` as Phase 0 with user confirmation. After `codebase-analyzer` generates the missing documents, `change-classifier` re-runs classification.

### Handoff File (Major only)

When the plan is Major, `maintenance-flow` generates `MAINTENANCE_RESULT.md` with fields compatible with `DISCOVERY_RESULT.md` (PRODUCT_TYPE, project overview, impact summary). This file is the handoff artifact for `delivery-flow`.

```

### 5.4 追記テキスト (ja 版)

```markdown
---

## Maintenance フローのトリアージ

Maintenance フローは **Discovery / Delivery / Operations から独立した第 4 のフロー**であり、既存プロジェクトの保守タスク (バグ修正・CVE 対応・パフォーマンス劣化・技術的負債・既存機能の小規模拡張) に対して `/maintenance-flow` で手動起動されます。トリアージは `change-classifier` が以下の **4 観点**で判定します: 緊急度 (P1–P4)、影響ファイル数、破壊的変更の有無、SPEC.md への影響度。

| プラン | トリガー条件 | 起動エージェント |
|-------|------------|---------------|
| **Patch** | バグ修正 / セキュリティパッチ / 1–3 ファイル / 破壊的変更なし | `change-classifier` → `analyst` → `developer` → `tester` |
| **Minor** | 機能追加 / リファクタ / 4–10 ファイル / 破壊的変更なし | + `impact-analyzer` → `architect` (差分モード) → `reviewer` |
| **Major** | 破壊的変更 / DB スキーマ変更 / 11 ファイル以上 / SPEC への大きな影響 | + `security-auditor` → `MAINTENANCE_RESULT.md` で `delivery-flow` へ引き渡し |

`security-auditor` は Major でのみ必須です。Patch / Minor では `trigger_type` が `security` でなければ省略できます。

### プラン別 Maintenance フェーズシーケンス

**Patch:**
```
Phase 1: 分類            → change-classifier → 承認
Phase 2: issue 化・方針  → analyst           → 承認
Phase 3: 実装            → developer         → 承認
Phase 4: テスト実行      → tester            → 承認 → 完了
```

**Minor:**
```
Phase 1: 分類            → change-classifier  → 承認
Phase 2: 影響範囲調査    → impact-analyzer    → 承認
Phase 3: issue 化・方針  → analyst            → 承認
Phase 4: 差分アーキテクチャ設計 → architect    → 承認
Phase 5: 実装            → developer          → 承認
Phase 6: テスト実行      → tester             → 承認
Phase 7: レビュー        → reviewer           → 承認 → 完了
```

**Major (delivery-flow へ引き渡し):**
```
Phase 1: 分類            → change-classifier  → 承認
Phase 2: 影響範囲調査    → impact-analyzer    → 承認
Phase 3: issue 化・方針  → analyst            → 承認
Phase 4: 事前セキュリティ監査 → security-auditor → 承認
Phase 5: 引き渡し        → MAINTENANCE_RESULT.md → delivery-flow
```

### SPEC.md / ARCHITECTURE.md の前提条件

フロー開始時にいずれかが存在しない場合、`change-classifier` はユーザー確認のうえで `codebase-analyzer` を Phase 0 として挿入することを提案します。`codebase-analyzer` がドキュメントを生成した後、`change-classifier` が分類を再実行します。

### ハンドオフファイル (Major のみ)

プランが Major の場合、`maintenance-flow` は `DISCOVERY_RESULT.md` 互換のフィールド (PRODUCT_TYPE、プロジェクト概要、影響サマリ) を持つ `MAINTENANCE_RESULT.md` を生成します。これが `delivery-flow` への引き渡し成果物になります。

```

---

## 6. Architecture.md のフロー図更新方針

### 6.1 方針判断

Architecture.md には 3 つの Mermaid 図がある:
1. **3-Domain Model** (`flowchart LR` で Discovery → Delivery → Operations)
2. **Agent Flow** (`flowchart LR` で D/DV/O/Standalone のブロック図)
3. **Handoff File Schema** (`flowchart LR` でファイル構造図)
4. **AGENT_RESULT state diagram** (変更不要)
5. **Triage Tiers** (`flowchart LR` で 3 subgraph) — Maintenance subgraph 追加候補
6. **Sandbox** (変更不要)

#### 方針 A (推奨): 図 1 と図 5 のみ更新、その他は差分記述で吸収
- **図 1 (3-Domain Model)**: Maintenance ノードを追加し、「Major → delivery-flow」の点線矢印を引く
- **図 5 (Triage Tiers)**: `Maintenance Flow Triage` subgraph を追加 (Patch/Minor/Major の 3 ノード)
- **図 2 (Agent Flow)**: Maintenance ドメインは横に並べず、Standalone と同様に「側面エントリ」として点線で描く → 複雑化するので**更新しない**。代わりに「For maintenance see [Triage System](./Triage-System.md#maintenance-flow-triage)」という注記を Agent Flow 直下に追加
- **図 3 (Handoff File Schema)**: `MAINTENANCE_RESULT.md` を追加し、`delivery-flow` への矢印を足す

#### 方針 B (却下): 全図を大改修
- 読みやすさが損なわれる
- 差分レビューが困難
- 3 ドメインという元来の設計原則の強調が薄れる

### 6.2 図 1 の diff (en 版)

Architecture.md L32–L44 付近。

```diff
 <!-- source: .claude/rules/aphelion-overview.md -->
 ```mermaid
 flowchart LR
     DR["DISCOVERY_RESULT.md"]
     DLR["DELIVERY_RESULT.md"]
     OPR["OPS_RESULT.md"]
+    MR["MAINTENANCE_RESULT.md\n(Major only)"]

     Discovery["Discovery Flow\n(6 agents)"] -->|generates| DR
     DR -->|input for| Delivery["Delivery Flow\n(12 agents)"]
     Delivery -->|generates| DLR
     DLR -->|input for| Ops["Operations Flow\n(4 agents)\nservice only"]
     Ops -->|generates| OPR
+
+    Maintenance["Maintenance Flow\n(3 new agents + reuse)"] -->|Major| MR
+    MR -.->|handoff| Delivery
 ```
```

ja 版 (L33–L45 付近) は同一 diff。

### 6.3 図 5 (Triage Tiers) の diff

Architecture.md en L315–L339 / ja L322–L346 付近。

```diff
 ```mermaid
 flowchart LR
     subgraph Discovery ["Discovery Flow Triage"]
         direction TB
         DMin["Minimal\n1 agent\nPersonal tool / small script"]
         DLit["Light\n3 agents\nPersonal side project"]
         DStd["Standard\n5 agents\nExternal dependencies"]
         DFul["Full\n6 agents\nLarge-scale / complex"]
     end

     subgraph Delivery ["Delivery Flow Triage"]
         direction TB
         VMin["Minimal\n5 agents\nSingle-function tool"]
         VLit["Light\n+reviewer +test-designer\nPersonal side project"]
         VStd["Standard\n+scaffolder +doc-writer\nMulti-file project"]
         VFul["Full\n+releaser\nPublic / OSS"]
     end

     subgraph Operations ["Operations Flow Triage"]
         direction TB
         OLit["Light\n2 agents\nPaaS / single container"]
         OStd["Standard\n+db-ops\nAPI + DB architecture"]
         OFul["Full\n+observability\nHigh availability"]
     end
+
+    subgraph Maintenance ["Maintenance Flow Triage"]
+        direction TB
+        MPat["Patch\n4 agents\nBug / CVE / 1–3 files"]
+        MMin["Minor\n7 agents\nFeature / refactor / 4–10 files"]
+        MMaj["Major\n→ delivery-flow\nBreaking / 11+ files"]
+    end
 ```
```

### 6.4 図 3 (Handoff File Schema) の diff

```diff
 ```mermaid
 flowchart LR
     DR["DISCOVERY_RESULT.md\n---\nPRODUCT_TYPE\nProject overview\nRequirements summary\nScope\nTechnical risks & constraints"]
     DLR["DELIVERY_RESULT.md\n---\nPRODUCT_TYPE\nArtifacts (SPEC/ARCH)\nTech stack\nTest results\nSecurity audit results"]
     OPR["OPS_RESULT.md\n---\nArtifact list\nDeploy readiness\nOpen issues"]
+    MR["MAINTENANCE_RESULT.md\n(Major only)\n---\nPRODUCT_TYPE\nImpact summary\nBreaking changes\nRegression risk"]

     scope-planner -->|generates| DR
     DR -->|read by| delivery-flow
     delivery-flow -->|generates| DLR
     DLR -->|read by| operations-flow
     operations-flow -->|generates| OPR
+    maintenance-flow -->|Major| MR
+    MR -.->|read by| delivery-flow
 ```
```

### 6.5 本文記述の追加 (en 版)

`## Three-Domain Model` セクション末尾 (図の直後の説明文「Operations builds infrastructure ...」の後) に以下を追加:

```markdown
**Maintenance (fourth flow, independent)** triggers on bugs, CVE alerts, performance regressions, or small feature requests for existing projects. Performs Patch / Minor / Major triage via `change-classifier`. Patch and Minor complete independently; Major generates `MAINTENANCE_RESULT.md` and hands off to Delivery Flow as a pre-processing stage. See [Maintenance Flow Triage](./Triage-System.md#maintenance-flow-triage) for details.
```

ja 版:

```markdown
**Maintenance (独立した第 4 のフロー)** はバグ報告・CVE アラート・パフォーマンス劣化・既存プロジェクトの小規模機能追加を契機に起動します。`change-classifier` によって Patch / Minor / Major をトリアージします。Patch と Minor は単独で完結し、Major は `MAINTENANCE_RESULT.md` を生成して前処理フローとして Delivery Flow に引き渡します。詳細は [Maintenance フローのトリアージ](./Triage-System.md#maintenance-フローのトリアージ) を参照してください。
```

### 6.6 `### Agent Flow` 直下への注記追加

en L78–L83 付近 (Per-domain details の直後):

```markdown
Maintenance-flow agents (change-classifier, impact-analyzer, maintenance-flow) appear under the "Standalone" cluster above because they are invoked independently of the primary 3-domain pipeline. See [Agents Reference → Maintenance](./Agents-Reference.md#maintenance-domain) for their full specs.
```

ja 版:

```markdown
Maintenance 関連エージェント (change-classifier, impact-analyzer, maintenance-flow) は 3 ドメインパイプラインから独立して起動されるため、上図では "Standalone" クラスタに含めて表示しています。各エージェントの詳細は [エージェントリファレンス → Maintenance](./Agents-Reference.md#maintenanceドメイン) を参照してください。
```

---

## 7. Agents-Reference.md への 3 エージェント追加方針

### 7.1 挿入位置の方針

#### 方針 A (推奨): 新セクション `## Maintenance Domain` を作成
- Discovery / Delivery / Operations の 3 セクションと並列に配置
- maintenance-flow オーケストレーターは既存の `## Flow Orchestrators` セクションに追加
- change-classifier / impact-analyzer は新セクション内に配置

#### 方針 B (却下): Standalone に含める
- maintenance-flow はフローであり standalone ではない
- change-classifier / impact-analyzer も独立利用ではなく maintenance-flow 内での使用が主

### 7.2 具体配置

1. `## Flow Orchestrators` セクション内に `### maintenance-flow` を追加 (`operations-flow` の直後)
2. `## Operations Domain` と `## Safety Agents` の間に新セクション `## Maintenance Domain (3 agents)` を追加
3. このセクション内に `### change-classifier` と `### impact-analyzer` を配置
4. `## Table of Contents` に該当リンクを追加

### 7.3 追加テキスト (en 版 / Flow Orchestrators 節)

```markdown
### maintenance-flow

- **Canonical**: [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md)
- **Domain**: Orchestrator (Maintenance — fourth flow)
- **Responsibility**: Manages the maintenance lifecycle for existing projects. Receives a trigger (bug / CVE / performance / tech-debt / feature), performs Patch / Minor / Major triage via `change-classifier`, and launches the appropriate agent sequence. Patch and Minor complete standalone; Major generates `MAINTENANCE_RESULT.md` and hands off to delivery-flow.
- **Inputs**: User-supplied trigger description (log error, CVE notice, feature request, etc.), SPEC.md, ARCHITECTURE.md
- **Outputs**: GitHub issue, PR, test results; Major also produces `MAINTENANCE_RESULT.md`
- **AGENT_RESULT fields**: N/A for Patch/Minor (orchestrator reports via PR + issue). For Major: `PLAN`, `MAINTENANCE_RESULT`, `HANDOFF_TO`
- **NEXT conditions**:
  - Patch / Minor completion → `done`
  - Major completion → `delivery-flow` (user runs `/delivery-flow` manually after reviewing `MAINTENANCE_RESULT.md`)
```

### 7.4 追加テキスト (en 版 / Maintenance Domain 節)

```markdown
---

## Maintenance Domain

The Maintenance domain (3 agents + orchestrator) handles bug fixes, CVE responses, performance improvements, tech-debt cleanup, and small feature extensions on existing projects. The orchestrator is documented under [Flow Orchestrators](#flow-orchestrators); the two supporting agents are described here.

### change-classifier

- **Canonical**: [.claude/agents/change-classifier.md](../../.claude/agents/change-classifier.md)
- **Domain**: Maintenance
- **Responsibility**: Classifies an incoming maintenance trigger into Patch / Minor / Major plan with P1–P4 priority scoring. Identifies trigger type (bug / feature / tech_debt / performance / security), estimates file impact, detects breaking changes, and assesses SPEC.md impact. Checks for SPEC.md / ARCHITECTURE.md presence and proposes codebase-analyzer if missing.
- **Inputs**: User's trigger description, SPEC.md, ARCHITECTURE.md, package metadata (package.json / pyproject.toml)
- **Outputs**: Structured classification output (text)
- **AGENT_RESULT fields**: `TRIGGER_TYPE`, `PLAN`, `PRIORITY`, `ESTIMATED_FILES`, `BREAKING_CHANGE`, `SPEC_IMPACT`, `DOCS_PRESENT`, `REQUIRES_CODEBASE_ANALYZER`, `RATIONALE`
- **NEXT conditions**:
  - `REQUIRES_CODEBASE_ANALYZER: true` → `codebase-analyzer` (re-runs change-classifier after)
  - `PLAN: Patch` → `analyst` (skips impact-analyzer)
  - `PLAN: Minor` / `Major` → `impact-analyzer`

### impact-analyzer

- **Canonical**: [.claude/agents/impact-analyzer.md](../../.claude/agents/impact-analyzer.md)
- **Domain**: Maintenance
- **Responsibility**: Identifies the concrete set of files to change and traces the dependency graph. Detects breaking API / DB schema changes, assesses regression risk (low / medium / high), and recommends test scope (unit / integration / e2e).
- **Inputs**: `change-classifier` AGENT_RESULT, user's trigger description, SPEC.md, ARCHITECTURE.md
- **Outputs**: Impact report (text) with target files, dependency files, breaking changes, regression assessment
- **AGENT_RESULT fields**: `TARGET_FILES`, `DEPENDENCY_FILES`, `BREAKING_API_CHANGES`, `DB_SCHEMA_CHANGES`, `REGRESSION_RISK`, `RECOMMENDED_TEST_SCOPE`, `IMPACT_SUMMARY`
- **NEXT conditions**: `analyst` (always, regardless of Minor/Major plan; the plan only affects what happens *after* analyst)

```

### 7.5 追加テキスト (ja 版 / Flow Orchestrators 節)

```markdown
### maintenance-flow

- **正規**: [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md)
- **ドメイン**: オーケストレーター (Maintenance — 第 4 のフロー)
- **責務**: 既存プロジェクトの保守ライフサイクルを管理します。トリガー (バグ / CVE / パフォーマンス / 技術的負債 / 機能追加) を受け取り、`change-classifier` で Patch / Minor / Major のトリアージを行い、対応するエージェントを順次起動します。Patch と Minor は単独完結、Major は `MAINTENANCE_RESULT.md` を生成して delivery-flow に引き渡します。
- **入力**: ユーザーが指定するトリガー情報 (ログエラー / CVE 通知 / 機能要望 等)、SPEC.md、ARCHITECTURE.md
- **出力**: GitHub issue、PR、テスト結果。Major のみ `MAINTENANCE_RESULT.md` を生成
- **AGENT_RESULT フィールド**: Patch/Minor は N/A (PR + issue で報告)。Major のみ: `PLAN`、`MAINTENANCE_RESULT`、`HANDOFF_TO`
- **NEXT 条件**:
  - Patch / Minor 完了 → `done`
  - Major 完了 → `delivery-flow` (ユーザーが `MAINTENANCE_RESULT.md` を確認後に `/delivery-flow` を手動実行)
```

### 7.6 追加テキスト (ja 版 / Maintenance Domain 節)

```markdown
---

## Maintenance ドメイン

Maintenance ドメイン (3 エージェント + オーケストレーター) はバグ修正・CVE 対応・パフォーマンス改善・技術的負債解消・既存機能の小規模拡張を担当します。オーケストレーターは [フローオーケストレーター](#フローオーケストレーター) セクションに記載しています。本セクションではそれを支える 2 つのエージェントを説明します。

### change-classifier

- **正規**: [.claude/agents/change-classifier.md](../../.claude/agents/change-classifier.md)
- **ドメイン**: Maintenance
- **責務**: 入ってきた保守トリガーを Patch / Minor / Major プランに分類し、P1–P4 の緊急度スコアリングを行います。トリガー種別 (bug / feature / tech_debt / performance / security) を識別し、影響ファイル数を推定し、破壊的変更を検出し、SPEC.md への影響度を評価します。SPEC.md / ARCHITECTURE.md の有無を確認し、不在時は codebase-analyzer の起動を提案します。
- **入力**: ユーザーのトリガー説明、SPEC.md、ARCHITECTURE.md、パッケージメタ情報 (package.json / pyproject.toml)
- **出力**: 構造化された分類結果 (テキスト)
- **AGENT_RESULT フィールド**: `TRIGGER_TYPE`、`PLAN`、`PRIORITY`、`ESTIMATED_FILES`、`BREAKING_CHANGE`、`SPEC_IMPACT`、`DOCS_PRESENT`、`REQUIRES_CODEBASE_ANALYZER`、`RATIONALE`
- **NEXT 条件**:
  - `REQUIRES_CODEBASE_ANALYZER: true` → `codebase-analyzer` (完了後に change-classifier を再実行)
  - `PLAN: Patch` → `analyst` (impact-analyzer はスキップ)
  - `PLAN: Minor` / `Major` → `impact-analyzer`

### impact-analyzer

- **正規**: [.claude/agents/impact-analyzer.md](../../.claude/agents/impact-analyzer.md)
- **ドメイン**: Maintenance
- **責務**: 変更対象ファイルを具体的に特定し、依存グラフをたどります。破壊的 API / DB スキーマ変更を検出し、リグレッションリスク (low / medium / high) を評価し、推奨テスト範囲 (unit / integration / e2e) を提示します。
- **入力**: `change-classifier` の AGENT_RESULT、ユーザーのトリガー説明、SPEC.md、ARCHITECTURE.md
- **出力**: 影響レポート (テキスト)。対象ファイル・依存ファイル・破壊的変更・リグレッション評価を含む
- **AGENT_RESULT フィールド**: `TARGET_FILES`、`DEPENDENCY_FILES`、`BREAKING_API_CHANGES`、`DB_SCHEMA_CHANGES`、`REGRESSION_RISK`、`RECOMMENDED_TEST_SCOPE`、`IMPACT_SUMMARY`
- **NEXT 条件**: `analyst` (常に。Minor / Major いずれでも analyst が次。プランの差は analyst 以降のフェーズ構成に現れる)

```

### 7.7 Table of Contents 更新

en Agents-Reference.md L11–L20 付近:

```diff
 - [Flow Orchestrators](#flow-orchestrators)
 - [Discovery Domain (6 agents)](#discovery-domain)
 - [Delivery Domain (12 agents)](#delivery-domain)
 - [Operations Domain (4 agents)](#operations-domain)
+- [Maintenance Domain (2 agents)](#maintenance-domain)
 - [Safety Agents (1 agent)](#safety-agents)
 - [Standalone Agents (2 agents)](#standalone-agents)
```

ja も同等の diff。

### 7.8 冒頭の総計数字更新

en L7:
```diff
-This page provides a compact reference for all 27 Aphelion agents plus the 4 flow orchestrators.
+This page provides a compact reference for all 29 Aphelion agents plus the 4 flow orchestrators (including the Maintenance Flow fourth orchestrator).
```

> **注意**: 数え方について方針 A / B がある。
> - 方針 A (推奨): change-classifier + impact-analyzer = 2 追加 → 合計 29 (既存 27 + 2)。maintenance-flow はオーケストレーター扱い (4 → 4 flow orchestrators のまま増やさない)
> - 方針 B: maintenance-flow も数えて 30 エージェント+4 オーケストレーター。ただし Architecture.md Agent Flow 図の注記に `+` で書いているので、オーケストレーターは別枠と解釈する方が整合
>
> **推奨は方針 A**。Flow Orchestrators は 3 → 4 に増えるが、これは `## Flow Orchestrators` 節に maintenance-flow が追加されることで表現される。

ja L8 も同様:
```diff
-このページはAphelionの27エージェントと4つのフローオーケストレーター全体のコンパクトなリファレンスを提供します。
+このページは Aphelion の 29 エージェントと 4 つのフローオーケストレーター (Maintenance Flow を含む) 全体のコンパクトなリファレンスを提供します。
```

### 7.9 Canonical Sources 更新 (末尾)

en L392:
```diff
-- [.claude/agents/](../../.claude/agents/) — All 27 agent definition files (authoritative source)
+- [.claude/agents/](../../.claude/agents/) — All agent definition files (authoritative source)
```

ja L393 も同様に数字を外す (将来増減する度に更新するコストを避ける)。

---

## 8. Home.md の更新方針

### 8.1 en/Home.md の変更点

L22 (README と Wiki の比較表) の該当行を修正:
```diff
-| Agent list (names only) | [Agents Reference](./Agents-Reference.md): all 27 agents with inputs, outputs, and NEXT conditions |
+| Agent list (names only) | [Agents Reference](./Agents-Reference.md): all 29 agents across 4 flows with inputs, outputs, and NEXT conditions |
```

L38 (目次表):
```diff
-| [Agents Reference](./Agents-Reference.md) | All 27 agents: responsibility, inputs, outputs, NEXT conditions | Agent developers |
+| [Agents Reference](./Agents-Reference.md) | All 29 agents across Discovery / Delivery / Operations / Maintenance: responsibility, inputs, outputs, NEXT conditions | Agent developers |
```

ペルソナ別入口「I want to use Aphelion for the first time」の後に新規エントリ追加 (L70 付近、"I want to use Aphelion on GitHub Copilot ..." の直前):

```markdown
### "I need to fix a bug or add a small feature to an existing project"

1. Ensure your project has `SPEC.md` and `ARCHITECTURE.md` (if missing, run `/codebase-analyzer` first)
2. Run `/maintenance-flow {trigger description}` — the orchestrator will triage into Patch / Minor / Major
3. Read [Triage System → Maintenance Flow Triage](./Triage-System.md#maintenance-flow-triage) for details on what each plan includes
```

### 8.2 ja/Home.md の変更点

L23:
```diff
-| エージェント一覧（名前のみ） | [エージェントリファレンス](./Agents-Reference.md)：27エージェント全件の入出力とNEXT条件 |
+| エージェント一覧（名前のみ） | [エージェントリファレンス](./Agents-Reference.md)：29 エージェント × 4 フローの入出力と NEXT 条件 |
```

L39:
```diff
-| [エージェントリファレンス](./Agents-Reference.md) | 27エージェント全件：責務・入力・出力・NEXT条件 | エージェント開発者 |
+| [エージェントリファレンス](./Agents-Reference.md) | 29 エージェント全件 (Discovery/Delivery/Operations/Maintenance)：責務・入力・出力・NEXT 条件 | エージェント開発者 |
```

ペルソナ別入口の追加 (「GitHub Copilot または OpenAI Codex で Aphelion を使いたい」の直前):

```markdown
### 「既存プロジェクトのバグ修正や小さな機能追加をしたい」

1. プロジェクトに `SPEC.md` と `ARCHITECTURE.md` があることを確認 (ない場合はまず `/codebase-analyzer` を実行)
2. `/maintenance-flow {トリガー説明}` を実行 — オーケストレーターが Patch / Minor / Major にトリアージします
3. 各プランの詳細は [トリアージシステム → Maintenance フローのトリアージ](./Triage-System.md#maintenance-フローのトリアージ) を参照
```

### 8.3 用語集への追加 (任意)

Home.md の `## Glossary / 用語集` への追加候補:

en:
```markdown
| **Maintenance Flow** | Fourth flow independent from the 3-domain pipeline; invoked via `/maintenance-flow` for existing-project maintenance (bugs, CVEs, refactors, small features). Triage: Patch / Minor / Major |
| **MAINTENANCE_RESULT.md** | Handoff file generated only on Major plan; passed to Delivery Flow as a pre-processing stage |
```

ja:
```markdown
| **Maintenance フロー** | 3 ドメインパイプラインから独立した第 4 のフロー。`/maintenance-flow` で起動し、既存プロジェクトの保守 (バグ・CVE・リファクタ・小機能追加) を扱う。トリアージは Patch / Minor / Major |
| **MAINTENANCE_RESULT.md** | Major プランでのみ生成されるハンドオフファイル。Delivery Flow の前処理として引き渡される |
```

---

## 9. Getting-Started.md の更新方針 (P2)

### 9.1 コマンドリファレンス表への追記

en L261–L268 / ja L227–L234 あたりのコマンド表に 1 行追加:

en:
```diff
 | `/analyst {issue}` | Analyze bug / feature for existing project | Existing project with SPEC.md |
+| `/maintenance-flow {trigger}` | Maintenance triage and execution (Patch/Minor/Major) for existing project | Existing project with SPEC.md + ARCHITECTURE.md |
 | `/codebase-analyzer {instruction}` | Reverse-engineer specs from existing code | Project without SPEC.md |
```

ja:
```diff
 | `/analyst {issue}` | 既存プロジェクトのバグ・機能を分析 | SPEC.mdがあるプロジェクト |
+| `/maintenance-flow {トリガー}` | 既存プロジェクトの保守トリアージと実行 (Patch/Minor/Major) | SPEC.md + ARCHITECTURE.md があるプロジェクト |
 | `/codebase-analyzer {指示}` | 既存コードから仕様を逆生成 | SPEC.mdがないプロジェクト |
```

### 9.2 シナリオ追加

`### Scenario 3: Existing project change (with docs)` の後に新規シナリオを追加 (en L188 付近 / ja L184 付近):

en:
```markdown
### Scenario 3b: Maintenance flow with triage (bug / CVE / small feature)

When the change is small and you want automatic triage:

```
/maintenance-flow Login endpoint returns 500 when email contains special characters
```

`change-classifier` analyzes the trigger and proposes Patch / Minor / Major. Patch and Minor complete in a single flow; Major hands off to `/delivery-flow` automatically via `MAINTENANCE_RESULT.md`.

Prefer `/maintenance-flow` over `/analyst` when:
- The change has urgency (P1/P2 incident)
- You want automatic impact analysis (files, dependencies, regression risk)
- You need guided plan selection rather than a single-issue workflow
```

ja:
```markdown
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
```

---

## 10. index.mdx (splash) の更新方針 (P2)

### 10.1 en/index.mdx

L26 の見出しと L29–L49 の CardGrid を更新:

```diff
-## Meet the 27 Agents
+## Meet the 29 Agents across 4 Flows

 <CardGrid>
 	<Card title="Flow Orchestrators" icon="rocket">
-		4 top-level orchestrators: discovery-flow, delivery-flow, operations-flow, and the root triage.
+		4 top-level orchestrators: discovery-flow, delivery-flow, operations-flow, maintenance-flow.
 		[→ Flow Orchestrators](/en/agents-reference/#flow-orchestrators)
 	</Card>
 	<Card title="Discovery Domain" icon="magnifier">
 		6 agents that elicit, research, and prototype requirements.
 		[→ Discovery Domain](/en/agents-reference/#discovery-domain)
 	</Card>
 	<Card title="Delivery Domain" icon="puzzle">
 		12 agents that design, implement, test, review, and release.
 		[→ Delivery Domain](/en/agents-reference/#delivery-domain)
 	</Card>
 	<Card title="Operations Domain" icon="laptop">
 		4 agents that build infra, manage DB, set up observability, and plan ops.
 		[→ Operations Domain](/en/agents-reference/#operations-domain)
 	</Card>
+	<Card title="Maintenance Domain" icon="seti:config">
+		2 agents (change-classifier, impact-analyzer) that triage and scope changes to existing projects.
+		[→ Maintenance Domain](/en/agents-reference/#maintenance-domain)
+	</Card>
 	<Card title="Safety & Standalone" icon="approve-check">
 		sandbox-runner for isolated execution, plus analyst and codebase-analyzer for standalone use.
 		[→ Safety Agents](/en/agents-reference/#safety-agents)
 	</Card>
 </CardGrid>
```

> icon 指定は `seti:config` が適切か developer 判断で変更可 (Starlight が提供する icon 一覧から選ぶ)。代替案: `wrench`, `tools`, `setting`。

### 10.2 ja/index.mdx

同等の diff:

```diff
-## 27エージェント
+## 29 エージェント × 4 フロー

 <CardGrid>
 	<Card title="フローオーケストレーター" icon="rocket">
-		4 つの上位オーケストレーター: discovery-flow, delivery-flow, operations-flow, ルートトリアージ。
+		4 つの上位オーケストレーター: discovery-flow, delivery-flow, operations-flow, maintenance-flow。
 		[→ Flow Orchestrators](/ja/agents-reference/#flow-orchestrators)
 	</Card>
 	<Card title="Discovery ドメイン" icon="magnifier">
 		要件を引き出し、調査し、プロトタイプする 6 エージェント。
 		[→ Discovery Domain](/ja/agents-reference/#discovery-domain)
 	</Card>
 	<Card title="Delivery ドメイン" icon="puzzle">
 		設計・実装・テスト・レビュー・リリースを担う 12 エージェント。
 		[→ Delivery Domain](/ja/agents-reference/#delivery-domain)
 	</Card>
 	<Card title="Operations ドメイン" icon="laptop">
 		インフラ構築・DB 管理・可観測性・運用計画を担う 4 エージェント。
 		[→ Operations Domain](/ja/agents-reference/#operations-domain)
 	</Card>
+	<Card title="Maintenance ドメイン" icon="seti:config">
+		既存プロジェクトの変更をトリアージ・範囲確定する 2 エージェント (change-classifier, impact-analyzer)。
+		[→ Maintenance Domain](/ja/agents-reference/#maintenanceドメイン)
+	</Card>
 	<Card title="Safety / Standalone" icon="approve-check">
 		隔離実行の sandbox-runner と、単独起動可能な analyst / codebase-analyzer。
 		[→ Safety Agents](/ja/agents-reference/#safety-agents)
 	</Card>
 </CardGrid>
```

> **ja アンカーに関する注意**: Starlight の日本語見出しから生成されるアンカーは非 ASCII を kebab 化するため、`#maintenanceドメイン` が正しく動作するか developer が実機確認すべき。不安なら見出しを英語 `## Maintenance Domain` に統一してアンカー `#maintenance-domain` を使う方針でも可 (ja 版 Agents-Reference の「### Maintenance ドメイン」→「### Maintenance Domain」への変更も検討対象)。

---

## 11. Contributing.md の更新方針 (P2)

### 11.1 Contribution Types 表への 1 行追加

en L27–L34 / ja 同等箇所:

en:
```diff
 | Type | Changes required |
 |------|----------------|
 | New agent | `.claude/agents/{name}.md` + Agents-Reference (en+ja) + generate.mjs (if new agent) |
 | Modify agent | `.claude/agents/{name}.md` + Agents-Reference entry (en+ja) |
 | New rule | `.claude/rules/{name}.md` + Rules-Reference (en+ja) |
 | Modify rule | `.claude/rules/{name}.md` + Rules-Reference entry (en+ja) |
 | Orchestrator rules change | `.claude/orchestrator-rules.md` + Architecture.md / Triage-System.md (en+ja) |
+| New flow (orchestrator) | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture.md (figures + text) + Triage-System.md (new section) + Agents-Reference.md (new orchestrator + domain section) + Home.md (personas + glossary) + index.mdx (card) + `ORCHESTRATOR_NAMES` in generate.mjs |
 | Wiki page update | `wiki/en/{page}.md` + `wiki/ja/{page}.md` (same PR) |
 | Platform generator change | `scripts/generate.mjs` + regenerate `platforms/` |
```

ja (同等箇所):
```diff
+| 新フロー (オーケストレーター) | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture.md (図と本文) + Triage-System.md (新セクション) + Agents-Reference.md (新オーケストレーター + ドメインセクション) + Home.md (ペルソナ + 用語集) + index.mdx (カード) + generate.mjs の `ORCHESTRATOR_NAMES` |
```

### 11.2 Pull Request Checklist への追加 (任意)

en L170 付近:
```diff
 - [ ] If rules changed and orchestrator behavior is affected, update `wiki/en/Architecture.md` and `wiki/ja/Architecture.md`
+- [ ] If a new flow / orchestrator is added, update all 4 integration points: Architecture.md figures, Triage-System.md sections, Agents-Reference.md domain section, Home.md persona entries
```

ja 対応も同様。

---

## 12. Platform-Guide.md の更新方針 (P3・任意)

### 12.1 Claude Code スラッシュコマンド表への追記

en L64–L73 付近 / ja 同等位置:

en:
```diff
 | `/analyst {issue}` | `analyst` standalone agent |
+| `/maintenance-flow {trigger}` | `maintenance-flow` orchestrator |
 | `/codebase-analyzer {instruction}` | `codebase-analyzer` standalone agent |
```

ja:
```diff
 | `/analyst {issue}` | `analyst` スタンドアロンエージェント |
+| `/maintenance-flow {トリガー}` | `maintenance-flow` オーケストレーター |
 | `/codebase-analyzer {指示}` | `codebase-analyzer` スタンドアロンエージェント |
```

### 12.2 File Structure の図への注記 (任意)

`.claude/agents/` 内のエージェント列挙を更新するかどうかは好み。現状 "..." で省略されているので無修正でも可。

---

## 13. developer への引き継ぎ指示 (要約)

developer が本ドキュメントを基に実装する際の推奨作業順:

1. **P1 (Commit 1)**: Architecture.md (en/ja) → Triage-System.md (en/ja) → Agents-Reference.md (en/ja) → Home.md (en/ja)
2. **sync-wiki.mjs 実行** — site/src/content/docs/{en,ja}/*.md を再生成
   ```bash
   node scripts/sync-wiki.mjs
   ```
3. **P2 (Commit 2)**: Getting-Started.md (en/ja) + index.mdx (en/ja) + Contributing.md (en/ja)
4. **sync-wiki.mjs 再実行**
5. **P3 (Commit 3・任意)**: Platform-Guide.md (en/ja)
6. **Astro ビルド検証**:
   ```bash
   cd site && npm run build
   ```
   リンク切れ・ビルドエラーがないことを確認
7. **PR #29 に追加コミットとして push**

### 13.1 注意点

- **数字の整合性**: 「29 エージェント」で統一 (maintenance-flow はオーケストレーター扱い)。本ドキュメント §7.8 の方針 A を採用
- **アンカーリンク**: Starlight は見出しを kebab-case 化して自動生成する。日本語見出しのアンカーは実機確認が必要 (`#maintenance-ドメイン` vs `#maintenance-domain` 等)
- **Mermaid 図更新時は en/ja を同期** — 両言語に同じノード・同じ矢印を配置
- **frontmatter の `Last updated` を更新** — 変更した全 wiki ページの冒頭を現在日付 `2026-04-24` に
- **ja 版の `EN canonical`** — ja 版の冒頭にある `EN canonical: ...` 行も同日付に更新

### 13.2 検証チェックリスト

- [ ] `node scripts/sync-wiki.mjs` がエラーなく完了する
- [ ] `cd site && npm run build` がエラーなく完了する
- [ ] Architecture.md の Mermaid 図が 3 つとも正しく描画される (en/ja)
- [ ] Triage-System.md の Maintenance Flow Triage セクションへのアンカーリンクが Home.md から動作する (en/ja)
- [ ] Agents-Reference.md の TOC に Maintenance Domain リンクが追加されている (en/ja)
- [ ] `frontmatter.title` / `description` が sync-wiki.mjs で自動生成される (変更後の wiki ファイルで確認)
- [ ] index.mdx の Card 数字が 29 で統一 (en/ja)
- [ ] Home.md の「ペルソナ別入口」に maintenance-flow エントリが追加されている (en/ja)
- [ ] Getting-Started.md コマンドリファレンス表に `/maintenance-flow` 行が追加されている (en/ja)

---

## 14. 設計判断記録 (ADR)

### ADR-001: 独立ページを新設せず既存 8 ページに統合

- **状況**: maintenance-flow の情報を `Maintenance-Flow.md` として独立ページにするか、既存ページに分散記述するか
- **決定**: 既存ページへの分散記述
- **理由**:
  - DESIGN.md §1.1 の 8 ページ構成は ADR-001/002 で確立された設計原則であり、本 issue スコープで変更するのは過剰
  - maintenance-flow の情報量 (図 2 つ追加 + テキスト ~150 行) は既存 3 ページに吸収可能
  - ja/en 翻訳ペアの増加を避けて保守コストを最小化
- **却下した代替案**: `docs/wiki/{en,ja}/Maintenance-Flow.md` 新設 → DESIGN.md 改定が必要、PAGES 配列更新、翻訳同期コスト増

### ADR-002: Triage-System.md に独立セクションを追加

- **状況**: Maintenance Flow Triage を既存 Triage 表に統合するか、独立セクションとするか
- **決定**: 独立セクション (`## Maintenance Flow Triage`)
- **理由**:
  - 判定基準が 4 段階 (Minimal/Light/Standard/Full) ではなく 3 段階 (Patch/Minor/Major) で名称も構造も異なる
  - Discovery/Delivery/Operations の 3 独立セクションと並列で自然
  - maintenance-flow.md の設計意図 (第 4 フロー独立性) と整合
- **却下した代替案**: 既存 Delivery Triage 表に列追加 → 形状が合わない

### ADR-003: Architecture.md の Agent Flow 図は更新しない

- **状況**: 図 2 (Agent Flow) に Maintenance ドメインを追加すべきか
- **決定**: 更新しない。代わりに注記追加で吸収
- **理由**:
  - この図は「3 ドメインパイプライン」の視覚的表現が目的
  - 4 つ目のドメインを追加すると「3 ドメイン設計」の核心メッセージが薄れる
  - maintenance-flow は standalone 同様「側面エントリ」として注記で十分
- **却下した代替案**: 図 2 に Maintenance サブグラフ追加 → 読みづらく、標準フロー (D→DV→O) が強調されなくなる

### ADR-004: エージェント総計は 29 と表記 (orchestrator は別枠)

- **状況**: maintenance-flow を「エージェント」として数えるか
- **決定**: 既存慣行どおり orchestrator は別枠。エージェント総計は 27 → 29
- **理由**:
  - 既存 Agents-Reference.md が「27 agents + 4 orchestrators」形式で表現していた
  - maintenance-flow はオーケストレーター扱い (`## Flow Orchestrators` セクションに配置)
  - change-classifier + impact-analyzer = 2 のみがエージェント増分
- **却下した代替案**: 30 エージェントとして表記 → 既存ページとの整合性が崩れる

### ADR-005: index.mdx に Maintenance Card を追加

- **状況**: splash ページのカード数を 5 → 6 に増やすか
- **決定**: 増やす
- **理由**:
  - 新規ユーザーへの発見性を担保する最重要地点
  - splash ページは wiki 詳細への誘導が目的であり、カード追加は自然
  - Safety & Standalone カードと並列の 1 枚が適切
- **却下した代替案**: 既存 Discovery/Delivery/Operations/Safety カード内に併記 → 視認性低下

---

## 15. スコープ外 (将来 issue 候補)

- **Rules-Reference.md の更新**: maintenance-flow は新規ルールを追加しないため対象外。ただし将来 `.claude/rules/maintenance-policy.md` のようなルールが追加された場合は別 issue で対応
- **wiki/en/agents/*.md への分割**: DESIGN.md §1.2 の 40 エージェント / 300 行超トリガーには未到達
- **delivery-flow.md の MAINTENANCE_RESULT.md 受け入れ改修**: maintenance-flow.md §13 で将来 issue 候補として明記済み
- **Astro の ja アンカー検証の CI 自動化**: リンク切れチェック機構は別 issue

---

## 16. 承認事項

次フェーズ (developer 実装) に進む前に、以下についてユーザー承認を得たい。

1. **§2.1 方針 A**: 新規 Maintenance-Flow.md を作らず既存 8 ページに統合する
2. **§5.1 方針 A**: Triage-System.md に独立セクションを追加する
3. **§6.1 方針 A**: Architecture.md の図 1 / 3 / 5 を更新、図 2 は更新しない
4. **§7.1 方針 A**: Agents-Reference.md に新セクション `## Maintenance Domain` を追加、maintenance-flow は Flow Orchestrators 節に配置
5. **§7.8 方針 A**: エージェント総数を 29 と表記 (orchestrator は 4 個で別枠)
6. **§10.2 アンカー方針**: ja 見出しを「Maintenance Domain」で英語化するか「Maintenance ドメイン」で日本語化して実機検証するか → developer が実装時に decide してよい
7. **§4 コミット分割**: P1 / P2 / P3 の 3 コミットに分ける (developer 判断で結合可)
