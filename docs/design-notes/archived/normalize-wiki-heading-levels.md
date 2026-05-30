> Last updated: 2026-05-31
> GitHub Issue: [#146](https://github.com/kirin0198/aphelion-agents/issues/146)
> Authored by: analyst-intake (2026-05-31); §5-8 by analyst-core (2026-05-31)
> Next: developer (trivial docs change; architect design not required)

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

## §5 Analysis Results (analyst-core)

> Updated: 2026-05-31 (deep analysis for #146 — verified current file state)

### 分類

- **Issue type**: docs / wiki 整合性（feature ではなく docs 寄りの軽微な構造確認）
- **重大度**: 低（CI 破壊なし、`language-rules.md` §3.3 整合性の検証）

### 重要: 承認時の前提と実ファイル状態の食い違い

resume 時の承認決定は「EN = `### What to Expect`（H3）/ JA = `## 典型的なセッションの進み方`（H2）」
という #146 報告当時の前提に基づき、「JA を H3 に降格して EN canonical（H3）に揃える」というもの
だった。しかし analyst-core がアンカー付き grep（`^#{1,4} `）で**実ファイルを精査した結果、
この前提は現状と一致しない**ことが判明した。

### 実ファイル精査結果（2026-05-31 時点・検証済み）

- **EN `docs/wiki/en/Getting-Started.md`**:
  - L312 `## What to Expect: A Typical Session`（**H2**）
  - その配下に H3 が4つ: `### Triage Questions`（L314） / `### Phase Approvals`（L318） /
    `### Artifact Files`（L325） / `### Session Resume`（L349）
  - `## ` 見出し総数 = **11**
- **JA `docs/wiki/ja/Getting-Started.md`**:
  - L295 `## 典型的なセッションの進み方`（**H2**）
  - その配下に H3 が4つ: `### トリアージ質問`（L297） / `### フェーズ承認`（L301） /
    `### 成果物ファイル`（L308） / `### セッション再開`（L331）
  - `## ` 見出し総数 = **11**

→ **EN・JA とも当該セクションは既に H2 であり、H2 見出し数（各11）も見出しレベル・位置も
完全に lockstep している。** intake §1 の「両ファイルともすでに H2 で一致」という観察が正しく、
非対称はおそらく PR #145 マージ（commit ae04f45 系）で既に解消済みである。
`language-rules.md` §3.3 違反は **現時点では存在しない**。

### 承認済みアプローチを実行できない理由

承認された「JA を H3 に降格」を現状に適用すると、JA の H2 が 11→10 となり、
**EN（11）との `## ` 見出し数パリティをむしろ破壊する**。これは #146 の目的（lockstep 維持）に
真っ向から反するため、analyst-core はこのアプローチをそのまま実装へ引き渡さない。

## §6 Approach (revised after verification)

**修正後アプローチ**: wiki への見出し変更は行わない。#146 は過去コミットで既に解消済み
（already-fixed）であることを実装担当が再検証し、問題がなければ #146 をクローズする。

- 根拠: 実ファイルが既に EN/JA 完全 lockstep（各11 H2、同位置、同 H3 構造）。
- `language-rules.md` §3.1（English canonical）/ §3.3（lockstep）はいずれも現状で充足。
- 変更範囲: **wiki ファイルへの変更なし**。

### 検討したが不採用の代替案

- **承認どおり JA を H3 に降格**: 現状のパリティを破壊する（JA=10 / EN=11）ため不採用。
  承認の前提（EN=H3）が実ファイル（EN=H2）と食い違っていたことが理由。
- **EN・JA とも H3 に降格して Command Reference 配下にネスト**: 両ファイル変更が必要で、
  現状問題のない構造を作り替えることになり、低優先 #146 のスコープを超える。必要なら別途検討。

## §7 Document Changes

- **SPEC.md**: N/A — 本リポジトリ自身の wiki コンテンツであり、プロダクトの SPEC.md は
  存在せず適用されない（`artifact_paths` も SPEC: missing）。
- **UI_SPEC.md**: N/A（同上、UI_SPEC: missing）。
- **ARCHITECTURE.md**: N/A（同上、ARCHITECTURE: missing）。
- **対象 wiki ファイル**: 変更なし（EN・JA とも現状で lockstep 充足）。

## §8 Handoff Brief (→ developer / verify-and-close)

これは「現状確認の結果、修正不要」と判明した docs issue である。architect による新規設計は不要。
実装担当（developer）が以下を実行する：

1. EN/JA の `## ` 見出し数が一致（各 11）し、見出しレベル・位置が lockstep であることを再検証する
   （`scripts/check-readme-wiki-sync.sh` または相当の wiki sync チェックがあれば実行）。
2. 検証が通れば wiki への変更を行わず、#146 を「already fixed（PR #145 系で解消済み）」として
   クローズすることを推奨する。
3. 万一再検証で非対称が再発していた場合のみ、English canonical（§3.1）に従い JA を EN 構造へ
   追随させる（その場合も EN=JA の `## ` 数一致を満たすこと）。

> Note: resume 時の承認は #146 報告当時の前提（EN=H3）に基づいていたが、実ファイル検証で
> 前提が覆ったため、analyst-core はパリティを破壊しない方向（修正不要・verify-and-close）で
> 確定した。最終クローズ判断はユーザー / developer に委ねる。
