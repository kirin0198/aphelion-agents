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

> Updated: 2026-05-31 (deep analysis + approved approach for #146)

### 分類

- **Issue type**: docs / wiki 整合性（feature ではなく docs 寄りの軽微な構造修正）
- **重大度**: 低（CI 破壊なし、`language-rules.md` §3.3 の潜在的違反の解消）

### 見出し構造の精査結果

intake §1 の暫定調査（「両ファイルともすでに H2 で一致」）は **誤り** であった。
アンカー付き見出し grep（`^#{1,4} `）で両ファイルを精査した結果：

- **EN `docs/wiki/en/Getting-Started.md`**:
  - L287 `## Command Reference`（H2）
  - その配下に H3 が4つネスト: `### Triage Questions`（L314） / `### Phase Approvals`（L318） /
    `### Artifact Files`（L325） / `### Session Resume`（L349）
  - 「A Typical Session」相当の内容は **トップレベル見出しとして独立していない**
    （Command Reference 配下の構造に統合されている。EN canonical 構造）
- **JA `docs/wiki/ja/Getting-Started.md`**:
  - L270 `## コマンドリファレンス`（H2）
  - L295 `## 典型的なセッションの進み方`（**H2 / トップレベル独立**）← これが非対称の根因
  - その配下に H3 が4つ: `### トリアージ質問` / `### フェーズ承認` / `### 成果物ファイル` /
    `### セッション再開`

→ JA だけが「典型的なセッションの進み方」をトップレベル H2 として持つため、
EN/JA の `## ` 見出し数と見出しレベル位置（lockstep）が一致していない。
これは `language-rules.md` §3.3 違反の確定事象である。

## §6 Approach (Approved 2026-05-31)

**承認済みアプローチ**: JA の `## 典型的なセッションの進み方`（H2）を `### 典型的なセッションの進み方`（H3）へ
**降格**し、EN canonical の「Command Reference 配下にネストする H3 構造」へ揃える。

- 根拠: `language-rules.md` §3.1（**English canonical**）。EN を変更せず JA を EN へ追随させる。
- 効果:
  - `## ` 見出し数のパリティ達成（EN = 6 / JA = 6）
  - 見出しレベル・位置の lockstep 達成（§3.3 充足）
- 変更範囲: **`docs/wiki/ja/Getting-Started.md` の単一行のみ**（L295 の `## ` → `### `）。
  EN ファイルは無変更。
- 注意点（developer 向け）:
  - 目次（`## 目次`）に「典型的なセッションの進み方」への明示リンク行があれば、
    降格後の構造に合わせてインデント/レベル整合を確認する（現状フラットリストなら変更不要）。
  - 降格に伴い L295 の前後ブロック（本文・コードフェンス）は移動・改変しない。見出し記号のみ変更。

### 検討したが不採用の代替案

- **EN を H2 に昇格して JA に合わせる**: §3.1 の English canonical 原則に反するため不採用。

## §7 Document Changes

- **SPEC.md**: N/A — 本リポジトリ自身の wiki コンテンツに対する変更であり、
  プロダクトの SPEC.md は存在せず適用されない（`artifact_paths` も SPEC: missing）。
- **UI_SPEC.md**: N/A（同上、UI_SPEC: missing）。
- **ARCHITECTURE.md**: N/A（同上、ARCHITECTURE: missing）。
- **対象 wiki ファイル**:
  - `docs/wiki/ja/Getting-Started.md`: L295 の見出しを H2 → H3 へ降格（developer が実装）
  - `docs/wiki/en/Getting-Started.md`: 無変更（canonical）

## §8 Handoff Brief (→ implementation)

これは単一行の wiki 見出し降格という trivial な docs 変更である。設計判断は本ドキュメントで
確定済みのため、architect による新規設計は不要。実装担当（developer）が以下を実行する：

1. `docs/wiki/ja/Getting-Started.md` L295 `## 典型的なセッションの進み方` → `### 典型的なセッションの進み方`
2. bilingual 検証（`language-rules.md` §3.2/§3.3）:
   - EN/JA の `## ` 見出し数が一致（EN = 6 / JA = 6）することを確認
   - 見出しレベル・位置が lockstep であることを確認
   - 可能であれば `scripts/check-readme-wiki-sync.sh`（または相当の wiki sync チェック）を実行
3. EN ファイルは変更しない（English canonical）
4. PR は両ファイルではなく JA 単一ファイルの変更となるが、これは EN を canonical として
   JA を追随させる §3.1 準拠の修正であり、bilingual sync ルールに反しない
   （EN 側は既に目標構造のため変更不要）
5. PR body に `Closes #146` を含める
