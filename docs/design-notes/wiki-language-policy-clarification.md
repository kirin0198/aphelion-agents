# Wiki language policy clarification

> GitHub Issue: [#75](https://github.com/kirin0198/aphelion-agents/issues/75)
> Analyzed by: analyst (2026-04-26)
> Implemented in: TBD
> Next: developer (deferred — implementation issue to be opened separately once policy direction is chosen)

This planning doc captures the analysis for issue #75 — clarifying the language
policy that governs Aphelion's own canonical narrative documents (wiki pages and
the wiki information-architecture memo `docs/wiki/DESIGN.md`). The issue itself
was triggered by an explicit deferral in PR #68 (i18n residuals,
`docs/design-notes/archived/english-rollout-residuals.md` §4-3 / §7) and by
follow-up discovery that the deferral note assumed `DESIGN.md` was either a
phantom or trivially correct, which the 2026-04-26 grep contradicts.

The doc follows the `/issue-new` + `/analyst` §1–§8 layout. §1–§4 are intake;
§5–§8 are the analysis written by `analyst`.

---

## 1. Problem statement (intake)

Aphelion's repository contains canonical narrative documents (the bilingual
`docs/wiki/{en,ja}/` set, the standalone `docs/wiki/DESIGN.md`, design notes
under `docs/design-notes/`) whose **language policy is not consistently
documented**. Three distinct rules currently coexist without a clear precedence:

- `language-rules.md` "Hybrid Localization Strategy" (PR #68) declares that
  *agent-emitted template skeletons* are English-fixed, but says nothing about
  hand-authored canonical documents in this repo.
- `wiki/en/Contributing.md` Bilingual Sync Policy declares that the wiki is
  "bilingual with English as canonical" and prohibits English-only merges.
- `english-rollout-residuals.md` §4-3 implicitly claims `DESIGN.md` is correct
  in Japanese under "bilingual wiki strategy #40", which contradicts the
  English-canonical rule above.

PR #68 explicitly closed its scope at agent-emitted templates and listed
"Aphelion's own bilingual wiki / canonical doc language policy" as out of scope
(`english-rollout-residuals.md` §7 item 1). This issue picks that thread up.

The desired output is a single, unambiguous statement in a canonical location
(probably `language-rules.md` Hybrid Localization Strategy, possibly cross-
referenced from `Contributing.md`) so that future contributors do not need to
read three archived design notes to know where to write a new policy doc.

## 2. Current state (intake)

### 2.1 What actually exists in `docs/wiki/`

Verified via `find docs/wiki -type f` on 2026-04-26 (full listing in §6):

- `docs/wiki/DESIGN.md` — **335 lines, Japanese, single file** (no `wiki/en/DESIGN.md`).
  Frontmatter:
  ```
  > Source: ISSUE.md (2026-04-18)
  > Created: 2026-04-18
  > Last updated: 2026-04-24
  > Update history:
  >   - 2026-04-18: initial version (architect — IA finalized)
  >   - 2026-04-24: revised 8→7 pages after Platform-Guide retirement
  ```
  (Original headings are in Japanese; rendered in English here for §2.)
- `docs/wiki/en/{Home, Getting-Started, Agents-Delivery, Agents-Maintenance,
  Agents-Discovery, Agents-Operations, Triage-System, Architecture-Protocols,
  Architecture-Domain-Model, Agents-Orchestrators, Architecture-Operational-Rules,
  Rules-Reference, Contributing}.md` — 13 pages.
- `docs/wiki/ja/{...same 13 slugs...}.md` — 13 pages.

So the wiki contains **27 files**: 13 EN pages + 13 JA pages + 1 single-file
Japanese design memo (DESIGN.md).

### 2.2 The DESIGN.md ghost-reference question (resolved)

The intake brief asked whether `docs/wiki/DESIGN.md` was a phantom reference
that no longer exists. **It is not a phantom.** The file exists, is 335 lines
long, was last touched 2026-04-24 (per its own header) for the 8→7 page
revision, and is referenced 31 times across `docs/design-notes/archived/`.
Recent references:

- `archived/drop-platforms.md` lines 81, 126, 229, 306, 329, 369, 390+ —
  treats DESIGN.md as a live design artifact updated in PR #X (the 8→7 page
  revision).
- `archived/maintenance-flow-wiki-sync.md` lines 69, 83, 85, 88, 93, 932, 935,
  982 — repeatedly checks design changes against DESIGN.md §1.1 and §1.2 as
  authoritative constraints.
- `archived/consolidate-rules-no-claude-md.md` lines 78, 156, 169, 226, 243 —
  edits DESIGN.md as part of a broader rules-consolidation pass.
- `archived/english-rollout-residuals.md` §4-3 / §7 — explicitly defers the
  language question to this issue.

Conclusion: DESIGN.md is real, actively maintained, and the canonical place
where the wiki's information architecture is recorded.

### 2.3 The conflicting framings

Two policy fragments collide:

| Source | Statement | Implication for DESIGN.md |
|--------|-----------|---------------------------|
| `wiki/en/Contributing.md` Bilingual Sync Policy | "The wiki is bilingual with English as canonical." English-only merges prohibited. | DESIGN.md should either be bilingual (`wiki/en/DESIGN.md` + `wiki/ja/DESIGN.md`) or it is not a wiki page. |
| `english-rollout-residuals.md` §4-3 | "DESIGN.md is Aphelion's canonical narrative; under bilingual strategy #40 the ja version is canonical, so ja is correct." | DESIGN.md is intentionally ja-only and that is fine. |

The two are technically reconcilable — DESIGN.md sits at `docs/wiki/DESIGN.md`,
not under `docs/wiki/en/` or `docs/wiki/ja/`, so it can be argued to be
"about the wiki" rather than "part of the wiki". But that distinction has never
been written down. A new contributor reading either source in isolation would
draw opposite conclusions.

### 2.4 The template-skeleton boundary

PR #68 (commit `818dd4a`) added to `language-rules.md`:

```
- **Template skeleton strings** (markdown headings, metadata blocks such as
  `> Last updated:` / `> Update history:`, task-list scaffolding such as
  `## Task list` / `## Recent commits`):
  **English-fixed**, regardless of Output Language. Free-form narrative content
  written inside the generated document is produced in the resolved Output
  Language.
```

This rule was scoped to **agent-emitted templates** (TASK.md, SPEC.md, the
TASK list inside ARCHITECTURE.md, etc.). It does not state whether
hand-authored documents in `docs/wiki/{en,ja}/` should also follow the
"English-fixed skeleton + locale narrative" pattern, or whether each language
file is fully locale-native.

Today, by convention:
- `wiki/en/*.md` headings and frontmatter are English (as expected).
- `wiki/ja/*.md` headings and frontmatter are also English (e.g., `## Related
  Pages`, `> Last updated:`, `> EN canonical:`). The narrative body is
  Japanese.

So the convention already matches the PR #68 rule — but it is not declared
anywhere as a rule, only emerged organically. New translators may diverge.

## 3. Constraints (intake)

- **No implementation in this pass.** The user's request explicitly limits this
  invocation to issue creation + design note. No branch / commit / push / PR /
  developer handoff. Implementation will be picked up in a follow-up issue
  once the policy direction is chosen.
- **`docs/design-notes/archived/*.md` are read-only.** Per the archiving policy
  in `wiki/en/Contributing.md`, archived planning docs are not retroactively
  edited. So the resolution of this issue cannot be "amend
  `english-rollout-residuals.md`"; it must be "publish a fresh, more
  authoritative statement that supersedes the archived note".
- **`Output Language: ja` for this repo.** Decisions on which file is canonical
  must work cleanly when the maintainer's local agent reads `project-rules.md`
  and resolves `Output Language` to ja.
- **Auto mode is active.** No `AskUserQuestion` calls during this analysis.
  Reasonable assumptions are made and recorded; the implementation issue can
  revisit them.

## 4. Goals & success criteria (intake)

1. The repository contains exactly one authoritative statement that declares,
   for each of the following, which language is canonical and where translations
   live:
   - `docs/wiki/{en,ja}/*.md` (the bilingual page set)
   - `docs/wiki/DESIGN.md` (single-file design memo)
   - `docs/design-notes/<slug>.md` (planning docs)
   - `docs/design-notes/archived/<slug>.md` (read-only history)
2. The "English-fixed skeleton" rule (PR #68) is either explicitly extended to
   the bilingual wiki pages or explicitly scoped out, with the boundary written
   down in `language-rules.md`.
3. A reader of `language-rules.md` alone (without consulting archived design
   notes) can answer: "If I want to add a new design memo about X, where
   should I put it and in which language?".

---

## 5. Approach (analyst)

The shortest path to a clean policy is **option (c) for DESIGN.md (relocate)**
combined with **declaring the bilingual sync rule in `language-rules.md`**.
Rationale:

1. **DESIGN.md is a one-shot architect deliverable, not a living wiki page.**
   Its frontmatter declares it a design memo from the architect phase
   (2026-04-18) tracking the wiki's information architecture. It has been
   touched once since (8→7 page revision). It is structurally indistinguishable
   from `docs/design-notes/<slug>.md` planning docs except for its directory.
   Keeping it at `docs/wiki/DESIGN.md` invites confusion every time someone
   reads `Contributing.md`'s "wiki is bilingual" rule and then notices a
   ja-only file in the same directory.
2. **`docs/design-notes/` already has a precedent for canonical Japanese
   single-file design memos.** All 7 currently un-archived planning docs in
   `docs/design-notes/` (compliance-auditor, doc-flow,
   english-rollout-residuals, orphan-design-notes, performance-optimizer,
   readme-readability-wiki-links, remove-pm-shortcut) and most archived ones
   are ja-canonical single-file memos. DESIGN.md fits this pattern exactly.
3. **Option (b) — converting to bilingual `wiki/en/DESIGN.md` +
   `wiki/ja/DESIGN.md` — overpays.** It would require translating 335 lines and
   committing to keeping both in sync forever, despite DESIGN.md being touched
   roughly once per year. The maintenance burden is disproportionate to the
   reader value.
4. **Option (a) — keep ja-only, document the exception — leaves an exception
   in `Contributing.md`.** Exceptions in policy docs accumulate and erode
   clarity. Better to relocate the file so the exception is unnecessary.

The proposed canonical statements:

### 5.1 In `language-rules.md` (Hybrid Localization Strategy section)

Add a third bullet group documenting hand-authored canonical narrative:

```
- **Hand-authored canonical narrative** (this repo's own design notes, wiki
  pages, README): governed by per-directory canonical-language declaration.
  - `docs/wiki/{en,ja}/*.md`: bilingual; English is canonical, Japanese must
    track in the same PR (see `wiki/en/Contributing.md` Bilingual Sync Policy).
    Skeleton headings and frontmatter fields (`## Related Pages`,
    `> Last updated:`, `> EN canonical:`, …) follow the same English-fixed
    rule as agent-emitted templates.
  - `docs/design-notes/<slug>.md` and `docs/design-notes/archived/<slug>.md`:
    single-file; canonical language matches `project-rules.md` →
    `Output Language` (currently `ja` for this repo). No bilingual sync
    expected.
  - `README.md` / `README.ja.md`: bilingual at the repository root with
    English canonical, governed by repo-root README sync convention (not
    by Contributing.md).
```

### 5.2 Move DESIGN.md

```
git mv docs/wiki/DESIGN.md docs/design-notes/archived/wiki-information-architecture.md
```

(Use `archived/` because the wiki IA work is complete; the file is referenced
historically, not as a live constraint. New IA changes would open a fresh
design note.)

Update back-references:
- `docs/design-notes/archived/drop-platforms.md` — 7 references (read-only by
  policy, but the relocation could be flagged in the new statement; do not
  rewrite the archived file).
- `docs/design-notes/archived/maintenance-flow-wiki-sync.md` — 8 references
  (same treatment).
- `docs/design-notes/archived/consolidate-rules-no-claude-md.md` — 5
  references (same treatment).
- `docs/wiki/DESIGN.md` self-reference at line 221 — fixed by the move.

The 20+ references in archived design notes are not rewritten (read-only
policy). New documents linking to the relocated file use the new path.

### 5.3 Update `wiki/en/Contributing.md` (and ja)

Add a note in the Bilingual Sync Policy section pointing to the new
`language-rules.md` statement as the source of truth for the broader question
(narrative vs wiki vs agent-emitted), so Contributing.md only needs to enforce
the bilingual-sync subset.

### 5.4 Why this analysis can stop here without a developer handoff

The user's request is explicit: this invocation produces only the GitHub issue
and the design note. The implementation tasks above (edit `language-rules.md`,
`git mv` DESIGN.md, edit two Contributing.md pages, version-bump
`package.json`) form a coherent ~30-minute developer task. They will be picked
up by a separate implementation issue once the policy direction is approved.

If on review the user prefers option (a) or (b) over (c), the developer
handoff content changes substantially — that is the reason the policy
direction is gated on a future approval rather than auto-implemented now.

## 6. Document changes (analyst)

This planning doc is the only document created in this pass. **No changes to
SPEC.md, ARCHITECTURE.md, UI_SPEC.md, or any other repo file are made by this
invocation.**

For the eventual implementation issue, the expected document changes are:

| File | Change | Rationale |
|------|--------|-----------|
| `src/.claude/rules/language-rules.md` | Append "Hand-authored canonical narrative" bullet group to Hybrid Localization Strategy | §5.1 |
| `docs/wiki/DESIGN.md` | `git mv` to `docs/design-notes/archived/wiki-information-architecture.md` | §5.2 (assumes option (c) is chosen) |
| `docs/wiki/en/Contributing.md` | Add cross-reference to `language-rules.md` in Bilingual Sync Policy | §5.3 |
| `docs/wiki/ja/Contributing.md` | Same change as above (bilingual sync) | §5.3 |
| `package.json` | Patch-bump `version` (rule edit triggers cache invalidation per Contributing.md "Version bumping policy") | Required by versioning policy |
| `CHANGELOG.md` | Entry under `## [Unreleased]` | Required by versioning policy |

The reference verification performed during analysis (verifying DESIGN.md
exists, listing all 27 wiki files, locating 31 cross-references in archived
design notes) is recorded in §2 above and does not require any document edit
on its own.

## 7. Open questions (analyst)

These were not resolved during the analysis pass and need a decision before
the implementation issue is opened. Since auto mode is active and the user
gave clear "issue + design note only" instructions, they are recorded here
rather than escalated via `AskUserQuestion`.

1. **Policy direction (a / b / c).** §5 recommends (c) — relocate DESIGN.md
   to `docs/design-notes/archived/`. The user may prefer (a) keep-as-is with
   documented exception, or (b) convert to bilingual. Decision needed before
   implementation.
2. **Scope of the new `language-rules.md` statement.** Should it also cover
   `CHANGELOG.md` (currently English) and the `docs/wiki/{en,ja}/Home.md`
   "personas + glossary" sections (mostly English even on the ja page)? The
   §5.1 draft does not address these; conservative answer is "scope strictly
   to the four cases listed".
3. **Skeleton-extends-to-wiki-pages declaration.** §5.1 declares that
   `## Related Pages` etc. are English-fixed in both languages. This matches
   today's practice but introduces a normative rule. If the user thinks
   ja-page section headings should be Japanese (e.g., `## 関連ページ`), §5.1
   needs revising and the existing `wiki/ja/*.md` files need touching up.
4. **Treatment of cross-references from archived design notes after the
   `git mv`.** Read-only policy says we do not rewrite archived files, but
   31 stale references will accrue as link-rot. Acceptable trade-off, or
   should the implementation issue add a single redirect note at the new
   location?

## 8. Handoff (analyst)

**Handoff target: developer (deferred)**

This invocation deliberately stops short of a developer handoff. The user's
request limits this pass to issue + design note creation. The implementation
content drafted in §5–§6 will be picked up by a fresh issue once the user
approves the policy direction (likely option (c) per §5).

When the implementation issue is opened, the developer brief is roughly:

> Apply §5.1 (edit `language-rules.md`) and §5.2 (relocate
> `docs/wiki/DESIGN.md` via `git mv`) and §5.3 (cross-reference in
> `Contributing.md` en + ja). Patch-bump `package.json` per the version
> bumping policy. Add a `## [Unreleased]` entry in `CHANGELOG.md`.
> Open a PR with `Closes #75`. The archive workflow will move this design
> note from `docs/design-notes/` to `docs/design-notes/archived/`
> automatically.

No follow-up `architect` invocation is required because there is no
ARCHITECTURE.md change — this is a docs/policy refactor.

---

> Note: this design note remains untracked in the working tree (per the
> "settings docs untracked is OK" instruction in the original brief). It will
> be staged and committed as part of the implementation PR; if the user wants
> it staged earlier (e.g., to share the analysis), `git add` it explicitly —
> the policy is `git add -A` is prohibited.
