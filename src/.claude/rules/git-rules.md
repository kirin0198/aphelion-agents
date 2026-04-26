# Git Rules

> Last updated: 2026-04-26
> Update history:
>   - 2026-04-26: Add Repository / Startup Probe / Branch & PR Strategy / Behavior by Remote Type sections (#73)

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

---

## Repository

Declare the remote type in `project-rules.md` → `## Repository` → `Remote type`.

| Value        | Meaning                                          | git ops | PR/issue tooling | Notes |
|--------------|--------------------------------------------------|---------|------------------|-------|
| `github`     | GitHub.com or GHES                               | full    | `gh` CLI         | Default when missing |
| `gitlab`     | GitLab.com or self-hosted (scaffolding only)     | full    | `glab` CLI       | Out of scope for full impl |
| `gitea`      | Gitea / Forgejo (scaffolding only)               | full    | `tea` CLI        | Out of scope for full impl |
| `local-only` | Git repo without remote (e.g., personal scratch) | local   | none             | Skip push / PR |
| `none`       | Not a git repo at all                            | skipped | none             | All git ops skipped |

Resolution order:
1. `.claude/rules/project-rules.md` → `## Repository` → `Remote type`
2. Default when project-rules.md is absent or key is missing: **`github`**
   (preserves backward compatibility with existing Aphelion projects)

---

## Startup Probe

Bash-owning agents (`developer`, `analyst`, `tester`, `releaser`, etc.) run this
probe **once at session start**. Results are held in working memory and reused by
all subsequent git/PR operations within the same session.

```
[Probe start]
   │
   ▼
git rev-parse --is-inside-work-tree 2>/dev/null
   │
   ├─ exit != 0  ──▶ REPO_STATE=none      (skip all git ops)
   │
   └─ exit == 0
       │
       ▼
   git remote -v 2>/dev/null
       │
       ├─ empty   ──▶ REPO_STATE=local-only  (commit only, skip push/PR)
       │
       └─ has remote
           │
           ▼
       project-rules.md `## Repository` → `Remote type`
           │
           ├─ github | (missing / default)
           │       └──▶ gh auth status
           │              if OK  → REPO_STATE=github
           │              else   → REPO_STATE=github_unauth (warn, do not stop)
           │
           ├─ gitlab | gitea
           │       └──▶ REPO_STATE=<value>_scaffold
           │              (push only; PR/issue ops are skipped with a warning)
           │
           └─ local-only | none
                   └──▶ REPO_STATE matches declared value
```

The probe runs **inline** — no sub-agent invocation. Implementation (bash one-liner):

```bash
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_STATE=none
elif [ -z "$(git remote -v 2>/dev/null)" ]; then
  REPO_STATE=local-only
else
  _remote_type=$(grep -m1 "^Remote type:" .claude/rules/project-rules.md 2>/dev/null | awk '{print $NF}')
  _remote_type=${_remote_type:-github}
  case "$_remote_type" in
    github)
      if gh auth status >/dev/null 2>&1; then REPO_STATE=github
      else REPO_STATE=github_unauth; fi ;;
    gitlab) REPO_STATE=gitlab_scaffold ;;
    gitea)  REPO_STATE=gitea_scaffold  ;;
    *)      REPO_STATE=$_remote_type   ;;
  esac
fi
```

---

## Branch & PR Strategy

Implementation-tier agents (`developer`, `scaffolder`, etc.) are responsible for
branch creation, commit, push, and pull request submission.

> For agent-specific branch name derivation (e.g., slug from TASK.md or
> ARCHITECT_BRIEF), see the individual agent definition file.

### Branch Naming

| Issue Type / Source   | Branch Name                |
|-----------------------|----------------------------|
| Bug fix               | `fix/{short-description}`  |
| Feature addition      | `feat/{short-description}` |
| Refactoring           | `refactor/{short-description}` |
| Direct invocation (no upstream issue) | `feat/{short-description}` (default) |

`{short-description}` uses lowercase ASCII with hyphens (e.g.,
`fix/login-session-timeout`). Derive it from the GitHub issue title or the
ARCHITECT_BRIEF passed in.

### Branch Lifecycle

1. **Branch creation (first implementation-tier agent only)**
   - If invoked from a flow orchestrator and another implementation-tier agent
     (e.g., `scaffolder`) has already created the branch in the same flow
     session, **reuse that branch**. Detect this by running
     `git rev-parse --abbrev-ref HEAD` and checking it is not `main`.
   - Otherwise, create the branch from latest `main`:
     ```bash
     git checkout main
     git pull origin main
     git checkout -b {branch-name}
     ```
   - If the branch already exists locally or on the remote, ask the user
     whether to reuse it.

2. **Commit (per task)**
   - One commit per task on the working branch. Never commit to `main`
     directly.

3. **Push (after each commit, or batched at end of session)**
   ```bash
   git push -u origin {branch-name}
   ```
   The `-u` flag is required on first push only; subsequent pushes can use
   `git push`.
   - Skip when `REPO_STATE=local-only` or `REPO_STATE=none`.

4. **Pull request creation (once, after the first commit reaches the remote)**
   - Create the PR after the first push so reviewers can follow progress.
   - PR body must include `Closes #N` (or `Linked Issue: #N` if a partial fix)
     so that `.github/workflows/archive-closed-plans.yml` can archive the
     matching design note on close.
   - Skip when `REPO_STATE` is not `github`.

   ```bash
   gh pr create \
     --title "{prefix}: {short summary}" \
     --body "$(cat <<'EOF'
   ## Summary
   {1–3 bullet points of what changed}

   ## Related Issue
   Closes #{issue-number}

   ## Linked Plan
   docs/design-notes/{slug}.md

   ## Test plan
   - [ ] {test plan checklist}
   EOF
   )" \
     --base main
   ```

5. **Resume (when TASK.md exists)**
   - Run `git rev-parse --abbrev-ref HEAD` first.
   - If the current branch is not `main`, continue on it.
   - If the current branch is `main`, derive the branch name from TASK.md's
     Phase / issue context and `git checkout` it (fetching from the remote if
     necessary). Do not silently start committing to `main`.

### When to skip branch / PR creation

- **Direct main-branch commits are prohibited** by `project-rules.md`'s
  "Branch Strategy" (GitHub Flow). Do not commit to `main` even for trivial
  fixes.
- The only exception is when the user explicitly overrides via project-rules.md
  (e.g., a private experimental repo with a `Branch Strategy: trunk-based`
  declaration). Detect this by reading `project-rules.md`'s `## Git Rules` →
  `### Branch Strategy` section. If the policy is not GitHub Flow, follow the
  policy declared there.

### Coordination with `gh` CLI

- Verify `gh auth status` succeeds before attempting `gh pr create`
  (already handled by the Startup Probe above).
- If `gh` is unavailable, push the branch and report the PR URL the user
  should manually open (do not block the flow).
- If the PR already exists for the current branch (`gh pr view` succeeds),
  skip creation and add new commits via push only.

### AGENT_RESULT additions

The completion-time `AGENT_RESULT` block must include the following fields
when branch / PR were created:

```
BRANCH: {branch name}
PR_URL: {PR URL | skipped (gh unavailable) | reused (existing PR)}
```

---

## Behavior by Remote Type

| REPO_STATE          | branch creation | commit    | push                          | PR / issue             |
|---------------------|-----------------|-----------|-------------------------------|------------------------|
| `github`            | yes             | yes       | yes                           | `gh` full              |
| `github_unauth`     | yes             | yes       | yes (https credential prompt) | skipped (warn)         |
| `gitlab_scaffold`   | yes             | yes       | yes                           | skipped (warn)         |
| `gitea_scaffold`    | yes             | yes       | yes                           | skipped (warn)         |
| `local-only`        | yes             | yes       | **skipped**                   | skipped                |
| `none`              | **skipped**     | **skipped** | **skipped**               | **skipped**            |

When PR / issue ops are skipped, agents must:
- emit a single warning line to the user explaining which op was skipped and why,
- record `GITHUB_ISSUE: skipped (REPO_STATE=<value>)` (or analogous) in `AGENT_RESULT`.
