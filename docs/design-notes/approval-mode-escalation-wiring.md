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

> 記入: analyst-core (2026-07-25)。§5 は設計選択に依存しない事実確認・検証結果。

### 5.1 現状の配線マップ（実測）

| 検証 | 結果 |
|------|------|
| `.claude/agents/{developer,architect,security-auditor,tester,reviewer}.md` の `ESCALATION` 出現数 | **0 件**（#166 の主張を確認） |
| `AskUserQuestion` を含む非オーケストレーターエージェント | 11本: analyst-core(1) / analyst-intake(11) / change-classifier(2) / codebase-analyzer(1) / impact-analyzer(1) / interviewer(8) / rules-designer(4) / scope-planner(1) / spec-designer(1) / user-manual-author(3) / visual-designer(3) |
| 上記のうち `AUTO_APPROVE` に言及するもの | **analyst-intake のみ**（HANDOFF_PAYLOAD の `auto_approve` フィールドとして。ゲート挙動の条件分岐としてではない） |
| `docs/wiki/` 内の approval-mode 関連記述 | **0 件**（#161 の内容は wiki に未到達。本 PR で wiki を触らなければ bilingual sync 義務は発生しない） |

**この4件すべてを貫く単一の根本原因**: `APPROVAL_MODE` / `AUTO_APPROVE` は**フローオーケストレーターのセッション変数**であり、
サブエージェントは独立コンテキストで起動されるため、これらの値を参照する手段を一切持たない。#161 は
「オーケストレーターが自分のゲートで使う」範囲でのみ設計を完結させ、**エージェント側との境界を跨ぐ伝送路を定義しなかった**。
#166 は「エージェント → オーケストレーター」方向の伝送路欠落、#180 は「オーケストレーター → エージェント」方向の
伝送路欠落であり、#178/#179 はその上に乗った規約の不整合である。

### 5.2 #166 の検証と補正

**(a) 「5エージェント」の妥当性 — 検証結果: 妥当**

autonomous が既定になるのは Minimal / Light（Delivery）と Patch / Minor（Maintenance）。Delivery Minimal の実行系列は
`spec-designer → architect → developer → tester → security-auditor`、Light はこれに `reviewer` が加わる。
つまり **autonomous 既定経路で実際に走る実装・設計・品質系エージェントは 5 emitters でちょうど被覆される**。

**(b) 対象外としてよい理由（ops 系）** — `db-ops` / `releaser` / `observability` は Operations Flow の Standard / Full
配置であり APPROVAL_MODE 既定は `interactive`。`infra-builder` / `ops-planner` は Light（autonomous）だが成果物は
定義ファイル生成であり破壊的操作は伴わない。加えて破壊的コマンド実行自体は `sandbox-policy.md` が別レイヤで
抑止する。よって**今回は5エージェントで確定**し、ops 系への拡張は将来課題として本ノートに記録するに留める。

**(c) 最大の実装リスク（新規発見）— 既存シグナルとの二重発火**

単に「ADR-003 の3トリガーを5ファイルへコピーする」と、各エージェントが既に持つ別経路と衝突する:

| エージェント | 既存の類似シグナル | 衝突内容 |
|---|---|---|
| developer | `STATUS: blocked` + `BLOCKED_TARGET`（developer.md:310-324） | 「SPEC 外の技術判断」を blocked と escalation のどちらで出すか未定義。誤用すると architect への lightweight 照会と人間へのエスカレーションが競合する |
| architect | `TECH_STACK_CHANGED: true` +「フローオーケストレーター経由でユーザー承認を要求」（architect.md:241-249） | **既存の擬似エスカレーション経路が ESCALATION_REQUIRED に未接続**。autonomous では「ユーザー承認を要求」が実現手段を持たず宙に浮く。#166 の隠れた実体の一つ |
| security-auditor | Route B が「未解決 CRITICAL」をオーケストレーター側で検知（orchestrator-rules.md:478-481） | Route A で同条件を出すと**二重エスカレーション** |
| tester | `STATUS: failure` → rollback、rollback 上限は Route B | 通常のテスト失敗を Route A に載せると rollback 機構が働く前にフローが停止する |
| reviewer | CRITICAL → developer への自動 rollback | 同上。通常の CRITICAL を Route A にすると自動修正ループが機能しない |

**したがって #166 の正しい成果物は「トリガー3件の5ファイルへの複製」ではなく、
canonical（`agent-communication-protocol.md`）への「エージェント別トリガー表＋非重複規則」1つと、
各エージェント側の1行参照**である。これは #131/#132 が確立した「canonical 1箇所 + 参照1行」スタイルと一致する。

**(d) 非重複規則の骨子（本分析での提案）**

- `ESCALATION_REQUIRED` は `STATUS` と直交する（`STATUS: success` でも発行しうる）。
- ただし `STATUS: blocked` / `failure` を出す場合は既存ルーティングが優先し、Route A は併発させない。
- Route B が観測できる条件（未解決 CRITICAL 件数・rollback 上限到達）は Route A で出さない。
  Route A は「Route B から観測不能な、人間の価値判断が要る条件」に限定する。

### 5.3 #178 の再検証 — issue の記述と実装の乖離

**重大な訂正**: Mandatory HITL Gate #1 の実体は maintenance-flow ではなく
**`change-classifier.md` §"User Approval Gate"（L143-183）の無条件 `AskUserQuestion`** である。
change-classifier は `AUTO_APPROVE` も `APPROVAL_MODE` も参照しない（grep 0件）。

したがって **現状の実挙動は #178 の記述と逆**である:

- #178 の主張: 「autonomous で自動確認され人間不在になる」
- 実際: **autonomous でも AUTO_APPROVE でも Gate #1 は必ず停止する**。
  `maintenance-flow.md:20` の「in autonomous mode they are logged and auto-confirmed」は
  **実装を伴わない空手形**（宣言先の change-classifier がその宣言を知らない）。

**副作用として新規発見した欠陥（4 issue のいずれもカバーしていない）**:

`AUTO_APPROVE: true`（Ouroboros 外部評価。人間が存在しない実行）でも change-classifier / impact-analyzer /
analyst-core の内部ゲートが停止する。すなわち**無人実行がゲートでハングする**。これは
`orchestrator-rules.md:65-67` の「auto-approve モードでもスキップされない（ログ+自動確認）」という
canonical 契約に対する明確な実装違反であり、severity は #178 より高い（外部評価互換性の破壊）。
経路は #180 と同一（オーケストレーター → エージェントの伝播欠落）なので同時に修正する。

**よって #178 の本体は「規約の一本化」に縮退する**: `maintenance-flow.md:20` の宣言と
`orchestrator-rules.md:65-67` の canonical のどちらに寄せるか。実装は #180 の伝播機構の上に乗る。

**判断材料 — AUTO_APPROVE と autonomous の非対称性**:
`AUTO_APPROVE` は「人間が存在しない」ことを表明するフラグ（外部評価）であり、自動確認は必然。
一方 `autonomous` は「人間は端末の前にいるが割り込みを減らしたい」モードである。
両者を同一視して Gate #1/#2 を自動確認に倒すと、**既存コードベースへ変更を適用する既定経路（Patch）で
人間の確認が完全にゼロになる**。これは「fewer interruptions」を「zero oversight」にすり替える範疇違反である。

### 5.4 #179 の再検証

**根本原因は語彙の不一致**: canonical 表（orchestrator-rules.md:419-424）は Minimal/Light/Standard/Full をキーとするが、
maintenance のみ Patch/Minor/Major という別語彙を使う。doc-flow は4段語彙なので canonical で被覆済み。
**5フロー中 maintenance だけが表の外にいる**という #179 の指摘は正確。

**併発する順序欠陥（ADR Info 項目 9 と同一）**: 5フロー全てで「APPROVAL_MODE を決定」が
トリアージより前のステップ番号（discovery/delivery/doc/maintenance は step 3、operations は step 0a）に置かれているが、
マッピングはトリアージ結果に依存する。各フローの本文自身が「トリアージ後に確定」と書いており、
**ステップ番号順に実行不能**。#179 を正しく規定するには解決タイミングを二段
（起動時は暫定 `interactive` → トリアージ確定後に最終決定）として明文化する必要がある。
ADR Decision §5 の「関連 Warning の修正 PR に同梱するか、次回レビューまで受容」に該当するため**本 PR に同梱**する。

**override 手段の不在**: `project-rules.md` の `## Approval Mode` セクションは
rules-designer の生成テンプレート（rules-designer.md:290-386）に**存在しない**。
つまり `Standard: autonomous` という override キーは orchestrator-rules 内でのみ言及され、
ユーザーに提示される project-rules テンプレートからは発見不能。
#179 の受け入れ条件（Minor の relax/tighten を可能にする）を満たすにはテンプレート追加が必須なので**本 PR に同梱**する。

### 5.5 #180 の再検証

**(a) 機構上の制約（決定的）**

`APPROVAL_MODE` はオーケストレーターのセッション変数であり、サブエージェントは独立コンテキストで起動される。
**ルールファイルに規約だけを書いてもエージェント側は値を知る手段を持たない。**
したがって issue の Suggested Fix が挙げる2案のうち「ルールファイルへの明文化のみ」は、
「内部ゲートは緩和対象外（＝常に停止）」と宣言する場合にしか成立しない。緩和したいなら伝播路（プロンプト注入）が必須。

**ただし 5.3 で発見した AUTO_APPROVE ハングを直すには、いずれの案でも伝播路が要る。**
→ 伝播機構の導入は**どちらの選択でも必須**であり、残る選択肢は
「autonomous でも G1 ゲートを飛ばすか、AUTO_APPROVE のみ自動確認にするか」に縮退する。

**(b) issue evidence の精度**

- `spec-designer.md:141` は `user-questions.md` への参照（不明点があれば質問せよ）であって承認ゲートではない — **誤同定**。
- 逆に scope-planner / analyst-intake / interviewer / rules-designer / user-manual-author が**列挙漏れ**。
- → ファイル列挙ではなく**ゲートの類型**でスコープを定義すべき。

**(c) 本分析が導入するゲート類型（3分類）**

| 類型 | 定義 | 該当箇所 | APPROVAL_MODE の対象 |
|---|---|---|---|
| **G1 承認ゲート** | エージェントの中間成果物に対する可否確認。オーケストレーターのフェーズゲートと構造的に同一 | change-classifier §User Approval Gate / impact-analyzer §User Approval Gate / analyst-core §Step 3 / codebase-analyzer L280 / scope-planner L91（チェックリスト未達時） | **対象**（設計選択3で決定） |
| **G2 入力取得** | エージェントが処理を開始するために必要な入力の取得。承認ではない | interviewer / analyst-intake / visual-designer §Intake / rules-designer / codebase-analyzer の出力先質問 / user-manual-author の劣化出力確認 | 対象外。ただし**無人時（AUTO_APPROVE）の既定値**の明文化が必要（codebase-analyzer の出力先は `document-locations.md` に既定=`docs/` の規約があるがエージェント本文に未反映） |
| **G3 参照のみ** | 「不明点があれば質問せよ」という一般規約への参照 | spec-designer L141 | 対象外（変更不要） |

**(d) #132（トークン削減方針）との整合**

分類表と挙動規則を `orchestrator-rules.md` に1箇所だけ置き、各 G1 ゲートには1行の参照を足す形にすれば、
エージェント側の追加は約 +1〜2 行/ファイル。#131/#132 が確立した「canonical 1箇所 + 参照1行」スタイルと一致する。

### 5.6 影響ファイル一覧（設計選択に依存しない共通部分）

| ファイル | 変更内容 | 対応 issue |
|---|---|---|
| `src/.claude/rules/agent-communication-protocol.md` | ESCALATION_REQUIRED の Field Reference 拡張（エージェント別トリガー表・Route A/B 非重複規則・STATUS との直交性）、HANDOFF_PAYLOAD フィールド数更新 | #166 / #180 |
| `.claude/agents/developer.md` | Output on Completion に emit 条件1行（`STATUS: blocked` との境界を明記） | #166 |
| `.claude/agents/architect.md` | 同上（`TECH_STACK_CHANGED: true` を ESCALATION_REQUIRED に接続） | #166 |
| `.claude/agents/security-auditor.md` | 同上（Route B と重複しない条件に限定） | #166 |
| `.claude/agents/tester.md` | 同上（`STATUS: failure` との境界を明記） | #166 |
| `.claude/agents/reviewer.md` | 同上（自動 rollback との境界を明記） | #166 |
| `.claude/orchestrator-rules.md` | §Approval Mode: maintenance マッピング / 解決タイミング二段化 / mandatory checkpoint の3モード表 / §In-agent approval gates 新設 / Phase Execution Loop step 2 に伝播1行 | #178 / #179 / #180 |
| `.claude/agents/maintenance-flow.md` | L20 / L37-43 のローカル発明を削除し canonical 参照へ | #178 / #179 |
| `.claude/agents/{discovery,delivery,operations,doc}-flow.md` | APPROVAL_MODE 決定ステップの二段化に伴う文言修正（各1〜2行） | #179 |
| `.claude/agents/change-classifier.md` / `impact-analyzer.md` / `analyst-core.md` / `codebase-analyzer.md` / `scope-planner.md` | G1 ゲートに挙動条件1行 | #180 |
| `.claude/agents/analyst-intake.md` / `analyst-core.md` | HANDOFF_PAYLOAD に `approval_mode` 追加（13→14フィールド） | #180 |
| `.claude/agents/rules-designer.md` | project-rules テンプレートに `## Approval Mode` セクション追加 | #179 |

**スコープ外（本 PR では扱わない）**: `docs/wiki/` への approval-mode 記述追加（現状 0 件。追加すると
EN/JA 同時更新義務と `check-readme-wiki-sync.sh` が発火し PR が肥大するため、フォローアップとする）。
ops 系エージェント（db-ops / releaser / infra-builder / observability）への ESCALATION_REQUIRED 拡張。

## §6 アプローチ

> **状態: 設計選択3件がユーザー承認待ち（analyst-core は AskUserQuestion ツールを保持しないため、
> 呼び出し元エージェントが承認ゲートを代行する）。** 決定後に本節を確定させる。

### 6.1 確定済み（選択不要）

1. **#166 の実装形式** — canonical（protocol）にエージェント別トリガー表と非重複規則を新設し、
   5エージェントには1〜2行の参照＋固有トリガーのみを追記する（§5.2-(c)(d)）。
2. **伝播路の導入** — オーケストレーターは配下エージェントの spawn プロンプトに
   `APPROVAL_MODE` / `AUTO_APPROVE` を注入する。Phase Execution Loop step 2 は既に
   「ARTIFACT_PATHS を verbatim で引き継ぐこと」を MUST としており、そこへ1行追加する形を取る。
   受信側が値を持たない場合の既定は **`interactive`（フェイルセーフ）**。
   これは §5.5-(a) より、どの設計選択を採っても必須。
3. **AUTO_APPROVE ハングの修正** — G1 ゲートは `AUTO_APPROVE: true` のとき必ず自動確認する
   （orchestrator-rules.md:65-67 の既存契約に実装を追随させる。新規 issue は起票せず #180 に含める）。
4. **解決タイミングの二段化** — 起動時は暫定 `interactive`、トリアージ確定後に最終決定（§5.4）。
5. **rules-designer テンプレートへの `## Approval Mode` 追加**（§5.4）。

### 6.2 設計選択 1（#178）— maintenance の必須ゲート×2 を autonomous 下でどう扱うか

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| **A（推奨）** | Gate #1/#2 は `APPROVAL_MODE: autonomous` でも**実停止**。自動確認するのは `AUTO_APPROVE: true` のときのみ。「mandatory checkpoint」の3モード表を canonical に置き、maintenance-flow.md:20 の記述を削除 | Patch/Minor の既定実行に人間チェックポイントが2つ残る。autonomous の利益（Minor で約7つのフェーズゲートを省略）はほぼ維持され、停止は 9→2 に減る。`AUTO_APPROVE` と `autonomous` の意味論的非対称性（§5.3）を正しく反映 | Patch の完全無停止実行はできない |
| B | autonomous でも log+自動確認とし、orchestrator-rules.md:65-67 の「mandatory HITL」表現を「mandatory checkpoint（記録は必須、確認は APPROVAL_MODE 依存）」へ改める | maintenance-flow の現在の宣言に canonical を追随させるだけで済む。Patch が完全無停止になる | 既定の Patch 実行で人間の確認がゼロになる。「必須 HITL」という既存契約の意味が実質的に消滅 |

### 6.3 設計選択 2（#179）— APPROVAL_MODE マッピングの canonical をどこに置くか

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| **B（推奨）: 等価マッピング** | maintenance の Patch/Minor/Major を既存4段へ写像（Patch≒Minimal / Minor≒Standard / Major≒Full）。canonical 表は1つのまま、maintenance-flow.md は写像宣言＋canonical 参照のみ | 表が1つで済み #131/#132 の重複排除方針に合致。Standard の「relax 可」「Full は不可」の意味論をそのまま継承でき、**Minor に override 経路が自動的に生える**（#179 の受け入れ条件を直接満たす）。新しい project-rules キーが不要 | Minor の既定が `autonomous` → `interactive` に変わる（挙動変更）。`Standard: autonomous` キーが maintenance の Minor にも波及する点の明記が必要 |
| A | canonical に Patch/Minor/Major の第2表を追加（語彙別に2表を併存）。project-rules に maintenance 専用キー（例 `Minor: autonomous`）を新設 | maintenance の既定（Patch/Minor→autonomous）を維持できる。フロー間の独立性が高い | 表とキーが二重化し、将来の変更で乖離しやすい。Minor 既定 autonomous のまま＝#179 の懸念（Standard 相当規模が autonomous 固定）が半分残る |

### 6.4 設計選択 3（#180）— G1 内部承認ゲートを autonomous で飛ばすか

（前提: 伝播路の導入と AUTO_APPROVE 自動確認は §6.1 で確定済み。以下は autonomous のときの G1 の扱いのみ）

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| **A（推奨）: 対称化** | G1 ゲートはオーケストレーターのフェーズゲートと同じ三段優先順位に従う（AUTO_APPROVE→自動確認 / autonomous→スキップして推奨選択肢を採用・テキスト要約のみ出力 / interactive→停止）。ただし maintenance Gate #1（change-classifier）は設計選択1の結果に従う | autonomous の意味がフロー全体で一貫する。フェーズごとの挙動不揃い（#180 の主訴）が解消 | 各 G1 ゲートに「autonomous 時に採用する既定選択肢」を明示する必要がある（実質は各ゲートの "(recommended)" 選択肢） |
| B: 不変条件化 | 「G1 内部ゲートは APPROVAL_MODE では緩和しない」を Invariant Rules に明記（AUTO_APPROVE のみ自動確認） | 追記が最小（3行程度）。安全側に倒れる | autonomous 実行でも Minor 経路で3回停止（change-classifier / impact-analyzer / analyst-core）。autonomous が「骨抜き」という #180 の主訴は未解決のまま |

## §7 ドキュメント変更計画

- **SPEC.md**: 変更なし（本リポジトリに SPEC.md は存在しない — `artifact_paths: SPEC: missing`）
- **UI_SPEC.md**: 変更なし（存在しない）
- **ARCHITECTURE.md**: 変更なし（存在しない。本リポジトリの「設計」は `.claude/orchestrator-rules.md` と
  `src/.claude/rules/*.md` が担う）
- **本設計ノート**: §5 記入済み。§6 は設計選択確定後に確定版へ更新
- **変更対象は §5.6 の一覧のとおり**（ルール・エージェント定義ファイル群）。architect が差分設計を確定させる

## §8 architect ハンドオフブリーフ

**設計の中核**: 4件は「オーケストレーターとサブエージェントの境界を跨ぐ2方向の伝送路が
未定義である」という単一の欠陥の異なる断面である（§5.1）。architect は次の2つの伝送路と
それを支える canonical 規約を差分設計すること。

1. **上り（エージェント → オーケストレーター）**: `ESCALATION_REQUIRED` / `ESCALATION_REASON`。
   `agent-communication-protocol.md` にエージェント別トリガー表と非重複規則（既存の
   `STATUS: blocked` / `STATUS: failure` / `TECH_STACK_CHANGED` / Route B との境界）を新設し、
   5エージェントは1〜2行の参照に留める。architect 自身の `TECH_STACK_CHANGED: true` 経路を
   `ESCALATION_REQUIRED` に接続することを忘れないこと。
2. **下り（オーケストレーター → エージェント）**: spawn プロンプトへの `APPROVAL_MODE` / `AUTO_APPROVE` 注入。
   `orchestrator-rules.md` §"Phase Execution Loop" step 2（ARTIFACT_PATHS の verbatim 引き継ぎ）に
   並置する。受信側の既定は `interactive`（フェイルセーフ）。analyst チェーンは
   HANDOFF_PAYLOAD に `approval_mode` を追加（13→14 フィールド）。
3. **canonical 規約の追補**: ゲート3類型（G1/G2/G3、§5.5-(c)）、maintenance の APPROVAL_MODE マッピング、
   APPROVAL_MODE 解決タイミングの二段化、mandatory checkpoint の3モード表、
   rules-designer テンプレートへの `## Approval Mode` 追加。

**設計制約**:
- #131/#132 準拠: canonical は1箇所、各エージェントは参照1行。トリガー条件の本文を5ファイルへ複製しない。
- 新規 GitHub issue の起票禁止。#178/#179/#180 は #166 と同一 PR で解決。
- `docs/wiki/` は触らない（bilingual sync 義務の発火回避。フォローアップ扱い）。
- `src/.claude/rules/` が rules の canonical、`.claude/agents/` と `.claude/orchestrator-rules.md` が
  agents/orchestrator の canonical（`src/.claude/README.md` 参照）。`.claude/rules/` を作らないこと。

**未決事項**: §6.2 / §6.3 / §6.4 の設計選択3件。ユーザー承認後に §6 を確定させてから architect へ渡すこと。
