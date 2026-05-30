> Last updated: 2026-05-30
> GitHub Issue: [#141](https://github.com/kirin0198/aphelion-agents/issues/141)
> Authored by: analyst-intake (2026-05-30)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/analyst-chain-legacy-resume.md
slug: analyst-chain-legacy-resume
branch_name: fix/analyst-chain-legacy-resume
issue_url: https://github.com/kirin0198/aphelion-agents/issues/141
issue_number: 141
issue_title: "bug: analyst chain — legacy planning doc resume path undefined + sub-agent spawn broken"
issue_type: bug
intake_summary: |
  #130 PR-1 の起動時に、analyst chain (Pattern B) の 3 つの設計上の欠陥が発覚した。
  B1: analyst.md オーケストレーターがサブエージェントとして起動された場合、Agent ツールが
  トップレベルセッション限定のため intake→core チェーンを組めず、サイレントに劣化する。
  B2: Pattern B 以前 (レガシー) の planning doc 再開パスが未定義。handoff ブロックなし・
  GitHub Issue 作成済みの第 3 ケースのブランチ作成オーナーが誰であるか定義されていない。
  B3: analyst-intake のブランチ作成トリガーが current_branch == main 限定で、
  レガシー再開シナリオで「main から作成する」パスが欠如している。
  修正後は: レガシー planning doc の再開でも handoff ブロック注入・ブランチ作成が
  analyst-intake によって行われ、呼び出し元がgit操作を肩代わりしない。
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: <none>
  - UI_SPEC: <none>
  - ARCHITECTURE: <none>
auto_approve: false
output_language: ja
-->

---

## §1 Background / Motivation

### 発生した問題 (#130 PR-1 インシデント)

issue #130 の PR-1 起動時、メインセッションが analyst chain を `Agent(subagent_type="analyst", ...)` で起動しようとした。対象の planning doc (`docs/design-notes/rules-designer-product-type.md`) は Pattern B (#140) 導入以前に作成されたため `<!-- analyst-handoff -->` ブロックが存在せず、GitHub Issue はすでに作成済みだった。

この「レガシー再開」ケースに対してオーケストレーターの処理が未定義だったため、メインセッションが analyst chain の代わりに git 操作（ブランチ作成・planning doc コミット）を自力で実行した。これは **planning-tier と呼び出し元の責務分離を破壊する** 重大な設計欠陥である。

### 根本原因 — 3 つの重複した設計ギャップ

**B1: `analyst.md` がサブエージェントとして起動されるとサイレントに劣化する**

- `analyst.md` は `tools: Read, Glob, Grep, Agent` を宣言し、`Agent` ツールで intake→core チェーンを組む。
- PR #140 の検証により、`Agent` ツールは **トップレベルセッション限定** であることが確認されている。
- `analyst.md` の description に "Invoked by: /analyst slash command only" と記載はあるが、**ランタイムガードが存在しない**。サブエージェントとして呼ばれると `Agent` ツールが使えず、`analyst-intake` を起動できないまま analysis-only 出力を返す。

**B2: レガシー planning doc の再開パスが未定義**

現在の `analyst.md` resume 検出ロジックは 2 ケースしか扱わない:

| ケース | 条件 | ルーティング |
|------|------|------------|
| Fresh | planning doc なし | intake を起動 (Steps A-D + ブランチ作成) |
| Resume (post-Pattern B) | handoff ブロックあり | core を起動 (ブランチ再利用) |

**第 3 ケースが欠落している:**

| ケース | 条件 | ルーティング |
|------|------|------------|
| **Legacy Resume** | planning doc あり・handoff ブロックなし・`> GitHub Issue:` 行あり | **未定義** |

このケースでは、handoff ブロックの注入と work ブランチ作成が必要だが、intake 質問の再実施や `gh issue create` の重複実行は不要である。

**B3: `analyst-intake` のブランチ作成トリガーが脆弱**

`analyst-intake.md` の "Commit on Work Branch (initial)" は `current_branch == main` のときのみブランチを作成する。Legacy Resume シナリオでは呼び出し元が任意のブランチにいる可能性があり、「現在のブランチに関わらず main から新規ブランチを作成する」パスが定義されていない。

---

## §2 Goal / Acceptance Criteria

### 最終ゴール

analyst chain の 3 つの設計ギャップ (B1/B2/B3) をすべて修正し、以下の動作を保証する:

1. **レガシー再開が正しく動作する**
   - `<!-- analyst-handoff -->` ブロックなし・GitHub Issue 作成済みの planning doc に対して analyst chain を再開した場合、handoff ブロックの注入・ブランチ作成・initial commit が **analyst-intake によって** 実行される。呼び出し元 (メインセッションや他エージェント) が git 操作を肩代わりしない。

2. **サブエージェントからの `analyst` 呼び出しが明示的なエラーを返すか正しく動作する**
   - `Agent(subagent_type="analyst", ...)` で非トップレベルから呼ばれた場合、サイレント劣化ではなく明示的な `STATUS: error` + 代替手順の提示、または正しく動作するかのいずれかの動作になる。

3. **git-rules.md の責務マトリクスが明確になる**
   - 3 ケース (fresh / post-Pattern B resume / legacy resume) × (ブランチ作成・initial commit・handoff block 注入) の組み合わせについて、どのエージェントが実行するか一意に定義される。

### Acceptance Criteria (チェックリスト)

- [ ] `docs/design-notes/<slug>.md` が `<!-- analyst-handoff -->` ブロックなしで存在し、`> GitHub Issue:` 行がある状態で analyst chain を再開した場合、`analyst-intake` が injection-only mode で動作し、呼び出し元は git 操作を行わない
- [ ] `analyst.md` オーケストレーターが Legacy Resume ケースを検出し、適切なルーティング (inject-and-branch 推奨) を `AskUserQuestion` で確認する
- [ ] `analyst-intake.md` が `legacy_planning_doc` + `existing_issue_url` パラメーターを受け取った場合、Steps A-B (intake 質問) と Step D (`gh issue create`) をスキップし、handoff ブロック注入・ブランチ作成・initial commit のみ実行する
- [ ] `analyst.md` description および wiki `Agents-Orchestrators.md` (en/ja) に「`Agent` ツール経由での呼び出しは不可; 代替: `analyst-intake` を直接起動する」旨が明記される
- [ ] `src/.claude/rules/git-rules.md` Planning-tier セクションに 3×3 の責務マトリクスが追加される
- [ ] Pattern B (post-#140) の既存フローに対してリグレッションがない

---

## §3 Scope

### In Scope

| # | 対象ファイル | 変更内容 |
|---|---|---|
| F1 | `.claude/agents/analyst.md` | Legacy Resume 検出ブランチの追加 + `AskUserQuestion` (inject-and-branch 推奨 / start-fresh から選択) |
| F2 | `.claude/agents/analyst-intake.md` | injection-only mode の追加: `legacy_planning_doc` + `existing_issue_url` パラメーターを受け取ったとき、Steps A-B・D をスキップし、handoff ブロック注入・ブランチ作成・initial commit のみ実行 |
| F3 | `.claude/agents/analyst.md` description + `docs/wiki/en/Agents-Orchestrators.md` + `docs/wiki/ja/Agents-Orchestrators.md` | 「main-session 以外から `analyst` を `Agent` 経由で起動してはならない」を明示; 代替手順 (analyst-intake 直接起動 → HANDOFF_PAYLOAD 転送 → analyst-core 起動) を文書化 |
| F4 | `src/.claude/rules/git-rules.md` | Planning-tier セクションに責務マトリクスを追加 (3 ケース × ブランチ作成 / initial commit / handoff block 注入) |

### Out of Scope

- `Agent` ツールのゲーティングポリシー変更 (Anthropic 側の仕様; 変更不可)
- 既存のレガシー planning doc の一括マイグレーション (F1+F2 でオンデマンドに対応するため不要)

### Optional (analyst-core が判断)

- F5: `analyst.md` が自身の `Agent` ツールが利用不可であることを検出した場合に `STATUS: error` を emit するハードニング

---

## §4 Constraints / Open Questions

### 制約

1. **Pattern B 互換性の維持**: #140 で確立した intake→core spawn チェーン (post-Pattern B resume) を破壊しないこと。
2. **バイリンガル同期**: F3 の wiki 変更は `docs/wiki/en/Agents-Orchestrators.md` と `docs/wiki/ja/Agents-Orchestrators.md` を同一 PR で更新する (`language-rules.md` §3.2 の Same-PR mandatory sync rule)。
3. **injection-only mode のインターフェース**: `legacy_planning_doc` + `existing_issue_url` パラメーターの受け渡し方 (YAML フロントマター vs. プロンプトテキスト vs. HANDOFF_PAYLOAD 拡張) は analyst-core が設計する。

### Open Questions

1. **architect 関与の要否**: F1/F2 はオーケストレーションコントラクトの変更を伴うため、architect エージェントのレビューが必要か。analyst-core が Patch/Minor/Major を判断した後に決定する。
2. **F5 の優先度**: F3 のドキュメント修正でサイレント劣化の防止が十分であれば F5 はスキップ可能。analyst-core が判断する。
3. **injection-only mode のトリガー条件**: `analyst.md` が Legacy Resume を検出して `analyst-intake` を injection-only mode で呼ぶ場合、HANDOFF_PAYLOAD の 13 フィールドスキーマをそのまま使うか、拡張フィールド (`legacy_planning_doc`, `existing_issue_url`) を追加するかを analyst-core が設計する。

---

## §5 Deep Analysis (analyst-core)

> Authored by: analyst-core (2026-05-30)

このセクションでは B1/B2/B3 を実ファイルに対して検証し、F1-F5 の修正設計を確定する。

### 5.0 配布モデルの確認 (修正対象ファイルの正準ロケーション)

`bin/aphelion-agents.mjs` (L24-25, L335) を確認した結果、本リポジトリの配布モデルは以下:

| 種別 | 正準ロケーション | 備考 |
|------|----------------|------|
| エージェント定義 (`analyst*.md`) | **`.claude/agents/`** (repo root) | `<packageRoot>/.claude/` から overlay 配布。`src/.claude/agents/` は**存在しない** |
| ルール (`git-rules.md` 等) | **`src/.claude/rules/`** | 二重ロード回避のため repo root に deployed copy を置かない。`src/` が単一ソース |
| wiki (`Agents-Orchestrators.md`) | `docs/wiki/{en,ja}/` | バイリンガル同期対象 |

→ **developer が編集するファイル**: agents は `.claude/agents/analyst*.md`、rules は `src/.claude/rules/git-rules.md`、wiki は `docs/wiki/{en,ja}/`。この区別は §7 で確定する。

### 5.1 B1 検証 — `analyst.md` のサブエージェント起動時サイレント劣化

`.claude/agents/analyst.md` を確認:

- L11: `tools: Read, Glob, Grep, Agent` — `Agent` ツールに依存。
- L69 (`Agent(subagent_type="analyst-intake", ...)`)、L83 (`Agent(subagent_type="analyst-core", ...)`) — intake→core チェーンは `Agent` ツールでのみ成立する。
- L3-10 description: "Invoked by: /analyst slash command only. NOT invoked from flow orchestrators (they spawn analyst-intake / analyst-core directly themselves, since analyst.md uses the Agent tool which is unavailable in sub-agent contexts)." — **ドキュメントとしての記載はあるが、ランタイムガードが存在しない**。

→ **B1 確定**。`Agent(subagent_type="analyst", ...)` で非トップレベルから呼ばれると、L69/L83 の `Agent` 呼び出しが失敗し、analyst.md は intake/core を起動できないまま停止する。本セッションでこのバグを #130 PR-1..PR-6 / #150 / #141 で繰り返しライブで踏んでいる。実証済みの回避策は「メインセッションが `analyst-intake` を直接起動 → HANDOFF_PAYLOAD を `analyst-core` に直接転送」。

### 5.2 B2 検証 — レガシー再開パス未定義

`.claude/agents/analyst.md` の Resume Detection (L31-60) を確認:

- L33-39: `Glob("docs/design-notes/*.md")` + `Grep("<!-- analyst-handoff", ...)` で handoff ブロックを探索。
- L41-60: handoff ブロックが**見つかった場合**のみ resume を提示。見つからない場合は L64 Fresh Invocation に落ちる。

→ **B2 確定**。検出ロジックは 2 ケース (handoff ブロックあり=resume / なし=fresh) のみ。「planning doc あり・handoff ブロックなし・`> GitHub Issue:` 行あり」のレガシー第 3 ケースは fresh として扱われ、`gh issue create` 重複・intake 質問再実施という誤動作を招く。

### 5.3 B3 検証 — `analyst-intake` のブランチ作成トリガー

`.claude/agents/analyst-intake.md` の "Commit on Work Branch (initial)" (L234-274) を確認:

```bash
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" = "main" ]; then        # L243 ← トリガー
  ...
  git checkout -b "$branch_name"
fi
```

→ **B3 確定**。L243 のガードにより、`current_branch == main` のときのみブランチを作成する。レガシー再開シナリオで呼び出し元が非 main ブランチにいる場合 (本セッションのように別 PR 作業中)、ブランチが作成されず、initial commit が誤ったブランチに乗る。

### 5.4 F1 設計 — `analyst.md` レガシー再開検出ブランチ (slash-command パス)

analyst.md Resume Detection に第 3 分岐を追加する。検出条件:

```
planning doc が存在 AND <!-- analyst-handoff --> ブロックなし AND `> GitHub Issue: [#N]` 行あり
  → Legacy Resume
```

AskUserQuestion (2 択):
- **inject-and-branch (推奨)**: `analyst-intake` を **injection-only mode** で起動 (legacy_planning_doc + existing_issue_url/number を渡す) → HANDOFF_PAYLOAD を受領 → `analyst-core` を起動。
- **start-fresh**: 既存 doc を無視して新規 intake として扱う (重複 issue を作る可能性を承知の上で)。

**F1 と B1 の整合性 (重要)**: F1 は analyst.md 内で `Agent` を使うため、**`/analyst` slash-command パス (トップレベル) でのみ機能する**。FLOW やメインセッションが駆動する場合は B1 によりこの経路は使えない。したがって F1 は「`/analyst` を直接実行したユーザー」向け、F3 は「プログラム / flow 駆動」向けの契約であり、両者は **相補的** である (どちらも injection-only mode の analyst-intake に収束する)。

### 5.5 F2 設計 — `analyst-intake` injection-only mode (両パスの収束点)

これが本修正の核心。F1 (slash) と F3 (programmatic) の両方が最終的にここに収束する。

**トリガー入力** (プロンプトテキストで受け渡し。HANDOFF_PAYLOAD スキーマは変更しない):
- `legacy_planning_doc: <path>` — 既存 planning doc のパス
- `existing_issue_url: <url>`
- `existing_issue_number: <N>`

これら 3 つが揃って渡された場合に injection-only mode が発動する。

**スキップする処理**:
- Step A-B (intake AskUserQuestion) — 既存 doc から §1-4 を読むため不要
- Step D (`gh issue create`) — issue は既存
- proposals/ promotion — 既存 doc が input

**実行する処理**:
1. 既存 planning doc (`legacy_planning_doc`) を Read し、§1-4・slug・issue_type を抽出
2. `<!-- analyst-handoff -->` ブロックをヘッダ直後に注入 (13 フィールドを既存 doc の内容と `existing_issue_*` から構築)
3. **main からブランチを作成** (B3 修正 — 後述 5.6)
4. initial commit (handoff ブロック注入分) + push
5. HANDOFF_PAYLOAD を emit

**B3 修正と既存ブランチ再利用ガードの保持**: injection-only mode では現在ブランチに関わらず main からブランチを作成する。ただし git-rules.md §"Branch Lifecycle" の既存ブランチ再利用ガード (ローカル/リモートに同名ブランチがある場合はユーザーに確認) は保持する。

### 5.6 B3 修正のロジック詳細

`analyst-intake.md` L234-274 のブランチ作成ロジックを以下に変更:

```bash
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$INJECTION_ONLY_MODE" = "true" ] || [ "$current_branch" = "main" ]; then
  # branch_name を導出 (issue_type から prefix)
  # 既存ブランチ再利用ガード: ローカル/リモートに同名があればユーザー確認
  git checkout main && git pull origin main
  git checkout -b "$branch_name"
fi
```

ポイント: `INJECTION_ONLY_MODE` のときは現在ブランチに関わらず `git checkout main` してから新規作成する。これにより「別 PR 作業中の非 main ブランチからレガシー再開した」ケースでも正しい起点 (main) からブランチが切られる。通常 fresh モード (current_branch==main) の挙動は不変 = リグレッションなし。

### 5.7 F4 設計 — git-rules.md 責務マトリクス

`src/.claude/rules/git-rules.md` の "Branch & PR Strategy" → Planning-tier (L156-162) の直後に以下のマトリクスを追加:

| ケース | 検出条件 | ブランチ作成 | initial commit | handoff block 注入 |
|------|---------|------------|---------------|------------------|
| **Fresh** | planning doc なし | analyst-intake (main から) | analyst-intake | analyst-intake (新規生成) |
| **Resume (post-Pattern B)** | handoff block あり | (作成済みを再利用) | analyst-core (§5-8) | (既存) |
| **Legacy Resume** | doc あり・handoff block なし・`> GitHub Issue:` あり | analyst-intake (injection-only, main から、現在ブランチ不問) | analyst-intake (注入分) | analyst-intake (既存 doc に注入) |

呼び出し元 (メインセッション / flow / analyst.md) は**いずれのケースでも git 操作を肩代わりしない**ことを明記する。

### 5.8 F5 評価 — self-error-guard の要否

F5 (analyst.md が自身の `Agent` ツール利用不可を検出して `STATUS: error` を emit) を評価:

- **賛成論**: B1 のサイレント劣化を「ラウドな失敗」に変える。誤起動時にユーザーが即座に気づける。
- **反対論**: (a) `Agent` ツールが利用不可かどうかをエージェント内部から事前検出する確実な手段がない (実際に呼んで InputValidationError を捕捉するしかなく、その捕捉挙動自体が環境依存)。(b) F3 のドキュメント明記 + F1 の slash-command 限定で、誤起動の入口は実質塞がれる。(c) 本修正の主目的は「正しいフロー (injection-only mode) を一級市民として文書化する」ことであり、F5 は防御的ハードニングに過ぎない。

→ **推奨: F5 はスキップ**。F3 のドキュメント契約 + F1 の検出分岐で十分。ただし developer が低コストで実装できると判断した場合、analyst.md の Fresh/Resume いずれの `Agent` 呼び出しでも、呼び出しが失敗したら `STATUS: error` + `ERROR_REASON: spawned as sub-agent; cannot use Agent tool; caller must spawn analyst-intake directly` を emit する**フォールバック節**を Failure Handling セクションに追記する形であれば、最小コストで価値があるため optional 採用可とする。

---

## §6 Approach Decision (analyst-core)

### 6.1 採用する修正セット

**F1 + F2 + F3 + F4 を採用** (必須)。**F5 は optional** (developer 判断、Failure Handling への注記追記のみ許容)。

理由: B1/B2/B3 は相互に絡み合っており、F2 (injection-only mode) が両方の起動パス (F1 slash / F3 programmatic) の収束点かつ B3 修正の担い手である。F4 はこの責務を恒久ルールとして固定する。F1 は slash パスのみ、F3 は programmatic パスを文書化し、両者で誤起動の入口を塞ぐ。どれか 1 つでも欠けると不完全。

### 6.2 architect の要否 — **developer-direct を推奨**

これが最重要の承認ゲート判断である。以下を honest に評価した:

**developer-direct を推奨する根拠**:
1. **コード・ARCHITECTURE.md が存在しない**。変更対象はすべて markdown のエージェントプロンプト / ルール / wiki。architect の主成果物 (ARCHITECTURE.md の設計) を生む余地がない (本メタプロジェクトは SPEC.md/ARCHITECTURE.md を持たない)。
2. **実証済みフローの成文化である**。injection-only flow (メインが intake 直接起動 → core 転送) は #130 PR-1..PR-6 / #150 / #141 で**すでに繰り返し実運用されている**。新規の設計探索ではなく、動いている挙動をプロンプト / ルールに固定する作業。
3. **インターフェース設計は本 §5 で確定済み**。injection-only mode のトリガー入力 (プロンプトテキストで `legacy_planning_doc` + `existing_issue_url` + `existing_issue_number`、HANDOFF_PAYLOAD スキーマは不変)、ブランチ作成ロジック、責務マトリクスをすべて確定した。architect が再設計する余地はなく、§8 の file-by-file brief で developer が直接実装できる粒度に落としてある。
4. **「オーケストレーションコントラクトの変更」だが構造変更ではない**。3 エージェント + 1 ルール + wiki を触るが、エージェント数 (42) は不変、新エージェント・新フロー・新 HANDOFF フィールドの追加はない。既存契約の**穴埋め (未定義の第 3 ケースの定義)** であり、アーキテクチャの再構成ではない。

**architect を挟むべきという反対論 (と反駁)**:
- 「3 エージェント契約 + ルール + wiki を横断するので architect レビューが妥当」→ 横断はするが、各変更は独立かつ確定済み。architect を挟むと「動いている実証フローを再設計する」リスク (over-engineering) のほうが大きい。
- issue body が "likely architect" と示唆 → これは intake 段階の暫定判断。深掘りの結果、設計探索の余地がないことが判明したため上書きする。

→ **結論: developer-direct を推奨**。ただしこれは横断的契約変更であるため、developer には**詳細な file-by-file HANDOFF_BRIEF (§8) を必須提供**し、リグレッション境界 (Pattern B 既存フロー不変) を明示する。最終判断はユーザーの承認ゲートに委ねる。

### 6.3 メンテナンスティア分類

**Minor**。複数のエージェント契約 + ルール + wiki を touch するが、プロダクトコード変更なし・新機能なし・破壊的変更なし。既存挙動の穴埋め + ドキュメント化が主体。Patch にしては横断範囲が広く (5 ファイル + バイリンガル wiki)、Major にしては構造変更がない。

---

## §7 Document Changes (analyst-core)

developer が編集する正準ファイル (§5.0 の配布モデルに基づく):

| # | ファイル (正準パス) | 変更概要 |
|---|---|---|
| F1 | `.claude/agents/analyst.md` | Resume Detection に Legacy Resume 第 3 分岐 + AskUserQuestion (inject-and-branch 推奨 / start-fresh) を追加。injection-only mode で analyst-intake を起動する経路を記述。 |
| F2 + B3 | `.claude/agents/analyst-intake.md` | injection-only mode セクション追加 (トリガー入力・スキップ処理・実行処理)。"Commit on Work Branch (initial)" のブランチ作成ガードを `INJECTION_ONLY_MODE || current_branch==main` に拡張 (既存ブランチ再利用ガード保持)。 |
| F3 | `.claude/agents/analyst.md` description + `docs/wiki/en/Agents-Orchestrators.md` + `docs/wiki/ja/Agents-Orchestrators.md` | 「非トップレベルから `analyst` を `Agent` 経由起動禁止」を明記。代替手順 (analyst-intake 直接起動 [legacy 時は legacy_planning_doc 付き] → HANDOFF_PAYLOAD 転送 → analyst-core 起動) を文書化。wiki は en/ja 同一 PR 同期 (language-rules.md §3.2)。 |
| F4 | `src/.claude/rules/git-rules.md` | "Branch & PR Strategy" Planning-tier 直後に 3 ケース × (ブランチ作成 / initial commit / handoff block 注入) 責務マトリクス追加。`> Update history:` に追記。 |
| F5 (optional) | `.claude/agents/analyst.md` | Failure Handling に「Agent 呼び出し失敗時は STATUS: error + 代替手順提示」フォールバック節を追記 (developer 判断)。 |

**SPEC.md / UI_SPEC.md / ARCHITECTURE.md**: 本メタプロジェクトには存在しない → no_change / not_exists。

**バイリンガル同期注意**: F3 の wiki 変更は en + ja を同一 PR で。`scripts/check-readme-wiki-sync.sh` の対象外 (wiki ページ間の見出しパリティはこのスクリプトの Check 対象だが、Agents-Orchestrators の en/ja 見出し構造を lockstep に保つこと)。

---

## §8 Handoff Brief (analyst-core → developer)

### 実装方針 (developer 向け file-by-file)

**前提**: ブランチ `fix/analyst-chain-legacy-resume` を再利用 (新規作成不要)。エージェント数 42 不変。新 HANDOFF フィールド・新エージェント追加なし。

#### 1. `.claude/agents/analyst.md` (F1 + F3 + optional F5)

- **Resume Detection (L31-60)**: handoff ブロック検出の後段に Legacy Resume 分岐を追加。
  - 検出: `Glob` で見つけた doc に `<!-- analyst-handoff` が**なく**、かつ `> GitHub Issue: [#N]` 行が**ある**場合。
  - AskUserQuestion: "inject-and-branch (推奨) / start-fresh" の 2 択 (ja 出力)。
  - inject-and-branch 選択時: `Agent(subagent_type="analyst-intake", prompt=...)` に `legacy_planning_doc: <path>` + `existing_issue_url: <url>` + `existing_issue_number: <N>` をプロンプトテキストで渡す。返ってきた HANDOFF_PAYLOAD を `analyst-core` に転送 (既存 L78-86 の流れを再利用)。
- **description (L3-10) + Mission**: 「main-session / flow から `Agent(subagent_type="analyst")` 経由で起動してはならない。代替: analyst-intake を直接起動せよ」を強調。F3 の wiki 記述と文言を揃える。
- **(optional F5) Failure Handling (L99-107)**: intake/core 起動の `Agent` 呼び出しが失敗した場合、`STATUS: error` + `ERROR_REASON: spawned as sub-agent; cannot use Agent tool; spawn analyst-intake directly instead` を emit するフォールバックを追記。

#### 2. `.claude/agents/analyst-intake.md` (F2 + B3)

- **新セクション "Injection-only Mode" を追加** (Intake during standalone invocation の前後が適切):
  - トリガー: プロンプトに `legacy_planning_doc` + `existing_issue_url` + `existing_issue_number` の 3 つが揃っているとき発動。
  - スキップ: Step A-B (intake 質問)、Step D (`gh issue create`)、proposals promotion。
  - 実行: (a) `legacy_planning_doc` を Read し §1-4・slug・issue_type 抽出 → (b) `<!-- analyst-handoff -->` ブロックをヘッダ直後に注入 (13 フィールドを既存内容 + existing_issue_* から構築) → (c) main からブランチ作成 → (d) initial commit + push → (e) HANDOFF_PAYLOAD emit。
- **"Commit on Work Branch (initial)" (L234-274) のブランチ作成ガード変更** (B3):
  - L243 `if [ "$current_branch" = "main" ]; then` を `if [ "$INJECTION_ONLY_MODE" = "true" ] || [ "$current_branch" = "main" ]; then` 相当に拡張。
  - injection-only 時は `git checkout main && git pull origin main` してから `git checkout -b`。
  - 既存ブランチ再利用ガード (L269-271) は保持。
  - **リグレッション境界**: 通常 fresh モード (`current_branch==main`) の挙動は完全不変。

#### 3. `src/.claude/rules/git-rules.md` (F4)

- "Branch & PR Strategy" の Planning-tier 箇条書き (L156-162) 直後に §5.7 の 3×3 責務マトリクスを挿入。
- 「呼び出し元はいずれのケースでも git 操作を肩代わりしない」を 1 行明記。
- ファイル冒頭の `> Update history:` に `- 2026-05-30: add Planning-tier legacy-resume responsibility matrix (#141)` を追記。
- **注意**: git-rules.md は `src/.claude/rules/` が単一正準ソース。repo root に deployed copy はない (§5.0)。

#### 4. `docs/wiki/{en,ja}/Agents-Orchestrators.md` (F3)

- `### analyst (top-level orchestrator)` (en L147-155 / ja 対応箇所) の Responsibility に「`Agent` ツール経由起動は不可。flow / main-session は analyst-intake を直接起動する」を明記。
- Legacy Resume ケースと injection-only mode の存在を 1-2 文で言及 (analyst-intake の項に「injection-only mode (legacy_planning_doc + existing_issue_url を受けると intake 質問・gh issue create をスキップ)」を追記)。
- **en + ja を同一 PR で同期** (language-rules.md §3.2)。見出し構造は lockstep。

### 受け入れ確認 (developer 完了時)

- レガシー doc (handoff block なし + `> GitHub Issue:` あり) で再開 → analyst-intake が injection-only で動作、呼び出し元は git 操作せず、`gh issue create` 重複なし。
- Pattern B 既存フロー (fresh / post-Pattern B resume) にリグレッションなし。
- git-rules.md マトリクスが 3 ケースのブランチ作成オーナーを一意に定義。
- wiki en/ja が同期済み。
