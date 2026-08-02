# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`check-archive-match.sh` runs in CI** (#209): the script implements six regression locks
  on the issue-matching grep that `archive-closed-plans.yml`, `archive-orphan-plans.yml` and
  the script itself must keep char-for-char identical — including the #150 `head -n 20` bug —
  but was wired into no workflow, no npm script and no checklist. It now runs on every PR
  alongside the README ↔ wiki check, and is listed in the PR checklist (en/ja).

- **README badge counts are checked in CI** (#198): `check-readme-wiki-sync.sh` gains
  Check 5, comparing the agents / commands / rules / hooks badges in both READMEs against
  the real file counts (hooks excluding the dogfooding scripts). The badges had drifted for
  months precisely because nothing verified them.

- **visual-designer agent** (#109): a dedicated visual-design layer for `HAS_UI: true`
  projects on Standard / Full, producing `VISUAL_SPEC.md` (palette, typography, spacing,
  design tokens, component-library selection, accessibility level, breakpoints). On Light
  the layer is skipped and `ux-designer` writes a lightweight default into `UI_SPEC.md`
  Section 1. Agent count 39 → 40 at the time. (Entry added retroactively in #200.)

- **Hook D — `aphelion-project-rules-check`, plus `/aphelion-check`** (#130): a SessionStart
  advisory that warns when `.claude/rules/project-rules.md` is absent (silenced with
  `APHELION_SKIP_RULES_CHECK=1`), a health-check command covering agents / rules / hooks /
  `gh auth` / git / Docker, and `/aphelion-init` promoted to the mandatory first-run step.
  `update` merges the new `SessionStart` block into existing installations.
  (Entry added retroactively in #200.)

- **Planning-tier responsibility matrix in `git-rules.md`** (#141): defines, for the analyst
  chain's three entry cases (fresh / resume / legacy resume), who creates the branch, who
  makes the initial commit, and who injects the handoff block — and states that callers
  perform no git operations on the chain's behalf. (Entry added retroactively in #200.)

- **Approval mode (autonomous / interactive) with triage linkage and escalation** (#161):
  `APPROVAL_MODE` resolved per triage tier, in-agent G1/G2/G3 gate taxonomy,
  `ESCALATION_REQUIRED` / `ESCALATION_REASON` on the AGENT_RESULT contract, and a
  `## Approval Mode` override key in `project-rules.md`. (Entry added retroactively in #200.)

- **`update --prune`** (#207): `update` now compares the target `.claude/` against a
  distribution manifest (`.claude/.aphelion-manifest.json`, written by `init` / `update`)
  and reports files Aphelion distributed previously but no longer ships. Without the flag
  nothing is deleted — the files are listed with the command to remove them, and any left
  in place are carried in the manifest and reported again next run. `--prune` deletes them.
  Installations that predate the manifest are still covered for known removals (e.g. the
  `/pm` command dropped in #55 / #67, which kept appearing as a live skill).

- **Agent definition deduplication** (#131 §①+§②, ~1000+ lines net reduction):
  §② moves the repeated `## Project-Specific Behavior` boilerplate out of all 40
  agent files and into `src/.claude/rules/aphelion-overview.md` as a new
  `### Project-rules consultation (all agents)` subsection (auto-loaded rule).
  §① adds a `## Field Reference` table (13 canonical AGENT_RESULT fields) to
  `src/.claude/rules/agent-communication-protocol.md`; verbose fenced
  `AGENT_RESULT` example blocks in 37 agent files are replaced with a 5-line
  short form referencing the canonical table. `MODE` was demoted from the Field
  Reference (values diverge per agent: `revision` / `failure-analysis` /
  `e2e-failure-analysis`) and documented inline in each owning agent instead.
  Multi-block agents (researcher, interviewer, test-designer, e2e-test-designer,
  poc-engineer) are collapsed to a single block with inline `MODE` notation.
  discovery-flow,
  delivery-flow, and operations-flow are excluded from §① (they are flow
  orchestrators and do not emit AGENT_RESULT in the standard way). (#131)

- **`archive-orphan-plans.yml`** (weekly safety-net workflow): Cron job (Mon 03:00 UTC)
  that scans active planning docs in `docs/design-notes/*.md`, queries each linked
  GitHub issue's state, and opens a single `chore:` PR to move any CLOSED-issue docs
  into `archived/`. Complements the PR-driven `archive-closed-plans.yml` by catching
  cases where the PR body lacked a `Closes #N` keyword or the issue was closed without
  a PR. Supports `workflow_dispatch` with `dry_run` input for pre-merge verification.
  Also updated `docs/design-notes/archived/README.md`: added cross-links to active
  planning docs and `proposals/`, fixed stale `docs/issues/` path references.
  (#118, PR-1 of 3)
- **`docs/design-notes/README.md`** (active-side lifecycle guide): New file documenting
  the design-notes directory lifecycle — header conventions, evergreen notes category,
  lifecycle flow (proposals → active → archived), automated archive paths (reactive +
  weekly safety-net), manual fallback, and directory purpose guide. Documents
  `compliance-auditor.md` and `performance-optimizer.md` as evergreen notes (no GitHub
  Issue header). Agent exclusions for `proposals/` added to `doc-reviewer` (Read Order
  item 6) and `handover-author` (Design notes scope + reading strategy). Optional
  `analyst` update adds a proposals-promotion paragraph before Step A.
  Wiki `Contributing.md` (EN + JA) updated with new "Design Notes Lifecycle" section
  covering the full directory structure, header conventions, lifecycle diagram, both
  automated archive paths, manual fallback, evergreen notes, and proposals lifecycle.
  (#118, PR-2 of 3)
- **`docs/design-notes/proposals/`** directory: New opt-in staging area for
  pre-issue ideas and exploration notes. Files here are intentionally not tied
  to a GitHub issue and are excluded from all archive automation
  (`archive-closed-plans.yml` and `archive-orphan-plans.yml`). Includes
  `proposals/README.md` with header conventions, promotion lifecycle (draft →
  promote to active planning doc → reject/pending), and cross-references to
  the active and archived README files. (#118, PR-3 of 3)

- **`document-locations.md` rule** (rule #14): Centralized path-resolution rule for
  Aphelion-generated planning / design / handoff documents. Default output location
  moved from repository root to `docs/<NAME>.md`; existing projects continue to work
  via root-fallback using a single `Glob("{docs/<NAME>.md,<NAME>.md}")` call.
  `ARTIFACT_PATHS` promoted to a first-class MUST field in `agent-communication-protocol.md`
  for Write-agents (prevents mid-flow docs/ vs root drift). All 40 agents updated with
  a one-line reference declaration; `TASK.md` explicitly excluded (remains root-fixed).
  (#117, PR #119 (PR-A) / #120 (PR-B) / #121 (PR-C))

- **Aphelion hooks** (3 MVP): `aphelion-secrets-precommit` (hook A), `aphelion-sensitive-file-guard`
  (hook B), and `aphelion-deps-postinstall` (hook E). Fourth defense layer for user-project safety:
  secrets pre-commit guard, sensitive file write block, and dependency-install vuln-scan reminder.
  Distributed via `src/.claude/hooks/` + `src/.claude/settings.json`; deployed by `npx aphelion-agents init/update`.
  `/secrets-scan` slash command refactored to source patterns from the canonical `secret-patterns.sh`
  library (P1–P8), eliminating double maintenance. (#107, PR #111 / #112 / #113 / #115 / this PR)
- **doc-reviewer** cross-cutting agent for SPEC ↔ ARCHITECTURE ↔ design-note consistency review.
  Auto-inserted by orchestrators per `orchestrator-rules.md` triggers. (#91, PR #92 / #93 / #95)
- **doc-flow** 5th orchestrator with 6 author agents (`hld-author`, `lld-author`,
  `api-reference-author`, `ops-manual-author`, `user-manual-author`, `handover-author`)
  for customer-deliverable generation (HLD / LLD / API reference / ops manual / user manual /
  handover). Invoked via `/doc-flow`. (#54, PR #96 / #97 / #98)
- 12 markdown templates under `.claude/templates/doc-flow/` (6 doc types × en/ja). (#54)
- `docs/wiki/{en,ja}/Agents-Doc.md` — 6th Agents Reference wiki page covering the 6
  Doc domain author agents (5 → 6 pages). (#54)
- shields.io badges in README.md / README.ja.md (`agents-39` / `commands-14` / `rules-12` /
  `license-MIT`) plus a Cloudflare Pages "Wiki" badge linking to https://aphelion-agents.com/.
  (#101, PR #102)

- `.github/workflows/check-readme-wiki-sync.yml` — advisory CI check for README ↔ Wiki
  drift; runs on every PR (`pull_request: [opened, edited, synchronize]`). Read-only
  check; does not block merge. Promotion to a required status check is a deliberate
  follow-up decision. (#81 / follow-up to #76)
- `language-rules.md` — "Repo-root README sync convention" sub-section closing
  the #75 dangling pointer (#82). Covers: §3.1 English canonical direction;
  §3.2 Same-PR mandatory sync with 7-day follow-up exception for minor fixes;
  §3.3 `^## ` heading parity enforced by `scripts/check-readme-wiki-sync.sh`
  Check 3; §3.4 `> EN canonical:` date marker deliberately not adopted for
  `README.ja.md`. Also updates `docs/wiki/{en,ja}/Rules-Reference.md` with
  a cross-reference bullet.

- `scripts/check-readme-wiki-sync.sh` — new executable script that checks
  cross-source consistency for three items: (1) agent count parity across
  `README.md`, `README.ja.md`, `docs/wiki/en/Home.md`, `docs/wiki/ja/Home.md`;
  (2) slash command list parity between `.claude/commands/aphelion-help.md`
  and `docs/wiki/en/Getting-Started.md`; (3) `^## ` heading count + line
  position match between `README.md` and `README.ja.md`. Exit 0 on success
  (silent), exit 1 with stderr message identifying the failed surface. (#76)
- `docs/wiki/{en,ja}/Contributing.md` — new §"README ↔ Wiki responsibility
  split" section (replaces the former §"README vs Wiki separation") documenting
  roles, boundary rule, and co-update set table; new PR Checklist entry for
  the co-update set check. (#76)
- `language-rules.md` — new "Hand-authored canonical narrative" section
  declaring per-directory canonical-language rules for `docs/wiki/{en,ja}/`
  (bilingual, English canonical, English-fixed skeleton),
  `docs/design-notes/<slug>.md` and `docs/design-notes/archived/<slug>.md`
  (single-file, follows `project-rules.md` → `Output Language`), and
  `README.md` / `README.ja.md` (bilingual, English canonical). Closes the
  PR #68 deferral recorded in `archived/english-rollout-residuals.md` §4-3
  / §7. (#75)
- `.github/workflows/archive-closed-plans.yml` — fires on `pull_request:
  opened` / `edited` / `synchronize`. Parses the PR body for `Closes #N` /
  `Fixes #N` / `Resolves #N` keywords, finds the matching planning doc by
  its `GitHub Issue: [#N]` header reference, `git mv`'s it into
  `docs/design-notes/archived/`, and pushes the resulting commit back to the
  PR branch. The archive move ships **in the same PR as the work** (no
  follow-up PR), eliminating the PR-proliferation problem of trigger-on-
  merge approaches. Idempotent (already-archived docs cause a no-op) plus
  an actor filter prevents the bot's own pushes from looping.
- `/aphelion-init` and `/aphelion-help` slash commands (#39 / #49)

### Changed

- **`init` merges an existing `.claude/settings.json` instead of destroying it** (#114):
  the CLI now parses the existing file, removes only Aphelion-managed hook entries, appends
  the template's, and writes the result back — preserving user settings. A malformed JSON
  file is skipped with a warning rather than overwritten. (Entry added retroactively in #200.)

- **analyst split into analyst-intake (Sonnet) + analyst-core (Opus)** (#139):
  `analyst` agent is split into three files. `analyst.md` is rewritten as a
  top-level Sonnet orchestrator (~115 lines) that chains the two new sub-agents.
  Pattern B (dual-path) design: standalone (`/analyst`) invocations use the
  `analyst` orchestrator which spawns `analyst-intake` then `analyst-core` via
  the Agent tool. Flow orchestrators (`delivery-flow`, `maintenance-flow`) spawn
  `analyst-intake` and `analyst-core` directly in sequence (spawning `analyst.md`
  as a sub-agent would fail because the Agent tool is unavailable in sub-agent
  contexts). `analyst-intake` (Sonnet) handles structured intake questions,
  planning doc §1-4 stub, GitHub issue initial creation, and work branch commit.
  `analyst-core` (Opus) handles Steps 1-5: issue classification, deep analysis,
  user approval gate, SPEC.md/UI_SPEC.md incremental updates, and GitHub issue
  body refinement. Resume mechanism: `analyst-intake` embeds a
  `<!-- analyst-handoff -->` YAML block in the planning doc; on re-invocation
  `analyst` orchestrator detects this block and skips intake, resuming from core.
  Per-invocation input cost ~24% reduction (intake phase moves from Opus to
  Sonnet, 5:1 price ratio). `/analyst` skill name unchanged. `delivery-flow.md`
  and `maintenance-flow.md` updated to spawn the intake→core chain directly.
  Agent count 40 → 42. (#139)

- **`aphelion-overview.md` slim** (#132 §B, PR-1 of 2): Removed duplicated
  content that is already covered by dedicated auto-loaded rules or per-agent
  definitions. Update history block compressed to 1-line git-log pointer (-7);
  Cross-cutting agents table deleted (covered by sandbox-runner.md /
  doc-reviewer.md) (-6); Doc Flow agents table deleted (covered by each
  author agent file) (-11); Hook layer section compressed to 2-line pointer
  to `hooks-policy.md` (-8); Document locations rule compressed to 2-line
  pointer (-8); Tech Stack Flexibility compressed (-4); Domain Flow ASCII
  diagram compressed while preserving all 5 flow names (-6). Total:
  131 → 84 lines (-38%). The `### Project-rules consultation (all agents)`
  section added by #131 §② is preserved verbatim. (#132)

- Agent count bumped 31 → 32 (`doc-reviewer`, #91) → 39 (`doc-flow` + 6 authors, #54).
  Reflected in README.md / README.ja.md body, `aphelion-overview.md`, and
  `docs/wiki/{en,ja}/Home.md`. (#54 / #91)
- Aphelion expanded from 4-domain to 5-domain workflow (added Doc domain). (#54)
- Agents Reference split from 5 pages to 6 pages (`agents-doc` added to wiki and sidebar). (#54)
- `docs/wiki/{en,ja}/Home.md` rule count corrected 9 → 12 to match actual files in
  `src/.claude/rules/` (catch-up after `denial-categories` #31 and
  `localization-dictionary` addition). (#103)
- `site/src/content/docs/{en,ja}/index.mdx` (Cloudflare Pages landing) refreshed for
  39 agents / 5 flows / Doc domain card / doc-reviewer mention. (#103)
- `site/astro.config.mjs` PAGES array: `Agents Reference` group now lists `agents-doc`
  so the Doc domain page appears in the sidebar. (#103)

- `.gitignore` — added `/.claude/worktrees/` entry to prevent untracked-directory
  noise when the claude CLI creates this directory during local worktree sessions.
  Anchored to root so only the repo-level copy is matched. (#80)
- `docs/wiki/{en,ja}/Getting-Started.md` — added a "Note on `TASK.md`" paragraph
  in the "What to Expect: A Typical Session" section (before "Session Resume")
  clarifying that an empty `TASK.md` at the repository root is the correct idle
  state between `developer` phases, not a sign of incomplete work. (#80)

- `docs/wiki/DESIGN.md` relocated to
  `docs/design-notes/archived/wiki-information-architecture.md`. The file
  was a one-shot architect deliverable from 2026-04-18 (wiki IA finalisation,
  revised 2026-04-24 for the 8→7 page change), structurally indistinguishable
  from `docs/design-notes/<slug>.md` planning docs except for its directory.
  Keeping it under `docs/wiki/` conflicted with `Contributing.md`'s "wiki is
  bilingual" rule. Cross-references in archived design notes (31 occurrences)
  are intentionally left as the original `docs/wiki/DESIGN.md` paths per the
  read-only archive policy. (#75)
- `docs/wiki/{en,ja}/Contributing.md` Bilingual Sync Policy: now points at
  `language-rules.md` as the broader source of truth for hand-authored
  canonical narrative; this section enforces only the wiki-bilingual subset.
  Canonical Sources block updated to reference the relocated wiki IA memo.
  (#75)
- `docs/wiki/{en,ja}/Rules-Reference.md` — language-rules entry expanded
  with a Hand-authored canonical narrative summary. (#75)
- `docs/design-notes/` (formerly `docs/issues/`) reorganised: 17 closed
  planning documents moved into `docs/design-notes/archived/` so the active
  directory only lists work in flight. Cross-references in active wiki / rule
  files updated to the new paths. Inter-archive references kept as the
  original relative paths (read-only policy).
  `docs/design-notes/archived/README.md` documents the convention.
- `docs/wiki/{en,ja}/Contributing.md`: new "Archiving closed planning docs"
  subsection.
- Renamed `docs/issues/` → `docs/design-notes/` and updated archive workflow
  accordingly (#51 / #52)
- Restructured `analyst` to absorb intake responsibilities; `/issue-new`
  shortcut removed (#62 / #63, #66)
- Shrank `analyst` scope to design-only — branch/PR/commit creation now
  handled downstream by developer (#66)
- Compressed `README.md` and `README.ja.md` (208/202 → 75 lines each),
  deferring deep content to the wiki (#53 / #69)
- Converted residual Japanese strings in agent-emitted document templates to
  English (#57 / #68)

### Removed

- `ISSUE.md` — deleted obsolete analyst v1-era issue draft (wiki-addition brief
  from 2026-04-18). The file had been superseded since `9c2b200` (`refactor:
  replace ISSUE.md file management with GitHub Issues`); `analyst.md:265` already
  states "No local ISSUE.md file is created." Recovery is available from git
  history. (#80)

- `/issue-new` slash command (replaced by enhanced `/analyst`) (#62 / #63)
- `/pm` slash command (functionally identical to `/delivery-flow`) (#55 / #67)

### Fixed

- **Sub-agents cannot call `AskUserQuestion` — documented, not "fixed" by adding it to
  `tools:`** (#181): none of the ~15 agents whose bodies mandate `AskUserQuestion` listed it
  in their `tools:` whitelist. The obvious repair would have been to add it everywhere — but
  Claude Code's subagent documentation states that its first tool filter "removes these
  tools, even when listed in the `tools` field", and `AskUserQuestion` is on that list. Only
  the main conversation and forks can prompt interactively. Adding the entry would have been
  a no-op that encoded a false expectation. Instead `user-questions.md` gains a platform-
  constraint section (spawned agents emit the question as text and the caller renders the
  gate), `orchestrator-rules.md` §"In-agent Approval Gates" states the emit-and-return
  contract, and the wiki records the rule with an explicit "never add it to `tools:`".

- **Archive workflow concurrency** (#210): `archive-closed-plans.yml` had no `concurrency:`
  key, so a rapid `edited` + `synchronize` pair could run two jobs that both `git mv` and
  push to the same PR branch, one failing on a non-fast-forward. It now serializes per PR.
  The orphan sweeper's comment claiming its group avoided "a race vs the PR-driven workflow"
  was wrong — concurrency groups do not span workflows — and now states what it actually
  does, and why the cross-workflow overlap is harmless (same idempotent move, different
  target branches).

- **Design-memo premises corrected** (#213, #216): `approval-mode-triage.md`'s TASK-009
  casing check now states that it scopes to `APPROVAL_MODE` *values*, so the `RUNNING_AUTONOMOUS`
  state label it defines elsewhere is not a violation, and gives the grep that distinguishes
  them; the Field Reference line budget from #131 is formally relaxed, with the reasoning
  (28 lines targeted duplication inside agent files, not the canonical index).
  `token-reduction.md` records that "≤85 lines" was a one-time landing criterion rather than
  a standing budget, and its broken `./archived/…` self-link is fixed.

- **Stale counts across README and wiki** (#198): `commands-14` (15 command files),
  `hooks-3` (4 distributed hooks), "Delivery (12 agents)" ×4 (13 since visual-designer),
  "MVP 3 hooks" in Home / Rules-Reference (4 since hook D, whose
  `APHELION_SKIP_RULES_CHECK=1` bypass was also missing from the inventory), and
  Agents-Maintenance's "3 agents + orchestrator" immediately followed by "the two supporting
  agents" (there are two). Check 5 now guards the badge subset.

- **`AGENT_RESTULT` typo ×18 in the JA wiki** (#201): four pages (Agents-Discovery,
  Agents-Orchestrators, Agents-Operations, Agents-Maintenance) carried a misspelling of a
  machine-readable protocol keyword that `language-rules.md` fixes as English. It had been
  detected and deferred twice, and re-propagated into a page rewritten in 2026-05-30.

- **CHANGELOG structure** (#199): `[Unreleased]` had accumulated duplicate `### Added` ×2,
  `### Changed` ×3, `### Fixed` ×2 and an `### Added (continued)`, violating the Keep a
  Changelog format the file declares. Merged to one heading per category, with a note
  explaining why there are no version headings between 0.3.2 and today (the bumps invalidate
  the npx cache; no releases were tagged).

- **Missing CHANGELOG entries** (#200): #109, #114, #130, #141 and #161 changed
  user-visible behaviour but were never recorded. Added retroactively, together with the
  entry criterion that was previously applied inconsistently.

- **design-notes/README's evergreen claim** (#208): it named `compliance-auditor.md` and
  `performance-optimizer.md` as evergreen notes that "the archive automation skips safely"
  and told maintainers not to move them — but both carry a `> GitHub Issue:` header and
  will be archived the moment #56 / #58 close. The section now describes the real rule and
  states that there are currently no evergreen notes.

- **Dogfooding hooks are no longer shipped** (#197): three hooks whose own headers say
  "this repo only, NOT shipped via bin/init" were copied into every user project by the
  recursive `hooks/` overlay — inert (the settings template never registers them) but
  present and executable. `init` / `update` now exclude them by name, `hooks-policy.md`
  documents their existence and exclusion, and installations that already received them get
  them reported as removed-upstream files by `update` (#207 machinery).

- **`/aphelion-check` checks hook D and gives working remediation** (#205): it verified only
  three hooks, so an installation missing the `SessionStart` hook D entry — precisely the
  legacy case `hooks-policy.md` warns about — reported green. Its remediation was stale too:
  it described `init` as copy-if-absent and `settings.json` as protected after init, both
  untrue since the #114 merge implementation, and told users to re-run `init`, which exits 1
  when `.claude/` exists. Now: four hooks, `update` as the fix, plus a note that a hook you
  deliberately removed stays removed (0.3.9 behaviour) and a manifest-presence report.

- **`/rules-designer` and `/aphelion-init` match the agent** (#204): the command file claimed
  the agent generates `CLAUDE.md` in the project root (it writes
  `.claude/rules/project-rules.md`), and `/aphelion-init` promised existing-file detection
  and standalone support the agent did not implement. Since `/aphelion-init` is the mandatory
  first-run command, "INTERVIEW_RESULT.md required" pushed brand-new users into `interviewer`
  before they could configure anything. The agent now treats all Discovery artifacts as
  optional (asking directly when absent, defaulting from what the repo shows) and detects an
  existing `project-rules.md` to offer amend / recreate instead of overwriting it.

- **Getting-Started stops advertising commands that do not exist** (#206): Scenario 5 told
  users to run `/security-auditor` and `/doc-writer`; neither has a command file. It now
  lists the standalone commands that do exist and explains that other agents are invoked in
  plain language.

- **doc-flow creates its output directory** (#185): the six author agents own `Write` but not
  `Bash`, and each delegates `mkdir -p docs/deliverables/{slug}/` to the orchestrator — which
  had no such step. The first `Write` of a fresh project failed. `doc-flow` now creates the
  directory as soon as the slug is fixed.

- **scaffolder owns branch creation** (#186): as the first implementation-tier agent on
  Standard / Full it may run with no work branch open, yet its Git step went straight to
  `git commit`, risking a scaffold committed to `main`. It now checks the current branch,
  creates `feat/{slug}` when on `main`, pushes, and reports `BRANCH`.

- **Artifacts of Bash-less agents have an owner** (#187): SPEC.md, UI_SPEC.md, VISUAL_SPEC.md,
  TEST_PLAN.md, SCOPE_PLAN.md, OPS_PLAN.md and `project-rules.md` are written by agents with
  no `Bash`, and no rule said who commits them — they were left uncommitted or swept into a
  later `developer` commit, breaking the one-commit-per-task rule. `git-rules.md` now assigns
  the commit to the spawning flow orchestrator (one commit per phase, staged from the agent's
  `ARTIFACT_PATHS`), with a step in the Phase Execution Loop. `rules-designer` is no longer
  listed as a committing agent — it owns no `Bash`.

- **sandbox-runner matches sandbox-policy** (#188): the agent implemented host detection for
  Copilot / Codex and an `advisory_only` mode that the policy — "Claude Code only … no
  multi-platform detection" with a four-mode table — does not define. The detection step and
  the fifth mode are gone; the wiki diagrams and mode lists follow.

- **sandbox-runner placement names the right flow** (#193): both the orchestrator rules and
  the policy placed `sandbox-runner` before `releaser` "in Operations Flow", but `releaser`
  is a delivery-flow Full-plan agent and Operations has no such phase. Operations now lists
  `db-ops` / `observability`; the `releaser` rule moves to Delivery.

- **One PRODUCT_TYPE resolution chain** (#196): three flows used three different fallback
  orders, and `operations-flow` skipped `SPEC.md` entirely — so a `cli` project declared in
  SPEC but not in project-rules.md would have had Operations run against it. The canonical
  chain now reads "entry handoff file → SPEC.md → project-rules.md → service", with the
  per-flow difference limited to *which* handoff file step 1 consults.

- **Minimal has no UI sub-flow** (#182): `delivery-flow`'s agent matrix said Minimal skips
  `ux-designer`, while another section told `ux-designer` to write a lightweight-default
  block into `UI_SPEC.md` on "Minimal / Light" — a file Minimal never produces. Minimal now
  consistently runs no UI agent (`architect` derives the UI from SPEC.md); the
  lightweight-default path is Light-only. `ux-designer.md` and the wiki follow.

- **`e2e-test-designer` restored to the canonical triage table** (#183): `orchestrator-rules.md`
  listed it in no tier, so an orchestrator following the canonical table skipped E2E design
  for Light UI projects even though `delivery-flow.md` runs it there.

- **`tester`'s NEXT hints match real routing** (#189): the success hint always said
  `reviewer` (wrong on Minimal, which has no reviewer), and the failure hint ignored the
  `TC-E2E-` / `TC-GUI-` branch to `e2e-test-designer`. `maintenance-flow` also declared its
  own "Max 3 retries" limit, which `orchestrator-rules.md` forbids; it now references the
  single shared limit and states the test-designer-less chain explicitly.

- **`security-auditor` position** (#190): its own description claimed it runs "in parallel
  with or just before reviewer", the opposite of every flow, which places it after review.

- **discovery Pattern 2 respects the plan tier** (#191): a blocked `scope-planner` rolled
  back to `researcher` unconditionally, launching a Standard+ agent inside a Light run with
  no user approval. Light now prefers `interviewer`, or asks before making a tier exception.

- **DELIVERY_RESULT.md has one template** (#192): the producer's copy and the spec's copy had
  drifted in both directions (missing resolved paths on one side, a two-value `PRODUCT_TYPE`
  enum on the other that could not express the `library` / `cli` skip condition).
  `delivery-flow` now references the canonical template, which carries the four-value enum.

- **HAS_UI / UI_TYPE persist across the flow boundary** (#194): the Discovery triage asked the
  user about UI, then dropped the answer — `delivery-flow` re-inferred it from
  `spec-designer`. Both are now required fields of DISCOVERY_RESULT.md, and delivery-flow's
  resolution order puts them above re-inference.

- **doc-flow Standard/Full boundary is exclusive** (#195): "5–6 types" and "all 6" both
  matched a six-type selection, leaving the promotion rule undefined. Standard is now exactly
  5, Full is exactly 6, and the verification step is what defines Full.

- **Stale `analyst` references swept from rules and agents** (#175): flow orchestrators
  document that `analyst` must never be spawned as a sub-agent (it uses the Agent tool
  internally) and that `analyst-intake` → `analyst-core` is the only correct spawn path —
  but `orchestrator-rules.md` (Maintenance triage, rollback targets), `change-classifier.md`
  (`NEXT: analyst`), `impact-analyzer.md`, `architect.md`, `developer.md`,
  `document-locations.md` and `agent-communication-protocol.md` still named the old agent.
  Following them literally meant spawning a broken agent or misattributing git
  responsibilities (`git-rules.md` assigns branch creation to `analyst-intake`; the
  top-level `analyst` performs no git operations). Wiki-side occurrences are tracked
  separately.

- **`analyst-core.HANDOFF_TO` is plan-dependent** (#176): the contract emitted a fixed
  `architect`, while `maintenance-flow` expected `architect | developer` — and the Patch
  plan has no architect phase, so the routing hint pointed at a phase that does not exist.
  `HANDOFF_TO` / `NEXT` now resolve to `developer` when the caller states the plan has no
  architect phase, and `maintenance-flow` says so in the Patch spawn prompt.

- **maintenance Patch's doc-reviewer condition is satisfiable** (#177): it required
  `analyst-core.DOCS_UPDATED` to contain SPEC.md **or ARCHITECTURE.md**, but analyst-core
  is explicitly forbidden from writing ARCHITECTURE.md and its DOCS_UPDATED schema has only
  SPEC.md / UI_SPEC.md keys — half the condition could never hold. Now reads SPEC.md or
  UI_SPEC.md, matching the emitter. (The third divergent wording in `orchestrator-rules.md`
  was corrected in #224.)

- **`DOC_REVIEW_RESULT` vocabulary unified on `pass` / `fail`** (#173): the canonical
  Field Reference in `agent-communication-protocol.md` declared
  `passed | has-inconsistencies`, while the emitter (`doc-reviewer.md`) and every parser
  (`orchestrator-rules.md`, `discovery-flow.md`) used `pass | fail`. Anyone implementing
  against the protocol table would have broken the rollback trigger. The wiki's third
  value (`conditional`), which existed nowhere in the implementation, is gone too.

- **`DOC_REVIEW_RESULT: fail` now requires `STATUS: failure`** (#174): the Doc Review FAIL
  rollback fires on the AND of both fields, but `doc-reviewer.md` never said what STATUS to
  emit when INCONSISTENCY_COUNT ≥ 1 — a `success` + `fail` pair silently skipped the
  rollback chain. The pairing is now mandatory in the agent definition and the protocol
  table, and `orchestrator-rules.md` treats a mismatched pair as a fail (safe side).

- **doc-reviewer knows about visual-designer** (#184): the agent's own trigger list omitted
  `visual-designer` even though both `orchestrator-rules.md` and `delivery-flow.md` insert it
  there, and `VISUAL_SPEC.md` was missing from the read order — so a visual-designer-triggered
  review never read the artifact under review. Adds the read-order entry (HAS_UI=true and
  plan ≥ Standard), a TRIGGERED_BY → required-document table for the `STATUS: error` rule,
  and corrects the stale `analyst` references to `analyst-core` (#139 split).

- **`update` no longer revives hooks the user removed** (#202): `mergeSettingsJson()`
  deleted every `aphelion-`-marked entry and re-added the full template, so disabling a
  hook by removing its `settings.json` entry — the method `hooks-policy.md` documents as
  the only bypass for hook B — was undone on the next `update`. The merge now refreshes
  entries that are still present, adds hooks that are new since the last run, preserves
  user-owned entries, and skips (with a printed notice) any template hook that was known
  last run and is now absent. Pre-manifest installations get one transitional run where
  all template hooks are re-added, then removals stick. `hooks-policy.md` §3 / §4.2 / §4.3
  and `docs/wiki/{en,ja}/Hooks-Reference.md` updated to match the implementation.

- **doc-flow templates reach npx installs** (#203): `.claude/templates` was missing from
  `package.json` `files`, so the 12 doc-flow templates never shipped through
  `npx aphelion-agents init`. Every author agent's template resolution (steps 1-4) failed
  and silently degraded to `TEMPLATE_USED: agent-emit-fallback`, while a dev-checkout
  install behaved differently. Added to `files`, with a smoke-test lock.

- **architect can now perform its own git workflow** (#167): `architect.md`
  declared `tools: Read, Write, Glob, Grep` while its body defined three
  mandatory bash workflows (branch check, design-note commit + push, standalone
  branch creation) and its completion checklist required "committed and pushed" —
  the agent could not satisfy its own completion conditions. `Bash` is added to
  its tools, along with the `sandbox-policy` / `denial-categories` reference
  lines, `REPO_STATE=local-only` / `none` downgrade behaviour, and the
  Planning-tier `BRANCH` field (never `PR_URL`) in `AGENT_RESULT`.
  `docs/wiki/{en,ja}/Agents-Delivery.md` updated. (#167)

- **MAINTENANCE_RESULT.md consumer contract** (#168): `maintenance-flow`'s Major
  plan generated `MAINTENANCE_RESULT.md`, but `delivery-flow` never read it and
  `orchestrator-rules.md`'s Handoff File Specification had no entry for it, so the
  recommended plan, impact analysis, and pre-audit remediation items were silently
  discarded. Adds the canonical template + required-field validation to
  `orchestrator-rules.md`, makes `maintenance-flow.md` reference that single
  definition instead of restating it, and gives `delivery-flow.md` handoff-file
  precedence, required-field validation (`STATUS: error`, no interview fallback),
  a field-to-phase mapping, `Recommended plan` as the triage proposal, and
  start-from-`architect` in differential mode.
  `docs/wiki/{en,ja}/{Architecture-Protocols,Agents-Orchestrators,Triage-System,Getting-Started}.md`
  updated. (#168)

- **Planning-doc-on-work-branch rule** (#136): `analyst` is now a
  Planning-tier agent responsible for branch creation and committing the
  planning doc + any SPEC/UI_SPEC edits immediately after `gh issue create`.
  `architect` reuses that branch and commits the companion design note
  (`<slug>-design.md`). `developer`'s Startup Probe detects untracked files
  under `docs/design-notes/` and emits a warning (fail-safe; no auto-add).
  `git-rules.md` §"Branch & PR Strategy" now defines the Planning-tier /
  Implementation-tier split. `docs/design-notes/README.md` Lifecycle diagram
  updated to show the full agent handoff chain. (#136)

- **TASK.md reset enforcement** (#128): The `developer` agent now explicitly
  resets `TASK.md` to an empty placeholder at phase completion, enforcing the
  rule already stated in `document-versioning.md` §"TASK.md Lifecycle". Adds a
  "Phase Completion Reset" procedure section (with bash snippet) and a new
  Completion Conditions checkbox to `.claude/agents/developer.md`. Expands the
  "Note on TASK.md" in `docs/wiki/{en,ja}/Getting-Started.md` to describe the
  full 3-state lifecycle (generate → tick → reset). Updates developer row in
  `docs/wiki/{en,ja}/Agents-Delivery.md` to document the reset responsibility.
  Also resets the currently-stale `TASK.md` on `main` to the empty placeholder.
  (#128)

- Committed orphan design notes for #53–#58 that were never `git add`-ed by
  the legacy `/issue-new` (#61 / #64)

### Notes

- **Why everything since 0.3.2 sits in `[Unreleased]`** (#199): `package.json` has moved
  0.3.2 → 0.3.14, but each bump exists to invalidate the downstream `npx` cache (see
  `wiki/en/Contributing.md` §"Version bumping policy"), not to cut a release — the
  repository has no git tags. Entries therefore accumulate here until a release is
  actually tagged, at which point this section is split into version headings. The
  duplicate `### Added` / `### Changed` / `### Fixed` headings this section had collected
  (two Added, three Changed, two Fixed, plus an "Added (continued)") have been merged into
  one heading per category, as Keep a Changelog requires.

- **What gets an entry** (#200): user-visible changes — agent / rule / command behaviour,
  CLI behaviour, distributed files, and anything that changes what an operator must do.
  Wiki-only and CI-only changes are recorded in git history rather than here, unless they
  change a documented contract users rely on. Earlier entries were inconsistent on this
  point (#80 and #103 were listed, #77 / #105 / #146 were not); the rule above is the one
  applied from now on.

## 0.3.2 - 2026-04-25

### Added

- `/aphelion-init` slash command that launches `rules-designer` for first-run
  project rules setup. Use immediately after `npx aphelion-agents init` to
  populate `.claude/rules/project-rules.md` interactively. (#39)
- `/aphelion-help` slash command listing all 13 Aphelion slash commands grouped
  by category (Orchestrators / Shortcuts / Standalone agents / Safety helpers /
  Discoverability). Static markdown table — Claude Code built-ins (`/init`,
  `/help`, `/clear`, `/agents`, etc.) are intentionally omitted; run `/help`
  for those. (#39)

### Changed

- `package.json` version bumped from `0.3.1` to `0.3.2`.
- `docs/wiki/{en,ja}/Getting-Started.md`: added a step pointing to
  `/aphelion-init` between install and first Discovery run. README.md and
  README.ja.md got the same one-line pointer.
- `docs/wiki/{en,ja}/Contributing.md` PR checklist: added a reminder that
  any PR adding a `.claude/commands/*.md` file should also append a row to
  `aphelion-help.md` so the static listing stays in sync with the directory.

## 0.3.1 - 2026-04-25

### Changed

- `.claude/settings.local.json` rewritten as a deny-list policy. `allow: ["*"]` plus
  explicit `deny` entries for destructive_fs, destructive_git, privilege_escalation,
  secret_access, prod_db, and external publish commands. Aligns settings enforcement with
  the categories already documented in `src/.claude/rules/sandbox-policy.md`. Removed
  the redundant trailing `allow` entries (`Bash(git commit:*)`, `Bash(git add:*)`,
  `Bash(gh:*)`) that were no-ops under the leading `*`. (#31)
- Canonical source for `settings.local.json` relocated to `src/.claude/settings.local.json`
  (committed template), mirroring the post-#44 layout for `rules/`. The file at
  `<repo>/.claude/settings.local.json` (gitignored) remains the Aphelion repo's own
  dev-time copy. CLI ships from `src/`; `cmdInit` writes the template to consumers,
  `cmdUpdate` preserves any pre-existing consumer customisation.
- `bin/aphelion-agents.mjs`: `cmdInit` and `cmdUpdate` now also overlay
  `src/.claude/settings.local.json` onto the target's `.claude/`. Previously the file
  shipped nothing (gitignored + excluded from `files` allowlist after PR #46), so the
  deny-list update would have been invisible to consumers.
- `package.json` `files` allowlist extended with `src/.claude/settings.local.json`.
- `package.json` version bumped from `0.3.0` to `0.3.1`.
- `.gitignore` anchored to root (`/.claude/settings.local.json`) plus a negation
  un-ignoring `src/.claude/settings.local.json` so the canonical template stays
  trackable even when the user's global gitignore matches `**/.claude/settings.local.json`.
- `scripts/smoke-update.sh` extended: asserts that `init` installs the deny-list template
  and that the file matches the canonical at `src/.claude/settings.local.json` byte-for-byte.

### Added

- `src/.claude/rules/denial-categories.md` — auto-loaded rule that classifies Bash command
  failures into `sandbox_policy` / `os_permission` / `file_not_found` / `platform_heuristic`
  and prescribes per-category recovery. Documents the manual `!cmd` shell-prompt fallback
  for cases where Claude Code's sandbox refuses a command even after `AskUserQuestion`
  approval (verified PR #29 cleanup, 2026-04-24). (#31)
- 13 Bash-owning agents (`developer`, `tester`, `poc-engineer`, `scaffolder`,
  `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`,
  `observability`, `analyst`, `change-classifier`, `impact-analyzer`) now reference
  `denial-categories.md` alongside `sandbox-policy.md`. No behavioral change beyond the
  documented diagnostic protocol.
- New "Settings deny-list policy" / "When a command is denied" subsections in
  `docs/wiki/{en,ja}/Contributing.md` covering customisation, manual fallback, and
  per-category recovery.
- New `denial-categories` entry in `docs/wiki/{en,ja}/Rules-Reference.md`. Page now
  documents 11 rules instead of 10.

### Notes

- The `preToolUse` hook prototype for one-shot escalation is intentionally **out of scope**
  per ADR-002 in `docs/issues/archived/deny-list-permission-policy.md`. Claude Code does not
  currently expose a documented hook contract that lets settings-level "approved this
  exact invocation, just this once" semantics work — observed in PR #29 cleanup. Upstream
  feedback to Anthropic is recommended (Q5 of the planning doc) but separate from this PR.

## 0.3.0 - 2026-04-25

### Changed

- Canonical source for `.claude/rules/` relocated from `<repo>/.claude/rules/` to
  `<repo>/src/.claude/rules/` to eliminate Claude Code's additive auto-load of rules
  when working inside the Aphelion repository itself. Per ADR-001 in
  `docs/issues/archived/claude-rules-isolation.md`, only `rules/` is moved; `agents/`,
  `commands/`, and `orchestrator-rules.md` remain at repo root because their
  override semantics (project wins over user-global) already produce correct
  single-load behavior. (#44)
- `bin/aphelion-agents.mjs` now uses a hybrid source layout: `agents/`, `commands/`,
  and `orchestrator-rules.md` are copied from `<packageRoot>/.claude/`; `rules/`
  is overlaid from `<packageRoot>/src/.claude/rules/`.
- `package.json` `files` allowlist updated: replaced `.claude/rules` with
  `src/.claude/rules`.
- `package.json` version bumped from `0.2.0` to `0.3.0` per the post-#43 policy
  ("any change under `.claude/**` requires a version bump").
- `scripts/smoke-update.sh` asserts against `src/.claude/rules/` as the canonical
  source path.

### Added

- `src/.claude/README.md` explaining the directory's purpose and warning against
  re-symlinking it to repo root.
- `docs/wiki/{en,ja}/Contributing.md` section "Editing Aphelion's own rules"
  documenting ADR-005's edit-vs-effect decoupling: maintainer rule edits do
  not take effect in their session until they run `update --user`.

### Migration

- Existing users on `0.2.0` need to run `npx github:kirin0198/aphelion-agents#main update --user`
  (or `npm cache clean --force` first if `0.3.0` doesn't pull immediately) to refresh
  `~/.claude/rules/`. The version bump invalidates the npx cache; no separate `migrate`
  command is provided per ADR-004.

## 0.2.0 - 2026-04-25

### Fixed

- `npx aphelion-agents update` now reliably propagates `.claude/rules/` updates by bumping
  `package.json` version (which invalidates the npx cache key `name@version`). Previously,
  successive `update` runs against `0.1.0` could silently reuse a stale extracted tarball
  from `~/.npm/_npx/` and overwrite the user's `.claude/` with content matching a long-past
  commit. (#43)

### Changed

- `update` now prints `source: aphelion-agents@<version>` on success so users can detect
  stale-cache scenarios at a glance.
- `--help` text now enumerates `update`'s actual scope (agents/, rules/, commands/,
  orchestrator-rules.md) and explicitly notes that `settings.local.json` is preserved.
- `package.json` `files` field tightened from a coarse `[".claude"]` allowlist to an
  explicit list of distributable subpaths. Excludes `.claude/settings.local.json` and the
  local-only `.claude/worktrees/` directory from the published tarball; npm honors `files`
  over `.npmignore` for paths matched by the field, so the explicit allowlist is the
  reliable mechanism.
- Dropped GitHub Copilot / OpenAI Codex exports; project is now Claude Code only.
  Removed `platforms/` directory (35 files, ~468 KiB), `scripts/generate.mjs`, and the
  Platform-Guide wiki page. Historical multi-platform content remains accessible in git
  history up to commit `0ebd78e`
  ("feat: design /maintenance-flow (4th flow for existing-project maintenance)").
- `sandbox-policy.md` simplified to Claude Code–only: removed 4-way platform detection
  (claude_code / copilot / codex / unknown), removed `advisory_only` sandbox mode.
- `.claude/CLAUDE.md` moved to `.claude/rules/aphelion-overview.md` with auto-load header;
  the Aphelion workflow overview is now part of the auto-loaded rules collection.
- `rules-designer` now writes project-specific rules to `.claude/rules/project-rules.md`
  instead of the project root `CLAUDE.md`.

### Added

- `scripts/smoke-update.sh` — POSIX bash release-time gate that verifies `update`
  overwrites mutated rules and preserves `settings.local.json`.
- README cache-caveat subsection (en + ja) documenting `npx ...#main update` and
  `npm cache clean --force` as the user-side workarounds when the cache is stale.
- Version-bumping policy in `docs/wiki/{en,ja}/Contributing.md`: any PR that modifies
  `.claude/agents/`, `.claude/rules/`, `.claude/commands/`, or
  `.claude/orchestrator-rules.md` MUST bump `package.json` `version`. This reverses
  the prior "no version bump required for maintainers" stance from `0.1.0` (which was
  the root cause of #43).

### Removed

- The project-root `CLAUDE.md` artifact from `rules-designer` output — Aphelion no longer
  generates it to avoid collisions with existing user `CLAUDE.md` files.

### Migration

- Existing users who rely on `.claude/CLAUDE.md`: the file has been renamed to
  `.claude/rules/aphelion-overview.md` and is now auto-loaded by Claude Code. No manual
  action required if you use the CLI (`npx aphelion-agents update`), but **make sure to
  bypass any stale npx cache** — see the README's "Cache caveat" subsection.
- Existing projects with a hand-authored `CLAUDE.md` at the project root: consider moving
  it to `.claude/rules/project-rules.md` so it is auto-loaded alongside Aphelion rules
  (optional).

## 0.1.0 - 2026-04-23

### Added

- **CLI tool**: `npx github:kirin0198/aphelion-agents init` — Install `.claude/` into the current project directory
  - `--user` flag: install into user home (`~/.claude/`)
  - `--force` flag: overwrite existing `.claude/` directory
- **CLI tool**: `npx github:kirin0198/aphelion-agents update` — Update existing `.claude/` to the latest version
  - `--user` flag: update user home (`~/.claude/`)
  - Protects `.claude/settings.local.json` from overwrite (existing file is preserved)
- **`bin/aphelion-agents.mjs`**: zero-dependency single-file CLI (Node standard library only)
  - `node:fs/promises`, `node:path`, `node:os`, `node:url` — no third-party packages
  - Node 20+ version check with Japanese error message
  - User-facing messages in Japanese (language-rules compliant)
- **LICENSE** file (MIT)

### Distribution

- **Distribution channel**: GitHub main branch via `npx github:kirin0198/aphelion-agents`
- **npm publish**: not performed (`private: true` in `package.json`)
- Originally documented as "no version bump required for maintainers"; reversed in `0.2.0`
  because the unbounded reuse of the same `name@version` key caused npx caches to serve
  stale content (#43).
