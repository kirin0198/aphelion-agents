> Last updated: 2026-07-25
> GitHub Issue: [#166](https://github.com/kirin0198/aphelion-agents/issues/166)
> Authored by: analyst-intake (2026-07-25)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/approval-mode-escalation-wiring.md
slug: approval-mode-escalation-wiring
branch_name: fix/approval-mode-escalation-wiring
issue_url: https://github.com/kirin0198/aphelion-agents/issues/166
issue_number: 166
issue_title: ESCALATION_REQUIRED を発行側5エージェントが未定義 — autonomous エスカレーション配線の欠陥一式
issue_type: bug
intake_summary: |
  【背景・動機】
  直前にマージされた #161「承認モード（autonomous/interactive）のトリアージ連動とエスカレーション機構」
  (PR #165, commit 2cb8245) が導入した機能自体に、2026-07-04 全体レビュー（ADR:
  docs/design-notes/adr-repo-review-2026-07-04.md、PR #217 で main にマージ済み、commit 9352b18）
  で4件の欠陥が検出された。ADR の Decision §1（最優先）に「本ブランチが導入した機能自体の
  欠陥であり、マージ前修正が最も安価」として #166 と #178/#179/#180 が並記されている。

  【目標 / 受け入れ条件】
  1. #166 (critical): ESCALATION_REQUIRED / ESCALATION_REASON を Route A（developer / architect /
     security-auditor / tester / reviewer の自己申告）で実際に発行させる。発行側5エージェントの
     AGENT_RESULT 節に emit トリガーを追加し、orchestrator-rules.md §"Approval Mode" の Route A 記述
     ・agent-communication-protocol.md の Field Reference と整合させる。
  2. #178 (warning): maintenance-flow.md の「2つの必須 HITL ゲート」が autonomous（Patch/Minor既定）
     下で自動確認され人間不在になる矛盾を解消する。orchestrator-rules.md L65-67 の「mandatory HITL」契約
     との整合を取る（ゲート自体を autonomous 対象外にするか、orchestrator-rules 側に autonomous 自動確認
     を明示的に追認するか）。
  3. #179 (warning): maintenance-flow.md L39-40 がローカルに発明した Patch/Minor→autonomous,
     Major→forced interactive マッピングを、orchestrator-rules.md の Triage-Linked Default 表
     （現状 Minimal/Light/Standard/Full の4行のみ）に統合する。
  4. #180 (warning): APPROVAL_MODE がオーケストレーター側フェーズゲートのみに配線され、エージェント内部の
     必須 AskUserQuestion 停止（analyst-core.md §Step3, change-classifier.md, impact-analyzer.md,
     codebase-analyzer.md, visual-designer.md, spec-designer.md 等）に一切伝播していない問題を解消する。
     HANDOFF/spawn プロンプト経由で APPROVAL_MODE を伝搬する機構、または「エージェント内ゲートは
     autonomous 対象外」という Invariant Rules への明文化のいずれかを、#132 のトークン削減方針と
     衝突しない形で選定する。

  【スコープ】
  - `src/.claude/rules/agent-communication-protocol.md`（canonical。ESCALATION_REQUIRED emit 主体の
    明記強化、Field Reference 整合）
  - `.claude/orchestrator-rules.md`（Triage-Linked Default 表への Patch/Minor/Major 行追加検討、
    Invariant Rules への APPROVAL_MODE 内部ゲート伝播規約の追記検討）
  - `.claude/agents/{developer,architect,security-auditor,tester,reviewer}.md`（ESCALATION_REQUIRED /
    ESCALATION_REASON 発行トリガーの追加）
  - `.claude/agents/maintenance-flow.md`（必須 HITL ゲート×2 の autonomous 下の扱い、APPROVAL_MODE
    マッピングのローカル発明の解消）
  - `.claude/agents/{analyst-core,change-classifier,impact-analyzer,codebase-analyzer,visual-designer,spec-designer}.md`
    （内部承認ゲートへの APPROVAL_MODE 伝播、または対象外明文化）
  - 参考: `docs/design-notes/archived/approval-mode-triage.md`（#161 の設計ノート。§9.7 リスク表に
    ADR-006「個別エージェントへの emit 指示追記は本 issue スコープ外」として今回の #166 相当の
    under-emit リスクが自認・フォローアップ切り出し済み）

proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# ESCALATION_REQUIRED を発行側5エージェントが未定義 — autonomous エスカレーション配線の欠陥一式

## §1 背景・動機

直前にマージされた #161「承認モード（autonomous / interactive）のトリアージ連動とエスカレーション機構」
（PR #165、commit `2cb8245`）は、下流フローの自走（autonomous）とその安全網（エスカレーション機構）を
Aphelion に導入した。しかし 2026-07-04 の全体レビュー（ADR:
`docs/design-notes/adr-repo-review-2026-07-04.md`、PR #217 として main にマージ済み、commit `9352b18`）
で、この機能自体が配線不全であることが判明した。

ADR の Findings（agents 節）は次のように総括している:

> 本ブランチの approval-mode がオーケストレーター側と protocol にのみ配線され、発行側エージェントが
> ゼロ（#166 ほか #178/#179/#180）

ADR の Decision §1（最優先）は、この4件を次のように位置づけている:

> **最優先（本ブランチ or 直後の PR）**: #166（ESCALATION_REQUIRED 発行側追加 — 本ブランチが導入した
> 機能自体の欠陥であり、マージ前修正が最も安価）、#178/#179/#180（同じく approval-mode の未決事項）

すなわち4件は互いに独立した issue ではなく、#161 が導入した単一機能（承認モード機構）の異なる断面に
現れた相互依存の欠陥であり、同一 PR で解決するのが妥当と判断されている。

## §2 目標 / 受け入れ条件

### #166 (critical) — ESCALATION_REQUIRED 発行側の不在

- `.claude/orchestrator-rules.md:471-473` と `src/.claude/rules/agent-communication-protocol.md:84-85,93`
  は「developer / architect / security-auditor / tester / reviewer が `ESCALATION_REQUIRED: true` を
  AGENT_RESULT に設定する」（Route A）と宣言しているが、当該5エージェントの定義ファイルには
  ESCALATION_REQUIRED / ESCALATION_REASON への言及が一切ない（`grep -rn ESCALATION` で0件）。
- エージェントは自身の定義ファイルから AGENT_RESULT を構築するため、Route A は現状恒久的に発火しない。
- **受け入れ条件**: 5エージェントの AGENT_RESULT 節に ESCALATION_REQUIRED / ESCALATION_REASON と
  3つのトリガー条件（ADR-003 準拠: SPEC外の技術判断／破壊的変更／複数妥当方針で判断不能）を追加し、
  実際に Route A が発火することを確認できる状態にする。

### #178 (warning) — maintenance 必須 HITL ゲートと autonomous の矛盾

- `orchestrator-rules.md:65-67` は maintenance の2ゲートを「mandatory HITL … auto-approve モードでも
  スキップされない（ログ+自動確認）」と定義するが、autonomous モードには言及していない。
- `maintenance-flow.md:20,39-40` は autonomous でも「ログ+自動確認」に拡張し、同時に Patch/Minor の
  デフォルトを autonomous にしている。結果、デフォルトの maintenance 実行では Gate #1（変更計画承認）
  も Gate #2（最終確認）も人間が一切確認しない状態になり得る。
- **受け入れ条件**: Gate #1/#2 を autonomous でも実停止にする（Patch 実行における唯一の人間チェック
  ポイントとする）か、orchestrator-rules 側で autonomous 自動確認を明示的に承認し「mandatory HITL」の
  表現を改めるか、いずれかの方針で契約矛盾を解消する。

### #179 (warning) — APPROVAL_MODE マッピングの canonical 不在

- `orchestrator-rules.md:419-424` の Triage-Linked Default 表は Minimal/Light/Standard/Full の4行の
  みを定義する。`maintenance-flow.md:39-40` は「Patch/Minor → autonomous、Major → forced interactive」
  をローカルに発明しており、override 手段なしに Minor（Standard 相当規模もあり得る）が autonomous 固定
  になる。project-rules.md の `## Approval Mode` にも maintenance 用キーが無い。
- 5フロー中 maintenance のみが canonical アンカーを持たない。
- **受け入れ条件**: orchestrator-rules の Triage-Linked Default 表に Patch/Minor/Major 行を追加するか、
  maintenance-flow 側の記述を削除して canonical 参照に統一するか、いずれかの方針で一本化する。
  Minor の relax/tighten 可否を project-rules キーとして定義することも検討する。

### #180 (warning) — APPROVAL_MODE のエージェント内ゲート未伝播

- approval-mode 設計はオーケストレーター側のフェーズゲートしか緩和しない。`analyst-core.md:129-177`
  （Step 3「承認を得るまで停止」）、`change-classifier.md:143-183`、`impact-analyzer.md:127-170`、
  `codebase-analyzer.md:254-295`、`visual-designer.md:79-129`、`spec-designer.md:141` はエージェント
  内部に必須 AskUserQuestion 停止を実装しており、いずれも APPROVAL_MODE に言及しない（AUTO_APPROVE
  のみ、しかも一部エージェントのみ対応）。
- autonomous 実行でもこれらの内部ゲートで停止するため、フローによっては autonomous がほぼ機能しない、
  あるいはフェーズごとに挙動が不揃いになる。
- **受け入れ条件**: HANDOFF/spawn プロンプトで APPROVAL_MODE を伝搬する機構（HANDOFF_PAYLOAD の
  auto_approve と同様のパターン）を定義するか、「エージェント内ゲートは autonomous の対象外」を
  orchestrator-rules の Invariant Rules に明文化するか、いずれかの方針で骨抜き状態を解消する。
  #132（トークン削減方針）と衝突しない書き方であること。

## §3 スコープ

**影響ファイル（想定）:**

- `src/.claude/rules/agent-communication-protocol.md`（canonical） — Field Reference の
  ESCALATION_REQUIRED / ESCALATION_REASON 記述強化（発行主体・条件の明記）
- `.claude/orchestrator-rules.md` — Triage-Linked Default 表への Patch/Minor/Major 統合検討、
  Invariant Rules への APPROVAL_MODE 内部ゲート伝播規約の追記検討
- `.claude/agents/developer.md` / `architect.md` / `security-auditor.md` / `tester.md` / `reviewer.md`
  — ESCALATION_REQUIRED / ESCALATION_REASON 発行トリガーの追加（#166）
- `.claude/agents/maintenance-flow.md` — 必須 HITL ゲート×2 の autonomous 下の扱い（#178）、
  APPROVAL_MODE マッピングのローカル発明の解消（#179）
- `.claude/agents/analyst-core.md` / `change-classifier.md` / `impact-analyzer.md` /
  `codebase-analyzer.md` / `visual-designer.md` / `spec-designer.md` — 内部承認ゲートへの
  APPROVAL_MODE 伝播、または対象外明文化（#180）

**スコープ外（本 issue クラスタでは扱わない）:**

- ADR の Info 項目群（エスカレーションゲートの AskUserQuestion 日本語ハードコード、5フロー共通の
  APPROVAL_MODE 決定ステップの番号順序不整合、rules-designer の `## Approval Mode` テンプレ未整備、
  wiki（Architecture-Operational-Rules / Triage-System）未同期など） — ADR の Decision §5 で
  「関連 Warning の修正 PR に同梱するか、次回レビューまで受容」とされている項目。本クラスタで
  対応する場合は analyst-core の判断で範囲を明示すること。
- 新規エージェント追加、triage 判定ロジック自体の変更。
- casing 規約（`APPROVAL_MODE` / `AUTO_APPROVE`）自体の再設計 — #161 で ADR-001（案B）として既に
  確定済みであり、本クラスタは「配線漏れの修正」であって「設計のやり直し」ではない。

## §4 制約 / オープン課題

**プロセス制約（ユーザー指定）:**

- 新規 GitHub issue を作成しないこと。`gh issue create` は実行禁止。対象4issue（#166/#178/#179/#180）
  は起票済み。
- 主トラッキング issue は #166。設計ノートの `> GitHub Issue:` ヘッダーには #166 を先頭に置く
  （archive 自動化の突合キーは先頭 issue のみ有効なため、#178/#179/#180 は本文中の関連 issue 言及に
  留める）。
- #178/#179/#180 は #166 と同一 PR で解決する前提（4件は同一機能の相互依存する欠陥）。
- 想定ブランチ名: `fix/approval-mode-escalation-wiring`。
- Output Language: ja（本リポジトリに `.claude/rules/project-rules.md` が存在せず、グローバル
  `~/.claude/rules/` を参照している）。

**前提・依存関係:**

- 本クラスタは #161（承認モードのトリアージ連動とエスカレーション機構、PR #165, commit `2cb8245`）
  がマージ済みであることを前提とする（すでに main にマージ済み）。
- `docs/design-notes/archived/approval-mode-triage.md`（#161 の設計ノート）§9.5 TASK-005〜007 は
  「フローオーケストレーター5本への結線」を実施済みだが、§9.7 リスク表の1行目に
  「個別エージェントへ emit 指示を追記しない（ADR-006）ため、経路 A の ESCALATION_REQUIRED が
  実運用で under-emit される」リスクを**自認した上でフォローアップ issue へ切り出す**方針が
  明記されていた。#166 はこのフォローアップの実体化である。
- `docs/design-notes/adr-repo-review-2026-07-04.md` は PR #217（commit `9352b18`）で main にマージ済み。
  本設計ノートが参照する ADR 本文は `docs/design-notes/adr-repo-review-2026-07-04.md` として直接
  読める。

**オープン課題（analyst-core が承認ゲートでユーザーに確認すべき論点）:**

1. **#178 の設計選択**: maintenance の必須 HITL ゲート×2 を autonomous 下でどう扱うか。
   (a) ゲート自体を autonomous の緩和対象外として実停止させる、(b) orchestrator-rules 側で
   autonomous 自動確認を明示的に承認し「mandatory HITL」の表現を改める。両案はトレードオフが異なる
   （(a) は Patch/Minor の自走性を下げる、(b) は「必須人間確認」という既存契約の意味を弱める）。
2. **#179 の設計選択**: APPROVAL_MODE マッピングの canonical をどこに置くか。(a) orchestrator-rules
   の Triage-Linked Default 表に Patch/Minor/Major 行を追加して5フロー共通表に統合する、(b) maintenance
   側の記述を削除し canonical 参照のみに統一する（Patch/Minor 用の対応表自体は別途必要）。
3. #180 の APPROVAL_MODE 伝播機構は #132（トークン削減方針）と衝突しない書き方が必要（プロンプト経由の
   都度受け渡しか、ルールファイルへの規約追記による暗黙適用か）。analyst-core による両案の比較検討が
   必要。
4. #166 の emit トリガー追加が5エージェント定義ファイルへの本文追記になるため、#131/#132（エージェント
   定義簡素化・トークン削減）が確立した簡潔な記述スタイルとの整合を確認すること。

---

## §5 詳細分析（analyst-core）

（analyst-core が記入）

## §6 アプローチ

（analyst-core が記入）

## §7 ドキュメント変更計画

（analyst-core が記入）

## §8 architect ハンドオフブリーフ

（analyst-core が記入）
