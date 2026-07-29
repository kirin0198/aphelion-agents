# User Questions

When there are unclear points, **stop work and ask**. Prioritize confirmation over guessing.

## Platform constraint: sub-agents cannot call AskUserQuestion (#181)

Claude Code removes `AskUserQuestion` from every sub-agent — **even when the agent's
frontmatter `tools:` field lists it**. Quoting the subagent documentation: the first tool
filter "removes these tools, even when listed in the `tools` field", and `AskUserQuestion`
is on that list. Only the main conversation (and a `fork`, which skips the filters) can
render an interactive question.

What this means in practice:

| Context | How to ask |
|---------|-----------|
| Main session (user invoked a slash command that inlines the agent's instructions, or is following them directly) | Call `AskUserQuestion` as described below |
| **Sub-agent spawned by a flow orchestrator or by another agent** | **Do not call it.** Emit the question — heading, options, recommended default — as text in your output and in `AGENT_RESULT`, and let the caller render the gate |
| Flow orchestrator | Orchestrators run as the top-level agent of their session, so their own phase gates use `AskUserQuestion` normally |

Do **not** add `AskUserQuestion` to any agent's `tools:` list. It is filtered out regardless,
so listing it only encodes an expectation the platform does not honour.

The text-output fallback at the bottom of this file is therefore not just a degraded mode —
it is the required form whenever an agent runs as a sub-agent.

---

## AskUserQuestion Tool (Recommended)

For questions where choices can be presented, always use the `AskUserQuestion` tool.
Users can select options with arrow keys, making it more efficient than text input.

```json
{
  "questions": [{
    "question": "{具体的な質問文}？",
    "header": "{短いラベル}",
    "options": [
      {"label": "{選択肢1}", "description": "{補足説明}"},
      {"label": "{選択肢2}", "description": "{補足説明}"}
    ],
    "multiSelect": false
  }]
}
```

**Usage Guidelines:**

| Situation | Tool to Use |
|-----------|------------|
| Questions with 2-4 choices | `AskUserQuestion` |
| Multiple independent questions bundled together (max 4) | `AskUserQuestion` (multiple questions) |
| Questions requiring multiple selections | `AskUserQuestion` (`multiSelect: true`) |
| Code/mockup comparisons needed | `AskUserQuestion` (`preview` field) |
| Free-text only questions with no presentable choices | Text output |

**Notes:**
- Each question should have 2-4 options (users can always use "Other" for free-text input)
- Place recommended options first with `(推奨)` suffix
- Up to 4 questions per call. Bundle related questions together

## Text Output Fallback

Use text output only for free-text questions where choices cannot be presented:
```
⏸ 確認事項があります

{質問内容を箇条書きで記載}

回答をいただいてから作業を再開します。
```
