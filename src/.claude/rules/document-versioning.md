# Document Versioning

## Recording Update History

When updating any design document (`docs/SPEC.md` or legacy `SPEC.md`, `docs/ARCHITECTURE.md`
or legacy `ARCHITECTURE.md`, `docs/UI_SPEC.md`, `docs/TEST_PLAN.md`, etc.), record the update
date at the beginning of the file. Resolve the actual file path per `document-locations.md`
before reading or writing.

```markdown
> Last updated: {YYYY-MM-DD}
> Update history:
>   - {YYYY-MM-DD}: {summary of change}
```

## Traceability

- `architect` records which version of SPEC.md (e.g., `docs/SPEC.md`, or legacy `SPEC.md`) was used as the basis for design at the top of `ARCHITECTURE.md`
- `developer` records which version of ARCHITECTURE.md (e.g., `docs/ARCHITECTURE.md`, or legacy `ARCHITECTURE.md`) was used as the basis for implementation in `TASK.md`
- Each flow orchestrator records the artifact version from the previous domain in the handoff file

## TASK.md Format

State file used by `developer` to persist implementation progress across sessions.
Generated at implementation start and updated upon each task completion.

```markdown
# TASK.md

> Source: ARCHITECTURE.md ({version or last-updated date})

## Phase: {phase name}
Last updated: {timestamp}
Status: in-progress

## Task list

### Phase {N}
- [ ] TASK-001: {task name} | Target file: src/...
- [ ] TASK-002: {task name} | Target file: src/...

## Recent commits
(Record `git log --oneline -3` after each task completion.)

## Suspension notes
(Record session-suspension status here.)
```

## TASK.md Lifecycle

- Generated at the start of a new implementation phase (`developer` writes it based on ARCHITECTURE.md).
- Updated at each task completion (tick the checkbox, refresh the recent-commits section, commit with `git add TASK.md`).
- **On phase completion**, reset TASK.md to the empty template (one-line placeholder) so the next `developer` invocation starts from a clean state. Commit the reset as part of the phase's final commit or as a trailing `chore:` commit.
  - Rationale: a completed TASK.md with every checkbox ticked is not a design artifact — the phase's analysis and outcome belong in the matching `docs/design-notes/<slug>.md` planning document. Leaving a completed TASK.md in the repo risks the next `developer` session misreading it as a resume target.
