# JA Terminology Rebalance — Reduce Unnatural Katakana in JA Wiki & README

> Reference: branch `docs/wiki-restructure-images-terminology` off `main` (HEAD `4fa73d8`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (planning-only phase — no implementation in this commit)
> Scope: design / planning document. Implementation will follow in this same PR
> as a separate `doc-writer` phase, gated on user sign-off of the open
> questions in §10 below.
> GitHub Issue: [#40](https://github.com/kirin0198/aphelion-agents/issues/40)
> Related (same PR, prior phases): #42 (wiki page split, landed `a2c523f`/`839690c`),
> #22 (image asset cleanup, landed `4fa73d8`)

---

## 1. Background & Motivation

### 1.1 The complaint

Issue #40 reports that the JA wiki pages and `README.ja.md` use mechanical
katakana for many technical terms, producing unnatural Japanese text. The
landing page (`site/src/content/docs/ja/index.mdx`) uses
「フローオーケストレーター」 and similar long compound katakana strings; these
also appear pervasively across `agents-*.md`, `architecture-*.md`,
`triage-system.md`, and the README.

The issue body explicitly calls out four categories where the *policy must be
decided first*, before any prose rewrite:

1. Proper nouns / project terms (`Discovery Flow`, `AGENT_RESULT`, `SPEC.md`)
2. Role / agent names (`orchestrator`, `analyst`, `developer`, `interviewer`)
3. General technical terms (`repository`, `branch`, `session`, `workflow`)
4. Integration with `.claude/rules/localization-dictionary.md` and
   `language-rules.md`

This planning document fixes that policy. Prose rewriting is a later phase.

### 1.2 Why this issue runs *after* #42 and #22

Per ADR-004 of `docs/issues/wiki-restructure.md`, #42 deliberately deferred
translation polish — JA pages emerged from #42 as structurally parity-aligned
with EN but mechanically translated. #40 is the polish phase that operates
against the now-final structure (5 agent pages × 2 langs + 3 architecture
pages × 2 langs + the unchanged 5 pages × 2 langs = 26 wiki files plus
`README.ja.md` and `index.mdx`).

#22 only removed image references and did not touch prose, so #22 has zero
overlap with #40.

### 1.3 Measured katakana frequency (HEAD `4fa73d8`)

Site-wide grep across `docs/wiki/ja/` plus `README.ja.md`:

| Term                       | Hits | Category | Severity                       |
|----------------------------|-----:|----------|--------------------------------|
| `フローオーケストレーター` |  28  | 1+2      | Highest — explicitly called out by issue |
| `オーケストレーター`       |  83  | 2        | Very high — pervasive          |
| `エージェント`             | 177  | 2        | Very high but conventional     |
| `トリアージ`               |  85  | 1+3      | Pervasive (project term)       |
| `プラン`                   |  69  | 1        | Pervasive (project term)       |
| `セッション`               |  35  | 3        | Common, accepted katakana      |
| `ハンドオフ`               |  25  | 1+3      | Project term                   |
| `レビュー`                 |  22  | 3        | Common, accepted               |
| `フェーズ`                 |  22  | 3        | Common, accepted               |
| `スコープ`                 |  19  | 3        | Common, accepted               |
| `ワークフロー`             |  15  | 3        | Common, accepted               |
| `ロールバック`             |  13  | 3        | Project term                   |
| `デプロイ`                 |  13  | 3        | Common, accepted               |
| `プロトコル`               |  13  | 3        | Common, accepted               |
| `コミット`                 |   7  | 3        | Common, accepted               |
| `リポジトリ`               |   6  | 3        | Common, accepted               |
| `インタビュアー`           |   0  | 2        | Already English (good)         |
| `アナリスト`               |   0  | 2        | Already English (good)         |
| `デベロッパー`             |   0  | 2        | Already English (good)         |
| `アーキテクト`             |   0  | 2        | Already English (good)         |
| `ブランチ`                 |   0  | 3        | Already avoided                |

(Counts via `grep -rh '<term>' docs/wiki/ja/ README.ja.md | wc -l`.)

The 0-hit results in Category 2 are revealing: agent role names
(`analyst`, `developer`, `architect`, `interviewer`) are *already* kept in
English in the JA pages — see `docs/wiki/ja/Triage-System.md:140`,
`docs/wiki/ja/Agents-Discovery.md:56`. The pattern is established and just
needs to be codified and extended to `orchestrator`.

### 1.4 Goal

Decide a four-category policy with concrete examples, then write a glossary
appendix that is unambiguous enough for a doc-writer (or a sed-driven sweep
plus hand polish) to execute mechanically. The goal is *natural-sounding
Japanese for technical readers*, not minimal-katakana purism — established
katakana like 「セッション」、「リポジトリ」、「フェーズ」 stays.

---

## 2. Inventory — concrete examples by category

Citations are `path:line` against HEAD `4fa73d8`. Each example is rated:

- **K** — keep current form
- **E** — convert to bare English token
- **EJ** — first-use bilingual notation `English（カタカナ or kanji gloss）`,
  bare English afterward in the page
- **J** — convert to a Japanese paraphrase (kanji-leaning)

### 2.1 Category 1: Proper nouns / project terms

Capitalized multi-word project terms that name *one specific concept in
Aphelion's vocabulary*. The EN side spells them as English title-case (`Flow
Orchestrator`, `Discovery Flow`, `AGENT_RESULT`). The JA side currently
katakana-izes them inconsistently.

| # | Citation                                                       | Current form                        | Decision |
|---|----------------------------------------------------------------|-------------------------------------|----------|
| 1 | `docs/wiki/ja/Architecture-Domain-Model.md:57`                | `フローオーケストレーター`          | **E** → `Flow Orchestrator` |
| 2 | `docs/wiki/ja/Architecture-Domain-Model.md:98`                | `4つのフローオーケストレーター（discovery-flow、…）` | **EJ** → `4 つの Flow Orchestrator（discovery-flow / delivery-flow / operations-flow / maintenance-flow）` |
| 3 | `docs/wiki/ja/Home.md:78`                                      | `フローオーケストレーター`          | **E** → `Flow Orchestrator` |
| 4 | `docs/wiki/ja/Architecture-Domain-Model.md:44`                | `**Delivery** は設計・実装・テスト…` | **K** — `Delivery` already English |
| 5 | `docs/wiki/ja/Triage-System.md:155`                           | `## Maintenance フローのトリアージ` | **K** — already mixed-form `Maintenance フロー` is the agreed compromise (matches EN slugs); see ADR-101 |
| 6 | `docs/wiki/ja/Architecture-Protocols.md:90`                   | `## AGENT_RESULTプロトコル`         | **EJ** → `## AGENT_RESULT プロトコル` (add a half-width space; AGENT_RESULT stays as code-style English) |
| 7 | `README.ja.md:13`                                              | `独立したフローオーケストレーターが管理` | **E** → `独立した Flow Orchestrator が管理` |
| 8 | `docs/wiki/ja/Triage-System.md:35,41`                         | `フローオーケストレーター`          | **E** → `Flow Orchestrator` |

### 2.2 Category 2: Role / agent names

Lowercase identifiers that name a single agent or role
(`orchestrator`, `agent`, `analyst`, `developer`, `interviewer`, `architect`,
`reviewer`, `tester`, `doc-writer`, `change-classifier`).

The repo has already established (Category 2's 0-hit findings in §1.3) that
*specific agent identifiers stay in English*. The unsettled cases are the
generic role nouns:

- `agent` (177 hits as 「エージェント」)
- `orchestrator` (83 hits as 「オーケストレーター」)

| # | Citation                                                | Current form              | Decision |
|---|---------------------------------------------------------|---------------------------|----------|
| 9  | `docs/wiki/ja/Agents-Discovery.md:56`                  | `interviewer`             | **K** — already English |
| 10 | `docs/wiki/ja/Triage-System.md:140`                    | `analyst`                 | **K** — already English |
| 11 | `docs/wiki/ja/Architecture-Protocols.md:152`           | `特定のエージェント名（例：architect、developer）` | **K** — established mixed pattern: 「エージェント」 as the generic noun, agent IDs in English |
| 12 | `docs/wiki/ja/Architecture-Domain-Model.md:60`         | `### エージェントフロー`     | **K** — 「エージェント」 as the generic noun stays |
| 13 | `docs/wiki/ja/Architecture-Domain-Model.md:95`         | `各オーケストレーターは…`   | **E** → `各 Flow Orchestrator は…`. The bare 「オーケストレーター」 is shorthand for `Flow Orchestrator`; replace with the full English. |
| 14 | `docs/wiki/ja/Architecture-Protocols.md:139`           | `\| STATUS \| 意味 \| オーケストレーターのアクション \|` | **E** → `Flow Orchestrator のアクション` |
| 15 | `docs/wiki/ja/Triage-System.md:42-44`                  | `オーケストレーターが選択されたプランと…` | **E** → `Flow Orchestrator が…` |
| 16 | `docs/wiki/ja/Home.md:78`                              | `フローオーケストレーター \| フロー全体を管理するエージェント` | **EJ** → `Flow Orchestrator（フロー全体を管理する agent）` first-use, then bare English |

**Net rule**: bare 「オーケストレーター」 means `Flow Orchestrator`; convert to
the English title-case form. 「エージェント」 stays as the generic noun.
Specific agent identifiers (`developer`, `architect`, …) stay English.

### 2.3 Category 3: General technical terms

Common technical terms not unique to Aphelion. The line is drawn between:

- **Conventional katakana** that any Japanese technical reader recognizes
  immediately — keep.
- **Long compound katakana** that loses readability — convert to English or
  to kanji.

| # | Citation                                            | Current form                | Decision |
|---|-----------------------------------------------------|-----------------------------|----------|
| 17 | `docs/wiki/ja/Architecture-Domain-Model.md:90`     | `## セッション分離`         | **K** — 「セッション」 is conventional |
| 18 | `docs/wiki/ja/Home.md:16`                          | `Aphelionのリポジトリ`      | **K** — 「リポジトリ」 is conventional |
| 19 | `docs/wiki/ja/Triage-System.md:115`                | `Delivery フェーズシーケンス` | **K** — 「フェーズ」 is conventional |
| 20 | `docs/wiki/ja/Architecture-Protocols.md:22`        | `構造化されたMarkdownドキュメント` | **K** — add a half-width space: `構造化された Markdown ドキュメント`. 「ドキュメント」 stays. |
| 21 | `docs/wiki/ja/Triage-System.md:8`                  | `4段階の選択ロジック`       | **K** |
| 22 | `docs/wiki/ja/Architecture-Domain-Model.md:94`     | `コンテキストウィンドウのオーバーフロー防止` | **EJ** → `コンテキストウィンドウのオーバーフロー（context overflow）防止` (the compound 「コンテキストウィンドウ」 is OK; 「オーバーフロー」 alone is fine but a bilingual gloss aids the audience here) — *recommend dropping the gloss, keep katakana as-is*. **K**. |
| 23 | `docs/wiki/ja/Architecture-Domain-Model.md:128`    | `ワークフローモデルと設計原則` | **K** |
| 24 | `docs/wiki/ja/Triage-System.md:235`                | `## トリアージ評価質問`     | **K** — 「トリアージ」 is the project term itself; replacing it with `triage` everywhere would be over-rotation |
| 25 | `docs/wiki/ja/Triage-System.md:251`                | `## トリアージのオーバーライド` | **K** for 「トリアージ」, **K** for 「オーバーライド」 (conventional). |
| 26 | `docs/wiki/ja/Architecture-Domain-Model.md:55`     | `\| ファイルハンドオフ \|`    | **K** — established project term |
| 27 | `docs/wiki/ja/Architecture-Domain-Model.md:129`    | `差し戻しルール`             | **K** — already kanji ✓ (rollback term variations are inconsistent; see §2.4) |
| 28 | `README.ja.md:189`                                  | `テスト失敗・レビュー指摘時に原因分析後ロールバック` | **K** — 「ロールバック」 is established |

### 2.4 Inconsistencies surfaced during inventory

These are not policy questions but cleanup opportunities the implementation
phase should fix:

- **rollback/差し戻し**: `差し戻しルール` and `ロールバックルール` both
  appear; settle on **「差し戻し」** (kanji) when used as a flow-control
  concept (rolling back to an earlier agent), and **「ロールバック」**
  (katakana) when used as the technical action (`developer` rolls back a
  commit). See `docs/wiki/ja/Architecture-Domain-Model.md:129` vs
  `README.ja.md:189`.
- **Half-width spacing around code spans**: e.g. `AGENT_RESULTプロトコル`
  (Architecture-Protocols.md:90) vs `AGENT_RESULT プロトコル` elsewhere.
  Adopt **half-width space mandatory** between English/code and Japanese.
- **`Maintenance フロー` vs `Maintenance Flow`**: both appear. The decision
  in ADR-101 below is to use the EN title-case **`Maintenance Flow`** for
  the proper-noun reference and reserve 「Maintenance フロー」 for casual
  prose contexts. Same rule for Discovery / Delivery / Operations.
- **`Aphelionのリポジトリ` (no space)** vs **`Aphelion のリポジトリ`**:
  half-width space mandatory.

### 2.5 Out-of-scope examples (deliberately not changed)

- 「エージェント」 as a generic noun stays everywhere (177 hits). Converting
  this to bare `agent` would produce non-idiomatic Japanese for the most
  frequent term in the wiki.
- 「ドメイン」 stays. Converting to `domain` would clash with audience
  expectation; readers of this wiki are software engineers comfortable with
  「ドメイン」.
- All 5 unchanged-by-#42 pages (`Home.md`, `Getting-Started.md`,
  `Triage-System.md`, `Rules-Reference.md`, `Contributing.md`) get the same
  policy applied uniformly. No carve-outs.

---

## 3. Decision matrix — the four categories

For each category, the policy is one of: **English**, **Bilingual at first
use (EJ)**, **Katakana acceptable (K)**, or **Japanese paraphrase (J)**.

| Category | Examples | Default policy | Notes |
|----------|----------|----------------|-------|
| **C1: Proper nouns / project terms** | `Flow Orchestrator`, `Discovery Flow`, `Delivery Flow`, `Operations Flow`, `Maintenance Flow`, `AGENT_RESULT`, `SPEC.md`, `DISCOVERY_RESULT.md`, `MAINTENANCE_RESULT.md`, `HAS_UI`, `PRODUCT_TYPE` | **E** (bare English) for code-style identifiers; **EJ** for multi-word phrases on first use per page | Mirrors EN canonical form; preserves cross-language `grep`-ability |
| **C2: Role / agent identifiers** (specific) | `analyst`, `developer`, `architect`, `interviewer`, `tester`, `reviewer`, `doc-writer`, `change-classifier`, `discovery-flow`, `delivery-flow`, `operations-flow`, `maintenance-flow` | **E** (bare English, code-style) | Already established. 0 hits for katakanized forms validates this. |
| **C2': Generic role nouns** | `agent`, `orchestrator` (when standing alone, not as `Flow Orchestrator`) | 「エージェント」 = **K**. 「オーケストレーター」 alone = **E** → `Flow Orchestrator` (because it is *always* shorthand for it in this repo). | The 「オーケストレーター」 → `Flow Orchestrator` rewrite is the single largest sweep (~83 + 28 = ~111 hits). |
| **C3: Common technical terms — accepted katakana** | `セッション`, `リポジトリ`, `フェーズ`, `ワークフロー`, `スコープ`, `ハンドオフ`, `プロトコル`, `スキーマ`, `ロールバック` (the action), `コミット`, `デプロイ`, `レビュー`, `ドキュメント`, `アーキテクチャ`, `ドメイン`, `モデル`, `トリアージ`, `プラン`, `モード`, `ティア`, `オーバーライド` | **K** (keep) | These are conventional in Japanese technical writing. |
| **C3': Common technical terms — kanji preferred** | `差し戻し` (rollback as flow-control), `承認` (approval), `生成` (generation), `起動` (launch / spawn), `分割` (split), `引き渡し` (handoff as a verb) | **J** (use kanji) | When a clean kanji form already exists and is shorter than the katakana, prefer it. Already largely the case. |
| **C4: Long compound katakana that loses meaning** | `フローオーケストレーター`, `ディスカバリーフロー`, `デリバリーフロー`, `オペレーションズフロー`, `メンテナンスフロー` | **E** for the proper noun (`Flow Orchestrator`, `Discovery Flow`, …) | This is the core of #40. |

### 3.1 Spacing rule (orthogonal to category)

A **half-width space is mandatory** between English/code spans and adjacent
Japanese text:

- ✅ `Aphelion のリポジトリ`
- ❌ `Aphelionのリポジトリ`
- ✅ `4 つの Flow Orchestrator が`
- ❌ `4つのFlow Orchestratorが`
- ✅ `\`AGENT_RESULT\` プロトコル`
- ❌ `\`AGENT_RESULT\`プロトコル`

Within pure-Japanese runs no spacing change is needed. Within pure-English
runs no change is needed.

### 3.2 First-use bilingual notation (EJ)

For each page, the *first occurrence* of a Category-1 multi-word proper noun
gets a parenthetical Japanese gloss; subsequent uses on the same page are
bare English:

- First use: `Flow Orchestrator（フローオーケストレーター）` — *or* a kanji
  gloss like `Flow Orchestrator（フロー管理エージェント）` if more
  illuminating
- Subsequent uses: `Flow Orchestrator`

The implementation phase decides per-page which form is best. The default is
the katakana gloss because the katakana form is already familiar to readers.

The Home.md glossary entry is *itself* a first use for the whole site, so:

```markdown
| **Flow Orchestrator**（フローオーケストレーター） | フロー全体を管理する agent（discovery-flow / delivery-flow / operations-flow / maintenance-flow） |
```

---

## 4. Glossary appendix (~30 terms)

The implementation must apply this glossary uniformly across all in-scope
files. Terms are grouped by category. *The "JA form" column is what should
appear in the polished JA page.*

### 4.1 Category 1 — proper nouns (English, with first-use gloss)

| EN canonical          | JA form (subsequent uses) | First-use gloss form                        | Notes |
|-----------------------|---------------------------|---------------------------------------------|-------|
| Flow Orchestrator     | `Flow Orchestrator`       | `Flow Orchestrator（フローオーケストレーター）` | Replaces 「フローオーケストレーター」 (28 hits) and bare 「オーケストレーター」 (most of 83 hits) |
| Discovery Flow        | `Discovery Flow`          | `Discovery Flow（要件探索フロー）`           | Already mostly English ✓ |
| Delivery Flow         | `Delivery Flow`           | `Delivery Flow（設計・実装フロー）`          | Already mostly English ✓ |
| Operations Flow       | `Operations Flow`         | `Operations Flow（デプロイ・運用フロー）`    | Already mostly English ✓ |
| Maintenance Flow      | `Maintenance Flow`        | `Maintenance Flow（保守フロー）`             | Mixed-form 「Maintenance フロー」 also acceptable in casual prose; see ADR-101 |
| AGENT_RESULT          | `AGENT_RESULT`            | (no gloss; code-style)                      | Always backtick-quoted in prose |
| SPEC.md / ARCHITECTURE.md / TASK.md / TEST_PLAN.md | as written | (no gloss)             | File names are bare code-style |
| DISCOVERY_RESULT.md / DELIVERY_RESULT.md / MAINTENANCE_RESULT.md | as written | (no gloss)        | Same |
| PRODUCT_TYPE          | `PRODUCT_TYPE`            | (no gloss)                                  | Code-style identifier |
| HAS_UI                | `HAS_UI`                  | (no gloss)                                  | Code-style identifier |
| Aphelion              | `Aphelion`                | (no gloss)                                  | Project name |

### 4.2 Category 2 — role / agent identifiers (English, code-style)

| EN canonical | JA form | Notes |
|--------------|---------|-------|
| analyst, developer, architect, interviewer, researcher, scope-planner, prerequisite-checker, rules-designer, designer, scaffolder, infra-builder, db-ops, observability, releaser, tester, reviewer, security-auditor, doc-writer, e2e-test-designer, test-designer, codebase-analyzer, change-classifier, dependency-monitor, poc-engineer, sandbox-runner, ops-planner | bare English, often backtick-quoted | All 29 agent IDs follow the same rule. Already 100% compliant per §1.3. |
| `discovery-flow` / `delivery-flow` / `operations-flow` / `maintenance-flow` | bare English, backtick-quoted when referenced as command or as agent file name | Slash-command style: `/discovery-flow` |

### 4.3 Category 2' — generic role nouns

| EN | JA form | Notes |
|----|---------|-------|
| agent (the noun) | 「エージェント」 | 177 hits, kept |
| orchestrator (alone) | `Flow Orchestrator` | Replace; bare 「オーケストレーター」 in Aphelion always means this |
| agent definition file | 「エージェント定義ファイル」 | Kept |

### 4.4 Category 3 — accepted katakana (keep)

| EN | JA form | Notes |
|----|---------|-------|
| session | 「セッション」 | |
| repository | 「リポジトリ」 | |
| branch | 「ブランチ」 (when written) | Currently 0 hits because phrasing avoids it; keep katakana when needed |
| phase | 「フェーズ」 | |
| workflow | 「ワークフロー」 | |
| scope | 「スコープ」 | |
| handoff (the noun) | 「ハンドオフ」 | |
| protocol | 「プロトコル」 | |
| schema | 「スキーマ」 | |
| commit (the noun) | 「コミット」 | |
| deploy / deployment | 「デプロイ」 | |
| review | 「レビュー」 | |
| document | 「ドキュメント」 | |
| architecture | 「アーキテクチャ」 | |
| domain | 「ドメイン」 | |
| model | 「モデル」 | |
| triage | 「トリアージ」 | |
| plan / tier | 「プラン」 / 「ティア」 | |
| mode | 「モード」 | |
| override (verb / noun) | 「オーバーライド」 | |
| context window | 「コンテキストウィンドウ」 | |

### 4.5 Category 3' — kanji preferred over katakana

| EN | JA form | Notes |
|----|---------|-------|
| approval (gate) | 「承認」 / 「承認ゲート」 | Already kanji ✓ |
| generation | 「生成」 | Already kanji ✓ |
| launch / spawn | 「起動」 | Already kanji ✓ |
| split (a page) | 「分割」 | Already kanji ✓ |
| handoff (as verb / file passing) | 「引き渡し」 | Already kanji ✓ |
| rollback as flow-control concept | 「差し戻し」 | Reserve 「ロールバック」 for the technical action |
| audience | 「想定読者」 | The `> Audience: …` admonition currently uses raw English; convert to 「想定読者」 |

### 4.6 Category 4 — banned compound katakana

| Banned form | Replacement |
|-------------|-------------|
| `フローオーケストレーター` | `Flow Orchestrator` |
| `ディスカバリーフロー` (if ever added) | `Discovery Flow` |
| `デリバリーフロー` (if ever added) | `Delivery Flow` |
| `オペレーションズフロー` (if ever added) | `Operations Flow` |
| `メンテナンスフロー` (if ever added) | `Maintenance Flow` |

(The "if ever added" rows are preventive — none currently appear, but the
rule prevents future regression.)

---

## 5. Integration with `localization-dictionary.md` and `language-rules.md`

### 5.1 Current state

`src/.claude/rules/localization-dictionary.md` defines **fixed UI strings**
used by agents at runtime (approval gate, AskUserQuestion fallback, progress
display). It is *not* a glossary for prose.

`src/.claude/rules/language-rules.md` defines `Output Language` resolution
and the hybrid localization strategy (fixed UI strings via dictionary;
free-form narrative via prompt).

### 5.2 Should this glossary live in `localization-dictionary.md`?

**No — recommend keeping the glossary in this planning document only.**

Rationale:

- `localization-dictionary.md` is consumed by agents at *runtime* to render
  correct user-facing strings. A glossary for *static documentation* is a
  different artifact with a different audience (the human author / reviewer
  of `docs/wiki/ja/*.md`, not the agent at task time).
- Mixing the two would force every agent reading the dictionary to scroll
  past 30 documentation glossary entries it does not need.
- The glossary is project-specific lore that belongs near other project
  decisions in `docs/issues/`. It shares the lifecycle of the JA wiki
  pages.
- If a future agent (e.g. `doc-writer` invoked for additional JA wiki
  expansions) needs to look up the policy, this planning document is
  discoverable via the `docs/issues/` directory.

**Counter-proposal considered and rejected**: split the dictionary file into
`localization-dictionary-runtime.md` (fixed UI strings) and
`localization-dictionary-prose.md` (this glossary). Rejected as overkill for
~30 entries — see ADR-103.

### 5.3 Pointer from `localization-dictionary.md`

Add a short pointer comment at the top of
`src/.claude/rules/localization-dictionary.md` so readers searching for a
prose term find this planning doc:

```markdown
> Note: This file lists *runtime UI strings only*. For policy on technical
> terminology in `docs/wiki/ja/*.md` and `README.ja.md` (when to use
> English / katakana / kanji), see `docs/issues/ja-terminology-rebalance.md`.
```

This is a 3-line addition that does not change behavior, and is a
documentation-only patch suitable for the same commit as the JA prose
rewrite.

### 5.4 No change to `language-rules.md`

`language-rules.md` already correctly states that free-form narrative is
generated by the agent in the resolved Output Language. The glossary is the
*authoring* policy that humans (and `doc-writer`) follow when producing
that narrative; it does not change the resolution mechanism.

---

## 6. Implementation scope & approach

### 6.1 Files in scope

**In scope (must be polished):**

- `docs/wiki/ja/Home.md`
- `docs/wiki/ja/Getting-Started.md`
- `docs/wiki/ja/Architecture-Domain-Model.md`
- `docs/wiki/ja/Architecture-Protocols.md`
- `docs/wiki/ja/Architecture-Operational-Rules.md`
- `docs/wiki/ja/Triage-System.md`
- `docs/wiki/ja/Agents-Orchestrators.md`
- `docs/wiki/ja/Agents-Discovery.md`
- `docs/wiki/ja/Agents-Delivery.md`
- `docs/wiki/ja/Agents-Operations.md`
- `docs/wiki/ja/Agents-Maintenance.md`
- `docs/wiki/ja/Rules-Reference.md`
- `docs/wiki/ja/Contributing.md`
- `README.ja.md`
- `site/src/content/docs/ja/index.mdx` (mirrored by `sync-wiki.mjs` for
  most pages, but `index.mdx` is *bespoke to the site* and authored
  directly there — must be hand-edited)

After the prose pass, run `node scripts/sync-wiki.mjs` to regenerate
`site/src/content/docs/ja/{home,getting-started,…}.md` from the wiki
sources. The sync is mechanical.

**Out of scope (explicitly):**

- `docs/wiki/en/*.md` and `README.md` — EN is canonical, not the problem.
- `.claude/agents/*.md` — agent definition files are English-fixed by
  `language-rules.md` invariants.
- `.claude/rules/*.md` and `.claude/orchestrator-rules.md` — these are
  agent-consumed runtime artifacts; behavior change is out of scope. (The
  3-line pointer in `localization-dictionary.md` per §5.3 is the only
  edit.)

### 6.2 Should `docs/issues/*.md` planning docs be polished?

**Recommend: only the JA-only ones, and minimally — no glossary sweep.**

Two existing planning docs are JA-mixed
(`wiki-cloudflare-pages.md`, `wiki-architecture-diagrams.md`). They are
historical artifacts that captured decisions at a moment in time. Rewriting
them would:

- Break their value as historical record
- Require sync with each new term in the glossary (drift risk)
- Add ~50 KB to the polish surface for marginal user benefit (planning
  docs are read by maintainers who already know the project vocabulary)

**Decision: leave existing planning docs alone.** New planning docs (this
file, future `docs/issues/*.md`) follow the §3 policy from authorship — but
that's a soft norm, not enforced retroactively. See ADR-104.

### 6.3 Anchor IDs deferred from #42

Per ADR-004 in `wiki-restructure.md`, anchor-ID parity between EN and JA
pages was deferred to #40. Status: **anchor IDs in the post-#42 JA pages
are still Starlight-derived from JA heading text** (see e.g.
`docs/wiki/ja/Architecture-Domain-Model.md:13` `[セッション分離](#セッション分離)`).

**Recommend: defer again to a follow-up issue.** Reasoning:

- The terminology rebalance changes some JA headings (e.g. an EJ first-use
  notation may now appear in a heading that was pure katakana before),
  which would invalidate any anchor-stability work done in this issue.
- Anchor parity needs a Starlight-aware approach: either explicit
  `{#anchor-id}` annotations on each JA heading (Starlight supports this
  via remark-heading-id or similar plugin) or stable English heading IDs.
  Both approaches are non-trivial and orthogonal to terminology.
- This issue is already a substantial sweep (~13 JA files plus README and
  index.mdx). Adding anchor strategy would balloon scope.

A follow-up issue should track: (a) decide explicit-id vs english-anchor,
(b) implement across all JA pages, (c) add a CI check that verifies parity.

### 6.4 Approach for execution — `doc-writer` per-file, not sed

Three options were considered:

- **A: Sed-driven mass replacement.** Fast, consistent. Risk: no semantic
  awareness — would convert 「オーケストレーター」 to `Flow Orchestrator`
  even in contexts where the user actually meant a different orchestrator
  (none exist in this repo today, but resilience-to-future is low).
  Spacing rules (§3.1) cannot be expressed as a regex without false
  positives.

- **B: `doc-writer` per-file, hand-edited.** Slower, but each file is
  reviewed in context. The doc-writer agent is exactly designed for this:
  it reads the planning doc, applies the policy, produces the updated
  prose, and reports per-file completion.

- **C: Hybrid — sed for the obviously safe replacements
  (「フローオーケストレーター」 → `Flow Orchestrator`,
  「AGENT_RESULTプロトコル」 → `AGENT_RESULT プロトコル`), then
  `doc-writer` for everything else.** Compounds the risk of A on the safe
  subset while not saving meaningful effort vs B because doc-writer still
  has to do the hard pass.

**Recommendation: Option B — `doc-writer` per-file in a single batched
session, with this planning doc as input.** ~14 files × ~150 lines each =
~2 KLoC of prose to review. The doc-writer can process them sequentially.

The `developer` agent's role in this issue is limited to:

1. Append the §5.3 pointer comment to `localization-dictionary.md`.
2. Run `node scripts/sync-wiki.mjs` after `doc-writer` finishes.
3. Run `npm run build` from `site/` to verify no broken anchors *that
   already worked* (anchors still derived from JA headings, just
   re-derived from updated headings).
4. Stage and commit.

### 6.5 Commit shape

A single commit on the existing branch
`docs/wiki-restructure-images-terminology`, after #40 sign-off:

```
docs(wiki/ja): rebalance JA terminology — drop unnatural compound katakana (#40)

- Replace 「フローオーケストレーター」 / 「オーケストレーター」 with `Flow Orchestrator` (~111 hits)
- Convert AGENT_RESULT / SPEC.md / DISCOVERY_RESULT.md etc. to bare code-style English
- Apply half-width spacing between English/code and Japanese
- Apply first-use bilingual notation `Flow Orchestrator（フローオーケストレーター）` per page
- Reserve 「ロールバック」 for the technical action; use 「差し戻し」 for flow-control rollback
- Add pointer in src/.claude/rules/localization-dictionary.md to docs/issues/ja-terminology-rebalance.md
- Sync site/src/content/docs/ja/* via scripts/sync-wiki.mjs

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 7. Acceptance criteria (scoped to terminology only)

After the implementation phase, the following must hold:

1. [ ] `grep -rn 'フローオーケストレーター' docs/wiki/ja/ README.ja.md
   site/src/content/docs/ja/` returns **zero** hits.
2. [ ] `grep -rn 'オーケストレーター' docs/wiki/ja/ README.ja.md
   site/src/content/docs/ja/` returns hits **only** within first-use
   bilingual gloss `Flow Orchestrator（フローオーケストレーター）` (≤ 14
   hits — at most one per JA page where the term first appears).
3. [ ] All 29 agent identifiers
   (`analyst`, `developer`, `architect`, `interviewer`, …) appear as bare
   English. No katakana variant exists. (Already 0 hits per §1.3 — must
   stay 0.)
4. [ ] No occurrence of `Aphelionの` / `Markdownドキュメント` /
   `AGENT_RESULTプロトコル` patterns (English-token directly adjacent to
   Japanese with no half-width space). Verify via:
   `grep -rEn '[A-Za-z0-9_]+[ぁ-んァ-ヶー一-龠]' docs/wiki/ja/ README.ja.md`
   — should return zero relevant hits (some incidental matches inside code
   blocks or URLs are acceptable).
5. [ ] Each in-scope JA page introduces `Flow Orchestrator` with the
   first-use bilingual notation
   `Flow Orchestrator（フローオーケストレーター）` (or kanji gloss) on
   first occurrence within that page.
6. [ ] `Maintenance Flow`, `Discovery Flow`, `Delivery Flow`,
   `Operations Flow` use English title-case form for the proper-noun
   reference. The mixed form 「Maintenance フロー」 may appear in casual
   prose contexts (per ADR-101).
7. [ ] `docs/wiki/ja/Home.md` glossary table lists all C1 / C2' terms with
   the bilingual first-use form (this is itself the canonical first use
   for the site).
8. [ ] `src/.claude/rules/localization-dictionary.md` has the pointer
   comment per §5.3.
9. [ ] `node scripts/sync-wiki.mjs` runs cleanly and updates
   `site/src/content/docs/ja/*.md`.
10. [ ] `npm run build` from `site/` succeeds with zero broken-link
    warnings.
11. [ ] No EN page or `.claude/` file is modified by this commit (verify
    via `git diff --stat` excluding `docs/wiki/ja/`, `README.ja.md`,
    `site/src/content/docs/ja/`, and the one-line addition to
    `src/.claude/rules/localization-dictionary.md`).

Acceptance items intentionally **not** included, deferred:

- EN/JA anchor-ID parity (§6.3, future issue).
- Translation-quality review beyond terminology (e.g. paragraph-level
  natural-Japanese rewrites). Scope limited to glossary application.
- Polishing of older `docs/issues/*.md` planning docs (§6.2).

---

## 8. ADRs

### ADR-101: Proper nouns stay in English (title case)

**Decision**: Multi-word project terms (`Flow Orchestrator`,
`Discovery Flow`, `Delivery Flow`, `Operations Flow`, `Maintenance Flow`,
`AGENT_RESULT`, etc.) are written in English title case in JA pages.
Bare 「オーケストレーター」 is replaced with `Flow Orchestrator`. The
mixed form 「Maintenance フロー」 is acceptable in casual prose.

**Rationale**: (a) Mirrors the EN canonical form, preserving cross-language
`grep`-ability for maintainers. (b) The katakana form
「フローオーケストレーター」 is explicitly called out by the issue as
unnatural. (c) Specific agent IDs are *already* English; extending this to
proper-noun phrases is the consistent move. (d) First-use bilingual gloss
preserves accessibility for readers unfamiliar with the term.

**Consequence**: Some loss of pure-Japanese flow in long sentences. The EJ
first-use notation mitigates this for the proper nouns most likely to
confuse a new reader.

### ADR-102: Generic noun 「エージェント」 stays as katakana

**Decision**: The generic noun "agent" is kept as 「エージェント」 across
all JA pages. Only the specific identifiers (`analyst`, `developer`, …)
and the *role-noun-shorthand* `orchestrator` (which always means
`Flow Orchestrator` in this repo) are converted to English.

**Rationale**: 「エージェント」 has 177 hits — converting all to bare
`agent` would produce stilted prose. 「エージェント」 is conventional
katakana for any Japanese technical reader. The issue is specifically
*compound* katakana, not all katakana.

**Consequence**: A reader may briefly need to recognize that
「エージェント」 (generic) and `developer` (specific) refer to the same
ontology. This is the same pattern used in the EN side ("agents" vs
"`developer`") and is well-attested in the wiki today.

### ADR-103: Glossary lives in this planning doc, not in `localization-dictionary.md`

**Decision**: This document is the canonical source for JA prose
terminology policy. `src/.claude/rules/localization-dictionary.md` gets a
3-line pointer (§5.3) but is otherwise unchanged.

**Rationale**: The dictionary is for *runtime* fixed UI strings used by
agents during task execution. The glossary is for *authoring-time* policy
used by humans (and `doc-writer`) when writing prose. Mixing them adds
runtime parsing weight for zero runtime benefit.

**Consequence**: Discoverability is one extra hop (read the dictionary,
follow the pointer to this file). Acceptable given the ~30-entry size.

### ADR-104: Existing planning docs not retroactively polished

**Decision**: `docs/issues/wiki-cloudflare-pages.md` and
`docs/issues/wiki-architecture-diagrams.md` (the JA-mixed planning docs)
are left as-is. The §3 policy applies to *new* planning docs from #40
onward as a soft authorial norm.

**Rationale**: Planning docs are historical records of decisions at a
moment in time. Retroactive rewrites obscure that history and create drift
risk against future glossary updates.

**Consequence**: Searching old planning docs for the new canonical form
will fail. Acceptable — old planning docs are read by project
maintainers who know the vocabulary.

### ADR-105: Anchor-ID parity deferred to a separate issue

**Decision**: EN/JA anchor-ID parity is *not* addressed in #40. A
follow-up issue tracks it.

**Rationale**: Terminology rewrites change some JA headings, which would
invalidate any anchor-stability work done concurrently. Anchor strategy
is a Starlight-config and remark-plugin question, semantically independent
of terminology choice. Bundling them increases review burden without
synergy.

**Consequence**: After #40, JA anchors are still Starlight-derived from
the (now polished) JA heading text. Cross-language deep links
(e.g. `/en/architecture-protocols#agent-result-protocol` →
`/ja/architecture-protocols#agent-result-protocol`) still don't work.
Cross-language linking remains via the page-level link only.

### ADR-106: `doc-writer` per-file, not sed

**Decision**: Implementation uses the `doc-writer` agent reading this
planning doc and processing each in-scope file in a single batched
session. No mass `sed` rewrite.

**Rationale**: Spacing rules (§3.1) and first-use vs subsequent-use rules
(§3.2) cannot be expressed as a context-free regex without false
positives. `doc-writer` reads in context. The total surface (~14 files,
~2 KLoC) is small enough.

**Consequence**: Implementation phase is one `doc-writer` invocation
followed by one `developer` invocation (sync + commit). One commit, one
review.

---

## 9. Edit plan (for the implementation phase)

The order below is what the implementation phase should follow. Steps 1–14
are `doc-writer` (one agent invocation, batched). Steps 15–18 are
`developer`.

1. `doc-writer`: read this planning doc (`docs/issues/ja-terminology-rebalance.md`).
2. `doc-writer`: edit `docs/wiki/ja/Home.md` — apply glossary table
   updates, first-use notation, replace
   「フローオーケストレーター」/「オーケストレーター」 → `Flow Orchestrator`,
   apply half-width spacing.
3. `doc-writer`: edit `docs/wiki/ja/Getting-Started.md`.
4. `doc-writer`: edit `docs/wiki/ja/Architecture-Domain-Model.md`.
5. `doc-writer`: edit `docs/wiki/ja/Architecture-Protocols.md`.
6. `doc-writer`: edit `docs/wiki/ja/Architecture-Operational-Rules.md`.
7. `doc-writer`: edit `docs/wiki/ja/Triage-System.md`.
8. `doc-writer`: edit `docs/wiki/ja/Agents-Orchestrators.md`.
9. `doc-writer`: edit `docs/wiki/ja/Agents-Discovery.md`.
10. `doc-writer`: edit `docs/wiki/ja/Agents-Delivery.md`.
11. `doc-writer`: edit `docs/wiki/ja/Agents-Operations.md`.
12. `doc-writer`: edit `docs/wiki/ja/Agents-Maintenance.md`.
13. `doc-writer`: edit `docs/wiki/ja/Rules-Reference.md`.
14. `doc-writer`: edit `docs/wiki/ja/Contributing.md`,
    `README.ja.md`, `site/src/content/docs/ja/index.mdx`.
15. `developer`: append §5.3 pointer comment to
    `src/.claude/rules/localization-dictionary.md`.
16. `developer`: run `node scripts/sync-wiki.mjs` to propagate to
    `site/src/content/docs/ja/`.
17. `developer`: run `npm run build` from `site/`. Resolve any broken-link
    warnings.
18. `developer`: run all §7 acceptance grep checks. Stage and commit
    per §6.5. Push and update PR description.

---

## 10. Open Questions (awaiting user sign-off)

The user's reply confirms or overrides each. All recommendations are flagged
**(rec)**.

- **Q1 — Category 1 policy**: Multi-word project terms (`Flow Orchestrator`,
  `Discovery Flow`, …) → English title case, with first-use bilingual
  gloss `Flow Orchestrator（フローオーケストレーター）` per page?
  **(rec yes per ADR-101)**.
  Alternatives: (a) keep katakana, just shorten the longest forms;
  (b) full kanji rendering like 「フロー管理エージェント」.

- **Q2 — Category 2' policy** (the `orchestrator` vs `agent` split):
  Bare 「オーケストレーター」 → `Flow Orchestrator`; 「エージェント」 stays
  katakana? **(rec yes per ADR-102)**.
  Alternatives: also convert 「エージェント」 → `agent` (rejected as
  over-rotation, 177 hits would produce stilted prose).

- **Q3 — Glossary location**: Glossary lives in this planning document,
  with a 3-line pointer added to `src/.claude/rules/localization-dictionary.md`?
  **(rec yes per ADR-103)**.
  Alternative: split `localization-dictionary.md` into runtime + prose
  variants (rejected as overkill).

- **Q4 — Anchor IDs**: EN/JA anchor-ID parity *deferred* to a separate
  follow-up issue, not addressed in #40? **(rec yes per ADR-105)**.
  Alternative: do anchor parity inline with terminology — would expand
  scope substantially.

- **Q5 — Existing planning docs**: `docs/issues/wiki-cloudflare-pages.md`
  and `docs/issues/wiki-architecture-diagrams.md` (JA-mixed historical
  planning docs) left as-is, glossary applied only to *new* planning docs
  from this issue forward? **(rec yes per ADR-104)**.
  Alternative: also polish historical planning docs.

- **Q6 — Implementation approach**: `doc-writer` per-file, batched in a
  single agent invocation? **(rec yes per ADR-106)**.
  Alternative: sed-driven mass rewrite (rejected for spacing-rule
  expressivity reasons); hybrid sed+doc-writer (rejected as compounding
  risk of pure sed).

- **Q7 — Mixed form 「Maintenance フロー」**: keep as acceptable in casual
  prose, alongside the proper-noun form `Maintenance Flow`? **(rec yes
  per ADR-101)**. Alternative: ban the mixed form entirely, force English
  in every context.

---

## 11. References

- `docs/wiki/ja/*.md` — current JA wiki pages (subjects of polish)
- `README.ja.md` — current JA README (subject of polish)
- `site/src/content/docs/ja/index.mdx` — bespoke JA landing (subject of
  polish; not auto-synced from wiki)
- `src/.claude/rules/localization-dictionary.md` — runtime UI string
  dictionary (gets pointer comment, not glossary content)
- `src/.claude/rules/language-rules.md` — `Output Language` resolution
  (no change)
- `scripts/sync-wiki.mjs` — EN/JA wiki → `site/` mirror (used in step 16)
- `docs/issues/wiki-restructure.md` — #42 planning, ADR-004 deferred
  translation polish to here
- Issue [#40](https://github.com/kirin0198/aphelion-agents/issues/40) —
  this issue's authority for scope
- Issue [#42](https://github.com/kirin0198/aphelion-agents/issues/42) —
  prior wiki structure split (already landed)
- Issue [#22](https://github.com/kirin0198/aphelion-agents/issues/22) —
  image asset cleanup (already landed)

---

## 12. Out of Scope

- **EN-side prose changes** — `docs/wiki/en/*.md` and `README.md` are
  canonical and not the problem.
- **Agent definition file changes** — `.claude/agents/*.md` and
  `.claude/rules/*.md` (other than the §5.3 pointer comment) are
  English-fixed by `language-rules.md` invariants.
- **EN/JA anchor-ID parity** — deferred per ADR-105.
- **Polishing of older `docs/issues/*.md` planning docs** — deferred per
  ADR-104.
- **Paragraph-level Japanese-naturalness rewrites** beyond glossary
  application (e.g. converting passive voice to active, restructuring
  long sentences). #40 is *terminology* rebalance, not full editorial
  polish.
- **CI enforcement of the policy** (a `grep` linter on JA pages) — nice to
  have, not required for #40.
