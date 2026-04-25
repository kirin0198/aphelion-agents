# ISSUE: Add sandbox capability (sandbox-runner agent + sandbox-policy rule + platform guide)

> 最終更新: 2026-04-18
> 更新履歴:
>   - 2026-04-18: 初版作成（analyst 分析結果および承認済み方針の記録）
>   - 2026-04-18: Addendum 追記 — 案 5 (infra-builder 拡張による devcontainer 生成) を後追い採用

---

## 1. ユーザー要件

Aphelion のエージェント群 (`developer`, `tester`, `poc-engineer`, `infra-builder`, `scaffolder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`, `observability` など) は Bash ツールを通じて任意のコマンドをユーザー環境で直接実行する。このため以下のリスクがある。

- **意図しない破壊的操作**: `rm -rf`、本番 DB への書き込み、ネットワーク越しのリソース変更など
- **秘密情報の流出**: `.env` や認証情報の不用意な読み出し・送信
- **環境汚染**: グローバルインストール、権限変更、常駐プロセスの副作用

Claude Code には permission mode などの実行制御機構があり、GitHub Copilot / OpenAI Codex にもプラットフォーム固有の安全機構が存在する。これらを Aphelion のエージェントから**体系的に利用するためのガイドラインと専用エージェントが不足**している。

---

## 2. Issue 分類

| 項目 | 内容 |
|------|------|
| 種別 | **機能追加（ワークフロー安全性強化）** |
| GitHub ラベル | `enhancement` |
| 影響範囲 | `.claude/agents/` に 1 件新設、`.claude/rules/` に 1 件新設、`docs/wiki/*/Platform-Guide.md` に節追加、既存エージェント / ルール / wiki 参照の追記 |
| 既存ドキュメントへの影響 | SPEC.md / ARCHITECTURE.md は変更なし（Aphelion はエージェント定義集であり UC を持たない）。README は現状維持 |

---

## 3. 現状分析 — 5 つの解釈案から 3 案採用の理由

前回 analyst セッション（agentId: `a0a7d059d1d54fd67`）では「sandbox 化」の解釈として 5 案を提示し、ユーザーの承認により **案1・案2・案4** の 3 案を採用した。

| # | 案 | 採否 | 理由 |
|---|---|------|------|
| 1 | **sandbox-runner エージェント新設**（27 番目） | **採用** | 「危険度高」と判断されたコマンドを委譲できる専用窓口を作ることで、既存エージェントの責務分離を保ったまま隔離実行を差し込める。ランタイム志向寄りになる性質変化はユーザー受容済み |
| 2 | **`.claude/rules/sandbox-policy.md` ルール新設** | **採用** | Bash を持つ全エージェントに横断で適用する方針を 1 箇所に集約できる。自動ロードにより既存エージェント定義の大規模改修を避けられる |
| 3 | Docker / nsjail / firejail など具体的な隔離技術を既定化 | 不採用 | プラットフォーム（Claude Code / Copilot / Codex）ごとに利用可能な隔離機構が異なり、特定技術に縛ると移植性を失う。**プラットフォーム機能優先**の方針に反する |
| 4 | **Claude Code 機能活用ガイド整備**（permission mode 等） | **採用** | 既存機構を正しく使うことが第一優先。docs/wiki/Platform-Guide.md に節を追加して比較表と運用手順を明文化する |
| 5 | 既存エージェント全件を一斉改訂して Bash 実行前にチェック処理を埋め込む | 不採用 | 26 エージェント全件の改訂はコスト過大かつ保守性が悪い。案 2 のルール自動ロード + 案 1 の委譲で同等の効果を得られる |

**プラットフォームスコープ**: 今回は Claude Code を先行対象とし、Copilot / Codex 対応は後続 issue として分離する。

---

## 4. 決定事項（承認済み）

| # | 決定項目 | 内容 |
|---|---------|------|
| 1 | 新設エージェント | `sandbox-runner` を `.claude/agents/sandbox-runner.md` に追加（27 番目のエージェント） |
| 2 | 新設ルール | `.claude/rules/sandbox-policy.md` を追加（Bash を持つ全エージェントに横断適用） |
| 3 | 既定の隔離技術 | **プラットフォーム機能優先**。Claude Code の permission mode など既存機構を正しく使うことを推奨し、Docker など特定技術には縛らない |
| 4 | 先行プラットフォーム | **Claude Code**。Copilot / Codex は後続 issue |
| 5 | Aphelion の性質変化 | 案 1 採用によりランタイム志向寄りになる点をユーザーは受容 |
| 6 | SPEC.md / ARCHITECTURE.md | 新規作成せず（Aphelion はエージェント定義集であり UC を持たない） |
| 7 | PR 作成 | 本 analyst セッションでは作成しない（ブランチ作成・ISSUE 作成・GitHub Issue 作成・コミット＆プッシュまで） |

---

## 5. 成果物の内訳（3 つ）

### 5.1 案 1: `sandbox-runner` エージェント定義

- **パス**: `.claude/agents/sandbox-runner.md`
- **位置づけ**: Standalone カテゴリ（`delivery-flow` / `operations-flow` から委譲される補助エージェント）
- **責務**: 隔離環境でのコマンド実行代行、危険コマンド検知、実行ログの返却
- **Inputs**: コマンド文字列、ワーキングディレクトリ、タイムアウト、期待するリソース範囲
- **Outputs**: stdout / stderr / exit_code / 実行時間 / 観測されたリソース使用量
- **起動条件（案）**:
  - `developer` / `tester` / `poc-engineer` / `infra-builder` など Bash を使うエージェントが「危険度高」と判断したタスクで明示委譲
  - もしくはオーケストレーター（`delivery-flow` / `operations-flow`）が `sandbox-policy.md` の判定結果をもとに自動挿入
- **AGENT_RESULT スキーマ**: 他エージェントと同様 `STATUS` / `NEXT` を持ち、加えて `SANDBOX_MODE` / `DETECTED_RISKS` / `EXIT_CODE` 等を含める

### 5.2 案 2: `sandbox-policy.md` ルール定義

- **パス**: `.claude/rules/sandbox-policy.md`
- **自動ロード**: `.claude/rules/` 配下のため既存機構で自動ロードされる
- **スコープ**: Bash を持つ全エージェント
  - `developer`, `tester`, `poc-engineer`, `scaffolder`, `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`, `observability`
- **定義内容**:
  - 危険コマンドの分類（破壊的 FS 操作 / 本番 DB 接続 / 外部ネットワーク / 権限昇格 / 秘密情報参照）
  - 隔離モード選択基準（プラットフォーム機能優先を前提）
  - `sandbox-runner` への委譲条件（どのカテゴリのコマンドで必須か、推奨か）
  - ユーザー確認を要する操作のしきい値

### 5.3 案 4: Platform Guide 拡張と参照整備

- **Platform-Guide.md への追加節**:
  - `docs/wiki/en/Platform-Guide.md` と `docs/wiki/ja/Platform-Guide.md` に「Sandbox & Permission Modes」節を追加
  - Claude Code の permission mode 使い方（`allow` / `ask` / `deny` の具体例）
  - プラットフォーム別 sandbox 機能比較表（Claude Code / Copilot / Codex）
  - Aphelion エージェントを安全に走らせるための運用パターン
- **既存ドキュメントからの参照追記**:
  - `sandbox-policy.md` を対象エージェント各ファイルから 1 行参照（Auto-load なので詳細記述は不要）
  - `.claude/orchestrator-rules.md` に `sandbox-runner` の扱いを追記（委譲フロー、triage プランでの扱い）
  - `docs/wiki/en/Agents-Reference.md` / `docs/wiki/ja/Agents-Reference.md` に `sandbox-runner` 節を追加（Standalone セクションまたは新カテゴリ「Safety」）
  - `docs/wiki/en/Rules-Reference.md` / `docs/wiki/ja/Rules-Reference.md` に `sandbox-policy` 節を追加

---

## 6. 今回のスコープ外

| 項目 | 実施しない理由 |
|------|-------------|
| Copilot / Codex 向け sandbox 対応 | 先行プラットフォームは Claude Code。別 issue として分離する |
| Docker / nsjail / firejail 等の具体的な隔離技術の既定化 | **プラットフォーム機能優先**の方針に反するため、具体技術への束縛は行わない |
| SPEC.md / ARCHITECTURE.md の新規作成 | Aphelion はエージェント定義集であり UC を持たない。ワークフロー運用ルールの追加のみ |
| エージェント本体（sandbox-runner.md）の執筆 | architect による骨格設計の後に developer が執筆する |
| `sandbox-policy.md` 本文の執筆 | 同上（architect → developer） |
| PR 作成 | 本 analyst セッションではブランチとコミット／プッシュまで。PR は architect または developer の成果物確定後に作成 |

---

## 7. architect へのブリーフ

architect は本 ISSUE を入力として、**Aphelion のエージェント定義集という性質を維持したまま** sandbox 機構を追加する設計を行うこと。具体的には以下の項目を決定してほしい。

### 7.1 `sandbox-runner` エージェント定義の骨格

- **責務**: 隔離環境でのコマンド実行代行、危険コマンド検知、ログ返却
- **起動条件（設計で確定すべき項目）**:
  - developer / tester / poc-engineer / infra-builder 等の Bash 使用エージェントが「危険度高」と判断したタスクで明示委譲するか
  - もしくはオーケストレーターが `sandbox-policy.md` の判定結果に基づいて自動挿入するか
  - 両立させる場合の優先順位
- **Inputs（スキーマ確定）**: コマンド文字列、ワーキングディレクトリ、タイムアウト、許容リソース
- **Outputs（スキーマ確定）**: stdout / stderr / exit_code / resource_usage / detected_risks
- **AGENT_RESULT フィールド**: `STATUS`, `SANDBOX_MODE`, `EXIT_CODE`, `DETECTED_RISKS`, `NEXT` など
- **Triage プランでの扱い**: Minimal / Light / Standard / Full それぞれで sandbox-runner をどう配置するか
  - 例: Minimal では省略、Light 以上で自動委譲、Standard / Full では必須 など

### 7.2 `sandbox-policy.md` ルールの骨格

- **スコープ**: Bash を持つ全エージェント（§5.2 のリスト参照）
- **危険コマンドの分類**:
  - 破壊的 FS 操作（`rm -rf`, `mkfs`, `dd` 等）
  - 本番 DB 接続（環境変数・接続文字列の検知）
  - 外部ネットワーク呼び出し（`curl`, `wget`, `ssh` など）
  - 権限昇格（`sudo`, `chmod 777` 等）
  - 秘密情報参照（`.env`, `credentials.*`, `*.secret`）
- **隔離モード選択基準**: プラットフォーム機能優先を前提としつつ、各分類でどのモードを使うかの決定木
- **`sandbox-runner` への委譲条件**: 必須・推奨・任意の 3 段階
- **Auto-load behavior**: `.claude/rules/` の既存自動ロードに準拠

### 7.3 `docs/wiki/*/Platform-Guide.md` の拡張内容

- **Claude Code permission mode の使い方**: `allow` / `ask` / `deny` の具体例、設定の保存先、セッション単位での上書き
- **プラットフォーム比較表**: Claude Code / Copilot / Codex の sandbox 機能有無と代替策
- **運用パターン**: Aphelion のエージェントを安全に走らせる推奨プロファイル（開発環境 / CI / 本番近傍）

### 7.4 既存エージェント / ルールへの参照追記

- **各対象エージェント** (`developer`, `tester`, `poc-engineer`, `scaffolder`, `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`, `observability`): `sandbox-policy.md` を 1 行で参照
- **`.claude/orchestrator-rules.md`**: `sandbox-runner` の扱いを追記（委譲フロー、triage プランでの配置）
- **`docs/wiki/en/Agents-Reference.md` / `docs/wiki/ja/Agents-Reference.md`**: `sandbox-runner` 節を追加（Standalone もしくは新カテゴリ「Safety」）
- **`docs/wiki/en/Rules-Reference.md` / `docs/wiki/ja/Rules-Reference.md`**: `sandbox-policy` 節を追加

### 7.5 出力物

architect は以下を推奨する（軽量方針）:

- 推奨: 本 ISSUE 末尾または `docs/issues/sandbox-design.md` に設計メモを追加
- SPEC.md / ARCHITECTURE.md の新規作成は不要

---

## 8. GitHub Issue / PR

- GitHub Issue: 本 analyst セッションで `gh issue create` により作成する
  - title: `Add sandbox capability (sandbox-runner agent + sandbox-policy rule + platform guide)`
  - label: `enhancement`（存在しないラベルは省略）
- 作業ブランチ: `feat/add-sandbox`（main から分岐）
- PR: **本 analyst セッションでは作成しない**。ISSUE 文書のコミット＆プッシュまで

---

## 9. 次アクション

- 次エージェント: **architect**
- architect は本 ISSUE の §7 をインプットとして sandbox 機構の設計メモを作成する
- その後、developer が以下を順次作成する:
  1. `.claude/agents/sandbox-runner.md`
  2. `.claude/rules/sandbox-policy.md`
  3. `docs/wiki/en/Platform-Guide.md` / `docs/wiki/ja/Platform-Guide.md` への節追加
  4. 既存エージェント / ルール / wiki への参照追記

---

## Addendum (2026-04-18): Case 5 adoption — infra-builder 拡張による devcontainer 生成

### A.1 背景と経緯

PR #7（ブランチ `feat/add-sandbox`）のレビュー中、ユーザーから次の指摘があった。

> 現状の `sandbox-policy` は **advisory にすぎず**、Claude Code の permission mode が `auto` や `allow` 相当で動作している場合、`required` カテゴリに該当するコマンドでも警告だけ出して**素通り**してしまう。案 1〜4 だけでは「ポリシーを宣言しているが、実体的な隔離境界は存在しない」状態であり、実行環境の汚染・破壊・秘密情報流出のリスクが残る。

この指摘を受け、当初 §3 の比較表で不採用とした **案 5 相当の隔離手段** を、`infra-builder` の責務拡張というかたちで**後追い採用**する。案 3（Docker / nsjail / firejail を既定化）に直行せず、infra-builder が**プロジェクト単位で devcontainer / docker-compose.dev.yml を生成する**形で実体化することで、「プラットフォーム機能優先」の原則を壊さずに実体的な隔離を追加する。

> ※ `§3` の表で「案 5」は別内容（既存エージェント一斉改訂）として既に不採用とされているが、本 Addendum で採用する「案 5 (infra-builder 拡張)」はレビュー中に新たに定義された **別系統の案** である。混同を避けるため、以後は「案 5 (infra-builder 拡張)」と明示表記する。

### A.2 採用理由

| # | 観点 | 内容 |
|---|------|------|
| 1 | advisory 限界の解消 | Claude Code の permission mode 設定に依存せず、実行環境そのものを分離できる |
| 2 | プラットフォーム機能優先との両立 | devcontainer は標準仕様 (VS Code / GitHub Codespaces / Docker) であり、特定ベンダ隔離技術への束縛ではない |
| 3 | 既存責務との親和性 | infra-builder はもともと Dockerfile 等の本番用 infra を生成する責務を持つため、開発用 sandbox infra も同一エージェントに寄せると保守性が高い |
| 4 | triage プラン適応 | Minimal / Light では生成をスキップし、Standard / Full で必須化するなど段階的に導入できる |

### A.3 スコープ追加項目

本 Addendum で追加するスコープは以下 3 項目のみとする（本番 infra への波及、他プラットフォーム対応は含めない）。

1. **infra-builder 拡張（新責務）**
   - `.devcontainer/devcontainer.json` の生成責務を追加
   - `docker-compose.dev.yml`（開発用・sandbox 用途）の生成責務を追加
   - 本番用 infra (`Dockerfile`, CI/CD) とは**成果物を明確に分離**する
2. **sandbox-policy.md §3 (Isolation Mode Decision Tree) の更新**
   - `claude_code` プラットフォーム分岐の下に「devcontainer 内実行（container isolation）」選択肢を追加
   - `required` カテゴリは devcontainer 利用可能時に自動で container isolation を優先
   - §4 (Sandbox Modes) に `container` モードを追加
3. **sandbox-runner の実行経路優先順位更新**
   - devcontainer / docker-compose が利用可能な場合、**Docker 経由実行を最優先**とする
   - 利用不可なら既存の `platform_permission` にフォールバック

### A.4 今回のスコープ外（Addendum）

| 項目 | 理由 |
|------|------|
| 本番 infra（`Dockerfile`, CI/CD パイプライン）への影響 | 本 Addendum は **開発用 sandbox** の範囲。本番 infra 変更は別 issue |
| `platforms/copilot/` / `platforms/codex/` の再生成 | 先行プラットフォームは Claude Code。他プラットフォームは後続 issue |
| devcontainer 内で使用する具体的なベースイメージ・拡張機能の策定 | architect / developer が設計・実装時に決定 |
| 既存プロジェクトへの devcontainer 後付けマイグレーション | 今回は新規生成のみ対象 |

### A.5 architect が決定すべき論点（追加）

architect は本 Addendum を受けて、`docs/issues/sandbox-design.md` に Addendum 節を追加し、**最低限以下の論点**を明示的に決定すること。

1. **isolation mode への `container` 追加**
   - `sandbox-policy.md` §4 (Sandbox Modes) に `container` を正式追加するか
   - `platform_permission` と `container` の優先順位（同時利用可能時にどちらを使うか）
   - フォールバック順: `container` → `platform_permission` → `advisory_only` → `blocked` の妥当性

2. **triage プラン別の devcontainer 生成可否**
   - `Minimal` では devcontainer 生成を**スキップ**（advisory のみ）で良いか
   - `Light` では生成するが任意起動に留めるか
   - `Standard` / `Full` で生成＋必須起動とするかの線引き
   - §5 の表に「devcontainer 生成」列を追加する案

3. **infra-builder の責務境界（本番 infra vs 開発用 sandbox）**
   - 本番 infra 成果物と sandbox infra 成果物の**ディレクトリ分離規則**（例: `infra/prod/` と `.devcontainer/` / `docker-compose.dev.yml`）
   - 命名規則と参照方向（sandbox は prod を参照してよいか、その逆は禁止か）
   - `infra-builder` の AGENT_RESULT スキーマに追加するフィールド（例: `DEVCONTAINER_GENERATED`, `DEV_COMPOSE_GENERATED`）

4. **sandbox-runner の実行経路選択ロジック**
   - devcontainer 検出方法（`.devcontainer/devcontainer.json` の存在 / Docker daemon 生存確認）
   - Docker 経由実行時の入出力マッピング（作業ディレクトリのマウント範囲、ネットワーク分離の既定）
   - Docker 利用不可時のフォールバック挙動と AGENT_RESULT への記録方法

### A.6 作業方針

- **ブランチ**: 新ブランチは作らず、既存 `feat/add-sandbox` にコミット追加で対応する
- **PR**: PR #7 を閉じずに同ブランチに追記コミットを push する
- **コード変更**: 本 Addendum では **ドキュメント追記のみ**。`.claude/`, `docs/wiki/`, `scripts/` への変更は architect / developer フェーズで行う
- **GitHub Issue**: Issue #6 に `gh issue comment` でコメント追加し、Addendum の事実を記録する
