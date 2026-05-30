> Last updated: 2026-05-31
> GitHub Issue: [#146](https://github.com/kirin0198/aphelion-agents/issues/146)
> Authored by: analyst-intake (2026-05-31)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/normalize-wiki-heading-levels.md
slug: normalize-wiki-heading-levels
branch_name: feat/normalize-wiki-heading-levels
issue_url: https://github.com/kirin0198/aphelion-agents/issues/146
issue_number: 146
issue_title: "docs: normalize EN/JA heading-level asymmetry in Getting-Started.md (low priority)"
issue_type: feature
intake_summary: |
  Symptom / Background:
    Issue #146 reports that docs/wiki/en/Getting-Started.md uses
    "### What to Expect: A Typical Session" (H3, nested under Command Reference),
    while docs/wiki/ja/Getting-Started.md uses "## 典型的なセッションの進み方" (H2,
    top-level). This is a heading-level asymmetry surfaced as INFO-001 during PR #145
    review. The asymmetry is a latent violation of language-rules.md §3.3 (EN/JA wiki
    pairs keep heading structure in lockstep).
  Expected behavior / Goal:
    Both files should use the same heading level for the "Typical Session" section
    (either both H2 or both H3). No CI breakage today, but structural parity is
    required per language-rules.md §3.2/§3.3. Verify H2 counts stay equal after fix.
  Scope hint:
    docs/wiki/en/Getting-Started.md, docs/wiki/ja/Getting-Started.md
  Current state (as of 2026-05-31):
    Inspection of both files shows EN already uses "## What to Expect: A Typical
    Session" (H2) and JA uses "## 典型的なセッションの進み方" (H2). Both files
    have exactly 11 H2 headings. The asymmetry described in #146 appears to have been
    resolved in a prior commit (ae04f45 / PR #145 merge). analyst-core should
    confirm this finding and determine whether #146 can be closed as already-fixed.
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# docs: normalize EN/JA heading-level asymmetry in Getting-Started.md

## §1 Background / Motivation

Issue #146 はPR #145（#130 PR-3）のレビュー中にINFO-001として浮上した問題として記録されている。

報告内容：
- `docs/wiki/en/Getting-Started.md` が `### What to Expect: A Typical Session`（H3、Command Reference の下にネスト）を使用
- `docs/wiki/ja/Getting-Started.md` が `## 典型的なセッションの進み方`（H2、トップレベル）を使用

これは `language-rules.md` §3.3 の「EN/JAウィキペアは見出し**構造**をロックステップで維持する」という要件に対する潜在的な違反である。

**ただし**、2026-05-31時点での調査では：
- ENファイル（L312）: `## What to Expect: A Typical Session`（H2）
- JAファイル（L295）: `## 典型的なセッションの進み方`（H2）
- 両ファイルのH2見出し数：各11個（一致）

この非対称性はすでに修正済みの可能性が高い。`analyst-core` による詳細確認が必要。

## §2 Goal / Acceptance Criteria

1. **現状確認**: ENとJAの見出しレベル・構造が一致しているか確認する
2. **修正（未修正の場合）**: 一致していない場合、どちらかを修正して揃える
   - ENをH2に昇格させる（`## What to Expect: A Typical Session`）、またはJAをH3に降格（`### 典型的なセッションの進み方`）
   - 周囲のネスト構造を考慮して読みやすい方を選択
3. **パリティ検証**: 修正後にH2見出し数がEN/JAで等しいことを確認
4. **bilingual sync**: 両ファイルへの変更を同一PRに含める（`language-rules.md` §3.2）
5. **既に修正済みの場合**: issue #146 を「already fixed」としてクローズすることを勧告する

## §3 Scope

対象ファイル：
- `docs/wiki/en/Getting-Started.md`
- `docs/wiki/ja/Getting-Started.md`

対象外：
- 他のウィキファイル（このissueのスコープ外）
- `check-readme-wiki-sync.sh`（CI への影響なし; スクリプト変更は不要）

## §4 Constraints / Open Questions

**Constraints:**
- `language-rules.md` §3.2: 同一PRで両ファイルを変更すること（bilingual sync 必須）
- `language-rules.md` §3.3: EN/JAウィキの見出し構造をロックステップで維持する
- PRにて `## ` 見出し数がEN/JAで同数であることを確認すること
- 既存のIssue #146 を再利用（新規issueを作成しない）

**Open Questions:**
- Q1: 2026-05-31時点の調査では両ファイルが既にH2で一致している。この状態が正しければissueはクローズ可能か？（`analyst-core` が最終確認する）
- Q2: 万が一非対称が存在した場合、ENをH2に昇格させるかJAをH3に降格させるか？周囲のセクション構造に基づき判断する。
- Q3: 目次（Table of Contents）エントリも対応する見出しレベルに合わせる必要があるか？（現在は両ファイルともフラットな目次リストのため変更不要の可能性あり）
