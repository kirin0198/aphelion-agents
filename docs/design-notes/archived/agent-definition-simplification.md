> Last updated: 2026-05-15
> GitHub Issue: [#131](https://github.com/kirin0198/aphelion-agents/issues/131)
> Authored by: analyst (2026-05-15, refined 2026-05-15 per user "minimum addition" constraint)
> Promoted from: docs/design-notes/proposals/agent-definition-simplification-memo.md
> Related: [token-reduction.md](./token-reduction.md) (#132) — 当初想定の衝突は本書 §"Refined design" で解消済
> Next: architect (mandatory — §① AGENT_RESULT slim が orchestrator パーサ契約に影響)

# エージェント定義ファイルの重複削減 (refined: 追加 ~6 行 / 削減 ~480 行)

本書は user 起票の proposal を analyst が promotion したもの。
当初 §② は「~390 行を aphelion-overview.md に追加」と書かれていたが、
2026-05-15 user 指示「#132 の目的が削減のため、追加する行を最小限で最大効率となるように」
を受けて **追加 6 行 / 削除 ~480 行 (net -474 行)** の Refined design に更新した。
元の memo 由来 §③〜⑥ も保持するが、PR-1 スコープは §② + §① に限定する。

## Refined design summary (2026-05-15 user 指示反映)

### 実測した重複規模

| 区分 | エージェント数 | 1 agent あたり | 合計 |
|---|---|---|---|
| Bash-owning agents | 13 | 13–17 行 (avg 13.5) | ~175 行 |
| Non-bash agents | 18 | 11 行 | ~198 行 |
| Flow orchestrators + other | 9 | 11–13 行 | ~110 行 |
| **計** | **40** | | **~483 行** |

(40 agent files に `## Project-Specific Behavior` ブロックが存在することは
`grep -rc "^## Project-Specific Behavior" .claude/agents/` で確認済)

### 重要な発見 (memo 段階では未認識)

`## Project-Specific Behavior` ブロックの内容 (Authoring / Localization / 各 rule
への follow 参照) は **既に auto-load される `git-rules.md` / `language-rules.md` /
`denial-categories.md` / `document-locations.md` で完全にカバー済み**。
エージェントごとのブロックは純粋な再記述で、新情報ゼロ。

→ aphelion-overview.md に詳細な代替セクションを書く必要すらない。**6 行の reminder
で十分**。

### #132 との座標合わせ (Resolved)

| 当初想定 | Refined design |
|---|---|
| §② が ~390 行を aphelion-overview.md に追加 | §② は **6 行のみ追加** |
| #132 §B (軽量化) と衝突 | 衝突解消 — 6 行は #132 §B のターゲット対象外 |

#132 architect は本書の Refined design を前提に「6 行は許容範囲、それ以外の既存内容を
削減対象に」と作業できる。

---

## 方針

エージェント定義ファイル（39個）に存在する重複記述を削減し、
各エージェントのコンテキストサイズを小さくする。
**「固有の記述のみ各エージェントに残す」** を原則とする。

---

## 対応項目

### ① AGENT_RESULT のシンプル化（最優先・確定）

**現状の問題**
各エージェントの "Output on Completion (Required)" 節に AGENT_RESULT ブロックの
**フィールド定義** が書かれている。多くのフィールドは agent-communication-protocol.md
にも書かれており、agent 側ではフィールド一覧 + 各フィールドの値域を再記述している。

例 (developer の AGENT_RESULT 説明): ~15 行
例 (analyst の AGENT_RESULT 説明): ~15 行
40 エージェント × ~15 行 ≈ ~600 行の重複定義 (実際の emit 例ではなくテンプレ定義部分)。

**Refined 対応方針** (memo の原案を踏襲しつつ scope を明確化)

- **キープ (orchestrator が parse する field)**: `STATUS`, `NEXT`, `BLOCKED_TARGET`,
  `BLOCKED_REASON`, `DECISION` (sandbox-runner), `DOC_REVIEW_RESULT` (doc-reviewer),
  `ARTIFACT_PATHS`, `BRANCH`, `DOCS_UPDATED` (analyst → maintenance-flow Patch trigger),
  `HANDOFF_TO`, `ARCHITECT_BRIEF`
- **キープ (user-facing informational field)**: `PR_URL`, `LAST_COMMIT`, `LINT_CHECK`,
  `FILES_CHANGED`, `ACCEPTANCE_CHECK`, `FAILED_CONDITIONS`, `GITHUB_ISSUE`,
  `PHASE`, `TASKS_COMPLETED`, `ISSUE_TYPE`, `ISSUE_SUMMARY`, `RELEVANT_UCS` (将来 #132 A)
- **移動 (canonical 定義を agent-communication-protocol.md に集約)**: 各 field の
  値域・意味は agent-communication-protocol.md §"Field Reference" (新節) に書き、
  agent prompt 側は **field 名のリストと "see protocol §Field Reference"** のみ残す

**Architect が answer すべき open question** (PR-1 着手前):

1. 共通 field の正規定義を agent-communication-protocol.md に集約する形式 (テーブル化 vs
   フィールド別小見出し) を決定
2. agent 固有 field (`ISSUE_TYPE`, `RELEVANT_UCS` 等) の扱い: protocol に列挙 vs agent
   ごとに残す。**推奨**: agent 固有は agent 側に残し、protocol には共通だけ集約
3. テンプレ削除後の agent prompt 内の最小記述例: 「Emit AGENT_RESULT block. Required
   fields: STATUS, NEXT. Agent-specific fields: ISSUE_TYPE, ARTIFACT_PATHS, BRANCH,
   HANDOFF_TO, ARCHITECT_BRIEF. See `.claude/rules/agent-communication-protocol.md`
   §Field Reference for values.」 (~5 行)

**削減規模** (refined): per-agent ~10 行短縮 × 40 = **~400 行削減**
                     + agent-communication-protocol.md に ~30 行追加 (Field Reference 節)
                     = **net -370 行**

**実装コスト**: 中。orchestrator 側のパーサ実装は無く規約ベースなので、parser 改修は
不要。各 agent prompt を mechanical に削るだけ。

---

### ② Project-Specific Behavior の共通化（最優先・refined）

**現状の問題**
`## Project-Specific Behavior` ブロックが **40 agent files に存在** (実測)。
ブロック内容のバリエーション:

- Bash-owning agents (13 件, 13–17 行/file): Authoring + Localization + follow refs (denial/git/document-locations)
- Non-bash agents (18 件, 11 行/file): Localization のみ
- Flow orchestrators 他 (9 件, 11–13 行/file): Localization + 一部 follow refs

合計重複行: **~483 行**。

**Refined 対応方針** (memo の原案より大幅圧縮)

memo は「~390 行を aphelion-overview.md に移動」と書いていたが、
実際にはブロック内容は **既存の auto-load される rule (git-rules.md / language-rules.md /
denial-categories.md / document-locations.md) に完全に重複している** ことを発見。
aphelion-overview.md に詳細を移動する必要はなく、**6 行の reminder で十分**。

**Add to `src/.claude/rules/aphelion-overview.md`** (現状 `### Document locations rule`
の直下に追加, 6 行):

```markdown
### Project-rules consultation (all agents)

All agents `Read` `.claude/rules/project-rules.md` before user-facing
output and (Bash-owning agents) before `git commit`. Resolve `## Authoring`
→ Co-Authored-By policy (`git-rules.md`) and `## Localization` →
Output Language (`language-rules.md`). Defaults when project-rules.md is
absent: Co-Authored-By: enabled, Output Language: en.
```

**Remove from 40 agents**: 各 agent file 冒頭付近の `## Project-Specific Behavior`
セクション全体 (11–17 行)。

**削減規模** (refined):
- aphelion-overview.md: **+6 行**
- 40 agent files: **-~483 行**
- **net: -477 行**

**実装コスト**: 低 (純粋な mechanical 削除 + 6 行の追加)。
**リスク**: 低 (auto-load された rule で機能的に完全カバー)。

---

### ③ エラーハンドリングの共通化（中期）

**現状の問題**
gh CLI不在・リモートリポジトリ未存在・ブランチ重複等の
エラー条件と対応が複数エージェントに重複して記述されている（約150行）。

**対応方針**
既存の `denial-categories.md` を拡張してBash以外のエラーも統合。
または `rules/error-handling.md` を新設して共通エラーパターンを集約。

```
# rules/error-handling.md（新設案）
## gh CLI エラー
- not installed / not authenticated → GitHub操作をスキップ・AGENT_RESULTにskipped記録
## リモートリポジトリ未存在
- gh repo view失敗 → ユーザーに通知・GitHub操作をスキップ
## ブランチ重複
- 既存ブランチ検出 → ユーザーに再利用/新規作成を確認
```

**削減規模**: 中（約150行・15エージェント程度）
**実装コスト**: 中

---

### ④ gh CLI 可用性チェックのスクリプト化（中期）

**現状の問題**
以下のチェックがGitHub操作を行うエージェント（約8個）に重複。

```bash
gh --version
gh auth status
gh repo view --json nameWithOwner
```

**対応方針**
共通シェルスクリプトに切り出し、各エージェントから参照する。

```bash
# scripts/check-gh.sh（新設）
gh --version && gh auth status && gh repo view --json nameWithOwner
```

**削減規模**: 中（約80行）
**実装コスト**: 中

---

### ⑤ Completion Conditions 定型文の共通化（長期）

**現状の問題**
以下の定型チェックが全エージェントに存在。

```
- [ ] The required output block has been produced
- [ ] Handoff information has been clearly stated
```

**対応方針**
aphelion-overview.md に共通条件として移動。
各エージェントには固有の条件のみ残す。

**削減規模**: 小（約80行）
**実装コスト**: 低

---

### ⑥ AskUserQuestion 定型パターンの共通化（長期）

**現状の問題**
承認ゲートのJSON構造（Approve / Revise / Abort の3択）が
約10エージェントに同一パターンで存在（約100行）。

**対応方針**
`rules/hitl-patterns.md` として共通パターンを定義し参照する。

**削減規模**: 小（約100行）
**実装コスト**: 中（Claude Codeの参照解決の挙動確認が必要）

---

## 優先度と削減効果まとめ (Refined)

| 項目 | 追加 | 削除 | net | 優先度 | PR |
|------|------|------|-----|------|------|
| ① AGENT_RESULT シンプル化 | +30 行 (protocol §Field Reference) | -400 行 (40 agents) | **-370 行** | 最優先 | PR-1 |
| ② Project-Specific Behavior 共通化 | +6 行 (aphelion-overview.md) | -483 行 (40 agents) | **-477 行** | 最優先 | PR-1 |
| ③ エラーハンドリング共通化 | TBD | ~-150 行 | TBD | 中期 | future |
| ④ gh CLI チェック スクリプト化 | +1 ファイル (新 script) | ~-80 行 | TBD | 中期 | future |
| ⑤ Completion Conditions 共通化 | TBD | ~-80 行 | TBD | 長期 | future |
| ⑥ AskUserQuestion 共通化 | TBD | ~-100 行 | TBD | 長期 | future |

**PR-1 (本フェーズ着手) スコープ**: ① + ② 同梱で **追加 ~36 行 / 削除 ~883 行 / net -847 行**

## PR-1 着手前の architect open question

§① のみ architect 設計が必要。§② は mechanical 削除なので architect スキップ可。

architect は以下を decide:
1. agent-communication-protocol.md §"Field Reference" 節の構造 (テーブル vs 小見出し列挙)
2. agent 固有 field の扱い境界 (protocol 一覧化 vs agent 残存)
3. AGENT_RESULT block のテンプレ削除後の agent prompt 内最小記述例 (~5 行) を確定

architect 完了後、developer が PR-1 を実装。

## PR-1 Acceptance criteria

- [ ] `src/.claude/rules/aphelion-overview.md` に Project-rules consultation 節 (~6 行) 追加
- [ ] 40 agent files の `## Project-Specific Behavior` セクション削除
- [ ] `src/.claude/rules/agent-communication-protocol.md` に `## Field Reference` 節追加
- [ ] 40 agent files の "Output on Completion" テンプレ短縮 (~5 行/agent)
- [ ] Test: 各 orchestrator (delivery / discovery / operations / maintenance / doc) が
      引き続き AGENT_RESULT を正しく parse できることを既存 e2e ケースで確認
- [ ] CHANGELOG.md Unreleased エントリ追加
- [ ] net 行数削減 ~800 行以上 (PR の `git diff --stat` で確認)

## PR-1 リスクと mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| ② で削除した内容に新規参照が今後足された場合に欠落 | 低 | aphelion-overview.md の Project-rules consultation 節がカバー範囲を明示 |
| ① で agent prompt から field 一覧が消えると LLM が即興で field を emit する | 中 | agent prompt に必須 field 名のみは残す。値域だけを protocol §Field Reference に分離 |
| 既存テストが「agent prompt 内に特定文字列がある」前提で書かれている場合 | 低 | 該当テストは現状無し (prompt grep ベースのテストは無い) |
| #132 が同 PR-1 後に aphelion-overview.md を編集すると merge conflict | 低 | #132 は PR-1 マージ後に着手 (フロー順) |

## #132 引き継ぎ事項 (architect → architect)

#132 architect は本書の Refined design 完了状態 (aphelion-overview.md に +6 行) を
ベースラインに、#132 §B の軽量化対象を決定する。具体的には:
- aphelion-overview.md の `## Agent Directory` 以下の冗長な記述 (Doc Flow agents 表など) が
  軽量化候補
- `### Project-rules consultation (all agents)` (#131 で追加) は触らない

## 成果物（着手時に生成）

**①（最優先）**
- 全39エージェントの AGENT_RESULT フィールド見直し
- 各オーケストレーターの AGENT_RESULT 読み取りロジック調整

**②（最優先）**
- `.claude/rules/aphelion-overview.md` への Project-Specific Behavior 追記
- 全39エージェントから該当セクション削除

**③（中期）**
- `.claude/rules/denial-categories.md` の拡張 または
- `.claude/rules/error-handling.md` の新設

**④（中期）**
- `scripts/check-gh.sh` の新設
- 該当エージェント（約8個）の Mandatory Checks 更新

**⑤⑥（長期）**
- aphelion-overview.md への共通 Completion Conditions 追記
- `.claude/rules/hitl-patterns.md` の新設（⑥）
