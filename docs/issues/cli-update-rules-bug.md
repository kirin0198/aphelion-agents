# `npx aphelion-agents update` — Stale `rules/` Bug

> Reference: current `main` (HEAD `d30d1b3`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the fix will be executed in a follow-up `developer` phase
> GitHub Issue: [#43](https://github.com/kirin0198/aphelion-agents/issues/43)

---

## 1. Background & Motivation

### 1.1 Reported symptom

A user ran `npx github:kirin0198/aphelion-agents update` against `~/.claude/`. After the
command reported success, `.claude/agents/` appeared current but `.claude/rules/` remained on
an older revision (sandbox-policy still at 2026-04-18 instead of repo HEAD's 2026-04-25). See
[#43](https://github.com/kirin0198/aphelion-agents/issues/43).

The user's hypothesis list ranked, in priority order:
1. `cp` filter logic accidentally excluding `rules/`
2. `package.json` `files` field × `.gitignore` interaction
3. `npx github:` vs `npx aphelion-agents` (npm) divergence
4. Filesystem-level interference (symlinks, ro attrs)

### 1.2 Pre-investigation result (HEAD `d30d1b3`)

The hypotheses above are all **incorrect**. The root cause is the **npx cache combined with a
never-bumped `package.json` version**. Evidence collected during this analyst phase:

1. **The CLI's copy logic is sound.** A controlled run of
   `node /home/ysato/git/aphelion-agents/bin/aphelion-agents.mjs update` against a freshly
   `init`'d target correctly overwrote `.claude/rules/`, including `sandbox-policy.md`. The
   `cp(..., {recursive: true, force: true, filter})` call (`bin/aphelion-agents.mjs:117-150`)
   excludes only `settings.local.json`. `rules/` is not filtered.

2. **Both extant npx caches ship the stale 2026-04-18 sandbox-policy.** Inspection of
   `~/.npm/_npx/`:

   | Cache key | `package.json` version | `.claude/rules/sandbox-policy.md` "Last updated" |
   |-----------|------------------------|--------------------------------------------------|
   | `3dfff890cefe9e12` | `0.1.0` | `2026-04-18` |
   | `4108b50149260794` | `0.1.0` | `2026-04-18` |
   | (repo HEAD `d30d1b3`) | `0.1.0` | `2026-04-25` |

   That is, the literal version string `0.1.0` resolves to **three different content snapshots**
   depending on when each was first cached. npm/npx keys its cache by `name@version`; on a
   second invocation, npx finds a directory whose `package.json` already matches the requested
   spec and skips the fetch step. The CLI then dutifully copies that *cached, stale* `.claude/`
   onto `~/.claude/` — overwriting nothing meaningful because the contents are already what was
   shipped before. From the user's vantage point, `update` "did nothing" to `rules/` even
   though `agents/` may have changed in a more recent uncached run.

3. **Distribution channel.** `package.json` declares `"private": true` — Aphelion is not
   published to npmjs.com. All real-world installs flow through `npx github:kirin0198/aphelion-agents`
   (a tarball built from a git ref), or `npx aphelion-agents` if a stale cache from a prior
   github tarball is reused. The tarball metadata still uses `name@version` from `package.json`,
   so the cache key is identical to what a published package would produce. The "private + git
   distribution" combo does **not** insulate the project from this caching bug; it actually makes
   it worse, because `0.1.0` is being asked to designate every commit on `main` indefinitely.

4. **Why `agents/` "looked refreshed" but `rules/` did not.** The user's mental comparison is
   between (a) what they *expected* given recent merges to `main` and (b) what landed in
   `~/.claude/`. If their cache was populated *between* a PR that touched only `agents/` (e.g.
   the maintenance-flow agent) and a PR that touched `rules/` (e.g. PR #41 for #36), then
   `agents/` would already match expectations from the cache, while `rules/` would lag.

### 1.3 Goal

Two concerns to address, in priority order:

1. **User-visible: `update` must reliably bring `~/.claude/` to repo HEAD.** Whether by cache
   bypass, version bumping, or both.
2. **Process: clarify and document `update`'s scope** so that future "did it update?"
   questions can be answered by looking at the help text or README rather than re-running this
   investigation.

The bug is **not** about the `cp` mechanics (rule out hypotheses 1, 2, 4) but about
**version/cache staleness** (a refinement of hypothesis 3).

---

## 2. Current Inventory

### 2.1 What the CLI actually does today

`bin/aphelion-agents.mjs` (108 LOC of logic):

| Region | Behavior |
|--------|----------|
| L23-24 | `packageRoot = .../aphelion-agents`, `sourcePath = packageRoot/.claude` |
| L92-113 (`cmdInit`) | `cp(sourcePath, targetPath, {recursive, force: true})` — full overwrite if `--force`, refuse if existing target without `--force` |
| L117-150 (`cmdUpdate`) | `cp(sourcePath, targetPath, {recursive, force: true, filter})` — full recursive overwrite **except** `settings.local.json` (only when target side already has one) |
| L66-89 (`showHelp`) | Help text says "update : カレントディレクトリの .claude/ を最新に更新する". No mention of *what* "最新" resolves to or which subpaths are touched. |

`update`'s actual scope (verified empirically):

| Path under target `.claude/` | Behavior |
|------------------------------|----------|
| `agents/*.md` | Overwritten unconditionally |
| `rules/*.md` | Overwritten unconditionally |
| `commands/*.md` | Overwritten unconditionally |
| `orchestrator-rules.md` | Overwritten unconditionally |
| `settings.local.json` | Skipped if target side has one; otherwise overwritten |
| anything else under `.claude/` | Overwritten unconditionally |

### 2.2 What `npm pack --dry-run` ships

61 files, 107.9 kB tarball. Contents:

| Subtree | Count | Notes |
|---------|-------|-------|
| `.claude/agents/*.md` | 30 | All shipped |
| `.claude/commands/*.md` | 11 | All shipped |
| `.claude/rules/*.md` | 11 | All shipped |
| `.claude/orchestrator-rules.md` | 1 | |
| `.claude/settings.local.json` | 1 | **Shipped** (235 B). Defense-in-depth: filter in `cmdUpdate` is the only thing protecting user-customised settings. |
| `.claude/worktrees/` | 0 (empty dir, npm skips) | But not gitignored or `.npmignore`'d. A contributor adding files here would ship them. |
| top-level | `LICENSE`, `README.md`, `README.ja.md`, `bin/aphelion-agents.mjs`, `package.json` | |

### 2.3 What `package.json` declares

```json
{
  "name": "aphelion-agents",
  "version": "0.1.0",
  "private": true,
  "files": ["bin", ".claude"]
}
```

No `.npmignore` exists. `.gitignore` lists `.claude/settings.local.json` and `node_modules/` only.

### 2.4 What npx caches today

`~/.npm/_npx/<hash>/node_modules/aphelion-agents/`. Cache key is keyed on `name@version` (plus
the install spec); npx will reuse a cache hit unless the spec forces a new resolution (e.g.
`@latest` against a published registry, or a different git ref).

Two relevant invocation forms:

| Invocation | Cache reuse behavior |
|------------|---------------------|
| `npx github:kirin0198/aphelion-agents update` | npx clones the default branch, builds a tarball, computes its hash; if a cache directory matches **the package's `name@version`** *and* npx considers the spec satisfied, it reuses. In practice on Node 20+, github specs are re-fetched fairly often — but the **extracted package** at `~/.npm/_npx/<hash>/` may persist across invocations if its `package.json` already matches what was just fetched. **Result**: stale extraction can survive even though the github-side tarball has new content, because both have `version: 0.1.0`. |
| `npx aphelion-agents update` | npx tries to resolve from the npm registry. Aphelion is `"private": true`, so the registry returns 404. npx then *may* fall back to a cache hit on the same name/version. This path is documented as undefined behavior; do not rely on it. |
| `npx github:kirin0198/aphelion-agents#main update` | Forces re-resolution against the named ref. Combined with `npm cache clean` semantics, this is the most reliable bypass available today. |

---

## 3. Decisions to Make

Listed with the analyst's recommendation in bold. User confirmation requested at §11.

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | Primary fix mechanism for cache staleness | (a) bump `version` per release, (b) keep `0.1.0` and force-bypass cache via README invocation, (c) both | **(c) both** — version bumps are the durable fix; documentation of cache-bypass invocations covers users on already-stale caches |
| D2 | Versioning scheme | (a) date-based (`YYYY.MM.DD`), (b) SemVer with manual bumps, (c) SemVer + commit-derived prerelease (`0.1.0-<sha>`) | **(b) SemVer with manual bumps**, plus a CONTRIBUTING note that any change under `.claude/**` requires a bump. Avoids tooling. Conventionally `0.2.0` for the first post-fix release. |
| D3 | Where to document the bump rule | (a) `docs/wiki/{en,ja}/Contributing.md`, (b) new `CONTRIBUTING.md`, (c) inline comment in `package.json` | **(a)** — repo already centralises contributor guidance in the wiki; existing PR-checklist section is the natural home |
| D4 | Should `cmdUpdate` print which package version sourced the update? | (a) yes (one line: `Source: aphelion-agents@<ver>`), (b) no | **(a) yes** — costs ~3 LOC; gives users immediate signal "did npx actually fetch?" without manual cache spelunking |
| D5 | README invocation guidance | (a) document `npx github:kirin0198/aphelion-agents#main update` as the recommended form, (b) document `npm cache clean --force` workaround, (c) both | **(c) both** — `#main` covers the github path; cache clean covers the npm-spec path. Two short bullets. |
| D6 | Defense-in-depth: exclude `.claude/worktrees/` from the package | (a) add `.npmignore`, (b) add to `.gitignore` only, (c) leave as-is | **(a) add `.npmignore`** with one line: `.claude/worktrees/`. Keeps `worktrees/` available for local agent use without risk of accidental ship. (See ADR-001.) |
| D7 | Smoke test for `update` | (a) shell script under `scripts/`, (b) Node script with assertions, (c) skip — manual testing only | **(a) shell script** at `scripts/smoke-update.sh`. Init to a temp dir, mutate one file, run update, assert the file was overwritten. Zero new dependencies. (See ADR-002.) |
| D8 | Help text update | Wording for "what `update` touches" | Add a paragraph: "更新する: agents/, rules/, commands/, orchestrator-rules.md。保護する: settings.local.json (既存があれば上書きしない)。" Mirrored in English in README. |
| D9 | Bundle this with #44 (rules duplication / dual-load problem)? | (a) keep separate, (b) bundle | **(a) keep separate** — #43 is the npx-update *mechanism*; #44 is about whether `~/.claude/rules/` and project-local `.claude/rules/` should both auto-load. Different surfaces, different solutions. |
| D10 | First post-fix version number | (a) `0.2.0`, (b) `0.1.1`, (c) date-based | **(a) `0.2.0`** — signals a behavior change (added version in update output, added documentation) sufficient to break cache without misleading anyone with patch-level expectations |
| D11 | PR split | (a) single PR, (b) two PRs (CLI + docs) | **(a) single PR** — the CLI change (3 LOC), `.npmignore` (1 line), version bump (1 line), README/help text update, smoke test, and CONTRIBUTING note all serve one goal and review together cleanly |

---

## 4. Specific Edit Plans

> Line numbers reflect HEAD `d30d1b3`.

### 4.1 `bin/aphelion-agents.mjs`

**Insert** after L141 (inside `cmdUpdate`, just before the existing `ok(...)` call):

```js
const version = await getVersion();
ok(`.claude/ を ${targetPath} に更新しました (source: aphelion-agents@${version}).`);
```

**Delete** the existing L142 `ok(\`.claude/ を ${targetPath} に更新しました。\`);` line — replaced
above. Net change: ~3 LOC.

**Update** `showHelp()` (L66-89). Change the `update` description block:

```text
  update          カレントディレクトリの .claude/ を最新に更新する
                  (更新: agents/, rules/, commands/, orchestrator-rules.md。
                   保護: settings.local.json は既存があれば上書きしない)
```

### 4.2 `package.json`

```diff
 {
   "name": "aphelion-agents",
-  "version": "0.1.0",
+  "version": "0.2.0",
   "description": "AI coding agent definitions for Claude Code.",
```

### 4.3 `.npmignore` (new file, repository root)

```text
# Local working data — never ship to consumers
.claude/worktrees/
.claude/settings.local.json

# Dev / source-control noise
.git/
.gitignore
docs/
scripts/sync-wiki.mjs
site/
CHANGELOG.md
```

Rationale per line:
- `.claude/worktrees/` (D6) — defense in depth.
- `.claude/settings.local.json` — already protected at copy time, but excluding from the
  tarball entirely removes the need for the runtime filter to be the only safeguard. **Note**:
  if shipped, the filter is still load-bearing; if excluded, the filter becomes a no-op (safe).
  Adding to `.npmignore` is the simpler, more honest option.
- `docs/`, `site/`, `scripts/sync-wiki.mjs` — wiki/site infrastructure unneeded by consumers.
  Reduces tarball size; reduces npm cache footprint per install. Optional but cheap.

After this, `npm pack --dry-run` should report ~58 files (down from 61) and a smaller payload.

### 4.4 `README.md` / `README.ja.md`

**Add** a "Cache caveat" subsection under the existing install/usage area, after the
`update` example. Recommended location: after the existing line that shows `npx github:...`.

EN draft:

```markdown
### Cache caveat

`npx` aggressively caches packages by `name@version`. If your local cache holds an older
extraction of `aphelion-agents` at the same version string, `update` will silently copy that
stale snapshot. To force a refresh:

- Pin the source ref: `npx github:kirin0198/aphelion-agents#main update`
- Or clear the cache: `npm cache clean --force` then re-run `update`

Each `update` run prints the source version (e.g. `source: aphelion-agents@0.2.0`); cross-check
against the `version` field of the latest `package.json` on `main` to confirm freshness.
```

JA mirror under the same heading.

### 4.5 `docs/wiki/{en,ja}/Contributing.md`

Add a new sub-section under "Pull Request Checklist" (or equivalent existing section):

```markdown
### Bumping `package.json` `version` for `.claude/**` changes

Any PR that modifies `.claude/agents/`, `.claude/rules/`, `.claude/commands/`, or
`.claude/orchestrator-rules.md` MUST bump `package.json` `version`. This is what invalidates
downstream `npx` caches; without a bump, users running `npx ... update` will keep receiving
the previous snapshot.

- Default: bump the patch component (`0.2.0` → `0.2.1`).
- Bump the minor component when shipping a new agent, a new flow, or a breaking rule.
- Document the bump in `CHANGELOG.md`'s `## [Unreleased]` section.
```

JA mirror.

### 4.6 `scripts/smoke-update.sh` (new)

Shell script — POSIX, no Node-side test framework. Asserts that `update` actually copies a
modified source file over a target.

```bash
#!/usr/bin/env bash
# Smoke test for `aphelion-agents update`. Intended for manual / pre-release runs.
# Exit 0 = pass, non-zero = fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null

# Mutate target side so we can detect overwrite
echo "MUTATED" > "$TMP/.claude/rules/sandbox-policy.md"

# Run update
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null

# Assert: target file no longer contains "MUTATED"
if grep -q "^MUTATED$" "$TMP/.claude/rules/sandbox-policy.md"; then
  echo "FAIL: sandbox-policy.md was not overwritten by update"
  exit 1
fi

# Assert: source content matches repo HEAD
if ! diff -q "$REPO_ROOT/.claude/rules/sandbox-policy.md" "$TMP/.claude/rules/sandbox-policy.md" >/dev/null; then
  echo "FAIL: sandbox-policy.md content diverges from repo HEAD"
  exit 1
fi

echo "PASS: rules/ refreshed correctly"
```

Make executable (`chmod +x scripts/smoke-update.sh`). Document in
`docs/wiki/{en,ja}/Contributing.md` under a "Local verification" line:
"Run `bash scripts/smoke-update.sh` before tagging a release."

### 4.7 `CHANGELOG.md`

Append under `## [Unreleased]`:

```markdown
### Fixed
- `npx aphelion-agents update` now reliably propagates `.claude/rules/` updates by bumping
  `package.json` version (forces npx cache invalidation). Previously, repeated `update`
  runs at version `0.1.0` could silently reuse a stale npx cache. (#43)

### Changed
- `update` now prints the source package version on success (`source: aphelion-agents@<ver>`),
  letting users diagnose stale-cache scenarios at a glance.
- `package.json` version bumped from `0.1.0` to `0.2.0`.
- Added `.npmignore` to exclude `.claude/worktrees/`, `docs/`, `site/`, and other
  non-distributable paths from the published tarball.
- README / wiki Contributing.md document the npx cache caveat and the version-bump policy
  for `.claude/**` changes.

### Added
- `scripts/smoke-update.sh` — manual smoke test verifying that `update` overwrites
  user-mutated files under `.claude/rules/`.
```

---

## 5. ADRs

### ADR-001 — Add `.npmignore` rather than relying solely on the `cp` filter for `settings.local.json`

- **Status**: proposed
- **Context**: `settings.local.json` is currently shipped in the tarball and protected by
  `cmdUpdate`'s filter. `worktrees/` is empty so doesn't ship today, but a contributor adding
  files there would silently expand the package.
- **Decision**: Add `.npmignore` listing `.claude/worktrees/`, `.claude/settings.local.json`,
  and developer-only paths (`docs/`, `site/`, `scripts/sync-wiki.mjs`, `CHANGELOG.md`).
- **Consequence**: Tarball shrinks slightly. `cmdUpdate`'s filter becomes a no-op for
  `settings.local.json` (the source path no longer exists), which is safe — the filter still
  fires defensively if anyone re-adds the file. We do not remove the filter; it costs nothing
  and gives the CLI consistent behavior whether or not `.npmignore` is honored by the install
  channel (some github-tarball flows ignore `.npmignore`).
- **Alternative considered**: Rely on `cp` filter only. Rejected because it leaves the
  attack surface (a contributor accidentally committing a real settings file) silently open.

### ADR-002 — Shell-based smoke test, not Node test framework

- **Status**: proposed
- **Context**: The repo currently has zero test infrastructure (`package.json` has no
  `test` script). Introducing a framework (vitest, node:test) for one assertion is
  overkill.
- **Decision**: A POSIX bash script under `scripts/`. Run manually before releases and
  optionally from CI later.
- **Consequence**: No new dev-dependencies. No coverage tooling. Acceptable for a
  release-time gate; insufficient for continuous regression — but #43's scope is bounded
  to fixing the bug, not building test infrastructure.
- **Alternative considered**: `node --test` in `tests/`. Rejected on cost/value grounds.

### ADR-003 — Manual SemVer bumps, not date-based versions or commit-derived prereleases

- **Status**: proposed
- **Context**: The project needs `package.json` version to change whenever `.claude/**`
  changes, otherwise the npx cache problem returns. Three viable mechanisms.
- **Decision**: Document a manual SemVer bump policy in Contributing.md.
- **Consequence**: Requires contributor discipline. PR review is the gate.
- **Alternative — date-based (`2026.04.25`)**: Self-bumping at PR-merge time, but
  diverges from npm conventions and complicates downstream tooling that assumes SemVer.
- **Alternative — commit-derived (`0.2.0-d30d1b3`)**: Auto-correct, but requires either
  CI hooks or a pre-commit pipeline; both add infrastructure beyond #43's scope. Could
  be revisited as a follow-up issue if manual bumps prove unreliable.

### ADR-004 — Print the source version on `update`, not on `init`

- **Status**: proposed
- **Context**: D4 chose to surface the package version. `init` could equally benefit, but
  the bug was reported on `update`, and `init` is run once per project — staleness is not
  the same risk class.
- **Decision**: Print on `update` only. Leave `init` unchanged.
- **Consequence**: Minimal patch surface. If `init` users hit a similar staleness in
  practice, fold the same line in via a follow-up.

### ADR-005 — Keep `#43` and `#44` separate

- **Status**: proposed
- **Context**: `#44` covers the dual auto-load of project-local `.claude/rules/` and
  user-global `~/.claude/rules/`. `#43` covers the `update` mechanism's reliability.
- **Decision**: This planning document addresses `#43` only. `#44` to be analyzed separately.
- **Consequence**: Each ticket reviews against a focused diff. If users discover they
  prefer one global rules tree (no project-local copy), that conversation lives in `#44`
  and may eventually change what `update` does — but not before `#43` is closed.

---

## 6. Acceptance Criteria

Lifted (and refined) from issue #43's "受入条件":

1. [ ] `update`'s scope is documented in both `--help` output and README (EN + JA).
2. [ ] After running `npx github:kirin0198/aphelion-agents#main update` against a fresh
       `~/.claude/`, `.claude/rules/sandbox-policy.md` matches repo HEAD byte-for-byte.
3. [ ] `agents/`, `commands/`, `orchestrator-rules.md` are similarly refreshed under the
       same conditions (verified via `diff -r` between `~/.claude/` and the cached
       `node_modules/aphelion-agents/.claude/` after running update).
4. [ ] `settings.local.json` regression: if user has a customised `~/.claude/settings.local.json`,
       it survives `update` unchanged.
5. [ ] `bash scripts/smoke-update.sh` exits 0 on a clean checkout.
6. [ ] `package.json` version is bumped to `0.2.0`. Subsequent rule changes are
       accompanied by a further bump per the new Contributing.md policy.
7. [ ] `update` console output includes the source version line (`source: aphelion-agents@0.2.0`).
8. [ ] `.claude/worktrees/` does not appear in `npm pack --dry-run` output.

---

## 7. Test Plan (for the implementation phase)

The executing `developer` should verify, after edits:

1. `node /path/to/repo/bin/aphelion-agents.mjs --help` shows the updated `update`
   description with the explicit subpath list.
2. `bash scripts/smoke-update.sh` exits 0.
3. `npm pack --dry-run` shows no entries under `.claude/worktrees/`, `docs/`, or `site/`,
   and shows version `0.2.0`.
4. Manual: clear `~/.npm/_npx/`, run `npx github:kirin0198/aphelion-agents#main update --user`
   (against a test clone in a throwaway HOME), confirm sandbox-policy matches HEAD.
5. Manual: re-run the same command. Confirm console prints `source: aphelion-agents@0.2.0`
   and the operation is idempotent (no diff after second run).
6. Manual: simulate a stale cache by running update twice with the version unchanged
   between runs; confirm the second run is a no-op (correct behavior — no version diff
   means content is identical).
7. `gh issue view 43` body acceptance items 1-5 each check off against the above.

---

## 8. Out of Scope

Per issue #43's "非スコープ":

- **Major CLI rewrite (TypeScript port).** Tracked under #23 Phase 2.
- **Decision on whether `worktrees/` should ship at all.** This plan adds `.npmignore` as
  defense-in-depth but does not remove the directory or change its purpose. Separate ticket
  if the underlying use case changes.
- **Auto-publish to npmjs.com.** Project remains `"private": true`. Distribution stays via
  `npx github:`.
- **CI integration of `scripts/smoke-update.sh`.** Manual run gate for now; CI wiring is a
  follow-up.
- **#44 — rules duplication / dual auto-load.** Separate ticket per ADR-005.

---

## 9. Handoff to `architect`

`architect` needs to:

1. Acknowledge D1-D11 once user approves (or adjust if user overrides).
2. Confirm that no `ARCHITECTURE.md` update is needed — `aphelion-agents` itself has no
   root-level `ARCHITECTURE.md`; the wiki `Architecture.md` is doc-only and unaffected by
   this change.
3. Hand a single TASK.md to `developer` covering, in order:
   - bump `package.json` version
   - add `.npmignore`
   - patch `cmdUpdate` to print source version + update `showHelp`
   - add `scripts/smoke-update.sh`
   - update README.md / README.ja.md (cache caveat)
   - update `docs/wiki/{en,ja}/Contributing.md` (version-bump policy + smoke-test note)
   - append CHANGELOG.md
   - run `bash scripts/smoke-update.sh` locally
   - run `node scripts/sync-wiki.mjs` to mirror wiki changes into `site/`
4. Decide whether the `developer` step also needs `tester` involvement (recommendation:
   no — single shell script + manual cache reset suffices for this fix's risk class).

---

## 10. References

- `bin/aphelion-agents.mjs` — CLI source (current behavior reference)
- `package.json` — version + `files` (current shipping manifest)
- `.claude/rules/sandbox-policy.md` — example file used to detect the staleness symptom
- Issue #43 — bug report (this document's authority for scope)
- Issue #44 — related (rules dual-load); explicitly out of scope here per ADR-005
- Issue #23 — Phase 2 CLI refactor; out of scope per issue #43 itself
- `docs/issues/drop-platforms.md` — template / tone reference for this planning doc
- `~/.npm/_npx/3dfff890cefe9e12`, `~/.npm/_npx/4108b50149260794` — concrete cache
  directories inspected during pre-investigation; both at version `0.1.0` shipping
  the 2026-04-18 sandbox-policy

---

## 11. Open Questions (awaiting user sign-off)

The following resolutions are **proposed**; the user's reply confirms or overrides each.

- Q1 (D1, D2, D10): Adopt manual SemVer bumps and ship `0.2.0` as the first post-fix release?
- Q2 (D4): Print `source: aphelion-agents@<ver>` on every `update`?
- Q3 (D5): Document both `#main` ref-pinning and `npm cache clean --force` in README?
- Q4 (D6, ADR-001): Add `.npmignore` excluding `worktrees/`, `settings.local.json`,
  `docs/`, `site/`, `scripts/sync-wiki.mjs`, `CHANGELOG.md`?
- Q5 (D7, ADR-002): Shell-based smoke test under `scripts/smoke-update.sh`, not a Node
  test framework?
- Q6 (D9, ADR-005): Keep #43 and #44 strictly separate?
- Q7 (D11): Single PR for all the above changes?
