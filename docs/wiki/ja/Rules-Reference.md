# Rules Reference

> **Language**: [English](../en/Rules-Reference.md) | [日本語](../ja/Rules-Reference.md)
> **Last updated**: 2026-05-01
> **Update history**:
>   - 2026-05-01: hooks-policy エントリ追加、ルール数 12 → 13 に更新 (#107)
>   - 2026-04-30: add missing localization-dictionary entry, sync rule count to 12 (#105)
>   - 2026-04-30: language-rules — "Repo-root README sync convention" sub-section を追加 (#82)
>   - 2026-04-29: language-rules — "Hand-authored canonical narrative" セクションを追加 (#75)
>   - 2026-04-26: Sync with #62, #66, #72, #74 (issue #77)
>   - 2026-04-25: denial-categories ルール追加, #31
> **EN canonical**: 2026-05-01 of wiki/en/Rules-Reference.md
> **Audience**: エージェント開発者

このページは`.claude/rules/`にある 13 の行動ルールのコンパクトなリファレンスです。各エントリはスコープ、自動ロードの動作、他ルール・エージェントとのインタラクション、ルールが強制する主要な制約をまとめています。

詳細については、**正規**リンクからソースファイルを参照してください。

## 目次

- [aphelion-overview](#aphelion-overview)
- [agent-communication-protocol](#agent-communication-protocol)
- [build-verification-commands](#build-verification-commands)
- [document-versioning](#document-versioning)
- [file-operation-principles](#file-operation-principles)
- [git-rules](#git-rules)
- [hooks-policy](#hooks-policy)
- [language-rules](#language-rules)
- [library-and-security-policy](#library-and-security-policy)
- [localization-dictionary](#localization-dictionary)
- [sandbox-policy](#sandbox-policy)
- [denial-categories](#denial-categories)
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
- **スコープ**: 全 Bash 保有エージェント（セッション起動時に Startup Probe を実行）；gitコミット・ブランチ・PRを作成する `developer`、`releaser`、`scaffolder` およびその他のエージェント（コミット / ブランチ / PR ルール）
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**:
  - Bash 保有エージェントはセッションごとに `## Startup Probe` を一度実行し、`REPO_STATE`（`github` | `github_unauth` | `gitlab_scaffold` | `gitea_scaffold` | `local-only` | `none`）を解決します。その後の git/PR 操作は `## Behavior by Remote Type` でこの値に基づいて分岐します。
  - `developer` は `## Branch & PR Strategy` に従ってブランチ作成・プッシュ・PR 作成を担い、`AGENT_RESULT` に `BRANCH` / `PR_URL` を出力します。
  - `analyst` はブランチや PR を作成しません；設計ノートと GitHub イシューの作成のみを担います。
- **概要**: (1) コミットの粒度、ステージングポリシー（`git add -A` は禁止；明示的なファイルパスを使用；`.env`、`credentials.*`、`*.secret` はコミットしない）、コミットメッセージフォーマット（8 つのプレフィックスタイプ: feat、fix、refactor、test、docs、chore、ci、ops）；(2) Co-Authored-By トレーラーポリシー；(3) `## Repository` — `project-rules.md` 内の `Remote type` 宣言（`github` / `gitlab` / `gitea` / `local-only` / `none`）；(4) `## Startup Probe` — `REPO_STATE` を解決するセッションごとのプローブ；(5) `## Branch & PR Strategy` — ブランチ命名（`fix/` / `feat/` / `refactor/`）、ブランチライフサイクル（作成 → コミット → プッシュ → `Closes #N` 付き PR）、`AGENT_RESULT` への追加項目（`BRANCH`、`PR_URL`）；(6) `## Behavior by Remote Type` — ブランチ / コミット / プッシュ / PR 操作のための `REPO_STATE` 別マトリックスを定義します。

---

## hooks-policy

- **正規**: [.claude/rules/hooks-policy.md](../../.claude/rules/hooks-policy.md)
- **スコープ**: `git commit`・ファイル書き込み（`Write`/`Edit`）・依存関係インストールを推奨または実施する全エージェント；フック bypass マーカーと連携するエージェント
- **自動ロードの動作**: Claude Code が全セッション起動時に自動ロード
- **インタラクション**:
  - `sandbox-policy.md` および `denial-categories.md` のコンパニオンルール。フックは**第 4 層**（積極的なコンテンツスキャン）として、`settings.local.json` deny（第 1 層）・`sandbox-runner`（第 2 層）・`denial-categories` 事後診断（第 3 層）の上に位置します。
  - フック A は `git commit` の前に実行され、`library-and-security-policy.md` のシークレット検出要件と統合します。
  - フック E は依存関係インストール後に実行され、`library-and-security-policy.md` で定義された `/vuln-scan` ワークフローをトリガーします。
  - `developer` はフック A が安全なプレースホルダーで発動した場合、`[skip-secrets-check]` bypass をユーザーに案内してください。
- **フック一覧（MVP）**:
  - **A** `aphelion-secrets-precommit.sh` — `PreToolUse Bash(git commit*)` — ステージ差分を 8 つのシークレットパターン（P1〜P8）でスキャン；マッチ時は exit 2。bypass: コミットメッセージに `[skip-secrets-check]` を追加。
  - **B** `aphelion-sensitive-file-guard.sh` — `PreToolUse Write|Edit` — 慣習的なシークレットファイル名（`.env*`・`*.pem`・`*.key` 等）への書き込みをブロック。`tests/`・`fixtures/` ディレクトリや `.example`/`.template`/`.sample`/`.dist` サフィックスは許可。bypass マーカーなし — 無効化には `settings.json` 編集が必要。
  - **E** `aphelion-deps-postinstall.sh` — `PostToolUse Bash(npm install*|uv add*|pip install*|cargo add*|go get*)` — 非ブロッキングの勧告のみ；依存関係変更後に `/vuln-scan` を推奨。
- **フェイルセーフ**: 全フックは `trap ERR → exit 0` でラップされており、スクリプト内部エラーがユーザーの作業を止めることはありません（フェイルオープン設計）。
- **配布**: `src/.claude/hooks/`（正規）から `npx aphelion-agents init/update` で配布。`settings.json` は init 後は保護される（ユーザーのカスタマイズを保持）；`hooks/` スクリプトは毎回 update で上書きコピーされます。
- **概要**: Aphelion の MVP 3 フックが積極的なコンテンツスキャン層として機能することを定めます。エージェントは bypass ルール（フック A: `[skip-secrets-check]`；フック B: bypass なし・`settings.json` 編集が必要；フック E: bypass 不要）を知っておく必要があります。全フックはフェイルオープン設計です。正規パターンライブラリ（`secret-patterns.sh`・ID P1〜P8）はフック A と `/secrets-scan` slash command が共有する単一の信頼ソースです。

---

## language-rules

- **正規**: [.claude/rules/language-rules.md](../../.claude/rules/language-rules.md)
- **スコープ**: テキスト出力を生成する全エージェント
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: すべての出力タイプの言語を設定します。`agent-communication-protocol`と連携します（AGENT_RESULTのキー/値は英語でなければならない）。`user-questions`の全ユーザー向けコンテンツに適用されます。
- **概要**: 各出力タイプに使用する言語を定義します：コード/変数名/コミットメッセージは英語；エージェント定義ファイル/ルール/ガイドラインは英語；コードコメント/ユーザー向けドキュメント/ユーザーへのレポートは日本語；AGENT_RESULTブロックのキー/値は英語；ユーザー向けCLI出力（AskUserQuestionの内容、承認ゲート、進捗表示）は日本語。
- **Hand-authored canonical narrative (§5)**: Aphelion 自身の hand-authored ドキュメントを対象とした、ディレクトリ別の正規言語宣言（agent-emitted テンプレートとは別系統）。`docs/wiki/{en,ja}/*.md` は英語正規のバイリンガルで、スケルトン見出し（`## Related Pages`、`> Last updated:` など）は両言語ファイルとも英語固定。`docs/design-notes/<slug>.md` と `docs/design-notes/archived/<slug>.md` は単一ファイルで、正規言語は `project-rules.md` → `Output Language` に従う（バイリンガル同期なし）。`README.md` / `README.ja.md` は英語正規のバイリンガルで、リポジトリルートの README 同期規約に従う（Contributing.md 管轄ではない）。スコープ外: `CHANGELOG.md`（リリースノート慣習で英語）、`Home.md` のペルソナ/用語集ブロック（英語の固有名詞を含むナラティブとして扱う）。
- **Repo-root README sync convention**: `README.md` ↔ `README.ja.md` の同期に関する権威ある書面規約は、`language-rules.md` の "Hand-authored canonical narrative" セクション直下の "Repo-root README sync convention" sub-section に記載されています。カバー内容：§3.1 英語正規（#75 で確定）；§3.2 同一 PR 必須の同期ルール（typo/broken-link 修正に限り 7 日 follow-up 例外あり）；§3.3 `^## ` 見出し数 + 行位置の一致を `scripts/check-readme-wiki-sync.sh` Check 3 で機械的に強制；§3.4 `> EN canonical:` 日付マーカーは README.ja.md には**導入しない**（Same-PR ルール + Check 3 で代替できるため冗長、かつランディングページへの視覚的ノイズを避ける意図的な判断）。全文は `language-rules.md` §"Repo-root README sync convention" を参照。(#82)

---

## library-and-security-policy

- **正規**: [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md)
- **スコープ**: `architect`（ライブラリ選択）、`developer`（ライブラリ採用）、`security-auditor`（脆弱性スキャン）。**`security-auditor`の必須実行ルールは全プランに適用。**
- **自動ロードの動作**: Claude Codeが全セッション起動時に自動ロード
- **インタラクション**: `architect`はARCHITECTURE.mdに採用根拠とともに選択したライブラリを記録します。`developer`はARCHITECTURE.mdに従いますが、必要に応じてライブラリを追加できます（まず採用基準を検証しなければならない）。`security-auditor`は依存関係スキャンによって最終検証を実施します。security-auditorの必須実行ルールはトリアージの決定を上書きします — Minimalプランでも実行されます。
- **概要**: ライブラリに関する3つの核心原則：標準ライブラリを優先、車輪の再発明を避ける、依存関係を最小化。採用基準：アクティブにメンテナンスされている、広く採用されている、既知のCVEなし、ライセンス互換性あり、適切な依存関係の深さ。責任分担：architectが選択、developerが追従・拡張、security-auditorがスキャン。**必須ルール**：`security-auditor`はMinimalを含む全Deliveryプランで実行しなければなりません。OWASP Top 10、依存関係の脆弱性、認証ギャップ、ハードコードされたシークレット、入力バリデーション、CWEチェックリストをカバーします。

---

## localization-dictionary

- **正規**: [.claude/rules/localization-dictionary.md](../../.claude/rules/localization-dictionary.md)
- **スコープ**: 固定 UI 文字列（承認ゲート、AskUserQuestion ボイラープレート、進捗表示、"Phase N complete" ヘッダーなど）を出力する全エージェント
- **自動ロードの動作**: Claude Code が全セッション起動時に自動ロード
- **インタラクション**: 実行時に `project-rules.md` → `## Localization` → `Output Language` に対して解決します。`language-rules.md` のハイブリッドローカライゼーション戦略と連携します：辞書エントリは固定 UI 文字列をカバーし、自由形式のナラティブはエージェントが解決済み言語で直接生成します。
- **概要**: 3 つのセクション（Approval Gate / AskUserQuestion Fallback / Progress Display）に整理された固定 UI 文字列の en/ja 正規訳語を提供します。テンプレートプレースホルダー（`{N}`、`{M}`、`{agent}`）はレンダリング時に置換されます。また、Aphelion 自身の JA wiki/README で使用される散文用語については、実行時 UI 文字列とは別に `docs/design-notes/archived/ja-terminology-rebalance.md` を参照するよう案内します。

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

## denial-categories

- **正規**: [.claude/rules/denial-categories.md](../../.claude/rules/denial-categories.md)
- **スコープ**: `Bash` ツールを持つ全エージェント (`sandbox-policy.md` と同じ集合)、加えて issue triage 用の `analyst`
- **自動ロードの動作**: Claude Code が全セッション起動時に自動ロード
- **インタラクション**: `sandbox-policy.md` のコンパニオンルールです。`sandbox-policy.md` は実行**前**の予防 (コマンドのカテゴリ分類と `sandbox-runner` への委譲) を扱うのに対し、本ルールは実行**後**の診断 (どの種類の拒否が起きたかを分類して適切なリカバリーを選ぶ) を扱います。13 の Bash 所有エージェントが両ルールを参照します。
- **カテゴリ (§1)**: 4 種類の拒否カテゴリと、それぞれの検出パターン・推奨アクション:
  - `sandbox_policy` — `.claude/settings.local.json` の `deny` エントリにマッチ。リカバリ: `AskUserQuestion` で意図確認 → なお拒否される場合は手動 `!cmd` フォールバック。
  - `os_permission` — POSIX `EACCES`/`EPERM`。リカバリ: `ls -la` で所有者を特定し、`root` 所有なら `sudo chown -R $USER {path}` を推奨。
  - `file_not_found` — `ENOENT`。リカバリ: `ls` でパスを再確認。
  - `platform_heuristic` — Claude Code auto-mode の拒否 (sub-agent 境界、branch protection、"External System Write" など)。リカバリ: 正直にユーザーに報告。`settings.local.json` では制御不能。
- **手動 `!cmd` フォールバック (§3)**: `AskUserQuestion` 承認後も sandbox が拒否し続ける場合 (PR #29 cleanup, 2026-04-24 で確認)、エージェントは中断し、実行すべきコマンドを表示します。ユーザーがチャット入力に `!cmd` を貼り付けてエージェントの sandbox を迂回します。エージェントは再度 `AskUserQuestion` をループしてはいけません。
- **AGENT_RESULT 拡張 (§4)**: 拒否によりエージェントが停止した場合、標準 `AGENT_RESULT` ブロックに `DENIAL_CATEGORY`、`DENIAL_COMMAND`、`DENIAL_RECOVERY` の 3 フィールドを追加します。
- **概要**: Bash 所有エージェントにコマンド失敗の診断のための共通語彙と判定フローを提供します。「同じコマンドを再試行」「失敗するたびに `AskUserQuestion`」というパターンを、カテゴリに応じた適切な次の手段 (sandbox 承認 vs `chown` vs パス修正 vs 正直なエスカレーション) に置き換えます。

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

- [.claude/rules/](../../.claude/rules/) — 13 のルールファイル全体（権威あるソース）
- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — ワークフロー概要（rules コレクションの一部に統合）
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — `agent-communication-protocol` に依存する Flow Orchestrator の動作
- [Hooks Reference](./Hooks-Reference.md) — フックセットのユーザー向けガイド
