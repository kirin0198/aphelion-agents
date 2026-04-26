> 最終更新: 2026-04-26
> GitHub Issue: [#71](https://github.com/kirin0198/aphelion-agents/issues/71)
> Analyzed by: analyst (2026-04-26)
> Next: developer

# branch / PR 作成責任の所属の明文化（PR #66 後の canonical 化）

## §1 Background / motivation

PR #66 (`refactor: shrink analyst scope by removing branch/PR creation responsibilities`)
で `analyst` から branch / commit / push / PR 作成の責任が除去された。意図としては
「下流（`developer`）に移譲する」ものだったが、その移譲先が **どのファイルにも
明文化されていない**。

### 機械的に立証された不在

`grep -inE "(git checkout|git push|gh pr|pull request|feature/|fix/|refactor/.*-)"`
を以下のファイル群に実行した結果、**ヒット 0 件**:

- `.claude/agents/developer.md`
- `.claude/agents/delivery-flow.md`
- `.claude/agents/maintenance-flow.md`
- `.claude/orchestrator-rules.md`

つまり、PR #66 で `analyst.md` から削除された `## Step 4: Branch Creation` /
`## Step 7: Push & Pull Request Creation` 相当の記述は、現在 Aphelion リポジトリの
**どこにも存在しない**。

### 一方、上位レイヤでは GitHub Flow を要求している

`~/.claude/rules/project-rules.md` (user-global デフォルト) §"Branch Strategy"
(line 79–81):

```
### Branch Strategy

GitHub Flow を採用する。
```

つまり「main 直 push は禁止、feature ブランチ + PR でマージせよ」というポリシーは
存在するが、それを履行するエージェントが定義されていない。

### 実運用上の影響

このセッション（およびそれ以前の作業）でも、main session のユーザが `developer` を
起動するたびに毎回手動で「ブランチ X を切って、PR を Y のボディで作って」と指示
している。これは:

- **再現性の欠如**: 新しい contributor / 自動評価系（Ouroboros）が agent 定義のみ
  読んでも、branch / PR 作成が期待される責務であることを判断できない
- **review のドキュメント整合性チェックでの検出可能な穴**: main 一貫性レビューが
  Major (MAJ-002) として検出した（issue #71 の根拠）
- **end-user project への配信時の不確定性**: `npx aphelion-agents init` で配布
  された agent 群を読んだ user は、どこで PR が作られるのか分からない

## §2 Current state

### `.claude/agents/developer.md` の現状

| 項目 | 現状 |
|------|------|
| `## Branch & PR Strategy` セクション | **不在** |
| `git checkout -b ...` の言及 | **0 件** |
| `git push` の言及 | **0 件** |
| `gh pr create` の言及 | **0 件** |
| `git log` / `git status` / `git commit` の言及 | あり（task 単位 commit のみ、branch 概念なし） |
| `Required Verification Before Starting Work` (line 60–74) | `git log --oneline -10` と `git status` のみ。current branch の確認は無し |
| `Task Completion Procedure` (line 134–168) | task 単位 commit のみ。push の言及なし |
| `When Session Limit is Approaching` (line 172–198) | TASK.md の commit のみ。branch / PR への言及なし |

つまり developer は **「main 上で直接 commit する agent」として読める** 状態に
なっている。

### `.claude/agents/delivery-flow.md` の現状

- Phase 5 (developer) の前後に branch entry / exit gate なし
- "Recovery from Session Interruption" (line 144–169) でも branch 切り替えへの
  言及なし
- `DELIVERY_RESULT.md` テンプレートに PR / branch 情報フィールドなし

### `.claude/agents/maintenance-flow.md` の現状

- Patch / Minor / Major plan のいずれも phase 列に branch / PR phase なし
- Major handoff の `MAINTENANCE_RESULT.md` テンプレートに branch / PR フィールドなし

### `.claude/orchestrator-rules.md` の現状

- "Phase Execution Loop" (line 326–342) にも branch entry / exit の記述なし
- "Common Error Handling" / "Approval Gate" / "Rollback Rules" にも branch 関連
  の記述なし

### `~/.claude/rules/project-rules.md`（user global）

- `## Git Rules` で `git add -A` 禁止 / commit 形式を規定（agent 定義と整合）
- `### Branch Strategy` で **GitHub Flow を要求** している
- しかし「**誰が** ブランチを切り PR を作るか」は agent 側で未定義

→ **宣言（policy） vs 実装（agent 定義）の不整合**。これが MAJ-002 の本質。

## §3 Proposed approach

issue #71 の Goal セクションで提示された 3 案を比較し、推奨を選定する。

### 比較表

| 評価軸 | 案 A: developer.md に明文化 | 案 B: orchestrator が gating | 案 C: GitHub Flow 緩和 |
|--------|------------------------------|--------------------------------|-------------------------|
| 変更範囲の小ささ | ◎ developer.md 1 ファイル | △ delivery-flow.md + maintenance-flow.md + orchestrator-rules.md の 3 ファイル | ◎ project-rules.md 1 ファイル |
| agent の責任分離の明確さ | ◎ 「設計＝analyst / 実装＋配信＝developer」で一貫 | ○ 「実装＝developer / 配信＝orchestrator」の追加分離。phase 跨ぎの branch 管理が必要 | × 責任分離以前の問題（policy 自体を弱める） |
| Aphelion 他フローとの整合 | ◎ Discovery (interviewer 等)・Operations (releaser 等) は元々 git 操作を持たないので影響なし | △ delivery-flow / maintenance-flow が新たに git ステート管理を持つことになり、Discovery / Operations との非対称が拡大 | × 全プロジェクトに main 直 commit を許容することになり、Operations の releaser とも矛盾 |
| 単独起動時 (standalone) の使いやすさ | ◎ `developer` を直接起動しても branch + PR まで完結 | × orchestrator なしで起動した場合 branch / PR が作られない | △ 「main 直 commit でも OK」だが OSS / 公開リポジトリでは事実上使えない |
| end-user project での再利用性 | ◎ user project の `project-rules.md` の "Branch Strategy" 設定をそのまま反映可能 | △ orchestrator が user 側ポリシーを読んで分岐させる二段階の実装が必要 | × user project 側で `Branch Strategy: GitHub Flow` を上書き設定しても、Aphelion 自身がそれを履行しない構造 |
| PR #66 の意図との整合 | ◎ #66 は「analyst から下流に移譲」が意図。下流＝developer は最も自然な解釈 | ○ #66 で議論されなかった「orchestrator に集約」という新しい設計を持ち込む | × #66 の議論前提（GitHub Flow を維持）を覆す |
| review (MAJ-002) への対応の十分さ | ◎ review が要求した「`## Branch & PR Strategy` セクションの追加」と完全一致 | ○ 異なる場所での解決だが review 指摘も解消 | △ "policy を変更したから記述不要" という形式的解消にとどまる |
| Aphelion の設計原則との整合 | ◎ "agent は責任の単位 / orchestrator はワークフロー管理" (aphelion-overview.md) を維持 | × orchestrator に実行責任を持ち込み「ワークフロー管理に集中」原則を侵食 | — 設計原則に対して中立 |

### 推奨: **案 A（developer.md に `## Branch & PR Strategy` セクションを追加）**

#### 推奨理由

1. **Aphelion の設計原則「agent = 責任の単位」と整合する**
   `aphelion-overview.md` は「Domain separation / File handoff / Session
   isolation」を掲げており、orchestrator の役割は **agent 起動順と承認ゲート管理** に
   限定されている。branch / PR は実装フェーズ内の git 操作の延長であり、これは
   実装 agent の責務とするのが自然。

2. **PR #66 の責任分離を完成させる**
   `analyst` が intake + design + GitHub issue + design note を担い、その後の
   実装に関わるすべて（commit / branch / push / PR）が `developer` に集中する
   設計は、フェーズ境界が agent 境界と一致しており理解しやすい。

3. **standalone 起動でも完結する**
   `delivery-flow` を経由せずに `developer` を直接起動しても、branch + PR まで
   作られる。これは Aphelion の "Independent invocation" 原則
   (aphelion-overview.md) と整合。

4. **変更範囲が最小**
   developer.md 1 ファイルへの追記で完結する。delivery-flow.md /
   maintenance-flow.md / orchestrator-rules.md には触れない。

5. **review 指摘 (MAJ-002) と完全一致**
   issue #71 の Found by 節が要求する「`## Branch & PR Strategy` セクション」と
   セクション名・配置場所が一致する。

#### 案 B が一理ある側面（採用しない理由を明示）

案 B には以下の妥当な動機があるが、本件では採用しない:

- **複数 developer phase 間で branch をまたぐかの判断**: delivery-flow の
  Phase 5 (developer 初回実装) と Phase 9 後の rollback (developer 再実装) が
  同一 branch を使うべきか、phase 単位で別 branch を切るべきかの設計余地はある。
  しかし、これは **「同一 PR 内で複数 commit を積む」既存の git 慣習で吸収できる**
  ため、orchestrator が branch 管理を持つ必要はない。
- **architect → scaffolder → developer のように複数 implementation 系 agent が
  順次起動する場合**: scaffolder と developer がそれぞれ branch を切ると分散して
  しまう懸念。これは案 A の §6 Acceptance criteria で「branch は最初に作成した
  agent が所有し、後続 agent は同一 branch を使用」と明文化することで解決する。

#### 案 C を採用しない理由

- `~/.claude/rules/project-rules.md` の "GitHub Flow を採用する" 宣言を覆すと、
  end-user project（OSS / 公開リポジトリ）に配信される agent 群がデフォルトで
  「main 直 commit OK」となり、ベストプラクティスから逸脱する。
- 直近の Aphelion 自身の運用で main 直 commit が増えているのは事実だが、これは
  「policy を緩めるべき」ではなく「agent 定義を policy に追従させるべき」が
  正しい方向性。

## §4 Open questions

§3 で推奨した案 A の前提で、developer 仕様化に伴う細部の決定事項を以下に列挙する。
本 design note の §6 で answer を確定する。

### Q1. Phase 内の commit 粒度

- 既存の developer.md は **task 単位で commit** する設計（line 162: "Always
  commit per task"）。これは維持する。
- → 1 つの `developer` 起動で複数の `git commit` が積まれ、最後にまとめて 1 つの
  PR を作るモデル。

### Q2. resume 時の branch 切り替え

- TASK.md があるが branch 名は記録されていない。resume 時に branch をどう特定
  するか:
  - **Answer**: `git status` で current branch を取得し、それが `main` でなければ
    そのまま継続。`main` だった場合は TASK.md の Phase 名から branch 名を再導出
    して checkout（既に PR 作成済みなら remote から fetch）。

### Q3. 複数 implementation 系 agent (architect → scaffolder → developer) の branch 管理

- delivery-flow Phase 3 (architect) は通常 ARCHITECTURE.md を生成するだけで
  branch を切る必要がない。Phase 4 (scaffolder) と Phase 5 (developer) が
  実装系。
- **Answer**: branch は **最初に実装系 agent が起動された時点で作成** し、後続
  agent は同一 branch を使用する。具体的には:
  - scaffolder が起動した場合、scaffolder が branch を作成する
  - scaffolder がスキップされた場合、developer が branch を作成する
  - rollback で developer が再起動された場合、既存 branch をそのまま使用する
- これは scaffolder.md にも同じ `## Branch & PR Strategy` セクションを追加する
  ことを意味するが、本 issue のスコープ（issue #71 の Out of scope に
  「end-user projects' workflow design」とあるが、Aphelion 自身の scaffolder
  は対象内）に含めるかは判断が必要。
- **本 issue でのスコープ**: 本 design note の §5 Document changes では
  **developer.md のみ** 変更する。scaffolder.md への波及は **別 issue として
  follow-up** （§7 Out of scope に明記）。理由は (a) MAJ-002 の指摘範囲が
  developer.md であること、(b) scaffolder は現状 Aphelion 自身では起動されて
  いないこと、(c) 1 PR の変更範囲を最小化したいこと。

### Q4. main session が auto mode で承認役を務める運用との整合

- 現状 Aphelion 自身では main session の user が auto mode で承認役を務め、各
  agent が直接 PR を作成している。発行された PR は user が手動でレビュー・マージ
  する。
- developer.md に `## Branch & PR Strategy` を追加しても、この運用は変わらない。
  PR 本文に `Closes #N` を含めることで、issue クローズ時の design note アーカイブ
  が機能する（既存 archive-closed-plans.yml）。

## §5 Document changes

推奨案（案 A）に従い、以下のファイルのみ変更する。

### 変更対象

| ファイル | 変更種別 | 概要 |
|---------|---------|-----|
| `.claude/agents/developer.md` | 追記 | `## Branch & PR Strategy` セクションを新規追加（後述の構造） |

### 変更しないファイル

- `.claude/agents/analyst.md` — PR #66 の決定（責務剥離）を維持
- `.claude/agents/delivery-flow.md` — orchestrator は branch 管理を持たない
- `.claude/agents/maintenance-flow.md` — 同上
- `.claude/orchestrator-rules.md` — 同上
- `~/.claude/rules/project-rules.md` — GitHub Flow ポリシーは現状維持
- `.claude/agents/scaffolder.md` — 別 issue で follow-up（§7 Out of scope）

### developer.md に追加するセクションの構造

挿入位置: `## Required Verification Before Starting Work` セクションの直後、
`## Progress Management via TASK.md` セクションの直前。

```markdown
---

## Branch & PR Strategy

This agent is responsible for branch creation, commit, push, and pull request
submission for the implementation phase. The upstream `analyst` agent only
produces design notes and a GitHub issue (per PR #66) — branch and PR creation
moves here.

### Branch Naming

| Issue Type / Source | Branch Name |
|---------------------|-------------|
| Bug fix | `fix/{short-description}` |
| Feature addition | `feat/{short-description}` |
| Refactoring | `refactor/{short-description}` |
| Direct invocation (no upstream issue) | `feat/{short-description}` (default) |

`{short-description}` uses lowercase ASCII with hyphens (e.g.,
`fix/login-session-timeout`). Derive it from the GitHub issue title or the
ARCHITECT_BRIEF passed in.

### Branch Lifecycle

1. **Branch creation (first implementation-tier agent only)**
   - If invoked from a flow orchestrator and another implementation-tier agent
     (e.g., `scaffolder`) has already created the branch in the same flow
     session, **reuse that branch**. Detect this by running
     `git rev-parse --abbrev-ref HEAD` and checking it is not `main`.
   - Otherwise, create the branch from latest `main`:
     ```bash
     git checkout main
     git pull origin main
     git checkout -b {branch-name}
     ```
   - If the branch already exists locally or on the remote, ask the user
     whether to reuse it.

2. **Commit (per task)**
   - See `## Progress Management via TASK.md` → `Task Completion Procedure`.
   - One commit per task on the working branch. Never commit to `main`
     directly.

3. **Push (after each commit, or batched at end of session)**
   ```bash
   git push -u origin {branch-name}
   ```
   The `-u` flag is required on first push only; subsequent pushes can use
   `git push`.

4. **Pull request creation (once, after the first commit reaches the remote)**
   - Create the PR after the first push so reviewers can follow progress.
   - PR body must include `Closes #N` (or `Linked Issue: #N` if a partial fix)
     so that `.github/workflows/archive-closed-plans.yml` can archive the
     matching design note on close.

   ```bash
   gh pr create \
     --title "{prefix}: {short summary}" \
     --body "$(cat <<'EOF'
   ## Summary
   {1–3 bullet points of what changed}

   ## Related Issue
   Closes #{issue-number}

   ## Linked Plan
   docs/design-notes/{slug}.md

   ## Test plan
   - [ ] {test plan checklist}
   EOF
   )" \
     --base main
   ```

5. **Resume (when TASK.md exists)**
   - Run `git rev-parse --abbrev-ref HEAD` first.
   - If the current branch is not `main`, continue on it.
   - If the current branch is `main`, derive the branch name from TASK.md's
     Phase / issue context and `git checkout` it (fetching from the remote if
     necessary). Do not silently start committing to `main`.

### When to skip branch / PR creation

- **Direct main-branch commits are prohibited** by `project-rules.md`'s
  "Branch Strategy" (GitHub Flow). Do not commit to `main` even for trivial
  fixes.
- The only exception is when the user explicitly overrides via project-rules.md
  (e.g., a private experimental repo with a `Branch Strategy: trunk-based`
  declaration). Detect this by reading `project-rules.md`'s `## Git Rules` →
  `### Branch Strategy` section. If the policy is not GitHub Flow, follow the
  policy declared there.

### Coordination with `gh` CLI

- Verify `gh auth status` succeeds before attempting `gh pr create`.
- If `gh` is unavailable, push the branch and report the PR URL the user
  should manually open (do not block the flow).
- If the PR already exists for the current branch (`gh pr view` succeeds),
  skip creation and add new commits via push only.

### AGENT_RESULT additions

The completion-time `AGENT_RESULT` block must include the following fields
when branch / PR were created:

```
BRANCH: {branch name}
PR_URL: {PR URL | skipped (gh unavailable) | reused (existing PR)}
```

These fields are additions to the existing `developer` AGENT_RESULT template
(they were intentionally removed from `analyst` in PR #66 — they belong here
now).
```

### 既存セクションへの最小限の追記

加えて、以下の既存セクションに **1 行ずつ** 言及を追加する:

#### `## Required Verification Before Starting Work` (line 60–74) に追加

```diff
 3. Check git status:
 ```bash
 git log --oneline -10
 git status
+git rev-parse --abbrev-ref HEAD   # current branch — must not be `main` before commits
 ```
```

#### `### Task Completion Procedure` (line 134–168) の `# 5. Git commit` 末尾に追加

```diff
 # 5. Git commit (always commit per task)
 git add {changed files}   # git add -A is prohibited (see .claude/rules/git-rules.md)
 git commit -m "{prefix}: {task name} (TASK-{N})

 - {bullet points of implementation details}
 - Related UC: UC-XXX (if applicable)"

+# 6. Push to remote (first commit creates upstream tracking)
+git push -u origin {branch-name}   # subsequent commits can use plain `git push`
```

#### `## Output on Completion (Required)` テンプレートに 2 行追加

```diff
 AGENT_RESULT: developer
 STATUS: success | error | suspended | blocked
 PHASE: {phase number executed}
 TASKS_COMPLETED: {completed task count} / {total task count}
+BRANCH: {branch name}
+PR_URL: {PR URL | skipped | reused}
 LAST_COMMIT: {output of git log --oneline -1}
 LINT_CHECK: pass | fail | skipped
```

#### `## Completion Conditions` に 2 項目追加

```diff
 - [ ] TASK.md has been generated or updated
 - [ ] All tasks are completed and git committed
+- [ ] Working branch was created (or reused) and never committed directly to main
+- [ ] Pull request was created (or reused / skipped with reason recorded)
 - [ ] Lint/format checks have passed (or noted as not installed)
 - [ ] Self-check against SPEC.md acceptance criteria is complete
 - [ ] Output block on completion has been emitted
```

## §6 Acceptance criteria

- [ ] `.claude/agents/developer.md` に `## Branch & PR Strategy` セクションが
  新規追加されている（§5 で示した構造を満たす）
- [ ] 挿入位置が `## Required Verification Before Starting Work` の直後、
  `## Progress Management via TASK.md` の直前である
- [ ] `## Required Verification Before Starting Work` の git 確認コマンドに
  `git rev-parse --abbrev-ref HEAD` が追加されている
- [ ] `### Task Completion Procedure` の最後に `git push -u origin {branch-name}`
  が追加されている
- [ ] `## Output on Completion (Required)` の AGENT_RESULT テンプレートに
  `BRANCH:` と `PR_URL:` の 2 フィールドが追加されている
- [ ] `## Completion Conditions` に branch / PR 関連の 2 項目が追加されている
- [ ] `analyst.md` / `delivery-flow.md` / `maintenance-flow.md` /
  `orchestrator-rules.md` には変更がない
- [ ] 以下の grep がそれぞれ 1 件以上ヒットする:
  ```bash
  grep -nE "## Branch & PR Strategy" .claude/agents/developer.md
  grep -nE "git checkout -b" .claude/agents/developer.md
  grep -nE "gh pr create" .claude/agents/developer.md
  grep -nE "Closes #" .claude/agents/developer.md
  ```
- [ ] 変更後の developer.md 全体を読み直して、文体・既存セクションとの整合性
  （markdown heading レベル、コードブロック言語指定、箇条書きスタイル）が保たれて
  いる
- [ ] 本 design note (`docs/design-notes/branch-pr-ownership.md`) の
  `> GitHub Issue:` ヘッダが #71 を指している（既に satisfied）

## §7 Out of scope

issue #71 の "Out of scope" 節を継承し、加えて本 analyst 分析で識別した除外項目を
列挙する。

### issue #71 から継承

- `analyst` への branch / PR 責任の再導入（PR #66 の決定を覆さない）
- end-user project のワークフロー設計（user 側 `project-rules.md` で上書き可能と
  する設計のみ確認し、user project 固有の workflow は本件で扱わない）
- CI/CD branch protection rule の実装

### 本分析で追加識別

- **`scaffolder.md` への同等セクション追加**（§4 Q3 で議論）
  - 理由: (a) MAJ-002 の指摘範囲が developer.md であること、(b) scaffolder は
    現状 Aphelion 自身では起動されていないこと、(c) 1 PR の変更範囲を最小化
    すること。
  - **follow-up issue として別途起票することを推奨**。タイトル例:
    `refactor: align scaffolder with developer's Branch & PR Strategy (#71 follow-up)`
- **delivery-flow.md / maintenance-flow.md への "first implementation agent
  creates branch" の明記**
  - 理由: 案 A 採用前提では orchestrator は branch 管理を持たない。ただし、複数
    implementation 系 agent を sequential に起動する場合の調整文言を flow
    orchestrator にも入れるかは将来検討。
- **`DELIVERY_RESULT.md` / `MAINTENANCE_RESULT.md` テンプレートへの PR URL
  フィールド追加**
  - 理由: 現状は AGENT_RESULT 単位の情報伝達でカバーされており、handoff file
    必須化は別議論。
- **rollback 時の commit/PR 戦略**（force push か revert commit か）
  - 理由: 既存 rollback rules は agent 動作を規定しており、git 操作の細部は
    GitHub Flow の慣習に従えば十分。

## §8 Handoff brief for developer

**対象ファイル**: `/home/ysato/git/aphelion-agents/.claude/agents/developer.md`

**変更内容**: §5 Document changes に示した 5 つの変更を適用する。

1. `## Branch & PR Strategy` セクション全文を `## Required Verification Before
   Starting Work` の直後（line 80 付近、`---` 区切りの直後）に挿入する
2. `## Required Verification Before Starting Work` の git status コマンド群に
   `git rev-parse --abbrev-ref HEAD` を 1 行追加
3. `### Task Completion Procedure` の `# 5. Git commit` ブロック直後に
   `# 6. Push to remote` ブロック（2 行）を追加
4. `## Output on Completion (Required)` の AGENT_RESULT テンプレートに `BRANCH:`
   `PR_URL:` の 2 フィールドを `TASKS_COMPLETED:` の直後に追加
5. `## Completion Conditions` に branch / PR 関連の 2 項目を追加

**手順の指針**:

1. 作業ブランチ作成: `refactor/branch-pr-ownership`（命名規則は本 design note
   §5 で developer 自身に対して定義する規則と一致）
   ```bash
   git checkout main
   git pull origin main
   git checkout -b refactor/branch-pr-ownership
   ```

2. `.claude/agents/developer.md` に対して上記 5 件の変更を Edit で適用

3. 変更後の整合性確認:
   ```bash
   # 新セクションの存在確認
   grep -n "^## Branch & PR Strategy" .claude/agents/developer.md
   # branch/PR 関連コマンドの存在確認
   grep -nE "git checkout -b|gh pr create|Closes #" .claude/agents/developer.md
   # AGENT_RESULT への BRANCH/PR_URL フィールド追加確認
   grep -nE "^BRANCH:|^PR_URL:" .claude/agents/developer.md
   # 他ファイルが無変更であることの確認
   git diff --stat .claude/agents/analyst.md .claude/agents/delivery-flow.md \
                   .claude/agents/maintenance-flow.md .claude/orchestrator-rules.md
   # → 上の diff は何も出力されないこと
   ```

4. commit:
   ```
   refactor: document branch/PR creation ownership in developer.md (#71)

   - Add `## Branch & PR Strategy` section to developer.md
   - Restore BRANCH / PR_URL fields to developer's AGENT_RESULT
     (intentionally removed from analyst in PR #66 — they belong to developer)
   - Add `git rev-parse --abbrev-ref HEAD` to startup verification
   - Add `git push -u origin` step to per-task completion procedure
   - Add 2 branch/PR-related items to Completion Conditions
   - No changes to analyst.md / delivery-flow.md / maintenance-flow.md /
     orchestrator-rules.md (case-A scope per docs/design-notes/branch-pr-ownership.md)

   Closes #71

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

5. push + PR 作成:
   ```bash
   git push -u origin refactor/branch-pr-ownership
   gh pr create \
     --title "refactor: document branch/PR creation ownership in developer.md (#71)" \
     --body "$(cat <<'EOF'
   ## Summary
   - Add `## Branch & PR Strategy` to `.claude/agents/developer.md` codifying branch creation, push, and `gh pr create` flow.
   - Restore `BRANCH` / `PR_URL` to developer's `AGENT_RESULT` (these were removed from `analyst` in #66; this PR places them at their canonical owner).
   - Closes the documentation gap flagged as MAJ-002 in the main-branch consistency review.

   ## Related Issue
   Closes #71

   ## Linked Plan
   docs/design-notes/branch-pr-ownership.md

   ## Test plan
   - [ ] grep checks pass (see plan §6 Acceptance criteria)
   - [ ] `git diff --stat` shows no changes outside `.claude/agents/developer.md`
   - [ ] developer.md still renders cleanly (markdown heading hierarchy preserved)
   EOF
   )" \
     --base main
   ```

**設計余地**: 小。§3 で案 A を選定済み、§5 で挿入位置・差分を確定済み。developer
が判断するのは「セクション本文の細かい言い回し」「コードブロック内の bash の
スタイル整形」のみ。

**検証コマンド**: §6 Acceptance criteria の grep 群と §8 手順 3 の整合性確認
コマンドを使用すること。

**留意点**:

- 本 PR は、developer.md に追加する `## Branch & PR Strategy` セクションを
  developer 自身が **同 PR の作業手順として実践** する循環構造になっている。
  これは意図的（dogfooding）であり、PR 作成過程でセクション記述の妥当性を実証する
  機会となる。仕様と実践に乖離が見つかった場合、developer は `STATUS: blocked`
  で報告すること（BLOCKED_TARGET: analyst）。
- §7 で identified した follow-up（scaffolder.md への波及）は本 PR に **含めない**。
  別 issue として user に提案することは可能だが、起票は本タスク完了後の判断と
  する。
