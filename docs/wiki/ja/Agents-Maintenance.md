# Agents Reference: Maintenance Domain

> **Language**: [English](../en/Agents-Maintenance.md) | [日本語](../ja/Agents-Maintenance.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 of wiki/en/Agents-Maintenance.md
> **Audience**: エージェント開発者

このページはもとの Agents-Reference.md を 5 ページに分割したもの（#42）です。Maintenance ドメインエージェントを扱います。他のドメインは関連ページを参照してください: [Flow Orchestrator・横断系](./Agents-Orchestrators.md)、[Discovery](./Agents-Discovery.md)、[Delivery](./Agents-Delivery.md)、[Operations](./Agents-Operations.md)。

## 目次

- [Maintenance Domain](#maintenance-domain)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Maintenance Domain

Maintenance ドメイン（3 エージェント + Flow Orchestrator）はバグ修正・CVE 対応・パフォーマンス改善・技術的負債解消・既存機能の小規模拡張を担当します。Flow Orchestrator（フローオーケストレーター）は [Flow Orchestrator・横断系](./Agents-Orchestrators.md) セクションに記載しています。本セクションではそれを支える 2 つのエージェントを説明します。

### change-classifier

- **正規**: [.claude/agents/change-classifier.md](../../.claude/agents/change-classifier.md)
- **ドメイン**: Maintenance
- **責務**: 入ってきた保守トリガーを Patch / Minor / Major プランに分類するとともに、P1–P4 の緊急度スコアリングを行います。トリガー種別 (bug / feature / tech_debt / performance / security) の識別、影響ファイル数の推定、破壊的変更の検出、SPEC.md への影響度評価を実施します。SPEC.md / ARCHITECTURE.md が存在しない場合は codebase-analyzer の起動を提案します。
- **入力**: ユーザーのトリガー説明、SPEC.md、ARCHITECTURE.md、パッケージメタ情報 (package.json / pyproject.toml)
- **出力**: 構造化された分類結果 (テキスト)
- **AGENT_RESTULTフィールド**: `TRIGGER_TYPE`、`PLAN`、`PRIORITY`、`ESTIMATED_FILES`、`BREAKING_CHANGE`、`SPEC_IMPACT`、`DOCS_PRESENT`、`REQUIRES_CODEBASE_ANALYZER`、`RATIONALE`
- **NEXT 条件**:
  - `REQUIRES_CODEBASE_ANALYZER: true` → `codebase-analyzer` (完了後に change-classifier を再実行)
  - `PLAN: Patch` → `analyst` (impact-analyzer はスキップ)
  - `PLAN: Minor` / `Major` → `impact-analyzer`

### impact-analyzer

- **正規**: [.claude/agents/impact-analyzer.md](../../.claude/agents/impact-analyzer.md)
- **ドメイン**: Maintenance
- **責務**: 変更対象ファイルを具体的に特定して依存グラフをたどります。破壊的 API / DB スキーマ変更の検出、リグレッションリスク (low / medium / high) の評価、推奨テスト範囲 (unit / integration / e2e) の提示を行います。
- **入力**: `change-classifier` の AGENT_RESULT、ユーザーのトリガー説明、SPEC.md、ARCHITECTURE.md
- **出力**: 影響レポート (テキスト)。対象ファイル・依存ファイル・破壊的変更・リグレッション評価を含む
- **AGENT_RESTULTフィールド**: `TARGET_FILES`、`DEPENDENCY_FILES`、`BREAKING_API_CHANGES`、`DB_SCHEMA_CHANGES`、`REGRESSION_RISK`、`RECOMMENDED_TEST_SCOPE`、`IMPACT_SUMMARY`
- **NEXT 条件**: `analyst` (常に。Minor / Major いずれでも analyst が次。プランの差は analyst 以降のフェーズ構成に現れる)

---

## 関連ページ

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル全体（権威あるソース）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow Orchestrator ルールとトリアージ
