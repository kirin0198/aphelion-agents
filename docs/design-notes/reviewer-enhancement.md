> Last updated: 2026-08-02
> Update history:
>   - 2026-08-02: 前提の refresh — agent 数 / canonical パス / orchestrator-rules 追加 / autonomous 対応 (#211)
>   - 2026-05-15: 初版 — proposal からの promotion (#133)
> GitHub Issue: [#133](https://github.com/kirin0198/aphelion-agents/issues/133)
> Authored by: analyst (2026-05-15)
> Refreshed by: analyst-core (2026-08-02, #211)
> Promoted from: docs/design-notes/proposals/reviewer-enhancement-memo.md
> Next: architect (mandatory — 3 新 agent + delivery-flow triage/rollback への横断的影響)

<!-- analyst-handoff
planning_doc_path: docs/design-notes/reviewer-enhancement.md
slug: reviewer-enhancement
branch_name: fix/reviewer-enhancement-memo-refresh
issue_url: https://github.com/kirin0198/aphelion-agents/issues/211
issue_number: 211
issue_title: review: reviewer-enhancement メモの前提が stale（agent 数・rules パス・orchestrator-rules 欠落・autonomous 未対応）
issue_type: refactor
intake_summary: |
  本セッションの対象は #133 の新機能スコープではなく、#211 が指摘した
  reviewer-enhancement.md の前提陳腐化の refresh である（#133 は着手前のまま
  オープンで継続追跡、#211 はその memo に対するレビュー指摘）。
  #211 が検出した stale な前提は5件:
  1. L15「agent count 39→42」— analyst 分割 + visual-designer で現42まで
     消費済み。正しくは 42→45 へ更新し、README バッジ等の伝播数値も再導出。
  2. L20 が `.claude/rules/aphelion-overview.md` を指すが canonical は
     `src/.claude/rules/` 配下（かつ #132 スリム化後は per-agent 表が
     overview から既に除去されている）。
  3. L66,74「delivery-flow が CRITICAL_COUNT>0 を一元判定」との記述は
     不正確 — CRITICAL_COUNT はどの orchestrator ファイルにも存在せず
     （reviewer.md:175 / security-auditor.md:234 の agent 固有フィールド
     のみ）、Review CRITICAL Rollback Flow の実体は共有の
     `.claude/orchestrator-rules.md:680-683` にあるが、これが本メモの
     変更対象スコープに含まれていない。
  4. L44-62 の新設3レビュアーが、実装済みの autonomous invariant
     （doc-reviewer / security-auditor / reviewer の3エージェント名指し）
     にも escalation Route B にも未反映で、autonomous モードで CRITICAL
     が停止もpauseもしない。
  5. performance-optimizer メモ（#58）の performance-reviewer との境界が
     未定義（役割分担表に行が無い）。dependency-reviewer と
     library-and-security-policy の責任分担表への追記も変更対象から漏れている。
  次工程（analyst-core）でのタスク: 上記5件を現行リポジトリツリーに対して
  検証した上で、agent count 数値・rules パス・orchestrator-rules.md への
  変更 scope 追加・autonomous invariant/Route B 拡張の設計・#58 との境界行
  追加を含めてメモ本文を refresh する。
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
approval_mode: interactive
output_language: ja
-->

# 専門レビュアー追加 — ui-reviewer / performance-reviewer / dependency-reviewer

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。

> **⚠ Refresh pass applied before implementation (#211).**
> 本メモは 2026-05-15 時点の `main` を前提に書かれており、その後のリファクタで
> 前提の一部が失効していた。2026-08-02 に現在の `main` (HEAD `2e4de03`) に対して
> 全項目を検証し、失効箇所を**本文に直接反映済み**（表は監査用の記録）。
> 実装に着手する `architect` / `developer` は、着手時点でもう一度 diff を取り、
> 下表の各行が依然として成立するか確認すること。
>
> | 箇所 | 失効理由 | 本 refresh での対応 |
> |------|---------|-------------------|
> | §エージェント数 bump「39 → 42」 | `analyst` 分割 (#139) と `visual-designer` 追加 (#109) 等で bump 幅が消費済み。実測 `ls .claude/agents/*.md` = 42 件 | 「42 → 45」へ修正。Delivery ドメイン内訳 13 → 16 も明記 |
> | 波及先 `.claude/rules/aphelion-overview.md` | 本 repo に `.claude/rules/` の実体は無い。rules の canonical は `src/.claude/rules/`。さらに #132 のスリム化で per-agent 表は overview から削除済み | パスを `src/.claude/rules/aphelion-overview.md` に訂正し、更新対象が per-agent 表ではなく L31 のドメイン別内訳であることを明記 |
> | 波及先リストの不足 | CI の機械検証 (`scripts/check-readme-wiki-sync.sh`)、`site/` が生成物である事実、`Architecture-Operational-Rules.md` の rollback ミラーがいずれも未記載 | 波及先を表形式に置き換えて 3 件を追加 |
> | §rollback 制御「delivery-flow が `CRITICAL_COUNT > 0` を判定」 | `CRITICAL_COUNT` は `reviewer.md` / `security-auditor.md` の agent 固有フィールドで、orchestrator 側からは一切参照されていない。rollback の実体は `.claude/orchestrator-rules.md` と `delivery-flow.md` の二重定義 | §rollback 制御 を全面差し替え。`.claude/orchestrator-rules.md` を変更対象ファイルに追加 |
> | §追加する専門レビュアー（autonomous 未対応） | orchestrator-rules.md の invariant と escalation Route B が `doc-reviewer` / `security-auditor` / `reviewer` の 3 つのみを名指し。`ui-reviewer` は Light+ 起動だが Light の APPROVAL_MODE は `autonomous` 固定 | §autonomous モード対応 を新設し、invariant / Route B の拡張を設計に含めた |
> | §役割分離表に #58 との境界行が無い | `performance-reviewer` と `performance-optimizer` (#58) の責務が近接。`dependency-reviewer` も `library-and-security-policy.md` の責任分担表に未記載 | 役割分離表に 2 行追加し、両ファイルへの追記を変更対象に含めた |

## エージェント数 bump の波及範囲 (architect / developer 確認用)

3 エージェント追加で agent count **42 → 45**
（基準値は 2026-08-02 時点の `ls .claude/agents/*.md` = 42 件）。
3 つとも Delivery ドメインに属するため、ドメイン別内訳は **Delivery 13 → 16** になる。

波及する更新先 (#54 doc-flow と同パターン):

| 更新先 | 変更内容 |
|---|---|
| `README.md` / `README.ja.md` | 本文 (`42 specialized agents` / `all 42 agents` / `42 の専門エージェント` / `全 42 エージェント`) と shields.io バッジ `agents-42` |
| `docs/wiki/{en,ja}/Home.md` | `all 42 agents` / `42 エージェント` が各 2 箇所 |
| `docs/wiki/{en,ja}/Agents-Delivery.md` | 3 レビュアーの `###` セクション追加 + Table of Contents 行追加 + Update history 追記 |
| `docs/wiki/{en,ja}/Architecture-Operational-Rules.md` | §"Review CRITICAL Rollback (Delivery domain)" のミラー記述を新レビュアー対応へ更新 |
| `src/.claude/rules/aphelion-overview.md` | L31 のドメイン別内訳 `(13 agents)` → `(16 agents)`。**per-agent 表は #132 のスリム化で既に削除済みのため更新不要** |
| `site/src/content/docs/{en,ja}/index.mdx` | ランディングページの手書き数値（`42 エージェント × 5 フロー` 等）。手動更新 |
| `site/src/content/docs/{en,ja}/agents-delivery.md` ほか wiki ミラー | **手書きしない** — `docs/wiki/` を更新後 `node scripts/sync-wiki.mjs` で再生成する |
| `CHANGELOG.md` | 新エージェント追加のエントリ |

> **CI による機械検証がある。** `scripts/check-readme-wiki-sync.sh` の Check 1
> （README / `Home.md` の "N agents" 表記 ↔ `ls .claude/agents/` の実数）と Check 5
> （README バッジ `agents-N` ↔ 実数）が agent 数の整合を検証しており、
> `.github/workflows/check-readme-wiki-sync.yml` が全 PR で実行する（advisory tier）。
> 更新漏れは PR の Checks に失敗として現れるので、bump 時は必ず
> `bash scripts/check-readme-wiki-sync.sh` をローカルで通してから push すること。

> **canonical パスの非対称に注意。** 本 repo では
> **agent 定義は `.claude/agents/` が canonical**（`src/.claude/agents/` は存在しない）だが、
> **rules は `src/.claude/rules/` が canonical** で `.claude/rules/` は repo 内に実体を持たない
> （`bin/aphelion-agents.mjs` が配布先プロジェクトの `.claude/rules/` へ展開する）。
> 初版メモの `.claude/rules/aphelion-overview.md` という記述はこの非対称を取り違えたもの。

## 既存 agent との役割分離 (再掲・厳守)

| 領域 | 担当 |
|---|---|
| 実装コード ↔ UI_SPEC.md / VISUAL_SPEC.md 準拠 | **ui-reviewer** (新規) |
| UI_SPEC.md ↔ SPEC.md 整合 | **doc-reviewer** (既存) |
| ライセンス競合 / 依存陳腐化 | **dependency-reviewer** (新規) |
| 脆弱性検出 (CVE) | **security-auditor** (既存) — dependency-reviewer は触らない |
| 実装済みコードの静的パフォーマンスアンチパターン検出（Delivery / レビュー時点） | **performance-reviewer** (新規) |
| 計測 → ボトルネック特定 → 改善案評価 → 期待効果推定（Maintenance / `TRIGGER_TYPE: performance`） | **performance-optimizer** (#58 で設計中・未実装) — performance-reviewer は計測を行わない |

**#58 (`performance-optimizer`) との境界（#211 で明文化）:**
両者はドメインが異なる。`performance-reviewer` は **Delivery Flow のレビューフェーズ**で
実装済みコードを**静的解析**し、N+1 / 不要ループ等のアンチパターンを指摘する
（実測値は扱わない = §追加する専門レビュアー の制約と同一）。
`performance-optimizer` は **Maintenance Flow** で performance trigger を受け、
プロファイル等の**実測データ**を起点にボトルネックを特定する設計エージェント。
どちらが先に着手されても、`docs/design-notes/performance-optimizer.md` §3.3
「既存 agent との関係」表と本表の双方に相互参照行を入れること。

**`library-and-security-policy.md` との関係（#211 で明文化）:**
同ルールの「Responsibility Distribution」表は現在 `architect` / `developer` /
`security-auditor` の 3 行のみで、ライセンス競合・依存陳腐化の担当が未定義。
`dependency-reviewer` 追加時に同表へ 1 行追加し、
**脆弱性スキャン (CVE) は security-auditor、ライセンス競合と陳腐化は dependency-reviewer**
という分界を rules 側にも固定すること（canonical パスは
`src/.claude/rules/library-and-security-policy.md`）。

---

## 方針

現状の `reviewer` は変更せず、専門レビュアーをトリアージで追加選択する構成にする。

## 現状の reviewer（変更なし）

- 起動条件: Light+（全プラン）
- 観点: UC適合性・アーキテクチャ準拠・コード品質・テストカバレッジ・API契約

## 追加する専門レビュアー（3つ）

### `ui-reviewer`
- 起動条件: HAS_UI: true · Light+
- 観点: UI実装 ↔ UI_SPEC.md / VISUAL_SPEC.md 準拠・アクセシビリティ・レスポンシブ
- 注意: doc-reviewerとの役割分離
  - 「実装コードがUI_SPEC.mdに準拠しているか」→ ui-reviewer
  - 「UI_SPEC.md自体がSPEC.mdと整合しているか」→ doc-reviewer

### `performance-reviewer`
- 起動条件: Standard+
- 観点: 静的解析によるパフォーマンスアンチパターン検出
  （N+1クエリ・不要ループ・キャッシュ戦略・クエリ効率）
- 制約: 静的解析の限界を明示すること（実測値は保証しない）

### `dependency-reviewer`
- 起動条件: Full
- 観点: ライセンス競合・依存関係の陳腐化
- 注意: 脆弱性検出は security-auditor に委譲（重複させない）

## rollback 制御

> **初版の記述は事実誤認だったため全面差し替え（#211）。**
> 「delivery-flow が `CRITICAL_COUNT > 0` を判定して一元管理する」は成立しない。
> `CRITICAL_COUNT` は `.claude/agents/reviewer.md` と
> `.claude/agents/security-auditor.md` が出力する **agent 固有フィールド**であり、
> orchestrator 側のファイル（`delivery-flow.md` / `orchestrator-rules.md`）は
> この名前を一度も参照していない。orchestrator が実際に見るのは `STATUS` で、
> `reviewer` は CRITICAL 1 件以上のとき `STATUS: rejected` / `NEXT: developer` を返す。

rollback フローの実体は以下の 2 箇所に**二重定義**されている。新レビュアー追加時は両方を更新する。

| ファイル | セクション | 内容 |
|---|---|---|
| `.claude/orchestrator-rules.md` | §"Review CRITICAL Rollback Flow" | 全 flow 共通の正本。`reviewer (CRITICAL detected) → developer (fix) → tester (re-run) → reviewer (re-review)` |
| `.claude/agents/delivery-flow.md` | §"Rollback Flow on Review CRITICAL" | Delivery ドメイン側の再掲 |
| `docs/wiki/{en,ja}/Architecture-Operational-Rules.md` | §"Review CRITICAL Rollback (Delivery domain)" | ユーザ向けドキュメントのミラー（三重目。更新漏れしやすい） |

回数上限は `.claude/orchestrator-rules.md` §"Rollback Limit (Common)" の
**共有 3 回**（test failure / review CRITICAL / security audit CRITICAL / doc review FAIL の合算）。
新レビュアー 3 つの rollback もこの共有上限へ合流させ、**独自の上限を宣言しないこと**
（同セクションが "The per-flow rollback sections below inherit this limit and must not
declare their own." と明記している）。

**未決事項（architect が確定させること）:** 複数レビュアーが同一フェーズ群で CRITICAL を
返した場合、共有 3 回をレビュアーごとに独立カウントするか合算するか。
**暫定方針は合算** — 上限の趣旨が「無限ループ防止」であり、レビュアー数に比例して
上限が緩む挙動は趣旨に反するため。

## autonomous モード対応（#211 で新規追加）

`.claude/orchestrator-rules.md` の以下 3 箇所が **`doc-reviewer` / `security-auditor` /
`reviewer` の 3 エージェントのみを名指し**しており、レビュアーを追加しただけでは
`APPROVAL_MODE: autonomous` 下で新レビュアーの CRITICAL が停止も自動 rollback もしない。

| 箇所 | 現状 | 必要な変更 |
|---|---|---|
| §"Approval Mode" →「must NOT be relaxed」リスト（invariant） | `doc-reviewer` の自動挿入と rollback チェーン、`security-auditor` の実行、`reviewer` の実行のみを不可侵と宣言 | 3 レビュアーを条件付き（起動条件を満たすプランのみ）で追加 |
| §"Phase Execution Loop" step 5-(b) の Invariant 行 | 同じ 3 エージェントを名指しで再掲 | 同上（正本と文言を揃える） |
| §"Escalation Conditions (ADR-003)" → Route B（orchestrator 検出） | 「`security-auditor` が未解決 CRITICAL を返した」「共有 rollback 上限 3 回に到達」の 2 条件のみ | 新レビュアーの未解決 CRITICAL を pause 対象に含めるか判断が必要 |

**なぜ実害があるか:** `ui-reviewer` の起動条件は Light+ だが、
`.claude/orchestrator-rules.md` の APPROVAL_MODE 既定表では
**Minimal / Light は `autonomous` 固定（ユーザ override 不可）**。
つまり ui-reviewer が最初に効くプランがそのまま autonomous であり、
「HITL ゲートが省略される」＋「invariant に載っていないので自動 rollback の保証も無い」
という最悪の組み合わせになる。`performance-reviewer` (Standard+) も、
project-rules.md の override で Standard を `autonomous` にした場合に同じ穴に落ちる。

**暫定方針（architect が確定させること）:**

- invariant には 3 レビュアーとも追加する（「起動条件を満たす場合、実行と自動 rollback を保証」）。
- Route B（escalation pause）には **`dependency-reviewer` のライセンス競合 CRITICAL のみ**追加する。
  理由 = ライセンス競合は developer への自動 rollback では解けず（依存を捨てるか
  ライセンスを受容するかの経営判断）、人間の判断を要するため。
  `ui-reviewer` / `performance-reviewer` の CRITICAL は `reviewer` と同様に
  developer への自動 rollback で解けるので Route B には載せない。
- なお `dependency-reviewer` は Full 起動であり Full の APPROVAL_MODE は
  `interactive` 強制（override 不可）なので、Route B 追加は AUTO_APPROVE 実行時の
  保険として効く位置づけになる。

## 成果物（着手時に生成・編集）

### 新規ファイル

- `.claude/agents/ui-reviewer.md`
- `.claude/agents/performance-reviewer.md`
- `.claude/agents/dependency-reviewer.md`

いずれも **着手時点の `.claude/agents/reviewer.md` を雛形**にすること
（本メモ執筆時のスナップショットを再現しない）。post-#131 のエージェント定義規約に従い、
`## Project-Specific Behavior` は置かず、完了時出力は
`## Required Output on Completion` の ≤6 行テンプレート形式とする。

### 編集ファイル

| ファイル | 変更内容 |
|---|---|
| `.claude/agents/delivery-flow.md` | (a) Plan × "Agents to Launch" 表に 3 レビュアーを追加。(b) "HAS_UI × Plan agent matrix" に `ui-reviewer` 行を追加。(c) §"Rollback Flow on Review CRITICAL" を新レビュアー対応へ拡張 |
| `.claude/orchestrator-rules.md` | (a) §"Review CRITICAL Rollback Flow" を拡張。(b) autonomous invariant リスト（2 箇所）に 3 レビュアーを追加。(c) Route B に dependency-reviewer 条件を追加 — §autonomous モード対応 参照 |
| `src/.claude/rules/library-and-security-policy.md` | 「Responsibility Distribution」表に `dependency-reviewer` 行を追加（ライセンス競合 / 陳腐化 ↔ CVE の分界を固定） |
| `docs/design-notes/performance-optimizer.md` | §3.3「既存 agent との関係」表に `performance-reviewer` 行を追加（相互参照） |
| §エージェント数 bump の波及範囲 の全ファイル | agent count 42 → 45、Delivery 内訳 13 → 16 |
