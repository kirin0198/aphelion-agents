# Agents Reference: Discovery Domain

> **Language**: [English](../en/Agents-Discovery.md) | [日本語](../ja/Agents-Discovery.md)
> **Last updated**: 2026-04-25 (split from Agents-Reference.md; #42)
> **Audience**: Agent developers

This page is one of five pages split from the original Agents-Reference.md (#42). It covers the Discovery domain agents. See the sibling pages for other domains: [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md).

## Table of Contents

- [Discovery Domain](#discovery-domain)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Discovery Domain

The Discovery domain (6 agents) handles requirements exploration.

### interviewer

- **Canonical**: [.claude/agents/interviewer.md](../../.claude/agents/interviewer.md)
- **Domain**: Discovery
- **Responsibility**: Conducts requirements interviews, discovers implicit requirements, determines PRODUCT_TYPE and HAS_UI, generates INTERVIEW_RESULT.md. Runs on all Discovery plans.
- **Inputs**: User's project description (from discovery-flow)
- **Outputs**: INTERVIEW_RESULT.md
- **AGENT_RESULT fields**: `PRODUCT_TYPE`, `HAS_UI`, `REQUIREMENTS_COUNT`, `IMPLICIT_REQUIREMENTS`
- **NEXT conditions**:
  - Minimal plan → `done`
  - Light plan → `scope-planner` (skips scope-planner in light — actually `rules-designer`)
  - Standard / Full plan → `researcher`
  - Rollback from poc-engineer → re-interview infeasible requirements

### researcher

- **Canonical**: [.claude/agents/researcher.md](../../.claude/agents/researcher.md)
- **Domain**: Discovery
- **Responsibility**: Researches domain knowledge, competitors, external APIs, and technical risks. Defines ubiquitous language. Runs on Standard and Full plans.
- **Inputs**: INTERVIEW_RESULT.md
- **Outputs**: RESEARCH_RESULT.md
- **AGENT_RESULT fields**: `RISKS_FOUND`, `EXTERNAL_DEPS`, `COMPETITORS_ANALYZED`, `UBIQUITOUS_TERMS`
- **NEXT conditions**:
  - Standard / Full plan → `poc-engineer`
  - Rolled back from scope-planner → `scope-planner`

### poc-engineer

- **Canonical**: [.claude/agents/poc-engineer.md](../../.claude/agents/poc-engineer.md)
- **Domain**: Discovery
- **Responsibility**: Validates technical feasibility with minimal PoC code. Identifies infeasible requirements and proposes alternatives. Runs on Standard and Full plans.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md
- **Outputs**: POC_RESULT.md, code under `poc/` directory
- **AGENT_RESULT fields**: `VERIFIED`, `BLOCKED_ITEMS`, `TECH_RECOMMENDATION`
- **NEXT conditions**:
  - No infeasible requirements, Full plan + HAS_UI → `concept-validator`
  - No infeasible requirements, otherwise → `rules-designer`
  - Infeasible requirements found → `interviewer` (rollback, STATUS: blocked)

### concept-validator

- **Canonical**: [.claude/agents/concept-validator.md](../../.claude/agents/concept-validator.md)
- **Domain**: Discovery
- **Responsibility**: Validates UI/UX concept through wireframes and user flow diagrams. Runs only on Full plan when HAS_UI: true.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md (optional), POC_RESULT.md (optional)
- **Outputs**: CONCEPT_VALIDATION.md
- **AGENT_RESULT fields**: `SCREENS`, `UX_ISSUES`, `IMPROVEMENTS`
- **NEXT conditions**: `scope-planner`

### rules-designer

- **Canonical**: [.claude/agents/rules-designer.md](../../.claude/agents/rules-designer.md)
- **Domain**: Discovery
- **Responsibility**: Interactively determines project-specific coding conventions, Git workflow, and build commands. Generates `.claude/rules/project-rules.md`. Runs on Light and above.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md (optional), POC_RESULT.md (optional)
- **Outputs**: `.claude/rules/project-rules.md`
- **AGENT_RESULT fields**: `LANGUAGE`, `FRAMEWORK`, `COMMIT_STYLE`, `BRANCH_STRATEGY`
- **NEXT conditions**: `scope-planner`

### scope-planner

- **Canonical**: [.claude/agents/scope-planner.md](../../.claude/agents/scope-planner.md)
- **Domain**: Discovery
- **Responsibility**: Defines MVP, prioritizes requirements with MoSCoW, assesses risks and costs, determines handoff readiness, and generates DISCOVERY_RESULT.md. Runs on Light and above.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md, POC_RESULT.md, CONCEPT_VALIDATION.md (as available)
- **Outputs**: SCOPE_PLAN.md, DISCOVERY_RESULT.md
- **AGENT_RESULT fields**: `MVP_SCOPE`, `MUST_COUNT`, `SHOULD_COUNT`, `RISKS`, `HANDOFF_READY`
- **NEXT conditions**:
  - HANDOFF_READY: true → `done`
  - HANDOFF_READY: false → `researcher` (rollback, STATUS: blocked)

---

## Related Pages

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
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
