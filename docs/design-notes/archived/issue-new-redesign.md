# refactor: redefine /issue-new as structured intake gate (paired with analyst)

> Reference: current `feat/issue-new-redesign` (HEAD `a3c6494`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#59](https://github.com/kirin0198/aphelion-agents/issues/59)
> Next: developer (per §8 Implementation outline)

---

## 1. Background & Motivation

### 1.1 現状の `/issue-new` が memo dump 化している

`/issue-new` は #51 / PR #52 で導入され、`docs/design-notes/<slug>.md` と GitHub Issue を atomically 産出する slash command として実装された。実体は `.claude/commands/issue-new.md` にある。

しかし本日 (2026-04-25) ユーザーが連続使用した結果、Issue #53〜#58 (および対応する 6 件の design note) はすべて以下のパターンになった:

```
## 1. Background & Motivation
{1〜2 文の memo}

## 2. Proposed approach
TBD — to be filled in by analyst or developer when picked up.

## 3. Out of scope
TBD.
```

ユーザーの言葉:

> もう少し検討を行いIssueとして機能させたい。現状、私がメモのような形で使用してしまったため、あまり機能していない。現状のコマンドではghコマンドでissueを作成している状態と大差ない。

### 1.2 memo 化の構造的原因

| 原因 | 説明 |
|---|---|
| 質問項目が浅い | AskUserQuestion で集めるのは Title / Category / Summary / Slug の 4 項目のみ。実質的内容は **Summary 1 項目** に依存。Summary は free-text 1〜3 文の指示しかなく、考える誘導がない |
| skeleton に逃げ道がある | §2 Proposed approach / §3 Out of scope の初期値が `TBD` 文字列。ユーザーは「あとで埋めればいい」と判断し、実際には埋まらない |
| bug / feature / refactor の分岐がない | category は title prefix にしか影響せず、収集する情報の構造は同じ。bug の再現条件や feature の成功条件など、種別固有の必須情報を聞かない |
| analyst との handoff が未定義 | doc header に `Next: analyst` 等の明示がない。`/issue-new` 完了後にユーザーが `/analyst` を呼ぶフローが定着していない |

### 1.3 ユーザーが意図する役割分担

ユーザーは 2 段構成を意図している:

- **`/issue-new` (intake gate)** — ユーザーのアイデア・バグを **構造化された discovery 結果** に変換する。検討目的・要点・ゴール・再現条件・修正可否などを必ず収集
- **`/analyst` (深い分析)** — intake 結果を起点に、SPEC.md/ARCHITECTURE.md への影響、設計レベルの approach、developer への委譲、までを行う

現状は `/issue-new` が intake 役を機能させていないため、analyst を呼んでも analyst 側でユーザーへの再ヒアリングが必要になり、2 段構成のメリットが消えている。

---

## 2. New role definition: `/issue-new` vs `/analyst`

### 2.1 責務境界

| 観点 | `/issue-new` (intake gate) | `/analyst` (deep analysis) |
|---|---|---|
| 主目的 | ユーザーの memo / 雑な要望を **構造化された discovery 結果** に変換する | intake 結果を読み、SPEC.md/ARCHITECTURE.md/codebase への影響を分析し、設計レベルの approach を決定 |
| 入力 | ユーザーの自由な発話 (1 行〜数行のアイデア / バグ報告) | `docs/design-notes/<slug>.md` の §1〜§4 (intake セクション) が埋まっている状態 + 既存 SPEC/ARCHITECTURE/コードベース |
| 出力 | `docs/design-notes/<slug>.md` (§1〜§4 が埋まった状態) + GitHub Issue (intake サマリを body に持つ) | `docs/design-notes/<slug>.md` の §5〜§8 を追記 + 必要に応じて SPEC.md/UI_SPEC.md インクリメンタル更新 + GitHub Issue body の "Approach" コメント追記 (or 編集) + `architect` または `developer` への handoff |
| 産出物の "完成" 基準 | 後段の analyst が **追加ヒアリングなしで** 設計に着手できるだけの情報が揃っている | developer が **追加質問なしで** 実装に着手できる approach と影響範囲が文書化されている |
| TBD 許容 | §1〜§4 に TBD は **禁止**。ユーザーが「不明」と答えた場合は明示的に `Unknown — to be confirmed by analyst` と書く (空文字や TBD は不可) | §5〜§8 で TBD は許容 (developer フェーズで埋まる項目があるため) |
| 所要時間目安 | 5〜10 分の対話 | 30〜60 分の分析 |
| 失敗モード | 質問が浅く memo dump になる (現状の問題) | intake が薄いと再ヒアリングで時間が伸びる |

### 2.2 Handoff 仕様

`/issue-new` 完了時に以下を満たす:

1. `docs/design-notes/<slug>.md` の §1〜§4 が埋まっている
2. doc header に `> Next: analyst (run /analyst with <slug>)` が含まれる
3. GitHub Issue body に intake サマリと "Next step: run /analyst" の文言が含まれる
4. ユーザーへの最終出力で `/analyst` 起動コマンドを明示

`/analyst` 起動時に以下を前提:

1. `docs/design-notes/<slug>.md` を Read し §1〜§4 を context として取り込む
2. §1〜§4 に `Unknown — to be confirmed by analyst` がある場合のみ、その点に絞ってユーザーへ追加ヒアリング
3. `Unknown` ではなく具体記述があれば、そのまま設計分析に入る (再ヒアリングしない)

### 2.3 共通ヘッダ規約

`docs/design-notes/<slug>.md` のヘッダは段階的に更新される:

```markdown
> Reference: current `<branch>` (HEAD `<sha>`, <date>)
> Created: <date>          # /issue-new が記入
> Intake by: /issue-new (<date>)
> Analyzed by: <agent or TBD>     # /analyst 完了時に更新
> Implemented in: <PR or TBD>     # developer 完了時に更新
> GitHub Issue: [#N](<url>)
> Next: <next agent or done>      # 各段階で更新
```

---

## 3. `/issue-new` redesign

### 3.1 入力収集フロー

`/issue-new` は以下の順で AskUserQuestion を発行する。

#### 3.1.1 Phase A — 基本分類 (1 回の AskUserQuestion)

```
Q1. What kind of issue is this?
    - bug         (something that should work but doesn't)
    - feature     (new capability / new agent / new flow)
    - refactor    (improve internals without changing behaviour)
    - chore       (tooling / config / housekeeping)
    - docs        (documentation only)
    - ci / ops    (pipeline / infra)

Q2. What is the title? (1 line, will be used as GitHub Issue title)

Q3. Provide a kebab-case slug for docs/design-notes/<slug>.md
    (pre-filled from title)
```

slug 衝突チェックはここで実施 (現行どおり)。

#### 3.1.2 Phase B — 種別別の構造化質問

種別ごとに必須質問セットを切り替える。各回答は最低 1 文以上 (空文字・TBD・"なし" のみは再質問)。

##### bug の場合

| 質問 | 必須 |
|---|---|
| 現象 (what is happening) | 必須 |
| 期待される挙動 (what should happen) | 必須 |
| 再現手順 (steps to reproduce) | 必須 |
| 影響範囲 (which agents / commands / files) | 必須 (`Unknown` 可) |
| 暫定回避策の有無 | 任意 |
| 関連 issue / commit | 任意 |

##### feature の場合

| 質問 | 必須 |
|---|---|
| 動機 / 解決したいユーザー課題 | 必須 |
| 提案する大まかなアプローチ (1〜3 文) | 必須 |
| 成功条件 / 受入条件 | 必須 |
| 既存機能との関係・棲み分け | 必須 (`Unknown` 可) |
| 検討した代替案 | 任意 |
| Out of scope (やらないこと) | 必須 |

##### refactor / chore / docs / ci / ops の場合

| 質問 | 必須 |
|---|---|
| 現状の痛み / 改善動機 | 必須 |
| 目指す状態 | 必須 |
| 対象範囲 (files / agents / docs) | 必須 (`Unknown` 可) |
| 後方互換性への影響 | 必須 |
| Out of scope | 必須 |

#### 3.1.3 Phase C — 確認と書き込み

1. 収集した内容を画面表示し、`AskUserQuestion` で「この内容で確定するか / 修正するか / 中止するか」を確認
2. 確定したら `docs/design-notes/<slug>.md` を生成 (§3.2 のテンプレート)
3. `gh issue create` の resolved invocation を画面表示してから実行
4. 生成された issue 番号を doc header に書き戻す
5. 最終出力で「次は `/analyst` を起動してください」と明示

### 3.2 Skeleton template

種別共通のヘッダ + 種別ごとに §1〜§4 の見出しが切り替わる。`TBD` 文字列は **使用しない**。未収集項目は `Unknown — to be confirmed by analyst` を明示的に書く。

#### 3.2.1 bug 用テンプレート

```markdown
# fix: <title>

> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Intake by: /issue-new (<YYYY-MM-DD>)
> Analyzed by: TBD
> Implemented in: TBD
> GitHub Issue: [#N](<url>)
> Next: analyst (run /analyst with <slug>)

---

## 1. Symptom (what is happening)

<answer>

## 2. Expected behaviour (what should happen)

<answer>

## 3. Reproduction steps

<answer>

## 4. Intake metadata

- **Affected scope**: <answer or "Unknown — to be confirmed by analyst">
- **Workaround**: <answer or "None known">
- **Related issues / commits**: <answer or "None">

---

## 5. Root cause analysis

(filled by /analyst)

## 6. Proposed approach

(filled by /analyst)

## 7. Document / code impact

(filled by /analyst)

## 8. Acceptance criteria

(filled by /analyst)
```

#### 3.2.2 feature 用テンプレート

```markdown
# feat: <title>

> (header same shape as above)

---

## 1. Motivation / user pain

<answer>

## 2. High-level approach

<answer>

## 3. Acceptance criteria

<answer>

## 4. Intake metadata

- **Relation to existing capabilities**: <answer or "Unknown — to be confirmed by analyst">
- **Alternatives considered**: <answer or "None recorded at intake">
- **Out of scope**: <answer>

---

## 5. Detailed design

(filled by /analyst)

## 6. Document / architecture impact

(filled by /analyst)

## 7. Implementation outline

(filled by /analyst, refined by developer)

## 8. Risks and open questions

(filled by /analyst)
```

#### 3.2.3 refactor / chore / docs / ci / ops 用テンプレート

```markdown
# <category>: <title>

> (header same shape as above)

---

## 1. Current pain

<answer>

## 2. Target state

<answer>

## 3. Scope

<answer or "Unknown — to be confirmed by analyst">

## 4. Intake metadata

- **Backward compatibility**: <answer>
- **Out of scope**: <answer>

---

## 5. Detailed approach

(filled by /analyst)

## 6. Document / code impact

(filled by /analyst)

## 7. Migration / rollout plan

(filled by /analyst)

## 8. Risks and open questions

(filled by /analyst)
```

### 3.3 GitHub Issue body

`gh issue create` の `--body` に渡す本文は以下のテンプレート:

```markdown
## Type

<bug | feat | refactor | chore | docs | ci | ops>

## Intake summary

<auto-built from §1〜§4 of the design note — bullet form>

## Design note

docs/design-notes/<slug>.md

## Next step

Run `/analyst` against `<slug>` to produce the design / approach (§5 onwards in the design note).
EOF
```

### 3.4 TBD 禁止チェック

各必須質問の回答に対し:

1. 空文字 → 再質問
2. 単独で `TBD`, `tbd`, `?`, `不明`, `未定`, `なし` のみ → 再質問
3. それ以下のチェック (1 文以上、N 文字以上) は意図的に行わない (短くても本人が考えた回答は許容)

「ユーザーが本当に分からない」場合の正しい回答は `Unknown — to be confirmed by analyst` (英語固定文字列) とし、これは許容する。これにより analyst は明示的に「ここを聞き直す必要がある箇所」を特定できる。

### 3.5 種別による分岐

§3.1.1 Q1 の選択結果に応じて Phase B の質問セットと §3.2 のテンプレートを切り替える。

- `bug` → §3.1.2 bug 質問セット + §3.2.1 テンプレート
- `feature` (= `feat`) → feature 質問セット + §3.2.2 テンプレート
- `refactor` / `chore` / `docs` / `ci` / `ops` → 共通質問セット + §3.2.3 テンプレート

---

## 4. Existing #53–#58 の取り扱い

### 4.1 候補と評価

| 案 | 利点 | 欠点 |
|---|---|---|
| (A) 全部書き直し | 一貫した品質 | ユーザー負荷が高い (6 件 × intake) |
| (B) 一部のみ書き直し | 重要なものから着手可 | 基準が恣意的、選別コストがかかる |
| (C) **そのまま open + analyst が拾うとき本人にヒアリング** | ノイズ最小、本 redesign のスコープと混ざらない | analyst 着手時に再ヒアリングが必要 |
| (D) 全部 close + 再起票 | 形式統一 | 履歴ノイズが大きい、reactions / comments があれば失う |

### 4.2 推奨: (C) そのまま open

理由:
- analyst は元々 SPEC/ARCHITECTURE/codebase を読んでヒアリングする agent。intake が薄くても致命的ではない
- 本 redesign のスコープは "今後の `/issue-new` 利用" の改善であり、過去産出物の retro-fit は別問題
- close→再起票は GitHub 上のノイズが大きく、`archive-closed-plans.yml` workflow が走って archived に移動する副作用もある (#50 参照)

### 4.3 オプトイン回収

ユーザーが特定の issue (例: #54 doc-flow) を優先したい場合、本 redesign 実装後に **手動で** その design note を新テンプレートに書き直す ad-hoc 作業を行う。これは本 issue のスコープ外。

---

## 5. #51 deferred の再評価

### 5.1 #51 で deferred とされた案

`docs/design-notes/archived/issue-new-command-and-rename.md` §3 で out of scope とされた:

> Extending `analyst` to call `gh issue create`.

これは「analyst 完了時に自動で gh issue create」という後段自動化案。

### 5.2 現時点の判定: **採用しない**

理由:

1. **順序が逆になる** — 本 redesign では `/issue-new` (intake) → `/analyst` (analysis) の順序を固定する。analyst が issue 起票するなら intake gate (`/issue-new`) の存在意義が消える
2. **2 段で 2 回 gh を叩く必然性がない** — `/issue-new` で起票 → analyst が issue にコメント追記 (`gh issue comment`) で十分。新規起票は不要
3. **失敗モードの非対称性** — analyst が gh を叩く設計だと、analyst が中断・失敗したときに「設計はあるが issue がない」状態が生じる。`/issue-new` で先に issue を起票しておけば、後段が失敗しても tracking 上の穴は生じない

### 5.3 代替: analyst → `gh issue comment` の追加 (オプション)

本 issue のスコープ外だが、将来的検討事項として記録:

- analyst が §5 以降を埋めた後、`gh issue comment <N> --body "Analysis complete: see docs/design-notes/<slug>.md §5–§8"` を実行する
- これにより GitHub Issue 上で「intake → analysis 完了」の進行が tracker 側にも残る
- 本 redesign では実装しない。`/analyst` 修正の別 issue として切り出すべき

---

## 6. Migration risk audit

### 6.1 `/issue-new` 文字列の参照箇所 (HEAD `a3c6494` 時点)

`grep -rn "issue-new"` で以下のみがヒット:

| パス | 種別 | 対応 |
|---|---|---|
| `.claude/commands/issue-new.md` | 本体 | developer フェーズで全面書き換え |
| `.claude/commands/aphelion-help.md` | 説明文 1 行 | developer フェーズで `intake gate (paired with /analyst)` 等に文言更新 |
| `docs/design-notes/archived/issue-new-command-and-rename.md` | 設計履歴 | read-only (archived) — **編集禁止** |

`docs/wiki/`, `src/`, `.github/`, `CLAUDE.md` (本リポジトリには存在しない) には参照なし。

### 6.2 動作変更が他に波及するか

| 観点 | 結果 |
|---|---|
| Orchestrator (`/discovery-flow` / `/delivery-flow` / `/maintenance-flow` / `/operations-flow`) からの呼び出し | なし — `/issue-new` は user-facing shortcut のみ |
| Agent (`analyst`, `architect`, etc.) 内からの呼び出し | なし |
| GitHub Actions (`archive-closed-plans.yml` 等) | `docs/design-notes/<slug>.md` を扱うが `<slug>` 命名規則は変更しないため影響なし |
| 既存 design note の参照 | doc header フォーマットを §2.3 で拡張するが、既存 docs に backfill 不要 (新規作成からのみ適用) |

### 6.3 互換性方針

- 既存 design note (#53〜#58 を含む) の header 形式は変更しない
- 新フォーマットは `/issue-new` 経由で新規作成されるドキュメントから適用
- `archive-closed-plans.yml` workflow は不変

---

## 7. Acceptance criteria

本 redesign の実装 PR (developer フェーズ) で以下を満たす:

1. `.claude/commands/issue-new.md` が §3 の仕様を実装している
2. bug / feature / refactor 等で異なる質問セットとテンプレートが切り替わる
3. 必須質問への空文字 / `TBD` 単独回答は再質問される
4. 生成される design note に `TBD` 文字列が含まれない (`Unknown — to be confirmed by analyst` または具体記述のみ)
5. doc header に `Intake by:` `Analyzed by:` `Implemented in:` `Next:` が含まれる
6. GitHub Issue body に "Next step: run /analyst" が含まれる
7. `.claude/commands/aphelion-help.md` の `/issue-new` 説明が新役割を反映
8. `.claude/agents/analyst.md` に「`docs/design-notes/<slug>.md` の §1〜§4 を入力として読む」旨の handoff section が追加される (§2.2 と整合)
9. `grep -rn "issue-new" docs/wiki/ src/ .github/` がゼロ件のまま (新規ハードコード参照を増やさない)

### 7.1 Verification commands (developer reference)

```bash
# (a) 既存テンプレートの "TBD" 文字列が新フォーマットに混在していない
grep -n "TBD" .claude/commands/issue-new.md
# expect: ヘッダの "Analyzed by: TBD" 等、§3.2 で意図的に置いた箇所のみ

# (b) aphelion-help が更新されている
grep -A1 "issue-new" .claude/commands/aphelion-help.md
# expect: "intake" の文言が含まれる

# (c) analyst.md に intake handoff が記載されている
grep -A2 "design-notes" .claude/agents/analyst.md
# expect: "§1〜§4" or "intake" を含む記述
```

---

## 8. Implementation outline (for developer)

1. `.claude/commands/issue-new.md` を §3 の仕様で書き直す
   - Phase A / Phase B / Phase C のフロー
   - 種別ごとの質問セット (bug / feature / refactor 共通)
   - 種別ごとのテンプレート 3 種
   - TBD 禁止チェック
2. `.claude/commands/aphelion-help.md` の `/issue-new` 行を更新
   - 例: `/issue-new` | `Structured intake gate — collect issue details and create planning doc + GitHub issue (run /analyst next)`
3. `.claude/agents/analyst.md` に handoff section を追記
   - `docs/design-notes/<slug>.md` の §1〜§4 を読む
   - `Unknown — to be confirmed by analyst` 部分のみ追加ヒアリング
   - 完了後に §5〜§8 を追記し、必要なら `gh issue comment` を実行
4. ローカル検証
   - `/issue-new` を呼び、bug / feature / refactor 各 1 件ずつ dry-run
   - 生成された design note と GitHub Issue body の中身を目視確認
   - `/analyst` を続けて起動し、再ヒアリングが §1〜§4 内の `Unknown` 箇所に限定されることを確認

---

## 9. Risks and open questions

- **Phase B の質問数が増えてユーザー負荷が上がる懸念**: bug / feature / refactor で 4〜6 問が増える。現状の 4 問から実質倍増。緩和策として「1 回の AskUserQuestion に複数質問を束ねる (max 4)」を活用し、対話往復を最小化
- **`Unknown — to be confirmed by analyst` の英語固定文字列**: Output Language: ja の設定下でも英語にする (machine-readable な sentinel として扱う)。analyst 側の grep ロジックを安定させるため
- **既存 #53〜#58 のフォローアップ**: §4 で「そのまま open」を推奨したが、ユーザーが個別に書き直したい issue が出てきたら ad-hoc 対応とする。本 redesign では自動 migration を行わない
- **slash command の対話的検証手段**: `/issue-new` は対話 UI を含むため CI で自動検証が難しい。developer フェーズでは手動 dry-run + テンプレート静的検査 (上記 §7.1) でカバー
