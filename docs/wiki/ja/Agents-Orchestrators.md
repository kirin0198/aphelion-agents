# Agents Reference: Orchestrators & Cross-Cutting

> **Language**: [English](../en/Agents-Orchestrators.md) | [日本語](../ja/Agents-Orchestrators.md)
> **Last updated**: 2026-04-30
> **Update history**:
>   - 2026-04-30: Add doc-reviewer (Quality Agents) per #91
>   - 2026-04-26: Sync with #62, #66, #72, #74 (issue #77)
>   - 2026-04-25: terminology rebalance per #40
> **EN canonical**: 2026-04-30 of wiki/en/Agents-Orchestrators.md
> **Audience**: エージェント開発者

このページはもとの Agents-Reference.md を 5 ページに分割したもの（#42）です。Flow Orchestrator（フローオーケストレーター）、セーフティエージェント、品質エージェント、スタンドアロンエージェント（横断系エージェント）を扱います。ドメイン別エージェントは関連ページを参照してください: [Discovery](./Agents-Discovery.md)、[Delivery](./Agents-Delivery.md)、[Operations](./Agents-Operations.md)、[Maintenance](./Agents-Maintenance.md)。

## 目次

- [Flow Orchestrator](#flow-orchestrator)
- [セーフティエージェント](#セーフティエージェント)
- [品質エージェント](#品質エージェント)
- [スタンドアロンエージェント](#スタンドアロンエージェント)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Flow Orchestrator

Flow Orchestrator はドメイン全体を管理します。トリアージで選択されるエージェントではなく、セッションエントリーポイントです。

### discovery-flow

- **正規**: [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md)
- **ドメイン**: Flow Orchestrator（Discovery）
- **責務**: 要件探索フロー全体を管理します。トリアージの実行、エージェントの順次起動、承認とロールバックの処理を担い、最終成果物として DISCOVERY_RESULT.md を生成します。
- **入力**: ユーザーのプロジェクト説明（コマンド引数経由）
- **出力**: DISCOVERY_RESULT.md（最終ハンドオフ）、INTERVIEW_RESULT.md、RESEARCH_RESULT.md、POC_RESULT.md、CONCEPT_VALIDATION.md、SCOPE_PLAN.md
- **AGENT_RESTULTフィールド**: N/A（Flow Orchestrator は `AGENT_RESULT` を出力しない；ハンドオフファイルを生成する）
- **NEXT条件**: 完了後、ユーザーに`/delivery-flow`の実行を促す

### delivery-flow

- **正規**: [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md)
- **ドメイン**: Flow Orchestrator（Delivery）
- **責務**: 設計・実装・テスト・レビューフロー全体を管理します。DISCOVERY_RESULT.md を読み込んでトリアージを実行し、テスト/レビュー失敗時のロールバックを処理したうえで、DELIVERY_RESULT.md を生成します。
- **入力**: DISCOVERY_RESULT.md（オプション）、既存のSPEC.md / ARCHITECTURE.md
- **出力**: DELIVERY_RESULT.md（最終ハンドオフ）、SPEC.md、ARCHITECTURE.md、実装コード、TEST_PLAN.md、SECURITY_AUDIT.md、README.md
- **AGENT_RESTULTフィールド**: N/A
- **NEXT条件**: 完了後、ユーザーに`/operations-flow`の実行を促す（serviceの場合）

### operations-flow

- **正規**: [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md)
- **ドメイン**: Flow Orchestrator（Operations）
- **責務**: デプロイと運用フローを管理します。PRODUCT_TYPE: serviceの場合のみ実行。DELIVERY_RESULT.mdを読み込み、トリアージを実行し、OPS_RESULT.mdを生成します。
- **入力**: DELIVERY_RESULT.md（必須）、ARCHITECTURE.md、SPEC.md
- **出力**: OPS_RESULT.md、Dockerfile、docker-compose.yml、CI/CDパイプライン、DB_OPS.md、OBSERVABILITY.md、OPS_PLAN.md
- **AGENT_RESTULTフィールド**: N/A
- **NEXT条件**: フロー完了（ユーザーがデプロイを処理）

### maintenance-flow

- **正規**: [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md)
- **ドメイン**: Flow Orchestrator（Maintenance — 第 4 のフロー）
- **責務**: 既存プロジェクトの保守ライフサイクルを管理します。トリガー (バグ / CVE / パフォーマンス / 技術的負債 / 機能追加) を受け取り、`change-classifier` で Patch / Minor / Major のトリアージを行い、対応するエージェントを順次起動します。Patch と Minor は単独完結、Major は `MAINTENANCE_RESULT.md` を生成して delivery-flow に引き渡します。
- **入力**: ユーザーが指定するトリガー情報 (ログエラー / CVE 通知 / 機能要望 等)、SPEC.md、ARCHITECTURE.md
- **出力**: GitHub issue、PR、テスト結果。Major のみ `MAINTENANCE_RESULT.md` を生成
- **AGENT_RESTULTフィールド**: Patch/Minor は N/A (PR + issue で報告)。Major のみ: `PLAN`、`MAINTENANCE_RESULT`、`HANDOFF_TO`
- **NEXT 条件**:
  - Patch / Minor 完了 → `done`
  - Major 完了 → `delivery-flow` (ユーザーが `MAINTENANCE_RESULT.md` を確認後に `/delivery-flow` を手動実行)

---

## セーフティエージェント

これらのエージェントは他のエージェント全体にセーフティポリシーを適用します。Flow Orchestrator から自動的に挿入されることも、Bash を持つ任意のエージェントから明示的に委譲されることもあります。

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

## 品質エージェント

これらのエージェントは他のエージェントの成果物に対して品質ゲートを適用します。Flow Orchestrator が特定フェーズ完了直後に自動挿入（post-insert）するため、生成元のエージェントが直接呼び出すことはありません。

### doc-reviewer

- **正規**: [.claude/agents/doc-reviewer.md](../../.claude/agents/doc-reviewer.md)
- **ドメイン**: 品質（横断的）
- **責務**: マークダウン成果物（SPEC.md / ARCHITECTURE.md / UI_SPEC.md / docs/design-notes/、DISCOVERY_RESULT.md）の文書間整合性をレビューします。Flow Orchestrator が spec-designer / architect / ux-designer / scope-planner / analyst の各完了直後に自動挿入（post-insert）します。生成元エージェントから独立したコンテキストで動作。読み取り専用 — ファイルの生成・更新は行わず、テキストレポートのみを返します。
- **入力**: 直前フェーズの対象成果物 + それが依存する上流成果物（例: ARCHITECTURE.md レビュー時は SPEC.md も読む）。`TRIGGERED_BY` フィールドで上流エージェントを識別。
- **出力**: severity 付き findings のテキストレポート（🔴 DR / 🟡 DA / 🟢 DI）。ファイル成果物なし。
- **5つの観点**: coverage / naming / scope / version / acceptance
- **AGENT_RESULT フィールド**: `STATUS`、`DOC_REVIEW_RESULT`（`pass` | `fail` | `conditional`）、`INCONSISTENCY_COUNT`、`TRIGGERED_BY`、`REVIEWED_FILES`、`FINDINGS`、`NEXT`
- **NEXT 条件**:
  - `DOC_REVIEW_RESULT: pass` → 次フェーズ
  - `DOC_REVIEW_RESULT: fail` → 上流エージェントへ rollback（`orchestrator-rules.md` の Rollback Limit Common に従い max 3 回）。上限超過時は approval gate で「Approve despite findings」を提示
- **プランティア**:
  - `delivery-flow`: 全プランで必須（spec-designer / architect / ux-designer の後）
  - `discovery-flow`: scope-planner 完了後で必須。Minimal では scope-planner が走らないため skip。
  - `maintenance-flow`: 条件付き auto — `analyst.DOCS_UPDATED` に SPEC.md 差分が含まれる場合のみ実行（Patch かつ SPEC 変更なしなら skip）

---

## スタンドアロンエージェント

この2つのエージェントはトリアージシステムの外で動作し、ユーザーが直接起動します。

### analyst

- **正規**: [.claude/agents/analyst.md](../../.claude/agents/analyst.md)
- **ドメイン**: スタンドアロン
- **責務**: 既存プロジェクトのバグ報告、機能要求、リファクタリング課題を受け付けます。課題の分類とアプローチ決定を行ったうえで、必要に応じて SPEC.md / UI_SPEC.md をインクリメンタルに更新し、対応する `docs/design-notes/<slug>.md` 計画ドキュメントを作成し、GitHub イシューを作成して `developer` にハンドオフします（設計変更が必要な場合は `architect`）。ブランチ作成・プッシュ・PR 作成は次の実装エージェント（`developer`）が担い、`analyst` の責務ではありません。
- **入力**: ユーザーの課題説明、既存のSPEC.md、ARCHITECTURE.md、UI_SPEC.md
- **出力**: `docs/design-notes/<slug>.md`、更新されたSPEC.md / UI_SPEC.md（インクリメンタル）、GitHubイシュー（gh CLI経由）
- **AGENT_RESTULTフィールド**: `ISSUE_TYPE`、`ISSUE_SUMMARY`、`DOCS_UPDATED`、`GITHUB_ISSUE`、`HANDOFF_TO`、`ARCHITECT_BRIEF`
- **NEXT条件**: `developer`（デフォルト）| `architect`（設計変更が必要な場合）

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

- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
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
