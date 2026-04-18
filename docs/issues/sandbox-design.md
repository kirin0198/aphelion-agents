# Sandbox 機能 設計メモ

> 参照元: `docs/issues/sandbox.md`（analyst 版 1.0 / 2026-04-18）
> 作成日: 2026-04-18
> 作成者: architect (agentId inherited)
> 更新履歴:
>   - 2026-04-18: 初版作成（sandbox-runner / sandbox-policy / Platform-Guide 拡張の設計確定）

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
