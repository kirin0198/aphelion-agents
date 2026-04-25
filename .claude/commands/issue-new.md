Structured intake gate that converts a raw idea or bug report into a discovery-grade
planning document and a paired GitHub issue. Designed to be followed by `/analyst`
for the deep-analysis phase.

`/issue-new` collects only intake-level information (§1–§4 of the planning doc).
`/analyst` consumes that intake and produces the design (§5–§8). The two commands
together replace the previous "single AskUserQuestion plus TBD skeleton" approach
that produced memo-style issues.

## Behaviour overview

The command runs in three phases:

- **Phase A** — basic classification (type / title / slug)
- **Phase B** — type-specific structured questions
- **Phase C** — confirmation, file write, GitHub issue creation, handoff

`TBD` strings are forbidden in the generated §1–§4. When the user genuinely does
not know an answer, the literal sentinel `Unknown — to be confirmed by analyst`
(English, fixed) is written instead. This lets `/analyst` grep-locate the points
that still need follow-up questioning.

---

## Phase A — basic classification

Issue a single `AskUserQuestion` call with three questions:

```json
{
  "questions": [
    {
      "question": "What kind of issue is this?",
      "header": "Type",
      "options": [
        {"label": "bug", "description": "Something that should work but doesn't"},
        {"label": "feature", "description": "New capability / new agent / new flow"},
        {"label": "refactor", "description": "Improve internals without changing behaviour"},
        {"label": "chore", "description": "Tooling / config / housekeeping"},
        {"label": "docs", "description": "Documentation only"},
        {"label": "ci", "description": "CI / pipeline changes"},
        {"label": "ops", "description": "Infrastructure / operations"}
      ],
      "multiSelect": false
    },
    {
      "question": "What is the title? (1 line, used as the GitHub issue title)",
      "header": "Title"
    },
    {
      "question": "Provide a kebab-case slug for docs/design-notes/<slug>.md (pre-filled from the title; you can override).",
      "header": "Slug"
    }
  ]
}
```

After collecting the answers:

1. **Slug collision check** — verify the target file does not already exist:

   ```bash
   test -e docs/design-notes/<slug>.md
   ```

   If it exists, abort immediately with this message and do **not** create a
   GitHub issue:

   ```
   Error: docs/design-notes/<slug>.md already exists.
   Please choose a more specific slug, or extend the existing document directly.
   No GitHub issue was created.
   ```

   Rationale: overwriting risks silent loss of an existing design note;
   auto-suffixing (`<slug>-2.md`) creates near-duplicate filenames that fragment
   context. Aborting forces the user to make the correct decision.

2. **gh availability check** — run `gh auth status`. If it fails, set
   `GH_AVAILABLE=false` and continue. The planning doc will be written with
   `> GitHub Issue: skipped (no gh auth)` in the header.

---

## Phase B — type-specific structured questions

Branch on the type from Phase A and issue an `AskUserQuestion` call carrying the
matching question set. Bundle questions in a single call where possible
(AskUserQuestion supports up to 4 questions per call).

For every required answer, apply the **TBD-forbidden check** (see below) before
moving on. If the answer is rejected, re-ask only that question.

### bug

| # | Question | Required |
|---|---|---|
| 1 | Symptom — what is happening? | yes |
| 2 | Expected behaviour — what should happen? | yes |
| 3 | Reproduction steps | yes |
| 4 | Affected scope (which agents / commands / files) | yes (`Unknown` allowed) |
| 5 | Workaround, if any | optional |
| 6 | Related issues / commits | optional |

Bundle Q1–Q3 in one AskUserQuestion call, then Q4–Q6 in a second call.

### feature

| # | Question | Required |
|---|---|---|
| 1 | Motivation / user pain | yes |
| 2 | High-level approach (1–3 sentences) | yes |
| 3 | Acceptance criteria | yes |
| 4 | Relation to existing capabilities | yes (`Unknown` allowed) |
| 5 | Alternatives considered | optional |
| 6 | Out of scope (explicitly excluded) | yes |

Bundle Q1–Q3 in one call, Q4–Q6 in a second call.

### refactor / chore / docs / ci / ops (shared set)

| # | Question | Required |
|---|---|---|
| 1 | Current pain / motivation | yes |
| 2 | Target state | yes |
| 3 | Scope (files / agents / docs) | yes (`Unknown` allowed) |
| 4 | Backward-compatibility impact | yes |
| 5 | Out of scope | yes |

Bundle Q1–Q3 in one call, Q4–Q5 in a second call.

### TBD-forbidden check

For each **required** answer:

1. Empty string → re-ask the same question.
2. Stand-alone match against `TBD`, `tbd`, `?`, `不明`, `未定`, `なし` → re-ask.
3. No further length/quality check is performed — short but considered answers
   are accepted.

When the user genuinely does not know an answer to a question that allows
`Unknown`, instruct them to type `Unknown — to be confirmed by analyst`
(English, fixed). This is the only sentinel `/analyst` will recognise as
"needs follow-up".

---

## Phase C — confirm, write, create issue, hand off

### C.1 Confirmation gate

Render a preview of §1–§4 to the user as text, then ask:

```json
{
  "questions": [{
    "question": "Save this intake and create the GitHub issue?",
    "header": "Confirm",
    "options": [
      {"label": "Confirm and create", "description": "Write docs/design-notes/<slug>.md and run gh issue create"},
      {"label": "Edit answers", "description": "Re-open Phase B to revise responses"},
      {"label": "Abort", "description": "Discard everything and exit"}
    ],
    "multiSelect": false
  }]
}
```

### C.2 Write the planning doc

Resolve the following placeholders:

- `<title>` — from Phase A
- `<short-sha>` — `git rev-parse --short HEAD`
- `<YYYY-MM-DD>` — `date +%Y-%m-%d`

Pick the template by type and write the file at
`docs/design-notes/<slug>.md`.

Title-line prefix mapping:

| Type | Title-line prefix |
|---|---|
| bug | `fix:` |
| feature | `feat:` |
| refactor | `refactor:` |
| chore | `chore:` |
| docs | `docs:` |
| ci | `ci:` |
| ops | `ops:` |

#### Template — bug

```markdown
# fix: <title>

> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Intake by: /issue-new (<YYYY-MM-DD>)
> Analyzed by: TBD
> Implemented in: TBD
> GitHub Issue: TBD
> Next: analyst (run /analyst with <slug>)

---

## 1. Symptom (what is happening)

<answer 1>

## 2. Expected behaviour (what should happen)

<answer 2>

## 3. Reproduction steps

<answer 3>

## 4. Intake metadata

- **Affected scope**: <answer 4 or "Unknown — to be confirmed by analyst">
- **Workaround**: <answer 5 or "None known">
- **Related issues / commits**: <answer 6 or "None">

---

## 5. Root cause analysis

(filled by /analyst)

## 6. Proposed approach

(filled by /analyst)

## 7. Document / code impact

(filled by /analyst)

## 8. Acceptance criteria

(filled by /analyst)
```

#### Template — feature

```markdown
# feat: <title>

> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Intake by: /issue-new (<YYYY-MM-DD>)
> Analyzed by: TBD
> Implemented in: TBD
> GitHub Issue: TBD
> Next: analyst (run /analyst with <slug>)

---

## 1. Motivation / user pain

<answer 1>

## 2. High-level approach

<answer 2>

## 3. Acceptance criteria

<answer 3>

## 4. Intake metadata

- **Relation to existing capabilities**: <answer 4 or "Unknown — to be confirmed by analyst">
- **Alternatives considered**: <answer 5 or "None recorded at intake">
- **Out of scope**: <answer 6>

---

## 5. Detailed design

(filled by /analyst)

## 6. Document / architecture impact

(filled by /analyst)

## 7. Implementation outline

(filled by /analyst, refined by developer)

## 8. Risks and open questions

(filled by /analyst)
```

#### Template — refactor / chore / docs / ci / ops

Replace `<category>` with the chosen type literal (`refactor`, `chore`, `docs`,
`ci`, or `ops`).

```markdown
# <category>: <title>

> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Intake by: /issue-new (<YYYY-MM-DD>)
> Analyzed by: TBD
> Implemented in: TBD
> GitHub Issue: TBD
> Next: analyst (run /analyst with <slug>)

---

## 1. Current pain

<answer 1>

## 2. Target state

<answer 2>

## 3. Scope

<answer 3 or "Unknown — to be confirmed by analyst">

## 4. Intake metadata

- **Backward compatibility**: <answer 4>
- **Out of scope**: <answer 5>

---

## 5. Detailed approach

(filled by /analyst)

## 6. Document / code impact

(filled by /analyst)

## 7. Migration / rollout plan

(filled by /analyst)

## 8. Risks and open questions

(filled by /analyst)
```

### C.3 Pre-write TBD scan

After rendering the file content but before writing, scan the §1–§4 region for
the literal substring `TBD`. The header lines `Analyzed by: TBD` and
`Implemented in: TBD` and `GitHub Issue: TBD` are intentional and must be
ignored — only flag occurrences inside `## 1.` through `## 4.`.

If any unexpected `TBD` is found, abort with an internal-error message asking
the user to re-run; do not create the GitHub issue. This is a defence-in-depth
check against the Phase B validator being bypassed.

### C.4 Create the GitHub issue (if `GH_AVAILABLE`)

Build the issue body from the intake content:

```markdown
## Type

<bug | feature | refactor | chore | docs | ci | ops>

## Intake summary

<auto-built bullet list summarising §1–§4 of the planning doc>

## Design note

docs/design-notes/<slug>.md

## Next step

Run `/analyst` against `<slug>` to produce the design / approach (§5 onwards in the design note).
```

Display the resolved invocation to the user before running it so they can abort
if the title or summary looks wrong:

```
About to run:
  gh issue create --title "<prefix>: <title>" --body "<rendered body>"

Press Ctrl-C to abort, or wait 3 seconds to continue.
```

Then run:

```bash
gh issue create \
  --title "<prefix>: <title>" \
  --body "$(cat <<'EOF'
<rendered body>
EOF
)"
```

Capture the output to extract the issue number `N` and the full issue URL.

If `GH_AVAILABLE=false`, skip this step.

### C.5 Wire the issue number into the planning doc

Replace the header line `> GitHub Issue: TBD` with:

- `> GitHub Issue: [#N](https://github.com/<owner>/<repo>/issues/N)` —
  obtain `<owner>/<repo>` via
  `gh repo view --json nameWithOwner -q .nameWithOwner`.
- Or, when `GH_AVAILABLE=false`: `> GitHub Issue: skipped (no gh auth)`.

### C.6 Final report

Output a summary:

```
Planning doc created: docs/design-notes/<slug>.md
GitHub issue:         <issue URL>   (or "skipped — no gh auth")

Next step: run `/analyst` against `<slug>` to produce the design (§5–§8).
```

The closing "Next step" line is mandatory — it makes the two-stage flow
(`/issue-new` → `/analyst`) visible to the user at every invocation.

---

## Permission note

`gh issue create` is an `external_net` (recommended) category command under
`sandbox-policy.md`. Because the user explicitly invoked `/issue-new`,
sandbox-runner delegation is not required. The resolved `gh` invocation is
shown to the user in Phase C.4 before execution so they can abort if needed.

---

## Error handling

| Condition | Action |
|-----------|--------|
| Slug collision (`docs/design-notes/<slug>.md` exists) | Abort before creating GitHub issue; tell user to choose a different slug |
| Required answer empty / equals TBD-class sentinel | Re-ask only that question (do not advance) |
| `gh` not installed / not authenticated | Skip GitHub issue creation; write `skipped (no gh auth)` in doc header |
| `gh issue create` fails after display | Surface the error; the planning doc already written can be kept or deleted by the user |
| Pre-write TBD scan flags an unexpected `TBD` | Abort write; ask the user to re-run (defence-in-depth) |
