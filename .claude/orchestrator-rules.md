# Orchestrator Rules — Aphelion Workflow

This file contains rules specific to flow orchestrators (discovery-flow, delivery-flow, operations-flow).
Each orchestrator must `Read` this file at startup before beginning work.

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
| Standard | Multi-file project | + scaffolder + visual-designer (if UI) + doc-writer |
| Full | Public project / OSS | + releaser |

`security-auditor` **must run on all plans**. `ux-designer` runs only for projects with UI. `visual-designer` runs only for projects with UI **and** plan ≥ Standard; on Minimal / Light it is skipped and `ux-designer` applies its lightweight visual default (see `.claude/agents/ux-designer.md` "Design Policy").

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

### Maintenance Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Patch | Bug fix / security patch / 1–3 files / no breaking change | change-classifier → analyst → developer → tester |
| Minor | Feature addition / refactor / 4–10 files / no breaking change | + impact-analyzer → architect (differential mode) → reviewer |
| Major | Breaking change / DB schema change / 11+ files / major SPEC impact | + security-auditor → handoff to delivery-flow |

`security-auditor` is mandatory only for Major. Patch and Minor may skip it unless `trigger_type` is `security`.

> **About maintenance-flow**: This is a fourth flow independent from Discovery/Delivery/Operations.
> Triggered manually by the user via `/maintenance-flow` for existing-project maintenance tasks.
> Patch/Minor complete standalone; Major hands off to delivery-flow via MAINTENANCE_RESULT.md.

> **SPEC.md / ARCHITECTURE.md preconditions**: If either is missing at flow start,
> `change-classifier` proposes inserting `codebase-analyzer` as Phase 0 (with user confirmation).

> **Two mandatory HITL gates**: (1) After change-classifier — user approves the change plan and triage result.
> (2) At flow completion — user confirms the final state before the flow ends. These gates are never silently
> skipped. Unlike ordinary phase approval gates, they follow a dedicated **3-mode table** that deliberately
> diverges from the standard `AUTO_APPROVE > APPROVAL_MODE > interactive` three-tier priority used elsewhere
> in this document (see §"Approval Mode" below):
>
> | Mode | Gate #1 / Gate #2 behavior |
> |------|------------------------------|
> | `AUTO_APPROVE == true` | Logged and auto-confirmed (does not stop) |
> | `APPROVAL_MODE == autonomous` | **Actually stops** for user confirmation (`AskUserQuestion`) |
> | `APPROVAL_MODE == interactive` | Actually stops for user confirmation (`AskUserQuestion`) |
>
> Only `AUTO_APPROVE` bypasses these gates; `autonomous` alone does not. This is the sole deliberate
> asymmetry against the otherwise-symmetric priority table. Rationale:
> `docs/design-notes/approval-mode-escalation-wiring.md` §6.2.

### Doc Flow Triage

| Plan | Condition | Author agents to launch |
|------|-----------|-------------------------|
| Minimal | 1–2 doc types selected | selected authors only |
| Light | 3–4 doc types selected | selected authors only |
| Standard | 5–6 doc types selected | selected authors |
| Full | All 6 + post-generation template_version verification | all 6 authors + verify step |

> **About doc-flow**: Fifth flow independent from Discovery / Delivery /
> Operations / Maintenance. Generates customer-deliverable docs (HLD / LLD
> / ops manual / API reference / end-user manual / handover) from existing
> Aphelion artifacts. Triggered manually via `/doc-flow`. No automatic
> chaining from other flows.

> **doc type skip rules**: `user-manual` is skipped when UI_SPEC.md is not
> present (PRODUCT_TYPE: tool / library / cli typical). `ops-manual` is
> skipped when no infra artifacts exist.

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

When auto-inserting, the orchestrator calls `sandbox-runner` via the `Agent` tool:

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

## Doc Reviewer Auto-insertion

This section defines how flow orchestrators insert `doc-reviewer`
automatically after agents that produce or update markdown artifacts.

> **Insertion direction**: Unlike `sandbox-runner` (pre-insertion before a
> Bash command runs), `doc-reviewer` is **post-inserted** after the
> upstream agent emits its AGENT_RESULT. The Trigger Conditions /
> Double-Execution Prevention / Standalone Agent Fallback structure mirrors
> Sandbox Runner Auto-insertion but applies to the agent's exit, not entry.

### Trigger Conditions

The orchestrator inserts `doc-reviewer` **after** receiving an
`AGENT_RESULT` from the following agents:

| Flow | Trigger agents | Conditions |
|------|----------------|------------|
| delivery-flow | spec-designer, ux-designer, visual-designer, architect | All plans (Minimal+). ux-designer triggers only when HAS_UI=true. visual-designer triggers only when HAS_UI=true AND plan ≥ Standard |
| discovery-flow | scope-planner | Light/Standard/Full only. Minimal has no scope-planner so doc-reviewer is not triggered structurally. |
| maintenance-flow | analyst-core | Patch: only if `analyst-core.DOCS_UPDATED` contains SPEC.md (no_change → skip). Minor/Major: always |

### Double-Execution Prevention

The orchestrator tracks a per-phase insertion flag
`doc_reviewer_inserted_for_phase_id`. If set for the current phase, skip
auto-insertion. On rollback, the flag is reset before re-insertion.

### Standalone Agent Fallback

When a triggering agent (e.g., spec-designer) is invoked outside a flow
orchestrator, no auto-insertion happens. The user may invoke
`/doc-reviewer` manually.

### Invocation Format

```
Agent(
  subagent_type: "doc-reviewer",
  prompt: "Review markdown artifacts for cross-document consistency.
           triggered_by: {agent_name}
           target_artifacts: {paths}
           phase_id: {phase_id}",
  description: "doc review after {agent_name}"
)
```

Parse the returned `AGENT_RESULT` block:
- `STATUS: success` and `DOC_REVIEW_RESULT: pass` → proceed to approval gate
- `STATUS: failure` and `DOC_REVIEW_RESULT: fail` → enter Doc Review FAIL Rollback Flow (§Rollback Rules)
- `STATUS: error` → follow Common Error Handling
- **Mismatched pair** (`DOC_REVIEW_RESULT: fail` with any STATUS other than `failure`, or
  `DOC_REVIEW_RESULT: pass` with `STATUS: failure`) → treat as a **fail** and enter the
  Doc Review FAIL Rollback Flow. `doc-reviewer.md` requires the two fields to agree
  (§"Severity Definition"); a mismatch is an emitter bug, and defaulting to the safe side
  prevents an inconsistent artifact set from silently passing the gate.

---

## Handoff File Specification

Common format for handoff files used to connect domains.
Each file is read by the next domain's flow orchestrator at startup to verify prerequisites are met.

### Validation Rules

Each flow orchestrator validates required fields of the handoff file at startup. If any are missing, report with `STATUS: error` and ask the user to fix them.

**DISCOVERY_RESULT.md required fields:**
- `PRODUCT_TYPE` (one of: service / tool / library / cli)
- "Project Overview" section (must not be empty)
- "Requirements Summary" section (must not be empty)

**DELIVERY_RESULT.md required fields:**
- `PRODUCT_TYPE`
- "Artifacts" section (must include SPEC.md and ARCHITECTURE.md status; paths resolved per `document-locations.md`, default: `docs/<NAME>.md`)
- "Tech Stack" section (must not be empty)
- "Test Results" section
- "Security Audit Results" section

**OPS_RESULT.md required fields:**
- "Artifacts" table
- "Deployment Readiness" checklist

**MAINTENANCE_RESULT.md required fields:**
- `PRODUCT_TYPE` (one of: service / tool / library / cli)
- "Change Overview" section (must not be empty)
- "impact-analyzer Findings" section (must include `TARGET_FILES` and `REGRESSION_RISK`)
- "security-auditor Pre-audit Results" section (must include CRITICAL / WARNING counts)
- "Handoff to delivery-flow" section (must include `Recommended plan`)

### DISCOVERY_RESULT.md

Final output of Discovery Flow. Input for Delivery Flow's `spec-designer`.

```markdown
# Discovery Result: {Project Name}

> Created: {YYYY-MM-DD}
> Discovery Plan: {Minimal | Light | Standard | Full}

## Project Overview
{1–3 line summary}

## Artifact Type
PRODUCT_TYPE: {service | tool | library | cli}

## Requirements Summary
{Structured requirements summary}

## Scope (if confirmed)
- MVP: {minimum scope}
- IN: {included}
- OUT: {excluded}

## Technical Risks / Constraints (if investigated)
{PoC results, external dependency constraints, etc.}

## Unresolved Items
{Remaining issues to be resolved in Delivery}
```

### DELIVERY_RESULT.md

Final output of Delivery Flow. Input for Operations Flow (for service type).

```markdown
# Delivery Result: {Project Name}

> Created: {YYYY-MM-DD}
> Delivery Plan: {Minimal | Light | Standard | Full}
> PRODUCT_TYPE: {service | tool}

## Artifacts
- SPEC.md: {present/absent} (resolved path: {docs/SPEC.md | SPEC.md})
- ARCHITECTURE.md: {present/absent} (resolved path: {docs/ARCHITECTURE.md | ARCHITECTURE.md})
- UI_SPEC.md: {present/absent/N/A} (resolved path: {docs/UI_SPEC.md | UI_SPEC.md | N/A})
- VISUAL_SPEC.md: {present/absent/N/A} (resolved path: {docs/VISUAL_SPEC.md | VISUAL_SPEC.md | N/A})
- TEST_PLAN.md: {present/absent} (resolved path: {docs/TEST_PLAN.md | TEST_PLAN.md})
- Implementation code: {file count}
- README.md: {present/absent}

## Tech Stack
{Summary of confirmed tech stack}

## Test Results
- Total: {N} / Pass: {N} / Fail: {N}

## Security Audit Results
- CRITICAL: {N} / WARNING: {N}

## Handoff to Operations (for service type)
{Information required for deployment, environment variable list, DB requirements, etc.}
```

### OPS_RESULT.md

Final output of Operations Flow. Used for final deployment readiness confirmation.

```markdown
# Operations Result: {Project Name}

> Created: {YYYY-MM-DD}
> Operations Plan: {Light | Standard | Full}

## Artifacts
| File | Description | Status |
|------|-------------|--------|
| Dockerfile | Container definition | present/absent |
| docker-compose.yml | Container configuration | present/absent |
| .github/workflows/ci.yml | CI/CD | present/absent |
| .env.example | Environment variable template | present/absent |
| DB_OPS.md | DB operations guide | present/absent |
| OBSERVABILITY.md | Observability design | present/absent |
| OPS_PLAN.md | Operations plan | present |

## Deployment Readiness
- [ ] Dockerfile / docker-compose created
- [ ] CI/CD pipeline configured
- [ ] Environment variable template created
- [ ] DB operations guide created (if applicable)
- [ ] Observability design complete (if applicable)
- [ ] Deployment procedure documented
- [ ] Rollback procedure defined
- [ ] Incident response playbook created

## Unresolved Items
{List any remaining tasks}
```

### MAINTENANCE_RESULT.md

Final output of Maintenance Flow's **Major** plan only. Input for Delivery Flow,
which reads it at startup as a pre-processing handoff (see `delivery-flow.md`
§"Startup Validation"). Patch / Minor plans never produce this file.

This block is the **canonical template**; `maintenance-flow.md` references it
rather than restating it.

```markdown
# Maintenance Result: {Change summary}

> Created: {YYYY-MM-DD}
> Maintenance Plan: Major
> Trigger type: {bug | feature | tech_debt | performance | security}
> Priority: {P1 | P2 | P3 | P4}

## Change Overview
{1–3 line summary}

## change-classifier Verdict
- PLAN: Major
- BREAKING_CHANGE: {true | false}
- SPEC_IMPACT: major
- RATIONALE: {RATIONALE from change-classifier}

## impact-analyzer Findings
- TARGET_FILES: {TARGET_FILES list}
- BREAKING_API_CHANGES: {list or "none"}
- DB_SCHEMA_CHANGES: {true | false}
- REGRESSION_RISK: {low | medium | high}
- RECOMMENDED_TEST_SCOPE: {unit | integration | e2e}

## analyst-core Differential Design Approach
- SPEC.md diff: {from analyst-core AGENT_RESULT}
- ARCHITECTURE.md impact: {areas where architect will apply differential design}
- GitHub Issue URL: {GITHUB_ISSUE from analyst-core}

## security-auditor Pre-audit Results
- CRITICAL: {N}
- WARNING: {N}
- Required pre-remediation items: {list}

## Handoff to delivery-flow
- Recommended plan: Standard | Full
- Additional notes: {considerations for delivery-flow execution}

## PRODUCT_TYPE
{Resolve via: SPEC.md > project-rules.md (`Product Type:` line under `## Project Overview`) > default `service`}
```

### DOC_FLOW_RESULT.md

Final output of Doc Flow. Consumed by users (and optionally by
`/doc-reviewer` for cross-deliverable consistency review).

**DOC_FLOW_RESULT.md required fields:**
- `Slug` (output directory name under docs/deliverables/)
- `Output Language` (ja | en)
- "Generated Deliverables" table (must list at least 1 row)
- "Skipped Types" section (may be empty)
- "Suggested Next Steps" section

---

## Flow Orchestrator Common Rules

Rules shared by all flow orchestrators (discovery-flow, delivery-flow, operations-flow).
Each orchestrator's agent definition covers domain-specific logic (triage, rollback, progress display).
The common patterns below must not be duplicated in individual orchestrator files.

### How to Launch Agents

Flow orchestrators operate in the **Claude Code main context**.
Launch each phase's agent using the `subagent_type` parameter of the `Agent` tool.

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
| Triage approval | "Approve and start" | Accept the auto-determined plan |
| Phase approval gate | "Approve and continue" | Proceed to next phase |
| Existing file confirmation | "Continue from here" | Reuse existing artifacts |
| Error handling | "Retry" | Retry up to 3 times per agent, then stop |
| Session interruption | "Resume" | Resume automatically |

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

## Approval Mode (autonomous / interactive)

This section defines how each flow orchestrator determines and applies the `APPROVAL_MODE`
session variable. `APPROVAL_MODE` controls whether HITL approval gates are skipped (`autonomous`)
or enforced (`interactive`). It is distinct from `AUTO_APPROVE`, which is a higher-priority
external-evaluation flag that bypasses everything including escalation gates.

### Triage-Linked Default

This is the **single canonical table** for APPROVAL_MODE defaults across all five flows,
including Maintenance Flow. Maintenance's Patch/Minor/Major plans map onto it by equivalence
(see "Maintenance Equivalent" column) rather than defining a second table — `maintenance-flow.md`
must reference this table, not restate its own mapping (see
`docs/design-notes/approval-mode-escalation-wiring.md` §6.3).

| Triage Plan | Maintenance Equivalent | Default APPROVAL_MODE | User override allowed |
|-------------|------------------------|------------------------|-----------------------|
| Minimal     | Patch                   | `autonomous`         | — (fixed)             |
| Light       | —                        | `autonomous`         | — (fixed)             |
| Standard    | Minor                    | `interactive`        | Yes — can relax to `autonomous` (see below) |
| Full        | Major                    | `interactive`        | No — forced `interactive` even if user requests autonomous |

> **Breaking change note (#179)**: Maintenance's Minor plan previously defaulted to `autonomous`
> under a local (now-removed) mapping in `maintenance-flow.md`. Under this canonical table, Minor≒Standard
> defaults to `interactive`. The `## Approval Mode` → `Standard: autonomous` project-rules.md override key
> relaxes both Delivery/Discovery/Doc's Standard plan **and** Maintenance's Minor plan — they share the
> same override key by design, since they share the same table row.

### APPROVAL_MODE Resolution Order (ADR-005)

Resolve `APPROVAL_MODE` in **two stages**. The triage-rule default (step 2 below) requires the
finalized Triage Plan, which is only known *after* triage completes — resolving everything in a
single step at "flow startup" (before triage runs) is order-inconsistent (see
`docs/design-notes/approval-mode-escalation-wiring.md` §5.4 for the discovered defect).

- **Stage 1 (at flow startup, before triage)**: set a provisional `APPROVAL_MODE: interactive`
  (fail-safe default). Also resolve `AUTO_APPROVE` per the Auto-Approve Mode check — this does
  not depend on triage and is resolved once.
- **Stage 2 (immediately after the triage plan is finalized)**: re-resolve `APPROVAL_MODE` to its
  final value using steps 1–3 below and hold it as the session variable for the remainder of the
  flow. Log the final value: `"Approval mode: {autonomous | interactive}"` (or
  `"AUTO_APPROVE overrides APPROVAL_MODE"` when `AUTO_APPROVE == true`).

Steps 1–3 (used to compute both the Stage 1 provisional value and the Stage 2 final value):

1. If `AUTO_APPROVE == true`: `APPROVAL_MODE` is not consulted for gate decisions
   (log its triage-default value for audit purposes only).
2. Triage-rule default (see table above).
3. **Standard-only relaxation**: if (a) the user explicitly requests autonomous at startup,
   or (b) `.claude/rules/project-rules.md` contains a `## Approval Mode` section with
   `Standard: autonomous`, override the Standard default to `autonomous`.
   - **Full plan never relaxes**: if autonomous is requested for a Full plan, emit a warning
     and maintain `interactive`.
   - When `project-rules.md` has no `## Approval Mode` section, fall back to the triage default.

### Three-Tier Priority: AUTO_APPROVE > APPROVAL_MODE (ADR-002)

```
Priority 1 (highest): AUTO_APPROVE == true
  → All gates (including escalation) are auto-confirmed. "Approve and continue" is
    automatically selected (text output only, no AskUserQuestion).
  → Note: .aphelion-auto-approve and legacy .telescope-auto-approve filenames are
    immutable (Ouroboros external-evaluation compatibility). Never rename these files.

Priority 2: AUTO_APPROVE == false AND APPROVAL_MODE == autonomous
  → HITL approval gates are skipped (phase completion summary output as text).
  → Escalation conditions (see below) trigger a pause for user confirmation.

Priority 3 (default): AUTO_APPROVE == false AND APPROVAL_MODE == interactive
  → All approval gates stop and wait for user confirmation (existing behavior).
```

### Invariant Rules (§5.3)

The following must NOT be relaxed regardless of `APPROVAL_MODE` or `AUTO_APPROVE`:
- `doc-reviewer` auto-insertion and its automatic rollback chain
- `security-auditor` execution
- `reviewer` execution
- **`change-classifier`'s internal G1 gate (maintenance Gate #1)** — see "In-agent Approval
  Gates" below. Unlike other G1 gates, it is NOT symmetrized to the standard three-tier
  priority: it always stops under `APPROVAL_MODE: autonomous` and is auto-confirmed only when
  `AUTO_APPROVE == true`. This is the sole exception to the G1 symmetrization rule (see
  `docs/design-notes/approval-mode-escalation-wiring.md` §6.4).

These agents always run. Only the **HITL approval gate** (the AskUserQuestion pause between
phases) is skipped in `autonomous` mode. Automatic quality checks are never bypassed.

### In-agent Approval Gates (G1 / G2 / G3)

`APPROVAL_MODE` / `AUTO_APPROVE` are orchestrator session variables. Sub-agents run in
independent contexts and cannot read them unless the orchestrator injects them into the
spawn prompt (see "Phase Execution Loop" step 2 below). This section defines how sub-agent
*internal* `AskUserQuestion` gates — distinct from the orchestrator's own phase approval
gates — behave once the value is injected.

**Gate types:**

| Type | Definition | Examples | APPROVAL_MODE applies? |
|------|------------|----------|------------------------|
| **G1 — approval gate** | Confirms an intermediate work-product; structurally identical to an orchestrator phase gate | `change-classifier` §User Approval Gate, `impact-analyzer` §User Approval Gate, `analyst-core` §Step 3, `codebase-analyzer` §User Confirmation, `scope-planner` handoff-not-ready gate | Yes — three-tier priority below (except the invariant exception above) |
| **G2 — input intake** | Collects input required to start processing; not an approval | `interviewer`, `analyst-intake` (fresh-mode intake), `visual-designer` intake, `rules-designer`, `codebase-analyzer` output-location question, `user-manual-author` degraded-output confirmation | No — always runs. Only the **unattended default** (used when `AUTO_APPROVE == true` and no human is present) must be documented per agent |
| **G3 — reference only** | A general "ask if unclear" pointer, not a gate | `spec-designer` L141 (`user-questions.md` reference) | No — no behavior change |

**Three-tier priority for G1 gates** (same shape as the orchestrator's own gate priority):

| Mode | G1 gate behavior |
|------|-------------------|
| `AUTO_APPROVE == true` | Auto-confirm — adopt the agent's recommended option; emit a one-line text summary instead of calling `AskUserQuestion` |
| `APPROVAL_MODE == autonomous` | Skip and adopt the recommended option (text summary only) |
| `APPROVAL_MODE == interactive` (default / fail-safe when the value is absent) | Stop (`AskUserQuestion`) |

**Invariant exception**: `change-classifier`'s G1 gate (maintenance Gate #1) does NOT follow
this three-tier table — see Invariant Rules above.

**AUTO_APPROVE hang fix**: prior to the propagation mechanism defined in "Phase Execution
Loop" step 2, G1 gates had no way to learn `AUTO_APPROVE == true` and would stop even during
unattended (Ouroboros) evaluation runs, in violation of the "auto-approve mode is never
silently blocked" contract. The injection closes this gap (see
`docs/design-notes/approval-mode-escalation-wiring.md` §5.3/§6.4).

### Escalation Conditions (ADR-003)

Two routes trigger an escalation pause in `autonomous` mode:

**Route A — Agent self-report (`ESCALATION_REQUIRED: true`):**
An agent (developer, architect, security-auditor, tester, reviewer) sets
`ESCALATION_REQUIRED: true` in its `AGENT_RESULT` when:
- A technical decision outside the scope of SPEC.md is required
- A destructive change is needed (DB schema, API compatibility break)
- Multiple valid implementation approaches exist and SPEC.md does not disambiguate

**Route B — Orchestrator detection:**
The orchestrator detects the following conditions directly:
- `security-auditor` returned unresolved CRITICAL findings
- The shared rollback limit (3 times) was reached

### Escalation State Transition (ADR-004)

When an escalation condition is detected in `autonomous` mode:

```
RUNNING_AUTONOMOUS
  │
  ▼ phase complete AGENT_RESULT received
  │
  ├── No escalation → skip HITL gate → proceed to next phase (autonomous)
  │
  └── Escalation detected (Route A or B)
        │
        ▼
    ESCALATION_PAUSED
    AskUserQuestion (escalation gate):
    {
      "questions": [{
        "question": "autonomous 実行中にエスカレーション条件に該当しました: {ESCALATION_REASON}。どう進めますか？",
        "header": "エスカレーション",
        "options": [
          {"label": "承認して続行", "description": "判断を承認し autonomous 実行を再開"},
          {"label": "修正を指示", "description": "現フェーズに修正を指示して再実行"},
          {"label": "中断", "description": "ワークフローを停止"}
        ],
        "multiSelect": false
      }]
    }
        │
        ├── "承認して続行" → RUNNING_AUTONOMOUS (proceed to next phase)
        ├── "修正を指示"   → re-run current phase agent with instructions
        │                     → if ESCALATION_REQUIRED: false → RUNNING_AUTONOMOUS
        │                     → if ESCALATION_REQUIRED: true  → ESCALATION_PAUSED again
        └── "中断"         → workflow stop (provide resume instructions)
```

When `AUTO_APPROVE == true`, the escalation gate is NOT shown. "承認して続行" is auto-selected
and `ESCALATION_REASON` is logged as output (see §9.2-(a) in planning doc).

---

### Phase Execution Loop

Each phase follows this common loop. Domain-specific steps (rollback checks, etc.) are additions on top of this template.

```
[Phase N Start]
  1. Notify the user that the phase is starting:
     "▶ Phase N/{total phases}: launching {agent name}"
  2. Launch the agent with instructions that include the preceding artifact paths.
     ─ MUST carry ARTIFACT_PATHS from the previous agent's AGENT_RESULT into the
       next agent's prompt (verbatim). This prevents per-agent re-resolution from
       drifting between docs/ and root mid-flow (see document-locations.md).
     ─ On the first phase of a flow, build ARTIFACT_PATHS by running
       Glob("{docs/<NAME>.md,<NAME>.md}") once per artifact name. Prefer docs/ on tie
       and emit WARNING_LEGACY_DUPLICATE when both exist.
     ─ MUST also inject the current session's `APPROVAL_MODE` and `AUTO_APPROVE` values into
       every agent's spawn prompt, so in-agent G1 gates can apply the three-tier priority
       (see "In-agent Approval Gates" above). Receiving agents default to `interactive`
       when the value is absent from the prompt (fail-safe). For the analyst chain, this
       value is carried as the `approval_mode` field of `HANDOFF_PAYLOAD` rather than a
       bare prompt injection (see `agent-communication-protocol.md` §"Field Reference").
  3. Verify the agent's AGENT_RESULT block
  4. Evaluate STATUS and handle error / blocked / failure
     (for failure, follow domain-specific rollback rules)
  5. Evaluate the approval decision using the following three-tier priority:

     (a) AUTO_APPROVE == true:
         → Auto-confirm all gates including escalation. Auto-select "Approve and continue"
           and output text only (skip AskUserQuestion).
           * If AGENT_RESULT contains ESCALATION_REQUIRED: true, log the ESCALATION_REASON
             and continue automatically (treated as evaluation data for external systems).

     (b) AUTO_APPROVE == false AND APPROVAL_MODE == autonomous:
         → Check the most recent AGENT_RESULT's ESCALATION_REQUIRED and orchestrator-
           detected conditions (unresolved security CRITICAL / shared rollback limit reached):
            - Any condition met (Route A or B) → STOP at escalation gate
              (see §"Approval Mode" → "Escalation State Transition"). Do not auto-continue.
            - No condition met → skip the HITL approval gate. Output phase completion
              summary as text and proceed to next phase.
         * Invariant: even in autonomous mode, doc-reviewer / security-auditor / reviewer
           auto-insertion and automatic rollback are maintained (only the HITL gate is relaxed).

     (c) AUTO_APPROVE == false AND APPROVAL_MODE == interactive:
         → Stop at the Approval Gate (see §"Approval Gate" below) and request user approval.

  6. Only if step 5 resulted in a stop — either (b) escalation gate or (c) normal gate:
     wait for the user's response (never advance automatically).
     Cases (a) and (b) no-escalation proceed to the next phase without waiting.
  7. Proceed to the next phase
```

---

## Common Error Handling

When an agent returns `STATUS: error`, the orchestrator must:
1. Report the error content to the user via text output
2. Use `AskUserQuestion` to let the user choose a response:

```json
{
  "questions": [{
    "question": "{agent name} reported an error. How would you like to proceed?",
    "header": "Error Handling",
    "options": [
      {"label": "Retry", "description": "Run the same agent again"},
      {"label": "Retry with fix", "description": "Provide correction instructions and re-run"},
      {"label": "Skip", "description": "Skip this agent and proceed to the next"},
      {"label": "Abort", "description": "Stop the workflow"}
    ],
    "multiSelect": false
  }]
}
```

3. When `AUTO_APPROVE: false`: Never re-execute automatically without user instruction
4. When `AUTO_APPROVE: true`: Automatically select "Retry". Track retry count per agent. If retry count exceeds 3, stop the workflow and output an error summary

---

## Approval Gate

Common approval gate format shared by all flow orchestrators. After each phase completion, the orchestrator must stop and request user approval.

### Approval Gate Procedure

1. First, output a phase completion summary as text:

```
Phase {N} complete: {agent name}

[Generated Artifacts]
  - {file path}: {summary}

[Content Summary]
{3–5 line summary}
```

2. Then request approval via `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Phase {N} artifacts reviewed. Proceed to the next phase?",
    "header": "Phase {N}",
    "options": [
      {"label": "Approve and continue", "description": "Proceed to Phase {N+1}: {next agent name}"},
      {"label": "Request modification", "description": "Revise this phase's artifacts before proceeding"},
      {"label": "Abort", "description": "Stop the workflow"}
    ],
    "multiSelect": false
  }]
}
```

### Approval Gate Response Handling

| User Selection | Orchestrator Action |
|---------------|-----------|
| "Approve and continue" | Proceed to next phase |
| "Request modification" | Re-execute current phase agent based on modification instructions from the Other field |
| "Abort" | Stop the workflow and provide instructions for resuming |

---

## Rollback Rules

Test failures, review CRITICAL findings, and doc review FAIL results are automatically
rolled back by the flow orchestrator.

**Test failure determination:** tester returns `STATUS: failure` if there is 1 or more failure. Partial success (only some tests passing) is treated as failure.

### Rollback Limit (Common)

Rollbacks are limited to **3 times maximum**, applied as a single shared
limit across:
- Test failure rollback
- Review CRITICAL rollback
- Security audit CRITICAL rollback
- Doc review FAIL rollback

If the limit is exceeded, report to the user and ask for their decision
(see "Approve despite findings" option in Approval Gate after Doc Review FAIL, when applicable).
The per-flow rollback sections below inherit this limit and must not
declare their own.

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

### Doc Review FAIL Rollback Flow

```
doc-reviewer (DOC_REVIEW_RESULT: fail)
  → triggering agent (spec-designer / ux-designer / visual-designer /
                      architect / scope-planner / analyst) for fix
    → doc-reviewer (re-check)
```

Rollback prompt to the triggering agent:

```
## Doc Review Rollback

### Rollback source
doc-reviewer

### Inconsistencies
{INCONSISTENCY_ITEMS list with perspective and evidence}

### Files to fix
{file paths from INCONSISTENCY_ITEMS}

### Constraints
- Do not break existing UCs or other documents
- Re-emit AGENT_RESULT after fixing
- If editing both ARCHITECTURE.md and SPEC.md, update Last updated in both
```

After rollback, the orchestrator clears the
`doc_reviewer_inserted_for_phase_id` flag and re-runs `doc-reviewer`.

---

### Approval Gate after Doc Review FAIL (rollback limit exceeded)

When `doc-reviewer` repeatedly fails and the shared rollback limit is
reached, the orchestrator presents a special gate. **This gate fires in
both `interactive` and `autonomous` mode** — reaching the rollback limit
is an escalation condition (Route B) that always requires user confirmation.

```json
{
  "questions": [{
    "question": "doc-reviewer reported {N} inconsistencies after 3 rollbacks. How would you like to proceed?",
    "header": "Doc review failed",
    "options": [
      {"label": "Continue rollback", "description": "Override the 3-time limit and try once more"},
      {"label": "Approve despite findings", "description": "Accept INCONSISTENCY findings and continue to next phase"},
      {"label": "Abort", "description": "Stop the workflow"}
    ],
    "multiSelect": false
  }]
}
```

If "Approve despite findings" is selected, record this in the phase
completion log and tag the eventual AGENT_RESULT chain with
`DOC_REVIEW_OVERRIDE: true` so downstream artifacts (e.g.,
DELIVERY_RESULT.md) reflect that an override occurred.
