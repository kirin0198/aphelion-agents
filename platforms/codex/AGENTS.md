# global rules — Aphelion Workflow Overview

This file provides a high-level overview of the Aphelion workflow.
Behavioral rules are defined in `.claude/rules/` (auto-loaded).
Agent-specific rules are documented in the individual files under `agents/`.


---

## Aphelion Workflow Model

Aphelion divides the entire project lifecycle into three domains — **Discovery (requirements exploration) → Delivery (design & implementation) → Operations (deploy & operations)** — each managed by an independent orchestrator (flow).

### Design Principles

- **Domain separation**: Each domain runs in an independent session
- **File handoff**: Domains are connected via `.md` files (DISCOVERY_RESULT.md, DELIVERY_RESULT.md). No automatic chaining
- **Session isolation**: Each flow orchestrator runs in its own session to prevent context window bloat
- **Triage adaptation**: Each flow orchestrator assesses project characteristics at flow start and selects from 4 tiers: Minimal / Light / Standard / Full
- **Independent invocation**: Any agent can be invoked standalone as long as its input files are available

### Domain and Flow Overview

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (requirements)                         (design & impl)                       (deploy & ops)
 6 agents                               12 agents                              4 agents
```

### Branching by Product Type

| PRODUCT_TYPE | Discovery | Delivery | Operations |
|-------------|-----------|----------|------------|
| `service` | Run | Run | Run |
| `tool` / `library` / `cli` | Run | Run | **Skip** |

---

## Agent Directory

Agent definitions are stored in `agents/` (the standard Claude Code location).
Orchestrator-specific rules are in `the orchestrator rules section below` (read on-demand by orchestrators).

---

## Tech Stack Flexibility

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**.

- Always prioritize the tech stack determined in SPEC.md
- Substitute Python-specific references with equivalent tools for the target tech stack
- If in doubt, confirm with the user

---

# Orchestrator Rules — Aphelion Workflow

This file contains rules specific to flow orchestrators (discovery-flow, delivery-flow, operations-flow).
Each orchestrator must read this file at startup before beginning work.

---

## Triage System

### Discovery Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Minimal | Personal tool / small script | interviewer |
| Light | Personal side project / multiple features | interviewer → rules-designer → scope-planner |
| Standard | External dependencies / existing system integration | interviewer → researcher → poc-engineer → rules-designer → scope-planner |
| Full | Regulated / large-scale / complex | interviewer → researcher → poc-engineer → concept-validator → rules-designer → scope-planner |

### Delivery Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Minimal | Single-function tool | spec-designer → architect → developer → tester (test-designer integrated) → security-auditor |
| Light | Personal side project | + ux-designer (if UI) + test-designer + reviewer |
| Standard | Multi-file project | + scaffolder + doc-writer |
| Full | Public project / OSS | + releaser |

`security-auditor` **must run on all plans**. `ux-designer` runs only for projects with UI.

> **sandbox-runner placement**: In Standard and above, `sandbox-runner` is automatically inserted by the orchestrator when a `required`-tier command (per `sandbox-policy.md`) is detected. In Light, only explicit delegation from the calling agent is permitted. In Minimal, `sandbox-runner` is not used — policy violations trigger an advisory warning to the user only.

> **About analyst:** `analyst` is a side-entry agent outside the triage flow. It is triggered by bug reports, feature requests, or refactoring requests for existing projects. After completion, Delivery Flow joins from Phase 3 (architect).

> **About codebase-analyzer:** `codebase-analyzer` is a standalone agent for existing projects that lack SPEC.md / ARCHITECTURE.md. It reverse-engineers these documents from the codebase, enabling the project to join the standard workflow via `analyst` → `delivery-flow`.

### Operations Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Light | PaaS / single container | infra-builder → ops-planner |
| Standard | API + DB architecture | + db-ops |
| Full | High availability required | + observability |

> **Why no Minimal plan:** Deploying `PRODUCT_TYPE: service` requires at minimum infrastructure definitions (infra-builder) and an operations plan (ops-planner), so Operations uses Light as the minimum plan.

> **sandbox-runner placement in Operations Flow**: At Standard and above, `sandbox-runner` is placed before `db-ops`, `releaser`, and `observability`. This ensures that destructive DB operations and deployment commands pass through risk classification before execution.

---

## Sandbox Runner Auto-insertion

This section defines how flow orchestrators insert `sandbox-runner` automatically when they detect a `required`-tier command per `sandbox-policy.md`.

### Trigger Conditions

The orchestrator inserts `sandbox-runner` **before** an agent's Bash execution when:
1. The current plan is **Standard or Full**.
2. The command to be executed matches a `required`-tier category in `sandbox-policy.md`:
   - `destructive_fs`, `prod_db`, `privilege_escalation`, `secret_access`
3. `recommended`-tier (`external_net`) is also auto-inserted at Standard and above (the calling agent may still skip it with a recorded reason).

### Double-Execution Prevention

To avoid running `sandbox-runner` twice for the same command, the orchestrator tracks a per-task insertion flag: `sandbox_inserted_for_task_id`. If this flag is already set for the current task, skip auto-insertion and proceed with the previously obtained clearance.

### Standalone Agent Fallback

`codebase-analyzer` and other agents invoked directly by the user (outside a flow orchestrator) cannot receive auto-insertion. In this case:
- Fall back to **explicit delegation**: the agent itself must call `sandbox-runner` for `required`-tier commands.
- If `sandbox-runner` is not available (Minimal plan, standalone context), the agent displays a warning and asks the user for explicit confirmation.

### Invocation Format

When auto-inserting, the orchestrator calls `sandbox-runner` via the the appropriate tool:

```
Agent(
  subagent_type: "sandbox-runner",
  prompt: "Execute the following command on behalf of {agent_name}:
           command: {command}
           working_directory: {cwd}
           timeout_sec: 60
           risk_hint: {detected_category}
           reason: Auto-inserted by orchestrator for {agent_name} task {task_id}
           caller_agent: {agent_name}",
  description: "sandbox check for {agent_name}"
)
```

Parse the returned `AGENT_RESULT` block:
- `STATUS: success` or `DECISION: allowed` / `asked_and_allowed` → proceed with the next agent
- `STATUS: blocked` or `DECISION: denied` → report to user, do not continue the blocked agent's execution
- `STATUS: error` → follow Common Error Handling

---

## Handoff File Specification

Common format for handoff files used to connect domains.
Each file is read by the next domain's flow orchestrator at startup to verify prerequisites are met.

### Validation Rules

Each flow orchestrator validates required fields of the handoff file at startup. If any are missing, report with `STATUS: error` and ask the user to fix them.

**DISCOVERY_RESULT.md required fields:**
- `PRODUCT_TYPE` (one of: service / tool / library / cli)
- "プロジェクト概要" section (must not be empty)
- "要件サマリー" section (must not be empty)

**DELIVERY_RESULT.md required fields:**
- `PRODUCT_TYPE`
- "成果物" section (must include SPEC.md and ARCHITECTURE.md status)
- "技術スタック" section (must not be empty)
- "テスト結果" section
- "セキュリティ監査結果" section

**OPS_RESULT.md required fields:**
- "成果物一覧" table
- "デプロイ準備状態" checklist

### DISCOVERY_RESULT.md

Final output of Discovery Flow. Input for Delivery Flow's `spec-designer`.

```markdown
# Discovery Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Discovery プラン: {Minimal | Light | Standard | Full}

## プロジェクト概要
{1〜3行の要約}

## 成果物の性質
PRODUCT_TYPE: {service | tool | library | cli}

## 要件サマリー
{構造化された要件の要約}

## スコープ（確定している場合）
- MVP: {最小スコープ}
- IN: {含むもの}
- OUT: {含まないもの}

## 技術リスク・制約（調査済みの場合）
{PoCの結果、外部依存の制約等}

## 未解決事項
{Delivery で解決すべき残課題}
```

### DELIVERY_RESULT.md

Final output of Delivery Flow. Input for Operations Flow (for service type).

```markdown
# Delivery Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Delivery プラン: {Minimal | Light | Standard | Full}
> PRODUCT_TYPE: {service | tool}

## 成果物
- SPEC.md: {あり/なし}
- ARCHITECTURE.md: {あり/なし}
- UI_SPEC.md: {あり/なし/該当なし}
- TEST_PLAN.md: {あり/なし}
- 実装コード: {ファイル数}
- README.md: {あり/なし}

## 技術スタック
{確定した技術スタックの要約}

## テスト結果
- 合計: {N} / 成功: {N} / 失敗: {N}

## セキュリティ監査結果
- CRITICAL: {N} / WARNING: {N}

## Operations への引き継ぎ（service の場合）
{デプロイに必要な情報、環境変数一覧、DB要件等}
```

### OPS_RESULT.md

Final output of Operations Flow. Used for final deployment readiness confirmation.

```markdown
# Operations Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Operations プラン: {Light | Standard | Full}

## 成果物一覧
| ファイル | 内容 | 状態 |
|---------|------|------|
| Dockerfile | コンテナ定義 | あり/なし |
| docker-compose.yml | コンテナ構成 | あり/なし |
| .github/workflows/ci.yml | CI/CD | あり/なし |
| .env.example | 環境変数テンプレート | あり/なし |
| DB_OPS.md | DB運用ガイド | あり/なし |
| OBSERVABILITY.md | 可観測性設計 | あり/なし |
| OPS_PLAN.md | 運用計画書 | あり |

## デプロイ準備状態
- [ ] Dockerfile / docker-compose 作成済み
- [ ] CI/CD パイプライン構築済み
- [ ] 環境変数テンプレート作成済み
- [ ] DB運用ガイド作成済み（該当する場合）
- [ ] 可観測性設計完了（該当する場合）
- [ ] デプロイ手順書作成済み
- [ ] ロールバック手順策定済み
- [ ] インシデント対応プレイブック作成済み

## 未対応事項
{残タスクがあれば記載}
```

---

## Flow Orchestrator Common Rules

Rules shared by all flow orchestrators (discovery-flow, delivery-flow, operations-flow).
Each orchestrator's agent definition covers domain-specific logic (triage, rollback, progress display).
The common patterns below must not be duplicated in individual orchestrator files.

### How to Launch Agents

Flow orchestrators operate in the **Claude Code main context**.
Launch each phase's agent using the `subagent_type` parameter of the the appropriate tool.

```
Agent(
  subagent_type: "{agent-name}",   # e.g.: "interviewer", "spec-designer"
  prompt: "{instructions for the agent}",
  description: "{3-5 word summary}"
)
```

- Receive the agent's result (`AGENT_RESULT` block) as the tool's return value
- If `STATUS: error` → follow "Common Error Handling" below
- If `STATUS: blocked` → launch the agent specified in `BLOCKED_TARGET` in lightweight mode, obtain an answer, then resume the original agent
- If `STATUS: suspended` → report to the user and provide resume instructions

### Auto-Approve Mode

When a file named `.aphelion-auto-approve` (or the legacy `.telescope-auto-approve`) exists in the project root, auto-approve mode is activated. This mode is designed for automated evaluation by external systems (e.g., Ouroboros evaluator).

#### Activation Check

At flow startup, check for the presence of either `.aphelion-auto-approve` (preferred) or `.telescope-auto-approve` (legacy, kept for backward compatibility):
```bash
ls .aphelion-auto-approve .telescope-auto-approve 2>/dev/null
```
If either file exists, set `AUTO_APPROVE: true` for the entire flow session. `.aphelion-auto-approve` takes precedence when both are present.

#### Auto-Approve Behavior

When `AUTO_APPROVE: true`:

| Decision Point | Auto-Selected Option | Notes |
|---------------|---------------------|-------|
| Triage approval | "承認して開始" | Accept the auto-determined plan |
| Phase approval gate | "承認して続行" | Proceed to next phase |
| Existing file confirmation | "続きから始める" | Reuse existing artifacts |
| Error handling | "再実行" | Retry up to 3 times per agent, then stop |
| Session interruption | "再開する" | Resume automatically |

#### Logging Requirement

Even in auto-approve mode, the orchestrator MUST still output:
1. Phase start notifications (`▶ Phase N/M: ...`)
2. Phase completion summaries (artifacts and content summary)
3. Final completion summary with all phase results
4. AGENT_RESULT blocks from all agents

These outputs serve as the evaluation data collected by external systems.

#### Safety Limits

- Error retry: maximum 3 times per agent (then stop with `STATUS: error`)
- Rollback: maximum 3 times (same as manual mode)
- If both limits are hit, output a summary and stop the workflow

#### Auto-Approve File Format

The `.aphelion-auto-approve` (or legacy `.telescope-auto-approve`) file may optionally contain configuration overrides:
```
# Optional: override triage plan (skip triage questions)
PLAN: Standard

# Optional: override PRODUCT_TYPE
PRODUCT_TYPE: service

# Optional: override HAS_UI
HAS_UI: true
```
If the file is empty, use default triage behavior and auto-approve the result.

---

### Phase Execution Loop

Each phase follows this common loop. Domain-specific steps (rollback checks, etc.) are additions on top of this template.

```
[Phase N 開始]
  1. フェーズ開始をユーザーに通知する
     「▶ Phase N/{総フェーズ数}: {エージェント名} を起動します」
  2. 前段の成果物パスを含む指示でエージェントを起動する
  3. エージェントの AGENT_RESULT ブロックを確認する
  4. STATUS を判定し、error / blocked / failure に対応する
     （failure の場合はドメイン固有の差し戻しルールに従う）
  5. AUTO_APPROVE: true の場合:
     → 「承認して続行」を自動選択し、テキスト出力のみ行う（user prompt をスキップ）
     AUTO_APPROVE: false の場合:
     → 承認ゲート（下記「Approval Gate」参照）で停止しユーザーに承認を求める
  6. AUTO_APPROVE: false の場合のみ: ユーザーの返答を待つ（絶対に自動で進まない）
  7. 次フェーズへ
```

---

## Common Error Handling

When an agent returns `STATUS: error`, the orchestrator must:
1. Report the error content to the user via text output
2. Use asking the user to let the user choose a response:

```json
{
  "questions": [{
    "question": "{エージェント名} がエラーを報告しました。どう対応しますか？",
    "header": "エラー対応",
    "options": [
      {"label": "再実行", "description": "同じエージェントをもう一度実行する"},
      {"label": "修正して再実行", "description": "修正内容を指示してから再実行する"},
      {"label": "スキップ", "description": "このエージェントをスキップして次へ進む"},
      {"label": "中断", "description": "ワークフローを停止する"}
    ],
    "multiSelect": false
  }]
}
```

3. When `AUTO_APPROVE: false`: Never re-execute automatically without user instruction
4. When `AUTO_APPROVE: true`: Automatically select "再実行". Track retry count per agent. If retry count exceeds 3, stop the workflow and output an error summary

---

## Approval Gate

Common approval gate format shared by all flow orchestrators. After each phase completion, the orchestrator must stop and request user approval.

### Approval Gate Procedure

1. First, output a phase completion summary as text:

```
Phase {N} 完了: {エージェント名}

【生成された成果物】
  - {ファイルパス}: {概要}

【内容サマリー】
{3〜5行で要約}
```

2. Then request approval via asking the user:

```json
{
  "questions": [{
    "question": "Phase {N} の成果物を確認しました。次のフェーズに進みますか？",
    "header": "Phase {N}",
    "options": [
      {"label": "承認して続行", "description": "Phase {N+1}: {次のエージェント名} に進む"},
      {"label": "修正を指示", "description": "このフェーズの成果物を修正してから進む"},
      {"label": "中断", "description": "ワークフローを停止する"}
    ],
    "multiSelect": false
  }]
}
```

### Approval Gate Response Handling

| User Selection | Orchestrator Action |
|---------------|-----------|
| "承認して続行" | Proceed to next phase |
| "修正を指示" | Re-execute current phase agent based on modification instructions from the Other field |
| "中断" | Stop the workflow and provide instructions for resuming |

---

## Rollback Rules

Test failures and review CRITICAL findings are automatically rolled back by the flow orchestrator.
Rollbacks are limited to **3 times maximum**. If exceeded, report the situation to the user and ask for their decision.

**Test failure determination:** tester returns `STATUS: failure` if there is 1 or more failure. Partial success (only some tests passing) is treated as failure.

### Test Failure Rollback Flow

```
tester (failure detected)
  → test-designer (root cause analysis / correction feedback)
    → developer (fix implementation)
      → tester (re-run)
```

### Test Failure Root Cause Decision Tree

1. **Is the test code itself buggy?** → Yes: test-designer fixes the test code
2. **Is it a test environment issue?** → Yes: instruct developer to fix environment
3. **Is it an implementation bug?** → Yes: pass correction feedback to developer
4. **Is it a spec deficiency?** → Yes: report to user and ask for decision (do not auto-rollback)

### Review CRITICAL Rollback Flow

```
reviewer (CRITICAL detected) → developer (fix) → tester (re-run) → reviewer (re-review)
```
