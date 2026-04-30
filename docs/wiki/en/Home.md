# Aphelion Wiki

> **Language**: [English](../en/Home.md) | [日本語](../ja/Home.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: link targets refreshed for Architecture / Agents-Reference page splits, #42)
> **Audience**: All users

Welcome to the **Aphelion Wiki** — the detailed reference for the Aphelion Claude Code agent workflow.

**Not sure where to start?** → [Getting Started](./Getting-Started.md)

---

## What is This Wiki?

Aphelion's README covers the quick start and an overview. This wiki provides the in-depth reference material that the README intentionally omits:

| README | Wiki |
|--------|------|
| Project overview and motivation | [Architecture: Domain Model](./Architecture-Domain-Model.md): 3-domain model and session isolation |
| Quick Start commands | [Getting Started](./Getting-Started.md): Claude Code setup, first-run walkthrough, scenarios, troubleshooting |
| Triage plan table (summary) | [Triage System](./Triage-System.md): selection logic, conditions, and agent matrices |
| Agent list (names only) | Agents Reference (split by domain): [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md) — all 39 agents with inputs, outputs, NEXT conditions |
| — | [Rules Reference](./Rules-Reference.md): 9 behavior rules with scope and customization notes |
| — | [Contributing](./Contributing.md): how to add agents, rules, and maintain the wiki |

---

## Table of Contents

### Core Pages

| Page | Description | Primary Audience |
|------|-------------|-----------------|
| [Getting Started](./Getting-Started.md) | Claude Code setup, first run, usage scenarios, command reference | New users |
| Architecture (3 pages) | [Domain Model](./Architecture-Domain-Model.md), [Protocols](./Architecture-Protocols.md), [Operational Rules](./Architecture-Operational-Rules.md) — 3-domain model, handoff files, AGENT_RESULT protocol, runtime rules | Agent developers |
| [Triage System](./Triage-System.md) | 4-tier plan selection logic, per-domain agent matrices, mandatory agents | All users |
| Agents Reference (5 pages) | [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md) — all 39 agents | Agent developers |
| [Rules Reference](./Rules-Reference.md) | All 9 behavior rules: scope, auto-load, interactions | Agent developers |
| [Contributing](./Contributing.md) | Adding agents, rules; bilingual sync workflow | Agent developers |

---

## Persona-Based Entry Points

### "I want to use Aphelion for the first time"

1. Read [Getting Started](./Getting-Started.md) — Quick Start for your platform
2. Run `/discovery-flow`
3. Read [Triage System](./Triage-System.md) to understand which agents will be launched

### "I want to understand how Aphelion works internally"

1. Read [Architecture → Domain Model](./Architecture-Domain-Model.md) — domain model and session isolation
2. Read [Architecture → Protocols](./Architecture-Protocols.md) — handoff files and AGENT_RESULT
3. Read [Agents Reference → Orchestrators](./Agents-Orchestrators.md) and the 4 domain pages — each agent's responsibility and connections
4. Read [Rules Reference](./Rules-Reference.md) — behavioral constraints applied to all agents

### "I want to add a new agent or rule"

1. Read [Contributing](./Contributing.md) — file templates and AGENT_RESULT contract
2. Read [Architecture → Domain Model](./Architecture-Domain-Model.md) — understand where the new agent fits
3. Read [Rules Reference](./Rules-Reference.md) — understand which rules apply automatically

### "I need to fix a bug or add a small feature to an existing project"

1. Ensure your project has `SPEC.md` and `ARCHITECTURE.md` (if missing, run `/codebase-analyzer` first)
2. Run `/maintenance-flow {trigger description}` — the orchestrator will triage into Patch / Minor / Major
3. Read [Triage System → Maintenance Flow Triage](./Triage-System.md#maintenance-flow-triage) for details on what each plan includes

---

## Glossary

| Term | Definition |
|------|------------|
| **Domain** | One of the three primary workflow scopes (Discovery, Delivery, Operations). Maintenance is a fourth, independent flow that runs alongside the primary pipeline |
| **Flow orchestrator** | An agent that manages an entire flow (discovery-flow, delivery-flow, operations-flow, maintenance-flow) |
| **Triage** | The process of assessing project scale at flow start and selecting a plan tier |
| **Plan** | One of four execution tiers: Minimal / Light / Standard / Full |
| **Handoff file** | A `.md` file used to pass information between domains (DISCOVERY_RESULT.md, DELIVERY_RESULT.md) |
| **AGENT_RESULT** | The structured output block every agent emits upon completion |
| **NEXT** | The field in AGENT_RESULT that specifies which agent runs next |
| **STATUS** | The completion status field: success / error / failure / suspended / blocked |
| **blocked** | STATUS used when an agent cannot continue due to design ambiguity |
| **Canonical source** | `.claude/` — the authoritative definition files for Claude Code |
| **PRODUCT_TYPE** | Classification of the project artifact: service / tool / library / cli |
| **HAS_UI** | Whether the project includes a user interface (affects which agents run) |
| **Auto-approve mode** | Mode activated by `.aphelion-auto-approve` file; skips approval gates for automated evaluation |
| **Maintenance Flow** | Fourth flow independent from the 3-domain pipeline; invoked via `/maintenance-flow` for existing-project maintenance (bugs, CVEs, refactors, small features). Triage: Patch / Minor / Major |
| **MAINTENANCE_RESULT.md** | Handoff file generated only on Major plan; passed to Delivery Flow as a pre-processing stage |

---

## Related Pages

- [Getting Started](./Getting-Started.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — Aphelion workflow overview (auto-loaded)
- [README.md](../../README.md) — Project entry point
