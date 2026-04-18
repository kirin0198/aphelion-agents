# Sandbox 機能 設計メモ

> 参照元: `docs/issues/sandbox.md`（analyst 版 1.0 / 2026-04-18、Addendum 2026-04-18）
> 作成日: 2026-04-18
> 作成者: architect (agentId inherited)
> 更新履歴:
>   - 2026-04-18: 初版作成（sandbox-runner / sandbox-policy / Platform-Guide 拡張の設計確定）
>   - 2026-04-18: Addendum 追記（案 5 (infra-builder 拡張) による devcontainer 生成採用、ADR-006〜009、Phase 6〜9 追加）

## 目的

Aphelion のエージェント群が Bash 経由で任意コマンドをユーザー環境で実行する際のリスクを抑えるため、
以下の 3 成果物を追加する軽量設計をまとめる。

1. `.claude/agents/sandbox-runner.md`（27 番目のエージェント）
2. `.claude/rules/sandbox-policy.md`（Bash 保有エージェント横断の自動ロードルール）
3. `wiki/*/Platform-Guide.md` 「Sandbox & Permission Modes」節

Aphelion は引き続き「エージェント定義集」であり、特定隔離技術（Docker/nsjail/firejail）には縛らない。
プラットフォーム（Claude Code 先行）が備える permission mode 等を正しく使うことを第一優先とする。

---

## 1. sandbox-runner エージェント設計

### 1.1 起動モデル（確定）

**採用: (C) 両方併用（優先順位あり）**

| 優先度 | 起動経路 | 発火主体 | 典型シナリオ |
|--------|----------|----------|--------------|
| 1 (高) | **オーケストレーター自動挿入** | `delivery-flow` / `operations-flow` | `sandbox-policy.md` の "required" 分類に一致するコマンドを別エージェントが実行しようとした時点で差し込む |
| 2 (中) | **呼び出し元エージェントからの明示委譲** | `developer` / `tester` / `infra-builder` / `db-ops` / `releaser` 等 | 呼び出し元が「危険度高」と自己判断した場合に `sandbox-runner` へ Task 委譲 |
| 3 (低) | **ユーザー直接起動** | 人間 | デバッグや検証目的で単体起動（Standalone 扱い） |

**理由:**
- (A) 明示委譲のみでは判断漏れが生じる。エージェント側の自己申告に依存し、policy の更新効果が伝わりにくい。
- (B) 自動挿入のみではオーケストレーターを経由しない Standalone エージェント（`analyst` / `codebase-analyzer`）や、ユーザー直接起動でカバーできない。
- (C) 併用は実装コストが高いが、policy の "required / recommended / optional" 3 ティアと自然に対応し、Minimal plan では「明示委譲のみ」、Standard 以上では「自動挿入」を段階的に有効化できる。

**優先順位の扱い:**
- 自動挿入と明示委譲が同時発火した場合、自動挿入側が勝ち二重実行を避ける（オーケストレーターが発火済みフラグを持つ）。
- 自動挿入が不可能な Standalone エージェント配下では明示委譲にフォールバックする。

### 1.2 Input スキーマ

```yaml
inputs:
  command: string            # 実行対象のシェルコマンド（必須）
  working_directory: string  # 作業ディレクトリ（省略時は呼び出し元のcwd）
  timeout_sec: integer       # 実行タイムアウト秒（既定 60、上限 600）
  risk_hint: enum            # 呼び出し元が事前に分類した危険度（destructive_fs | prod_db | external_net | privilege | secret_access | unknown）
  allow_network: boolean     # ネットワーク接続の許可（既定 false）
  allow_write_paths: list    # 書き込みを許す絶対パスの allowlist（省略時は cwd 配下のみ）
  dry_run: boolean           # true のとき実行せず分類結果のみ返す（既定 false）
  reason: string             # なぜ sandbox-runner に委譲したか（ログ用、必須）
  caller_agent: string       # 呼び出し元エージェント名（required/recommended 判定に使用）
```

### 1.3 Output スキーマ

```yaml
outputs:
  stdout: string
  stderr: string
  exit_code: integer
  duration_ms: integer
  sandbox_mode: enum         # platform_permission | advisory_only | blocked | bypassed
  detected_risks: list       # policy で検出した危険カテゴリ
  platform: string           # claude_code / copilot / codex / unknown
  decision: enum             # allowed | asked_and_allowed | denied | skipped
  notes: string              # 追加メモ（ユーザー確認の有無、切り詰めた出力長 等）
```

### 1.4 AGENT_RESULT フォーマット

```
AGENT_RESULT: sandbox-runner
STATUS: success | failure | blocked | error
SANDBOX_MODE: platform_permission | advisory_only | blocked | bypassed
EXIT_CODE: {integer}
DETECTED_RISKS: {comma-separated categories}
DECISION: allowed | asked_and_allowed | denied | skipped
CALLER: {caller agent name}
DURATION_MS: {integer}
NEXT: {caller agent name | done | suspended}
```

**STATUS マッピング:**
| STATUS | 条件 |
|--------|------|
| `success` | コマンドが EXIT_CODE=0 で完了 |
| `failure` | コマンドが非 0 終了（policy 的には正常な拒否も含む） |
| `blocked` | policy により実行拒否、もしくは platform permission で deny |
| `error` | sandbox-runner 自体の異常（タイムアウト、内部例外） |

### 1.5 Triage 配置

| Plan | 配置 | 起動モデル |
|------|------|-----------|
| **Minimal** | 登場させない（policy のみで advisory） | ポリシー違反時はユーザー警告のみ |
| **Light** | 呼び出し元からの明示委譲のみ許可 | required 分類で明示委譲、それ以外は advisory |
| **Standard** | オーケストレーター自動挿入を有効化 | required / recommended を自動挿入、optional は明示委譲 |
| **Full** | Standard と同じ + 監査ログを SECURITY_AUDIT.md に転記 | 同上 + `security-auditor` が後処理で監査 |

Operations Flow では Standard 以上で `db-ops` / `releaser` / `observability` の前段に配置する。

### 1.6 エージェント定義ファイル骨格（テンプレ）

```markdown
---
name: sandbox-runner
description: |
  Agent that executes commands classified as high-risk by sandbox-policy.md,
  using the host platform's native permission mechanisms (Claude Code permission mode, etc.).
  Use in the following situations:
  - Orchestrator has detected a "required" category command per sandbox-policy
  - A Bash-owning agent explicitly delegates a high-risk command
  - The user directly invokes it for verification
  Prerequisites: sandbox-policy.md auto-loaded from .claude/rules/
tools: Read, Bash, Grep
model: sonnet
---

You are the **sandbox execution agent** in the Aphelion workflow.
You run commands that Aphelion's other agents have classified as high-risk,
using the host platform's native isolation features.

## Mission
- Accept a single command from the caller (or orchestrator) with risk_hint and reason.
- Re-classify the command against sandbox-policy categories.
- Prefer platform-native permission controls (Claude Code permission mode) over ad-hoc isolation.
- Return exit_code, detected_risks, and a decision trail.

## Workflow
1. Read sandbox-policy.md (auto-loaded) and re-classify the command.
2. Detect the host platform (claude_code / copilot / codex / unknown).
3. Select sandbox_mode per decision tree (see sandbox-policy.md).
4. Execute or decline. If platform supports `ask`, prompt the user.
5. Emit AGENT_RESULT.

## AGENT_RESULT Contract
(see docs/issues/sandbox-design.md §1.4)

## Non-goals
- This agent does NOT install Docker / nsjail / firejail.
- This agent does NOT modify .claude/settings.local.json.
- Platform porting (Copilot / Codex native sandboxing) is tracked as a follow-up issue.
```

---

## 2. sandbox-policy ルール設計

### 2.1 スコープ（対象エージェント 10 種）

Bash ツールを保有する全エージェントが適用対象。`.claude/rules/` 自動ロードに乗せ、
各対象エージェント定義ファイルは 1 行参照のみ追記する。

1. `developer`
2. `tester`
3. `poc-engineer`
4. `scaffolder`
5. `infra-builder`
6. `codebase-analyzer`
7. `security-auditor`
8. `db-ops`
9. `releaser`
10. `observability`

（`sandbox-runner` 自身も Bash を持つが、policy の実行者であり対象外。循環を避けるため `caller_agent == "sandbox-runner"` の場合は再委譲しない。）

### 2.2 危険コマンドカテゴリ定義

| カテゴリ | 具体例（正規表現 / パターン） | 既定ティア |
|----------|-------------------------------|-----------|
| **destructive_fs** | `rm\s+-rf?\s+/`, `rm\s+-rf?\s+\~`, `mkfs`, `dd\s+of=`, `shred`, `find\s+.*-delete`, `> /dev/sd` | required |
| **prod_db** | 環境変数名に `PROD`, `PRODUCTION`, `LIVE` を含む接続文字列、`psql\s+.*prod`, `mongo(sh)?\s+.*prod`, `mysql\s+.*--host=.*prod` | required |
| **external_net** | `curl\s+.*(http|https)://(?!localhost\|127\.)`, `wget`, `ssh\s+`, `scp\s+`, `rsync\s+.*::`, `nc\s+`, package publish (`npm publish`, `cargo publish`, `twine upload`) | recommended |
| **privilege_escalation** | `sudo\b`, `su\s+-`, `chmod\s+777`, `chown\s+root`, `setuid`, `doas\b` | required |
| **secret_access** | `cat\s+.*\.env`, `cat\s+.*credentials`, `cat\s+.*\.secret`, `gh auth token`, `aws configure`, `kubectl\s+config\s+view\s+--raw` | required |

**ティア意味:**
- `required` — 必ず sandbox-runner に委譲（Standard 以上では自動挿入、Minimal/Light では advisory + ユーザー確認）。
- `recommended` — 呼び出し元が委譲を検討。委譲しない場合は AGENT_RESULT にスキップ理由を記録。
- `optional` — 委譲は任意。advisory のみ。

### 2.3 隔離モード決定ツリー

```
[コマンド入力]
    │
    ▼
[カテゴリ判定] ── どのカテゴリにも該当せず ──▶ [bypassed: そのまま実行]
    │
    ▼
[プラットフォーム検出]
    │
    ├─ claude_code ──▶ [permission mode 判定]
    │                       ├─ カテゴリが required → permission: `ask`（settings.json 未設定時）or `deny`
    │                       ├─ カテゴリが recommended → permission: `ask`
    │                       └─ カテゴリが optional → permission: `allow` + 監査ログ
    │
    ├─ copilot / codex ──▶ [advisory_only: 警告表示のみ、実行は呼び出し元判断]
    │                       （ネイティブ sandbox 対応は後続 issue）
    │
    └─ unknown ──▶ [blocked: 実行拒否し、ユーザーにプラットフォーム指定を促す]
```

**プラットフォーム検出方法:**
- `$CLAUDE_CODE_*` / `$GITHUB_COPILOT_*` / `$OPENAI_CODEX_*` 環境変数の有無（実装時に確定）
- 検出不能時は `unknown` として `blocked`

### 2.4 委譲条件 3 ティア

§2.2 の表に記載の通り。policy 本文では以下のように 1 節で表形式に記す。

```
| Category             | Tier        | Orchestrator Auto-insert | Explicit Delegation |
|----------------------|-------------|-------------------------|---------------------|
| destructive_fs       | required    | Standard+               | Always              |
| prod_db              | required    | Standard+               | Always              |
| privilege_escalation | required    | Standard+               | Always              |
| secret_access        | required    | Standard+               | Always              |
| external_net         | recommended | Standard+               | If caller decides   |
| （該当なし）         | optional    | No                      | No                  |
```

### 2.5 Auto-load 挙動

- ファイル配置: `.claude/rules/sandbox-policy.md`
- `.claude/rules/` 配下は既存の auto-load 機構により全エージェントで暗黙ロードされる（他の 8 ルールと同様）。
- 各対象エージェント定義への追記は「See `.claude/rules/sandbox-policy.md`」の 1 行のみ。詳細は policy 側に集約。

---

## 3. Platform-Guide 拡張設計

### 3.1 追加節のタイトル

**"Sandbox & Permission Modes"**（`wiki/en/Platform-Guide.md` と `wiki/ja/Platform-Guide.md` の両方に追加）

挿入位置: 既存 "Feature Matrix" の直前（"OpenAI Codex" 節の後）。理由 = 各プラットフォーム紹介を読み終えた読者が、横断観点で sandbox 機能を比較できる流れを作るため。

### 3.2 比較表の骨格

```
| Capability                    | Claude Code         | GitHub Copilot      | OpenAI Codex       |
|-------------------------------|---------------------|---------------------|--------------------|
| Native permission gate        | Yes (permission mode) | Partial (IDE prompt) | No                |
| Allow / Ask / Deny tiers      | Yes                 | Ask only            | No                 |
| Persistent settings           | `.claude/settings.json` | IDE config       | N/A                |
| Session-local override        | `.claude/settings.local.json` | Per-session     | N/A                |
| sandbox-runner integration    | Auto + explicit     | Explicit only       | Advisory only      |
| Recommended fallback          | —                   | Manual review       | Manual review      |
```

### 3.3 Claude Code permission mode 解説（本文要点）

- **3 段階**: `allow`（自動許可）/ `ask`（ユーザー確認）/ `deny`（実行拒否）
- **Session vs persistent**:
  - Persistent: `.claude/settings.json`（リポジトリにコミット可）
  - Session / local: `.claude/settings.local.json`（gitignore 対象、個人環境用）
- **優先順位**: session > persistent
- **sandbox-runner との関係**: sandbox-runner はこれらのモードを尊重し、自前の隔離技術に置き換えない
- **本設計ではこれらの settings ファイルを直接改変しない**。ユーザーが自分で設定する前提で、推奨プロファイルのみ提示

### 3.4 運用パターン（推奨プロファイル）

| 環境 | destructive_fs | prod_db | external_net | privilege | secret_access | 備考 |
|------|----------------|---------|--------------|-----------|---------------|------|
| **dev（開発者ローカル）** | ask | deny | ask | ask | ask | 緩めだが全 required はユーザー確認 |
| **CI** | deny | deny | allow（allowlist） | deny | deny | network は registry のみ allowlist |
| **near-production** | deny | deny | deny | deny | deny | 全面 deny、必要なら human-in-the-loop |

---

## 4. 既存ファイルへの参照追記計画

> 本設計メモでは実ファイルを変更せず、developer への指示のみ記述する。

### 4.1 対象エージェント 10 種への 1 行参照

各ファイルの「Rules / References」相当のセクション末尾、または frontmatter 直後の先頭セクションに以下 1 行を追記:

```markdown
> Follows `.claude/rules/sandbox-policy.md` for command risk classification and delegation to `sandbox-runner`.
```

対象ファイル:
- `.claude/agents/developer.md`
- `.claude/agents/tester.md`
- `.claude/agents/poc-engineer.md`
- `.claude/agents/scaffolder.md`
- `.claude/agents/infra-builder.md`
- `.claude/agents/codebase-analyzer.md`
- `.claude/agents/security-auditor.md`
- `.claude/agents/db-ops.md`
- `.claude/agents/releaser.md`
- `.claude/agents/observability.md`

### 4.2 orchestrator-rules.md への記述位置

`.claude/orchestrator-rules.md` に次の 2 箇所を追加:

1. **"Triage System" 節の Delivery Flow / Operations Flow 表の下**:
   - 「sandbox-runner は Standard 以上で自動挿入、Light では明示委譲のみ」旨の注記
2. **新設節 "Sandbox Runner Auto-insertion"**（Handoff File Specification の前）:
   - 発火条件（policy の required/recommended に一致）
   - 二重実行防止フラグ（`sandbox_inserted_for_task_id`）
   - Standalone エージェント配下の扱い（自動挿入不可、明示委譲にフォールバック）

### 4.3 wiki の Agents-Reference 追加節

**配置判断: 新カテゴリ "Safety Agents" を新設する**（Standalone ではない）。

理由:
- `sandbox-runner` は Standalone エージェント（`analyst` / `codebase-analyzer`）と違い、**オーケストレーターからも自動挿入される**ため Standalone 定義と合わない。
- 将来 Copilot/Codex 向け sandbox エージェントや監査系エージェントが増えた際に拡張しやすい。
- Standalone を安易に増やすと triage との関係が曖昧になる。

追加箇所:
- `wiki/en/Agents-Reference.md`:
  - TOC に `- [Safety Agents (1 agent)](#safety-agents)` を追加
  - ヘッダの "26 agents" を "27 agents" に更新
  - 新節 `## Safety Agents` を `## Standalone Agents` の前に追加
- `wiki/ja/Agents-Reference.md`: 同様の構成

追加節の雛形:
```markdown
## Safety Agents

These agents enforce safety policies across other agents. They may be invoked
automatically by orchestrators or explicitly delegated from any Bash-owning agent.

### sandbox-runner

- **Canonical**: [.claude/agents/sandbox-runner.md](../../.claude/agents/sandbox-runner.md)
- **Domain**: Safety (cross-cutting)
- **Responsibility**: Executes high-risk commands via the host platform's native permission controls (e.g., Claude Code permission mode). Classifies commands against sandbox-policy and returns an audit trail.
- **Inputs**: command, working_directory, timeout_sec, risk_hint, allow_network, allow_write_paths, dry_run, reason, caller_agent
- **Outputs**: stdout, stderr, exit_code, sandbox_mode, detected_risks, decision
- **AGENT_RESULT fields**: `STATUS`, `SANDBOX_MODE`, `EXIT_CODE`, `DETECTED_RISKS`, `DECISION`, `CALLER`, `DURATION_MS`
- **NEXT conditions**: Returns to caller agent, or `done`
```

### 4.4 wiki の Rules-Reference 追加節

- `wiki/en/Rules-Reference.md` / `wiki/ja/Rules-Reference.md` の末尾にエントリ `sandbox-policy` を追加
- Auto-load フラグを立て、既存 8 ルールと同形式で記述（計 9 ルールになる）

### 4.5 README / README.ja 更新

- `README.md`:
  - 7 行目: `26 specialized agents` → `27 specialized agents`
  - 152 行目: `# Agent definitions (26 files)` → `# Agent definitions (27 files)`
  - 196 行目: `All 26 agents` → `All 27 agents`
- `README.ja.md`:
  - 7 行目: `26 の専門エージェント` → `27 の専門エージェント`
  - 152 行目: `エージェント定義（26ファイル）` → `エージェント定義（27ファイル）`
  - 196 行目: `全26エージェント` → `全27エージェント`

---

## 5. 実装順序（developer 用フェーズ分割）

各フェーズで 1 コミットを原則とし、フェーズ内で複数タスクが必要な場合はタスク単位で分割する。

### Phase 1: sandbox-policy ルール本体
- **成果物**: `.claude/rules/sandbox-policy.md`
- **内容**: §2 の全定義（カテゴリ、ティア、決定ツリー、プラットフォーム検出方針、auto-load 注記）
- **commit**: `feat: add sandbox-policy rule (TASK-001)`
- **理由**: 他成果物の参照元となるため最初に確定させる。

### Phase 2: sandbox-runner エージェント定義
- **成果物**: `.claude/agents/sandbox-runner.md`
- **内容**: §1.6 のテンプレを肉付け、Input/Output/AGENT_RESULT 契約、workflow 詳細
- **commit**: `feat: add sandbox-runner agent (TASK-002)`
- **理由**: policy を前提として振る舞いを記述するため Phase 1 の後。

### Phase 3: orchestrator-rules.md 更新
- **成果物**: `.claude/orchestrator-rules.md` への §4.2 記述追加
- **内容**: Triage 表への注記 + "Sandbox Runner Auto-insertion" 節
- **commit**: `feat: wire sandbox-runner auto-insertion into orchestrator rules (TASK-003)`

### Phase 4: 対象エージェント 10 種への 1 行参照追記
- **成果物**: §4.1 の 10 ファイルへの参照行追加
- **内容**: 各ファイルに 1 行のみ追記（本文改訂はしない）
- **commit**: `feat: reference sandbox-policy from bash-owning agents (TASK-004)`
- **理由**: 10 ファイル一括を 1 コミットにまとめる（機械的な同種変更のため例外的に許容）。

### Phase 5: wiki 拡張 + README エージェント数更新
- **成果物**:
  - `wiki/en/Platform-Guide.md` / `wiki/ja/Platform-Guide.md`（§3 の新節追加）
  - `wiki/en/Agents-Reference.md` / `wiki/ja/Agents-Reference.md`（§4.3 の Safety Agents 節追加、26→27 更新）
  - `wiki/en/Rules-Reference.md` / `wiki/ja/Rules-Reference.md`（§4.4 の sandbox-policy 節追加）
  - `README.md` / `README.ja.md`（§4.5 の数値更新）
- **commit**: `docs: add sandbox docs to wiki and update agent count (TASK-005)`

**検証:**
- 各 Phase 完了時に `python -m py_compile` 相当は不要（markdown のみ）
- 最終的に `scripts/generate.py` を走らせて platforms/ が最新化されるかを developer が確認（本 issue のスコープ外なら TODO として残す）

---

## 6. 制約と除外事項

本設計メモおよび後続の developer フェーズでは以下を実施しない。

| 項目 | 理由 |
|------|------|
| Copilot / Codex 個別対応（ネイティブ sandbox 機能の実装） | 先行プラットフォームは Claude Code。別 PR / 別 issue で分離 |
| Docker / nsjail / firejail 等の具体的隔離技術の導入 | プラットフォーム機能優先の方針に反し、移植性を失う |
| `.claude/settings.json` / `.claude/settings.local.json` の直接改変 | ユーザーの個人環境設定を侵害しない。推奨プロファイルの提示のみ |
| `scripts/generate.py` の大幅改修 | 生成は既存機構に乗せる。必要なら後続 issue |
| SPEC.md / ARCHITECTURE.md の新規作成 | Aphelion はエージェント定義集であり UC を持たない |
| 既存 26 エージェントの本文ロジック改修 | policy 自動ロード + 1 行参照で完結させる |

---

## 7. 設計判断の記録（ADR）

### ADR-001: 起動モデルに両方併用（C 案）を採用

- **状況**: 明示委譲のみ（A）、自動挿入のみ（B）、両方併用（C）の 3 案
- **決定**: C 案を採用し、自動挿入を優先、明示委譲を 2 次経路とする
- **理由**: policy 3 ティア（required/recommended/optional）と triage プラン（Minimal〜Full）を組み合わせて適用強度を変えられる唯一の構成
- **却下した代替案**:
  - A: 判断漏れリスクが高く、policy 更新の波及が弱い
  - B: Standalone エージェント配下で機能しない

### ADR-002: 特定隔離技術に縛らず permission mode を第一優先とする

- **状況**: Docker / nsjail / firejail 等を既定にする案（原 issue 案 3）
- **決定**: プラットフォーム機能（Claude Code permission mode）を第一優先、技術固有の実装は避ける
- **理由**: Aphelion はエージェント定義集であり、ユーザー環境の前提を狭めない。Claude Code 以外への将来ポートを容易にする
- **却下した代替案**: Docker 既定化（ユーザー環境に Docker を強要することになる）

### ADR-003: Agents-Reference で "Safety Agents" 新カテゴリを作成

- **状況**: sandbox-runner を Standalone に入れるか、新カテゴリを作るか
- **決定**: "Safety Agents" 新カテゴリを作成
- **理由**: sandbox-runner はオーケストレーターからも自動挿入される点で Standalone（ユーザー直接起動主体）と性質が異なる。将来の監査系エージェント拡張の受け皿にもなる
- **却下した代替案**: Standalone への編入（triage との関係が曖昧化）

### ADR-004: 対象エージェント 10 種への追記は 1 行参照のみ

- **状況**: 各エージェントに detailed policy checks を埋め込むか、1 行参照にするか
- **決定**: 1 行参照のみ（policy 自動ロードに任せる）
- **理由**: 26 エージェント全件改訂のコストを回避し、policy の単一情報源性を保つ
- **却下した代替案**: 詳細チェックの埋め込み（保守困難、原 issue 案 5 と同じ問題）

### ADR-005: settings.json / settings.local.json を直接改変しない

- **状況**: 推奨プロファイルをコードで配布するか、ドキュメントで提示するか
- **決定**: ドキュメント（Platform-Guide の運用パターン表）で提示のみ
- **理由**: ユーザーの個人環境設定を侵害しない。CI / dev / near-prod の選好はユーザー判断
- **却下した代替案**: templates/settings.example.json を同梱（今回スコープ外、必要なら後続 issue）

---

## 8. 次アクション

- 次エージェント: **developer**
- developer は本メモの §5 フェーズ順で実装を進める
- 各フェーズ完了時に TASK.md を更新し、コミット単位を守る
- Phase 5 完了後に scripts/generate.py の再生成要否を判断し、必要なら別 issue を起票

---

## Addendum (2026-04-18): Case 5 adoption — infra-builder 拡張による devcontainer 生成

> 参照元: `docs/issues/sandbox.md` §A (Addendum 2026-04-18)
> architect 決定日: 2026-04-18
> 前提: §1〜§8 の初版設計（ADR-001〜005）を**変更せず**、その上に追加する増築設計である。

### A.1 背景（要約）

初版設計の `sandbox-policy` は **advisory の域を越えない**。Claude Code の permission mode が `auto`/`allow` 相当で動作している場合、`required` カテゴリに該当するコマンドも素通りし、実行環境の汚染・破壊・秘密情報流出のリスクが残る。

この限界を解消するため、`infra-builder` の責務を拡張し、プロジェクト単位で `.devcontainer/devcontainer.json` と `docker-compose.dev.yml` を**生成**する。実行時は `sandbox-runner` が devcontainer 経由実行を最優先とし、不可能な場合のみ既存の `platform_permission` にフォールバックする。

### A.2 論点 1: isolation mode への `container` 追加

#### 決定
- `sandbox-policy.md` §4 "Sandbox Modes" に `container` を**正式追加**する。
- sandbox-runner の Output `sandbox_mode` enum を次のとおり拡張する:
  - **旧**: `platform_permission | advisory_only | blocked | bypassed`
  - **新**: `container | platform_permission | advisory_only | blocked | bypassed`
- AGENT_RESULT の `SANDBOX_MODE` 値にも `container` を追加。

#### 優先順位（同時利用可能時）
`container` > `platform_permission` > `advisory_only` > `blocked`

理由:
- `container` は実体的な隔離境界を持つため、同じコマンドでも advisory より強い保証を提供できる。
- `platform_permission` は container が利用不可のときの実行可能な次善策であり、policy の宣言的判定を活かせる。
- `advisory_only` は警告のみで実行を止めない。最後のフォールバック。
- `blocked` は「判定不能なので実行しない」の終端。フォールバックしきれない場合に到達する。

#### フォールバック順（確定）
```
[container 利用可？] ── Yes ──▶ container で実行
        │
        No (Docker なし / devcontainer 未生成)
        ▼
[platform 検出済？] ── Yes ──▶ platform_permission で実行（permission mode 尊重）
        │
        No (unknown platform)
        ▼
[category が required 以外？] ── Yes ──▶ advisory_only で警告しつつ実行
        │
        No (required category)
        ▼
blocked（実行拒否、ユーザーに通知）
```

#### policy §3 決定ツリーへの差し込み位置
初版 §2.3 の `claude_code` 分岐の**前**に「container 利用可能性チェック」を挿入する。
既存の permission mode 判定ロジックは container が選べなかった場合のパスとしてそのまま残す。

### A.3 論点 2: triage プラン別の devcontainer 生成可否

#### 決定（§5 triage 表に列を追加）

| Plan | sandbox-runner 配置 | devcontainer 生成 | devcontainer 起動モード | 備考 |
|------|--------------------|-------------------|------------------------|------|
| **Minimal** | 登場させない | **スキップ** | N/A | policy の advisory のみ。infra-builder も Minimal では generate しない |
| **Light** | 明示委譲のみ | **生成** | **任意起動（ユーザー判断）** | 開発者が必要と判断したときに `devcontainer open` する |
| **Standard** | 自動挿入 | **生成** | **必須起動**（`required` 分類の Bash コマンドは devcontainer 経由のみ） | Docker daemon 不可ならフォールバック |
| **Full** | Standard 同等 + 監査転記 | **生成** | **必須起動 + audit log**（devcontainer 出入り記録） | `security-auditor` が audit log を SECURITY_AUDIT.md に転記 |

#### 理由
- Minimal はそもそも sandbox-runner を登場させない（初版 §1.5 と整合）。devcontainer も不要。
- Light は「明示委譲のみ」の哲学と合わせ、devcontainer も「必要になったら起動」の任意扱いに留める。
- Standard で初めて「required カテゴリは container 経由でないと実行不可」という強制力を発揮する。
- Full は Standard に audit log 転記を追加するのみ。生成物自体は Standard と同じ。

#### §5 表の更新方針（developer 向けメモ）
初版 §1.5 Triage 配置表に `devcontainer 生成` 列と `devcontainer 起動モード` 列を追加する。物理ファイル（sandbox-policy.md）でも同等の表に揃える。

### A.4 論点 3: infra-builder の責務境界

#### ディレクトリ分離規則（確定）

| 系統 | ルート配置 | 具体成果物 |
|------|-----------|-----------|
| **本番 infra（既存責務）** | リポジトリルートまたは `infra/` | `Dockerfile`, `docker-compose.yml`, `.github/workflows/*.yml`, Terraform 等 |
| **sandbox infra（新責務）** | `.devcontainer/`, リポジトリルート | `.devcontainer/devcontainer.json`, `docker-compose.dev.yml` |

規則:
- sandbox infra は**リポジトリルートの `.devcontainer/` 配下**または**ルート直下の `*.dev.yml` サフィックス**に限定。
- 本番 infra 側から sandbox infra を参照してはならない（本番ビルドが開発依存を引き込むのを防ぐため）。
- sandbox infra 側から本番 infra を参照するのは**推奨しない**。必要な場合でも `extends` / `include` による読み取りのみ。

#### 命名規則

| 目的 | 許可される名前 | 禁止事項 |
|------|---------------|---------|
| Compose（本番） | `docker-compose.yml`, `compose.yml`, `docker-compose.prod.yml` | `.dev` サフィックス付与禁止 |
| Compose（開発/sandbox） | `docker-compose.dev.yml`, `compose.dev.yml` | 同名ファイルとの衝突禁止 |
| Devcontainer | `.devcontainer/devcontainer.json` | 他ディレクトリへの配置禁止 |

`docker-compose.dev.yml` は以下のいずれかを選べる:
1. **独立**（推奨、初期値）: prod の compose を参照しない自己完結ファイル。
2. **extends / include**: prod の compose の特定サービスを extends する。この場合でも prod 側は dev を知らない。

#### 参照方向（サマリ）
- `sandbox infra → prod infra` の読み取り: **推奨しない**（独立が望ましい）。必要なら `extends` までに留め、書き込みは禁止。
- `prod infra → sandbox infra`: **禁止**。

#### infra-builder AGENT_RESULT の拡張

既存フィールドに加え、以下を追加する:

```
AGENT_RESULT: infra-builder
STATUS: success | failure | error
...
DEVCONTAINER_GENERATED: true | false
DEV_COMPOSE_GENERATED: true | false
SANDBOX_INFRA_PATH: .devcontainer/, docker-compose.dev.yml  # 生成した場合のパス一覧
NEXT: ...
```

- `DEVCONTAINER_GENERATED`: `.devcontainer/devcontainer.json` を生成または更新した場合 `true`。
- `DEV_COMPOSE_GENERATED`: `docker-compose.dev.yml` を生成または更新した場合 `true`。
- `SANDBOX_INFRA_PATH`: 生成パスの明示（auditor / sandbox-runner が参照）。

triage 連動:
- Minimal: 両フィールド常に `false`。
- Light / Standard / Full: 少なくとも `DEVCONTAINER_GENERATED: true`。`docker-compose.dev.yml` はプロジェクトが Compose を使う場合のみ `true`。

### A.5 論点 4: sandbox-runner の実行経路選択ロジック

#### devcontainer 検出手順（逐次実行）

1. **devcontainer 定義の存在確認**
   - `.devcontainer/devcontainer.json` がリポジトリに存在するか。存在しなければ step-4 へ。
2. **Docker daemon 生存確認**
   - `docker info` を 5 秒タイムアウトで実行。非 0 終了または timeout なら step-4 へ。
3. **両方 OK → `container` モード採択**
   - 以降の実行は devcontainer / `docker-compose.dev.yml` 経由で行う。
4. **フォールバック → `platform_permission` に降格**
   - Claude Code 検出時: permission mode に従って `ask`/`deny`/`allow`。
   - unknown platform: `blocked` へさらに降格。
   - AGENT_RESULT に `FALLBACK_REASON` を必ず記録する（後述）。

#### 入出力マッピング

| 項目 | 規則 |
|------|------|
| マウント範囲 | **ワーキングディレクトリのみ**（`caller_agent` の cwd 直下）を `rw` でバインド。親ディレクトリはマウントしない。 |
| 除外パス | `.env`, `.env.*`, `credentials/`, `*.secret`, `.git/config` は `.dockerignore` 同等で除外。`allow_write_paths` に明示されていても除外を優先。 |
| 環境変数 | 既定では**ホストの全環境変数を引き継がない**。`caller_agent` が指定した `env_allowlist`（将来の Input 拡張候補）のみ伝搬。当面は空配列を既定とする。 |
| ネットワーク | **既定 `--network=none`**。`allow_network: true` の場合のみ `bridge` を許可。`external_net` カテゴリの検出時はさらにユーザー確認を要求。 |
| タイムアウト | Input の `timeout_sec`（既定 60 / 上限 600）を `docker run` の内部タイムアウトに適用。container 起動時間は含めない。 |
| 標準入出力 | stdout / stderr は container から取得しそのまま Output に転記。バイナリは base64 化せず切り詰め（既定 1 MB / 各ストリーム）。 |

#### フォールバック挙動と AGENT_RESULT への記録

`container` を採択できなかった場合、AGENT_RESULT に次のフィールドを追加する:

```
AGENT_RESULT: sandbox-runner
STATUS: success | failure | blocked | error
SANDBOX_MODE: platform_permission | advisory_only | blocked   # container 以外のいずれか
FALLBACK_REASON: docker_unavailable | devcontainer_missing | docker_info_timeout | daemon_error | platform_unknown
...
```

対応表:

| 状況 | FALLBACK_REASON | 降格先 SANDBOX_MODE |
|------|----------------|--------------------|
| `.devcontainer/devcontainer.json` が無い | `devcontainer_missing` | `platform_permission`（platform 検出時）or `advisory_only` |
| `docker info` が非 0 終了 | `docker_unavailable` | 同上 |
| `docker info` が 5 秒でタイムアウト | `docker_info_timeout` | 同上 |
| Docker daemon は動作するがエラーを返す | `daemon_error` | 同上 |
| platform 検出ができない | `platform_unknown` | `blocked`（required カテゴリ時）or `advisory_only` |

container 経由で**成功**した場合は `FALLBACK_REASON` を**省略**する（存在しない = フォールバック未発生）。

### A.6 追加 ADR

#### ADR-006: isolation modes に `container` を追加

- **状況**: 初版の `platform_permission | advisory_only | blocked | bypassed` のみでは advisory 限界を超えられない。案 5 (infra-builder 拡張) により devcontainer による実体的隔離を採択できる。
- **決定**: `sandbox_mode` enum に `container` を追加し、優先順位を `container > platform_permission > advisory_only > blocked` とする。
- **理由**: 実体的な隔離境界を最優先しつつ、devcontainer 不可時に既存経路へ自然に降格できる。ADR-002（特定技術に縛らない）とは、devcontainer が業界標準仕様である点で整合する。
- **却下した代替案**:
  - container を platform_permission より後段に置く案: container が使える状況では必ず container を使うべきで、permission mode 側を先に呼ぶ動機がない。
  - `bypassed` を container より優先する案: bypassed は非該当カテゴリの素通り用であり、優先順位比較の対象外。

#### ADR-007: triage プラン別の devcontainer 生成ポリシー

- **状況**: devcontainer 生成は全プランで必須か、プランごとに段階化するかの 2 択。
- **決定**: §A.3 の表のとおり Minimal=skip / Light=generate only / Standard=generate+enforce / Full=generate+enforce+audit に段階化する。
- **理由**: Minimal は「policy だけで advisory」の設計哲学を崩さない。Standard で初めて強制力を発揮させることで、triage の段階性と整合する。
- **却下した代替案**:
  - 全プラン生成+起動必須: Minimal の軽量性を破壊する。
  - Light で必須起動: 明示委譲のみの Light で強制すると、Standard との差別化が消える。

#### ADR-008: infra-builder における sandbox infra と prod infra の分離

- **状況**: sandbox infra を本番 infra と同一ディレクトリに混在させるか、物理的に分けるか。
- **決定**: sandbox infra は `.devcontainer/` と `*.dev.yml` サフィックスに限定し、prod 側から sandbox を参照しない。
- **理由**: 本番ビルドに開発依存が混入するのを構造的に防ぐ。AGENT_RESULT の `DEVCONTAINER_GENERATED` / `DEV_COMPOSE_GENERATED` により、生成の有無が明示的にトレースできる。
- **却下した代替案**:
  - 全 infra を `infra/` 配下に置く案: devcontainer は `.devcontainer/` という VS Code 等の慣習に従うべきで、別ディレクトリに置くと外部ツールの自動認識が効かない。
  - 命名で区別せずコメントのみで区別: レビュー時に見落としやすく保守性が低い。

#### ADR-009: sandbox-runner の execution path selection と fallback

- **状況**: devcontainer 検出に失敗したとき、エラー終了させるか platform_permission に降格させるか。
- **決定**: 降格方式を採用。失敗した検出内容を `FALLBACK_REASON` として AGENT_RESULT に必ず記録する。
- **理由**: 「必須起動」プラン（Standard/Full）でも、ユーザー環境に Docker が無いだけで全 Bash コマンドが詰まるのは運用上許容できない。降格により可用性を確保しつつ、降格履歴を残すことで後続の `security-auditor` が監査可能になる。
- **却下した代替案**:
  - 降格せず即 blocked: Standard 以上で Docker を持たない環境が実質使用不能になる。
  - 降格理由を記録しない: 後から「なぜ container で動かなかったか」を再現できず、audit 要件を満たせない。

### A.7 実装フェーズ追加（Phase 6〜9）

初版 Phase 1〜5 は**変更せず**、その後に Phase 6〜9 を追加する。各フェーズで 1 コミットを原則とする。

#### Phase 6: infra-builder 拡張（devcontainer 生成テンプレ追加）
- **成果物**: `.claude/agents/infra-builder.md` の責務拡張（sandbox infra 生成項を追加）、AGENT_RESULT スキーマに `DEVCONTAINER_GENERATED` / `DEV_COMPOSE_GENERATED` / `SANDBOX_INFRA_PATH` 追加
- **内容**: §A.4 の分離規則、命名規則、triage 連動、出力拡張
- **commit**: `feat: extend infra-builder to generate devcontainer/dev-compose (TASK-006)`
- **理由**: §A.2〜A.3 の container モードと triage ポリシーが参照する「誰が生成するか」を先に確定させる。

#### Phase 7: sandbox-policy.md に `container` mode 追記 + §5 triage 表更新
- **成果物**: `.claude/rules/sandbox-policy.md` の Sandbox Modes 節（§4 相当）に `container` 追加、決定ツリーに container 分岐差し込み、triage 表に「devcontainer 生成」「起動モード」列を追加
- **内容**: §A.2 の優先順位、§A.3 の triage 表
- **commit**: `feat: add container isolation mode to sandbox-policy (TASK-007)`
- **理由**: runner 実装の前に policy 側の enum と決定ツリーを確定させる（initial Phase 1〜2 の関係と同じ）。

#### Phase 8: sandbox-runner.md に execution path selection 追記
- **成果物**: `.claude/agents/sandbox-runner.md` の Workflow / Output / AGENT_RESULT 節に container 経路と fallback 挙動を追記
- **内容**: §A.5 の検出手順、マウント規則、`FALLBACK_REASON` フィールド、Output の `sandbox_mode` enum 拡張
- **commit**: `feat: add container execution path and fallback to sandbox-runner (TASK-008)`
- **理由**: policy が container を宣言した後に、実行側で具体的な経路選択を記述する。

#### Phase 9: wiki (en+ja) の Platform-Guide と Agents-Reference 更新
- **成果物**:
  - `wiki/en/Platform-Guide.md` / `wiki/ja/Platform-Guide.md`: "Sandbox & Permission Modes" 節に container モード記述を追加、比較表に `container via devcontainer` 行を追加
  - `wiki/en/Agents-Reference.md` / `wiki/ja/Agents-Reference.md`: infra-builder 節に sandbox infra 生成責務を追記、sandbox-runner 節に container mode / fallback を追記
  - `wiki/en/Rules-Reference.md` / `wiki/ja/Rules-Reference.md`: sandbox-policy の Sandbox Modes に `container` 記述を追加
- **commit**: `docs: document container mode and devcontainer generation in wiki (TASK-009)`
- **理由**: 初版 Phase 5 が wiki 一括更新だった方針を踏襲し、Addendum 分もまとめて wiki 反映する。

**検証方針（Phase 6〜9 共通）:**
- markdown のみの変更のため、syntax check は不要。
- 各 Phase で `scripts/generate.py` の再生成要否を判定し、必要なら別コミット or 別 issue で対応（初版の Phase 5 末尾と同じ方針）。

### A.8 既存設計との整合（変更なし事項）

- 初版 ADR-001〜005 はすべて**そのまま有効**。
- §1〜§7 の本文は**変更しない**。変更が必要な事項はすべて本 Addendum 内の表・ADR として新規に書き下す。
- 対象エージェント 10 種への 1 行参照（§4.1）は initial Phase 4 のままで、Addendum による追加改訂は**不要**。policy 側が container を追加しても参照側の書き方は変わらない。
- Minimal プランのスコープ外方針（Minimal では sandbox-runner を登場させない）は ADR-007 と整合し、container も同様に Minimal でスキップ。

### A.9 次アクション（Addendum 後）

- 次エージェント: **developer**
- developer は初版 §5 の Phase 1〜5 に加え、本 Addendum §A.7 の Phase 6〜9 を**連番で続けて**実行する。
- 既存 PR #7（ブランチ `feat/add-sandbox`）にコミット追加で対応し、新ブランチは作らない。
- 各 Phase 完了時に TASK.md を更新し、1 Phase 1 コミットの原則を維持する。
