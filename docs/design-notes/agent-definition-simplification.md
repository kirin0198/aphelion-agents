> Last updated: 2026-05-15
> GitHub Issue: [#131](https://github.com/kirin0198/aphelion-agents/issues/131)
> Authored by: analyst (2026-05-15)
> Promoted from: docs/design-notes/proposals/agent-definition-simplification-memo.md
> Related: [token-reduction.md](./token-reduction.md) (#132) — §② と §B が aphelion-overview.md 上で衝突するため設計時に座標合わせ必須
> Next: architect (mandatory — 全 39 エージェント + orchestrator パーサ契約に影響)

# エージェント定義ファイルの重複削減 (~60% 削減目標)

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。

## #132 との座標合わせ

| 本 issue (#131) | token-reduction (#132) | 衝突点 |
|---|---|---|
| §② Project-Specific Behavior → aphelion-overview.md (~390 行 **追加**) | §B aphelion-overview.md 軽量化 (**削減**) | 同一ファイルへの相反する変更 |

→ どちらの issue を先に着手する場合も、もう一方の architect 設計を読んでから着手する。
PR を切る順序は architect 段階で確定する。

---

## 方針

エージェント定義ファイル（39個）に存在する重複記述を削減し、
各エージェントのコンテキストサイズを小さくする。
**「固有の記述のみ各エージェントに残す」** を原則とする。

---

## 対応項目

### ① AGENT_RESULT のシンプル化（最優先・確定）

**現状の問題**
各エージェントのAGENT_RESULTに多数のフィールドが定義されており、
オーケストレーターが実際に使用しないフィールドも含まれている。

**対応方針**
最小構成に絞る。オーケストレーターが必要とする情報のみ残す。

```
# 最小AGENT_RESULT
STATUS: pass | fail | skip
CRITICAL_ISSUES: <あれば列挙・なければ省略>
NEXT: <次のエージェント名>
```

固有フィールドは各エージェントに残すが、
「共通フィールド + 必須固有フィールドのみ」に整理する。

**削減規模**: 大（39エージェント全体）
**実装コスト**: 中（全エージェントの定義更新 + オーケストレーターの読み取り調整）

---

### ② Project-Specific Behavior の共通化（最優先）

**現状の問題**
以下のブロックが全エージェント（約39個）に同一内容で存在する。
約390行の重複。

```markdown
## Project-Specific Behavior
Before committing and before producing user-facing output, consult
`.claude/rules/project-rules.md` (via `Read`) and apply:
- `## Authoring` → Co-Authored-By policy
- `## Localization` → Output Language
If absent, apply defaults:
- Co-Authored-By: enabled
- Output Language: en
> Follows `.claude/rules/denial-categories.md` for post-failure diagnosis
```

**対応方針**
`aphelion-overview.md` に移動し、全エージェントから該当セクションを削除。
aphelion-overview.mdは既に全エージェントに自動ロードされるため、
追加のロードコストなしに共通化できる。

**削減規模**: 大（約390行・全エージェントに効く）
**実装コスト**: 低（aphelion-overview.mdへの追記 + 各エージェントから削除）

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

## 優先度と削減効果まとめ

| 項目 | 削減規模 | 実装コスト | 優先度 |
|------|------|------|------|
| ① AGENT_RESULT シンプル化 | 大 | 中 | 最優先 |
| ② Project-Specific Behavior 共通化 | 大（約390行） | 低 | 最優先 |
| ③ エラーハンドリング共通化 | 中（約150行） | 中 | 中期 |
| ④ gh CLIチェック スクリプト化 | 中（約80行） | 中 | 中期 |
| ⑤ Completion Conditions 共通化 | 小（約80行） | 低 | 長期 |
| ⑥ AskUserQuestion 共通化 | 小（約100行） | 中 | 長期 |

①②をセットで実施することで全体重複の約60%を解消できる見込み。

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
