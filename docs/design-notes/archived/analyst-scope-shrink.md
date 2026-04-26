> 最終更新: 2026-04-26
> GitHub Issue: [#65](https://github.com/kirin0198/aphelion-agents/issues/65)
> Analyzed by: analyst (2026-04-26)
> Next: developer

# analyst の責任範囲縮小（branch / PR 作成の除去）

## §1 Background / motivation

PR #63 で `/issue-new` が `analyst` に統合され、intake と analysis が同一エージェント
内で完結するようになった。しかし `.claude/agents/analyst.md` には引き続き以下の実装
フェーズ責任が残っている。

- `## Step 4: Branch Creation` — main から作業ブランチを作成する責任
- `## Step 7: Push & Pull Request Creation` — commit / push / PR 作成 + PR レビュー依頼
- `AGENT_RESULT` の `BRANCH` / `PR_URL` フィールド

これらは本来 `developer` の責任範囲であり、`analyst` が抱えていることで以下の不整合が
生じる。

- `analyst` が PR 作成まで担うと、後続の `architect` / `developer` の出力先（branch /
  PR）が事前に固定されてしまい、設計フェーズでの方針変更が困難になる
- `NEXT: architect` のはずが、PR レビュー承認ゲートを analyst 内に持つため、フローが
  二段承認になる
- maintenance-flow からの再利用時にも、analyst が branch を切ってしまうと flow
  orchestrator のブランチ戦略と衝突する

## §2 Goal / acceptance criteria

`.claude/agents/analyst.md` を編集し、analyst の責任範囲を「設計ノート作成 + 文書差分
適用 + GitHub Issue 作成」までに絞る。branch / commit / push / PR は developer
（または flow orchestrator）に委譲する。

完了条件:

- `## Step 4: Branch Creation` セクションが完全に削除されている
- `## Step 7: Push & Pull Request Creation` セクションが完全に削除されている
- 旧 Step 5（Document Updates）が Step 4 に、旧 Step 6（GitHub Issue Creation）が
  Step 5 に繰り上がっている
- 新 Step 4 冒頭の文言が `After approval, execute the following.` に修正されている
- `AGENT_RESULT` テンプレートから `BRANCH` / `PR_URL` フィールドが削除されている
- `Completion Conditions` から branch 作成・PR 作成・PR レビュー承認の 3 項目が
  削除されている
- 上記以外（Mandatory Checks / Step 1〜3 / Document Update ルール / Issue Body
  Template / archive workflow 連携・`NEXT: architect` など）は **無変更**

## §3 Scope

- **対象ファイル**: `.claude/agents/analyst.md` のみ
- **対象セクション**: Step 4, Step 5, Step 6, Step 7, Required Output on Completion,
  Completion Conditions
- **無変更**: Project-Specific Behavior, Mandatory Checks Before Starting,
  Intake during standalone invocation (Step A〜D), Step 1, Step 2, Step 3,
  Issue Body Template, archive workflow 連携の記述, description フィールド,
  AGENT_RESULT の `ISSUE_TYPE` / `DOCS_UPDATED` / `GITHUB_ISSUE` /
  `ARCHITECT_BRIEF` / `HANDOFF_TO` / `NEXT: architect`

## §4 Constraints / open questions

- 本 refactoring 自体も新責任範囲に従う必要がある。すなわち analyst は本タスクで
  branch / commit / push / PR を作成しない。実装は developer に委譲する。
- ARCHITECTURE.md は本リポジトリには存在しないため、architect 経由は不要。設計余地
  ゼロ（ユーザ指定が完全に確定）のため、HANDOFF_TO は `developer`。
- archive-closed-plans.yml は GitHub Issue クローズ時に design note を archived 配下
  へ移動する。本 design note の `> GitHub Issue:` ヘッダは Step D で gh が返す URL
  で更新する。

## §5 Analysis

### 現状の問題点

| # | 問題 | 該当箇所 |
|---|------|---------|
| 1 | analyst が branch を切る | Step 4 全体（行 241-264） |
| 2 | analyst が commit/push/PR を作成し、PR レビュー承認ゲートまで持つ | Step 7 全体（行 350-415） |
| 3 | AGENT_RESULT に `BRANCH` / `PR_URL` が残り、後続フローと整合しない | Required Output（行 426, 431） |
| 4 | Completion Conditions に branch/PR 関連の 3 項目が残る | 行 442, 445, 446 |
| 5 | Step 5（Document Updates）冒頭が "After branch creation" に依存している | 行 269 |

### 改善方針

- Step 4 / Step 7 を完全に削除
- Step 番号を繰り上げ（旧 Step 5 → 新 Step 4、旧 Step 6 → 新 Step 5）
- 旧 Step 5 冒頭の "After branch creation" を "After approval" に書き換え
- AGENT_RESULT から `BRANCH` / `PR_URL` を削除
- Completion Conditions から該当 3 項目を削除

## §6 Approach

`.claude/agents/analyst.md` を Edit ツールで以下のように変更する。

### 変更 1: Step 4 セクション全体を削除

`## Step 4: Branch Creation` から、その直後の `## Step 5: Document Updates` 直前の
`---` 区切りまでを削除（行 241〜265 相当）。

### 変更 2: Step 5 を Step 4 にリネーム + 冒頭文言修正

```diff
-## Step 5: Document Updates
-
-After branch creation, execute the following.
+## Step 4: Document Updates
+
+After approval, execute the following.
```

### 変更 3: Step 6 を Step 5 にリネーム

```diff
-## Step 6: GitHub Issue Creation (gh CLI)
+## Step 5: GitHub Issue Creation (gh CLI)
```

### 変更 4: Step 7 セクション全体を削除

`## Step 7: Push & Pull Request Creation` から、`## Required Output on Completion`
直前の `---` 区切りまでを削除（行 350〜417 相当）。

### 変更 5: AGENT_RESULT テンプレート修正

```diff
 AGENT_RESULT: analyst
 STATUS: success | error
 ISSUE_TYPE: bug | feature | refactor
 ISSUE_SUMMARY: {one-line summary}
-BRANCH: {branch name}
 DOCS_UPDATED:
   - SPEC.md: updated | no_change
   - UI_SPEC.md: updated | no_change | not_exists
 GITHUB_ISSUE: {issue URL | skipped}
-PR_URL: {PR URL | skipped}
 HANDOFF_TO: architect
```

### 変更 6: Completion Conditions の 3 項目削除

```diff
 - [ ] The issue has been classified into one of the 3 types
 - [ ] Analysis results and approach have been presented to the user and approval obtained
-- [ ] A working branch has been created from main
 - [ ] Necessary documents have been incrementally updated
 - [ ] A GitHub issue has been created via gh CLI (or skip reason recorded in AGENT_RESULT)
-- [ ] Changes have been committed, pushed, and a PR has been created
-- [ ] The user has reviewed and approved the PR
 - [ ] The required output block has been produced
 - [ ] Handoff information for architect (ARCHITECT_BRIEF) has been clearly stated
```

## §7 Document changes

- SPEC.md: no change（このリポジトリは agent 定義群のため SPEC.md 形式の文書なし）
- UI_SPEC.md: no change
- ARCHITECTURE.md: no change（architect の関与不要）
- `.claude/agents/analyst.md`: 上記 6 件の変更を適用

## §8 Handoff brief for developer

**対象ファイル**: `/home/ysato/git/aphelion-agents/.claude/agents/analyst.md`

**変更内容**: §6 Approach の変更 1〜6 をすべて適用する。

**手順の指針**:

1. ブランチ作成（branch 命名は `refactor/analyst-scope-shrink`、main から派生）
2. `.claude/agents/analyst.md` を Edit で変更（変更 1〜6）
3. 変更後の整合性確認:
   - Step 番号が 1, 2, 3, 4, 5 の連番になっていること
   - 削除した Step 4 / Step 7 への内部参照が残っていないこと（特に Step 6 の本文内
     "If a GitHub issue was created in Step 6" のような相互参照は削除済みで確認済み
     だが、最終 grep を推奨）
   - `BRANCH:` / `PR_URL:` の残存がないこと
4. commit（`refactor:` プレフィックス、Issue 番号は本 design note ヘッダ参照）
5. push + PR 作成（PR 本文に `Closes #N` または `Linked Issue: #N` を含める）

**設計余地**: ゼロ。ユーザが変更点を完全に確定しているため、developer は機械的に Edit
を適用し、最終 grep で参照漏れを確認するだけでよい。

**検証コマンド**:

```bash
# Step 番号の確認
grep -n "^## Step" /home/ysato/git/aphelion-agents/.claude/agents/analyst.md

# 削除すべき文字列の残存確認（すべてヒット 0 件であること）
grep -n "Branch Creation\|Pull Request Creation\|BRANCH:\|PR_URL:" \
  /home/ysato/git/aphelion-agents/.claude/agents/analyst.md
```
