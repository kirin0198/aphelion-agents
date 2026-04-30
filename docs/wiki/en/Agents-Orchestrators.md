# Agents Reference: Orchestrators & Cross-Cutting

> **Language**: [English](../en/Agents-Orchestrators.md) | [日本語](../ja/Agents-Orchestrators.md)
> **Last updated**: 2026-04-30
> **Update history**:
>   - 2026-04-30: Add doc-reviewer (Quality Agents) per #91
>   - 2026-04-26: Sync with #62, #66, #72, #74 (issue #77)
>   - 2026-04-25: split from Agents-Reference.md; #42
> **Audience**: Agent developers

This page is one of five pages split from the original Agents-Reference.md (#42). It covers Flow Orchestrators, Safety Agents, Quality Agents, and Standalone Agents (cross-cutting agents). See the sibling pages for domain-specific agents: [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md).

## Table of Contents

- [Flow Orchestrators](#flow-orchestrators)
- [Safety Agents](#safety-agents)
- [Quality Agents](#quality-agents)
- [Standalone Agents](#standalone-agents)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Flow Orchestrators

Flow orchestrators manage entire domains. They are not triage-selected agents but session entry points.

### discovery-flow

- **Canonical**: [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md)
- **Domain**: Orchestrator (Discovery)
- **Responsibility**: Manages the entire requirements exploration flow. Performs triage, launches agents in sequence, handles approvals and rollbacks, generates DISCOVERY_RESULT.md.
- **Inputs**: User's project description (via command argument)
- **Outputs**: DISCOVERY_RESULT.md (final handoff), INTERVIEW_RESULT.md, RESEARCH_RESULT.md, POC_RESULT.md, CONCEPT_VALIDATION.md, SCOPE_PLAN.md
- **AGENT_RESULT fields**: N/A (orchestrators do not emit AGENT_RESULT; they produce handoff files)
- **NEXT conditions**: Prompts user to run `/delivery-flow` after completion

### delivery-flow

- **Canonical**: [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md)
- **Domain**: Orchestrator (Delivery)
- **Responsibility**: Manages the entire design, implementation, testing, and review flow. Reads DISCOVERY_RESULT.md, performs triage, handles rollbacks on test/review failures, generates DELIVERY_RESULT.md.
- **Inputs**: DISCOVERY_RESULT.md (optional), existing SPEC.md / ARCHITECTURE.md
- **Outputs**: DELIVERY_RESULT.md (final handoff), SPEC.md, ARCHITECTURE.md, implementation code, TEST_PLAN.md, SECURITY_AUDIT.md, README.md
- **AGENT_RESULT fields**: N/A
- **NEXT conditions**: Prompts user to run `/operations-flow` (if service) after completion

### operations-flow

- **Canonical**: [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md)
- **Domain**: Orchestrator (Operations)
- **Responsibility**: Manages the deploy and operations flow. Only for PRODUCT_TYPE: service. Reads DELIVERY_RESULT.md, performs triage, generates OPS_RESULT.md.
- **Inputs**: DELIVERY_RESULT.md (required), ARCHITECTURE.md, SPEC.md
- **Outputs**: OPS_RESULT.md, Dockerfile, docker-compose.yml, CI/CD pipeline, DB_OPS.md, OBSERVABILITY.md, OPS_PLAN.md
- **AGENT_RESULT fields**: N/A
- **NEXT conditions**: Flow complete (user handles deployment)

### maintenance-flow

- **Canonical**: [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md)
- **Domain**: Orchestrator (Maintenance — fourth flow)
- **Responsibility**: Manages the maintenance lifecycle for existing projects. Receives a trigger (bug / CVE / performance / tech-debt / feature), performs Patch / Minor / Major triage via `change-classifier`, and launches the appropriate agent sequence. Patch and Minor complete standalone; Major generates `MAINTENANCE_RESULT.md` and hands off to delivery-flow.
- **Inputs**: User-supplied trigger description (log error, CVE notice, feature request, etc.), SPEC.md, ARCHITECTURE.md
- **Outputs**: GitHub issue, PR, test results; Major also produces `MAINTENANCE_RESULT.md`
- **AGENT_RESULT fields**: N/A for Patch/Minor (orchestrator reports via PR + issue). For Major: `PLAN`, `MAINTENANCE_RESULT`, `HANDOFF_TO`
- **NEXT conditions**:
  - Patch / Minor completion → `done`
  - Major completion → `delivery-flow` (user runs `/delivery-flow` manually after reviewing `MAINTENANCE_RESULT.md`)

---

## Safety Agents

These agents enforce safety policies across other agents. They may be invoked automatically by orchestrators or explicitly delegated from any Bash-owning agent.

### sandbox-runner

- **Canonical**: [.claude/agents/sandbox-runner.md](../../.claude/agents/sandbox-runner.md)
- **Domain**: Safety (cross-cutting)
- **Responsibility**: Executes high-risk commands using the strongest available isolation. First attempts `container` mode (devcontainer + Docker); falls back to platform permission controls if unavailable. Re-classifies commands against `sandbox-policy.md` and returns a complete audit trail including fallback reason.
- **Inputs**: `command`, `working_directory`, `timeout_sec`, `risk_hint`, `allow_network`, `allow_write_paths`, `dry_run`, `reason`, `caller_agent`
- **Outputs**: `stdout`, `stderr`, `exit_code`, `sandbox_mode`, `detected_risks`, `decision`, `fallback_reason`, `notes`
- **Execution path selection** (Step 2 of workflow):
  1. Check for `.devcontainer/devcontainer.json` in the repository
  2. Run `docker info` with 5-second timeout
  3. Both OK → `container` mode (mount working directory only; `--network=none` by default; no host env vars)
  4. Either fails → fallback to `platform_permission` with `FALLBACK_REASON` recorded
- **AGENT_RESULT fields**: `STATUS`, `SANDBOX_MODE`, `EXIT_CODE`, `DETECTED_RISKS`, `DECISION`, `CALLER`, `DURATION_MS`, `FALLBACK_REASON` (omitted when container mode succeeds)
- **NEXT conditions**:
  - Called by another agent → returns to caller agent
  - Invoked standalone → `done`
  - Session interrupted → `suspended`

---

## Quality Agents

These agents enforce quality gates across other agents' outputs. They are auto-inserted by flow orchestrators after specific phases complete; the calling agent does not invoke them directly.

### doc-reviewer

- **Canonical**: [.claude/agents/doc-reviewer.md](../../.claude/agents/doc-reviewer.md)
- **Domain**: Quality (cross-cutting)
- **Responsibility**: Reviews cross-document consistency for markdown artifacts (SPEC.md / ARCHITECTURE.md / UI_SPEC.md / docs/design-notes/, DISCOVERY_RESULT.md). Auto-inserted by flow orchestrators after spec-designer / architect / ux-designer / scope-planner / analyst complete (post-insert). Runs in an isolated context independent from the producing agent. Read-only — does not generate or modify any files; emits a text report only.
- **Inputs**: Target artifact(s) from the preceding phase + upstream artifacts they depend on (e.g., SPEC.md when reviewing ARCHITECTURE.md). `TRIGGERED_BY` field identifies the upstream agent.
- **Outputs**: Text report with severity-tagged findings (🔴 DR / 🟡 DA / 🟢 DI). No file artifacts.
- **Five review axes**: coverage / naming / scope / version / acceptance
- **AGENT_RESULT fields**: `STATUS`, `DOC_REVIEW_RESULT` (`pass` | `fail` | `conditional`), `INCONSISTENCY_COUNT`, `TRIGGERED_BY`, `REVIEWED_FILES`, `FINDINGS`, `NEXT`
- **NEXT conditions**:
  - `DOC_REVIEW_RESULT: pass` → next phase
  - `DOC_REVIEW_RESULT: fail` → rollback to upstream agent (max 3 per Rollback Limit Common in `orchestrator-rules.md`); on exceeding, approval gate offers "Approve despite findings"
- **Plan tier**:
  - `delivery-flow`: mandatory across all plans (after spec-designer / architect / ux-designer)
  - `discovery-flow`: mandatory at scope-planner completion. Skipped in Minimal (scope-planner does not run).
  - `maintenance-flow`: conditional auto — runs after `analyst` only when `analyst.DOCS_UPDATED` contains a SPEC.md diff (Patch with no SPEC change skips)

---

## Standalone Agents

These two agents operate outside the triage system, invoked directly by the user.

### analyst

- **Canonical**: [.claude/agents/analyst.md](../../.claude/agents/analyst.md)
- **Domain**: Standalone
- **Responsibility**: Receives bug reports, feature requests, or refactoring issues for existing projects. Classifies the issue, determines approach, updates SPEC.md / UI_SPEC.md incrementally (when needed), authors the matching `docs/design-notes/<slug>.md` planning document, creates a GitHub issue, and hands off to `developer` (or `architect` when design changes are required). Branch creation, push, and PR submission are owned by the next implementation-tier agent (`developer`), not by `analyst`.
- **Inputs**: User's issue description, existing SPEC.md, ARCHITECTURE.md, UI_SPEC.md
- **Outputs**: `docs/design-notes/<slug>.md`, updated SPEC.md / UI_SPEC.md (incremental), GitHub issue (via gh CLI)
- **AGENT_RESULT fields**: `ISSUE_TYPE`, `ISSUE_SUMMARY`, `DOCS_UPDATED`, `GITHUB_ISSUE`, `HANDOFF_TO`, `ARCHITECT_BRIEF`
- **NEXT conditions**: `developer` (default) | `architect` (when design changes are required)

### codebase-analyzer

- **Canonical**: [.claude/agents/codebase-analyzer.md](../../.claude/agents/codebase-analyzer.md)
- **Domain**: Standalone
- **Responsibility**: Reverse-engineers SPEC.md and ARCHITECTURE.md from an existing codebase that lacks documentation. Enables the project to join the standard Aphelion workflow via analyst → delivery-flow.
- **Inputs**: Existing codebase (source files in working directory)
- **Outputs**: SPEC.md, ARCHITECTURE.md (reverse-engineered)
- **AGENT_RESULT fields**: `HAS_UI`, `PRODUCT_TYPE`, `LANGUAGE`, `FRAMEWORK`, `UC_COUNT`, `ENTITY_COUNT`, `TBD_COUNT`
- **NEXT conditions**: `done` (user then runs `/analyst` or `/delivery-flow`)

---

## Related Pages

- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — All agent definition files (authoritative source)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow orchestrator rules and triage
