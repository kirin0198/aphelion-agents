# Agents Reference: Discovery Domain

> **Language**: [English](../en/Agents-Discovery.md) | [日本語](../ja/Agents-Discovery.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 of wiki/en/Agents-Discovery.md
> **Audience**: エージェント開発者

このページはもとの Agents-Reference.md を 5 ページに分割したもの（#42）です。Discovery ドメインエージェントを扱います。他のドメインは関連ページを参照してください: [Flow Orchestrator・横断系](./Agents-Orchestrators.md)、[Delivery](./Agents-Delivery.md)、[Operations](./Agents-Operations.md)、[Maintenance](./Agents-Maintenance.md)。

## 目次

- [Discovery Domain](#discovery-domain)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Discovery Domain

Discoveryドメイン（6エージェント）は要件探索を担当します。

### interviewer

- **正規**: [.claude/agents/interviewer.md](../../.claude/agents/interviewer.md)
- **ドメイン**: Discovery
- **責務**: 要件インタビューを実施するエージェントです。暗黙の要件を発掘したうえで PRODUCT_TYPE と HAS_UI を決定し、その結果を INTERVIEW_RESULT.md として生成します。全 Discovery プランで実行されます。
- **入力**: ユーザーのプロジェクト説明（discovery-flowから）
- **出力**: INTERVIEW_RESULT.md
- **AGENT_RESTULTフィールド**: `PRODUCT_TYPE`、`HAS_UI`、`REQUIREMENTS_COUNT`、`IMPLICIT_REQUIREMENTS`
- **NEXT条件**:
  - Minimalプラン → `done`
  - Lightプラン → `rules-designer`
  - Standard / Fullプラン → `researcher`
  - poc-engineerからのロールバック → 実現不可能な要件を再インタビュー

### researcher

- **正規**: [.claude/agents/researcher.md](../../.claude/agents/researcher.md)
- **ドメイン**: Discovery
- **責務**: ドメイン知識、競合他社、外部API、技術的リスクを調査します。ユビキタス言語を定義します。StandardとFullプランで実行されます。
- **入力**: INTERVIEW_RESULT.md
- **出力**: RESEARCH_RESULT.md
- **AGENT_RESTULTフィールド**: `RISKS_FOUND`、`EXTERNAL_DEPS`、`COMPETITORS_ANALYZED`、`UBIQUITOUS_TERMS`
- **NEXT条件**:
  - Standard / Fullプラン → `poc-engineer`
  - scope-plannerからのロールバック → `scope-planner`

### poc-engineer

- **正規**: [.claude/agents/poc-engineer.md](../../.claude/agents/poc-engineer.md)
- **ドメイン**: Discovery
- **責務**: 最小限のPoCコードで技術的実現可能性を検証します。実現不可能な要件を特定し、代替案を提案します。StandardとFullプランで実行されます。
- **入力**: INTERVIEW_RESULT.md、RESEARCH_RESULT.md
- **出力**: POC_RESULT.md、`poc/`ディレクトリ配下のコード
- **AGENT_RESTULTフィールド**: `VERIFIED`、`BLOCKED_ITEMS`、`TECH_RECOMMENDATION`
- **NEXT条件**:
  - 実現不可能な要件なし、Fullプラン + HAS_UI → `concept-validator`
  - 実現不可能な要件なし、それ以外 → `rules-designer`
  - 実現不可能な要件あり → `interviewer`（ロールバック、STATUS: blocked）

### concept-validator

- **正規**: [.claude/agents/concept-validator.md](../../.claude/agents/concept-validator.md)
- **ドメイン**: Discovery
- **責務**: ワイヤーフレームとユーザーフロー図を通じてUI/UXコンセプトを検証します。HAS_UI: trueのFullプランでのみ実行されます。
- **入力**: INTERVIEW_RESULT.md、RESEARCH_RESULT.md（オプション）、POC_RESULT.md（オプション）
- **出力**: CONCEPT_VALIDATION.md
- **AGENT_RESTULTフィールド**: `SCREENS`、`UX_ISSUES`、`IMPROVEMENTS`
- **NEXT条件**: `scope-planner`

### rules-designer

- **正規**: [.claude/agents/rules-designer.md](../../.claude/agents/rules-designer.md)
- **ドメイン**: Discovery
- **責務**: プロジェクト固有のコーディング規約、Gitワークフロー、ビルドコマンドをインタラクティブに決定します。`.claude/rules/project-rules.md`を生成します。Light以上で実行されます。
- **入力**: INTERVIEW_RESULT.md、RESEARCH_RESULT.md（オプション）、POC_RESULT.md（オプション）
- **出力**: `.claude/rules/project-rules.md`
- **AGENT_RESTULTフィールド**: `LANGUAGE`、`FRAMEWORK`、`COMMIT_STYLE`、`BRANCH_STRATEGY`
- **NEXT条件**: `scope-planner`

### scope-planner

- **正規**: [.claude/agents/scope-planner.md](../../.claude/agents/scope-planner.md)
- **ドメイン**: Discovery
- **責務**: MVP を定義するエージェントです。MoSCoW で要件に優先順位を付けたうえで、リスクとコストの評価およびハンドオフ準備状況の判定を行い、DISCOVERY_RESULT.md を生成します。Light 以上で実行されます。
- **入力**: INTERVIEW_RESULT.md、RESEARCH_RESULT.md、POC_RESULT.md、CONCEPT_VALIDATION.md（利用可能なもの）
- **出力**: SCOPE_PLAN.md、DISCOVERY_RESULT.md
- **AGENT_RESTULTフィールド**: `MVP_SCOPE`、`MUST_COUNT`、`SHOULD_COUNT`、`RISKS`、`HANDOFF_READY`
- **NEXT条件**:
  - HANDOFF_READY: true → `done`
  - HANDOFF_READY: false → `researcher`（ロールバック、STATUS: blocked）

---

## 関連ページ

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル全体（権威あるソース）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow Orchestrator ルールとトリアージ
