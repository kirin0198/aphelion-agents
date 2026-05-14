# Agents Reference: Delivery Domain

> **Language**: [English](../en/Agents-Delivery.md) | [日本語](../ja/Agents-Delivery.md)
> **Last updated**: 2026-05-15
> **Update history**:
>   - 2026-05-15: developer 行に TASK.md リセット責務を追加 (#128)
>   - 2026-05-01: visual-designer を追加 (HAS_UI かつ Standard/Full のみ)、ux-designer の NEXT 更新 (#109)
>   - 2026-04-26: Sync with #72, #74 (issue #77)
>   - 2026-04-25: terminology rebalance per #40
> **EN canonical**: 2026-05-15 of wiki/en/Agents-Delivery.md
> **Audience**: エージェント開発者

このページはもとの Agents-Reference.md を 5 ページに分割したもの（#42）です。Delivery ドメインエージェントを扱います。他のドメインは関連ページを参照してください: [Flow Orchestrator・横断系](./Agents-Orchestrators.md)、[Discovery](./Agents-Discovery.md)、[Operations](./Agents-Operations.md)、[Maintenance](./Agents-Maintenance.md)。

## 目次

- [Delivery Domain](#delivery-domain)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Delivery Domain

Deliveryドメイン（13エージェント）は設計・実装・テスト・リリースを担当します。

### spec-designer

- **正規**: [.claude/agents/spec-designer.md](../../.claude/agents/spec-designer.md)
- **ドメイン**: Delivery
- **責務**: DISCOVERY_RESULT.mdの要件を構造化されたSPEC.mdに変換します。推奨技術スタックを選択します。HAS_UIとPRODUCT_TYPEを決定します。
- **入力**: DISCOVERY_RESULT.md（オプション）、ユーザー要件（Discoveryなしの場合）
- **出力**: SPEC.md
- **AGENT_RESULT フィールド**: `HAS_UI`、`PRODUCT_TYPE`、`TBD_COUNT`
- **NEXT条件**:
  - HAS_UI: true → `ux-designer`
  - HAS_UI: false → `architect`

### ux-designer

- **正規**: [.claude/agents/ux-designer.md](../../.claude/agents/ux-designer.md)
- **ドメイン**: Delivery
- **責務**: SPEC.mdとCONCEPT_VALIDATION.mdを読み込み、ワイヤーフレーム・画面フロー・コンポーネント仕様を含むUI_SPEC.mdを生成します。ビジュアルアイデンティティ（色・タイポグラフィ・余白・デザインシステム）は Standard/Full では `visual-designer` に委譲し、Minimal/Light では軽量なビジュアルデフォルトを適用して UI_SPEC.md Section 1 に明示します。HAS_UI: trueの場合のみ実行されます。
- **入力**: SPEC.md、CONCEPT_VALIDATION.md（オプション）
- **出力**: UI_SPEC.md
- **AGENT_RESULT フィールド**: `SCREENS`、`COMPONENTS`、`RESPONSIVE`、`ACCESSIBILITY`、`VISUAL_POLICY`
- **NEXT条件**:
  - Standard / Full プラン → `visual-designer`
  - Minimal / Light プラン → `architect`

### visual-designer

- **正規**: [.claude/agents/visual-designer.md](../../.claude/agents/visual-designer.md)
- **ドメイン**: Delivery
- **責務**: UI_SPEC.md（および存在する場合は CONCEPT_VALIDATION.md）を読み込み、VISUAL_SPEC.md を生成します。これは正準なビジュアル仕様であり、カラーパレット・タイポグラフィスケール・余白/角丸/シャドウのトークン・デザイントークン JSON エクスポート・コンポーネントライブラリ選定（採用理由付き）・WCAG アクセシビリティレベル・レスポンシブブレークポイント・トーン&マナー・アイコノグラフィを含みます。HAS_UI: true かつ プラン ≥ Standard の場合のみ実行されます。Minimal / Light ではスキップされ、ux-designer の軽量デフォルトが代替します。
- **入力**: UI_SPEC.md、CONCEPT_VALIDATION.md（オプション）、SPEC.md（非機能制約用）
- **出力**: VISUAL_SPEC.md
- **AGENT_RESULT フィールド**: `DESIGN_SYSTEM`、`WCAG_LEVEL`、`DARK_MODE`、`TOKENS_EXPORTED`
- **NEXT条件**: `architect`

### architect

- **正規**: [.claude/agents/architect.md](../../.claude/agents/architect.md)
- **ドメイン**: Delivery
- **責務**: SPEC.md（および UI_SPEC.md / VISUAL_SPEC.md）を読み込み、技術スタック決定・モジュール設計・データモデル・API設計・テスト戦略・実装順序を含む ARCHITECTURE.md を生成します。
- **入力**: SPEC.md、UI_SPEC.md（HAS_UIの場合）、VISUAL_SPEC.md（HAS_UI かつ プラン ≥ Standard の場合）、DISCOVERY_RESULT.md（利用可能な場合）
- **出力**: ARCHITECTURE.md
- **AGENT_RESULT フィールド**: `TECH_STACK`、`TECH_STACK_CHANGED`、`PHASES`
- **NEXT条件**:
  - Standard / Fullプラン → `scaffolder`
  - Minimal / Lightプラン → `developer`

### scaffolder

- **正規**: [.claude/agents/scaffolder.md](../../.claude/agents/scaffolder.md)
- **ドメイン**: Delivery
- **責務**: ARCHITECTURE.mdからプロジェクト構造を初期化します：ディレクトリ作成、依存関係インストール、設定ファイル配置、エントリーポイント作成、ビルド確認。Standard以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md
- **出力**: プロジェクトスキャフォールド（ディレクトリ、pyproject.toml / package.json、.env.example、.gitignore、エントリーポイント）
- **AGENT_RESULT フィールド**: `TECH_STACK`、`DIRECTORIES_CREATED`、`PACKAGES_INSTALLED`、`BUILD_CHECK`
- **NEXT条件**: `developer`

### developer

- **正規**: [.claude/agents/developer.md](../../.claude/agents/developer.md)
- **ドメイン**: Delivery
- **責務**: ARCHITECTURE.mdの実装順序に従ってコードを実装します。`git-rules.md` の `## Branch & PR Strategy` に従い、ブランチ作成・プッシュ・PR 作成を担います。TASK.mdで進捗を管理します（再開をサポート）。タスクごとにコミットし、各タスク後にlint/formatチェックを実行します。**フェーズ完了時に `TASK.md` を空のプレースホルダーにリセット**します（`document-versioning.md` §"TASK.md Lifecycle" 参照）。
- **入力**: SPEC.md、ARCHITECTURE.md、UI_SPEC.md（HAS_UIの場合）、VISUAL_SPEC.md（HAS_UI かつ プラン ≥ Standard の場合）、TASK.md（再開時）、`docs/design-notes/<slug>.md`（analyst ハンドオフ経由の場合）
- **出力**: 実装コード、TASK.md、作業ブランチ、PR
- **AGENT_RESULT フィールド**: `PHASE`、`TASKS_COMPLETED`、`LAST_COMMIT`、`LINT_CHECK`、`FILES_CHANGED`、`ACCEPTANCE_CHECK`、`BRANCH`、`PR_URL`
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
- **AGENT_RESULT フィールド**: `TOTAL_CASES`、`UC_COVERAGE`、`HAS_UI`
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
- **AGENT_RESULT フィールド**: `E2E_TOOL`、`TOTAL_E2E_CASES`、`SCREEN_COVERAGE`
- **NEXT条件**: `tester`

### tester

- **正規**: [.claude/agents/tester.md](../../.claude/agents/tester.md)
- **ドメイン**: Delivery
- **責務**: TEST_PLAN.mdからテストコードを作成して実行します。テストケースごとの合否状況を含む結果を報告します。Minimalプランではテスト設計も担当します。
- **入力**: TEST_PLAN.md、ARCHITECTURE.md、実装コード
- **出力**: テストコードファイル（tests/）、テスト実行結果
- **AGENT_RESULT フィールド**: `TOTAL`、`PASSED`、`FAILED`、`SKIPPED`、`FAILED_TESTS`
- **NEXT条件**:
  - 全件パス → `reviewer`
  - 失敗あり → `test-designer`（根本原因分析）

### reviewer

- **正規**: [.claude/agents/reviewer.md](../../.claude/agents/reviewer.md)
- **ドメイン**: Delivery
- **責務**: 5つの観点でコードをレビューします：仕様準拠、設計一貫性、コード品質、テスト品質、APIコントラクト。コードは変更しません。Light以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、テスト結果
- **出力**: レビューレポート（テキスト出力、別ファイルなし）
- **AGENT_RESULT フィールド**: `CRITICAL_COUNT`、`WARNING_COUNT`、`SUGGESTION_COUNT`、`CRITICAL_ITEMS`
- **NEXT条件**:
  - CRITICALなし → `done`（STATUS: approvedまたはconditional）
  - CRITICAL発見 → `developer`（STATUS: rejected）

### security-auditor

- **正規**: [.claude/agents/security-auditor.md](../../.claude/agents/security-auditor.md)
- **ドメイン**: Delivery
- **責務**: OWASP Top 10、依存関係の脆弱性、認証/認可のギャップ、ハードコードされたシークレット、入力バリデーション、CWEアイテムについて実装を監査します。**全プランで必須実行。**
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、依存関係ファイル
- **出力**: SECURITY_AUDIT.md
- **AGENT_RESULT フィールド**: `CRITICAL_COUNT`、`WARNING_COUNT`、`INFO_COUNT`、`CRITICAL_ITEMS`、`DEPENDENCY_VULNS`
- **NEXT条件**:
  - CRITICALなし → `done`
  - CRITICAL発見 → `developer`

### doc-writer

- **正規**: [.claude/agents/doc-writer.md](../../.claude/agents/doc-writer.md)
- **ドメイン**: Delivery
- **責務**: SPEC.md、ARCHITECTURE.md、gitログからREADME.md、CHANGELOG.md、APIドキュメントを生成します。Standard以上で実行されます。
- **入力**: SPEC.md、ARCHITECTURE.md、実装コード、gitログ
- **出力**: README.md、CHANGELOG.md
- **AGENT_RESULT フィールド**: `DOCS_COUNT`
- **NEXT条件**:
  - Fullプラン → `releaser`
  - Standardプラン → `done`

### releaser

- **正規**: [.claude/agents/releaser.md](../../.claude/agents/releaser.md)
- **ドメイン**: Delivery
- **責務**: リリースに伴う一連の作業を担当します。具体的には、SemVer バージョンの割り当て、CHANGELOG.md の更新、RELEASE_NOTES.md の生成、バージョンファイルの更新、git タグの作成、そして任意で GitHub Release ドラフトの作成です。Full プランのみで実行されます。
- **入力**: SPEC.md、CHANGELOG.md、gitタグ、テスト/レビュー/セキュリティ結果
- **出力**: RELEASE_NOTES.md、CHANGELOG.md（更新）、バージョンファイル、gitタグ
- **AGENT_RESULT フィールド**: `VERSION`、`TAG`、`PACKAGE_BUILT`、`GH_RELEASE_DRAFT`
- **NEXT条件**: `done`

---

## 関連ページ

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル全体（権威あるソース）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow Orchestrator ルールとトリアージ
