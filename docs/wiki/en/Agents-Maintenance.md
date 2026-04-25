# Agents Reference: Maintenance Domain

> **Language**: [English](../en/Agents-Maintenance.md) | [日本語](../ja/Agents-Maintenance.md)
> **Last updated**: 2026-04-25 (split from Agents-Reference.md; #42)
> **Audience**: Agent developers

This page is one of five pages split from the original Agents-Reference.md (#42). It covers the Maintenance domain agents. See the sibling pages for other domains: [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md).

## Table of Contents

- [Maintenance Domain](#maintenance-domain)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Maintenance Domain

The Maintenance domain (3 agents + orchestrator) handles bug fixes, CVE responses, performance improvements, tech-debt cleanup, and small feature extensions on existing projects. The orchestrator is documented under [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md); the two supporting agents are described here.

### change-classifier

- **Canonical**: [.claude/agents/change-classifier.md](../../.claude/agents/change-classifier.md)
- **Domain**: Maintenance
- **Responsibility**: Classifies an incoming maintenance trigger into Patch / Minor / Major plan with P1–P4 priority scoring. Identifies trigger type (bug / feature / tech_debt / performance / security), estimates file impact, detects breaking changes, and assesses SPEC.md impact. Checks for SPEC.md / ARCHITECTURE.md presence and proposes codebase-analyzer if missing.
- **Inputs**: User's trigger description, SPEC.md, ARCHITECTURE.md, package metadata (package.json / pyproject.toml)
- **Outputs**: Structured classification output (text)
- **AGENT_RESULT fields**: `TRIGGER_TYPE`, `PLAN`, `PRIORITY`, `ESTIMATED_FILES`, `BREAKING_CHANGE`, `SPEC_IMPACT`, `DOCS_PRESENT`, `REQUIRES_CODEBASE_ANALYZER`, `RATIONALE`
- **NEXT conditions**:
  - `REQUIRES_CODEBASE_ANALYZER: true` → `codebase-analyzer` (re-runs change-classifier after)
  - `PLAN: Patch` → `analyst` (skips impact-analyzer)
  - `PLAN: Minor` / `Major` → `impact-analyzer`

### impact-analyzer

- **Canonical**: [.claude/agents/impact-analyzer.md](../../.claude/agents/impact-analyzer.md)
- **Domain**: Maintenance
- **Responsibility**: Identifies the concrete set of files to change and traces the dependency graph. Detects breaking API / DB schema changes, assesses regression risk (low / medium / high), and recommends test scope (unit / integration / e2e).
- **Inputs**: `change-classifier` AGENT_RESULT, user's trigger description, SPEC.md, ARCHITECTURE.md
- **Outputs**: Impact report (text) with target files, dependency files, breaking changes, regression assessment
- **AGENT_RESULT fields**: `TARGET_FILES`, `DEPENDENCY_FILES`, `BREAKING_API_CHANGES`, `DB_SCHEMA_CHANGES`, `REGRESSION_RISK`, `RECOMMENDED_TEST_SCOPE`, `IMPACT_SUMMARY`
- **NEXT conditions**: `analyst` (always, regardless of Minor/Major plan; the plan only affects what happens *after* analyst)

---

## Related Pages

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — All agent definition files (authoritative source)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow orchestrator rules and triage
