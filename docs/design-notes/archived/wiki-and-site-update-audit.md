> Last updated: 2026-04-30
> GitHub Issue: [#103](https://github.com/kirin0198/aphelion-agents/issues/103)
> Authored by: analyst
> Next: developer (architect skip — straightforward sync fixup)

# Wiki and site/ update-drift audit

## 1. Problem statement

ユーザー報告: 「wiki のランディングページのエージェント数が更新されていない。他に更新漏れがないか確認して対応を開始してください。」

直近の bump / 更新の流れ:

- agent count: 31 → 32 (#91 doc-reviewer 追加, PR #92) → 39 (#54 doc-flow + 6 author 追加, PR #98)
- domain count: 4 ドメイン → 5 ドメイン (Doc 追加, #54 / PR #98)
- Agents Reference page 数: 5 ページ → 6 ページ (Agents-Doc.md 新設, #54 / PR #98)
- README badge 追加 (agents-39 / commands-14 / rules-12 / license-MIT, PR #102)
- 新 slash command: `/doc-flow` (#54)
- 新 cross-cutting agent: `doc-reviewer` (#91)
- 新 flow orchestrator: `doc-flow` (5th flow, #54)

これらが複数の同期ポイントに渡っていた結果、`docs/wiki/{en,ja}/Home.md` 等の主要 canonical 文書は更新されたものの、**`site/` 配下の Astro Starlight ランディングページ**、**README 本文 (L70)**、**Home.md の rules 数**、**`astro.config.mjs` の sidebar 定義**、**CHANGELOG `[Unreleased]`** で取り残しが発生している。

ユーザーが指摘した「wiki のランディングページ」は Cloudflare Pages 上の <https://aphelion-agents.com/> のトップ = `site/src/content/docs/{en,ja}/index.mdx` を指す。

## 2. Current state evidence

### 2.1 直近の bump 履歴 (確認済み)

| PR / Issue | 内容 | canonical 反映 | 漏れ |
|------------|------|----------------|------|
| #91 / #92 | doc-reviewer 追加 (32 agents) | `.claude/agents/`, `aphelion-overview.md` 反映 | README.md L70 / README.ja.md L70 が "32" のまま |
| #54 / #98 | doc-flow + Doc domain (39 agents / 5 flows / 6 pages) | wiki/Home.md, aphelion-overview.md 反映 | site/index.mdx 全体が 29/4/5 のまま. astro.config.mjs PAGES に Agents-Doc 不在. README L70 も 32 のまま (#91 引き継ぎ) |
| #101 / #102 | README badge 追加 / 本文 39 化 | README.md L3, L6 / README.ja.md L3, L6 反映 | README.md L70 / README.ja.md L70 が 32 残存 |
| 規模拡張に伴うルール 9 → 12 | rules 12 個実在 | `src/.claude/rules/` 12 ファイル, Rules-Reference.md 11 entries | wiki/Home.md (en/ja) L26-27, L41-42 で "9 behavior rules / 9 つの行動ルール" 残存 |
| 上記すべて | Unreleased セクション | - | CHANGELOG.md `[Unreleased]` に doc-flow / doc-reviewer / Agents-Doc.md / agent count bump / badge entries が未記載 |

### 2.2 site/ 配下構造と sync-wiki.mjs の挙動

- `site/` は Astro Starlight プロジェクト (`site/package.json`)。`prebuild: node ../scripts/sync-wiki.mjs` により build 時に `docs/wiki/{en,ja}/*.md` を `site/src/content/docs/{en,ja}/*.md` へコピー + frontmatter 自動付与 + リンク Starlight 形式書き換え。
- 同期対象 = wiki にある `*.md` のみ。**`index.mdx` は wiki に対応ファイルがなく、site/ 専用の手動メンテファイル**。
- 結論:
  - `site/src/content/docs/{en,ja}/index.mdx` → **手動更新必要** (本 audit のメイン対象)。
  - `site/src/content/docs/{en,ja}/home.md`, `rules-reference.md`, `getting-started.md` 等の wiki 由来ファイル → コミット済みコピーが古くても build で自動上書きされるため、**直接の編集は不要** (wiki 側さえ正しければ Cloudflare Pages 再 build で正)。`docs/wiki/` を更新すれば自動連動する。
- `astro.config.mjs` の `PAGES` 配列は手動メンテ。新規ページ追加時にここへ登録しないと **sidebar に新ページが表示されない**。`Agents-Doc.md` は wiki に存在するが PAGES 未登録 = 致命的漏れ。

### 2.3 漏れ箇所一覧 (区分 a = 修正必須)

| # | ファイル | 行 | 現状 (抜粋) | 期待 |
|---|----------|----|-------------|------|
| 1 | `site/src/content/docs/en/index.mdx` | L24 | `## Meet the 29 Agents across 4 Flows` | `## Meet the 39 Agents across 5 Flows` |
| 2 | `site/src/content/docs/en/index.mdx` | L28 | `4 top-level orchestrators: discovery-flow, delivery-flow, operations-flow, maintenance-flow.` | `5 top-level orchestrators: discovery-flow, delivery-flow, operations-flow, maintenance-flow, doc-flow.` |
| 3 | `site/src/content/docs/en/index.mdx` | L43-46 (Maintenance card 後) | Doc Domain card なし | Doc Domain card を追加 (7 agents: 1 orchestrator + 6 authors, link `/en/agents-doc/`) |
| 4 | `site/src/content/docs/en/index.mdx` | L47-50 (Safety & Standalone) | `sandbox-runner for isolated execution, plus analyst and codebase-analyzer for standalone use.` | `sandbox-runner for isolated execution, doc-reviewer for cross-cutting consistency review, plus analyst and codebase-analyzer for standalone use.` |
| 5 | `site/src/content/docs/en/index.mdx` | L68 | `All 29 agents — split by domain (Orchestrators, Discovery, Delivery, Operations, Maintenance)` | `All 39 agents — split by domain (Orchestrators, Discovery, Delivery, Operations, Maintenance, Doc)` |
| 6 | `site/src/content/docs/en/index.mdx` | L1-3 (frontmatter) / L6 (hero tagline) | `Discovery, Delivery, Operations in three independent domains.` / 同様 | Doc / Maintenance を含む文言に更新 (narrative) |
| 7 | `site/src/content/docs/ja/index.mdx` | L24 | `## 29 エージェント × 4 フロー` | `## 39 エージェント × 5 フロー` |
| 8 | `site/src/content/docs/ja/index.mdx` | L28 | `4 つの Flow Orchestrator: discovery-flow, delivery-flow, operations-flow, maintenance-flow。` | `5 つの Flow Orchestrator: ... + doc-flow。` |
| 9 | `site/src/content/docs/ja/index.mdx` | L43-46 | Doc Domain card なし | 追加 (7 エージェント, doc-flow + 6 author) |
| 10 | `site/src/content/docs/ja/index.mdx` | L47-50 | Safety / Standalone に doc-reviewer なし | 追加 |
| 11 | `site/src/content/docs/ja/index.mdx` | L69 | `29 エージェント全ての責務・入出力・NEXT 条件 — ドメイン別 5 ページに分割（Orchestrators・Discovery・Delivery・Operations・Maintenance）` | `39 エージェント全ての責務・入出力・NEXT 条件 — ドメイン別 6 ページに分割（Orchestrators・Discovery・Delivery・Operations・Maintenance・Doc）` |
| 12 | `site/src/content/docs/ja/index.mdx` | L1-3 / L6 | `Discovery / Delivery / Operations の 3 ドメイン構成。` 等 | Doc / Maintenance 反映 (narrative) |
| 13 | `README.md` | L70 | `- [Agents Reference](docs/wiki/en/Agents-Orchestrators.md) — all 32 agents` | `... — all 39 agents` |
| 14 | `README.ja.md` | L70 | `- [Agents Reference](docs/wiki/ja/Agents-Orchestrators.md) — 全 32 エージェント` | `... — 全 39 エージェント` |
| 15 | `docs/wiki/en/Home.md` | L26 | `\| — \| [Rules Reference](./Rules-Reference.md): 9 behavior rules with scope and customization notes \|` | `12 behavior rules` |
| 16 | `docs/wiki/en/Home.md` | L41 | `\| [Rules Reference](./Rules-Reference.md) \| All 9 behavior rules: scope, auto-load, interactions \| Agent developers \|` | `All 12 behavior rules` |
| 17 | `docs/wiki/ja/Home.md` | L27 | `\| — \| [Rules Reference](./Rules-Reference.md): 9 つの行動ルールのスコープとカスタマイズ方法 \|` | `12 つの行動ルール` |
| 18 | `docs/wiki/ja/Home.md` | L42 | `\| [Rules Reference](./Rules-Reference.md) \| 9 つの行動ルール: スコープ・自動ロード・相互関係 \| エージェント開発者 \|` | `12 つの行動ルール` |
| 19 | `site/astro.config.mjs` | L29-35 (`Agents Reference` group の `items`) | Maintenance leaf までで終わり | `{ slug: 'agents-doc', labelEn: 'Doc Domain', labelJa: 'Doc Domain' }` を Maintenance の後に追加 |
| 20 | `CHANGELOG.md` `[Unreleased]` `### Added` | - | doc-flow (#54) / doc-reviewer (#91) / Agents-Doc.md / agents-39 badge (#101) / agent count 32→39 のエントリなし | Added エントリを追加 |

### 2.4 problematic だが触らない箇所 (b/c 区分)

- `site/src/content/docs/{en,ja}/home.md` (L25, L40 で "29 / 5 pages") — sync-wiki.mjs 上書き対象、`docs/wiki/{en,ja}/Home.md` が正なら次回 build で自動修正される。本 PR では触らない。
- `site/src/content/docs/{en,ja}/rules-reference.md` (frontmatter / L3 / L7 / L10 で "11 rules") — 同上、wiki 側を直せば連動。本 PR では触らない (ただし wiki/Rules-Reference.md は別 PR の TODO; #82 で 12 個目 `denial-categories` 追加されたが Rules-Reference.md 本体は未確認)。これは別 audit 対象 → §7 Open question Q3 で記録。
- `site/src/content/docs/{en,ja}/getting-started.md` — 同上、wiki 側は doc-flow を含む新 table が反映済みなので、build で自動更新される。
- `archived/` 配下 — 履歴保存。
- commit message / git log の数値出現 — 履歴の真実 (触らない)。
- `docs/wiki/{en,ja}/Architecture-Domain-Model.md` L94/97 「主パイプラインから独立した第 4 のフロー」 — Maintenance 単独説明の文脈で正しい (Doc は第 5、別 paragraph)。

## 3. Constraints

- **Bilingual sync**: `language-rules.md` §3.2 (Repo-root README sync convention) により、README.md と README.ja.md は同 PR で同時更新必須。同様に wiki/{en,ja}/Home.md も Bilingual Sync Policy で同 PR 必須。site/ の index.mdx も両言語同時更新。
- **`scripts/check-readme-wiki-sync.sh` Check 1/2/3 を破壊しない**:
  - Check 1 (agent count parity): README.md L3 / README.ja.md L3 / wiki/{en,ja}/Home.md の "39" は変更しない。L70 のみ修正。
  - Check 2 (slash command parity): `aphelion-help.md` と `wiki/en/Getting-Started.md` の command list は既に doc-flow 含む状態で一致。本 PR では触らない。
  - Check 3 (README heading parity): L70 の修正は heading 行ではなく list item なので影響なし。
- **astro build 確認**: `astro.config.mjs` 変更時は `cd site && npm run build` (または `node ../scripts/sync-wiki.mjs && npx astro build`) でエラーが出ないことを確認推奨。Cloudflare Pages CI でも検出可能なので、ローカル不可時はそちらに委ねる。
- **canonical 範囲外の純 doc 修正のため `package.json` version bump 不要**: 本 PR は `.claude/agents/` / `src/.claude/rules/` / `.claude/commands/` / `.claude/orchestrator-rules.md` のいずれも変更しない (`docs/wiki/`, `site/`, `README*.md`, `CHANGELOG.md`, `astro.config.mjs` のみ)。Contributing.md の version-bump policy 該当外。

## 4. Success criteria

- [ ] §2.3 の漏れ箇所 (#1〜#20) が全て修正されている。
- [ ] `bash scripts/check-readme-wiki-sync.sh` が exit 0 で pass。
- [ ] `cd site && npm run build` が成功 (sidebar に Agents-Doc が登録され、ローカルで `/en/agents-doc/` が解決される)。リソース不足時は CI / Cloudflare Pages のビルド結果で代替。
- [ ] index.mdx の en/ja 両言語を同 PR 内で同時更新。
- [ ] `docs/wiki/en/Home.md` と `docs/wiki/ja/Home.md` の rules count を同 PR で同時更新。
- [ ] CHANGELOG.md `[Unreleased]` に doc-flow / doc-reviewer / Agents-Doc / badge / agent count bump のエントリが追加されている。

## 5. Approach

PR 1 つで全漏れを同時修復する。`architect` をスキップ可能 (純粋な sync fixup で構造変更なし)。

推奨 commit 分割:

1. **`docs: refresh README agent count from 32 to 39 in body links (#91/#54 follow-up)`**
   - README.md L70 / README.ja.md L70 を 39 に修正。
2. **`docs(wiki): bump Home.md rule count from 9 to 12 (catch-up to denial-categories #31 + localization-dictionary)`**
   - wiki/en/Home.md L26 / L41 と wiki/ja/Home.md L27 / L42 を 12 に修正。Last updated を 2026-04-30 に更新し、Update history に行追加。
3. **`docs(site): refresh index.mdx landing pages for 39 agents / 5 flows / Doc domain (#54/#91 follow-up)`**
   - site/src/content/docs/en/index.mdx を §2.3 #1-6 に従い更新。
   - site/src/content/docs/ja/index.mdx を §2.3 #7-12 に従い更新 (bilingual)。
4. **`chore(site): register Agents-Doc page in astro.config.mjs PAGES array (#54 follow-up)`**
   - PAGES の `Agents Reference` group `items` に Doc leaf を Maintenance の後に追加。
5. **`docs: backfill CHANGELOG Unreleased with doc-flow / doc-reviewer / Agents-Doc / agents-39 badge entries (#54/#91/#101)`**
   - `[Unreleased]` の `### Added` / `### Changed` に該当エントリを追加。

PR title 案: `docs: audit-fix outdated agent count / domain references across wiki landing and site/`

## 6. Document changes

### 6.1 site/src/content/docs/en/index.mdx (修正後の主要 diff 仕様)

```mdx
---
title: Aphelion
description: AI coding agent workflow for Claude Code — Discovery, Delivery, Operations, Maintenance, and on-demand Doc generation.
template: splash
hero:
  tagline: AI coding agents for the full project lifecycle — Discovery, Delivery, Operations, Maintenance, and Doc.
  ...

## Meet the 39 Agents across 5 Flows

<CardGrid>
  <Card title="Flow Orchestrators" icon="rocket">
    5 top-level orchestrators: discovery-flow, delivery-flow, operations-flow, maintenance-flow, doc-flow.
    [→ Orchestrators & Cross-Cutting](/en/agents-orchestrators/)
  </Card>
  <Card title="Discovery Domain" icon="magnifier"> ... </Card>
  <Card title="Delivery Domain" icon="puzzle"> ... </Card>
  <Card title="Operations Domain" icon="laptop"> ... </Card>
  <Card title="Maintenance Domain" icon="pencil"> ... </Card>
  <Card title="Doc Domain" icon="document">
    7 agents (1 orchestrator + 6 authors: hld-author, lld-author, api-reference-author, ops-manual-author, user-manual-author, handover-author) that generate customer-deliverable docs on demand.
    [→ Doc Domain](/en/agents-doc/)
  </Card>
  <Card title="Safety & Standalone" icon="approve-check">
    sandbox-runner for isolated execution, doc-reviewer for cross-cutting consistency review, plus analyst and codebase-analyzer for standalone use.
    [→ Orchestrators & Cross-Cutting](/en/agents-orchestrators/)
  </Card>
</CardGrid>

## Explore the Documentation
...
  <Card title="Agents Reference" icon="open-book">
    All 39 agents — split by domain (Orchestrators, Discovery, Delivery, Operations, Maintenance, Doc) with responsibilities, inputs, outputs, and NEXT conditions.
    ...
  </Card>
```

ja 版は narrative を ja に翻訳しつつ同構造。

### 6.2 site/astro.config.mjs (PAGES `Agents Reference` group)

```js
{
  groupEn: 'Agents Reference',
  groupJa: 'Agents Reference',
  items: [
    { slug: 'agents-orchestrators', labelEn: 'Orchestrators & Cross-Cutting', labelJa: 'Orchestrators & Cross-Cutting' },
    { slug: 'agents-discovery',     labelEn: 'Discovery Domain',              labelJa: 'Discovery Domain'              },
    { slug: 'agents-delivery',      labelEn: 'Delivery Domain',               labelJa: 'Delivery Domain'               },
    { slug: 'agents-operations',    labelEn: 'Operations Domain',             labelJa: 'Operations Domain'             },
    { slug: 'agents-maintenance',   labelEn: 'Maintenance Domain',            labelJa: 'Maintenance Domain'            },
    { slug: 'agents-doc',           labelEn: 'Doc Domain',                    labelJa: 'Doc Domain'                    },
  ],
},
```

### 6.3 README.md / README.ja.md L70

```diff
-- [Agents Reference](docs/wiki/en/Agents-Orchestrators.md) — all 32 agents
++ [Agents Reference](docs/wiki/en/Agents-Orchestrators.md) — all 39 agents
```

```diff
-- [Agents Reference](docs/wiki/ja/Agents-Orchestrators.md) — 全 32 エージェント
++ [Agents Reference](docs/wiki/ja/Agents-Orchestrators.md) — 全 39 エージェント
```

### 6.4 docs/wiki/en/Home.md / docs/wiki/ja/Home.md

- en L26: `9 behavior rules` → `12 behavior rules`
- en L41: `All 9 behavior rules` → `All 12 behavior rules`
- ja L27: `9 つの行動ルール` → `12 つの行動ルール`
- ja L42: `9 つの行動ルール` → `12 つの行動ルール`
- 両ファイルとも `Last updated` を `2026-04-30` に更新し、`Update history` に
  `> - 2026-04-30: bump rule count 9 → 12 (catch-up to denial-categories #31 / localization-dictionary)` を追加。

### 6.5 CHANGELOG.md `[Unreleased]` 追加エントリ (時系列順)

```markdown
### Added

- New 5th flow `/doc-flow` (doc-flow orchestrator) generating customer-deliverable
  docs (HLD / LLD / API reference / ops manual / user manual / handover). Six new
  author agents (`hld-author`, `lld-author`, `api-reference-author`,
  `ops-manual-author`, `user-manual-author`, `handover-author`) and the new
  `Agents-Doc.md` wiki page document the flow. (#54)
- `doc-reviewer` cross-cutting agent for post-flow doc consistency review.
  Auto-inserted by orchestrators per `orchestrator-rules.md` triggers. (#91)
- `docs/wiki/{en,ja}/Agents-Doc.md` — 6th Agents Reference page covering Doc
  domain agents (5 → 6 pages). (#54)
- README badges (agents-39 / commands-14 / rules-12 / license-MIT) plus a
  Cloudflare Pages "Wiki" badge linking to https://aphelion-agents.com/. (#101)

### Changed

- Agent count bumped 31 → 32 (#91 doc-reviewer) → 39 (#54 doc-flow + 6 authors).
  Reflected in README.md / README.ja.md body, `aphelion-overview.md`, and
  `docs/wiki/{en,ja}/Home.md`. (#54 / #91)
- `docs/wiki/{en,ja}/Home.md` rule count corrected 9 → 12 to match the actual
  files in `src/.claude/rules/` (catch-up after `denial-categories` #31 and
  the addition of `localization-dictionary`). (this PR)
- `site/src/content/docs/{en,ja}/index.mdx` (Cloudflare Pages landing pages)
  refreshed for 39 agents / 5 flows / Doc domain card / doc-reviewer mention.
  (this PR)
- `site/astro.config.mjs` PAGES array: `Agents Reference` group now lists
  `agents-doc` so the Doc domain page appears in the wiki sidebar. (this PR)
```

## 7. Open questions

- **Q1 (analyst 推奨で確定)**: `package.json` version bump (0.3.4 → 0.3.5) は本 PR に**含めない**。本 PR は `.claude/**` 直下の canonical を一切触らないため、Contributing.md の version-bump policy に該当しない。npx 利用者への影響なし。
- **Q2 (analyst 推奨で確定)**: `astro.config.mjs` の Doc leaf 挿入位置は `Maintenance` の直後 (`docs/wiki/Home.md` の列挙順と整合)。
- **Q3 (別 audit へ)**: `docs/wiki/{en,ja}/Rules-Reference.md` 本体が 11 rules entries のままか 12 か未確認 (今回 site/rules-reference.md は frontmatter で "11 rules" と表示)。`localization-dictionary.md` のエントリが Rules-Reference.md にあるか別 PR で audit する。本 PR の scope 外。
- **Q4 (developer に判断委ね)**: site/index.mdx の Doc Domain card に使う Starlight icon。CardGrid の他 card は `rocket / magnifier / puzzle / laptop / pencil / approve-check` を使用。Doc は `document` または `seti:notebook` 等が候補。Starlight v0.38 の利用可能 icon は `@astrojs/starlight/components` 仕様参照。失敗時はテキストのみ表示で実害なし。

## 8. Handoff

- **HANDOFF_TO**: developer (architect skip — 純粋な sync fixup, 構造変更なし)
- **推奨ブランチ名**: `docs/wiki-and-site-update-audit` (developer の Branch Naming で `docs/` prefix 採用、または既定の `feat/` でも可)
- **推奨 PR 構成**: 1 PR / 5 commits (§5 参照)
- **検証コマンド**:
  - `bash scripts/check-readme-wiki-sync.sh && echo PASS`
  - `cd site && npm run build` (任意; Cloudflare Pages CI で代替可)
- **PR body 必須**:
  - `Closes #<issue-number>`
  - `Linked Plan: docs/design-notes/wiki-and-site-update-audit.md`
- **GitHub issue 作成後、本 design-note の `> GitHub Issue: TBD` を `> GitHub Issue: [#N](URL)` に更新する** (analyst 責務)。
