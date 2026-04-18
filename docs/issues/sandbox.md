# ISSUE: Add sandbox capability (sandbox-runner agent + sandbox-policy rule + platform guide)

> 最終更新: 2026-04-18
> 更新履歴:
>   - 2026-04-18: 初版作成（analyst 分析結果および承認済み方針の記録）

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
| 影響範囲 | `.claude/agents/` に 1 件新設、`.claude/rules/` に 1 件新設、`wiki/*/Platform-Guide.md` に節追加、既存エージェント / ルール / wiki 参照の追記 |
| 既存ドキュメントへの影響 | SPEC.md / ARCHITECTURE.md は変更なし（Aphelion はエージェント定義集であり UC を持たない）。README は現状維持 |

---

## 3. 現状分析 — 5 つの解釈案から 3 案採用の理由

前回 analyst セッション（agentId: `a0a7d059d1d54fd67`）では「sandbox 化」の解釈として 5 案を提示し、ユーザーの承認により **案1・案2・案4** の 3 案を採用した。

| # | 案 | 採否 | 理由 |
|---|---|------|------|
| 1 | **sandbox-runner エージェント新設**（27 番目） | **採用** | 「危険度高」と判断されたコマンドを委譲できる専用窓口を作ることで、既存エージェントの責務分離を保ったまま隔離実行を差し込める。ランタイム志向寄りになる性質変化はユーザー受容済み |
| 2 | **`.claude/rules/sandbox-policy.md` ルール新設** | **採用** | Bash を持つ全エージェントに横断で適用する方針を 1 箇所に集約できる。自動ロードにより既存エージェント定義の大規模改修を避けられる |
| 3 | Docker / nsjail / firejail など具体的な隔離技術を既定化 | 不採用 | プラットフォーム（Claude Code / Copilot / Codex）ごとに利用可能な隔離機構が異なり、特定技術に縛ると移植性を失う。**プラットフォーム機能優先**の方針に反する |
| 4 | **Claude Code 機能活用ガイド整備**（permission mode 等） | **採用** | 既存機構を正しく使うことが第一優先。wiki/Platform-Guide.md に節を追加して比較表と運用手順を明文化する |
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
  - `wiki/en/Platform-Guide.md` と `wiki/ja/Platform-Guide.md` に「Sandbox & Permission Modes」節を追加
  - Claude Code の permission mode 使い方（`allow` / `ask` / `deny` の具体例）
  - プラットフォーム別 sandbox 機能比較表（Claude Code / Copilot / Codex）
  - Aphelion エージェントを安全に走らせるための運用パターン
- **既存ドキュメントからの参照追記**:
  - `sandbox-policy.md` を対象エージェント各ファイルから 1 行参照（Auto-load なので詳細記述は不要）
  - `.claude/orchestrator-rules.md` に `sandbox-runner` の扱いを追記（委譲フロー、triage プランでの扱い）
  - `wiki/en/Agents-Reference.md` / `wiki/ja/Agents-Reference.md` に `sandbox-runner` 節を追加（Standalone セクションまたは新カテゴリ「Safety」）
  - `wiki/en/Rules-Reference.md` / `wiki/ja/Rules-Reference.md` に `sandbox-policy` 節を追加

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

### 7.3 `wiki/*/Platform-Guide.md` の拡張内容

- **Claude Code permission mode の使い方**: `allow` / `ask` / `deny` の具体例、設定の保存先、セッション単位での上書き
- **プラットフォーム比較表**: Claude Code / Copilot / Codex の sandbox 機能有無と代替策
- **運用パターン**: Aphelion のエージェントを安全に走らせる推奨プロファイル（開発環境 / CI / 本番近傍）

### 7.4 既存エージェント / ルールへの参照追記

- **各対象エージェント** (`developer`, `tester`, `poc-engineer`, `scaffolder`, `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`, `observability`): `sandbox-policy.md` を 1 行で参照
- **`.claude/orchestrator-rules.md`**: `sandbox-runner` の扱いを追記（委譲フロー、triage プランでの配置）
- **`wiki/en/Agents-Reference.md` / `wiki/ja/Agents-Reference.md`**: `sandbox-runner` 節を追加（Standalone もしくは新カテゴリ「Safety」）
- **`wiki/en/Rules-Reference.md` / `wiki/ja/Rules-Reference.md`**: `sandbox-policy` 節を追加

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
  3. `wiki/en/Platform-Guide.md` / `wiki/ja/Platform-Guide.md` への節追加
  4. 既存エージェント / ルール / wiki への参照追記
