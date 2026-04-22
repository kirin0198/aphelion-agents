# Aphelion Wiki

> **Language**: [English](../en/Home.md) | [日本語](../ja/Home.md)
> **Last updated**: 2026-04-18
> **Audience**: All users

Welcome to the **Aphelion Wiki** — the detailed reference for the Aphelion multi-platform AI coding agent workflow.

**Not sure where to start?** → [Getting Started](./Getting-Started.md)

---

## What is This Wiki?

Aphelion's README covers the quick start and an overview. This wiki provides the in-depth reference material that the README intentionally omits:

| README | Wiki |
|--------|------|
| Project overview and motivation | [Architecture](./Architecture.md): 3-domain model and session isolation |
| Quick Start commands | [Getting Started](./Getting-Started.md): per-platform setup, scenarios, troubleshooting |
| Triage plan table (summary) | [Triage System](./Triage-System.md): selection logic, conditions, and agent matrices |
| Agent list (names only) | [Agents Reference](./Agents-Reference.md): all 27 agents with inputs, outputs, and NEXT conditions |
| — | [Rules Reference](./Rules-Reference.md): 9 behavior rules with scope and customization notes |
| Platform comparison table | [Platform Guide](./Platform-Guide.md): generation pipeline, constraints, and deployment |
| — | [Contributing](./Contributing.md): how to add agents, rules, and platforms |

---

## Table of Contents

### Core Pages

| Page | Description | Primary Audience |
|------|-------------|-----------------|
| [Getting Started](./Getting-Started.md) | Platform-specific setup, first run, usage scenarios, command reference | New users |
| [Architecture](./Architecture.md) | 3-domain model, handoff files, session isolation, AGENT_RESULT protocol | Agent developers |
| [Triage System](./Triage-System.md) | 4-tier plan selection logic, per-domain agent matrices, mandatory agents | All users |
| [Agents Reference](./Agents-Reference.md) | All 27 agents: responsibility, inputs, outputs, NEXT conditions | Agent developers |
| [Rules Reference](./Rules-Reference.md) | All 9 behavior rules: scope, auto-load, interactions | Agent developers |
| [Platform Guide](./Platform-Guide.md) | Claude Code / Copilot / Codex differences, generate.mjs pipeline | Platform porters |
| [Contributing](./Contributing.md) | Adding agents, rules, platforms; bilingual sync workflow | Agent developers |

---

## Persona-Based Entry Points

### "I want to use Aphelion for the first time"

1. Read [Getting Started](./Getting-Started.md) — Quick Start for your platform
2. Run `/discovery-flow` (or `/pm` if requirements are already clear)
3. Read [Triage System](./Triage-System.md) to understand which agents will be launched

### "I want to understand how Aphelion works internally"

1. Read [Architecture](./Architecture.md) — domain model and handoff mechanism
2. Read [Agents Reference](./Agents-Reference.md) — each agent's responsibility and connections
3. Read [Rules Reference](./Rules-Reference.md) — behavioral constraints applied to all agents

### "I want to add a new agent or rule"

1. Read [Contributing](./Contributing.md) — file templates and AGENT_RESULT contract
2. Read [Architecture](./Architecture.md) — understand where the new agent fits
3. Read [Rules Reference](./Rules-Reference.md) — understand which rules apply automatically

### "I want to use Aphelion on GitHub Copilot or OpenAI Codex"

1. Read [Platform Guide](./Platform-Guide.md) — capability differences and limitations
2. Read [Getting Started](./Getting-Started.md) — platform-specific Quick Start

---

## Glossary

| Term | Definition |
|------|------------|
| **Domain** | One of the three top-level workflow scopes: Discovery, Delivery, Operations |
| **Flow orchestrator** | An agent that manages an entire domain (discovery-flow, delivery-flow, operations-flow) |
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

---

## Related Pages

- [Getting Started](./Getting-Started.md)
- [Architecture](./Architecture.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — Aphelion workflow overview (auto-loaded)
- [README.md](../../README.md) — Project entry point
