# Agents Reference: Operations Domain

> **Language**: [English](../en/Agents-Operations.md) | [日本語](../ja/Agents-Operations.md)
> **Last updated**: 2026-04-25 (split from Agents-Reference.md; #42)
> **Audience**: Agent developers

This page is one of five pages split from the original Agents-Reference.md (#42). It covers the Operations domain agents. See the sibling pages for other domains: [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Maintenance](./Agents-Maintenance.md).

## Table of Contents

- [Operations Domain](#operations-domain)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Operations Domain

The Operations domain (4 agents) handles deployment infrastructure and operations planning. Only runs for PRODUCT_TYPE: service.

### infra-builder

- **Canonical**: [.claude/agents/infra-builder.md](../../.claude/agents/infra-builder.md)
- **Domain**: Operations
- **Responsibility**: Generates Dockerfile (multi-stage), docker-compose.yml, GitHub Actions CI/CD, .env.example, security headers, and **sandbox infrastructure** (`.devcontainer/devcontainer.json` and `docker-compose.dev.yml` for container-isolated execution). Runs on all Operations plans.
- **Inputs**: DELIVERY_RESULT.md, ARCHITECTURE.md, implementation code
- **Outputs**: Dockerfile, .dockerignore, docker-compose.yml, docker-compose.override.yml, .github/workflows/ci.yml, .env.example, `.devcontainer/devcontainer.json` (Light+), `docker-compose.dev.yml` (Light+, when project uses Compose)
- **AGENT_RESULT fields**: `FILES_CREATED`, `DOCKER_BUILD`, `SECURITY_HEADERS`, `DEVCONTAINER_GENERATED`, `DEV_COMPOSE_GENERATED`, `SANDBOX_INFRA_PATH`
- **Sandbox infra generation policy**: Minimal → skip; Light → generate (optional launch); Standard → generate + mandatory launch; Full → generate + mandatory launch + audit log
- **Directory separation**: Production infra (`Dockerfile`, `docker-compose.yml`) must never reference sandbox infra (`.devcontainer/`, `docker-compose.dev.yml`). Sandbox infra referencing production is not recommended.
- **NEXT conditions**:
  - Standard / Full plan → `db-ops`
  - Light plan → `ops-planner`

### db-ops

- **Canonical**: [.claude/agents/db-ops.md](../../.claude/agents/db-ops.md)
- **Domain**: Operations
- **Responsibility**: Defines production DB configuration, migration procedures (with rollback), destructive change risk assessment, backup/restore procedures, and monitoring thresholds. Runs on Standard and Full plans.
- **Inputs**: ARCHITECTURE.md (data model, tech stack), migration files
- **Outputs**: DB_OPS.md
- **AGENT_RESULT fields**: `MIGRATIONS`, `DESTRUCTIVE_CHANGES`, `DB_TYPE`, `BACKUP_STRATEGY`
- **NEXT conditions**:
  - Full plan → `observability`
  - Standard plan → `ops-planner`

### observability

- **Canonical**: [.claude/agents/observability.md](../../.claude/agents/observability.md)
- **Domain**: Operations
- **Responsibility**: Designs and implements health checks, structured logging, RED metrics, alert rules, and performance baselines. Runs on Full plan only.
- **Inputs**: ARCHITECTURE.md, DELIVERY_RESULT.md, implementation code
- **Outputs**: OBSERVABILITY.md, health check implementation code
- **AGENT_RESULT fields**: `HEALTH_CHECKS`, `ALERT_RULES`, `METRICS`
- **NEXT conditions**: `ops-planner`

### ops-planner

- **Canonical**: [.claude/agents/ops-planner.md](../../.claude/agents/ops-planner.md)
- **Domain**: Operations
- **Responsibility**: Creates deploy procedures (with rollback points), rollback trigger conditions, incident response playbooks (P1-P4 severity), and maintenance checklists. Generates OPS_RESULT.md.
- **Inputs**: ARCHITECTURE.md, DELIVERY_RESULT.md, infra-builder/db-ops/observability artifacts
- **Outputs**: OPS_PLAN.md, OPS_RESULT.md
- **AGENT_RESULT fields**: `DEPLOY_READY`, `RUNBOOKS`, `MAINTENANCE_ITEMS`
- **NEXT conditions**: `done`

---

## Related Pages

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — All agent definition files (authoritative source)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow orchestrator rules and triage
