> Last updated: 2026-05-15
> GitHub Issue: [#128](https://github.com/kirin0198/aphelion-agents/issues/128)
> Authored by: analyst (2026-05-15)
> Next: developer (architect skip — small docs + agent definition change, no architectural decision)

# TASK.md リセット規則の強制 (developer agent + wiki + main クリーンアップ)

## 1. Background / motivation

`src/.claude/rules/document-versioning.md` §"TASK.md Lifecycle" には、developer がフェーズ完了時に `TASK.md` を空のプレースホルダーへリセットする義務が明記されている。

> **On phase completion**, reset TASK.md to the empty template (one-line placeholder) so the next `developer` invocation starts from a clean state. Commit the reset as part of the phase's final commit or as a trailing `chore:` commit.
> - Rationale: a completed TASK.md with every checkbox ticked is not a design artifact — the phase's analysis and outcome belong in the matching `docs/design-notes/<slug>.md` planning document. Leaving a completed TASK.md in the repo risks the next `developer` session misreading it as a resume target.

しかし、Issue #118 の PR-1 / PR-2 / PR-3 の全 developer セッションでこの規則が違反され、現在 main の `TASK.md` には PR-2 の完了済みタスク 7 件が残置されている。これはユーザの想定 (「main では空であるべき」) と一致しない。

## 2. Root cause analysis

### 2.1 ルール側

`document-versioning.md` の規定は明確で、修正不要。

### 2.2 エージェント側 (root cause)

`.claude/agents/developer.md` の Completion Conditions (l.323-331) は以下のみ:

- [ ] TASK.md has been generated or updated
- [ ] All tasks are completed and git committed
- [ ] A working branch has been created from main and changes pushed
- [ ] A pull request has been created (or skipped reason recorded)
- [ ] Lint/format checks have passed (or noted as not installed)
- [ ] Self-check against SPEC.md acceptance criteria is complete
- [ ] Output block on completion has been emitted

**「TASK.md をリセット」** の項目がない。`document-versioning.md` の規則は別ファイルにあり auto-load されるが、developer の手続き内に reset 手順が組み込まれていないため、エージェントは Phase 完了時に reset を実行しない。

### 2.3 wiki 側

- `docs/wiki/{en,ja}/Getting-Started.md` l.278 (EN) / l.265 (JA) は **idle state の結果のみ** 記載 ("empty placeholder file — this is the correct idle state, not a sign of incomplete work")。
- *idle state にする責任* (developer の reset 義務) は記載なし。
- `Agents-Delivery.md` の developer 説明も "Manages progress via TASK.md (supports resume)" のみで、reset 義務に触れない。
- `Rules-Reference.md` は document-versioning.md ルールを一覧に載せるが、TASK.md lifecycle の詳細は本体ルールにしかない。

つまり**ルール自体は document-versioning.md にあるが、enforcement point (developer agent の checklist) と user-facing doc (wiki) の両方に lifecycle が浸透していない**。

## 3. 過去の経緯 — Issue #80 との関係

Issue #80 (closed 2026-04-30) は本領域に近い議論を行った:

- §5.2 で 3 つの Option を比較
  - **Option A** — 現状維持 (placeholder 運用継続)
  - Option B — Phase 終了時に削除する運用に変更
  - Option C — Aphelion 自身では dogfooding 停止
- §5.2 末尾の決定: **Option A 採用、Option C は別 issue 化せず棄却**
- §8.2 Out of scope: `developer.md` / `document-versioning.md` / `git-rules.md` 編集

つまり #80 は意図的にエージェント側の enforcement を後回しにしたが、その後の運用 (PR-1/2/3) で違反が顕在化した。本 issue はその enforcement gap を閉じる。

#80 の決定 (Option A) は変更しない — TASK.md の dogfooding は継続。本 issue は規則の **enforcement のみ** 強化する。Option C の再検討はしない。

## 4. Proposed approach

### 4.1 修正対象ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `TASK.md` (root) | 修正 | 7 タスクチェック済み状態 → 空プレースホルダーへリセット |
| `.claude/agents/developer.md` | 修正 | Task Completion Procedure に「フェーズ最終タスクの場合は reset を含めて commit」を追記。Completion Conditions に新しいチェックボックスを追加 |
| `docs/wiki/en/Getting-Started.md` | 修正 | "Note on TASK.md" 段落を拡張して lifecycle (生成 → tick → **reset at phase end**) を記述 |
| `docs/wiki/ja/Getting-Started.md` | 修正 | EN の同期翻訳。Bilingual Sync 必須 (language-rules.md §3.2) |
| `docs/wiki/en/Agents-Delivery.md` | 修正 | developer 行に「resets TASK.md at phase completion」を追加 |
| `docs/wiki/ja/Agents-Delivery.md` | 修正 | EN の同期翻訳 |
| `CHANGELOG.md` | 修正 | Unreleased エントリ追加 |

### 4.2 NOT 変更対象

- `src/.claude/rules/document-versioning.md` — 規則自体は正しい。
- `src/.claude/rules/git-rules.md` — commit granularity の話で reset の話ではない。
- `Rules-Reference.md` — TASK.md lifecycle の場所は document-versioning.md であり、wiki 側は要約で十分 (#117 の対象外宣言と整合)。
- Hook / CI による自動 enforcement — 違反が再発した場合の将来の選択肢として残す。
- `agent-communication-protocol.md` AGENT_RESULT format — 追加フィールド不要。

### 4.3 developer.md 修正案

#### Task Completion Procedure (l.153-) の末尾に追加

```markdown
### Phase Completion Reset (required, execute once per phase)

After the FINAL task in a phase is committed, **reset `TASK.md` to the empty
placeholder template** so the next developer invocation starts from a clean
state. This is required by `.claude/rules/document-versioning.md` §"TASK.md
Lifecycle".

```bash
# 1. Overwrite TASK.md with the placeholder template
cat > TASK.md <<'EOF'
# TASK.md

> Empty placeholder. The `developer` agent will populate this file when the
> next implementation phase begins. See `.claude/rules/document-versioning.md`
> §"TASK.md Lifecycle" for the reset rule.
EOF

# 2. Commit the reset as part of the phase's final commit or as a trailing chore: commit
git add TASK.md
git commit -m "chore: reset TASK.md at phase completion"
git push
```

Rationale (per document-versioning.md): a fully-ticked TASK.md is not a design
artifact — the phase's analysis and outcome belong in
`docs/design-notes/<slug>.md`. Leaving a completed TASK.md risks the next
`developer` session misreading it as a resume target.
```

#### Completion Conditions (l.323-) への追加

```markdown
- [ ] TASK.md has been reset to the empty placeholder template (if this commit
      concludes the phase)
```

### 4.4 wiki 修正案 — Getting-Started.md "Note on TASK.md" 拡張

現行:

> **Note on `TASK.md`:** The `developer` agent creates and updates `TASK.md`
> during a Delivery phase to track per-task progress. When no phase is running,
> `TASK.md` sits at the repository root as an empty placeholder file — this is
> the correct idle state, not a sign of incomplete work.

修正後 (lifecycle を明示):

> **Note on `TASK.md`:** `TASK.md` follows a 3-state lifecycle:
> 1. **At phase start** — `developer` generates `TASK.md` populated with the
>    task checklist from `ARCHITECTURE.md`.
> 2. **During the phase** — `developer` ticks completed checkboxes and updates
>    the "Recent Commits" section after each task.
> 3. **At phase completion** — `developer` resets `TASK.md` to an empty
>    placeholder so the next phase starts clean. A fully-ticked `TASK.md`
>    committed to `main` is a rule violation (see
>    `.claude/rules/document-versioning.md` §"TASK.md Lifecycle"); the phase's
>    analysis and outcome belong in `docs/design-notes/<slug>.md` instead.
>
> An empty `TASK.md` at the repository root is the correct idle state, not a
> sign of incomplete work.

### 4.5 wiki 修正案 — Agents-Delivery.md

現行 developer 行 (EN l.85):

> **Responsibility**: ... Manages progress via TASK.md (supports resume).
> Commits per task, runs lint/format checks after each task.

修正後:

> **Responsibility**: ... Manages progress via TASK.md (supports resume).
> Commits per task, runs lint/format checks after each task. **Resets TASK.md
> to the empty placeholder at phase completion** per
> `document-versioning.md` §"TASK.md Lifecycle".

JA も同等の追記。

## 5. Acceptance criteria

- [ ] main ブランチの `TASK.md` が空のプレースホルダー (1 行 Phase header + 短い説明) になっている
- [ ] `.claude/agents/developer.md` の Completion Conditions に reset チェックボックスがある
- [ ] `developer.md` 内に Phase Completion Reset の具体的な bash 手順が記載されている
- [ ] `docs/wiki/en/Getting-Started.md` と `docs/wiki/ja/Getting-Started.md` の TASK.md 段落が lifecycle 3 段階を記述している
- [ ] `docs/wiki/en/Agents-Delivery.md` と `docs/wiki/ja/Agents-Delivery.md` の developer 行に reset 義務が追加されている
- [ ] `scripts/check-readme-wiki-sync.sh` が pass する (heading parity)
- [ ] `CHANGELOG.md` Unreleased エントリが追加されている

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| developer agent prompt 改変で既存 prompt 動作が変わる | 中 — phase 中の commit 手順は変更しない。Completion Conditions と末尾の専用節のみ追加 | 既存節は触らず、追記のみで対応 |
| wiki bilingual sync failure | 低 | `scripts/check-readme-wiki-sync.sh` で機械的に検証 |
| 将来の TASK.md フォーマット変更で wiki / agent definition が drift | 中 | placeholder template は `.claude/rules/document-versioning.md` を参照させる形にして二重メンテを避ける |

## 7. Open questions (deferred)

1. **CI / hook による reset enforcement**: Phase 完了 commit に TASK.md reset が含まれているかを PR で機械チェックする仕組み (例: PR body に `Closes #N` がある場合、TASK.md が空プレースホルダーであることを require) は本 issue では扱わない。違反が再発した場合に future issue として検討。
2. **`agent-communication-protocol.md` への TASK_MD_RESET フィールド追加**: AGENT_RESULT に reset 済みかを記録するフィールドを追加する案。本 issue では agent 内 checklist のみで十分とする。

## 8. Handoff brief for developer

- **着手順**: 単一 PR で 7 ファイル変更 + main の TASK.md reset を実施
- **必須読み込み**:
  - 本 design note
  - `src/.claude/rules/document-versioning.md` (規則本体)
  - `.claude/agents/developer.md` (修正対象, 特に l.153-220 と l.323-331)
  - `docs/wiki/{en,ja}/Getting-Started.md` (該当段落 l.278 付近)
  - `docs/wiki/{en,ja}/Agents-Delivery.md` (developer 行)
- **注意点**:
  1. **Bilingual sync**: wiki EN/JA は Same-PR 必須。`scripts/check-readme-wiki-sync.sh` を必ず通すこと
  2. **TASK.md placeholder format**: 過度な情報を入れず、`document-versioning.md` への参照行のみとする (二重メンテ防止)
  3. **PR body に `Closes #128`** を含めること (auto-archive を発火させる)
  4. **本 PR 自身も Phase Completion Reset の対象** — 最後のコミットで TASK.md を placeholder に reset すること。**メタな dogfooding の機会** であり、本 PR で reset を忘れたら issue 自体の存在意義が崩れる
