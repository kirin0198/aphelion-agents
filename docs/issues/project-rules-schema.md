# project-rules.md スキーマ拡張 — Issue #30 / #32 統合設計方針

> 作成日: 2026-04-24
> 作成者: analyst (前段分析フェーズ)
> 対象 Issue: [#30](https://github.com/kirin0198/aphelion-agents/issues/30), [#32](https://github.com/kirin0198/aphelion-agents/issues/32)
> ステータス: **方針策定中（実装前のユーザー承認待ち）**
> 関連ブランチ: 本方針書は `main` に直接コミットし、実装 PR は別ブランチで切り分ける

---

## 1. 背景と 2 Issue の関係

### 1.1 Issue #30（Co-Authored-By ポリシー統一）

エージェント起動のコミットに `Co-Authored-By: Claude <noreply@anthropic.com>` を一貫して付与し、プロジェクトごとに opt-out 可能な仕組みを整える。

### 1.2 Issue #32（出力言語の統一）

全エージェント出力を English デフォルトに統一し、`Output Language: ja` 等の設定でローカライズ可能にする。

### 1.3 統合の根拠

両 Issue は **「プロジェクト単位の振る舞いを `.claude/rules/project-rules.md` に集約する」** という同じメカニズムを必要とする:

- どちらも「デフォルトは A、ただしプロジェクトごとに B へ切り替え可」構造
- どちらも `rules-designer` の質問フローに 1 項目ずつ追加する改修
- どちらも全対象エージェントに「コミット前 / 出力前に project-rules を参照する」ロジックを仕込む必要がある
- スキーマを別々に拡張すると、将来の 3 項目目・4 項目目で方針が発散するリスクが大きい

**結論: 1 PR・共有スキーマで統合する**。

---

## 2. project-rules.md 正式スキーマ定義

`.claude/rules/project-rules.md` は `rules-designer` が生成する。auto-loaded ではなく、各エージェントが参照時に `Read` する運用とする（理由は 7.1 節）。

### 2.1 スキーマ v1.0

```markdown
# Project Rules — {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> スキーマバージョン: 1.0

## プロジェクト概要
{1〜3行の要約}

## 技術スタック
（既存のまま）

## コーディング規約
（既存のまま）

## Git ルール
（既存のまま）

## ビルド・テストコマンド
（既存のまま）

## ディレクトリ構成
（既存のまま）

## Authoring                          ← NEW (Issue #30)

- Co-Authored-By policy: enabled | disabled
  - default: enabled
  - enabled の場合、各エージェントは commit message 末尾に
    `Co-Authored-By: Claude <noreply@anthropic.com>` を付与する
  - disabled の場合、付与しない

## Localization                       ← NEW (Issue #32)

- Output Language: en | ja
  - default: en
  - ユーザー向け出力（AskUserQuestion / 承認ゲート / 進捗表示 / 報告）の既定言語
- Fallback Language: en
  - Primary 言語で該当辞書が存在しない場合のフォールバック

## プロジェクト固有のルール
（既存のまま）
```

### 2.2 スキーマ設計原則

| 原則 | 内容 |
|------|------|
| **セクション階層は 2 段まで** | `## Authoring` / `## Localization` のような機能カテゴリ ヘッダ + 配下のキー列挙。ネスト深化は避ける |
| **キーは `Title Case: value`** | 「Co-Authored-By policy: enabled」のようにコロン区切り。Markdown として人間が読める・LLM も解釈容易 |
| **default は必ず明示** | エージェント実装側は「キー未記載 = default 値」として扱うが、ドキュメント側は default 値を併記する |
| **enum は `a \| b \| c` で列挙** | 将来の拡張（`ja-JP`, `zh` 等）もこの形式に追加 |
| **機能カテゴリ単位でセクション** | 将来 `## Telemetry`, `## Review Policy` 等を追加可能な設計 |

### 2.3 将来拡張枠（参考）

```markdown
## Telemetry                         (将来)
- Anonymous usage stats: disabled
## Review Policy                     (将来)
- Reviewer required: all | code-only | none
```

本 PR では追加しない。スキーマの拡張余地のみ確保する。

---

## 3. 各 rule ファイル改訂内容 (diff 案)

### 3.1 `.claude/rules/language-rules.md`

**方針:** 「User-facing: Japanese」固定を廃止し、project-rules への参照とする。

**変更前:**
```markdown
# Language Rules

- Code, variable names, commit messages: **English**
- Agent definition files (instructions, rules, guidelines): **English**
- Code comments, user-facing documentation, reports to user: **Japanese**
- AGENT_RESULT block keys/values: **English**
- User-facing CLI output (AskUserQuestion content, approval gates, progress displays): **Japanese**
```

**変更後案:**
```markdown
# Language Rules

## Invariants (not configurable)

- Code, variable names, function names: **English**
- Commit messages: **English** (git convention)
- Agent definition files (this `.claude/agents/*.md`): **English**
- AGENT_RESULT block keys and values: **English** (machine-readable)

## Configurable via project-rules.md

- **Output Language** — language used for user-facing output.
  Controls: AskUserQuestion content, approval gate text, progress displays,
  agent reports to the user, code comments, user-facing documentation.

  - Source: `.claude/rules/project-rules.md` → `## Localization` → `Output Language: {en|ja}`
  - Default when project-rules.md is absent or key is missing: **en**
  - Fallback when primary language dictionary entry is missing: value of `Fallback Language` (default: `en`)

## Resolution Order

1. `.claude/rules/project-rules.md` → `## Localization` → `Output Language`
2. Default: `en`

Agents must resolve the language *at invocation time* by reading project-rules.md.
Do not cache across sessions.

## Hybrid Localization Strategy

- **Fixed UI strings** (approval gate headings, AskUserQuestion boilerplate,
  "Phase N 完了" style section headers): managed via a static dictionary
  (defined in `.claude/rules/localization-dictionary.md`, see Issue #32 follow-up).
- **Free-form narrative** (analysis summaries, explanations, error descriptions):
  the agent generates text directly in the resolved Output Language via prompt instruction.
```

### 3.2 `.claude/rules/git-rules.md`

**方針:** Co-Authored-By 付与ルールを git-rules に集約し、各エージェント本文では重複記載せず「git-rules.md に従う」と1行参照にする。

**追記案:**
```markdown
## Commit Co-Authorship

Agents invoked within this workflow MUST append the following trailer to the
commit message body when creating commits, **unless disabled** by the project.

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Resolution Order

1. `.claude/rules/project-rules.md` → `## Authoring` → `Co-Authored-By policy`
   - `disabled` → skip trailer
   - `enabled` → append trailer
2. Default when project-rules.md is absent or key is missing: **enabled**

### Applicable Agents

developer, scaffolder, infra-builder, db-ops, observability, releaser, analyst,
codebase-analyzer, rules-designer, doc-writer, tester.

(i.e., all agents owning `Bash` that may run `git commit`.)

### Model Name Policy

The trailer MUST NOT include a specific model name (e.g., "Claude Sonnet 4.6").
A bare `Claude` is sufficient; model variance across sub-agent invocations
would otherwise pollute commit history.
```

### 3.3 `.claude/rules/user-questions.md`

**方針:** 「`(推奨)`」などの日本語サフィックスを「localized per project-rules」に言い換え、既定の見本を英語例に差し替え。「Text Output Fallback」の `⏸ 確認事項があります` ブロックは **静的辞書対象** として二言語併記または「例示のみ」に格下げ。

**変更案（抜粋）:**
```markdown
## Recommended Option Ordering

Place recommended options first. The label suffix indicating "recommended"
follows the Output Language:
- en: `(recommended)`
- ja: `(推奨)`
(See `.claude/rules/localization-dictionary.md`)
```

### 3.4 `.claude/rules/localization-dictionary.md` （新規）

Issue #32 のハイブリッド方式のうち「辞書パート」。本 PR では最小構成 (ja/en) のみ。

```markdown
# Localization Dictionary

Fixed UI strings used by all agents. Agents resolve `Output Language` from
project-rules.md and pick the matching column.

## Approval Gate

| key                       | en                                      | ja                                     |
|---------------------------|-----------------------------------------|----------------------------------------|
| phase_complete_header     | "Phase {N} complete: {agent}"           | "Phase {N} 完了: {agent}"              |
| artifacts_label           | "Generated artifacts"                   | "生成された成果物"                      |
| content_summary_label     | "Summary"                               | "内容サマリー"                          |
| approval_question         | "Phase {N} artifacts reviewed. Proceed to the next phase?" | "Phase {N} の成果物を確認しました。次のフェーズに進みますか？" |
| approve_and_continue      | "Approve and continue"                  | "承認して続行"                          |
| request_modification      | "Request modification"                  | "修正を指示"                            |
| abort                     | "Abort"                                 | "中断"                                  |

## AskUserQuestion Fallback

| key                       | en                                      | ja                                     |
|---------------------------|-----------------------------------------|----------------------------------------|
| pause_marker_header       | "⏸ Confirmation needed"                 | "⏸ 確認事項があります"                  |
| resume_after_answer       | "Work resumes after your reply."        | "回答をいただいてから作業を再開します。" |
| recommended_suffix        | "(recommended)"                         | "(推奨)"                                |

## Progress Display

| key                       | en                                      | ja                                     |
|---------------------------|-----------------------------------------|----------------------------------------|
| phase_start               | "▶ Phase {N}/{M}: launching {agent}"    | "▶ Phase {N}/{M}: {agent} を起動します" |
```

※ 初回 PR では上記 3 ブロック（10〜15 キー）のみを対象とする。段階的拡張は別 issue。

---

## 4. rules-designer 拡張の質問項目設計

### 4.1 追加する質問ラウンド

既存の Round 1〜4 に **Round 5: Agent Behavior Policies** を追加（全 2 項目）。

```json
{
  "questions": [
    {
      "question": "エージェント出力の既定言語はどれにしますか？",
      "header": "出力言語",
      "options": [
        {"label": "English (recommended)", "description": "Default. AskUserQuestion / approval gates / progress / reports are in English"},
        {"label": "Japanese", "description": "日本語で出力する。既存 Aphelion 本体もこちら"}
      ],
      "multiSelect": false
    },
    {
      "question": "コミットに Co-Authored-By: Claude を付与しますか？",
      "header": "Co-Author",
      "options": [
        {"label": "付与する (推奨)", "description": "Claude の関与を co-author として明示。OSS 標準慣行に準拠"},
        {"label": "付与しない", "description": "プロジェクトポリシーで co-author が禁止されている場合など"}
      ],
      "multiSelect": false
    }
  ]
}
```

### 4.2 質問ラウンドの配置

既存 Round 4 (Project-specific constraints) の **直後** に Round 5 を挿入する。
理由:
- Round 1〜3 は技術スタック/コーディング規約/Git で、Round 5 はエージェントメタ方針なので層が違う
- Round 4 の「特になし」分岐と独立させたい

### 4.3 デフォルト提示の妥当性

| 項目 | デフォルト | 理由 |
|------|----------|------|
| Output Language | English | Issue #32 の合意事項。OSS 公開・国際化の既定値 |
| Co-Authored-By | enabled | Issue #30 の合意事項。Claude Code 本体システムプロンプトと整合 |

### 4.4 Aphelion 本体リポジトリ向け特例

`rules-designer` は通常、新規プロジェクトで起動する。Aphelion 本体（このリポジトリ）は既存プロジェクトなので、手動で `project-rules.md` を作成し `Output Language: ja` + `Co-Authored-By policy: enabled` を明示する（6 節参照）。

---

## 5. 対象エージェント一覧と改修方針

### 5.1 対象エージェント

#### Co-Authored-By 付与対象（11 エージェント）

| エージェント | 現行コミット例の記載 | 改修内容 |
|------------|-------------------|---------|
| developer | line 149, 170 | コミット直前に git-rules.md + project-rules.md を参照する旨を明記 |
| scaffolder | line 131 | 同上 |
| infra-builder | （コミット指示あり） | 同上 |
| db-ops | （コミット指示あり） | 同上 |
| observability | （コミット指示あり） | 同上 |
| releaser | （コミット指示あり） | 同上 |
| analyst | line 257 | 同上 |
| codebase-analyzer | 初回コミット | 同上 |
| rules-designer | project-rules 自身のコミット | 同上 |
| doc-writer | line 141 | 同上 |
| tester | line 179 | 同上 |

#### 出力言語対応対象（全エージェント）

`.claude/agents/*.md` の約 30 ファイル（orchestrator / sandbox-runner 含む）。

### 5.2 改修方針（共通ルールへの集約 vs 各本文への重複）

**採用方針: 共通ルールへの集約 + 各エージェント本文には 1 行参照**

理由:
- 各エージェントに重複記載すると Issue #30 のような揺れの再発リスク
- language-rules.md / git-rules.md が既に auto-loaded なので、各エージェントは「読み込み済みルールに従う」と宣言するだけで十分
- 将来の 3 項目目・4 項目目でも同じパターンを踏襲できる

**各エージェントへの追記例（統一ブロック）:**

```markdown
## Project-Specific Behavior

Before committing and before producing user-facing output, consult
`.claude/rules/project-rules.md` (via `Read`) and apply:

- `## Authoring` → `Co-Authored-By policy` (see `.claude/rules/git-rules.md`)
- `## Localization` → `Output Language` (see `.claude/rules/language-rules.md`)

If `.claude/rules/project-rules.md` is absent, apply defaults:
- Co-Authored-By: enabled
- Output Language: en
```

このブロックを 11 対象エージェント（+ 出力言語は全エージェント）の定義冒頭（description ブロックの直後、本文の最初）に追記する。

### 5.3 集約コミットの粒度

全対象エージェントへの `Project-Specific Behavior` ブロック追加は **1 コミットにまとめる** ことを推奨:

- 30 エージェントに同じテキストを挿入する作業なので、PR レビュー時に差分が読みやすい
- git-rules.md / language-rules.md の改訂コミットと分離しておけば、巻き戻しもしやすい

---

## 6. Aphelion 本体への後方互換適用手順

本 Issue 実装 PR 内で以下を併せて行う:

1. **`.claude/rules/project-rules.md` を新規作成**

   ```markdown
   # Project Rules — Aphelion Agents

   > 作成日: 2026-04-24
   > スキーマバージョン: 1.0

   ## プロジェクト概要
   Aphelion エージェント定義のメタリポジトリ。実装コードは platforms/ 生成物と
   TypeScript CLI (src/) のみ。主成果物は `.claude/agents/*.md`。

   ## Authoring
   - Co-Authored-By policy: enabled

   ## Localization
   - Output Language: ja
   - Fallback Language: en
   ```

2. **Aphelion 本体は `Output Language: ja` を明示し、既存ユーザー体験を維持**
3. platforms/ 再生成時に project-rules.md の取り扱いを確認（7.3 節）

---

## 7. ハイブリッド翻訳方式の実装範囲

### 7.1 辞書 (`localization-dictionary.md`) 対象

| 対象 | 辞書化する | 備考 |
|------|----------|------|
| Approval Gate 見出し／ボタンラベル | ✓ | 6 キー |
| AskUserQuestion の「(推奨)」サフィックス等 | ✓ | 3 キー |
| Progress Display テンプレート (`▶ Phase N/M: ...`) | ✓ | 2 キー |
| エラー種別名 (`STATUS: error` を返した際の見出し) | ✓ (最小限) | 3〜5 キー |
| エージェント分析結果本文 | ✗ | LLM が Output Language で直接生成 |
| 要約・説明文・質問本文の自然言語部 | ✗ | LLM が Output Language で直接生成 |

### 7.2 LLM 翻訳（プロンプトで制御）

対象エージェントは以下の擬似コードで出力言語を決定する:

```
1. Read .claude/rules/project-rules.md (if exists)
2. Extract "Output Language" value, default "en"
3. For fixed UI keys: look up localization-dictionary.md
4. For free-form text: generate directly in target language
   (the agent's own prompt does the translation implicitly)
```

### 7.3 generate.mjs への影響

- `platforms/copilot/` / `platforms/codex/` は project-rules を読めない前提
- 生成物には **English デフォルトを埋め込み**、`project-rules.md` をプロジェクトルートに持ち込めば上書きされる運用を推奨
- `replaceCopilot` / `replaceCodex` で日本語の固定辞書を保持しても意味が薄い → **Copilot / Codex 向けは English 固定で出力**する案を採用（7.4 節で確認）

### 7.4 generate.mjs 改修範囲（最小案）

1. `replaceCopilot` / `replaceCodex` のテキスト置換マップに「日本語サフィックス削除」を追加しない（時期尚早）
2. 代わりに、本 PR で追加する `localization-dictionary.md` をコピー対象から除外（コメントで説明）
3. `copilot-instructions.md` に「Default Output Language: en (override via project-rules.md)」を 1 行追加

---

## 8. PR 分割戦略（単一 PR・複数コミット）

ユーザー指示通り 1 PR で統合するが、コミットは以下の 6 つに分割する。巻き戻し容易性と diff 可読性の両立を目指す。

### 8.1 コミット順序

| # | prefix | タイトル案 | 内容 | 根拠 |
|---|--------|----------|------|------|
| 1 | docs | `docs: add project-rules.md schema v1.0 and planning doc` | 本方針書 `docs/issues/project-rules-schema.md` の追加 | 先に議論記録を確定させる |
| 2 | docs | `docs: extend language-rules and git-rules for project-rules delegation` | `.claude/rules/language-rules.md` と `.claude/rules/git-rules.md` の改訂 | 後続エージェント改修の根拠ルール |
| 3 | docs | `docs: add localization-dictionary.md (en/ja fixed strings)` | `.claude/rules/localization-dictionary.md` の新規追加 | ハイブリッド方式の辞書パート |
| 4 | feat | `feat(rules-designer): add Output Language and Co-Authored-By questions` | `.claude/agents/rules-designer.md` に Round 5 追加、テンプレート更新 | Issue #30 / #32 の主要実装 |
| 5 | refactor | `refactor(agents): centralize project-rules reference in agent bodies` | 全対象エージェントに `## Project-Specific Behavior` ブロックを挿入 | 約 30 ファイルの同型変更 |
| 6 | docs | `docs: pin Output Language=ja and Co-Authored-By=enabled for Aphelion itself` | `.claude/rules/project-rules.md` の新規作成（Aphelion 本体向け） | 後方互換確保 |
| 7 | chore | `chore: regenerate platforms/{copilot,codex} artifacts` | `node scripts/generate.mjs` 実行結果 | platforms 反映 |

### 8.2 コミット分割の根拠

- コミット 1〜3 は **ルールドキュメントの改訂**（実装前提の確定）
- コミット 4〜5 は **エージェント実装への反映**（ルール確定後の適用）
- コミット 6 は **Aphelion 本体プロジェクトの設定**（メタレベルの意思表示）
- コミット 7 は **生成物**（自動生成。レビュー時は差分確認不要）

この順序で `git bisect` もしやすい。万一 Round 5 の質問が不評ならコミット 4 だけ revert 可能。

### 8.3 PR タイトル案

```
feat: extend project-rules.md schema with Authoring and Localization (#30, #32)
```

### 8.4 PR ボディひな形

```markdown
## 概要
- `.claude/rules/project-rules.md` のスキーマに `## Authoring` / `## Localization` を追加
- `rules-designer` に出力言語・Co-Authored-By 選択の質問ラウンドを追加
- language-rules.md / git-rules.md を project-rules 参照型に改訂
- 全対象エージェントに `Project-Specific Behavior` 参照ブロックを追記
- Aphelion 本体は `Output Language: ja` + `Co-Authored-By: enabled` を明示

## 関連 Issue
- Closes #30
- Closes #32

## 設計ドキュメント
- `docs/issues/project-rules-schema.md`

## 後方互換
- Aphelion 本体は `Output Language: ja` 明示により既存ユーザー体験維持
- `.claude/rules/project-rules.md` 不在時は default (en / enabled) で動作
```

---

## 9. ADR（Architecture Decision Records）

### ADR-01: project-rules.md のスキーマキーを「Title Case: value」形式で記述する

- **Context:** YAML frontmatter にする案、TOML にする案があったが、ルール群は既に Markdown で統一されている
- **Decision:** Markdown セクション（`##`）+ コロン区切りキーバリューで記述する
- **Consequences:** 人間可読性・LLM 可読性どちらも高い。将来パーサーを書く場合も正規表現で解釈可能。YAML/TOML パーサ依存が発生しない

### ADR-02: project-rules.md は auto-loaded にせず、各エージェントが `Read` で都度参照する

- **Context:** `.claude/rules/` は Claude Code により auto-load される。project-rules.md もここに置けば自動反映できる
- **Decision:** 物理配置は `.claude/rules/` だが、**エージェントの動作分岐は「参照時 Read」で行う**
- **Consequences:** auto-load の内容はコンテキスト窓を圧迫するため、プロジェクトに複数ルールが追加されてもコンテキスト肥大を抑えられる。Read コストは 1 ファイルで済む。Platforms 生成物（Copilot / Codex）でも同じ Read 命令で再現可能

### ADR-03: デフォルトは English / enabled（現状維持ではなく Issue 合意値）

- **Context:** 既存 Aphelion ユーザーは日本語出力に慣れている
- **Decision:** プロジェクト全体の新デフォルトは「English / enabled」、Aphelion 本体は明示的に `Output Language: ja` を設定して後方互換
- **Consequences:** OSS 公開時の初期体験は英語。日本語ユーザーは `rules-designer` で ja を選択、または既存リポジトリは project-rules.md を 1 つコミットするだけで維持

### ADR-04: 共通ルールへの集約 + 各エージェント本文へは 1 行参照

- **Context:** 各エージェント本文に Co-Authored-By ルールをフルコピーする案と、`git-rules.md` に集約する案があった
- **Decision:** ルール本体は `git-rules.md` / `language-rules.md` / `localization-dictionary.md` に集約し、各エージェントは `## Project-Specific Behavior` ブロック（5 行程度）で参照する
- **Consequences:** Issue #30 の原因（ルール未定義 + 記述揺れ）を根本解決。将来のルール追加も集約ファイル側だけ編集すれば全エージェントに波及

### ADR-05: ハイブリッド翻訳の辞書範囲は最小構成（approval gate / askuserquestion fallback / progress の 3 ブロック）

- **Context:** 全ての日本語固定文字列を辞書化すると辞書サイズが膨大
- **Decision:** Issue #32 の方式 3（ハイブリッド）を採用し、辞書は「UI 構造上必要な 10〜15 キー」だけに限定。自由記述は LLM プロンプトで制御
- **Consequences:** 辞書メンテコストを抑えつつ主要 UI 部品は翻訳品質を担保。辞書範囲の拡大は別 issue

### ADR-06: Copilot / Codex 生成物は English 固定

- **Context:** `generate.mjs` が他プラットフォーム向けに変換するが、project-rules.md を読み取る仕組みはない
- **Decision:** platforms/ 配下は English 固定で生成する。プロジェクトルートに project-rules.md を持ち込めば各プラットフォームのエージェントが参照できる設計
- **Consequences:** Copilot / Codex での初期体験はすべて英語。ローカライズは project-rules.md 持ち込みに依存

---

## 10. 未解決論点・ユーザー承認待ち項目

本方針書では以下の論点を実装前に確認する。**2026-04-24 ユーザー承認済み**（AskUserQuestion で個別確認）。

### 確定事項サマリ

| 論点 | 決定 | 備考 |
|------|------|------|
| 10.1 辞書ファイル形式 | **A** | Markdown 1 ファイル |
| 10.2 Round 5 質問粒度 | **A** | 2 問直接提示 |
| 10.3 Behavior ブロック位置 | **A** | エージェント本文の冒頭 |
| 10.4 本体 project-rules.md 範囲 | **A** | 2 項目のみ |
| 10.5 platforms/ 再生成 | **B** | 別 PR（推奨 A と異なる：ユーザー判断） |

### 10.1 辞書ファイル配置とフォーマット

- **A (推奨・採用):** `.claude/rules/localization-dictionary.md` として Markdown 表形式（本方針書の 3.4 案）
- **B:** `.claude/rules/localization/{en,ja}.yaml` のように言語別 YAML に分離

**推奨理由:** 既存ルールファイルが全て Markdown で統一されているため、A のほうが一貫。YAML 化は対応言語が 3 以上になった段階で別 issue として検討。

### 10.2 Round 5 の質問粒度

- **A (推奨・採用):** 上記 4.1 の 2 択（English/Japanese、付与/付与しない）
- **B:** 「(推奨) デフォルトに従う」と「カスタマイズ」の 2 択に統合し、カスタマイズ選択時のみ 2 問目を聞く

**推奨理由:** rules-designer のラウンドは既に Round 1〜4 で 2 択/3 択が並んでおり、A の粒度が既存トーンに合致する。

### 10.3 `Project-Specific Behavior` ブロックを置く位置

- **A (推奨・採用):** 各エージェント本文の **冒頭**（description frontmatter 直後、「You are the ...」セクションの上）
- **B:** 各エージェントの `Bash`/`Write` を伴う手順の直前ごと
- **C:** `.claude/rules/` の共通ファイル 1 箇所のみに書き、エージェント本文には書かない

**推奨理由:** 冒頭に置けば LLM がプロンプト先頭で文脈として読み込み、後段の出力生成全体に影響する。C は Issue #30 の「ルール未定義による揺れ」再発リスクが残る。

### 10.4 Aphelion 本体 project-rules.md にその他の既定値を追記するか

- **A (推奨・採用):** Issue #30/#32 対象の 2 項目のみ
- **B:** この機会に言語（TypeScript/Node.js）・Git 戦略・ビルドコマンド等、Aphelion 本体の正式 project-rules を完成させる

**推奨理由:** B はスコープ拡大。本 PR は Issue #30/#32 統合の実装に集中し、Aphelion 本体 project-rules の拡充は別 PR として切る。

### 10.5 platforms/ 再生成をこの PR に含めるか

- **A (推奨):** 含める（コミット 7 として）
- **B (採用):** 含めない（別 PR）

**ユーザー判断:** 本 PR はスキーマ拡張と実装に集中し、platforms/ 再生成は別 PR で対応する。これに伴い、本 PR のコミット分割戦略（§8）からコミット 7 を除外する。同期ずれは別 PR マージまでの短期間に限定される（実用上許容範囲）。

---

## 11. 参考: エージェントが project-rules.md を読むタイミング

| エージェントタイプ | 読むタイミング |
|-----------------|--------------|
| 対話系 (interviewer, rules-designer, analyst 等) | 起動時（最初の AskUserQuestion 発行直前） |
| 実装系 (developer, scaffolder, tester 等) | 起動時 + `git commit` 直前（cache 禁止） |
| orchestrator (discovery-flow 等) | 起動時（承認ゲート表示前） |
| 分析系 (codebase-analyzer, impact-analyzer) | 起動時 |

Read コストは 1 ファイル 1 KB 程度なので、毎回読み直しても実用上の問題なし。

---

## 12. 完了基準（本方針書としての）

- [x] 背景と 2 Issue の関係を記述
- [x] project-rules.md v1.0 スキーマ定義
- [x] 各 rule ファイル改訂 diff 案
- [x] rules-designer 拡張の質問項目設計
- [x] 対象エージェント一覧と改修方針
- [x] 後方互換のための既存リポジトリ移行手順
- [x] ハイブリッド翻訳方式の実装範囲
- [x] 6 個の ADR を整理
- [x] 5 件の未解決論点をユーザー承認待ち項目として列挙
- [x] PR 分割戦略（コミット 7 本）

**次ステップ:** 本方針書に対するユーザー承認 → 実装フェーズ（別ブランチで PR 作成）
