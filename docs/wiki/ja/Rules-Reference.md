# Rules Reference

> **Language**: [English](../en/Rules-Reference.md) | [日本語](../ja/Rules-Reference.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: terminology rebalance per #40)
> **EN canonical**: 2026-04-25 of wiki/en/Rules-Reference.md
> **Audience**: エージェント開発者

このページは`.claude/rules/`にある10の行動ルールのコンパクトなリファレンスです。各エントリはスコープ、自動ロードの動作、他ルール・エージェントとのインタラクション、ルールが強制する主要な制約をまとめています。

詳細については、**正規**リンクからソースファイルを参照してください。

## 目次

- [aphelion-overview](#aphelion-overview)
- [agent-communication-protocol](#agent-communication-protocol)
- [build-verification-commands](#build-verification-commands)
- [document-versioning](#document-versioning)
- [file-operation-principles](#file-operation-principles)
- [git-rules](#git-rules)
- [language-rules](#language-rules)
- [library-and-security-policy](#library-and-security-policy)
- [sandbox-policy](#sandbox-policy)
- [user-questions](#user-questions)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## aphelion-overview

- **正規**: [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md)
- **スコープ**: 全エージェントと Flow Orchestrator（フローオーケストレーター）；トップレベルのワークフローコンテキストを提供
- **自動ロードの動作**: `.claude/rules/`に配置され、Claude Codeが全セッション起動時に自動ロード
- **概要**: 3ドメインモデル（Discovery / Delivery / Operations）、独立した Maintenance フロー（既存プロジェクト保守向けの第 4 フロー）、トリアージ階層、エージェントディレクトリの場所を定義します。全エージェントはこのフレームワーク内で動作します。
- **インタラクション**: 全 Flow Orchestrator とエージェントが権威あるワークフローモデルとして参照

---

## agent-communication-protocol

- **正規**: [.claude/rules/agent-communication-protocol.md](../../.claude/rules/agent-communication-protocol.md)
- **スコープ**: 全エージェント；Flow Orchestrator は `AGENT_RESULT` の出力から免除（代わりにハンドオフファイルを生成）
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: Flow Orchestrator は `AGENT_RESULT` STATUS の値を解析して承認ゲート、ロールバック、エラーハンドリングを制御（`orchestrator-rules.md` 参照）。`blocked` STATUS は `developer` が再開できるようになる前に軽量な `architect` への問い合わせをトリガーします。
- **概要**: 全エージェントが作業完了時に出力しなければならない必須の `AGENT_RESULT` ブロックフォーマットを定義します。7 つの STATUS 値（`success`、`error`、`failure`、`suspended`、`blocked`、`approved`/`conditional`/`rejected`）と Flow Orchestrator の決定に対する意味を規定します。また `blocked` STATUS の使用パターンも定義します：`developer` が設計上の曖昧さを発見した場合、`BLOCKED_TARGET: architect` を出力して、Flow Orchestrator が再開前に曖昧さを解消できるようにします。

---

## build-verification-commands

- **正規**: [.claude/rules/build-verification-commands.md](../../.claude/rules/build-verification-commands.md)
- **スコープ**: `developer`（タスクごとの検証）および`tester`（テスト実行）
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: `developer`が各タスクをコミットする前に通過しなければならないlint/formatゲートを定義します。`tester`はテスト実行コマンド列を使用します。`e2e-test-designer`と`tester`はE2Eコマンドテーブルを使用します（`HAS_UI: true`の場合のみ）。
- **概要**: Python、TypeScript、Go、Rust、Node.jsの構文チェック、lint/format、テスト実行コマンドを提供します。lintゲートは必須 — lintエラーはテスト前に修正しなければなりません。lintツールがインストールされていない場合は、タスクレポートに注記した上で構文チェックのみ許容されます。E2EコマンドはPlaywright（Web）、pywinauto（Windowsデスクトップ）、pyautogui（クロスプラットフォーム）、ElectronアプリのPlaywrightをカバーします。

---

## document-versioning

- **正規**: [.claude/rules/document-versioning.md](../../.claude/rules/document-versioning.md)
- **スコープ**: `architect`、`spec-designer`、`ux-designer`、`test-designer`、`developer`、全 Flow Orchestrator
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: 設計ドキュメント（`SPEC.md`、`ARCHITECTURE.md`、`UI_SPEC.md`、`TEST_PLAN.md`）を生成する各エージェントは先頭に `最終更新` と `更新履歴` を記録しなければなりません。`developer` はここで定義された TASK.md フォーマットを使用します。Flow Orchestrator はこれを使用してハンドオフファイルに前ドメインのアーティファクトバージョンを記録します。
- **概要**: 引用ブロックフォーマットを使用して全設計ドキュメントの先頭に更新履歴の記録を義務付けます。トレーサビリティチェーンを確立します：`architect`は使用したSPEC.mdバージョンを記録し、`developer`は使用したARCHITECTURE.mdバージョンをTASK.mdに記録します。TASK.mdフォーマットはここで完全に規定されています（タスク一覧、直近のコミット、中断時のメモ）。

---

## file-operation-principles

- **正規**: [.claude/rules/file-operation-principles.md](../../.claude/rules/file-operation-principles.md)
- **スコープ**: ファイルを読み書きする全エージェント
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: 全ファイル書き込み操作に適用されます。`git-rules`と連携します（削除禁止、機密ファイルのステージング禁止）。`developer`がARCHITECTURE.mdに記載されていないディレクトリを作成するのを防ぎます。
- **概要**: 3つの必須制約：(1) 上書き前に必ず既存ファイルの内容を`Read`する、(2) ユーザーが明示的に指示しない限りファイルを削除しない、(3) 設計ドキュメント（SPEC.md / ARCHITECTURE.md）に記載されていないディレクトリを作成しない。新しいディレクトリが必要な場合は、まずユーザーに確認します。

---

## git-rules

- **正規**: [.claude/rules/git-rules.md](../../.claude/rules/git-rules.md)
- **スコープ**: `developer`、`releaser`、`scaffolder`、gitコミットを行う全エージェント
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: `developer`はタスクごとに1コミットの粒度に従わなければなりません。`releaser`はgitタグを作成します。`git add -A`は明示的に禁止されています — `developer`は`git add {具体的なファイル名}`を使用しなければなりません。
- **概要**: コミットの粒度（タスクごとに1コミット、テストコードは実装コードと同様）、ステージングポリシー（`git add -A`は禁止；明示的なファイルパスを使用；`.env`、`credentials.*`、`*.secret`はコミットしない）、コミットメッセージフォーマット（8つのプレフィックスタイプ（feat、fix、refactor、test、docs、chore、ci、ops）を使った`{prefix}: {タスク名} (TASK-{N})`）を定義します。

---

## language-rules

- **正規**: [.claude/rules/language-rules.md](../../.claude/rules/language-rules.md)
- **スコープ**: テキスト出力を生成する全エージェント
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: すべての出力タイプの言語を設定します。`agent-communication-protocol`と連携します（AGENT_RESTULTのキー/値は英語でなければならない）。`user-questions`の全ユーザー向けコンテンツに適用されます。
- **概要**: 各出力タイプに使用する言語を定義します：コード/変数名/コミットメッセージは英語；エージェント定義ファイル/ルール/ガイドラインは英語；コードコメント/ユーザー向けドキュメント/ユーザーへのレポートは日本語；AGENT_RESTULTブロックのキー/値は英語；ユーザー向けCLI出力（AskUserQuestionの内容、承認ゲート、進捗表示）は日本語。

---

## library-and-security-policy

- **正規**: [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md)
- **スコープ**: `architect`（ライブラリ選択）、`developer`（ライブラリ採用）、`security-auditor`（脆弱性スキャン）。**`security-auditor`の必須実行ルールは全プランに適用。**
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: `architect`はARCHITECTURE.mdに採用根拠とともに選択したライブラリを記録します。`developer`はARCHITECTURE.mdに従いますが、必要に応じてライブラリを追加できます（まず採用基準を検証しなければならない）。`security-auditor`は依存関係スキャンによって最終検証を実施します。security-auditorの必須実行ルールはトリアージの決定を上書きします — Minimalプランでも実行されます。
- **概要**: ライブラリに関する3つの核心原則：標準ライブラリを優先、車輪の再発明を避ける、依存関係を最小化。採用基準：アクティブにメンテナンスされている、広く採用されている、既知のCVEなし、ライセンス互換性あり、適切な依存関係の深さ。責任分担：architectが選択、developerが追従・拡張、security-auditorがスキャン。**必須ルール**：`security-auditor`はMinimalを含む全Deliveryプランで実行しなければなりません。OWASP Top 10、依存関係の脆弱性、認証ギャップ、ハードコードされたシークレット、入力バリデーション、CWEチェックリストをカバーします。

---

## sandbox-policy

- **正規**: [.claude/rules/sandbox-policy.md](../../.claude/rules/sandbox-policy.md)
- **スコープ**: `Bash`ツールを持つ全エージェント：`developer`、`tester`、`poc-engineer`、`scaffolder`、`infra-builder`、`codebase-analyzer`、`security-auditor`、`db-ops`、`releaser`、`observability`。（`sandbox-runner`はポリシーの実行者であり対象外）
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: 5 つの危険コマンドカテゴリ（`destructive_fs`、`prod_db`、`privilege_escalation`、`secret_access`、`external_net`）と 3 つの委譲ティア（`required`、`recommended`、`optional`）を定義します。`sandbox-runner` はこのポリシーを起動時に読み込んでコマンドを再分類します。Flow Orchestrator はティア定義を参照して `sandbox-runner` をいつ自動挿入するか（Standard+ プラン）を決定します。Bash を持つ各エージェントの定義ファイルにはこのルールへの 1 行参照が含まれています。`infra-builder` は `container` 隔離モードが参照する devcontainer ファイルを生成します。
- **サンドボックスモード（§4）**: 優先順位順に5つのモード：`container`（devcontainerによる実体的な物理的隔離 — 最高優先）、`platform_permission`（Claude Codeパーミッションゲート）、`advisory_only`（警告のみ）、`blocked`（実行拒否）、`bypassed`（カテゴリ非該当）。`container`モードはプラットフォームが`auto`/`allow`モードで動作していても有効です。パーミッション設定に依存しない構造的な境界を提供するためです。
- **決定ツリー（§3）**: コンテナ利用可能性はプラットフォーム検出の**前**に確認されます。`.devcontainer/devcontainer.json`が存在し`docker info`が成功する場合 → `container`モード。そうでなければ、プラットフォーム検出と既存のパーミッションモードロジックに降格。フォールバック順：`container` → `platform_permission` → `advisory_only` → `blocked`。
- **トリアージ × devcontainer（§5）**: Minimal = devcontainer生成スキップ；Light = 生成・任意起動；Standard = 生成・必須起動（required カテゴリのコマンドはコンテナ内のみ実行）；Full = 生成・必須起動 + 監査ログ。
- **概要**: Bashを持つエージェントがいつコマンド実行を`sandbox-runner`に委譲しなければならないかを確立します。コンテナ利用可能性とプラットフォーム検出に基づく隔離モード決定ツリーを提供します。`required`ティアのコマンドは常に委譲しなければなりません；`recommended`ティアはスキップ時に記録された理由とともに委譲すべきです；`optional`ティアはadvisoryのみです。委譲が利用できない場合（Minimalプラン、スタンドアロンコンテキスト）、エージェントはユーザーに警告し明示的な確認を求めなければなりません。

---

## user-questions

- **正規**: [.claude/rules/user-questions.md](../../.claude/rules/user-questions.md)
- **スコープ**: ユーザーへの確認や入力を求める必要がある全エージェント
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: Flow Orchestrator はトリアージインタビュー、承認ゲート、フェーズ確認に `AskUserQuestion` を使用します。（`blocked` になった `developer` を含む）どのエージェントも推測するのではなく止まって質問するためにこれを使用できます。
- **概要**: 不明な点がある場合は推測するのではなく止まって質問することを義務付けます。2つの質問メカニズムを定義します：`AskUserQuestion`ツール（2〜4択の質問、複数選択、コード比較に推奨）とテキスト出力のフォールバック（自由記述のみの質問に使用）。使用ガイドライン：1回の呼び出しで最大4問、関連する質問をまとめる、推奨オプションを先頭に`(推奨)`サフィックスをつけて配置。`AskUserQuestion`ツールは複数選択シナリオで`multiSelect: true`をサポートします。

---

## 関連ページ

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Architecture: Protocols](./Architecture-Protocols.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [エージェントリファレンス：Flow Orchestrator](./Agents-Orchestrators.md)
- [Contributing](./Contributing.md)

## 正規ソース

- [.claude/rules/](../../.claude/rules/) — 10のルールファイル全体（権威あるソース）
- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — ワークフロー概要（rules コレクションの一部に統合）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — `agent-communication-protocol` に依存する Flow Orchestrator の動作
