# Wiki Page Restructure — Reduce Per-Page Density

> Reference: branch `docs/wiki-restructure-images-terminology` off `main` (HEAD `eedb6e0`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (planning-only phase — no implementation in this commit)
> Scope: design / planning document. Restructure execution will follow in this same PR
> as a separate `doc-writer` + `developer` phase, gated on user sign-off of the open
> questions in §10 below.
> GitHub Issue: [#42](https://github.com/kirin0198/aphelion-agents/issues/42)
> Related (same PR, later phases): #22 (image asset cleanup), #40 (JA terminology rebalance)

---

## 1. Background & Motivation

### 1.1 The complaint

Issue #42 reports that several wiki pages are too long and dense to skim. Readers
landing on a page from the sidebar or a deep link lose orientation, ctrl-F yields too
many hits, and the pages outgrow their original "single-screen reference" intent.

### 1.2 Measured inventory (HEAD `eedb6e0`)

Measured with `wc -l` and `grep -c '^## '` / `grep -c '^### '` against
`docs/wiki/en/*.md`. JA counts are within ±10 lines of EN and tracked in §1.3.

| Page                | EN lines | JA lines | `##` count | `### ` count | Notable                                                     |
|---------------------|---------:|---------:|-----------:|------------:|--------------------------------------------------------------|
| Agents-Reference.md |     435  |     436  |        10  |         31  | 31 `###` entries = 29 agents + 2 stand-alone subheads        |
| Architecture.md     |     459  |     466  |        20  |         13  | Mixed: top-level model + protocols + rollback + sandbox      |
| Triage-System.md    |     281  |     282  |        13  |          9  | One `##` per flow (Discovery/Delivery/Ops/Maint) plus matrix |
| Getting-Started.md  |     299  |     294  |        10  |         15  | 5 install scenarios + walkthrough + troubleshooting          |
| Contributing.md     |     190  |     186  |        10  |          6  | Bilingual policy + agent/rule contribution flows             |
| Rules-Reference.md  |     141  |     142  |        13  |          0  | Flat list of 10 rules, one `##` per rule                     |
| Home.md             |     102  |     103  |         6  |          5  | TOC + persona entry + glossary                               |

(`Agents-Reference.md`'s `##` count of 10 = TOC + 7 domain headings + Related + Canonical.
`Architecture.md`'s `## ` count of 20 includes a JA subheading block embedded inside the
DISCOVERY_RESULT.md schema example — see §3.1 footnote.)

### 1.3 Density classification

Calling "dense" anything > ~250 lines that also has > 10 sub-section entries:

- **Definitely dense**: `Agents-Reference.md` (435 lines, 31 sub-entries)
- **Borderline dense**: `Architecture.md` (459 lines, 13 sub-entries — fewer entries but
  topically heterogeneous: domain model + protocol + rollback + sandbox in one page)
- **Borderline dense**: `Getting-Started.md` (299 lines, 15 sub-entries — but a *linear
  user journey* rather than a reference, so density is OK if scoped to one task)
- **Manageable**: `Triage-System.md` (281 lines), `Rules-Reference.md` (141), `Contributing.md`
  (190), `Home.md` (102)

### 1.4 Why "just split everything" is not the right answer

Three constraints push back against aggressive splitting:

1. **Bilingual sync surface (Contributing.md §"Bilingual Sync Policy")**: every page must
   exist in both EN and JA, edited together. Splitting one EN page into three triples the
   sync surface, *not* doubles it.
2. **Starlight sidebar grows linearly with pages.** Sidebar is currently flat (7 pages);
   adding 6 new pages to make it 13 reduces the sidebar from "scannable" to "scrolly". See
   §4 for the nesting recommendation.
3. **Cross-references compound.** The wiki currently has ~25 internal `[label](./Page.md)`
   links plus README.md and Home.md persona-entry links. Each split forces an inventory of
   incoming-link rewrites. This is mechanical but error-prone.

These constraints argue for **at most 2 splits**, both targeting the highest-density page
(Agents-Reference) and the most topically heterogeneous page (Architecture).

### 1.5 Goal

Reduce per-page density to "skimmable on one laptop scroll" while:

- Keeping the bilingual sync surface manageable (no >2x increase in EN+JA file count).
- Keeping the sidebar scannable (use nesting, not 13 flat entries).
- Updating all cross-refs (other wiki pages, `home.md` persona entries, `README.md`,
  `site/astro.config.mjs` PAGES array).
- Deferring stylistic polish — wording, terminology, image assets — to #40 and #22.

---

## 2. Reader workflow analysis

For each split decision, the central question is: *do readers usually want all of this
content at once, or do they zoom in by domain?*

### 2.1 Agents-Reference: the "domain-first" reader

Searches like "what does `developer` do?" or "what's the input to `architect`?" are
**domain-aware**: a returning user already knows whether the agent is in Discovery or
Delivery. A first-time user follows a link from Architecture.md or Home.md persona-entry,
which already names the domain. So a reader rarely needs *all 29 agents in one page* —
they need *one domain at a time*.

Counter-argument: ctrl-F across one big page is convenient. But:

- Browser ctrl-F on the rendered Starlight page works on the visible page only, not across pages.
- Starlight has built-in full-text search across all pages. Splitting does not break this.
- The current 435-line page already exceeds what most readers will scroll through.

**Conclusion**: Agents-Reference benefits from splitting by domain.

### 2.2 Architecture: the "protocol vs model" reader

Architecture.md mixes three kinds of content with distinct audiences:

- **Conceptual model** (Three-Domain Model, Session Isolation, PRODUCT_TYPE Branching) —
  read once during onboarding. Lines ~27–105 + ~175–190.
- **Protocol reference** (Handoff File Schema, AGENT_RESULT Protocol, blocked STATUS,
  Auto-Approve Mode) — read repeatedly during agent authoring. Lines ~107–297.
- **Operational rules** (Flow Orchestrators / Phase Loop, Triage Tiers, Rollback Rules,
  Sandbox Defense Layers) — read by orchestrator authors and maintenance authors.
  Lines ~298–447.

The three audiences overlap but the *frequency of revisit* differs by section. Splitting
into 3 pages keeps the conceptual page short for onboarding and isolates the dense
protocol/rollback content into pages that frequent readers can deep-link to.

### 2.3 Triage-System: the "flow-first" reader

Triage-System has one `##` per flow plus mandatory/conditional/override sections.
281 lines is borderline. Splitting by flow (4 pages) would force a reader who wants to
*compare* triage behavior across flows to open 4 tabs. Comparison is the dominant
use case here ("how does Patch differ from Light?"), so keeping one page is correct.

### 2.4 Getting-Started: the "linear journey" reader

A new user reads Getting-Started top-to-bottom on first visit. Splitting it would
fragment the linear narrative. The 299 lines includes 5 install scenarios, but they're
short (~15 lines each) and benefit from being viewable side-by-side.

### 2.5 Rules-Reference, Contributing, Home

All under 200 lines and topically coherent. No split.

---

## 3. Decision matrix

For each page: keep / split / partial split, with a one-line rationale per row.
Recommendations marked **(rec)** are the analyst's default for the open-questions section.

| Page                  | Current lines | Decision                                                                 | Pages after | Rationale                                                                                       |
|-----------------------|--------------:|--------------------------------------------------------------------------|------------:|--------------------------------------------------------------------------------------------------|
| Agents-Reference.md   |          435  | **Split by domain into 5 pages** **(rec)**                               |          5  | Domain-first reader pattern (§2.1); nested sidebar absorbs growth (§4); foreshadowed in Contributing.md §"Agents-Reference split threshold" |
| Architecture.md       |          459  | **Split into 3 pages: Domain Model / Protocols / Operational Rules** **(rec)** | 3 | Three distinct audiences (§2.2); protocol details deserve their own permalink                    |
| Triage-System.md      |          281  | **Keep as one page** **(rec)**                                           |          1  | Cross-flow comparison is dominant use case (§2.3)                                                |
| Getting-Started.md    |          299  | **Keep as one page** **(rec)**                                           |          1  | Linear journey for new users (§2.4)                                                              |
| Rules-Reference.md    |          141  | **Keep as one page** **(rec)**                                           |          1  | Already short; per-rule pages would hurt scannability                                            |
| Contributing.md       |          190  | **Keep** **(rec)**                                                       |          1  | Single audience, single workflow                                                                 |
| Home.md               |          102  | **Keep** **(rec)** + update TOC and persona links to reflect new pages   |          1  | Hub page; only link-target updates needed                                                        |

### 3.1 Net structural change

EN files: 7 → 13. JA files: 7 → 13. Total wiki .md files: 14 → 26. Sidebar entries
(after nesting per §4): visible top-level remains 7 categories.

> Footnote on the Architecture.md `## count = 20` measurement: 6 of the 20 are JA-language
> subheadings inside an embedded schema example showing a sample DISCOVERY_RESULT.md
> structure (lines 145–151). They are illustrative content, not page sections. Treat the
> "real" `##` count as 14.

---

## 4. Sidebar / navigation strategy (Starlight)

`site/astro.config.mjs` currently defines a flat `PAGES` array (one entry per slug,
flat sidebar). After splits, a flat sidebar would have 13 entries. Recommendation:
**introduce one level of nesting in the sidebar config**, while keeping the source
Markdown layout flat under `docs/wiki/{en,ja}/`.

### 4.1 Recommended sidebar structure

```
Overview
Getting Started
Architecture
  ├─ Domain Model
  ├─ Protocols
  └─ Operational Rules
Triage System
Agents Reference
  ├─ Flow Orchestrators
  ├─ Discovery
  ├─ Delivery
  ├─ Operations
  └─ Maintenance
Rules Reference
Contributing
```

This requires changing `site/astro.config.mjs`'s `PAGES` array model from a flat list
into a tree (or transforming flat entries into Starlight's `{label, items}` group form).
The sync script `scripts/sync-wiki.mjs` does not need changes because it operates on
files; only the sidebar generator does.

### 4.2 Slug naming convention

Use a **flat slug space** with a domain prefix to stay friendly to URL-based deep links
and the existing sync script:

- `agents-reference` (overview / hub page) → optional, may be replaced by sidebar group
- `agents-discovery`
- `agents-delivery`
- `agents-operations`
- `agents-maintenance`
- `agents-orchestrators`
- `architecture-domain-model`
- `architecture-protocols`
- `architecture-operational-rules`

Open question Q3 below covers whether to keep an `agents-reference` hub page or rely on
the sidebar group label. The analyst's recommendation is **drop the hub** — one redirect
target instead via the existing `agents-reference` slug becoming `agents-orchestrators`
(since orchestrators are the natural front page when zooming in on agents).

### 4.3 Alternative: subdirectory layout

Starlight supports folder-based grouping (`docs/wiki/en/agents/discovery.md` etc.). The
analyst prefers flat slugs because:

- The current `sync-wiki.mjs` script and `astro.config.mjs` are wired for flat slugs.
- Sub-folders would require updating sync logic and risk slug collisions during the
  EN/JA mirror operation.
- Per ADR-001 below, the cost of changing the sync script is out of scope for this issue.

If Q3 favors subdirectories, defer to a follow-up issue.

---

## 5. Bilingual sync

### 5.1 Scope

Every new page must be created in both `docs/wiki/en/` and `docs/wiki/ja/`. JA pages
created during this issue must be **structurally** parity-aligned with EN — same
heading hierarchy, same anchor IDs, same TOC entries, same link targets.

**Translation quality is *not* in scope for this issue.** That is the responsibility of
issue #40 (JA terminology rebalance), which will run as a later phase in this same PR.
For #42, JA pages may be a near-mechanical translation or even a temporary "translated
in place" copy of the EN content; #40 will polish.

### 5.2 Anchor stability

Anchor IDs must be stable across EN/JA so that cross-language deep links work
(`/en/architecture-protocols#agent-result-protocol` should mirror
`/ja/architecture-protocols#agent-result-protocol`). Starlight by default derives
anchors from heading text. Since JA headings differ from EN, anchor IDs will diverge
unless we use explicit `id=` annotations or stable English-language anchors in both
languages. The analyst's recommendation: **defer this to #40**, since anchor strategy
is closely tied to terminology decisions.

For #42's structural pass, the EN side gets canonical anchors; the JA side gets whatever
Starlight derives, with the understanding that #40 will revisit. Acceptance criteria
in §7 reflect this scoping.

### 5.3 Sync mechanics

- `scripts/sync-wiki.mjs` mirrors `docs/wiki/{en,ja}/` into `site/src/content/docs/`.
  No script change should be needed if file-naming convention stays flat.
- New EN+JA file pair must land in the same commit.
- The bilingual policy table in `Contributing.md` does not need an entry update for
  this restructure (the policy applies generically).

---

## 6. Migration approach for old monolithic pages

When `agents-reference.md` and `architecture.md` are split, two options:

**Option A: Delete old pages.** Update all incoming links in one sweep. Cleanest
end-state but commit-time has the most simultaneous link updates.

**Option B: Replace with stub redirect pages.** Old page becomes a one-paragraph
"this page has been split" pointer to the new pages. Reduces immediate link-update
pressure. Risk: stub pages linger forever and create duplicate-content/SEO confusion.

**Recommendation: Option A** **(rec)**. The repo is small enough to do a one-shot sweep,
the link inventory is finite (§6.1), and there are no external SEO concerns yet (Starlight
site is recent).

### 6.1 Incoming-link inventory (HEAD `eedb6e0`)

Files that reference `Agents-Reference.md` or `Architecture.md` as a link target:

- `docs/wiki/en/Home.md` (5 references) — README-style table + persona entries
- `docs/wiki/ja/Home.md` (5 refs, mirror)
- `docs/wiki/en/Triage-System.md` (1 ref each)
- `docs/wiki/ja/Triage-System.md` (mirror)
- `docs/wiki/en/Architecture.md` (5 self-refs to `Agents-Reference.md` anchors)
- `docs/wiki/ja/Architecture.md` (mirror)
- `docs/wiki/en/Rules-Reference.md` (2 refs)
- `docs/wiki/ja/Rules-Reference.md` (mirror)
- `docs/wiki/en/Agents-Reference.md` (self) — disappears after split
- `docs/wiki/en/Contributing.md` (~10 refs in tables and prose)
- `docs/wiki/ja/Contributing.md` (mirror)
- `README.md` (Wiki section: 5 links)

Approximate total of incoming-link edits: ~50 individual link tokens across 13 files.
Mechanical but should be batched in a single `developer` task. A pre-commit script
that greps for stale link patterns (e.g. `Agents-Reference.md`) and reports zero hits
can serve as a self-check before the developer commits.

### 6.2 Astro config impact

`site/astro.config.mjs` `PAGES` array must be updated to reflect the new slug list and
nested structure (§4.1). Coordinate this change in the same commit as the .md splits
to keep `npm run build` green. The `developer` phase should run `npm run build` (or
the existing `astro check`) as a verification step.

---

## 7. Acceptance criteria (scoped to structure only)

These are deliberately structural, deferring stylistic polish to #40:

1. [ ] `docs/wiki/en/agents-discovery.md`, `agents-delivery.md`, `agents-operations.md`,
       `agents-maintenance.md`, `agents-orchestrators.md` exist (5 EN pages from the
       Agents-Reference split).
2. [ ] JA mirrors of all 5 above exist with identical heading structure (translation
       quality scoped to #40).
3. [ ] Old `Agents-Reference.md` (EN+JA) is deleted, not stubbed.
4. [ ] `docs/wiki/en/architecture-domain-model.md`, `architecture-protocols.md`,
       `architecture-operational-rules.md` exist with JA mirrors.
5. [ ] Old `Architecture.md` (EN+JA) is deleted.
6. [ ] No file under `docs/wiki/{en,ja}/` exceeds 250 lines after split (with the
       acknowledged exception of `getting-started.md` at ~299 lines, which is intentional
       per §2.4).
7. [ ] `grep -rn 'Agents-Reference\.md\|Architecture\.md' docs/ README.md site/` returns
       zero hits.
8. [ ] `site/astro.config.mjs` `PAGES` array reflects new slugs and nested sidebar
       structure (§4.1).
9. [ ] `node scripts/sync-wiki.mjs` (or the equivalent build step) succeeds.
10. [ ] `npm run build` (Starlight build) succeeds with zero broken-link warnings on
        wiki content.
11. [ ] `Home.md` TOC and persona-entry section is updated to point to the new pages.
12. [ ] `README.md` Wiki section is updated.
13. [ ] `Contributing.md` "Agents-Reference split threshold" note is updated to reflect
        that the threshold has been actioned (the note can either be removed or rewritten
        as historical context).

Acceptance items intentionally **not** included here, deferred to #40:

- Anchor-ID parity between EN and JA pages (§5.2).
- Terminology rebalance / katakana-vs-kanji decisions in JA pages.
- Image asset cleanup / placement (that's #22).

---

## 8. ADRs

### ADR-001: Flat slug naming, not subdirectory grouping

**Decision**: Use flat slugs like `agents-discovery` rather than `docs/wiki/en/agents/discovery.md`.

**Rationale**: Existing `sync-wiki.mjs` and `astro.config.mjs` are wired for flat
slugs. Subdirectory grouping would require sync logic changes, expanding scope. The
sidebar nesting (§4.1) provides the same UX benefit without the file-layout cost.

**Consequence**: 13 files at the top of `docs/wiki/{en,ja}/`. Acceptable for the current
size but if the directory grows past ~20 files, revisit.

### ADR-002: Delete old pages, no stub redirects

**Decision**: Old `Agents-Reference.md` and `Architecture.md` are deleted outright.
Incoming links are rewritten in the same commit.

**Rationale**: Repo is small; no external SEO; stub pages create long-tail
duplicate-content drift. One-shot rewrite is cleaner.

**Consequence**: A reader arriving via a bookmark to the old URL will get a 404. This
is acceptable for a project at this stage.

### ADR-003: Three-way split for Architecture, not two-way

**Decision**: Split `Architecture.md` into three pages (Domain Model / Protocols /
Operational Rules), not two.

**Rationale**: Two-way (Concepts / Reference) leaves the resulting "Reference" page at
~360 lines — still dense. Three-way drops each new page to ~150 lines, matching the
target density. The sandbox/rollback content is operationally distinct from
AGENT_RESULT protocol content; collapsing them blurs the audience model from §2.2.

**Consequence**: Sidebar gets 3 Architecture sub-entries instead of 2. Acceptable
under the §4.1 nesting plan.

### ADR-004: Defer translation polish to #40

**Decision**: For #42, JA pages are structurally parity-aligned with EN but receive
no translation-quality review. #40 (JA terminology rebalance) handles polish.

**Rationale**: Mixing structural and stylistic changes in one issue makes review
harder. Sequencing #42 → #40 also lets #40 work against the final structure rather
than a moving target.

**Consequence**: Between the #42 phase and the #40 phase of this PR, JA pages may
look mechanically translated. The user must accept this interim state at the #42
approval gate.

### ADR-005: Sidebar nesting now, not later

**Decision**: Update `site/astro.config.mjs` to use a nested sidebar structure as
part of the #42 commit.

**Rationale**: Without nesting, 13 flat sidebar entries are worse UX than the current
7. Doing nesting in a follow-up issue means landing #42 in a state strictly worse
than the status quo.

**Consequence**: `developer` phase must include sidebar config changes, not just
.md file moves. This is one extra task in TASK.md.

---

## 9. Edit plan (for the implementation phase)

The order below is what `developer` should follow. `doc-writer` handles prose;
`developer` handles config and rename mechanics.

1. **doc-writer**: Generate 5 new agent-domain EN pages by extracting from
   `Agents-Reference.md`. Preserve existing per-agent prose verbatim (no rewrites in
   this phase).
2. **doc-writer**: Generate 5 JA mirrors by structurally splitting
   `docs/wiki/ja/Agents-Reference.md` along the same boundaries.
3. **doc-writer**: Generate 3 EN Architecture pages and 3 JA mirrors similarly.
4. **developer**: Update `site/astro.config.mjs` `PAGES` to nested form, with the new
   slugs.
5. **developer**: Update incoming links in `Home.md` (EN+JA), `Contributing.md`
   (EN+JA), `Rules-Reference.md` (EN+JA), `Triage-System.md` (EN+JA),
   `Getting-Started.md` (EN+JA), `README.md`, and any `architecture-*.md` cross-refs.
6. **developer**: Delete old `Agents-Reference.md` and `Architecture.md` (EN+JA).
7. **developer**: Run `node scripts/sync-wiki.mjs` to mirror into `site/src/content/docs/`.
8. **developer**: Run `npm run build` from `site/` to verify no broken links.
9. **developer**: Run `grep -rn 'Agents-Reference\.md\|Architecture\.md' docs/ README.md site/`
   and verify empty.
10. **developer**: Commit as `docs(wiki): split agents-reference and architecture for readability (#42)`.

`#22` and `#40` follow as separate commits in the same PR after this commit lands and
the user approves the per-issue gate.

---

## 10. Open Questions (awaiting user sign-off)

The user's reply confirms or overrides each. All recommendations are flagged **(rec)**.

- **Q1 — Agents-Reference**: Split into 5 domain pages (Discovery / Delivery / Operations
  / Maintenance / Flow Orchestrators)? **(rec yes)**.
  Alternatives: keep as one with anchor TOC; split per-agent (rejected as too granular).

- **Q2 — Architecture**: Split into 3 pages (Domain Model / Protocols / Operational
  Rules)? **(rec yes)**.
  Alternatives: 2-way (Concepts vs Reference); keep as one.

- **Q3 — Slug layout**: Flat slugs (`agents-discovery`, `architecture-protocols`)
  with sidebar nesting in `astro.config.mjs`? **(rec yes per ADR-001)**.
  Alternative: subdirectory layout `docs/wiki/en/agents/discovery.md`.

- **Q4 — Old pages**: Delete `Agents-Reference.md` and `Architecture.md` outright,
  rewriting all incoming links in the same commit? **(rec yes per ADR-002)**.
  Alternative: replace with stub redirect pages.

- **Q5 — JA scope for #42**: For #42, JA pages are structurally aligned only;
  terminology polish deferred to #40? **(rec yes per ADR-004)**.
  Alternative: do terminology polish inline; this would expand #42's scope and make
  the per-issue gate harder to evaluate.

---

## 11. References

- `docs/wiki/{en,ja}/*.md` — current wiki pages (subjects of restructure)
- `docs/wiki/en/Contributing.md` §"Agents-Reference split threshold" — foreshadowing
  of this issue
- `site/astro.config.mjs` — sidebar source (PAGES array)
- `scripts/sync-wiki.mjs` — EN/JA → `site/` mirror
- Issue #42 — this issue's authority for scope
- Issue #22 — image asset cleanup (later phase, same PR)
- Issue #40 — JA terminology rebalance (later phase, same PR)
- `docs/issues/cli-update-rules-bug.md` — template / tone reference for this planning doc
- `docs/issues/maintenance-flow-wiki-sync.md` — prior wiki-restructure precedent

---

## 12. Out of Scope

- **Image asset cleanup** — issue #22, follows as the next commit in this same PR.
- **JA terminology rebalance** — issue #40, follows after #22.
- **Anchor-ID parity between EN and JA pages** — deferred to #40 per ADR-004.
- **Subdirectory layout under `docs/wiki/`** — deferred per ADR-001; revisit if file
  count exceeds ~20 per locale.
- **Splitting Triage-System / Getting-Started / Rules-Reference / Contributing /
  Home** — explicitly recommended against in §3.
- **External link audit** — third-party sites linking to `Agents-Reference.md` are
  out of scope per ADR-002.
