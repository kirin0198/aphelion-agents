# エージェントリファレンス

> **Language**: [English](../en/Agents-Reference.md) | [日本語](../ja/Agents-Reference.md)
> **Last updated**: 2026-04-18
> **EN canonical**: 2026-04-18 of wiki/en/Agents-Reference.md
> **Audience**: エージェント開発者

このページはAphelionの27エージェントと4つのフローオーケストレーター全体のコンパクトなリファレンスを提供します。各エントリは標準スキーマに従っています：正規ファイルリンク、ドメイン、責務、入力、出力、AGENT_RESTULTフィールド、NEXT条件。

各エージェントの詳細については、**正規**リンクから`.claude/agents/`のソースファイルを参照してください。

## 目次

- [フローオーケストレーター](#フローオーケストレーター)
- [Discoveryドメイン（6エージェント）](#discoveryドメイン)
- [Deliveryドメイン（12エージェント）](#deliveryドメイン)
- [Operationsドメイン（4エージェント）](#operationsドメイン)
- [セーフティエージェント（1エージェント）](#セーフティエージェント)
- [スタンドアロンエージェント（2エージェント）](#スタンドアロンエージェント)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## フローオーケストレーター

フローオーケストレーターはドメイン全体を管理します。トリアージで選択されるエージェントではなく、セッションエントリーポイントです。

### discovery-flow

- **正規**: [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md)
- **ドメイン**: オーケストレーター（Discovery）
- **責務**: 要件探索フロー全体を管理します。トリアージを実行し、エージェントを順次起動し、承認とロールバックを処理し、DISCOVERY_RESULT.mdを生成します。
- **入力**: ユーザーのプロジェクト説明（コマンド引数経由）
- **出力**: DISCOVERY_RESULT.md（最終ハンドオフ）、INTERVIEW_RESULT.md、RESEARCH_RESULT.md、POC_RESULT.md、CONCEPT_VALIDATION.md、SCOPE_PLAN.md
- **AGENT_RESTULTフィールド**: N/A（オーケストレーターはAGENT_RESTULTを出力しない；ハンドオフファイルを生成する）
- **NEXT条件**: 完了後、ユーザーに`/delivery-flow`の実行を促す

### delivery-flow

- **正規**: [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md)
- **ドメイン**: オーケストレーター（Delivery）
- **責務**: 設計・実装・テスト・レビューフロー全体を管理します。DISCOVERY_RESULT.mdを読み込み、トリアージを実行し、テスト/レビュー失敗時のロールバックを処理し、DELIVERY_RESULT.mdを生成します。
- **入力**: DISCOVERY_RESULT.md（オプション）、既存のSPEC.md / ARCHITECTURE.md
- **出力**: DELIVERY_RESULT.md（最終ハンドオフ）、SPEC.md、ARCHITECTURE.md、実装コード、TEST_PLAN.md、SECURITY_AUDIT.md、README.md
- **AGENT_RESTULTフィールド**: N/A
- **NEXT条件**: 完了後、ユーザーに`/operations-flow`の実行を促す（serviceの場合）

### operations-flow

- **正規**: [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md)
- **ドメイン**: オーケストレーター（Operations）
- **責務**: デプロイと運用フローを管理します。PRODUCT_TYPE: serviceの場合のみ実行。DELIVERY_RESULT.mdを読み込み、トリアージを実行し、OPS_RESULT.mdを生成します。
- **入力**: DELIVERY_RESULT.md（必須）、ARCHITECTURE.md、SPEC.md
- **出力**: OPS_RESULT.md、Dockerfile、docker-compose.yml、CI/CDパイプライン、DB_OPS.md、OBSERVABILITY.md、OPS_PLAN.md
- **AGENT_RESTULTフィールド**: N/A
- **NEXT条件**: フロー完了（ユーザーがデプロイを処理）

---

## Discoveryドメイン

Discoveryドメイン（6エージェント）は要件探索を担当します。

### interviewer

- **正規**: [.claude/agents/interviewer.md](../../.claude/agents/interviewer.md)
- **ドメイン**: Discovery
- **責務**: 要件インタビューを実施し、暗黙の要件を発掘し、PRODUCT_TYPEとHAS_UIを決定し、INTERVIEW_RESULT.mdを生成します。全Discoveryプランで実行されます。
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
- **責務**: MVPを定義し、MoSCoWで要件に優先順位を付け、リストとコストを評価し、ハンドオフ準備状況を判定し、DISCOVERY_RESULT.mdを生成します。Light以上で実行されます。
- **入力**: INTERVIEW_RESULT.md、RESEARCH_RESULT.md、POC_RESULT.md、CONCEPT_VALIDATION.md（利用可能なもの）
- **出力**: SCOPE_PLAN.md、DISCOVERY_RESULT.md
- **AGENT_RESTULTフィールド**: `MVP_SCOPE`、`MUST_COUNT`、`SHOULD_COUNT`、`RISKS`、`HANDOFF_READY`
- **NEXT条件**:
  - HANDOFF_READY: true → `done`
  - HANDOFF_READY: false → `researcher`（ロールバック、STATUS: blocked）

---

## Deliveryドメイン

Deliveryドメイン（12エージェント）は設計・実装・テスト・リリースを担当します。

### spec-designer

- **正規**: [.claude/agents/spec-designer.md](../../.claude/agents/spec-designer.md)
- **ドメイン**: Delivery
- **責務**: DISCOVERY_RESULT.mdの要件を構造化されたSPEC.mdに変換します。推奨技術スタックを選択します。HAS_UIとPRODUCT_TYPEを決定します。
- **入力**: DISCOVERY_RESULT.md（オプション）、ユーザー要件（Discoveryなしの場合）
- **出力**: SPEC.md
- **AGENT_RESTULTフィールド**: `HAS_UI`、`PRODUCT_TYPE`、`TBD_COUNT`
- **NEXT条件**:
  - HAS_UI: true → `ux-designer`
  - HAS_UI: false → `architect`

### ux-designer

- **正規**: [.claude/agents/ux-designer.md](../../.claude/agents/ux-designer.md)
- **ドメイン**: Delivery
- **責務**: SPEC.mdとCONCEPT_VALIDATION.mdを読み込み、ワイヤーフレーム・画面フロー・コンポーネント仕様を含むUI_SPEC.mdを生成します。HAS_UI: trueの場合のみ実行されます。
- **入力**: SPEC.md、CONCEPT_VALIDATION.md（オプション）
- **出力**: UI_SPEC.md
- **AGENT_RESTULTフィールド**: `SCREENS`、`COMPONENTS`、`RESPONSIVE`、`ACCESSIBILITY`
- **NEXT条件**: `architect`

### architect

- **正規**: [.claude/agents/architect.md](../../.claude/agents/architect.md)
- **ドメイン**: Delivery
- **責務**: SPEC.md（およびUI_SPEC.md）を読み込み、技術スタック決定・モジュール設計・データモデル・API設計・テスト戦略・実装順序を含むARCHITECTURE.mdを生成します。
- **入力**: SPEC.md、UI_SPEC.md（HAS_UIの場合）、DISCOVERY_RESULT.md（利用可能な場合）
- **出力**: ARCHITECTURE.md
- **AGENT_RESTULTフィールド**: `TECH_STACK`、`TECH_STACK_CHANGED`、`PHASES`
- **NEXT条件**:
  - Standard / Fullプラン → `scaffolder`
  - Minimal / Lightプラン → `developer`

### scaffolder

- **正規**: [.claude/agents/scaffolder.md](../../.claude/agents/scaffolder.md)
- **ドメイン**: Delivery
- **責務**: ARCHITECTURE.mdからプロジェクト構造を初期化します：ディレクトリ作成、依存関係インストール、設定ファイル配置、エントリーポイント作成、ビルド確認。Standard以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md
- **出力**: プロジェクトスキャフォールド（ディレクトリ、pyproject.toml / package.json、.env.example、.gitignore、エントリーポイント）
- **AGENT_RESTULTフィールド**: `TECH_STACK`、`DIRECTORIES_CREATED`、`PACKAGES_INSTALLED`、`BUILD_CHECK`
- **NEXT条件**: `developer`

### developer

- **正規**: [.claude/agents/developer.md](../../.claude/agents/developer.md)
- **ドメイン**: Delivery
- **責務**: ARCHITECTURE.mdの実装順序に従ってコードを実装します。TASK.mdで進捗を管理します（再開をサポート）。タスクごとにコミットし、各タスク後にlint/formatチェックを実行します。
- **入力**: SPEC.md、ARCHITECTURE.md、UI_SPEC.md（HAS_UIの場合）、TASK.md（再開時）
- **出力**: 実装コード、TASK.md
- **AGENT_RESTULTフィールド**: `PHASE`、`TASKS_COMPLETED`、`LAST_COMMIT`、`LINT_CHECK`、`FILES_CHANGED`、`ACCEPTANCE_CHECK`
- **NEXT条件**:
  - 正常完了 → `test-designer`
  - セッション中断 → `suspended`
  - 設計上の曖昧さ → `blocked`（BLOCKED_TARGET: architect）

### test-designer

- **正規**: [.claude/agents/test-designer.md](../../.claude/agents/test-designer.md)
- **ドメイン**: Delivery
- **責務**: 全UCの受け入れ基準を網羅したテストケースを含むTEST_PLAN.mdを作成します。テスト失敗時の根本原因分析も実施します（ロールバックモード）。テストコードは作成しません。
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード
- **出力**: TEST_PLAN.md
- **AGENT_RESTULTフィールド**: `TOTAL_CASES`、`UC_COVERAGE`、`HAS_UI`
- **NEXT条件**:
  - HAS_UI: true → `e2e-test-designer`
  - HAS_UI: false → `tester`
  - ロールバックモード → `developer`（実装バグ）または`tester`（テストコードバグ）

### e2e-test-designer

- **正規**: [.claude/agents/e2e-test-designer.md](../../.claude/agents/e2e-test-designer.md)
- **ドメイン**: Delivery
- **責務**: TEST_PLAN.mdにE2EおよびGUIテストケースを追加します。プロジェクトタイプに基づいてE2Eツール（Playwright、pywinauto、pyautogui）を選択します。HAS_UI: trueの場合のみ実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md、UI_SPEC.md、TEST_PLAN.md、実装コード
- **出力**: TEST_PLAN.md（E2Eセクション追加）
- **AGENT_RESTULTフィールド**: `E2E_TOOL`、`TOTAL_E2E_CASES`、`SCREEN_COVERAGE`
- **NEXT条件**: `tester`

### tester

- **正規**: [.claude/agents/tester.md](../../.claude/agents/tester.md)
- **ドメイン**: Delivery
- **責務**: TEST_PLAN.mdからテストコードを作成して実行します。テストケースごとの合否状況を含む結果を報告します。Minimalプランではテスト設計も担当します。
- **入力**: TEST_PLAN.md、ARCHITECTURE.md、実装コード
- **出力**: テストコードファイル（tests/）、テスト実行結果
- **AGENT_RESTULTフィールド**: `TOTAL`、`PASSED`、`FAILED`、`SKIPPED`、`FAILED_TESTS`
- **NEXT条件**:
  - 全件パス → `reviewer`
  - 失敗あり → `test-designer`（根本原因分析）

### reviewer

- **正規**: [.claude/agents/reviewer.md](../../.claude/agents/reviewer.md)
- **ドメイン**: Delivery
- **責務**: 5つの観点でコードをレビューします：仕様準拠、設計一貫性、コード品質、テスト品質、APIコントラクト。コードは変更しません。Light以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、テスト結果
- **出力**: レビューレポート（テキスト出力、別ファイルなし）
- **AGENT_RESTULTフィールド**: `CRITICAL_COUNT`、`WARNING_COUNT`、`SUGGESTION_COUNT`、`CRITICAL_ITEMS`
- **NEXT条件**:
  - CRITICALなし → `done`（STATUS: approvedまたはconditional）
  - CRITICAL発見 → `developer`（STATUS: rejected）

### security-auditor

- **正規**: [.claude/agents/security-auditor.md](../../.claude/agents/security-auditor.md)
- **ドメイン**: Delivery
- **責務**: OWASP Top 10、依存関係の脆弱性、認証/認可のギャップ、ハードコードされたシークレット、入力バリデーション、CWEアイテムについて実装を監査します。**全プランで必須実行。**
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、依存関係ファイル
- **出力**: SECURITY_AUDIT.md
- **AGENT_RESTULTフィールド**: `CRITICAL_COUNT`、`WARNING_COUNT`、`INFO_COUNT`、`CRITICAL_ITEMS`、`DEPENDENCY_VULNS`
- **NEXT条件**:
  - CRITICALなし → `done`
  - CRITICAL発見 → `developer`

### doc-writer

- **正規**: [.claude/agents/doc-writer.md](../../.claude/agents/doc-writer.md)
- **ドメイン**: Delivery
- **責務**: SPEC.md、ARCHITECTURE.md、gitログからREADME.md、CHANGELOG.md、APIドキュメントを生成します。Standard以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、gitログ
- **出力**: README.md、CHANGELOG.md
- **AGENT_RESTULTフィールド**: `DOCS_COUNT`
- **NEXT条件**:
  - Fullプラン → `releaser`
  - Standardプラン → `done`

### releaser

- **正規**: [.claude/agents/releaser.md](../../.claude/agents/releaser.md)
- **ドメイン**: Delivery
- **責務**: SemVerバージョンを割り当て、CHANGELOG.mdを更新し、RELEASE_NOTES.mdを生成し、バージョンファイルを更新し、gitタグを作成し、オプションでGitHub Releaseドラフトを作成します。Fullプランのみで実行されます。
- **入力**: SPEC.md、CHANGELOG.md、gitタグ、テスト/レビュー/セキュリティ結果
- **出力**: RELEASE_NOTES.md、CHANGELOG.md（更新）、バージョンファイル、gitタグ
- **AGENT_RESTULTフィールド**: `VERSION`、`TAG`、`PACKAGE_BUILT`、`GH_RELEASE_DRAFT`
- **NEXT条件**: `done`

---

## Operationsドメイン

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

## セーフティエージェント

これらのエージェントは他のエージェント全体にセーフティポリシーを適用します。オーケストレーターから自動的に挿入されることも、Bashを持つ任意のエージェントから明示的に委譲されることもあります。

### sandbox-runner

- **正規**: [.claude/agents/sandbox-runner.md](../../.claude/agents/sandbox-runner.md)
- **ドメイン**: セーフティ（横断的）
- **責務**: 最も強力な利用可能な隔離を使って高リスクコマンドを実行します。まず `container` モード（devcontainer + Docker）を試み、利用不可の場合はプラットフォームのパーミッション制御にフォールバックします。`sandbox-policy.md`に照らしてコマンドを再分類し、フォールバック理由を含む完全な監査証跡を返します。
- **入力**: `command`、`working_directory`、`timeout_sec`、`risk_hint`、`allow_network`、`allow_write_paths`、`dry_run`、`reason`、`caller_agent`
- **出力**: `stdout`、`stderr`、`exit_code`、`sandbox_mode`、`detected_risks`、`decision`、`fallback_reason`、`notes`
- **実行経路選択**（Workflowの Step 2）:
  1. リポジトリ内の `.devcontainer/devcontainer.json` の存在確認
  2. 5秒タイムアウトで `docker info` 実行
  3. 両方 OK → `container` モード（ワーキングディレクトリのみマウント；既定 `--network=none`；ホスト環境変数なし）
  4. いずれかNG → `FALLBACK_REASON` を記録して `platform_permission` にフォールバック
- **AGENT_RESTULTフィールド**: `STATUS`、`SANDBOX_MODE`、`EXIT_CODE`、`DETECTED_RISKS`、`DECISION`、`CALLER`、`DURATION_MS`、`FALLBACK_REASON`（container モード成功時は省略）
- **NEXT条件**:
  - 別エージェントから呼び出された場合 → 呼び出し元エージェントに返る
  - ユーザーがスタンドアロンで起動した場合 → `done`
  - セッション中断 → `suspended`

---

## スタンドアロンエージェント

この2つのエージェントはトリアージシステムの外で動作し、ユーザーが直接起動します。

### analyst

- **正規**: [.claude/agents/analyst.md](../../.claude/agents/analyst.md)
- **ドメイン**: スタンドアロン
- **責務**: 既存プロジェクトのバグ報告、機能要求、リファクタリング課題を受け付けます。課題を分類し、アプローチを決定し、SPEC.md / UI_SPEC.mdをインクリメンタルに更新し、GitHubイシューを作成し、architectにハンドオフします。
- **入力**: ユーザーの課題説明、既存のSPEC.md、ARCHITECTURE.md、UI_SPEC.md
- **出力**: 更新されたSPEC.md / UI_SPEC.md（インクリメンタル）、GitHubイシュー（gh CLI経由）、PR
- **AGENT_RESTULTフィールド**: `ISSUE_TYPE`、`ISSUE_SUMMARY`、`BRANCH`、`DOCS_UPDATED`、`GITHUB_ISSUE`、`PR_URL`、`ARCHITECT_BRIEF`
- **NEXT条件**: `architect`（delivery-flowはPhase 3から合流）

### codebase-analyzer

- **正規**: [.claude/agents/codebase-analyzer.md](../../.claude/agents/codebase-analyzer.md)
- **ドメイン**: スタンドアロン
- **責務**: ドキュメントがない既存コードベースからSPEC.mdとARCHITECTURE.mdをリバースエンジニアリングします。analyst → delivery-flowを通じてプロジェクトが標準Aphelionワークフローに参加できるようにします。
- **入力**: 既存コードベース（作業ディレクトリ内のソースファイル）
- **出力**: SPEC.md、ARCHITECTURE.md（リバースエンジニアリング）
- **AGENT_RESTULTフィールド**: `HAS_UI`、`PRODUCT_TYPE`、`LANGUAGE`、`FRAMEWORK`、`UC_COUNT`、`ENTITY_COUNT`、`TBD_COUNT`
- **NEXT条件**: `done`（ユーザーが`/analyst`または`/delivery-flow`を実行）

---

## 関連ページ

- [アーキテクチャ](./Architecture.md)
- [トリアージシステム](./Triage-System.md)
- [ルールリファレンス](./Rules-Reference.md)
- [コントリビューティング](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — 27エージェント定義ファイル全体（権威あるソース）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — フローオーケストレータールールとトリアージ
