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
| Write agents (spec-designer, architect, ux-designer, visual-designer, codebase-analyzer, analyst, analyst-intake, analyst-core, security-auditor, test-designer, flow orchestrators that write RESULT.md, etc.) | **MUST** — list all artifacts written in this session. Required when STATUS=success. |
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
| `HANDOFF_TO` | agent-name \| flow-name | Used by analyst-intake / analyst-core / maintenance-flow at flow boundaries. |
| `HANDOFF_PAYLOAD` | YAML literal block (13 fields) | Emitted by analyst-intake in AGENT_RESULT; consumed by the caller (analyst orchestrator or flow orchestrator) to forward to analyst-core. Fields: planning_doc_path, slug, branch_name, issue_url, issue_number, issue_title, issue_type, intake_summary, proposals_source, repo_state, artifact_paths, auto_approve, output_language. See docs/design-notes/analyst-model-split-design.md §3. |
| `GITHUB_ISSUE` | URL \| skipped (REPO_STATE=<value>) | See `git-rules.md` §"Behavior by Remote Type". |
| `DECISION` | allowed \| asked_and_allowed \| denied \| skipped | sandbox-runner. See `sandbox-policy.md`. |
| `DOC_REVIEW_RESULT` | passed \| has-inconsistencies | doc-reviewer. |
| `WARNING_LEGACY_DUPLICATE` | artifact name | Emitted when both `docs/<NAME>.md` and `<NAME>.md` exist. See `document-locations.md`. |
| `DENIAL_CATEGORY` / `DENIAL_COMMAND` / `DENIAL_RECOVERY` | see denial-categories.md §4 | Conditional — emit only when a Bash command was denied. |

### How to add a new canonical field

Promote a field to this table when (a) ≥2 agents emit it with identical semantics,
**or** (b) an orchestrator parses it for routing/rollback decisions. Otherwise
keep it agent-local in the owning agent's prompt.

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
