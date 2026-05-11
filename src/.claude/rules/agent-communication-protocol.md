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
| Write agents (spec-designer, architect, ux-designer, visual-designer, codebase-analyzer, analyst, security-auditor, test-designer, flow orchestrators that write RESULT.md, etc.) | **MUST** — list all artifacts written in this session. Required when STATUS=success. |
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
