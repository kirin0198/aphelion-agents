# Agents Reference: Operations Domain

> **Language**: [English](../en/Agents-Operations.md) | [日本語](../ja/Agents-Operations.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 of wiki/en/Agents-Operations.md
> **Audience**: エージェント開発者

このページはもとの Agents-Reference.md を 5 ページに分割したもの（#42）です。Operations ドメインエージェントを扱います。他のドメインは関連ページを参照してください: [Flow Orchestrator・横断系](./Agents-Orchestrators.md)、[Discovery](./Agents-Discovery.md)、[Delivery](./Agents-Delivery.md)、[Maintenance](./Agents-Maintenance.md)。

## 目次

- [Operations Domain](#operations-domain)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Operations Domain

Operationsドメイン（4エージェント）はデプロイインフラと運用計画を担当します。PRODUCT_TYPE: serviceの場合のみ実行されます。

### infra-builder

- **正規**: [.claude/agents/infra-builder.md](../../.claude/agents/infra-builder.md)
- **ドメイン**: Operations
- **責務**: Dockerfile（マルチステージ）、docker-compose.yml、GitHub Actions CI/CD、.env.example、セキュリティヘッダー、および**sandbox インフラ**（コンテナ隔離実行のための `.devcontainer/devcontainer.json` と `docker-compose.dev.yml`）を生成します。全Operationsプランで実行されます。
- **入力**: DELIVERY_RESULT.md、ARCHITECTURE.md、実装コード
- **出力**: Dockerfile、.dockerignore、docker-compose.yml、docker-compose.override.yml、.github/workflows/ci.yml、.env.example、`.devcontainer/devcontainer.json`（Light以上）、`docker-compose.dev.yml`（Light以上、プロジェクトがComposeを使う場合）
- **AGENT_RESTULTフィールド**: `FILES_CREATED`、`DOCKER_BUILD`、`SECURITY_HEADERS`、`DEVCONTAINER_GENERATED`、`DEV_COMPOSE_GENERATED`、`SANDBOX_INFRA_PATH`
- **sandbox インフラ生成ポリシー**: Minimal → スキップ；Light → 生成・任意起動；Standard → 生成・必須起動；Full → 生成・必須起動 + 監査ログ
- **ディレクトリ分離**: 本番インフラ（`Dockerfile`、`docker-compose.yml`）はsandboxインフラ（`.devcontainer/`、`docker-compose.dev.yml`）を参照してはなりません。sandbox インフラからの本番参照は非推奨です。
- **NEXT条件**:
  - Standard / Fullプラン → `db-ops`
  - Lightプラン → `ops-planner`

### db-ops

- **正規**: [.claude/agents/db-ops.md](../../.claude/agents/db-ops.md)
- **ドメイン**: Operations
- **責務**: 本番DB設定、マイグレーション手順（ロールバック付き）、破壊的変更リスク評価、バックアップ/リストア手順、監視しきい値を定義します。StandardとFullプランで実行されます。
- **入力**: ARCHITECTURE.md（データモデル、技術スタック）、マイグレーションファイル
- **出力**: DB_OPS.md
- **AGENT_RESTULTフィールド**: `MIGRATIONS`、`DESTRUCTIVE_CHANGES`、`DB_TYPE`、`BACKUP_STRATEGY`
- **NEXT条件**:
  - Fullプラン → `observability`
  - Standardプラン → `ops-planner`

### observability

- **正規**: [.claude/agents/observability.md](../../.claude/agents/observability.md)
- **ドメイン**: Operations
- **責務**: ヘルスチェック、構造化ログ、REDメトリクス、アラートルール、パフォーマンスベースラインを設計・実装します。Fullプランのみで実行されます。
- **入力**: ARCHITECTURE.md、DELIVERY_RESULT.md、実装コード
- **出力**: OBSERVABILITY.md、ヘルスチェック実装コード
- **AGENT_RESTULTフィールド**: `HEALTH_CHECKS`、`ALERT_RULES`、`METRICS`
- **NEXT条件**: `ops-planner`

### ops-planner

- **正規**: [.claude/agents/ops-planner.md](../../.claude/agents/ops-planner.md)
- **ドメイン**: Operations
- **責務**: デプロイ手順（ロールバックポイント付き）、ロールバックトリガー条件、インシデント対応プレイブック（P1-P4重大度）、メンテナンスチェックリストを作成します。OPS_RESULT.mdを生成します。
- **入力**: ARCHITECTURE.md、DELIVERY_RESULT.md、infra-builder/db-ops/observabilityの成果物
- **出力**: OPS_PLAN.md、OPS_RESULT.md
- **AGENT_RESTULTフィールド**: `DEPLOY_READY`、`RUNBOOKS`、`MAINTENANCE_ITEMS`
- **NEXT条件**: `done`

---

## 関連ページ

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル全体（権威あるソース）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow Orchestrator ルールとトリアージ
