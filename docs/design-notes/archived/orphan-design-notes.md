# chore: commit orphan design notes for #53–#58

> 最終更新: 2026-04-26
> 更新履歴:
>   - 2026-04-26: 初版作成（旧 `/issue-new` のコミットステップ欠落への対処として）
>   - 2026-04-26: スコープ縮小（PR #63 で `/issue-new` を廃止したため、コマンド仕様修正は本 issue から削除し commit のみに絞る）
> Reference: current `main` (HEAD `487599e`, 2026-04-26 — PR #63 merged)
> GitHub Issue: [#61](https://github.com/kirin0198/aphelion-agents/issues/61)
> Author: analyst (design-only phase)
> Next: developer

---

## 1. Problem

旧 `/issue-new` (#51 / PR #52 で導入、#59 / PR #60 で再設計、#62 / PR #63 で廃止) は AskUserQuestion で集めた情報を元に `docs/design-notes/<slug>.md` をローカル disk に書き、`gh issue create` で GitHub Issue を作るところまでは行うが、**生成したファイルを git に commit しなかった**。

その結果、2026-04-26 に Issue #53–#58 を立てた際に対応する design note 6 件がローカルで untracked のまま残った。これに加えて本 issue の design note (`orphan-design-notes.md`) 自身も同じ理由で untracked。合計 7 件:

```
docs/design-notes/compliance-auditor.md             (#56)
docs/design-notes/doc-flow.md                       (#54)
docs/design-notes/english-rollout-residuals.md      (#57)
docs/design-notes/orphan-design-notes.md            (#61, 本ファイル)
docs/design-notes/performance-optimizer.md          (#58)
docs/design-notes/readme-readability-wiki-links.md  (#53)
docs/design-notes/remove-pm-shortcut.md             (#55)
```

GitHub issue body は `Linked Plan: docs/design-notes/<slug>.md` を参照しているが、そのパスは origin/main にも他のブランチにも存在しないため、**他の利用者がリンクを開いても 404 になる**。

## 2. Root cause

旧 `.claude/commands/issue-new.md` の Step 4–6 にはファイル書き込みと `gh issue create` のみ規定されており、`git add` / `git commit` ステップが欠落していた。

PR #63 で `/issue-new` 自体は廃止され、その役割は `/analyst` に統合された。新 `/analyst` (Step 7) は **commit / push / PR 作成までを単一フローでカバー** しているため、**今後同じクラスの orphan は発生しない**。本 issue の対象は `/issue-new` 廃止前に既に発生していた 7 件の救済に限定される。

## 3. Proposed approach

1 件の `chore:` コミットでまとめて main にコミットする:

```bash
git checkout main
git pull origin main
git checkout -b chore/commit-orphan-design-notes
git add docs/design-notes/{compliance-auditor,doc-flow,english-rollout-residuals,\
orphan-design-notes,performance-optimizer,readme-readability-wiki-links,\
remove-pm-shortcut}.md
git commit -m "chore: commit orphan design notes for #53-#58, #61 (#61)"
git push -u origin chore/commit-orphan-design-notes
gh pr create --title "chore: commit orphan design notes for #53-#58, #61" \
  --body "Closes #61"
```

各 design note の中身は memo 品質だが、`issue-new-redesign.md` §4 の判断（書き直しコストに見合わない、open のまま放置）に従いそのままコミットする。analyst が個別に拾う際に richer に書き換える。

## 4. Acceptance criteria

1. orphan 7 件の design note が main にコミットされ、`git ls-files docs/design-notes/*.md` で見える状態になる
2. `git status -s | grep design-notes` がゼロ件 (untracked design note なし)
3. 各 issue (#53–#58, #61) body の `Linked Plan: docs/design-notes/<slug>.md` リンクが GitHub UI 上で 404 にならず到達できる
4. archived design note (`docs/design-notes/archived/`) に変更がない (read-only ポリシー)
5. PR merge 後、archive workflow が `Closes #61` を踏んで `orphan-design-notes.md` を `archived/` に移動する

## 5. Out of scope

- `/issue-new` 仕様への commit ステップ追加 — `/issue-new` 自体が PR #63 で廃止済みのため不要。`/analyst` (新版) は既に commit step を持つ
- 旧 design note 6 件 (#53–#58) の品質改善 — `issue-new-redesign.md` §4 推奨どおり open のまま。analyst が個別に拾った際に書き換える
- `gh issue create` 後に何らかの理由で commit が失敗した場合のロールバック戦略 — 現状は手動対応で十分

## 6. Risks

- **本 design note 自体も filing 時点で orphan になる** — 仕様上避けられない（本 issue の resolution PR がコミットする）。`Closes #61` を踏むことで archive workflow が `archived/` へ移動する
- 7 件のうち本ファイル以外の 6 件は内容が memo 品質。レビューア向けには「§5 Out of scope に従い書き換えない」旨を PR body で明示する
