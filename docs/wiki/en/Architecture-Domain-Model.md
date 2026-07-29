# Architecture: Domain Model

> **Language**: [English](../en/Architecture-Domain-Model.md) | [日本語](../ja/Architecture-Domain-Model.md)
> **Last updated**: 2026-07-29
> **Update history**:
>   - 2026-07-29: fix repository-root relative-link depth ../../ -> ../../../ (#169)
>   - 2026-04-30: Expand to 5-domain model — add Doc Flow (#54)
>   - 2026-04-25: split from Architecture.md; #42
> **Audience**: Agent developers

This page is one of three pages split from the original Architecture.md (#42). It covers Aphelion's conceptual domain model: the five-domain model, session isolation strategy, and PRODUCT_TYPE branching. See the sibling pages for protocols and operational rules: [Protocols](./Architecture-Protocols.md), [Operational Rules](./Architecture-Operational-Rules.md).

## Table of Contents

- [Five-Domain Model](#five-domain-model)
- [Session Isolation](#session-isolation)
- [PRODUCT_TYPE Branching](#product_type-branching)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Five-Domain Model

Aphelion divides the software development lifecycle into five independent domains:

<!-- source: .claude/rules/aphelion-overview.md -->
```mermaid
flowchart LR
    DR["DISCOVERY_RESULT.md"]
    DLR["DELIVERY_RESULT.md"]
    OPR["OPS_RESULT.md"]
    MR["MAINTENANCE_RESULT.md\n(Major only)"]
    DCR["DOC_FLOW_RESULT.md\n+ deliverables/{slug}/*.md"]

    Discovery["Discovery Flow\n(6 agents)"] -->|generates| DR
    DR -->|input for| Delivery["Delivery Flow\n(13 agents)"]
    Delivery -->|generates| DLR
    DLR -->|input for| Ops["Operations Flow\n(4 agents)\nservice only"]
    Ops -->|generates| OPR

    Maintenance["Maintenance Flow\n(3 new agents + reuse)"] -->|Major| MR
    MR -.->|handoff| Delivery

    Doc["Doc Flow\n(1 orchestrator + 6 authors)\non demand"] -->|generates| DCR
```

**Discovery** explores and structures requirements, producing `DISCOVERY_RESULT.md`.

**Delivery** designs, implements, tests, and reviews, producing `DELIVERY_RESULT.md`.

**Operations** builds infrastructure, database operations, and operations plans, producing `OPS_RESULT.md`. Only runs for `PRODUCT_TYPE: service`.

**Maintenance (fourth flow, independent)** triggers on bugs, CVE alerts, performance regressions, or small feature requests for existing projects. Performs Patch / Minor / Major triage via `change-classifier`. Patch and Minor complete independently; Major generates `MAINTENANCE_RESULT.md` and hands off to Delivery Flow as a pre-processing stage. See [Maintenance Flow Triage](./Triage-System.md#maintenance-flow-triage) for details.

**Doc (fifth flow, on-demand)** generates customer-deliverable documents (HLD, LLD, API reference, ops manual, end-user manual, handover) from existing Aphelion artifacts. Invoked manually via `/doc-flow` at any point after SPEC.md and ARCHITECTURE.md are available — no automatic chaining from other flows. Produces `DOC_FLOW_RESULT.md` and files under `docs/deliverables/{slug}/`. See [Doc Flow Triage](./Triage-System.md#doc-flow-triage) and [Agents Reference: Doc Domain](./Agents-Doc.md) for details.

### Design Principles

| Principle | Description |
|-----------|-------------|
| Domain separation | Each domain runs in an independent Claude Code session |
| File handoff | Domains connect through `.md` files, not automatic API calls |
| No automatic chaining | Each domain must be started by the user after reviewing the previous domain's output |
| Triage adaptation | Each flow orchestrator assesses project scale and selects a plan tier |
| Independent invocation | Any agent can be invoked standalone if its input files are available |

### Agent Flow

<!-- source: .claude/agents/ (agent file names), .claude/orchestrator-rules.md -->
```mermaid
flowchart LR
    D["Discovery<br/>(6 agents)<br/>interviewer → ... → scope-planner"]
    DV["Delivery<br/>(13 agents)<br/>spec-designer → ... → releaser"]
    O["Operations<br/>(4 agents)<br/>infra-builder → ... → ops-planner"]
    M["Maintenance<br/>(2 agents + reuse)<br/>change-classifier → impact-analyzer → analyst → ..."]
    DC["Doc<br/>(1 orchestrator + 6 authors)<br/>doc-flow → hld-author → ... → handover-author"]
    S["Standalone<br/>analyst / codebase-analyzer / sandbox-runner"]

    D -->|DISCOVERY_RESULT.md| DV
    DV -->|DELIVERY_RESULT.md| O
    M -.->|MAINTENANCE_RESULT.md<br/>Major only| DV
    DC -.->|on demand<br/>no chaining| DC
    S -.optional.-> DV
```

Per-domain details:
[Discovery](./Agents-Discovery.md) ·
[Delivery](./Agents-Delivery.md) ·
[Operations](./Agents-Operations.md) ·
[Maintenance](./Agents-Maintenance.md) ·
[Doc](./Agents-Doc.md) ·
[Standalone](./Agents-Orchestrators.md#standalone-agents)

Maintenance is a **fourth flow independent from the primary Discovery → Delivery → Operations pipeline**, invoked via `/maintenance-flow` for existing-project maintenance tasks. Patch and Minor plans complete standalone; only Major plans hand off to Delivery via `MAINTENANCE_RESULT.md`. See [Agents Reference → Maintenance](./Agents-Maintenance.md) and [Triage System → Maintenance Flow Triage](./Triage-System.md#maintenance-flow-triage) for full specs.

Doc is a **fifth flow independent from all other flows**, invoked manually via `/doc-flow` at any stage of the project lifecycle after SPEC.md and ARCHITECTURE.md exist. It does not participate in automatic chaining from Discovery / Delivery / Operations / Maintenance flows. See [Agents Reference → Doc Domain](./Agents-Doc.md) and [Triage System → Doc Flow Triage](./Triage-System.md#doc-flow-triage) for full specs.

---

## Session Isolation

Each domain runs in a **separate Claude Code session**. This is a deliberate design choice:

- **Prevents context window overflow**: A full project lifecycle can involve thousands of lines of context. Running everything in one session risks hitting token limits.
- **Enables specialization**: Each orchestrator loads only the rules and agents relevant to its domain.
- **Forces explicit checkpoints**: Users must review each domain's output before launching the next, ensuring quality gates are not skipped.

The five flow orchestrators — `discovery-flow`, `delivery-flow`, `operations-flow`, `maintenance-flow`, `doc-flow` — are the entry points for each session.

---

## PRODUCT_TYPE Branching

The `PRODUCT_TYPE` field determined during Discovery controls which domains run:

| PRODUCT_TYPE | Discovery | Delivery | Maintenance | Operations | Doc |
|-------------|-----------|----------|-------------|------------|-----|
| `service` | Run | Run | Run (as needed) | **Run** | Run (on demand) |
| `tool` | Run | Run | Run (as needed) | Skip | Run (user-manual / ops-manual auto-skip) |
| `library` | Run | Run | Run (as needed) | Skip | Run (user-manual / ops-manual auto-skip) |
| `cli` | Run | Run | Run (as needed) | Skip | Run (user-manual / ops-manual auto-skip) |

Only `service` products require infrastructure, database operations, and deployment procedures. Maintenance applies to all product types whenever an existing project needs post-release changes. Doc Flow runs on demand for all product types — `user-manual-author` and `ops-manual-author` auto-skip when `UI_SPEC.md` or infra artifacts are absent (typical for tool / library / cli).

---

## Related Pages

- [Architecture: Protocols](./Architecture-Protocols.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Home](./Home.md)
- [Triage System](./Triage-System.md)
- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Doc Domain](./Agents-Doc.md)
- [Rules Reference](./Rules-Reference.md)

## Canonical Sources

- [src/.claude/rules/aphelion-overview.md](../../../src/.claude/rules/aphelion-overview.md) — Workflow model and design principles (auto-loaded)
- [.claude/orchestrator-rules.md](../../../.claude/orchestrator-rules.md) — Triage, handoff schema, approval gate, rollback rules
- [src/.claude/rules/agent-communication-protocol.md](../../../src/.claude/rules/agent-communication-protocol.md) — AGENT_RESULT format and STATUS definitions
