# Triage System

> **Language**: [English](../en/Triage-System.md) | [日本語](../ja/Triage-System.md)
> **Last updated**: 2026-04-30
> **Update history**:
>   - 2026-04-30: Add Doc Flow Triage section (#54)
>   - 2026-04-30: doc-reviewer references per #91 follow-up
> **Audience**: New users / Agent developers

The Triage System automatically assesses project characteristics at flow start and selects the minimum set of agents needed. This page explains the 4-tier selection logic, conditions, and per-domain agent matrices.

## Table of Contents

- [Overview](#overview)
- [How Triage Works](#how-triage-works)
- [Discovery Flow Triage](#discovery-flow-triage)
- [Delivery Flow Triage](#delivery-flow-triage)
- [Operations Flow Triage](#operations-flow-triage)
- [Maintenance Flow Triage](#maintenance-flow-triage)
- [Doc Flow Triage](#doc-flow-triage)
- [Mandatory Agents (Always Run)](#mandatory-agents-always-run)
- [Conditional Agents (HAS_UI)](#conditional-agents-has_ui)
- [Triage Assessment Questions](#triage-assessment-questions)
- [Overriding Triage](#overriding-triage)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Overview

Aphelion's Triage System ensures that the right level of rigor is applied based on project characteristics:

- A **personal CLI tool** gets Minimal — just enough to ship
- A **public OSS library** gets Full — the complete quality pipeline
- Everything else falls somewhere in between

The triage happens at the start of each flow. The orchestrator interviews the user (or reads `DISCOVERY_RESULT.md`) and selects from 4 plan tiers: **Minimal**, **Light**, **Standard**, or **Full**.

---

## How Triage Works

1. The flow orchestrator interviews the user using `AskUserQuestion` on project characteristics (or reads `DISCOVERY_RESULT.md`)
2. The orchestrator presents the selected plan and agent list as text output
3. The orchestrator asks for approval via `AskUserQuestion`
4. Once approved, agents are launched in sequence

**Assessment dimensions:**
- Project scale (personal script → team project → large-scale)
- External dependencies and integrations
- Domain complexity (regulatory, compliance)
- Public/private status
- `PRODUCT_TYPE` (service / tool / library / cli)
- `HAS_UI` (whether a user interface is involved)

---

## Discovery Flow Triage

| Plan | Trigger Condition | Agents Launched |
|------|-----------------|----------------|
| **Minimal** | Personal tool / small script | `interviewer` |
| **Light** | Personal side project / multiple features | `interviewer` → `rules-designer` → `scope-planner` |
| **Standard** | External dependencies / existing system integration | `interviewer` → `researcher` → `poc-engineer` → `rules-designer` → `scope-planner` |
| **Full** | Regulated / large-scale / complex | `interviewer` → `researcher` → `poc-engineer` → `concept-validator`* → `rules-designer` → `scope-planner` |

*`concept-validator` only runs if `HAS_UI: true`

### Discovery Phase Sequence by Plan

**Minimal:**
```
Phase 1: Requirements interview  → interviewer  → approval
→ discovery-flow generates DISCOVERY_RESULT.md directly
```

> **Note on Minimal**: Minimal plan ends after `interviewer`. Since `doc-reviewer`
> is triggered post-`scope-planner`, it is not invoked in Minimal. This is by
> structural absence, not by an explicit "skip" rule.

**Light:**
```
Phase 1: Requirements interview  → interviewer    → approval
Phase 2: Rule design             → rules-designer → approval
Phase 3: Scope planning          → scope-planner  → doc-reviewer (auto) → approval → done
```

**Standard:**
```
Phase 1: Requirements interview  → interviewer    → approval
Phase 2: Domain research         → researcher     → approval
Phase 3: Technical PoC           → poc-engineer   → approval
Phase 4: Rule design             → rules-designer → approval
Phase 5: Scope planning          → scope-planner  → doc-reviewer (auto) → approval → done
```

**Full:**
```
Phase 1: Requirements interview  → interviewer       → approval
Phase 2: Domain research         → researcher        → approval
Phase 3: Technical PoC           → poc-engineer      → approval
Phase 4: Concept validation      → concept-validator → approval  [HAS_UI: true only]
Phase 5: Rule design             → rules-designer    → approval
Phase 6: Scope planning          → scope-planner     → doc-reviewer (auto) → approval → done
```

---

## Delivery Flow Triage

| Plan | Trigger Condition | Agents Launched |
|------|-----------------|----------------|
| **Minimal** | Single-function tool | `spec-designer` → `architect` → `developer` → `tester`* → `security-auditor` |
| **Light** | Personal side project | + `ux-designer`† + `test-designer` + `e2e-test-designer`† + `reviewer` |
| **Standard** | Multi-file project | + `scaffolder` + `doc-writer` |
| **Full** | Public project / OSS | + `releaser` |

*In Minimal plan, `tester` integrates test design (TEST_PLAN.md may not be pre-generated)
†Only when `HAS_UI: true`

### Delivery Phase Sequence (Standard Example)

```
Phase 1:  Spec design         → spec-designer      → doc-reviewer (auto) → approval
Phase 2:  UI design           → ux-designer         → doc-reviewer (auto) → approval  [HAS_UI: true only]
Phase 3:  Architecture design → architect          → doc-reviewer (auto) → approval
Phase 4:  Project init        → scaffolder         → approval
Phase 5:  Implementation      → developer          → approval
Phase 6:  Test design         → test-designer      → approval
Phase 7:  E2E test design     → e2e-test-designer  → approval  [HAS_UI: true only]
Phase 8:  Test execution      → tester             → approval
Phase 9:  Code review         → reviewer           → approval
Phase 10: Security audit      → security-auditor   → approval
Phase 11: Documentation       → doc-writer         → approval → done
```

### Side Entry: analyst

`analyst` is not selected through triage — it is a side entry triggered by bug reports, feature requests, or refactoring requests for **existing projects**. After `analyst` completes, `delivery-flow` joins from Phase 3 (architect).

---

## Operations Flow Triage

Operations Flow only runs for `PRODUCT_TYPE: service`. There is no Minimal plan — at minimum, infrastructure definitions and an operations plan are required.

| Plan | Trigger Condition | Agents Launched |
|------|-----------------|----------------|
| **Light** | PaaS / single container / no DB | `infra-builder` → `ops-planner` |
| **Standard** | API + DB architecture | `infra-builder` → `db-ops` → `ops-planner` |
| **Full** | High availability / external user-facing | `infra-builder` → `db-ops` → `observability` → `ops-planner` |

### Operations Assessment Criteria

1. **DB presence**: Whether ARCHITECTURE.md data model and tech stack include a database
2. **User-facing service**: Whether it is an API / Web service accessed by external users
3. **Availability requirements**: Whether uptime requirements or SLAs are specified in SPEC.md

---

## Maintenance Flow Triage

The Maintenance Flow is a **fourth flow independent from Discovery / Delivery / Operations**, invoked manually via `/maintenance-flow` for existing-project maintenance tasks (bug fixes, CVE responses, performance regressions, tech-debt cleanup, small feature extensions). Triage is performed by `change-classifier` based on **4 dimensions**: priority (P1–P4), estimated file count, breaking-change presence, and SPEC.md impact.

| Plan | Trigger Condition | Agents Launched |
|------|-----------------|----------------|
| **Patch** | Bug fix / security patch / 1–3 files / no breaking change | `change-classifier` → `analyst` → `developer` → `tester` |
| **Minor** | Feature addition / refactor / 4–10 files / no breaking change | + `impact-analyzer` → `architect` (differential mode) → `reviewer` |
| **Major** | Breaking change / DB schema change / 11+ files / major SPEC impact | + `security-auditor` → handoff to `delivery-flow` via `MAINTENANCE_RESULT.md` |

`security-auditor` is mandatory only for Major. Patch and Minor may skip it unless trigger type is `security`.

### Maintenance Phase Sequence by Plan

**Patch:**
```
Phase 1: Classification         → change-classifier → approval
Phase 2: Issue creation         → analyst           → doc-reviewer (conditional auto) → approval
Phase 3: Implementation         → developer         → approval
Phase 4: Test execution         → tester            → approval → done
```

**Minor:**
```
Phase 1: Classification         → change-classifier  → approval
Phase 2: Impact analysis        → impact-analyzer    → approval
Phase 3: Issue creation         → analyst            → doc-reviewer (conditional auto) → approval
Phase 4: Differential design    → architect          → approval
Phase 5: Implementation         → developer          → approval
Phase 6: Test execution         → tester             → approval
Phase 7: Review                 → reviewer           → approval → done
```

**Major (handoff to delivery-flow):**
```
Phase 1: Classification         → change-classifier  → approval
Phase 2: Impact analysis        → impact-analyzer    → approval
Phase 3: Issue creation         → analyst            → doc-reviewer (conditional auto) → approval
Phase 4: Pre-audit              → security-auditor   → approval
Phase 5: Handoff                → MAINTENANCE_RESULT.md → delivery-flow
```

> **Conditional auto for doc-reviewer**: doc-reviewer is auto-inserted after
> `analyst` only when `analyst.DOCS_UPDATED` reports SPEC.md (or ARCHITECTURE.md)
> as updated. If both are `no_change`, doc-reviewer is skipped (Patch only).
> Minor and Major always invoke doc-reviewer after analyst.

### SPEC.md / ARCHITECTURE.md Preconditions

If either is missing at flow start, `change-classifier` proposes inserting `codebase-analyzer` as Phase 0 with user confirmation. After `codebase-analyzer` generates the missing documents, `change-classifier` re-runs classification.

### Handoff File (Major only)

When the plan is Major, `maintenance-flow` generates `MAINTENANCE_RESULT.md` with fields compatible with `DISCOVERY_RESULT.md` (PRODUCT_TYPE, project overview, impact summary). This file is the handoff artifact for `delivery-flow`.

---

## Doc Flow Triage

Doc Flow is a **fifth flow independent from Discovery / Delivery / Operations / Maintenance**, invoked manually via `/doc-flow` at any point in the project lifecycle after SPEC.md and ARCHITECTURE.md exist. No automatic chaining from other flows.

**Key distinction**: Doc Flow triage is based on **doc type count** (how many of the 6 document types are selected), not on project scale or complexity like the other flows. Any product type can invoke Doc Flow.

| Plan | Condition | Author Agents Launched |
|------|-----------|----------------------|
| **Minimal** | 1–2 doc types selected | Selected author agents only |
| **Light** | 3–4 doc types selected | Selected author agents only |
| **Standard** | 5–6 doc types selected | All selected author agents |
| **Full** | All 6 types + post-generation verification | All 6 authors + `template_version` consistency check |

**Available doc types**: `hld` / `lld` / `api-reference` / `ops-manual` / `user-manual` / `handover`

**Dependency hints** (recommended order, not enforced in MVP):
- `hld` → `lld`: both read ARCHITECTURE.md, LLD builds on HLD structure
- `hld` / `lld` → `api-reference`: API reference references architecture chapters
- All 5 types → `handover`: handover includes cross-references to all other deliverables

When `--types` specifies partial types, `handover-author` will note in the deliverable that some referenced docs were not generated in this run.

### Doc Flow Phase Sequence

```
[Triage] → [Approval]
Phase 1: HLD           → hld-author           → approval
Phase 2: LLD           → lld-author           → approval
Phase 3: API Reference → api-reference-author → approval
Phase 4: Ops Manual    → ops-manual-author    → approval  [skipped if no infra artifacts]
Phase 5: User Manual   → user-manual-author   → approval  [skipped if no UI_SPEC.md]
Phase 6: Handover      → handover-author      → approval  [recommended last]
→ DOC_FLOW_RESULT.md generated → completion summary
```

Only the selected doc types are launched; non-selected phases are skipped entirely.

### Auto-skip Rules

| Author Agent | Auto-skip Condition |
|---|---|
| `user-manual-author` | `UI_SPEC.md` absent (typical for `PRODUCT_TYPE: tool / library / cli`) |
| `ops-manual-author` | No infra artifacts (`Dockerfile`, `docker-compose.yml`, `infra/**` all absent) |

Auto-skipped agents report `STATUS: skipped` and are listed in `SKIPPED_TYPES` in the final `DOC_FLOW_RESULT.md`.

### Doc Flow and Mandatory Agents

Doc Flow does **not** trigger `doc-reviewer` (Quality Agent). The author agents produce customer-facing deliverables derived from Aphelion artifacts, not the design artifacts themselves that `doc-reviewer` monitors. Doc Flow does suggest running `/doc-reviewer` after completion to verify cross-deliverable consistency (`SUGGEST_DOC_REVIEW: true` in `AGENT_RESULT`).

Doc Flow is not listed in the [Mandatory Agents](#mandatory-agents-always-run) table — it is always optional.

---

## Mandatory Agents (Always Run)

Certain agents run on **all plans** regardless of triage outcome:

| Agent | Domain | Why Mandatory |
|-------|--------|--------------|
| `security-auditor` | Delivery | Security audit cannot be omitted. OWASP Top 10 + dependency scans run even on Minimal |
| `doc-reviewer` | Quality (cross-cutting) | Markdown artifact consistency must be verified on all plans (Minimal+). Read-only, no destructive ops; auto-inserted after spec / design / scope / analyst agents |

The `security-auditor` mandate is defined in [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md):

> `security-auditor` **must run on all Delivery plans (including Minimal)**.

The `doc-reviewer` mandate is defined in
[.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) §Doc Reviewer
Auto-insertion. It runs as a post-insert step after the trigger agents listed there.

---

## Conditional Agents (HAS_UI)

Some agents only run when a user interface is involved:

| Agent | Condition | Domain |
|-------|-----------|--------|
| `concept-validator` | Full plan AND `HAS_UI: true` | Discovery |
| `ux-designer` | Any plan AND `HAS_UI: true` | Delivery |
| `e2e-test-designer` | Light/Standard/Full AND `HAS_UI: true` | Delivery |

`HAS_UI` is determined by `interviewer` (Discovery) or `spec-designer` (Delivery direct entry) based on whether the project includes a web UI, mobile app, or desktop GUI.

---

## Triage Assessment Questions

The discovery-flow orchestrator asks the following in two rounds (via `AskUserQuestion`):

**Round 1 (4 questions):**
1. Project scale: personal script / personal side project / team project / large-scale
2. UI type: CLI / API only / Web UI / Mobile
3. External API dependencies: none / present
4. Existing system integration: new / integration with existing

**Round 2 (2 questions):**
5. Domain complexity: simple / moderate / complex (regulated)
6. PRODUCT_TYPE: service / tool / library / cli

---

## Overriding Triage

### Manual Override at Approval Gate

After the orchestrator presents the triage result, users can select "プランを変更" at the approval gate to manually override the plan.

### Auto-Approve Mode Override

The `.aphelion-auto-approve` file can contain plan overrides that skip triage questions:

```
PLAN: Standard
PRODUCT_TYPE: service
HAS_UI: true
```

---

## Related Pages

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Agents Reference: Orchestrators](./Agents-Orchestrators.md)
- [Getting Started](./Getting-Started.md)

## Canonical Sources

- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Triage plans, conditions, and agent sequences per domain
- [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md) — Discovery triage implementation
- [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md) — Delivery triage implementation
- [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md) — Operations triage implementation
- [.claude/agents/maintenance-flow.md](../../.claude/agents/maintenance-flow.md) — Maintenance triage implementation
- [.claude/agents/doc-flow.md](../../.claude/agents/doc-flow.md) — Doc Flow triage implementation
- [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md) — security-auditor mandatory rule
- [.claude/agents/doc-reviewer.md](../../.claude/agents/doc-reviewer.md) — doc-reviewer agent definition and trigger conditions
