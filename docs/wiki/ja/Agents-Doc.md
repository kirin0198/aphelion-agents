# Agents Reference: Doc Domain

> **Language**: [English](../en/Agents-Doc.md) | [日本語](../ja/Agents-Doc.md)
> **Last updated**: 2026-07-29
> **Update history**:
>   - 2026-07-29: リポジトリルート参照の相対リンク深さを修正 ../../ -> ../../../ (#169)
>   - 2026-04-30: 新規ページ — Doc ドメインエージェント追加 (#54)
> **EN canonical**: 2026-07-29 of wiki/en/Agents-Doc.md
> **Audience**: エージェント開発者

このページは Doc ドメインエージェントを扱います。`doc-flow` が起動する 6 種の author エージェントで、顧客向け納品ドキュメントを生成します。このページは [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)、[Discovery](./Agents-Discovery.md)、[Delivery](./Agents-Delivery.md)、[Operations](./Agents-Operations.md)、[Maintenance](./Agents-Maintenance.md) と並ぶ 6 つ目の Agents Reference ページです。

`doc-flow` オーケストレーター自体は [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md#doc-flow) に記載しています。

## 目次

- [Doc ドメイン](#doc-ドメイン)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Doc ドメイン

Doc ドメイン（6 種の author エージェント + `doc-flow` オーケストレーター）は、既存の Aphelion 成果物から顧客向け納品ドキュメントを生成します。6 種の author エージェントはすべて `doc-flow` が順番に起動しますが、各エージェントは明示的な引数を渡すことでスタンドアロン起動もできます。

**全 author エージェント共通 Tools**: `Read, Write, Glob, Grep`（`Bash` なし — 副作用ゼロ設計）。

**起動パターン**: author エージェントは `doc-flow` から `--slug`、`--lang`、`--repo-root`、`output_path` を受け取ります。スタンドアロン起動時はこれらの引数を直接渡してください。

**テンプレート解決順序**（全 author エージェント共通）:
1. `{project_root}/.claude/templates/doc-flow/{type}.{lang}.md`
2. `{project_root}/.claude/templates/doc-flow/{type}.md`（lang フォールバック）
3. `{repo_root}/.claude/templates/doc-flow/{type}.{lang}.md`（Aphelion 内蔵）
4. `{repo_root}/.claude/templates/doc-flow/{type}.md`（Aphelion 内蔵 lang フォールバック）
5. エージェント内蔵フォールバック（エージェントに組み込まれた最低限の章立て）

**出力パス規約**: `docs/deliverables/{slug}/{type}.{lang}.md`。`--lang` がプロジェクトの `Output Language` と一致する場合、言語サフィックスを省略できます（`{type}.md`）。

---

### hld-author

- **正規**: [.claude/agents/hld-author.md](../../../.claude/agents/hld-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: 顧客のアーキテクトおよびプロジェクトリードに向けて High-Level Design ドキュメントを生成します。`SPEC.md` と `ARCHITECTURE.md` をコンポーネント境界レベルのシステム全体像に再パッケージします。実装の詳細は含めません。
- **固定章立て**（IEEE 1471 / ISO/IEC/IEEE 42010 参考）:
  1. システム概要
  2. システム全体構成
  3. サブシステム分割
  4. 外部連携
  5. 非機能要件
  6. 採用技術
  7. 制約・前提
- **入力**:
  - `SPEC.md`（必須）
  - `ARCHITECTURE.md`（必須）
  - `DISCOVERY_RESULT.md`（任意 — §5 非機能要件を補強）
  - テンプレートファイル（上記テンプレート解決順序で解決）
- **出力**: `docs/deliverables/{slug}/hld.{lang}.md`
- **スコープ外**: `src/*` 実装コード、クラス・関数レベルの仕様（lld-author の責務）、内部開発者向けドキュメント（doc-writer の責務）
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error` | `blocked`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`INPUT_ARTIFACTS`、`SKIPPED_SECTIONS`、`NEXT`、`BLOCKED_REASON`
- **NEXT 条件**:
  - 通常完了 → `lld-author`（doc-flow の次フェーズ）
  - スタンドアロン → `done`
  - テンプレート major バンプ → `STATUS: blocked`、`BLOCKED_REASON: template_major_bump`
- **スタンドアロン起動**: 必須引数: `--slug {値}`、`--lang {ja|en}`、`--repo-root {パス}`（デフォルト: cwd）。起動前に `docs/deliverables/{slug}/` ディレクトリを手動で作成してください。

---

### lld-author

- **正規**: [.claude/agents/lld-author.md](../../../.claude/agents/lld-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: 顧客の開発担当・保守チームに向けて Low-Level Design ドキュメントを生成します。`ARCHITECTURE.md` と `src/*` をシグネチャレベルで読み込み、モジュール・クラス・API シグネチャレベルのドキュメントを生成します。実装ロジックを逐行説明することはしません。
- **固定章立て**（IEEE 1016 SDD 参考）:
  1. モジュール構成
  2. クラス・関数仕様
  3. データ構造
  4. API シグネチャ
  5. アルゴリズム
  6. エラーハンドリング
- **入力**:
  - `ARCHITECTURE.md`（必須）
  - `src/**`（Glob — シグネチャ抽出のみ、本文は引用しない）
  - `TASK.md`（任意 — 実装履歴の補足）
  - テンプレートファイル
- **出力**: `docs/deliverables/{slug}/lld.{lang}.md`
- **スコープ外**: 実装ロジックの逐行説明、顧客に提示しない private/internal API
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error` | `blocked`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`INPUT_ARTIFACTS`、`NEXT`
- **NEXT 条件**:
  - 通常完了 → `api-reference-author`
  - スタンドアロン → `done`

---

### api-reference-author

- **正規**: [.claude/agents/api-reference-author.md](../../../.claude/agents/api-reference-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: 顧客の開発者向け API リファレンスを生成します。`SPEC.md` のユースケース、`ARCHITECTURE.md` の API 設計セクション、`src/*` のエンドポイントシグネチャを統合し、外部 SDK / API 利用ガイドの粒度でドキュメントを生成します。`doc-writer` が生成する内部 API doc とは読者・粒度・出力パスが異なります。
- **入力**:
  - `SPEC.md`
  - `ARCHITECTURE.md`（`## 5. API Design` 相当）
  - `src/**`（Glob — エンドポイントシグネチャ抽出）
  - `openapi.yaml` / `openapi.json`（任意 — 存在時は優先）
  - テンプレートファイル
- **出力**: `docs/deliverables/{slug}/api-reference.{lang}.md`
- **スコープ外**: private/internal エンドポイント、`doc-writer` が生成した内部 API doc（重複回避のため読まない）
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error` | `skipped`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`ENDPOINT_COUNT`、`SKIP_REASON`、`NEXT`
- **NEXT 条件**:
  - 通常完了 → `ops-manual-author`
  - API エンドポイントが見つからない → `STATUS: skipped`、`SKIP_REASON: no API endpoints found`
  - スタンドアロン → `done`

---

### ops-manual-author

- **正規**: [.claude/agents/ops-manual-author.md](../../../.claude/agents/ops-manual-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: インフラスクリプト・デプロイ手順・可観測性ランブックを顧客運用チーム向けに再パッケージします。起動・停止・監視・リストア・エスカレーションフローを 1 冊の運用マニュアルにまとめます。
- **章立て**（ITIL v4 Service Operation 参考）:
  起動/停止、監視、インシデント対応、バックアップ/リストア、エスカレーション
- **入力**:
  - `Dockerfile`、`docker-compose.yml`、`infra/**`（Glob）
  - `OBSERVABILITY.md`（任意）
  - `OPS_PLAN.md`（任意 — Operations Flow 最終出力）
  - `OPS_RESULT.md`（任意）
  - テンプレートファイル
- **出力**: `docs/deliverables/{slug}/ops-manual.{lang}.md`
- **スコープ外**: 開発者向け環境構築（README の領域）、セキュリティ詳細（SECURITY_AUDIT.md からの抜粋に限定）
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error` | `skipped` | `blocked`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`SKIP_REASON`、`INPUT_ARTIFACTS`、`NEXT`
- **NEXT 条件**:
  - 通常完了 → `user-manual-author`
  - `PRODUCT_TYPE: tool / library / cli` でインフラ成果物なし → `STATUS: skipped`、`SKIP_REASON: no infra artifacts (PRODUCT_TYPE != service)`
  - スタンドアロン → `done`

---

### user-manual-author

- **正規**: [.claude/agents/user-manual-author.md](../../../.claude/agents/user-manual-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: システムの実利用者向けに UC 別の操作手順書を生成します。`UI_SPEC.md` がある場合のみ実質的なドキュメントを生成でき、ない場合は `STATUS: skipped` を返します（CLI / ライブラリ / ツール型プロジェクトで典型）。`SPEC.md` の各ユースケースが 1 章となり、`UI_SPEC.md` がある場合は各 UC 章内に画面操作の補足セクションが追加されます。
- **入力**:
  - `SPEC.md`（必須）
  - `UI_SPEC.md`（任意 — 不在時は skip 判定）
  - テンプレートファイル
- **出力**: `docs/deliverables/{slug}/user-manual.{lang}.md`
- **スコープ外**: スクリーンショットの自動撮影（プレースホルダーのみ）、動画チュートリアル、API 利用者向け内容（api-reference-author の責務）
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error` | `skipped`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`UC_COUNT`、`HAS_UI_SPEC`、`SKIP_REASON`、`NEXT`
- **NEXT 条件**:
  - 通常完了 → `handover-author`
  - `UI_SPEC.md` 不在 → `STATUS: skipped`、`SKIP_REASON: no UI (UI_SPEC.md not found)`
  - スタンドアロンで `--types user-manual` + UI 不在 → 空 deliverable 生成前に AskUserQuestion で確認
  - スタンドアロン → `done`

---

### handover-author

- **正規**: [.claude/agents/handover-author.md](../../../.claude/agents/handover-author.md)
- **ドメイン**: Doc（顧客向け納品）
- **責務**: プロジェクト完了時に後任保守チームへの引継ぎパッケージを生成します。SPEC.md・ARCHITECTURE.md・SECURITY_AUDIT.md・TEST_PLAN.md と有効な `docs/design-notes/*.md`（archived は除外）を統合し、1 冊の引継ぎドキュメントにまとめます。同一実行で生成された他の deliverable への相互参照を含みます。
- **固定章立て**:
  1. プロジェクト概要
  2. 設計判断履歴
  3. 既知の課題・宿題
  4. テスト・セキュリティ監査結果サマリ
  5. 運用申し送り
  6. 関連 doc 索引
- **入力**:
  - `SPEC.md`、`ARCHITECTURE.md`、`SECURITY_AUDIT.md`、`TEST_PLAN.md`
  - `docs/design-notes/*.md`（archived/ は除外 — MVP スコープ、doc-flow-architecture.md §2.6 参照）
  - 同一 slug の他 deliverable（§6 で索引化）
  - テンプレートファイル
- **出力**: `docs/deliverables/{slug}/handover.{lang}.md`
- **スコープ外**: `docs/design-notes/archived/`（Phase 2 スコープ）、移行計画書（Phase 2 の別 doc type）
- **AGENT_RESULT フィールド**: `STATUS`（`success` | `error`）、`OUTPUT_FILE`、`TEMPLATE_USED`、`TEMPLATE_VERSION`、`DESIGN_NOTES_REFERENCED`、`RELATED_DELIVERABLES`、`NEXT`
- **NEXT 条件**:
  - 通常完了 → `done`（doc-flow の最終フェーズ）
  - スタンドアロン → `done`

---

## 関連ページ

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md) — doc-flow オーケストレーターのエントリを含む
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../../.claude/agents/) — エージェント定義ファイル全体（権威あるソース）
- [.claude/agents/doc-flow.md](../../../.claude/agents/doc-flow.md) — Doc Flow オーケストレーター定義
- [.claude/templates/doc-flow/](../../../.claude/templates/doc-flow/) — ドキュメントテンプレート（HLD・LLD・API リファレンス・運用マニュアル・ユーザーマニュアル・引継ぎ資料）
