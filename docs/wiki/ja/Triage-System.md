# Triage System

> **Language**: [English](../en/Triage-System.md) | [日本語](../ja/Triage-System.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 of wiki/en/Triage-System.md
> **Audience**: 新規ユーザー / エージェント開発者

トリアージシステムはフロー開始時にプロジェクトの特性を自動的に評価し、必要な最小限のエージェントセットを選択します。このページでは4段階の選択ロジック、条件、ドメイン別エージェントマトリクスを説明します。

## 目次

- [概要](#概要)
- [トリアージの仕組み](#トリアージの仕組み)
- [Discovery フローのトリアージ](#discovery-フローのトリアージ)
- [Delivery フローのトリアージ](#delivery-フローのトリアージ)
- [Operations フローのトリアージ](#operations-フローのトリアージ)
- [Maintenance フローのトリアージ](#maintenance-フローのトリアージ)
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

**Light:**
```
Phase 1: 要件ヒアリング  → interviewer    → 承認
Phase 2: ルール策定      → rules-designer → 承認
Phase 3: スコープ策定    → scope-planner  → 承認 → 完了
```

**Standard:**
```
Phase 1: 要件ヒアリング  → interviewer    → 承認
Phase 2: ドメイン調査    → researcher     → 承認
Phase 3: 技術PoC        → poc-engineer   → 承認
Phase 4: ルール策定      → rules-designer → 承認
Phase 5: スコープ策定    → scope-planner  → 承認 → 完了
```

**Full:**
```
Phase 1: 要件ヒアリング  → interviewer       → 承認
Phase 2: ドメイン調査    → researcher        → 承認
Phase 3: 技術PoC        → poc-engineer      → 承認
Phase 4: コンセプト検証  → concept-validator → 承認  [HAS_UI: true のみ]
Phase 5: ルール策定      → rules-designer    → 承認
Phase 6: スコープ策定    → scope-planner     → 承認 → 完了
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
Phase 1:  仕様策定         → spec-designer      → 承認
Phase 2:  UIデザイン       → ux-designer         → 承認  [HAS_UI: true のみ]
Phase 3:  アーキテクチャ設計 → architect         → 承認
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

---

## 必須エージェント（常時実行）

特定のエージェントはトリアージ結果に関わらず**全プランで**実行されます：

| エージェント | ドメイン | 必須の理由 |
|------------|--------|----------|
| `security-auditor` | Delivery | セキュリティ監査は省略不可。OWASP Top 10 + 依存関係スキャンはMinimalでも実行 |

`security-auditor` の必須化は [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md) で定義されています：

> `security-auditor` は **全Deliveryプランで必ず実行**（Minimalを含む）。

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
- [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md) — security-auditor 必須ルール
