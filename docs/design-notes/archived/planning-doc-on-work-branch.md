> Last updated: 2026-05-15
> GitHub Issue: [#136](https://github.com/kirin0198/aphelion-agents/issues/136)
> Authored by: analyst (2026-05-15)
> Next: developer (architect skip — process / rules change with no architectural decision)

# Planning doc を work branch にコミットする義務化 (analyst を planning-tier に格上げ)

## 1. Background / motivation

`analyst` が書いた planning doc (`docs/design-notes/<slug>.md`) と `architect` が書いた
design doc (`<slug>-design.md`) が **コミットされないまま親 PR がマージされる** ケースが
繰り返し発生している。

| 発生日 | 影響を受けた issue | 復旧 PR |
|---|---|---|
| 2026-04-30 | #101 / #103 / #105 | [#124](https://github.com/kirin0198/aphelion-agents/pull/124) |
| 2026-05-13 | #118 (planning + design 2 件) | [#135](https://github.com/kirin0198/aphelion-agents/pull/135) (本 PR) |

両 archive workflow (reactive `archive-closed-plans.yml` / cron `archive-orphan-plans.yml`)
は **コミット済みファイルのみ対象** とするため、untracked のまま残った planning doc は
拾えない。これは automation gap ではなく **process gap** である。

## 2. Root cause

現在の `analyst.md` フロー (l.123-365 抜粋):

1. `docs/design-notes/<slug>.md` を **write**
2. `SPEC.md` / `UI_SPEC.md` を incremental edit
3. `gh issue create` で GitHub issue 起票
4. planning doc のヘッダに `> GitHub Issue: [#N](URL)` を埋める
5. `AGENT_RESULT` を emit して終了

**欠けているステップ**: `git add` + `git commit` + `git push`。

`/analyst` を直接起動した場合、ユーザは `main` 上で analyst を呼ぶことが多い。
analyst は main 上で planning doc を書くが commit しないため、後続の developer が
work branch を作成しても **planning doc は untracked のまま working tree に残る**。
developer が `git add` を忘れると、その PR のマージとともに永久に孤立する。

architect は `<slug>-design.md` を書くが、`.claude/agents/architect.md` には
design-notes への言及自体が無い。analyst の不備を引き継ぐかたちで同じ問題に晒される。

developer の Startup Probe には untracked design-notes を検出する仕組みが無く、
最後のフェイルセーフも欠落している。

## 3. Approach

`analyst` を **planning-tier agent** として `git-rules.md` §"Branch & PR Strategy"
に組み込む。具体的には:

### 3.1 analyst.md の修正 (主)

`gh issue create` 完了直後に以下を追加:

```bash
# 1. カレントブランチを確認
current_branch=$(git rev-parse --abbrev-ref HEAD)

# 2. main の場合のみ work branch を作成 (既に work branch 上なら reuse)
if [ "$current_branch" = "main" ]; then
  # issue type に応じて prefix を選択
  case "$ISSUE_TYPE" in
    bug)     branch_prefix=fix ;;
    feature) branch_prefix=feat ;;
    refactor) branch_prefix=refactor ;;
    *)       branch_prefix=feat ;;
  esac
  branch_name="${branch_prefix}/${slug}"
  git checkout -b "$branch_name"
fi

# 3. planning doc + SPEC/UI_SPEC 編集を 1 つのコミットへ
git add docs/design-notes/${slug}.md
# SPEC.md / UI_SPEC.md が編集されていれば追加
git add docs/SPEC.md 2>/dev/null || git add SPEC.md 2>/dev/null || true
git add docs/UI_SPEC.md 2>/dev/null || git add UI_SPEC.md 2>/dev/null || true

git commit -m "docs: add planning doc for ${issue_title} (#${N})

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. push して PR は作らない (実装 PR は developer が後で作る)
git push -u origin "$branch_name"
```

`AGENT_RESULT` に新フィールド `BRANCH:` を追加し、後続エージェントが branch reuse できる
ようにする。

### 3.2 architect.md の修正

新規追加する一節 (現状 architect.md は design-notes の話を全く扱っていない):

> **Design doc artifact**: write a companion design document at
> `docs/design-notes/<slug>-design.md` (the slug matches the planning
> doc created by analyst). On a work branch created by analyst,
> reuse the branch (`git rev-parse --abbrev-ref HEAD` should NOT
> return `main`); commit the design doc as the next commit on the
> same branch.

### 3.3 developer.md の修正

Startup Probe に追加:

```bash
# Detect orphaned planning docs (fail-safe — analyst should have committed them already)
orphan_docs=$(git ls-files --others --exclude-standard 'docs/design-notes/*.md' 2>/dev/null)
if [ -n "$orphan_docs" ]; then
  echo "⚠️  Untracked planning docs detected:"
  echo "$orphan_docs"
  echo "   These should have been committed by analyst per planning-doc-on-work-branch rule."
  echo "   Stage and commit them before proceeding, or invoke analyst to redo the planning step."
fi
```

警告のみ。自動 add はしない (内容確認の機会を奪わないため)。

### 3.4 git-rules.md の修正

§"Branch & PR Strategy" の冒頭で agent tier を再定義:

> Implementation-tier and Planning-tier agents are responsible for
> branch creation, commit, push, and pull request submission.
>
> - **Planning-tier**: `analyst`, `architect`. Create branch (analyst
>   only), commit planning / design docs, push. **Do NOT open PRs** —
>   that is the implementation tier's job.
> - **Implementation-tier**: `developer`, `scaffolder`, etc. Reuse
>   the branch created by analyst (or create one if invoked standalone),
>   commit implementation code, open the PR.

### 3.5 docs/design-notes/README.md の修正

「Lifecycle」節を新フロー (analyst が branch + 最初の commit までを担う) に書き換える。

### 3.6 本 planning doc 自身が dogfood

本 planning doc は PR #135 ブランチ (`chore/archive-orphaned-118-planning-docs`) に
**最初のコミットとして** 配置される。これは新ルールが要求する動作の最初の実例である。

(PR #135 は元々 #118 orphan の archive を目的とするブランチだが、本 issue の対応も
同 PR に同梱する方針 [user 承認済] のため、planning doc も同ブランチに乗せる。)

## 4. NOT changed

- `scaffolder` / `tester` / `reviewer` 他の agent — planning doc を書かないため
- `archive-closed-plans.yml` / `archive-orphan-plans.yml` の挙動 — 既存ロジックで正しい
- Co-Authored-By trailer policy — 既に analyst は対象に含まれている

## 5. Acceptance criteria

- [ ] `analyst.md` に branch 作成 + commit + push 手順が追加されている
- [ ] `analyst.md` の AGENT_RESULT に `BRANCH:` フィールドが追加されている
- [ ] `architect.md` に design doc の write + branch reuse + commit が記述されている
- [ ] `developer.md` Startup Probe に untracked planning doc 警告が追加されている
- [ ] `git-rules.md` §"Branch & PR Strategy" に Planning-tier の定義がある
- [ ] `docs/design-notes/README.md` Lifecycle 節が新フローを反映している
- [ ] 本 planning doc が PR #135 の commit に含まれている (dogfood)
- [ ] CHANGELOG.md Unreleased エントリ追加

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| analyst が main 上で sudden に branch を切るとユーザが驚く | 中 | analyst の出力に「branch を作成した」旨を明示。AskUserQuestion でユーザに事前確認するオプションは out of scope (UX 増加を避ける) |
| branch slug 衝突 (既に同名 branch が remote にある) | 中 | git-rules.md §"Branch Lifecycle" 既存条項に従い「ユーザに reuse / 新規 / abort を確認」 |
| analyst が非 main から起動された (issue triage 中等) | 低 | カレントブランチ判定で `main` のときだけ create。それ以外は現ブランチをそのまま使用 |
| architect が standalone 起動された (analyst が走らずブランチがない) | 中 | architect 単独起動時は自分でブランチ作成 (planning doc が無い場合は warning) |

## 7. Open questions (deferred)

1. **CI / hook による enforcement**: PR open 時に "Linked Plan に書かれている path が PR 内で commit されているか" を機械チェックする hook は future issue。今は process 規律のみ。
2. **maintenance-flow からの analyst 起動**: maintenance-flow が analyst を呼ぶ場合の挙動は別 issue で検証 (現状の本 PR では直接起動シナリオに集中)。

## 8. Handoff brief for developer

- **着手順**: 単一 PR (#135) で 6 ファイル変更 (本 planning doc は既にコミット済の前提)
- **必須読み込み**:
  - 本 planning doc
  - `.claude/agents/analyst.md` (現状: l.123-365 周辺が修正対象)
  - `.claude/agents/architect.md` (新規節追加)
  - `.claude/agents/developer.md` (Startup Probe 拡張)
  - `src/.claude/rules/git-rules.md` (§"Branch & PR Strategy")
  - `docs/design-notes/README.md` (Lifecycle 節)
- **注意点**:
  1. 本 PR (#135) は #118 orphan の archive とも同梱されている。コミット粒度: archive コミット (既に存在) + planning doc コミット (この doc を含む) + 各エージェント定義修正コミット + wiki/rules 修正コミット + CHANGELOG コミット
  2. PR body に `Closes #136` を追記すること (本 issue 用)。既存の "Closes" は無いので新規追加
  3. AGENT_RESULT に `BRANCH:` を追加する変更は agent-communication-protocol.md には記載不要 (analyst 固有フィールド扱い)
  4. analyst の bash スニペットは shell 標準機能のみ使用 (jq 等の追加依存は無し)
