# Document Locations

> Last updated: 2026-05-11
> Auto-loaded: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
> Update history:
>   - 2026-05-11: initial release — default output location for Aphelion-generated docs moved to `docs/`; existing projects keep working via root-fallback (#117)

This rule defines where Aphelion-generated planning / design / handoff
documents live. All agents and orchestrators MUST resolve document paths
through this rule rather than hard-coding `SPEC.md` / `ARCHITECTURE.md` to
the repository root.

## Covered artifacts

| Artifact name           | Default (new project)          | Legacy fallback (root)      | Producer / Consumer |
|-------------------------|--------------------------------|-----------------------------|---------------------|
| `SPEC.md`               | `docs/SPEC.md`                 | `SPEC.md`                   | spec-designer / analyst write; many agents read |
| `ARCHITECTURE.md`       | `docs/ARCHITECTURE.md`         | `ARCHITECTURE.md`           | architect / codebase-analyzer write |
| `UI_SPEC.md`            | `docs/UI_SPEC.md`              | `UI_SPEC.md`                | ux-designer writes (skipped if HAS_UI=false) |
| `VISUAL_SPEC.md`        | `docs/VISUAL_SPEC.md`          | `VISUAL_SPEC.md`            | visual-designer writes (Standard+ only) |
| `DISCOVERY_RESULT.md`   | `docs/DISCOVERY_RESULT.md`     | `DISCOVERY_RESULT.md`       | discovery-flow writes |
| `DELIVERY_RESULT.md`    | `docs/DELIVERY_RESULT.md`      | `DELIVERY_RESULT.md`        | delivery-flow writes |
| `OPS_RESULT.md`         | `docs/OPS_RESULT.md`           | `OPS_RESULT.md`             | operations-flow writes |
| `MAINTENANCE_RESULT.md` | `docs/MAINTENANCE_RESULT.md`   | `MAINTENANCE_RESULT.md`     | maintenance-flow Major handoff |
| `HANDOVER.en.md`        | `docs/HANDOVER.en.md`          | `HANDOVER.en.md`            | Legacy HANDOVER (separate from docs/deliverables/) |
| `HANDOVER.ja.md`        | `docs/HANDOVER.ja.md`          | `HANDOVER.ja.md`            | Same |
| `TEST_PLAN.md`          | `docs/TEST_PLAN.md`            | `TEST_PLAN.md`              | test-designer writes |
| `SECURITY_AUDIT.md`     | `docs/SECURITY_AUDIT.md`       | `SECURITY_AUDIT.md`         | security-auditor writes |
| `SCOPE_PLAN.md`         | `docs/SCOPE_PLAN.md`           | `SCOPE_PLAN.md`             | scope-planner writes |
| `RELEASE_NOTES.md`      | `docs/RELEASE_NOTES.md`        | `RELEASE_NOTES.md`          | releaser writes |
| `OBSERVABILITY.md`      | `docs/OBSERVABILITY.md`        | `OBSERVABILITY.md`          | observability writes |
| `OPS_PLAN.md`           | `docs/OPS_PLAN.md`             | `OPS_PLAN.md`               | ops-planner writes |

Files **NOT** covered by this rule (their paths are stable and absolute):

- `TASK.md` — **root-fixed**, intermediate state file (see
  `document-versioning.md` → `## TASK.md Lifecycle`). Not a design artifact.
- `docs/design-notes/<slug>.md` and `docs/design-notes/archived/<slug>.md`
- `docs/design-notes/proposals/<slug>.md`
- `docs/deliverables/{slug}/*.md` (doc-flow artifacts; already under docs/)
- `.claude/**/*` (agent / rule definitions themselves)
- `README.md`, `README.ja.md`, `CHANGELOG.md`, `LICENSE`

## Resolution rules

| Operation | Rule |
|-----------|------|
| **Read** an existing artifact | Run `Glob("{docs/<NAME>.md,<NAME>.md}")` **once**. Use the first match. When both paths match, prefer the `docs/` copy and emit `WARNING_LEGACY_DUPLICATE: <NAME>` in `AGENT_RESULT`. If no match, the artifact is treated as missing (caller decides: error vs. proceed). |
| **Write (new)** a fresh artifact | Always write to `docs/<NAME>.md`. Never default to the repository root for new files. |
| **Write (update)** an existing artifact | Use the same path that the most recent Read returned. The orchestrator carries the resolved path forward via `ARTIFACT_PATHS` (see `agent-communication-protocol.md`); the writing agent MUST NOT re-resolve and risk a docs/-vs-root switch mid-flow. |

**MUST NOT**:

- Perform two sequential `Read("docs/<NAME>.md") → Read("<NAME>.md")` calls.
  This produces a spurious `file_not_found` on the first call which
  `denial-categories.md` (Category: `file_not_found`) would otherwise trigger
  diagnostic retries against. Use the single `Glob` form.
- Auto-move (`git mv`) a legacy root file into `docs/`. Migration is the
  user's choice. An opt-in migration command is future work (out of scope
  for MVP).

## Hybrid state (both paths exist)

If both `docs/<NAME>.md` and `<NAME>.md` exist after the `Glob`:

1. Treat the `docs/` copy as authoritative.
2. Emit `WARNING_LEGACY_DUPLICATE: <NAME>` in `AGENT_RESULT`.
3. Surface a single user-facing line: "Both docs/SPEC.md and SPEC.md exist.
   Using docs/SPEC.md as authoritative. Please remove the legacy file
   manually after confirming content parity. Aphelion will not auto-delete."

## codebase-analyzer special case

`codebase-analyzer` reverse-engineers `SPEC.md` and `ARCHITECTURE.md` from an
existing codebase and writes them for the first time. Its behavior:

- At invocation, `codebase-analyzer` asks: "Output to docs/ (default) or
  repository root?" via `AskUserQuestion`.
- **Auto-approve mode** (`.aphelion-auto-approve` file exists): skip the
  `AskUserQuestion` and default to `docs/` without blocking.
  This aligns with `orchestrator-rules.md` → Auto-Approve Mode rules.
- The resolved path is reported in `ARTIFACT_PATHS` of `AGENT_RESULT`.

## Agent contract

- spec-designer, architect, ux-designer, visual-designer, codebase-analyzer,
  analyst — write per the Write rules above. On first invocation in a new
  project, write to `docs/<NAME>.md`. On incremental update, use the
  `ARTIFACT_PATHS` value passed in by the orchestrator.
- developer, tester, reviewer, security-auditor, doc-reviewer,
  handover-author, hld/lld/api-reference/ops-manual/user-manual-author —
  read per the Read rule. If the artifact is required and missing, return
  `STATUS: error` with `MISSING_ARTIFACT: <NAME>` in `AGENT_RESULT`.
- Flow orchestrators read this rule (auto-loaded) and **MUST carry
  `ARTIFACT_PATHS` into every subsequent agent prompt** (see
  `orchestrator-rules.md` → Phase Execution Loop step 2).
