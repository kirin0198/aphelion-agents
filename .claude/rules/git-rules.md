# Git Rules

## Commit Granularity
- One commit per task (do not bundle multiple tasks)
- Test code is committed the same way as implementation code

## Staging (Important)
- `git add -A` is **prohibited** (prevents accidental inclusion of sensitive/unnecessary files)
- Use `git add {target-files}` to stage explicitly
- Never commit `.env`, `credentials.*`, `*.secret`, etc.

## Commit Message Format

```
{prefix}: {task-name} (TASK-{N})

- {bullet points of implementation details}
- Related UC: UC-XXX (if applicable)
```

| prefix | Usage |
|--------|-------|
| `feat:` | New feature / new endpoint |
| `fix:` | Bug fix |
| `refactor:` | Refactoring |
| `test:` | Test additions/modifications |
| `docs:` | Documentation additions/modifications |
| `chore:` | Configuration / environment |
| `ci:` | CI/CD related |
| `ops:` | Infrastructure / operations related |

## Commit Co-Authorship

Agents invoked within this workflow MUST append the following trailer to the
commit message body when creating commits, **unless disabled** by the project.

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Resolution Order

1. `.claude/rules/project-rules.md` → `## Authoring` → `Co-Authored-By policy`
   - `disabled` → skip trailer
   - `enabled` → append trailer
2. Default when project-rules.md is absent or key is missing: **enabled**

### Applicable Agents

developer, scaffolder, infra-builder, db-ops, observability, releaser, analyst,
codebase-analyzer, rules-designer, doc-writer, tester.

(i.e., all agents owning `Bash` that may run `git commit`.)

### Model Name Policy

The trailer MUST NOT include a specific model name (e.g., "Claude Sonnet 4.6").
A bare `Claude` is sufficient; model variance across sub-agent invocations
would otherwise pollute commit history.
