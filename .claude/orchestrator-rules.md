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
> (2) At flow completion — user confirms the final state before the flow ends. These gates are never skipped
> even in auto-approve mode (they are logged but auto-confirmed).

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
| maintenance-flow | analyst | Patch: only if `analyst.DOCS_UPDATED` contains SPEC.md (no_change → skip). Minor/Major: always |

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
- "Artifacts" section (must include SPEC.md and ARCHITECTURE.md status)
- "Tech Stack" section (must not be empty)
- "Test Results" section
- "Security Audit Results" section

**OPS_RESULT.md required fields:**
- "Artifacts" table
- "Deployment Readiness" checklist

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
- SPEC.md: {present/absent}
- ARCHITECTURE.md: {present/absent}
- UI_SPEC.md: {present/absent/N/A}
- VISUAL_SPEC.md: {present/absent/N/A}
- TEST_PLAN.md: {present/absent}
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

### Phase Execution Loop

Each phase follows this common loop. Domain-specific steps (rollback checks, etc.) are additions on top of this template.

```
[Phase N Start]
  1. Notify the user that the phase is starting:
     "▶ Phase N/{total phases}: launching {agent name}"
  2. Launch the agent with instructions that include the preceding artifact paths
  3. Verify the agent's AGENT_RESULT block
  4. Evaluate STATUS and handle error / blocked / failure
     (for failure, follow domain-specific rollback rules)
  5. If AUTO_APPROVE: true:
     → Auto-select "Approve and continue" and output text only (skip AskUserQuestion)
     If AUTO_APPROVE: false:
     → Stop at the approval gate (see "Approval Gate" below) and request user approval
  6. Only if AUTO_APPROVE: false: wait for the user's response (never advance automatically)
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
reached, the orchestrator presents a special gate:

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
