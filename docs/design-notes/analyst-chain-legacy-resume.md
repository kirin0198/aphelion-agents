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

<!-- §5-8: analyst-core が記入 -->
