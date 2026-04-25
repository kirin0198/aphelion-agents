# Denial Categories

> **Last updated**: 2026-04-25
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start

This rule applies to all agents that own the `Bash` tool. When a `Bash` (or `Read`) invocation
fails or is refused, classify the failure into one of the categories below **before retrying**.
Retrying without diagnosing wastes user time and obscures the real problem.

---

## 1. Categories

| Category | Detection | Recommended action | Avoid |
|----------|-----------|--------------------|-------|
| `sandbox_policy` | Stderr / tool-error contains "permission denied by …", "blocked by deny rule", or matches a pattern in `.claude/settings.local.json` `deny` | `AskUserQuestion` to confirm intent. If approved, run the command via the **manual `!cmd` fallback** (§3) — the sandbox cannot be unblocked from inside the agent. | Retrying the same command unmodified. Surfacing approval prompts in a loop. |
| `os_permission` | Stderr contains `Permission denied`, errno `EACCES` or `EPERM`. Often accompanied by a non-owner user attempting to write a `root`-owned path. | Run `ls -la {path}` (or `stat {path}`) to identify the owner. If owner is `root` and the agent is non-root: surface the diagnosis to the user and recommend `sudo chown -R $USER {path}` followed by retry. | Treating it as a sandbox denial. Issuing `AskUserQuestion` for "policy approval" — the policy was not the cause. |
| `file_not_found` | Stderr contains `No such file or directory`, errno `ENOENT` | Re-check the path. Run `ls {dirname}` to inspect what is there. Ask the user only if the path is genuinely ambiguous. | Recreating the file blindly. Switching to a different (wrong) path. |
| `platform_heuristic` | Tool-error mentions "External System Write", "non-session branch", "out-of-project read", or similar Claude Code auto-mode language. **Not** present in any settings.json file. | Honest report to the user: "Claude Code's auto-mode refused this. I cannot configure around it." Offer alternatives: parent-session retry, manual `!cmd` fallback, or split the workflow so the heuristic does not fire. | Editing `.claude/settings.local.json` to "fix" it — the file does not control this layer. |

---

## 2. Decision flow

```
Bash command fails
       │
       ▼
[Read stderr + exit code]
       │
       ├─ Matches deny pattern in settings.local.json or
       │   stderr says "permission denied by deny rule"
       │       └──▶ sandbox_policy → AskUserQuestion + §3 fallback
       │
       ├─ stderr contains "Permission denied" / EACCES / EPERM
       │       └──▶ os_permission → ls -la → recommend chown/sudo
       │
       ├─ stderr contains "No such file or directory" / ENOENT
       │       └──▶ file_not_found → re-check path
       │
       └─ Tool-error mentions Claude Code auto-mode language
               └──▶ platform_heuristic → honest report; do not edit settings
```

---

## 3. The manual `!cmd` fallback

When a deny-listed command is needed for legitimate cleanup and the user has explicitly
approved it via `AskUserQuestion`, the **agent cannot bypass the sandbox** — Claude Code does
not honor an in-conversation approval as a one-shot allowlist (verified in PR #29 cleanup,
2026-04-24). The supported recovery is:

1. The agent stops attempting the command.
2. The agent surfaces a single message containing the exact command to run.
3. The user pastes that command into the chat input prefixed with `!` (e.g.
   `!rm -rf /tmp/build-artefacts/`). The leading `!` runs the command directly in the user's
   shell, bypassing the agent's sandbox.
4. The agent resumes once the user reports completion.

Do **not** loop back into another `AskUserQuestion` after the first refusal-after-approval.
The user already approved; the failure is at the sandbox layer, not the user's intent.

---

## 4. Reporting in `AGENT_RESULT`

When a Bash command was denied or failed and the agent stopped:

```
DENIAL_CATEGORY: sandbox_policy | os_permission | file_not_found | platform_heuristic
DENIAL_COMMAND: {full command as attempted}
DENIAL_RECOVERY: {action taken or recommended — e.g. "user ran !cmd manually" / "user ran sudo chown" / "no recovery, escalated to user"}
```

These three fields are added to the standard `AGENT_RESULT` block when applicable. Omit them
when no denial occurred.

---

## 5. Auto-load Notes

- File location: `.claude/rules/denial-categories.md` (canonical source: `src/.claude/rules/denial-categories.md` per #44)
- Auto-loaded by Claude Code on every session start (same mechanism as `sandbox-policy.md`).
- Each Bash-owning agent's definition file should contain a one-line reference:
  > Follows `.claude/rules/denial-categories.md` for post-failure diagnosis when a Bash command is denied.
