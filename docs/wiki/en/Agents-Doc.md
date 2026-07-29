# Agents Reference: Doc Domain

> **Language**: [English](../en/Agents-Doc.md) | [日本語](../ja/Agents-Doc.md)
> **Last updated**: 2026-07-29
> **Update history**:
>   - 2026-07-29: fix repository-root relative-link depth ../../ -> ../../../ (#169)
>   - 2026-04-30: New page — Doc domain agents added (#54)
> **Audience**: Agent developers

This page covers the Doc domain agents: the 6 author agents launched by `doc-flow` to generate customer-deliverable documents. These agents are the sixth Agents Reference page alongside [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Delivery](./Agents-Delivery.md), [Operations](./Agents-Operations.md), and [Maintenance](./Agents-Maintenance.md).

The `doc-flow` orchestrator itself is documented in [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md#doc-flow).

## Table of Contents

- [Doc Domain](#doc-domain)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Doc Domain

The Doc domain (6 author agents + `doc-flow` orchestrator) generates customer-deliverable documents from existing Aphelion artifacts. All 6 author agents are launched by `doc-flow` in sequence; each can also be invoked standalone with explicit arguments.

**Tools for all author agents**: `Read, Write, Glob, Grep` (no `Bash` — side-effect-free by design).

**Invocation pattern**: Author agents receive `--slug`, `--lang`, `--repo-root`, and `output_path` from `doc-flow`. When invoked standalone, pass these arguments directly.

**Template resolution order** (applies to all author agents):
1. `{project_root}/.claude/templates/doc-flow/{type}.{lang}.md`
2. `{project_root}/.claude/templates/doc-flow/{type}.md` (lang fallback)
3. `{repo_root}/.claude/templates/doc-flow/{type}.{lang}.md` (Aphelion built-in)
4. `{repo_root}/.claude/templates/doc-flow/{type}.md` (Aphelion built-in lang fallback)
5. Agent-emit fallback (minimal chapter structure built into the agent)

**Output path convention**: `docs/deliverables/{slug}/{type}.{lang}.md`. When `--lang` matches the project's `Output Language`, the language suffix may be omitted (`{type}.md`).

---

### hld-author

- **Canonical**: [.claude/agents/hld-author.md](../../../.claude/agents/hld-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Generates a High-Level Design document for customer architects and project leads. Repackages `SPEC.md` and `ARCHITECTURE.md` into a system overview at component boundary level. Does not include implementation details.
- **Fixed chapter structure** (IEEE 1471 / ISO/IEC/IEEE 42010 reference):
  1. System Overview
  2. Overall System Architecture
  3. Subsystem Decomposition
  4. External Integrations
  5. Non-Functional Requirements
  6. Technology Stack
  7. Constraints and Assumptions
- **Inputs**:
  - `SPEC.md` (required)
  - `ARCHITECTURE.md` (required)
  - `DISCOVERY_RESULT.md` (optional — supplements §5 Non-Functional Requirements)
  - Template file (resolved via template resolution order above)
- **Outputs**: `docs/deliverables/{slug}/hld.{lang}.md`
- **Out of scope**: `src/*` implementation code; class/function-level specs (lld-author); internal developer docs (doc-writer)
- **AGENT_RESULT fields**: `STATUS` (`success` | `error` | `blocked`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `INPUT_ARTIFACTS`, `SKIPPED_SECTIONS`, `NEXT`, `BLOCKED_REASON`
- **NEXT conditions**:
  - Normal completion → `lld-author` (next phase in doc-flow)
  - Standalone → `done`
  - Template major bump → `STATUS: blocked`, `BLOCKED_REASON: template_major_bump`
- **Standalone invocation**: Required arguments: `--slug {value}`, `--lang {ja|en}`, `--repo-root {path}` (default cwd). Create `docs/deliverables/{slug}/` directory manually before invocation.

---

### lld-author

- **Canonical**: [.claude/agents/lld-author.md](../../../.claude/agents/lld-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Generates a Low-Level Design document for the customer's developer and maintenance team. Reads `ARCHITECTURE.md` and `src/*` at signature level to produce module/class/API signature documentation. Does not explain implementation logic line by line.
- **Fixed chapter structure** (IEEE 1016 SDD reference):
  1. Module Structure
  2. Class / Function Specifications
  3. Data Structures
  4. API Signatures
  5. Algorithms
  6. Error Handling
- **Inputs**:
  - `ARCHITECTURE.md` (required)
  - `src/**` (Glob — signature extraction only, not full body)
  - `TASK.md` (optional — supplements implementation history)
  - Template file
- **Outputs**: `docs/deliverables/{slug}/lld.{lang}.md`
- **Out of scope**: Line-by-line implementation logic explanation; private/internal APIs not exposed to customers
- **AGENT_RESULT fields**: `STATUS` (`success` | `error` | `blocked`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `INPUT_ARTIFACTS`, `NEXT`
- **NEXT conditions**:
  - Normal completion → `api-reference-author`
  - Standalone → `done`

---

### api-reference-author

- **Canonical**: [.claude/agents/api-reference-author.md](../../../.claude/agents/api-reference-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Generates a customer-developer facing API reference. Integrates `SPEC.md` use cases, `ARCHITECTURE.md` API design section, and `src/*` endpoint signatures. Produces external SDK / API usage guide level documentation. Distinct from `doc-writer`'s internal API docs — different audience, granularity, and output path.
- **Inputs**:
  - `SPEC.md`
  - `ARCHITECTURE.md` (`## 5. API Design` or equivalent)
  - `src/**` (Glob — endpoint signature extraction)
  - `openapi.yaml` / `openapi.json` (optional — takes priority when present)
  - Template file
- **Outputs**: `docs/deliverables/{slug}/api-reference.{lang}.md`
- **Out of scope**: Private/internal endpoints; `doc-writer`-generated internal API docs (not read to avoid duplication)
- **AGENT_RESULT fields**: `STATUS` (`success` | `error` | `skipped`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `ENDPOINT_COUNT`, `SKIP_REASON`, `NEXT`
- **NEXT conditions**:
  - Normal completion → `ops-manual-author`
  - No API endpoints found → `STATUS: skipped`, `SKIP_REASON: no API endpoints found`
  - Standalone → `done`

---

### ops-manual-author

- **Canonical**: [.claude/agents/ops-manual-author.md](../../../.claude/agents/ops-manual-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Repackages infrastructure scripts, deployment procedures, and observability runbooks into a customer operations team facing manual. Covers startup/shutdown, monitoring, restore, and escalation flows in a single operations manual.
- **Chapter structure** (ITIL v4 Service Operation reference):
  Startup/Shutdown, Monitoring, Incident Response, Backup/Restore, Escalation
- **Inputs**:
  - `Dockerfile`, `docker-compose.yml`, `infra/**` (Glob)
  - `OBSERVABILITY.md` (optional)
  - `OPS_PLAN.md` (optional — Operations Flow final output)
  - `OPS_RESULT.md` (optional)
  - Template file
- **Outputs**: `docs/deliverables/{slug}/ops-manual.{lang}.md`
- **Out of scope**: Developer environment setup (README territory); detailed security content (SECURITY_AUDIT.md excerpts only)
- **AGENT_RESULT fields**: `STATUS` (`success` | `error` | `skipped` | `blocked`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `SKIP_REASON`, `INPUT_ARTIFACTS`, `NEXT`
- **NEXT conditions**:
  - Normal completion → `user-manual-author`
  - `PRODUCT_TYPE: tool / library / cli` with no infra artifacts → `STATUS: skipped`, `SKIP_REASON: no infra artifacts (PRODUCT_TYPE != service)`
  - Standalone → `done`

---

### user-manual-author

- **Canonical**: [.claude/agents/user-manual-author.md](../../../.claude/agents/user-manual-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Generates a UC-by-UC operation guide for the actual end users of the system. Requires `UI_SPEC.md` to produce meaningful output; returns `STATUS: skipped` when `UI_SPEC.md` is absent (typical for CLI / library / tool projects). Each Use Case from `SPEC.md` becomes one chapter; UI screen operation notes are added as subsections when `UI_SPEC.md` is present.
- **Inputs**:
  - `SPEC.md` (required)
  - `UI_SPEC.md` (optional — absence triggers skip logic)
  - Template file
- **Outputs**: `docs/deliverables/{slug}/user-manual.{lang}.md`
- **Out of scope**: Screenshot automation (placeholders only); video tutorials; API usage content (api-reference-author's responsibility)
- **AGENT_RESULT fields**: `STATUS` (`success` | `error` | `skipped`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `UC_COUNT`, `HAS_UI_SPEC`, `SKIP_REASON`, `NEXT`
- **NEXT conditions**:
  - Normal completion → `handover-author`
  - `UI_SPEC.md` absent → `STATUS: skipped`, `SKIP_REASON: no UI (UI_SPEC.md not found)`
  - Standalone with explicit `--types user-manual` + UI absent → AskUserQuestion before generating empty deliverable
  - Standalone → `done`

---

### handover-author

- **Canonical**: [.claude/agents/handover-author.md](../../../.claude/agents/handover-author.md)
- **Domain**: Doc (customer-deliverable)
- **Responsibility**: Generates a handover package for the successor maintenance team at project closeout. Integrates SPEC.md, ARCHITECTURE.md, SECURITY_AUDIT.md, TEST_PLAN.md, and active `docs/design-notes/*.md` (archived docs excluded) into a single handover document. Includes cross-references to all other deliverables generated in the same run.
- **Fixed chapter structure**:
  1. Project Overview
  2. Design Decision History
  3. Known Issues and Outstanding Tasks
  4. Test / Security Audit Result Summary
  5. Operations Handoff Notes
  6. Related Document Index
- **Inputs**:
  - `SPEC.md`, `ARCHITECTURE.md`, `SECURITY_AUDIT.md`, `TEST_PLAN.md`
  - `docs/design-notes/*.md` (archived/ excluded — MVP scope, per doc-flow-architecture.md §2.6)
  - Other deliverables in the same slug (indexed in §6)
  - Template file
- **Outputs**: `docs/deliverables/{slug}/handover.{lang}.md`
- **Out of scope**: `docs/design-notes/archived/` (Phase 2 scope); migration plans (Phase 2 separate doc type)
- **AGENT_RESULT fields**: `STATUS` (`success` | `error`), `OUTPUT_FILE`, `TEMPLATE_USED`, `TEMPLATE_VERSION`, `DESIGN_NOTES_REFERENCED`, `RELATED_DELIVERABLES`, `NEXT`
- **NEXT conditions**:
  - Normal completion → `done` (final phase in doc-flow)
  - Standalone → `done`

---

## Related Pages

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md) — includes doc-flow orchestrator entry
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Delivery Domain](./Agents-Delivery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../../.claude/agents/) — All agent definition files (authoritative source)
- [.claude/agents/doc-flow.md](../../../.claude/agents/doc-flow.md) — Doc Flow orchestrator definition
- [.claude/templates/doc-flow/](../../../.claude/templates/doc-flow/) — Document templates (HLD, LLD, API reference, Ops manual, User manual, Handover)
