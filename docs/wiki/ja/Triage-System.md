# Triage System

> **Language**: [English](../en/Triage-System.md) | [日本語](../ja/Triage-System.md)
> **Last updated**: 2026-04-30
> **Update history**:
>   - 2026-04-30: Doc フロートリアージセクション追加 (#54)
>   - 2026-04-30: doc-reviewer 参照を反映 (#91 follow-up)
> **EN canonical**: 2026-04-30 of wiki/en/Triage-System.md
> **Audience**: 新規ユーザー / エージェント開発者

トリアージシステムはフロー開始時にプロジェクトの特性を自動的に評価し、必要な最小限のエージェントセットを選択します。このページでは4段階の選択ロジック、条件、ドメイン別エージェントマトリクスを説明します。

## 目次

- [概要](#概要)
- [トリアージの仕組み](#トリアージの仕組み)
- [Discovery フローのトリアージ](#discovery-フローのトリアージ)
- [Delivery フローのトリアージ](#delivery-フローのトリアージ)
- [Operations フローのトリアージ](#operations-フローのトリアージ)
- [Maintenance フローのトリアージ](#maintenance-フローのトリアージ)
- [Doc フローのトリアージ](#doc-フローのトリアージ)
- [必須エージェント（常時実行）](#必須エージェント常時実行)
- [条件付きエージェント（HAS_UI）](#条件付きエージェントhas_ui)
- [トリアージ評価質問](#トリアージ評価質問)
- [トリアージのオーバーライド](#トリアージのオーバーライド)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## 概要

Aphelion のトリアージシステムは、プロジェクトの特性に基づいて適切なレベルの厳密さが適用されることを保証します：

- **個人用CLIツール**はMinimal — 出荷に必要な最小限
- **公開OSSライブラリ**はFull — 完全な品質パイプライン
- それ以外はその中間のどこかに落ち着く

トリアージは各フローの開始時に行われます。Flow Orchestrator（フローオーケストレーター）はユーザーにインタビュー（または `DISCOVERY_RESULT.md` を読み込み）し、4段階のプランティアから選択します：**Minimal**、**Light**、**Standard**、または **Full**。

---

## トリアージの仕組み

1. Flow Orchestrator がプロジェクト特性について `AskUserQuestion` を使用してユーザーにインタビュー（または `DISCOVERY_RESULT.md` を読み込み）
2. Flow Orchestrator が選択されたプランとエージェント一覧をテキスト出力で表示
3. Flow Orchestrator が `AskUserQuestion` で承認を求める
4. 承認後、エージェントを順次起動

**評価軸：**
- プロジェクト規模（個人スクリプト → チームプロジェクト → 大規模）
- 外部依存と統合
- ドメインの複雑さ（規制、コンプライアンス）
- 公開/非公開
- `PRODUCT_TYPE`（service / tool / library / cli）
- `HAS_UI`（ユーザーインターフェースが含まれるか）

---

## Discovery フローのトリアージ

| プラン | トリガー条件 | 起動エージェント |
|--------|------------|----------------|
| **Minimal** | 個人ツール / 小規模スクリプト | `interviewer` |
| **Light** | 個人サイドプロジェクト / 複数機能 | `interviewer` → `rules-designer` → `scope-planner` |
| **Standard** | 外部依存 / 既存システム統合 | `interviewer` → `researcher` → `poc-engineer` → `rules-designer` → `scope-planner` |
| **Full** | 規制あり / 大規模 / 複雑 | `interviewer` → `researcher` → `poc-engineer` → `concept-validator`* → `rules-designer` → `scope-planner` |

*`concept-validator` は `HAS_UI: true` の場合のみ実行

### プラン別 Discovery フェーズシーケンス

**Minimal:**
```
Phase 1: 要件ヒアリング  → interviewer  → 承認
→ discovery-flow が直接 DISCOVERY_RESULT.md を生成
```

> **Minimal の注意事項**: Minimal プランは `interviewer` の後に終了します。`doc-reviewer`
> は `scope-planner` の後にトリガーされるため、Minimal では起動されません。これは明示的な
> "スキップ" ルールではなく、構造的な不在によるものです。

**Light:**
```
Phase 1: 要件ヒアリング  → interviewer    → 承認
Phase 2: ルール策定      → rules-designer → 承認
Phase 3: スコープ策定    → scope-planner  → doc-reviewer (auto) → 承認 → 完了
```

**Standard:**
```
Phase 1: 要件ヒアリング  → interviewer    → 承認
Phase 2: ドメイン調査    → researcher     → 承認
Phase 3: 技術PoC        → poc-engineer   → 承認
Phase 4: ルール策定      → rules-designer → 承認
Phase 5: スコープ策定    → scope-planner  → doc-reviewer (auto) → 承認 → 完了
```

**Full:**
```
Phase 1: 要件ヒアリング  → interviewer       → 承認
Phase 2: ドメイン調査    → researcher        → 承認
Phase 3: 技術PoC        → poc-engineer      → 承認
Phase 4: コンセプト検証  → concept-validator → 承認  [HAS_UI: true のみ]
Phase 5: ルール策定      → rules-designer    → 承認
Phase 6: スコープ策定    → scope-planner     → doc-reviewer (auto) → 承認 → 完了
```

---

## Delivery フローのトリアージ

| プラン | トリガー条件 | 起動エージェント |
|--------|------------|----------------|
| **Minimal** | 単機能ツール | `spec-designer` → `architect` → `developer` → `tester`* → `security-auditor` |
| **Light** | 個人サイドプロジェクト | + `ux-designer`† + `test-designer` + `e2e-test-designer`† + `reviewer` |
| **Standard** | 複数ファイルプロジェクト | + `scaffolder` + `doc-writer` |
| **Full** | 公開プロジェクト / OSS | + `releaser` |

*Minimalプランでは `tester` がテスト設計を統合（TEST_PLAN.md が事前生成されない場合あり）
†`HAS_UI: true` の場合のみ

### Delivery フェーズシーケンス（Standardの例）

```
Phase 1:  仕様策定         → spec-designer      → doc-reviewer (auto) → 承認
Phase 2:  UIデザイン       → ux-designer         → doc-reviewer (auto) → 承認  [HAS_UI: true のみ]
Phase 3:  アーキテクチャ設計 → architect         → doc-reviewer (auto) → 承認
Phase 4:  プロジェクト初期化 → scaffolder        → 承認
Phase 5:  実装             → developer          → 承認
Phase 6:  テスト設計       → test-designer      → 承認
Phase 7:  E2Eテスト設計   → e2e-test-designer  → 承認  [HAS_UI: true のみ]
Phase 8:  テスト実行       → tester             → 承認
Phase 9:  コードレビュー   → reviewer           → 承認
Phase 10: セキュリティ監査  → security-auditor   → 承認
Phase 11: ドキュメント作成  → doc-writer         → 承認 → 完了
```

### サイドエントリー：analyst

`analyst` はトリアージで選択されるエージェントではありません。**既存プロジェクト**へのバグ報告・機能追加・リファクタリング要求によってトリガーされるサイドエントリーです。`analyst` 完了後、`delivery-flow` はPhase 3（architect）から合流します。

---

## Operations フローのトリアージ

Operations フローは `PRODUCT_TYPE: service` の場合のみ実行されます。Minimalプランはありません — 最低でもインフラ定義と運用計画が必要です。

| プラン | トリガー条件 | 起動エージェント |
|--------|------------|----------------|
| **Light** | PaaS / 単一コンテナ / DBなし | `infra-builder` → `ops-planner` |
| **Standard** | API + DBアーキテクチャ | `infra-builder` → `db-ops` → `ops-planner` |
| **Full** | 高可用性 / 外部ユーザー向け | `infra-builder` → `db-ops` → `observability` → `ops-planner` |

### Operations 評価基準

1. **DBの有無**: ARCHITECTURE.md のデータモデルと技術スタックにデータベースが含まれるか
2. **ユーザー向けサービス**: 外部ユーザーがアクセスするAPI / Webサービスか
3. **可用性要件**: SPEC.md の非機能要件にアップタイム要件やSLAが指定されているか

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
Phase 2: issue 化・方針  → analyst           → doc-reviewer (conditional auto) → 承認
Phase 3: 実装            → developer         → 承認
Phase 4: テスト実行      → tester            → 承認 → 完了
```

**Minor:**
```
Phase 1: 分類            → change-classifier  → 承認
Phase 2: 影響範囲調査    → impact-analyzer    → 承認
Phase 3: issue 化・方針  → analyst            → doc-reviewer (conditional auto) → 承認
Phase 4: 差分アーキテクチャ設計 → architect    → 承認
Phase 5: 実装            → developer          → 承認
Phase 6: テスト実行      → tester             → 承認
Phase 7: レビュー        → reviewer           → 承認 → 完了
```

**Major (delivery-flow へ引き渡し):**
```
Phase 1: 分類            → change-classifier  → 承認
Phase 2: 影響範囲調査    → impact-analyzer    → 承認
Phase 3: issue 化・方針  → analyst            → doc-reviewer (conditional auto) → 承認
Phase 4: 事前セキュリティ監査 → security-auditor → 承認
Phase 5: 引き渡し        → MAINTENANCE_RESULT.md → delivery-flow
```

> **doc-reviewer の conditional auto**: `analyst.DOCS_UPDATED` が SPEC.md（または ARCHITECTURE.md）
> の更新を報告した場合のみ、`analyst` の後に doc-reviewer が自動挿入されます。両方が `no_change`
> の場合、doc-reviewer はスキップされます（Patch のみ）。Minor と Major は常に analyst の後に
> doc-reviewer を起動します。

### SPEC.md / ARCHITECTURE.md の前提条件

フロー開始時にいずれかが存在しない場合、`change-classifier` はユーザー確認のうえで `codebase-analyzer` を Phase 0 として挿入することを提案します。`codebase-analyzer` がドキュメントを生成した後、`change-classifier` が分類を再実行します。

### ハンドオフファイル (Major のみ)

プランが Major の場合、`maintenance-flow` は `DISCOVERY_RESULT.md` 互換のフィールド (PRODUCT_TYPE、プロジェクト概要、影響サマリ) を持つ `MAINTENANCE_RESULT.md` を生成します。これが `delivery-flow` への引き渡し成果物になります。

---

## Doc フローのトリアージ

Doc フローは **Discovery / Delivery / Operations / Maintenance から独立した第 5 のフロー**であり、SPEC.md と ARCHITECTURE.md が揃ったプロジェクトライフサイクルの任意のタイミングで `/doc-flow` で手動起動します。他のフローからの自動連鎖はありません。

**重要な特徴**: Doc フローのトリアージは、他のフローのようにプロジェクト規模や複雑さではなく、**doc type の数**（6 種のドキュメントタイプのうち何種類を選択するか）に基づきます。全 PRODUCT_TYPE で利用できます。

| プラン | 条件 | 起動 author エージェント |
|--------|------|----------------------|
| **Minimal** | 1〜2 doc type 選択 | 選択した author エージェントのみ |
| **Light** | 3〜4 doc type 選択 | 選択した author エージェントのみ |
| **Standard** | 5〜6 doc type 選択 | 選択した全 author エージェント |
| **Full** | 全 6 種 + 生成後の検証 | 全 6 種 author + `template_version` 整合チェック |

**利用可能な doc type**: `hld` / `lld` / `api-reference` / `ops-manual` / `user-manual` / `handover`

**依存関係ヒント**（推奨順序、MVP では強制しない）:
- `hld` → `lld`: 両方が ARCHITECTURE.md を読み込み、LLD は HLD の構造を前提とする
- `hld` / `lld` → `api-reference`: API リファレンスはアーキテクチャ章を参照する
- 全 5 種 → `handover`: 引継ぎ資料は他の全 deliverable への相互参照を含む

`--types` で部分的な doc type を指定した場合、`handover-author` は deliverable 内に「今回の実行で参照ドキュメントが生成されていない」旨を注記します。

### Doc フローフェーズシーケンス

```
[トリアージ] → [承認]
Phase 1: HLD           → hld-author           → 承認
Phase 2: LLD           → lld-author           → 承認
Phase 3: API リファレンス → api-reference-author → 承認
Phase 4: 運用マニュアル  → ops-manual-author    → 承認  [インフラ成果物なしなら skip]
Phase 5: ユーザーマニュアル → user-manual-author → 承認  [UI_SPEC.md なしなら skip]
Phase 6: 引継ぎ資料     → handover-author      → 承認  [最後に推奨]
→ DOC_FLOW_RESULT.md 生成 → 完了サマリー
```

選択した doc type のみ起動され、未選択フェーズは完全にスキップされます。

### 自動スキップルール

| Author エージェント | 自動スキップ条件 |
|---|---|
| `user-manual-author` | `UI_SPEC.md` 不在（`PRODUCT_TYPE: tool / library / cli` で典型） |
| `ops-manual-author` | インフラ成果物なし（`Dockerfile`、`docker-compose.yml`、`infra/**` がすべて不在） |

自動スキップされたエージェントは `STATUS: skipped` を返し、最終 `DOC_FLOW_RESULT.md` の `SKIPPED_TYPES` に記録されます。

### Doc フローと必須エージェント

Doc フローは `doc-reviewer`（品質エージェント）をトリガーしません。author エージェントが生成するのは Aphelion 成果物から派生した顧客向け deliverable であり、`doc-reviewer` が監視する設計成果物（SPEC.md 等）そのものではないためです。Doc フローは完了後に `/doc-reviewer` の実行を提案します（`AGENT_RESULT` に `SUGGEST_DOC_REVIEW: true` を出力）。

Doc フローは [必須エージェント](#必須エージェント常時実行) テーブルには含まれません — 常にオプションです。

---

## 必須エージェント（常時実行）

特定のエージェントはトリアージ結果に関わらず**全プランで**実行されます：

| エージェント | ドメイン | 必須の理由 |
|------------|--------|----------|
| `security-auditor` | Delivery | セキュリティ監査は省略不可。OWASP Top 10 + 依存関係スキャンはMinimalでも実行 |
| `doc-reviewer` | Quality (横断的) | マークダウン成果物の整合性は全プラン（Minimal+）で検証する。読み取り専用で破壊的操作なし。spec / design / scope / analyst エージェント直後に auto-insert される |

`security-auditor` の必須化は [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md) で定義されています：

> `security-auditor` は **全Deliveryプランで必ず実行**（Minimalを含む）。

`doc-reviewer` の必須化は
[.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) §Doc Reviewer
Auto-insertion で定義されています。そこに列挙されたトリガーエージェントの後にポスト挿入ステップとして実行されます。

---

## 条件付きエージェント（HAS_UI）

一部のエージェントはユーザーインターフェースが含まれる場合のみ実行されます：

| エージェント | 条件 | ドメイン |
|------------|------|--------|
| `concept-validator` | Fullプランかつ `HAS_UI: true` | Discovery |
| `ux-designer` | 任意プランかつ `HAS_UI: true` | Delivery |
| `e2e-test-designer` | Light/Standard/Fullかつ `HAS_UI: true` | Delivery |

`HAS_UI` は `interviewer`（Discovery）または `spec-designer`（Deliveryダイレクトエントリー）が、プロジェクトにWebUI・モバイルアプリ・デスクトップGUIが含まれるかを判定します。

---

## トリアージ評価質問

discovery-flow の Flow Orchestrator は 2 ラウンドに分けて以下の質問を行います（`AskUserQuestion` 経由）：

**ラウンド1（4問）：**
1. プロジェクト規模：個人スクリプト / 個人サイドプロジェクト / チームプロジェクト / 大規模
2. UIの形態：CLI / APIのみ / Web UI / モバイル
3. 外部API依存：なし / あり
4. 既存システム統合：新規 / 既存統合あり

**ラウンド2（2問）：**
5. ドメインの複雑度：単純 / 中程度 / 複雑（規制あり）
6. PRODUCT_TYPE：service / tool / library / cli

---

## トリアージのオーバーライド

### 承認ゲートでの手動オーバーライド

Flow Orchestrator がトリアージ結果を提示した後、ユーザーは承認ゲートで「プランを変更」を選択してプランを手動でオーバーライドできます。

### 自動承認モードでのオーバーライド

`.aphelion-auto-approve` ファイルにはトリアージの質問をスキップするプランオーバーライドを含めることができます：

```
PLAN: Standard
PRODUCT_TYPE: service
HAS_UI: true
```

---

## 関連ページ

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [エージェントリファレンス：Flow Orchestrator](./Agents-Orchestrators.md)
- [Getting Started](./Getting-Started.md)

## 正規ソース

- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — トリアージプラン、条件、ドメイン別エージェントシーケンス
- [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md) — Discovery トリアージの実装
- [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md) — Delivery トリアージの実装
- [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md) — Operations トリアージの実装
- [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md) — Maintenance トリアージの実装
- [.claude/agents/doc-flow.md](../../.claude/agents/doc-flow.md) — Doc フロートリアージの実装
- [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md) — security-auditor 必須ルール
- [.claude/agents/doc-reviewer.md](../../.claude/agents/doc-reviewer.md) — doc-reviewer エージェント定義とトリガー条件
