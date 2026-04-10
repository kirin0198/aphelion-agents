# global rules — Telescope Workflow Common Rules

This file defines the common rules referenced by all agents in the Telescope workflow.
Agent-specific rules are documented in the individual files under `agents/`.


---

## Telescope Workflow Model

Telescope divides the entire project lifecycle into three domains — **Discovery (requirements exploration) → Delivery (design & implementation) → Operations (deploy & operations)** — each managed by an independent orchestrator (flow).

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

## Directory Structure

Agent definitions are stored in `agents/` (the standard Claude Code location).

```
agents/
├── discovery-flow.md       # Discovery Flow (orchestrator)
├── interviewer.md
├── researcher.md
├── poc-engineer.md
├── concept-validator.md
├── scope-planner.md
├── rules-designer.md
├── delivery-flow.md        # Delivery Flow (orchestrator)
├── spec-designer.md
├── ux-designer.md
├── architect.md
├── scaffolder.md
├── developer.md
├── test-designer.md
├── e2e-test-designer.md
├── tester.md
├── reviewer.md
├── security-auditor.md
├── doc-writer.md
├── releaser.md
├── analyst.md
├── codebase-analyzer.md    # Standalone (existing project onboarding)
├── operations-flow.md      # Operations Flow (orchestrator)
├── infra-builder.md
├── db-ops.md
├── observability.md
└── ops-planner.md
```

---

## Language Rules

- Code, variable names, commit messages: **English**
- Agent definition files (instructions, rules, guidelines): **English**
- Code comments, user-facing documentation, reports to user: **Japanese**
- AGENT_RESULT block keys/values: **English**
- User-facing CLI output (user prompt content, approval gates, progress displays): **Japanese**

---

## Inter-Agent Communication Protocol

### AGENT_RESULT Block (Required)

All agents must output an `AGENT_RESULT` block upon work completion.
Each domain's flow orchestrator parses this output to determine next-phase decisions.

> **Flow orchestrator exception:** Discovery Flow / Delivery Flow / Operations Flow themselves do not output `AGENT_RESULT`. The flow orchestrator's final artifact is the handoff file (e.g., DISCOVERY_RESULT.md), and completion is reported via the approval gate.

```
AGENT_RESULT: {agent-name}
STATUS: success | error | failure | suspended | blocked | approved | conditional | rejected
...(agent-specific fields)
NEXT: {next-agent-name | done | suspended}
```

### STATUS Definitions

| STATUS | Meaning | Orchestrator Action |
|--------|---------|-------------------|
| `success` | Completed successfully | Proceed to approval gate |
| `error` | Failed to complete due to error | Report to user and ask for decision |
| `failure` | Quality issue (e.g., test failure) | Follow rollback rules |
| `suspended` | Session interrupted | Prompt user to resume |
| `blocked` | Cannot continue due to design ambiguity | Flow orchestrator launches lightweight query to the target agent |
| `approved` / `conditional` / `rejected` | Review result | Rollback or completion decision |

### blocked STATUS Usage

Used when `developer` discovers design ambiguity or contradiction during implementation.

```
AGENT_RESULT: developer
STATUS: blocked
BLOCKED_REASON: {reason}
BLOCKED_TARGET: architect
CURRENT_TASK: TASK-005
NEXT: suspended
```

---

## Git Rules

### Commit Granularity
- One commit per task (do not bundle multiple tasks)
- Test code is committed the same way as implementation code

### Staging (Important)
- `git add -A` is **prohibited** (prevents accidental inclusion of sensitive/unnecessary files)
- Use `git add {target-files}` to stage explicitly
- Never commit `.env`, `credentials.*`, `*.secret`, etc.

### Commit Message Format

```
{prefix}: {task-name} (TASK-{N})

- {bullet points of implementation details}
- Related UC: UC-XXX (if applicable)
```

| prefix | Usage |
|--------|-------|
| `feat:` | New feature / new endpoint |
| `fix:` | Bug fix |
| `refactor:` | Refactoring |
| `test:` | Test additions/modifications |
| `docs:` | Documentation additions/modifications |
| `chore:` | Configuration / environment |
| `ci:` | CI/CD related |
| `ops:` | Infrastructure / operations related |

---

## Document Versioning

### Recording Update History

When updating any design document (SPEC.md, ARCHITECTURE.md, UI_SPEC.md, TEST_PLAN.md), record the update date at the beginning of the file.

```markdown
> 最終更新: {YYYY-MM-DD}
> 更新履歴:
>   - {YYYY-MM-DD}: {変更概要}
```

### Traceability

- `architect` records which version of SPEC.md was used as the basis for design at the top of `ARCHITECTURE.md`
- `developer` records which version of ARCHITECTURE.md was used as the basis for implementation in `TASK.md`
- Each flow orchestrator records the artifact version from the previous domain in the handoff file

### TASK.md Format

State file used by `developer` to persist implementation progress across sessions.
Generated at implementation start and updated upon each task completion.

```markdown
# TASK.md

> 参照元: ARCHITECTURE.md ({バージョン or 最終更新日})

## フェーズ: {フェーズ名}
最終更新: {日時}
ステータス: 進行中

## タスク一覧

### Phase {N}
- [ ] TASK-001: {タスク名} | 対象ファイル: src/...
- [ ] TASK-002: {タスク名} | 対象ファイル: src/...

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
```

---

## File Operation Principles

- Always read the contents of an existing file before overwriting it
- Do not delete files (unless the user explicitly instructs it)
- Do not create directories not listed in design documents (SPEC.md / ARCHITECTURE.md)

---

## User Questions

When there are unclear points, **stop work and ask**. Prioritize confirmation over guessing.

### Structured User Questions (Recommended)

For questions where choices can be presented, always use the asking the user tool.
Users can select options with arrow keys, making it more efficient than text input.

```json
{
  "questions": [{
    "question": "{具体的な質問文}？",
    "header": "{短いラベル}",
    "options": [
      {"label": "{選択肢1}", "description": "{補足説明}"},
      {"label": "{選択肢2}", "description": "{補足説明}"}
    ],
    "multiSelect": false
  }]
}
```

**Usage Guidelines:**

| Situation | Tool to Use |
|-----------|------------|
| Questions with 2-4 choices | asking the user |
| Multiple independent questions bundled together (max 4) | asking the user (multiple questions) |
| Questions requiring multiple selections | asking the user (`multiSelect: true`) |
| Code/mockup comparisons needed | asking the user (`preview` field) |
| Free-text only questions with no presentable choices | Text output |

**Notes:**
- Each question should have 2-4 options (users can always use "Other" for free-text input)
- Place recommended options first with `(推奨)` suffix
- Up to 4 questions per call. Bundle related questions together

### Text Output Fallback

Use text output only for free-text questions where choices cannot be presented:
```
⏸ 確認事項があります

{質問内容を箇条書きで記載}

回答をいただいてから作業を再開します。
```

---

## Build Verification Commands by Tech Stack

### Syntax Check + Lint/Format Gate

Developer runs syntax checks plus lint/format upon task completion.
Lint errors **must be fixed before testing**.

| Language/FW | Syntax Check | Lint/Format | Test Execution |
|-------------|-------------|-------------|---------------|
| Python | `python -m py_compile {file}` | `uv run ruff check . && uv run ruff format --check .` | `uv run pytest` or `pytest` |
| TypeScript | `npx tsc --noEmit` | `npx eslint . && npx prettier --check .` | `npm test` or `npx vitest` |
| Go | `go build ./...` | `go vet ./... && gofmt -l .` | `go test ./...` |
| Rust | `cargo check` | `cargo clippy && cargo fmt --check` | `cargo test` |
| Node.js (JS) | `node --check {file}` | `npx eslint .` | `npm test` |

If lint/format tools are not installed, run syntax checks only and note this in the report.

### E2E / GUI Test Execution Commands

| Project Type | Tool | Install | Execute |
|-------------|------|---------|---------|
| Web (Python) | Playwright | `uv add pytest-playwright && playwright install` | `uv run pytest tests/e2e/` |
| Web (TypeScript) | Playwright | `npm i -D @playwright/test && npx playwright install` | `npx playwright test` |
| Desktop (Windows) | pywinauto | `uv add pywinauto` | `uv run pytest tests/gui/` |
| Desktop (cross-platform) | pyautogui | `uv add pyautogui Pillow` | `uv run pytest tests/gui/` |
| Desktop (Electron) | Playwright | Same as Web | `uv run pytest tests/e2e/` |

E2E tests are designed by `e2e-test-designer` and executed by `tester`. They run only when `HAS_UI: true`.

---

## security-auditor Mandatory Execution Rule

`security-auditor` **must run on all Delivery plans (including Minimal)**.

Verification items:
1. OWASP Top 10 verification
2. Dependency vulnerability scanning
3. Authentication/authorization implementation gap detection
4. Hardcoded secrets detection
5. Input validation verification
6. CWE checklist

---

## Library Usage Policy

Before implementing from scratch, search for existing libraries that can solve the problem concisely.
However, follow these guidelines to ensure security and maintainability.

### Core Principles

1. **Prefer standard libraries** — Use the language's standard library when it can accomplish the task
2. **Avoid reinventing the wheel** — Do not build custom solutions in areas where established libraries exist (encryption, auth, date handling, validation, etc.)
3. **Minimize dependencies** — Do not introduce libraries with large dependency trees for small features

### Adoption Criteria

When adopting a library, verify:

- **Actively maintained** — Recent releases exist; issues/PRs are being addressed
- **Widely adopted** — Community track record (download counts, GitHub stars, etc.)
- **No known vulnerabilities** — No unpatched CVEs or security advisories
- **License compatible** — MIT / Apache-2.0 / BSD etc., no conflict with project license
- **Reasonable dependency depth** — Transitive dependencies are not excessive

If any of the above are uncertain, confirm with the user before adoption.

### Responsibility Distribution

| Agent | Role |
|-------|------|
| **architect** | List major libraries in ARCHITECTURE.md. Perform library selection during tech stack selection and record adoption rationale |
| **developer** | Follow ARCHITECTURE.md library list. Search for libraries only when needed functionality is not in the list. Verify adoption criteria before use. Record added libraries in TASK.md |
| **security-auditor** | Final verification via dependency vulnerability scanning (pip-audit / npm audit, etc.) |

### Vulnerability Scanning Commands

| Language | Command |
|----------|---------|
| Python | `pip-audit` or `uv run pip-audit` |
| Node.js | `npm audit` |
| Go | `govulncheck ./...` |
| Rust | `cargo audit` |

---

## Non-Python Project Support

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**.

- Always prioritize the tech stack determined in SPEC.md
- Substitute Python-specific references with equivalent tools for the target tech stack
- If in doubt, confirm with the user

---

# Orchestrator Rules — Telescope Workflow

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

> **About analyst:** `analyst` is a side-entry agent outside the triage flow. It is triggered by bug reports, feature requests, or refactoring requests for existing projects. After completion, Delivery Flow joins from Phase 3 (architect).

> **About codebase-analyzer:** `codebase-analyzer` is a standalone agent for existing projects that lack SPEC.md / ARCHITECTURE.md. It reverse-engineers these documents from the codebase, enabling the project to join the standard workflow via `analyst` → `delivery-flow`.

### Operations Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Light | PaaS / single container | infra-builder → ops-planner |
| Standard | API + DB architecture | + db-ops |
| Full | High availability required | + observability |

> **Why no Minimal plan:** Deploying `PRODUCT_TYPE: service` requires at minimum infrastructure definitions (infra-builder) and an operations plan (ops-planner), so Operations uses Light as the minimum plan.

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

When a file named `.telescope-auto-approve` exists in the project root, auto-approve mode is activated. This mode is designed for automated evaluation by external systems (e.g., Ouroboros evaluator).

#### Activation Check

At flow startup, check for the presence of `.telescope-auto-approve`:
```bash
ls .telescope-auto-approve
```
If the file exists, set `AUTO_APPROVE: true` for the entire flow session.

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

The `.telescope-auto-approve` file may optionally contain configuration overrides:
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
