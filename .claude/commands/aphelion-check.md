Run a health check on the current Aphelion installation and report results.

This command verifies that the core components of an Aphelion installation are present
and properly configured. It checks agent files, rules files, hooks configuration, and
external tool availability. Run this after `npx aphelion-agents init` to confirm
the setup is complete, or any time you suspect a misconfiguration.

All 7 checks are run sequentially. Each check is classified as:
- pass (green): the component is present and functional
- warn (yellow): the component is missing or misconfigured but Aphelion can still run in
  a degraded mode; take corrective action when convenient
- fail (red): a required component is absent; agents that depend on it will not work
  correctly until fixed

## Steps

1. **Core agents present** (fail if missing)

   Run:
   ```
   ls .claude/agents/*.md 2>/dev/null
   ```

   Check that the following high-importance agents exist as individual files:
   - `developer.md`
   - `reviewer.md`
   - `tester.md`
   - `analyst.md`
   - `analyst-intake.md`
   - `analyst-core.md`
   - `architect.md`

   Also report the total agent file count for informational purposes.

   Pass criterion: all 7 named files exist.
   Remediation if any are missing: Re-run `npx aphelion-agents init` (or `npx aphelion-agents update`) to restore missing agent files.

2. **`aphelion-overview.md` exists** (fail if missing)

   Run:
   ```
   ls .claude/rules/aphelion-overview.md 2>/dev/null
   ```

   Pass criterion: file exists.
   Remediation: Re-run `npx aphelion-agents init` to restore the rules files.

3. **`project-rules.md` exists** (warn if missing)

   Run:
   ```
   ls .claude/rules/project-rules.md 2>/dev/null
   ```

   Pass criterion: file exists.
   Remediation: Run `/aphelion-init` to create `project-rules.md` for this project. Without it, agents fall back to defaults (may not match your project conventions).

4. **Hooks configured in settings.json** (warn if missing or incomplete)

   Run:
   ```
   cat .claude/settings.json 2>/dev/null
   ```

   Check that the file exists and contains references to all four Aphelion hooks:
   - `aphelion-secrets-precommit` (PreToolUse)
   - `aphelion-sensitive-file-guard` (PreToolUse)
   - `aphelion-deps-postinstall` (PostToolUse)
   - `aphelion-project-rules-check` (SessionStart — added in 0.3.2; installations that
     predate it are exactly the case this check exists to catch)

   Pass criterion: all four hook names appear in `.claude/settings.json`.

   Remediation:
   - **File missing, or hooks absent:** run `npx aphelion-agents update`. Since #114 the
     CLI *merges* the hook template into an existing `settings.json` rather than skipping
     it, so `update` restores missing entries while preserving your own settings.
     `init` is not the right command here — it exits 1 when `.claude/` already exists
     unless `--force` is passed.
   - **A hook is missing on purpose:** since 0.3.9 the CLI remembers hooks you removed and
     does not re-add them (`hooks-policy.md` §3). Report it as an intentional gap rather
     than a failure — re-adding means restoring the entry by hand or running
     `npx aphelion-agents init --force`.

   Also report the presence of `.claude/.aphelion-manifest.json`. When it is absent, the
   installation predates 0.3.9: hook-removal memory and removed-upstream file reporting are
   both inactive until the next `update`.

5. **`gh auth status` passes** (fail if not authenticated)

   Run:
   ```
   gh auth status 2>&1
   ```

   Pass criterion: command exits 0 (user is authenticated to GitHub CLI).
   Remediation: Run `gh auth login` and follow the browser-based authentication flow.

6. **`git` on PATH** (fail if absent)

   Run:
   ```
   git --version 2>&1
   ```

   Pass criterion: command exits 0 and prints a version string.
   Remediation: Install Git (`https://git-scm.com/downloads`) and ensure it is on your PATH.

7. **`docker info` (sandbox container mode)** (warn if unavailable)

   Run:
   ```
   docker info 2>&1
   ```

   Pass criterion: command exits 0 (Docker daemon is running).
   Remediation: This is optional. `sandbox-runner` can operate in `platform_permission` mode without Docker. Start Docker Desktop (or Docker daemon) if you want full container isolation for high-risk commands.

## Output format

After running all checks, produce a Markdown table in this exact format:

```
## Aphelion Health Check

| # | Check | Status | Remediation |
|---|-------|--------|-------------|
| 1 | Core agents present (developer, reviewer, tester, analyst, analyst-intake, analyst-core, architect) | ✅ pass | — |
| 2 | aphelion-overview.md exists | ✅ pass | — |
| 3 | project-rules.md exists | ⚠️ warn | Run `/aphelion-init` to create it |
| 4 | Hooks configured in settings.json | ✅ pass | — |
| 5 | gh auth status | ❌ fail | Run `gh auth login` |
| 6 | git on PATH | ✅ pass | — |
| 7 | docker info (sandbox optional) | ⚠️ warn | sandbox-runner container mode unavailable; platform_permission fallback active |

**Result: X passed, Y warned, Z failed**
```

Replace placeholder status values with actual results. Use `✅ pass`, `⚠️ warn`, or `❌ fail` exactly as shown. Replace `—` with an actionable remediation hint if the check did not pass. Show the actual total agent count in parentheses after the agent list in row 1, e.g. "(developer, reviewer, tester, analyst, analyst-intake, analyst-core, architect) — N files total" where N is the count detected at runtime.

After the table, if any checks failed (❌), output a brief "Next steps" section listing the most urgent remediation actions.

$ARGUMENTS
