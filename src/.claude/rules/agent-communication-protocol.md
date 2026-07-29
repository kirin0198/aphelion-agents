# Inter-Agent Communication Protocol

## AGENT_RESULT Block (Required)

All agents must output an `AGENT_RESULT` block upon work completion.
Each domain's flow orchestrator parses this output to determine next-phase decisions.

> **Flow orchestrator exception:** Discovery Flow / Delivery Flow / Operations Flow themselves do not output `AGENT_RESULT`. The flow orchestrator's final artifact is the handoff file (e.g., DISCOVERY_RESULT.md), and completion is reported via the approval gate.

```
AGENT_RESULT: {agent-name}
STATUS: success | error | failure | suspended | blocked | approved | conditional | rejected
...(agent-specific fields)
ARTIFACT_PATHS:                      # MUST when STATUS=success and the agent wrote ≥1 artifact
  - SPEC: docs/SPEC.md               # or `SPEC.md` if legacy-root mode
  - ARCHITECTURE: docs/ARCHITECTURE.md
NEXT: {next-agent-name | done | suspended}
```

### ARTIFACT_PATHS Field

`ARTIFACT_PATHS` records the resolved file paths for all artifacts written or read during the
session. The orchestrator carries this field verbatim into subsequent agent prompts to prevent
per-agent re-resolution from drifting between `docs/` and root mid-flow.

**MUST / OPTIONAL matrix:**

| Agent role | ARTIFACT_PATHS output |
|------------|----------------------|
| Write agents (spec-designer, architect, ux-designer, visual-designer, codebase-analyzer, analyst-intake, analyst-core, security-auditor, test-designer, flow orchestrators that write RESULT.md, etc. — not the top-level `analyst` orchestrator, which writes nothing itself) | **MUST** — list all artifacts written in this session. Required when STATUS=success. |
| Read-only agents (developer, reviewer, tester, doc-reviewer, handover-author, hld/lld/api-reference/ops-manual/user-manual-author, etc.) | OPTIONAL — list resolved read paths as reference information. |

**Before/after example (spec-designer):**

Before:
```
AGENT_RESULT: spec-designer
STATUS: success
NEXT: architect
```

After:
```
AGENT_RESULT: spec-designer
STATUS: success
ARTIFACT_PATHS:
  - SPEC: docs/SPEC.md
NEXT: architect
```

**WARNING_LEGACY_DUPLICATE** (emitted when both `docs/<NAME>.md` and `<NAME>.md` exist):
```
AGENT_RESULT: architect
STATUS: success
ARTIFACT_PATHS:
  - ARCHITECTURE: docs/ARCHITECTURE.md
WARNING_LEGACY_DUPLICATE: ARCHITECTURE
NEXT: developer
```

See `document-locations.md` for the full resolution algorithm and hybrid-state handling.

## Field Reference

Canonical definitions for AGENT_RESULT fields emitted by 2+ agents or parsed
by the orchestrator. Agent-specific fields are documented in each agent file.

| Field | Type / Values | Notes |
|---|---|---|
| `STATUS` | success \| error \| failure \| suspended \| blocked \| approved \| conditional \| rejected | See §"STATUS Definitions". |
| `NEXT` | {agent-name} \| done \| suspended | Routing hint for the orchestrator. |
| `ARTIFACT_PATHS` | `- <NAME>: <resolved path>` list | MUST when STATUS=success and agent wrote ≥1 artifact. See `document-locations.md`. |
| `ARTIFACTS` | filename list | **Deprecated** — kept for backward compat. New agents should use `ARTIFACT_PATHS`. |
| `BLOCKED_REASON` / `BLOCKED_TARGET` | freeform / agent-name | Required when STATUS=blocked. See §"blocked STATUS Usage". |
| `BRANCH` | branch name | MUST when a work branch was created/reused. Planning-tier and Implementation-tier agents. |
| `PR_URL` | URL \| skipped \| reused | Implementation-tier only. See `git-rules.md` §"Branch & PR Strategy". |
| `HANDOFF_TO` | agent-name \| flow-name | Used by analyst-intake / analyst-core / maintenance-flow at flow boundaries. `analyst-core` emits `architect` by default and `developer` when the caller's plan has no architect phase (maintenance Patch) — a fixed `architect` would route Patch to a phase its plan does not contain. |
| `HANDOFF_PAYLOAD` | YAML literal block (14 fields) | Emitted by analyst-intake in AGENT_RESULT; consumed by the caller (analyst orchestrator or flow orchestrator) to forward to analyst-core. Fields: planning_doc_path, slug, branch_name, issue_url, issue_number, issue_title, issue_type, intake_summary, proposals_source, repo_state, artifact_paths, auto_approve, approval_mode, output_language. `approval_mode` was added by #180 (see docs/design-notes/approval-mode-escalation-wiring.md §6.4/§8.1) so analyst-core's internal G1 gate (§Step 3) can apply the three-tier priority defined in `orchestrator-rules.md` §"In-agent Approval Gates". See docs/design-notes/analyst-model-split-design.md §3. |
| `GITHUB_ISSUE` | URL \| skipped (REPO_STATE=<value>) | See `git-rules.md` §"Behavior by Remote Type". |
| `DECISION` | allowed \| asked_and_allowed \| denied \| skipped | sandbox-runner. See `sandbox-policy.md`. |
| `DOC_REVIEW_RESULT` | pass \| fail | doc-reviewer. `fail` means INCONSISTENCY_COUNT ≥ 1. When `fail`, `STATUS` MUST be `failure` — the orchestrator's Doc Review FAIL rollback triggers on the AND of both fields (`orchestrator-rules.md` §"Doc Reviewer Auto-insertion"). |
| `WARNING_LEGACY_DUPLICATE` | artifact name | Emitted when both `docs/<NAME>.md` and `<NAME>.md` exist. See `document-locations.md`. |
| `DENIAL_CATEGORY` / `DENIAL_COMMAND` / `DENIAL_RECOVERY` | see denial-categories.md §4 | Conditional — emit only when a Bash command was denied. |
| `ESCALATION_REQUIRED` | true \| false | Emitted by implementation/design agents (developer, architect, security-auditor, tester, reviewer) when an autonomous-mode escalation condition is hit (SPEC-external technical decision, destructive change to DB schema / API compatibility, or multiple valid approaches undecidable within SPEC). The orchestrator pauses the autonomous flow at an escalation gate. Default / omitted = false (no escalation). Not consulted when `APPROVAL_MODE: interactive`. See `orchestrator-rules.md` §"Approval Mode (autonomous / interactive)". |
| `ESCALATION_REASON` | freeform string | Required when `ESCALATION_REQUIRED: true`. One-line human-readable reason surfaced verbatim in the escalation gate (e.g., "destructive DB schema migration required", "two valid auth approaches, SPEC does not disambiguate"). Omit when `ESCALATION_REQUIRED` is false/absent. |

### ESCALATION_REQUIRED — Per-Agent Trigger Table and Non-Duplication Rule

`ESCALATION_REQUIRED` (Route A, see `orchestrator-rules.md` §"Approval Mode" →
"Escalation Conditions (ADR-003)") is emitted by five agents. Each already owns an
existing routing signal; Route A must be scoped so it does **not** duplicate them.
This table is the single canonical source — agent definition files carry only a
1–2 line reference to it (per #131/#132 token-reduction convention), not a copy of
this text.

| Agent | Existing signal (do NOT duplicate) | Route A applies only when |
|-------|-------------------------------------|----------------------------|
| `developer` | `STATUS: blocked` + `BLOCKED_TARGET` (lightweight architect query) | The SPEC-external decision is a human/product judgment call that a lightweight architect query cannot resolve (not an architecture-placement ambiguity) |
| `architect` | `TECH_STACK_CHANGED: true` (previously had no realized escalation path in autonomous mode) | Always — whenever `TECH_STACK_CHANGED: true` is set, `ESCALATION_REQUIRED: true` MUST also be set. This connects the pre-existing pseudo-escalation signal to the actual escalation gate. |
| `security-auditor` | Route B (orchestrator directly detects unresolved CRITICAL findings) | A destructive-change judgment call that cannot be expressed as a CRITICAL finding (e.g., two valid remediation approaches, SPEC does not disambiguate). Never for reporting CRITICAL counts — that stays Route B. |
| `tester` | `STATUS: failure` → automatic rollback (test-designer → developer → re-run) | A SPEC-undefined judgment call that rollback cannot resolve (e.g., ambiguous acceptance criteria). Never for an ordinary failing test. |
| `reviewer` | CRITICAL finding → automatic rollback to developer | A judgment call beyond an ordinary CRITICAL finding (e.g., two valid designs, SPEC silent). Never for a routine CRITICAL finding, which already triggers rollback. |

**Non-duplication rule:**

1. `ESCALATION_REQUIRED` is orthogonal to `STATUS` — it may be set together with `STATUS: success`.
2. If `STATUS: blocked` or `STATUS: failure` is emitted for a given condition, the existing
   routing (blocked → `BLOCKED_TARGET` lightweight query; failure → rollback) takes precedence.
   Do not also set `ESCALATION_REQUIRED: true` for the *same* condition.
3. Any condition the orchestrator can already observe directly (Route B: unresolved CRITICAL
   count, shared rollback limit reached) must never be re-emitted as Route A.

### How to add a new canonical field

Promote a field to this table when (a) ≥2 agents emit it with identical semantics,
**or** (b) an orchestrator parses it for routing/rollback decisions. Otherwise
keep it agent-local in the owning agent's prompt.

> `ESCALATION_REQUIRED` qualifies under both (a) — emitted by ≥2 agents
> (developer, architect, security-auditor, tester, reviewer) — and (b) —
> parsed by every flow orchestrator to decide whether to pause an autonomous run.

## STATUS Definitions

| STATUS | Meaning | Orchestrator Action |
|--------|---------|-------------------|
| `success` | Completed successfully | Proceed to approval gate |
| `error` | Failed to complete due to error | Report to user and ask for decision |
| `failure` | Quality issue (e.g., test failure) | Follow rollback rules |
| `suspended` | Session interrupted | Prompt user to resume |
| `blocked` | Cannot continue due to design ambiguity | Flow orchestrator launches lightweight query to the target agent |
| `approved` / `conditional` / `rejected` | Review result | Rollback or completion decision |

## blocked STATUS Usage

Used when `developer` discovers design ambiguity or contradiction during implementation.

```
AGENT_RESULT: developer
STATUS: blocked
BLOCKED_REASON: {reason}
BLOCKED_TARGET: architect
CURRENT_TASK: TASK-005
NEXT: suspended
```
