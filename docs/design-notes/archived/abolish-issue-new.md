# refactor: abolish /issue-new and consolidate intake into /analyst

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Intake by: filed manually (analyst, no `/issue-new` chain since this issue **abolishes** `/issue-new`)
> Analyzed by: analyst (2026-04-26)
> Implemented in: TBD
> GitHub Issue: [#62](https://github.com/kirin0198/aphelion-agents/issues/62)
> Next: developer (delivery-flow handoff to be decided by main session)

---

## 1. Background — why this issue exists

`/issue-new` は #51 / PR #52 で「memo dump 化していた analyst の intake を構造化する」ために導入され、
#59 / PR #60 で **`/issue-new` (intake gate) → `/analyst` (deep analysis)** の 2 段構成にリ設計された
(設計文書: `docs/design-notes/archived/issue-new-redesign.md`)。

しかし運用してみると **「フローが複雑になった」** という反応がユーザから上がっている。具体的には:

1. **2 段階に分かれたことによる段取り煩雑** — 単発で「issue 起票して」と言いたいのに `/issue-new` →
   結果を確認 → `/analyst` の 2 コマンド起動が必要。実体としては intake と analysis を分離する必然性が
   薄く、analyst が intake もこなせれば 1 段階で済む。
2. **Phase B の type-specific 質問が多い** — bug 6 問・feature 6 問・refactor/chore/docs/ci/ops 5 問。
   これは redesign 時に「memo 品質の issue を防ぐ」ために加えたものだが、実際には軽い修正でも
   毎回 5–6 問答える必要があり、heavyweight 化の主因になっている。

結果として **redesign の本来の目的（memo 品質の防止）は維持しつつ、2 段構成と質問数の hard-coding を
やめ、`/issue-new` を廃止して `/analyst` 単独に再統合する** のが本 issue のスコープである。

## 2. Scope of abolition

### 2.1 削除対象

| ファイル | 状態 | 処理 |
|---|---|---|
| `.claude/commands/issue-new.md` | 現行コマンド本体 (451 行) | **削除** |

### 2.2 編集対象

| ファイル | 編集内容 |
|---|---|
| `.claude/commands/aphelion-help.md` | "Shortcuts" 表から `/issue-new` 行を削除し、`/analyst` の説明を更新（issue 起票も担う旨を追記） |
| `.claude/agents/analyst.md` | "Handoff from `/issue-new`" セクション（行 65–143）を削除し、軽量化された intake の取り扱いを `/analyst` 内に統合 |

### 2.3 影響なし（編集不要）

| 対象 | 理由 |
|---|---|
| `.github/workflows/archive-closed-plans.yml` | `/issue-new` を直接参照しない。`docs/design-notes/<slug>.md` の header に `GitHub Issue: [#N](...)` または `Issue #N` が含まれていれば動く（grep パターン: `(GitHub Issue:｜Issue) \[?#${n}\b`）。analyst が引き続き同形式の header を書けば自動 archive は機能する |
| `.claude/orchestrator-rules.md`, `.claude/orchestrators/`, `docs/wiki/` | `/issue-new` への参照ゼロ件（grep 確認済み） |
| `src/.claude/` | ディレクトリは `README.md` / `rules/` / `settings.local.json` のみ。`commands/`・`agents/` は存在しない。`/issue-new` への参照ゼロ件 |
| `docs/design-notes/archived/issue-new-redesign.md`, `docs/design-notes/archived/issue-new-command-and-rename.md` | archive 済み・編集禁止（履歴として保全） |

### 2.4 Grep 結果（HEAD `9bc00e5` 時点）

`grep -rn "issue-new\|issue_new"` でヒットした active なファイル:

- `.claude/commands/issue-new.md` (削除対象)
- `.claude/commands/aphelion-help.md` 1 行 (編集対象)
- `.claude/agents/analyst.md` 9 行 (編集対象、§Handoff from `/issue-new` ブロック)
- `docs/design-notes/orphan-design-notes.md` 6 行 (Issue #61 の本文。**本 issue では編集しない**)
- `docs/design-notes/archived/issue-new-redesign.md` 28 行 (archived)
- `docs/design-notes/archived/issue-new-command-and-rename.md` 12 行 (archived)

archived 配下は read-only。orphan-design-notes.md は #61 で別途処理。

## 3. What survives — features that move into `/analyst`

`/issue-new` の **本質的に有用だった部品** は以下の 3 点。これらは `/analyst` に軽量化して統合する。

### 3.1 TBD 禁止ルール（軽量化版）

旧: Phase B の必須回答ごとに `TBD / tbd / ? / 不明 / 未定 / なし` を弾く。

新: **analyst 自身の最初の AskUserQuestion で「考えていない問い」が回答に出た場合のみ、その問いだけ
再質問する。** 質問数は最低限（症状 / 期待動作 / ゴール程度）に絞る。type 別 5–6 問の hard-coding は廃止。

### 3.2 design note と GitHub issue の関連付け

旧: `/issue-new` が `docs/design-notes/<slug>.md` を作成し、issue body に `Design note: docs/design-notes/<slug>.md`
を記載、後段の `archive-closed-plans.yml` workflow が PR の `Closes #N` で archive へ移動。

新: **同じ仕組みを `/analyst` 単独起動時に維持する。** analyst は引き続き
`docs/design-notes/<slug>.md` を作成し、issue body に `Linked Plan: docs/design-notes/<slug>.md`
を含める。doc header の `GitHub Issue: [#N](...)` 形式も維持し、`archive-closed-plans.yml` の grep
パターンが拾えるようにする。

### 3.3 `Unknown — to be confirmed by analyst` セントリネル

旧: `/issue-new` から `/analyst` への引き継ぎポイントを明示するために導入。

新: **削除する。** 1 段階に統合された結果、intake と analysis が同一セッション内で起こるため、
セントリネルで自分自身に引き継ぐ必要がない。analyst が「不明な点はその場で重ねて訊く」だけで足りる。

## 4. Out of scope（明示）

以下は **本 issue では扱わない**:

1. **既存 open issues #53–#58 の品質改善** — `issue-new-redesign.md` §4 の判断（書き直しコストに
   見合わない、open のまま放置・analyst が個別に拾い上げる）を継承する。本 issue では一切編集しない。
2. **Issue #61（orphan design notes 7 件 + commit step 追加）の作業** — Issue #61 のスコープを「commit
   step 追加」部分削除・orphan files の commit のみに調整するのは、本 issue **完了後** にユーザ
   またはメインセッションが #61 をリ評価する際に行う（本 issue 内で #61 の本文は編集しない）。
3. **過去産出の design note の retro-fit** — 既に `/issue-new` 経由で作られた `docs/design-notes/`
   配下の文書（および archived 配下）はそのまま保全する。
4. **memo-quality 防止の追加機構** — `/issue-new` の Phase B 質問数で行っていた品質ガードを
   alternative に置き換える設計（テンプレート化、checklist 等）は本 issue のスコープ外。analyst の
   軽量再質問のみで運用してみて、足りなければ別 issue で追加する。

## 5. Detailed approach

### 5.1 ファイル削除

```bash
git rm .claude/commands/issue-new.md
```

### 5.2 `.claude/commands/aphelion-help.md` の編集

- "Shortcuts" 表から `/issue-new` 行を削除する。
- "Standalone agents" 表の `/analyst` 行を以下のように改訂する:

  | `/analyst` | Classify and analyze an issue (bug / feature / refactor) on an existing project; creates the planning doc and GitHub issue |

  ※ 「creates the planning doc and GitHub issue」を追記して、`/issue-new` を呼ぶ必要がないことを明示。

### 5.3 `.claude/agents/analyst.md` の編集

- 行 65–143 の "Handoff from `/issue-new` (intake → analysis)" セクション全体を削除する。
- 削除箇所に **新セクション "Intake during standalone invocation"** を追加し、以下を明文化:
  - 受領した依頼内容を最初に整理し、`docs/design-notes/<slug>.md` の §1–§4 を埋める。
  - 不足する点は AskUserQuestion で **最低限の問い** のみ重ねて訊く（症状 / 期待動作 / ゴール程度）。
    type-specific の 5–6 問テンプレートは持たない。
  - 回答が "TBD" / "?" / "不明" / "未定" / "なし" 等の sentinel に該当する場合のみ、その問いだけ
    再質問する。それ以外は短くても受理する。
  - 後続フェーズ（architect / developer）への handoff は従前どおり ARCHITECT_BRIEF / Step 7 PR 作成で行う。
- 行 293–298 の "Note: When the user invoked `analyst` via the `/issue-new` → `/analyst`
  two-stage flow" 注記を削除する（2 段フローが消えるため）。
- ヘッダコメントの「Used in the following situations」リストには既に「making changes to a project
  with existing SPEC.md or ARCHITECTURE.md」が含まれており、追加修正は不要。

### 5.4 design note header 形式の統一

analyst が新規に作成する `docs/design-notes/<slug>.md` は以下の header lines を持つ:

```
> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Intake by: analyst (<YYYY-MM-DD>)
> Analyzed by: analyst (<YYYY-MM-DD>)
> Implemented in: TBD
> GitHub Issue: [#N](https://github.com/<owner>/<repo>/issues/N)
> Next: <architect | developer>
```

`GitHub Issue:` 行の形式 `[#N](...)` は **`archive-closed-plans.yml` の grep パターンが拾える形** を
維持する（既存と同じ）。これが本 issue で archive workflow を編集しなくて良い根拠。

## 6. Document / code impact

| ファイル | 変更内容 |
|---|---|
| `.claude/commands/issue-new.md` | **削除** |
| `.claude/commands/aphelion-help.md` | `/issue-new` 行削除、`/analyst` 行に「creates the planning doc and GitHub issue」追記 |
| `.claude/agents/analyst.md` | "Handoff from `/issue-new`" セクション削除、"Intake during standalone invocation" セクション追加、行 293–298 の注記削除 |
| `docs/design-notes/abolish-issue-new.md` | **本ファイル（新規）** |
| SPEC.md / ARCHITECTURE.md / UI_SPEC.md | 該当なし（Aphelion repo にこれらは存在しない） |
| `.github/workflows/archive-closed-plans.yml` | 編集不要（§2.3 参照） |

## 7. Migration / rollout plan

1. 本 design note と GitHub Issue を作成（本セッション）。
2. 別セッションで developer が以下を順に実施:
   1. `.claude/commands/issue-new.md` を `git rm`。
   2. `.claude/commands/aphelion-help.md` を §5.2 のとおり編集。
   3. `.claude/agents/analyst.md` を §5.3 のとおり編集。
   4. PR を作成（タイトル例: `refactor: abolish /issue-new and consolidate intake into /analyst`）。
   5. PR body に `Closes #<本 issue 番号>` を含めて、merge 時に本 design note が
      `docs/design-notes/archived/` へ自動移動するようにする。
3. 過去に `/issue-new` で作成された design note（active なもの）は手を加えない — 既存 doc 内の
   "Intake by: /issue-new" 等の文字列は履歴として残す。

## 8. Acceptance criteria

1. `.claude/commands/issue-new.md` が存在しない（`git ls-files .claude/commands/issue-new.md` 空）。
2. `.claude/commands/aphelion-help.md` から `/issue-new` 行が消え、`/analyst` 行に "creates the
   planning doc and GitHub issue" 等の更新が入っている。
3. `.claude/agents/analyst.md` から "Handoff from `/issue-new`" セクションが完全に削除され、
   代わりに "Intake during standalone invocation" 等のセクションが追加されている。
4. `grep -rn "issue-new" .claude/ docs/wiki/ src/ .github/ docs/design-notes/*.md` の active 部分
   （archived/ を除く）の該当が **本 design note 自身** だけになる。
5. `analyst` を単独起動した場合、最低限の問いのみで `docs/design-notes/<slug>.md` と GitHub Issue
   が生成され、issue body に `Linked Plan: docs/design-notes/<slug>.md` が含まれる。
6. PR merge 後、`archive-closed-plans.yml` workflow が起動し、本 design note が
   `docs/design-notes/archived/abolish-issue-new.md` に移動している。
7. 既存 open issues #53–#58 と orphan files 7 件への変更がない（本 issue のスコープ外）。

## 9. Risks and open questions

| リスク | 対応 |
|---|---|
| **memo dump 回帰**: `/issue-new` の Phase B 質問数を削った結果、再度 memo 品質の design note が増える | analyst が AskUserQuestion で最低限の問いを必ず投げるよう強制。質問数を増やす alternative は未来の別 issue で再導入可能 |
| **archive workflow 不発**: header 形式が崩れると `archive-closed-plans.yml` の grep が外れる | §5.4 で header 形式を明文化。CI 失敗時はマニュアル `git mv` でリカバリ可能 |
| **既存ユーザの混乱**: `/issue-new` を覚えたユーザがコマンドが消えていることに戸惑う | `aphelion-help.md` の `/analyst` 説明を更新し、`/issue-new` の役割が `/analyst` 単独に集約されたことを明示 |
| **PR #60 の作業との衝突**: 本 issue の作業対象は PR #60 と同じファイル群（`.claude/commands/issue-new.md`, analyst.md, aphelion-help.md） | PR #60 は既に main へ merge 済み（commit `9bc00e5`）。HEAD ベースで作業するため衝突なし |

### Open questions

- **None at filing time.** 本セッションのユーザ確認 4 問で論点は確定済み。
