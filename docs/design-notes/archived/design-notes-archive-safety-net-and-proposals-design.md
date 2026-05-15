> Last updated: 2026-05-11
> GitHub Issue: [#118](https://github.com/kirin0198/aphelion-agents/issues/118)
> Linked Plan: docs/design-notes/design-notes-archive-safety-net-and-proposals.md
> Designed by: architect (2026-05-11)
> Next: developer

# Design: design-notes archive safety net + README 整備 + proposals/ 新設

本書は Issue [#118](https://github.com/kirin0198/aphelion-agents/issues/118)
(Planning doc:
[design-notes-archive-safety-net-and-proposals.md](./design-notes-archive-safety-net-and-proposals.md))
の architect フェーズ設計書である。

3 つの独立コンポーネント:

- **A.** archive 自動化の safety net (新規 cron workflow `archive-orphan-plans.yml`)
- **B.** `docs/design-notes/README.md` (active 側ガイド) の新設
- **C.** `docs/design-notes/proposals/` ディレクトリ新設

を 1 つの設計書としてまとめる (実装は PR を分割)。

---

## §1 アーキテクチャ概要

### 1.1 既存 `archive-closed-plans.yml` の gap 分析

planning doc §2.2 で列挙された取りこぼしパターンに対する責務分担:

| パターン | 既存 workflow の振る舞い | 新設 cron workflow の責務 |
|----------|--------------------------|--------------------------|
| PR body に `Closes #N` 書き忘れ | 発火するが planning doc にマッチしない → no-op で放置 | cron で issue state を確認し close 済みなら移動 |
| Issue を PR 無しで直接 close (Won't fix 等) | そもそも発火しない (`pull_request` トリガのみ) | cron で救済 |
| PR を merge せず close | PR open 時点で移動済 → 手動巻き戻し必要 | この gap は cron では救えない (planning doc も "documented edge case" と認めている)。本設計でも対象外 |
| 1 issue ↔ 複数 design-note | break せず両方 move する (修正済 #112) | 同じロジックを cron 側でも採用 |

→ 新設 workflow は **「現在 active で、紐づく issue が closed の planning doc」**
だけを救済する。既存 workflow を一切変更せず、role-of-last-resort として動く。

### 1.2 全体図

```
                         ┌─────────────────────────┐
                         │ PR open / edit / sync   │ ──▶ archive-closed-plans.yml
                         │ (existing, untouched)   │      (reactive, PR-driven)
                         └─────────────────────────┘
                                      │
                                      │ misses some cases
                                      ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Weekly cron (Mon 03:00 UTC) + workflow_dispatch         │
   │ ──▶ archive-orphan-plans.yml (new)                      │
   │     1. Glob docs/design-notes/*.md (active only)        │
   │     2. Extract `> GitHub Issue: [#N](...)` header       │
   │     3. gh issue view N --json state                     │
   │     4. If closed → git mv to archived/                  │
   │     5. Open ONE PR per run with all moves               │
   └─────────────────────────────────────────────────────────┘

   docs/design-notes/
     ├── README.md            ← NEW (B): active-side guide
     ├── *.md                 ← active planning docs
     ├── proposals/           ← NEW (C): issue-less ideas
     │    ├── README.md       ← NEW: usage rules
     │    ├── .gitkeep
     │    └── <slug>.md       ← ad-hoc proposals
     └── archived/
          ├── README.md       ← updated to cross-link to active README
          └── *.md
```

### 1.3 設計原則

1. **既存 workflow を変更しない** — `archive-closed-plans.yml` には触れない。
   bug が無いものを壊さない。
2. **fail-open** — cron workflow が失敗しても planning doc は失われない
   (read → git mv → PR の順、PR は人間が merge して初めて反映)。
3. **1 run = 1 PR** — 複数ファイルを一度に処理する場合でも単一 PR にまとめる。
4. **proposals/ は完全 opt-in** — 既存ユーザーには空ディレクトリと .gitkeep の
   みが見える。何も書かなくても何も壊れない。

---

## §2 変更対象ファイル一覧

### 2.1 新規追加

| Path | Action | 内容概要 |
|------|--------|----------|
| `.github/workflows/archive-orphan-plans.yml` | ✏ new | cron + workflow_dispatch trigger。詳細 §3.1 |
| `docs/design-notes/README.md` | ✏ new | active 側ガイド。詳細 §3.2 |
| `docs/design-notes/proposals/` | ✏ new dir | (空ディレクトリ。.gitkeep のみ) |
| `docs/design-notes/proposals/.gitkeep` | ✏ new | 空ファイル |
| `docs/design-notes/proposals/README.md` | ✏ new | proposals 運用ルール。詳細 §3.3 |

### 2.2 修正

| Path | Action | 内容概要 |
|------|--------|----------|
| `docs/design-notes/archived/README.md` | 📝 | active 側 README (`../README.md`) と proposals/ への相互リンクを追加。"docs/issues/" という古い表記が残っていないか確認 (現状 line 15, 21, 44, 47 に "docs/issues/" 表記があるので "docs/design-notes/" に統一する) |
| `.claude/agents/doc-reviewer.md` | 📝 | `Inputs > Read Order` の design-notes 行に proposals/ 除外を明記 |
| `.claude/agents/handover-author.md` | 📝 | `Design notes scope:` 注記に proposals/ 除外を追加 |
| `.claude/agents/analyst.md` | 📝 | (任意) proposals/ から planning doc への昇格フローを 1 段落追記 |
| `docs/wiki/en/Contributing.md` | 📝 | design-notes / proposals / archived のライフサイクル節を追加 (Wiki English canonical) |
| `docs/wiki/ja/Contributing.md` | 📝 | EN と同じ内容を Same-PR sync で追加 |
| `CHANGELOG.md` | 📝 | "Added: weekly safety-net workflow that archives planning docs whose linked GitHub issue is closed. Added: docs/design-notes/README.md and docs/design-notes/proposals/." を追記 |

### 2.3 変更しない (重要)

| Path | 理由 |
|------|------|
| `.github/workflows/archive-closed-plans.yml` | reactive 側は壊れていない。新 cron は別 workflow で追加するだけ |
| `docs/design-notes/archived/` の既存ファイル | 過去 archive はそのまま |
| 既存の planning doc (`*.md` directly under design-notes/) | 何も移動しない |

---

## §3 変更内容の詳細

### 3.1 `archive-orphan-plans.yml` の仕様

```yaml
name: Archive orphaned planning docs

# Safety-net for the PR-driven `archive-closed-plans.yml`. This workflow
# runs weekly and on-demand, scanning ACTIVE planning docs (i.e. not yet
# under docs/design-notes/archived/). For each one, it extracts the
# referenced GitHub issue number, queries the issue state via gh CLI,
# and if the issue is CLOSED it stages a `git mv` into archived/.
#
# When at least one file is staged, the workflow opens ONE pull request
# containing all the moves (never one PR per file).
#
# Edge cases:
#   - No matching files → no PR, exit 0.
#   - Issue lookup fails (rate-limit, network, deleted issue) → skip
#     that file and log a warning; do not fail the run.
#   - planning doc with no `> GitHub Issue:` header → skip (these are
#     either proposals/ candidates or hand-authored evergreen notes).

on:
  schedule:
    - cron: '0 3 * * 1'   # Mon 03:00 UTC (weekly, low-traffic)
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Scan only, do not create PR'
        type: boolean
        default: false

# Single run at a time. Avoid race vs the PR-driven workflow.
concurrency:
  group: archive-orphan-plans
  cancel-in-progress: false

permissions:
  contents: write
  issues: read
  pull-requests: write

jobs:
  scan-and-archive:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout main
        uses: actions/checkout@v6
        with:
          ref: main
          fetch-depth: 0
          persist-credentials: true

      - name: Configure git
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Scan and stage moves
        id: scan
        env:
          GH_TOKEN: ${{ github.token }}
          DRY_RUN: ${{ inputs.dry_run }}
        shell: bash
        run: |
          set -euo pipefail
          moved=()
          warnings=()

          shopt -s nullglob
          for f in docs/design-notes/*.md; do
            [ -f "$f" ] || continue
            # Skip files that intentionally have no issue (rare but valid).
            issue_ref=$(head -n 20 "$f" \
              | grep -oiE 'GitHub Issue:\s*\[?#[0-9]+' \
              | grep -oE '#[0-9]+' \
              | tr -d '#' \
              | head -n1 || true)
            if [ -z "${issue_ref}" ]; then
              continue
            fi

            # Query issue state. On API failure, warn and continue.
            state=$(gh issue view "${issue_ref}" --json state --jq .state 2>/dev/null || echo "")
            if [ -z "${state}" ]; then
              warnings+=("$(basename "$f"):#${issue_ref}: lookup_failed")
              continue
            fi

            if [ "${state}" = "CLOSED" ]; then
              target="docs/design-notes/archived/$(basename "$f")"
              if [ "${DRY_RUN}" = "true" ]; then
                echo "DRY-RUN would move: $f -> $target"
              else
                git mv "$f" "$target"
                echo "archived: $f -> $target (issue #${issue_ref})"
              fi
              moved+=("$(basename "$f" .md):#${issue_ref}")
            fi
          done

          {
            if [ ${#moved[@]} -gt 0 ]; then
              echo "moved=$(IFS=,; echo "${moved[*]}")"
            else
              echo "moved="
            fi
            if [ ${#warnings[@]} -gt 0 ]; then
              echo "warnings=$(IFS=';'; echo "${warnings[*]}")"
            else
              echo "warnings="
            fi
          } >> "$GITHUB_OUTPUT"

      - name: Create archive PR
        if: steps.scan.outputs.moved != '' && inputs.dry_run != true
        env:
          GH_TOKEN: ${{ github.token }}
          MOVED: ${{ steps.scan.outputs.moved }}
          WARNINGS: ${{ steps.scan.outputs.warnings }}
        shell: bash
        run: |
          set -euo pipefail
          branch="chore/archive-orphan-plans-$(date -u +%Y%m%d)"
          git checkout -b "${branch}"

          moved_list=$(printf '%s\n' "$MOVED" | tr ',' '\n')
          warn_block=""
          if [ -n "${WARNINGS}" ]; then
            warn_block=$'\n\n## Warnings (skipped, not archived)\n\n'$(printf '%s\n' "$WARNINGS" | tr ';' '\n' | sed 's/^/- /')
          fi

          git commit -am "$(printf 'chore: archive orphaned planning docs\n\nAuto-generated by archive-orphan-plans.yml (weekly safety net).\nThese planning docs reference GitHub issues that are now CLOSED but were\nnot caught by archive-closed-plans.yml at PR-merge time (e.g. PR body\nlacked Closes #N, or the issue was closed without a PR).\n\nMoved (slug:issue):\n%s%s\n' "$moved_list" "$warn_block")"

          git push -u origin "${branch}"
          gh pr create \
            --base main \
            --title "chore: archive orphaned planning docs" \
            --label "chore,automated" \
            --body "$(cat <<'EOF'
## Summary

Automated safety-net archive. The following active planning docs reference
GitHub issues that are now **closed**; they were not caught by the
PR-driven `archive-closed-plans.yml` workflow (e.g. PR body lacked
`Closes #N`, or the issue was closed without a PR).

EOF
)$(printf '\n%s\n' "$moved_list" | sed 's/^/- /')$warn_block

## Verification

- [ ] Each moved file was indeed referenced by a CLOSED issue.
- [ ] No file under archived/ is being moved a second time.
- [ ] No file needs to be moved back (e.g. issue reopened).

Generated by `.github/workflows/archive-orphan-plans.yml`."
```

#### 3.1.1 主要パラメータ

| 項目 | 値 | 根拠 |
|------|----|------|
| トリガ | `schedule: '0 3 * * 1'` + `workflow_dispatch` | planning doc §3.2 で「週次」「`cron: '0 3 * * 1'`」が推奨されている |
| dry-run | `workflow_dispatch` inputs に `dry_run: bool` | 運用前の動作確認用。cron からは常に false |
| permissions | `contents: write` / `issues: read` / `pull-requests: write` | planning doc §8 と一致 |
| concurrency group | `archive-orphan-plans` (cancel-in-progress: false) | 同時実行禁止。PR 起点 workflow とは別 group なので race しない |
| label | `chore, automated` | planning doc §3.1 と一致 |
| 1 run = 1 PR | 全 git mv を 1 コミット 1 PR に集約 | planning doc Acceptance Criteria 3 |
| 失敗ハンドリング | `gh issue view` の失敗は warning 化、workflow 自体は exit 0 で続行 | fail-open 原則 |
| ロック宛先 | `main` ブランチを base に新ブランチ作成 | 通常の chore PR と同じ |

#### 3.1.2 既存 `archive-closed-plans.yml` との非干渉性検証

| 観点 | 結果 |
|------|------|
| トリガが重ならないか | reactive は `pull_request`、新規は `schedule + workflow_dispatch` → 独立 |
| 同じファイルを同時に処理しないか | 新規は main の HEAD を読む → reactive が PR branch でやった `git mv` は merge 後に main に反映される。新規 workflow が main で実行されるため重複対象は存在しない |
| Bot ループ | 新規 workflow は main branch に対して PR を作る。`actor != github-actions[bot]` のフィルタは reactive 側にしか効かないが、新規が作る PR が再度新規をトリガすることはない (cron + dispatch のみ) |
| 冪等性 | archived/ に既に移動済みのものは Glob `docs/design-notes/*.md` に出てこないので no-op |

### 3.2 `docs/design-notes/README.md` の内容

```markdown
# Planning Documents (active)

Working planning documents produced during the analyst phase of the
Aphelion workflow. Each file here is tied to a GitHub issue that is still
**open**. Once the issue closes (typically when the corresponding PR
merges), the file is moved into `archived/` automatically.

For closed/historical notes, see [`archived/README.md`](./archived/README.md).
For ideas that have NOT been promoted to a GitHub issue yet, see
[`proposals/README.md`](./proposals/README.md).

## Header convention

Every planning doc directly under this directory MUST start with the
following frontmatter-style header (the comment-quoted block at the very
top of the file):

```markdown
> Last updated: <YYYY-MM-DD>
> GitHub Issue: [#N](<URL>)
> Analyzed by: analyst (<YYYY-MM-DD>)
> Next: <architect | developer | TBD>
```

The `> GitHub Issue: [#N](...)` line is **required** so that the archive
automation can match the file to its issue. If you write a planning doc
without a backing issue, place it under `proposals/` instead.

## Lifecycle

```
docs/design-notes/proposals/<slug>.md     (idea, no issue)
              │
              │ analyst promotes the idea, creates a GitHub issue
              ▼
docs/design-notes/<slug>.md               (active planning doc, this directory)
              │
              │ PR merges with `Closes #N` body  (reactive path)
              │   .github/workflows/archive-closed-plans.yml
              │   moves file inside the merging PR
              │ ─── OR ───
              │ weekly cron finds the linked issue is CLOSED
              │   .github/workflows/archive-orphan-plans.yml
              │   opens a separate "chore: archive orphaned" PR
              ▼
docs/design-notes/archived/<slug>.md      (historical record)
```

## Manual fallback

If neither automated path moved the file (rare; e.g. the issue has no
backing PR and the cron has not yet run), archive manually:

```bash
git mv docs/design-notes/<slug>.md docs/design-notes/archived/
git commit -m "chore: archive <slug> manually"
```

## What does NOT belong here

- Closed-issue planning docs → see `archived/`.
- Issue-less ideas / drafts → see `proposals/`.
- Evergreen reference material (architecture overviews, glossaries) →
  see `docs/wiki/`.
- Customer-facing deliverables → see `docs/deliverables/{slug}/`.

## Cross-references

- [`archived/README.md`](./archived/README.md) — historical planning docs
- [`proposals/README.md`](./proposals/README.md) — pre-issue idea staging
- `docs/wiki/en/Contributing.md` — PR checklist incl. archive policy
- `.github/workflows/archive-closed-plans.yml` — reactive archive
- `.github/workflows/archive-orphan-plans.yml` — weekly safety net
```

### 3.3 `docs/design-notes/proposals/README.md` の内容

```markdown
# Proposals

Pre-issue ideas and exploration notes. Files here are intentionally
**not** tied to a GitHub issue. They exist to give contributors a place
to draft a problem statement before deciding whether it merits a real
planning doc + issue.

## Header convention

Proposals do NOT use the same header as planning docs. Use the following
instead (the `> GitHub Issue:` line is deliberately absent):

```markdown
> Status: proposal
> Author: <name or handle>
> Created: <YYYY-MM-DD>
> Last updated: <YYYY-MM-DD>
```

## Lifecycle

1. **Draft** — write `proposals/<slug>.md` with whatever level of detail
   you have. No PR template, no review gate.
2. **Promote** — once the proposal is ready to act on, an analyst:
   - opens a GitHub issue,
   - moves the file to `docs/design-notes/<slug>.md` (or rewrites it
     from scratch using the analyst design-note template),
   - replaces the `> Status: proposal` header block with the standard
     `> GitHub Issue: [#N](...)` block.
3. **Reject / pending** — leave the file in place. If the project has
   accumulated rejected proposals, consider moving them to
   `proposals/archived/` (deferred; see §5).

## Out of scope for automation

- `proposals/*.md` are **excluded** from `archive-closed-plans.yml`
  (they have no issue number to match) and from
  `archive-orphan-plans.yml` (the cron only walks
  `docs/design-notes/*.md` one level deep).
- Aphelion agents (`doc-reviewer`, `handover-author`, ...) do NOT read
  files under `proposals/`. They are human-facing scratch space.

## Cross-references

- [`../README.md`](../README.md) — active planning docs
- [`../archived/README.md`](../archived/README.md) — closed planning docs
```

### 3.4 agent 定義の修正

#### 3.4.1 `.claude/agents/doc-reviewer.md`

`## Inputs` → `### Read Order (priority)` の項目 6 を以下に変更:

before:
```
6. `docs/design-notes/<slug>.md`
   - **Inclusion condition:** header contains `> Next: developer` or `> Next: architect`
   - **Excluded:** files under `docs/design-notes/archived/`, drafts with `> Next: TBD` / `> Next: (none)`
```

after:
```
6. `docs/design-notes/<slug>.md` (one level deep only — use `Glob("docs/design-notes/*.md")`)
   - **Inclusion condition:** header contains `> Next: developer` or `> Next: architect`
   - **Excluded:**
     - files under `docs/design-notes/archived/` (closed planning docs)
     - files under `docs/design-notes/proposals/` (pre-issue ideas, no `> GitHub Issue:` header)
     - drafts with `> Next: TBD` / `> Next: (none)`
```

#### 3.4.2 `.claude/agents/handover-author.md`

`**Design notes scope:**` 段落 (L46-) を以下に変更:

before:
```
**Design notes scope:** Read only `docs/design-notes/*.md` directly (not
`docs/design-notes/archived/`). MVP does not process archived notes.
```

after:
```
**Design notes scope:** Read only `docs/design-notes/*.md` (one level deep).
Exclude:
- `docs/design-notes/archived/` (MVP does not process archived notes)
- `docs/design-notes/proposals/` (pre-issue idea staging; not part of the
  formal design-decision history)

Use `Glob("docs/design-notes/*.md")` (one-level glob); do NOT use
`docs/design-notes/**` recursive globs.
```

§ Step 2 内の "Design notes reading strategy" にも同じ exclusion を反映する。

#### 3.4.3 `.claude/agents/analyst.md` (任意)

「Step A: Minimum intake questions」 前に 1 段落追加:

```
### Promotion from proposals/

If the issue intake originated from a file under
`docs/design-notes/proposals/<slug>.md`, treat that file as input
material:
1. Read it before opening the intake question.
2. After Step D (`gh issue create`), `git mv` the proposals file to
   `docs/design-notes/<slug>.md`, then overwrite the header block with
   the standard planning-doc header.
3. Mention the promoted source file in the GitHub issue body's `Linked
   Plan:` line.

This step is optional — analyst may also produce a planning doc from
scratch without consulting any proposals file.
```

### 3.5 `archived/README.md` の修正

planning doc §3.2 で指摘されたとおり「active 側 README からの参照を追加」する。
また現在の archived/README.md には古い `docs/issues/` 表記が残っているので
`docs/design-notes/` に統一する (line 15, 21, 44, 47)。

冒頭に追加する 1 段落:

```markdown
> For active planning docs (issue still open), see
> [`../README.md`](../README.md).
> For issue-less ideas, see [`../proposals/README.md`](../proposals/README.md).
```

---

## §4 後方互換戦略の具体的実装方針

| 観点 | 戦略 |
|------|------|
| 既存 `archive-closed-plans.yml` の挙動 | **無変更**。reactive 側は壊さない |
| 既存 archived ファイル | 触らない |
| 既存 active planning doc (issue open のもの) | cron は issue state を見るので OPEN なら no-op |
| 既存 active planning doc (issue が既に closed のもの) | 初回 cron 実行時に 1 PR で集中 archive される。これは「設計通り」だが運用上いきなり多数ファイル移動する可能性があるので、**最初は `workflow_dispatch --dry_run=true` で確認することを README に明記** |
| proposals/ 配下を後付け運用に変更したいユーザー | opt-in。ディレクトリ作成と README が入るだけで既存運用に影響なし |
| GHE / fork PR | 既存 reactive は fork PR を skip 済。新 cron は scheduled で main で実行されるため fork は関係ない |
| 既存 wiki / contributing 文書の用語 | "docs/issues/" 表記の古い記述を全部 `docs/design-notes/` に揃える |

---

## §5 テスト戦略

aphelion-agents は workflow をリポジトリ自体に持つので、テストは
**手動シナリオ + dry-run mode + CI dry-validation** の 3 段構え。

### 5.1 dry-run mode (mandatory)

`workflow_dispatch` の input `dry_run: true` で起動できる。

```
GitHub UI → Actions → "Archive orphaned planning docs" → Run workflow
  → check "Scan only, do not create PR"
```

期待挙動:
- Glob 結果と issue state lookup 結果がログに出る
- `git mv` は呼ばれず、PR も作られない
- moved 配列が空でないとき "DRY-RUN would move: ..." 行が出る

### 5.2 手動シナリオ

| シナリオ | 手順 | 期待結果 |
|----------|------|----------|
| T1: 該当 0 件 | 全 active doc の linked issue が open のとき cron 実行 | PR 作成なし、exit 0 |
| T2: 該当 1 件 | あえて closed issue を持つ planning doc を 1 つ用意 → cron 実行 | 1 PR (1 commit) が作られ、archived/ に 1 ファイル move |
| T3: 該当複数件 | closed issue 紐付け planning doc を複数用意 | 1 PR (1 commit) に複数 git mv が集約 |
| T4: lookup_failed | 存在しない issue 番号 (#99999 等) を意図的に指定 | warning として記録、当該ファイルは move されない、workflow は success |
| T5: header 欠落 | `> GitHub Issue:` 行が無い proposals/ ファイルや evergreen note | skip され warning にも上がらない |
| T6: 既存 archive workflow と並走 | cron 実行中に外部から PR を open | 別 concurrency group なので独立に実行され race しない (両者は対象ファイルが重複しない: cron は main を見る、reactive は PR branch を見る) |
| T7: dry_run | dispatch with `dry_run: true` | PR 作られない / 既存ファイルが変わらない |

### 5.3 README / agent 修正の検証

- `docs/design-notes/README.md` の internal リンク (../archived/README.md,
  ./proposals/README.md) が存在することを `grep` で確認。
- doc-reviewer agent 修正後、本リポでの doc-reviewer 実行が proposals/
  を読まないこと (Glob トレースで確認)。
- handover-author の Glob 修正は `Glob("docs/design-notes/*.md")` のまま
  で proposals/ 配下が含まれないこと (one-level glob の挙動確認)。

### 5.4 CI ガード (任意, future PR)

- `actionlint` workflow を導入し新 yml の syntax を検証 (現状リポに actionlint は無いが、別 PR で導入推奨)。
- `scripts/check-design-notes-headers.sh` を追加し、`docs/design-notes/*.md`
  に `> GitHub Issue:` 行があるかを PR ごとに validate する (将来案、本 issue
  では実装しない)。

---

## §6 実装の分割案 (PR 単位)

互いに独立した 3 PR に切る。順序自由 (依存なし)。

### PR-1: archive-orphan-plans.yml (workflow)

- 新規: `.github/workflows/archive-orphan-plans.yml`
- 修正: `docs/design-notes/archived/README.md` (自身を再帰参照する文を追加、
  および古い "docs/issues/" 表記を訂正)
- CHANGELOG エントリ追記
- **検証手順**: merge 後すぐに `workflow_dispatch --dry_run=true` を 1 回
  叩き、PR 作成が走らないこと + scan ログが綺麗に出ることを確認

### PR-2: docs/design-notes/README.md + agent 更新

- 新規: `docs/design-notes/README.md`
- 修正: `.claude/agents/doc-reviewer.md`, `.claude/agents/handover-author.md`
  (proposals 除外を明記)
- 修正: `.claude/agents/analyst.md` (任意。proposals promotion 段落)
- 修正: `docs/wiki/en/Contributing.md` + `docs/wiki/ja/Contributing.md`
  (Same-PR sync, design-notes ライフサイクル節を追加)
- CHANGELOG エントリ追記
- **検証手順**: PR review で本リポ自身に doc-reviewer 実行 (standalone)
  し、無関係な FAIL が出ないこと

### PR-3: proposals/ ディレクトリ新設

- 新規: `docs/design-notes/proposals/.gitkeep`
- 新規: `docs/design-notes/proposals/README.md`
- 修正: `docs/design-notes/README.md` の proposals/ 参照リンクが活きること
  (PR-2 がすでにマージされている前提)
- CHANGELOG エントリ追記
- **検証手順**: ディレクトリが空のままで commit されること (`.gitkeep`
  以外のファイルが入っていないこと) を確認

**順序の柔軟性**: PR-1 / PR-2 / PR-3 は互いに blocking しないが、
- PR-3 を先に出すなら PR-2 の README リンク先 (proposals/README.md) が存在
  しないことに留意。
- PR-2 と PR-3 を同一 PR にまとめても良い (review コストが許容できれば)。

---

## §7 リスクと未確定事項

### 7.1 リスク

| Risk | Impact | Mitigation |
|------|--------|-----------|
| 初回 cron 実行で大量 archive PR が生成される | 突然 10+ ファイル move されてレビュー負荷 | merge 直後に必ず `workflow_dispatch --dry_run=true` で件数確認。多すぎる場合は手動 archive で先に消化してから cron を有効化 |
| `gh issue view` の rate limit | scheduled run が頻繁にエラーで止まる | 週次 (週 1) の頻度なら rate limit に届かない。万が一達したら warning 化で fail-open |
| 削除 issue (`gh issue view` が 404) | warning に積まれるが処理されない | 削除 issue 紐付けは "user 判断" 案件なので自動 archive しないのが正しい |
| reactive と cron が同じファイルを取り合う | 結果が壊れる | reactive は PR branch、cron は main を見る → 物理的に重ならない |
| 新 workflow のシークレット流出 | gh CLI には built-in `${{ github.token }}` のみ。外部 token は使わない | permissions を必要最小限に絞る (issues:read, contents:write, pull-requests:write) |
| proposals/ の存在をユーザが気づかない | opt-in ディレクトリなので問題なし | README とコントリビューションガイドで案内 |
| analyst の promotion 動作 (§3.4.3) が optional のまま流れて proposals/ にゴミが溜まる | 中長期で散らかる | proposals/ には自動 archive 機構が無いことを README で明示。定期 cleanup は人間判断 |

### 7.2 未確定事項

1. **cron 頻度の最終決定**: planning doc は週次推奨。隔週案もあったが本設計
   では週次 (`'0 3 * * 1'`) で確定。developer 段階で運用上の不満があれば
   月次に変更してよい。
2. **proposals/archived/ を導入するか**: planning doc §3.1 で「運用が回って
   から判断」とされており、本設計でも MVP からは外す。Future work として
   `proposals/README.md` の §"Lifecycle" に注記済み。
3. **新 cron PR のレビュー必須化**: branch protection rule で
   `chore/archive-orphan-plans-*` を 1 reviewer 必須にするか自動 merge を
   許すかは別議論。本設計では「必ず人間が merge」を前提とする (安全側)。
4. **`analyst.md` への promotion 段落追加**: 本設計では optional (§3.4.3)
   としているが、planning doc Acceptance Criteria に明示は無く developer
   判断に委ねる。
5. **既存の "docs/issues/" 残存表記**: archived/README.md だけでなく、他に
   残っていないか PR-2 着手時に再 grep する。 (developer 着手時の TODO)
6. **既存 evergreen note (issue 非紐付けで active/ 直下にあるファイル)**:
   現時点で `docs/design-notes/*.md` のうち `> GitHub Issue:` 行を持たない
   ものがあるか要確認。あれば proposals/ への移行を勧める (developer 確認事項)。

---

## §8 Handoff brief for developer

- **着手順**: PR-1 (workflow) → PR-2 (README + agent) → PR-3 (proposals/)。
  独立なので並列着手も可。
- **必須読み込み**:
  - `.github/workflows/archive-closed-plans.yml` (既存 reactive 側)
  - `docs/design-notes/archived/README.md` (現状確認)
  - 本設計書 §3.1 (新 workflow 仕様), §3.2-3.3 (README ドラフト)
- **特に注意してほしい点**:
  1. 新 workflow merge 直後に **必ず `workflow_dispatch --dry_run=true`**
     を実行して "想定外の archive 件数" が無いか確認すること。
     planning doc Acceptance Criteria には dry-run 言及はないが、初回運用の
     リスク低減のため強く推奨する。
  2. archived/README.md の "docs/issues/" 表記を `docs/design-notes/` に
     置換するついでに、リポジトリ全体を grep し他に残っていないか確認する。
  3. wiki の Same-PR sync (EN canonical + JA) を遵守。`docs/wiki/en/Contributing.md`
     と `docs/wiki/ja/Contributing.md` は必ず同 PR で更新。
  4. 新 workflow の `gh issue view` 呼び出しは `--jq .state` でフィールドを
     絞っているが、テスト時に出力フォーマット変更で壊れないか目視確認。
  5. proposals/.gitkeep は **必ず作る** こと。空ディレクトリは git に
     コミットできないため。
- **質問が必要なら user に確認**: §7.2 (1) cron 頻度 / (3) PR の人手 merge
  必須化 / (4) analyst.md への promotion 段落採否 を着手前に AskUserQuestion
  でまとめて確認すると省コスト。

```
NEXT: developer
HANDOFF_TO: developer
TECH_STACK_CHANGED: false
PHASES: 3 (PR-1 workflow / PR-2 README+agent / PR-3 proposals/)
```
