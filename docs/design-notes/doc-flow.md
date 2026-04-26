# feat: add doc-flow orchestrator for HLD/LLD authoring and Aphelion doc maintenance

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#54](https://github.com/kirin0198/aphelion-agents/issues/54)
> Implemented in: TBD

---

## 1. Background & Motivation

### 1.1 ユーザの意図（原文）

> doc-flow を新設したい。Aphelion 自身のドキュメントの更新やプロジェクトの設計ドキュメントの作成 (HLD や LLD など) を目的としたフローの想定。新規作成と既存更新、既存構成見直しなど。

### 1.2 既存 4 フローではカバーしきれない隙間

Aphelion は現状、Discovery / Delivery / Operations / Maintenance の 4 フローを持つ。
それぞれが「ドキュメントを生成する」工程を内包しているが、いずれも **コードを伴うプロジェクトの局所工程** として
ドキュメントを扱っており、以下のユースケースは現行フローが不得手である。

| ユースケース | 現状の取り扱い | 不足点 |
|---|---|---|
| Aphelion 自身の wiki / README / ルール改訂 | Maintenance Flow を借用するが、本来 SPEC.md / ARCHITECTURE.md を持つ「プロダクト」を前提にしている | doc-only な変更に impact-analyzer / tester が空回り |
| 既存プロジェクトに HLD / LLD を後付けで起こす | `codebase-analyzer` で SPEC/ARCHITECTURE をリバース可能だが、HLD/LLD という粒度の概念は持たない | HLD（高位設計）と LLD（詳細設計）を独立成果物として扱う仕組みがない |
| ドキュメント構成の整理（複数の md を再分割／統合） | 該当する flow なし | 横断的な doc 構成見直しを担う担当者が居ない |
| 設計ノート（`docs/design-notes/`）整理・棚卸し | ad-hoc に Maintenance Flow の Patch で実施 | 「コードを変更しない」フローに最適化されていない |

### 1.3 既存 doc 関連 agent との位置関係

`spec-designer`, `architect`, `ux-designer`, `doc-writer` は **Delivery Flow の中で** ドキュメントを作る。
これらは「実装前段／実装後段の成果物として doc を出す」位置付けであり、
**doc 自体を主目的にした統括フロー** が存在しない。
結果として、wiki 改訂のような doc-only 作業は毎回 main session が手作業で
ad-hoc に各 agent を呼び出している（例: 直近 PR #59 / #60 の `/issue-new` 設計）。

### 1.4 なぜ独立 flow が必要か

| 選択肢 | 採否 | 理由 |
|---|---|---|
| Delivery Flow を拡張して doc-only モードを追加 | 不採用 | spec→architect→developer→tester… のパイプラインが doc-only では空転。triage / rollback も無意味化する |
| Maintenance Flow に doc-only 経路を増やす | 不採用 | Maintenance は SPEC/ARCH 既存前提。doc-flow は未存在 doc を新規作成する経路も必要 |
| 独立した doc-flow を新設 | **採用** | doc 専用の triage（新規／更新／再構成）と agent 構成を独立させ、他 flow と並列に運用できる |

---

## 2. Current state

### 2.1 Aphelion における doc 関連 agent の役割

| Agent | 所属 flow | 主な成果物 | 粒度 |
|---|---|---|---|
| `spec-designer` | Delivery (Phase 1) | SPEC.md | 機能仕様（What） |
| `ux-designer` | Delivery (Phase 2, UI のみ) | UI_SPEC.md | 画面設計 |
| `architect` | Delivery (Phase 3) | ARCHITECTURE.md | 技術設計（How / 実装直前） |
| `doc-writer` | Delivery (Phase 11) | README.md / CHANGELOG.md / API doc | 利用者向け doc |
| `codebase-analyzer` | Standalone | SPEC.md / ARCHITECTURE.md（reverse-engineering） | 既存コードからの逆算 |
| `analyst` | Standalone (issue 起点) | docs/design-notes/<slug>.md / GitHub issue | 設計ノート / issue 詳細 |
| `interviewer` / `researcher` / `scope-planner` | Discovery | INTERVIEW_RESULT.md など | 要件探索の中間成果 |

### 2.2 現状の課題

- **HLD と LLD の概念が無い**: ARCHITECTURE.md は実装直前の技術設計（≒ LLD 寄り）。HLD（システム全体構成、外部連携、非機能要件のハイレベル整理）に相当する独立成果物は無く、SPEC.md と ARCHITECTURE.md の中間に断絶がある。
- **doc-only な改訂を扱う agent が居ない**: `doc-writer` は実装後段の利用者向け doc に特化。wiki 改訂や ルール改訂は対象外。
- **doc 構成見直し（複数 md の再分割／統合）の担当が居ない**: 直近の wiki 5 分割（#42）や design-notes 整理（#51）はすべて main session が手作業で実施した。再現性のある手順が無い。
- **Aphelion 自身の doc 更新は外部 agent から見て不可視**: `.claude/rules/aphelion-overview.md` の更新、wiki ja/en 同期、README 多言語版整合などはルール化されておらず、毎回属人的。

### 2.3 既に存在する周辺仕組み

- `docs/design-notes/<slug>.md`: `/issue-new` → `/analyst` の 2 段階で生成される設計ノート（最近 #59 で導入）。doc-flow の入力／成果物の保管先として再利用可能。
- `.claude/rules/aphelion-overview.md`, `orchestrator-rules.md`: フロー定義の集約点。新フロー追加時は両方の更新が必須。
- `docs/wiki/{en,ja}/`: Aphelion 自身の利用者向け doc。同期が必要。

---

## 3. Proposed approach

### 3.1 doc-flow の責任範囲

doc-flow は **「コードを変更せず、ドキュメントだけを成果物とする」フロー** として定義する。
扱う対象は以下の 3 系統（triage の入力にもなる）。

| 系統 | 内容 | 想定トリガー |
|---|---|---|
| **A. プロジェクト doc 新規作成** | 既存プロジェクトに HLD / LLD / SPEC を後付け、または新規プロジェクトの doc 骨子作成 | 「HLD を起こしたい」「LLD まで降ろしたい」 |
| **B. プロジェクト doc 既存更新** | SPEC / ARCHITECTURE / wiki / README の差分更新 | 「設計の章を書き直したい」「README を多言語化したい」 |
| **C. doc 構成見直し** | 複数 md の分割・統合、design-notes 棚卸し、wiki 構成変更 | 「wiki を再分割したい」「古い設計ノートを archive したい」 |

加えて、対象プロジェクトの種別で 2 軸に分かれる。

| プロジェクト種別 | 例 | 備考 |
|---|---|---|
| **P. 通常プロジェクト** | アプリ / ライブラリ / ツール | SPEC.md / ARCHITECTURE.md / UI_SPEC.md などが対象 |
| **M. Aphelion 自身（meta）** | aphelion-agents repo | wiki / README / .claude/rules / agent 定義が対象 |

doc-flow はこの 2 軸（系統 × 種別）の組み合わせを 1 本のフローで吸収する。

### 3.2 HLD / LLD の定義（doc-flow 文脈における暫定定義）

> 詳細テンプレートは別 issue。本 issue では位置付けのみ確定する。

| 成果物 | 位置付け | 既存成果物との関係 |
|---|---|---|
| **HLD (High-Level Design)** | システム全体の構成、サブシステム分割、外部連携、非機能要件のハイレベル整理。実装言語に依存しない | SPEC.md（What）と ARCHITECTURE.md（How / 実装直前）の中間に位置する。中規模以上のプロジェクトで「設計の地図」として参照される |
| **LLD (Low-Level Design)** | モジュール／クラス／関数粒度の詳細設計。データ構造・アルゴリズム・API シグネチャを含む | ARCHITECTURE.md と重複する領域がある。ARCHITECTURE.md が「実装直前の集約」、LLD は「個別モジュールごとの掘り下げ」と差別化 |

> **Open question**: ARCHITECTURE.md と LLD の役割重複は §4 で論点化する。

### 3.3 doc-flow の構成

#### 3.3.1 新規 agent

| Agent | 目的 | tools |
|---|---|---|
| `doc-flow` (orchestrator) | フロー全体の統括 | Read, Write, Bash, Glob, Grep, Agent |
| `doc-planner`（新規） | doc-flow の triage と doc 構成計画（DOC_PLAN.md 生成）。「何を書くか／既存とどう統合するか」を設計 | Read, Write, Glob, Grep |
| `doc-restructurer`（新規・任意） | 系統 C 専用。複数 md の分割／統合／リネームを安全に実行 | Read, Write, Edit, Bash, Glob, Grep |

> **Open question**: `doc-restructurer` を新設すべきか、`doc-writer` 拡張で済むかは §4 で論点化。

#### 3.3.2 既存 agent の再利用

| Agent | 利用フェーズ | 役割 |
|---|---|---|
| `codebase-analyzer` | 系統 A の Phase 0 | SPEC/ARCH が無い既存プロジェクトに対するリバース |
| `spec-designer` | 系統 A・B | SPEC.md 新規 / 差分更新 |
| `ux-designer` | UI を含む系統 A・B | UI_SPEC.md 新規 / 差分更新 |
| `architect` | 系統 A・B | ARCHITECTURE.md / HLD / LLD 新規 / 差分更新（differential mode 既存） |
| `doc-writer` | 系統 A・B | README / CHANGELOG / wiki ページ |
| `analyst` | 系統 B のうち issue 駆動の場合 | 既に `/analyst` 経路が存在。doc-flow は analyst の出力を入力にできる |
| `reviewer` | 全系統の最終フェーズ | doc 整合性レビュー（SPEC↔ARCH↔HLD↔LLD の矛盾検出） |

#### 3.3.3 入出力

**入力候補**:
- ユーザが起動時に渡す自由記述（「HLD を新規作成したい」など）
- 既存 SPEC.md / ARCHITECTURE.md / UI_SPEC.md
- `docs/design-notes/<slug>.md`（`/analyst` 経由の場合）
- 既存 wiki / README（系統 C / 種別 M の場合）

**成果物**:
- `DOC_PLAN.md`: doc-planner が生成する doc 構成計画（フロー全体の地図）
- `HLD.md`（新規）: 系統 A・B で必要な場合に architect が生成
- `LLD.md` または `LLD/<module>.md`（新規）: 同上
- 既存 doc の差分更新（SPEC.md / ARCHITECTURE.md / UI_SPEC.md / README.md / wiki/*.md）
- `DOC_FLOW_RESULT.md`: フロー完了時のサマリ（変更ファイル一覧 + 次フローへのハンドオフ情報）

### 3.4 Triage tier

| Plan | 条件 | 起動 agent シーケンス |
|---|---|---|
| **Minimal** | 単一 doc の単純更新（README の typo 修正、design-notes 1 件追加など） | doc-planner → doc-writer または architect 単独 |
| **Light** | 既存 doc の差分更新（系統 B、影響範囲 1〜2 ファイル） | doc-planner → (spec-designer または architect または ux-designer または doc-writer) → reviewer |
| **Standard** | 新規 doc 作成 / HLD or LLD 新設 / 複数 md 再構成（系統 A or B、3〜10 ファイル） | doc-planner → [codebase-analyzer (Phase 0, 任意)] → spec-designer → [ux-designer] → architect (HLD) → architect (LLD) → doc-writer → reviewer |
| **Full** | プロジェクト全 doc の刷新 / Aphelion 自身の大規模改訂（系統 C / 種別 M、10+ ファイル） | doc-planner → [codebase-analyzer] → spec-designer → [ux-designer] → architect (HLD/LLD) → doc-restructurer → doc-writer → reviewer |

triage の判定軸:
- **系統**（A: 新規 / B: 更新 / C: 再構成）
- **種別**（P: 通常プロジェクト / M: Aphelion 自身）
- **影響ファイル数**
- **HLD / LLD を含むか**

### 3.5 Maintenance Flow / Delivery Flow との責務境界

| シナリオ | 担当フロー | 理由 |
|---|---|---|
| バグ修正・機能追加（コード変更を伴う） | Maintenance Flow（Patch/Minor/Major） | 既存責務 |
| HLD / LLD 新規作成（コード変更なし） | **doc-flow** | doc-only |
| 既存 ARCHITECTURE.md 改訂（コード変更を伴う） | Maintenance Flow Major（architect differential mode） | 既存責務 |
| 既存 ARCHITECTURE.md 改訂（doc 整合性のみ、コード未変更） | **doc-flow** | doc-only |
| 新規プロジェクトの SPEC/ARCH 作成 | Delivery Flow（既存） | 実装まで一気通貫 |
| 既存プロジェクトに doc を後付け | **doc-flow** | コード未変更 |
| Aphelion 自身の wiki / rules 改訂 | **doc-flow**（種別 M） | 既存はどこにも属さなかった |
| design-notes 棚卸し | **doc-flow**（系統 C） | 既存はどこにも属さなかった |

> **Open question**: 「doc 改訂が結果的にコード変更を要する」と判明した場合のフェイルオーバ経路は §4 で論点化。

---

## 4. Open questions

以下は本 issue の範囲では決着させず、developer フェーズまたは別 issue に委ねる。

### Q1. doc-flow と Maintenance Flow の責務境界の細部

- doc 改訂中に「ここはコード修正も必要」と判明した場合、doc-flow 内で `developer` を呼ぶのか、それとも Maintenance Flow にハンドオフするのか
- 提案: doc-flow は **コードを書かない** を不変条件とし、コード変更が必要と判明した時点で `STATUS: blocked` で終了し、ユーザに Maintenance Flow への切替を提案

### Q2. Aphelion 自身の doc メンテと プロジェクト doc 作成を 1 つの flow で扱ってよいか

- 1 flow に統合するメリット: agent 再利用、triage で吸収可能
- 分離するメリット: Aphelion 自身は wiki/rules という固有構造を持つので専用 agent が要るかも
- 提案: **1 flow に統合**し、triage の「種別」軸（P / M）で挙動を分岐させる。M モードでは wiki ja/en 同期チェックなどを doc-planner が組み込む

### Q3. HLD と ARCHITECTURE.md の役割重複

- 既存 ARCHITECTURE.md は実装直前の技術設計を集約しており、HLD と LLD の両方を含むケースが多い
- 新たに HLD.md を立てると、ARCHITECTURE.md との粒度線引きが必要
- 提案候補:
  - (a) HLD は ARCHITECTURE.md の §1〜§3 をそのまま昇格（ARCHITECTURE.md は LLD 相当に縮約）
  - (b) HLD は ARCHITECTURE.md の上位 doc として別ファイル化、ARCHITECTURE.md は現行通り
  - (c) HLD は中規模以上のみ生成（小規模では ARCHITECTURE.md に埋め込み）
- 本 issue では決定せず、`architect` agent 改修の別 issue で決着させる

### Q4. LLD の粒度（単一 LLD.md か モジュール別 LLD/\<module\>.md か）

- モジュール数が多い場合、単一 LLD.md は肥大化する
- 提案: 5 モジュール以下は単一 LLD.md、それ以上は `LLD/<module>.md` 構成。doc-planner が triage で判定

### Q5. doc-restructurer は新設すべきか

- 系統 C（doc 構成見直し）専用 agent を新設するか、`doc-writer` の機能拡張で済ませるか
- 提案: 初版では新設せず、`doc-writer` に再構成タスクを兼任させる。doc-flow を運用してから判断

### Q6. doc-flow が他フローからハンドオフを受ける条件

- 例: Delivery Flow 完了後に「wiki 整備したい」となった場合、自動で doc-flow を起動するか
- 提案: 自動連鎖はせず、ユーザが明示的に `/doc-flow` を起動する（既存 4 フローのファイル受け渡し方針と一致）

---

## 5. Document changes

### 5.1 新規ファイル

| ファイル | 内容 |
|---|---|
| `.claude/agents/doc-flow.md` | orchestrator 定義（discovery-flow.md / maintenance-flow.md の構造を踏襲） |
| `.claude/agents/doc-planner.md` | 新規 agent。triage 結果を受けて DOC_PLAN.md を生成 |
| `.claude/commands/doc-flow.md` | スラッシュコマンド `/doc-flow` 定義 |

### 5.2 既存ファイルの更新

| ファイル | 変更内容 |
|---|---|
| `.claude/rules/aphelion-overview.md` | 「Aphelion Workflow Model」に doc-flow を 5 番目の独立フローとして追記 |
| `.claude/orchestrator-rules.md` | doc-flow Triage の表（Minimal/Light/Standard/Full）を追記 |
| `.claude/commands/aphelion-help.md` | Orchestrators 表に `/doc-flow` を追加 |
| `docs/wiki/en/Agents-Orchestrators.md` | `doc-flow` セクションを追加 |
| `docs/wiki/ja/Agents-Orchestrators.md` | 同上（ja） |
| `docs/wiki/en/Triage-System.md` | doc-flow Triage を追加 |
| `docs/wiki/ja/Triage-System.md` | 同上（ja） |
| `docs/wiki/en/Architecture-Domain-Model.md` | 4 フロー前提を 5 フロー前提に更新 |
| `docs/wiki/ja/Architecture-Domain-Model.md` | 同上（ja） |
| `docs/wiki/en/Home.md`, `docs/wiki/ja/Home.md` | フロー一覧の更新 |
| `README.md`, `README.ja.md` | フロー数表記（4 → 5）と概要表更新 |

### 5.3 更新しないファイル

- `SPEC.md` / `ARCHITECTURE.md`（aphelion-agents は agent 定義集約 repo であり、自身の SPEC/ARCH を持たない方針）
- 既存 4 フローの agent 定義（責務境界は doc-flow 側で吸収）

---

## 6. Acceptance criteria

- [ ] `/doc-flow` スラッシュコマンドでフロー起動できる
- [ ] フロー起動時に triage が実行され、Minimal/Light/Standard/Full のいずれかが決定される
- [ ] triage の入力として「系統（A/B/C）」「種別（P/M）」が確認される
- [ ] doc-planner が DOC_PLAN.md を生成し、ユーザ承認ゲートで承認される
- [ ] Standard 以上で HLD.md / LLD.md（または LLD/\*.md）が生成される
- [ ] フロー完了時に `DOC_FLOW_RESULT.md` が生成される
- [ ] フロー完了時に変更ファイル一覧がサマリ表示される
- [ ] doc-flow 内で `developer` が呼ばれない（コード変更を伴わない不変条件の遵守）
- [ ] `.claude/rules/aphelion-overview.md` / `orchestrator-rules.md` / `aphelion-help.md` / wiki が更新されている
- [ ] auto-approve mode（`.aphelion-auto-approve`）が既存フローと同一の挙動で動作する
- [ ] `/analyst` から起動された場合、`docs/design-notes/<slug>.md` を入力として受け取れる

---

## 7. Out of scope

本 issue では扱わない。後続 issue として切り出す。

- HLD.md / LLD.md の **テンプレート詳細**（章構成・必須セクション・記述粒度）
- 既存 4 フロー（discovery / delivery / operations / maintenance）の責任範囲変更
- `architect` agent 自身の HLD/LLD 対応改修（Q3 の決着が必要）
- `doc-restructurer` agent の新設（Q5、初版運用後に判断）
- doc-flow と CI/CD（lint markdown / link check 等）の連携
- Aphelion 自身の wiki ja↔en 同期チェッカーの実装
- 既存 ARCHITECTURE.md を HLD / LLD に分割するマイグレーションスクリプト

---

## 8. Handoff brief for developer

本 issue を実装する developer 向けの作業ガイド。

### 8.1 実装順序

1. **新規 agent 定義の作成**
   - `.claude/agents/doc-flow.md`（orchestrator）: `discovery-flow.md` を雛形にし、§3.4 の triage と §3.3 の agent シーケンスを記述
   - `.claude/agents/doc-planner.md`: tools は `Read, Write, Glob, Grep`。出力は `DOC_PLAN.md`
   - 雛形参照: `.claude/agents/maintenance-flow.md`（独立フローの構造として最も近い）

2. **スラッシュコマンドの作成**
   - `.claude/commands/doc-flow.md`: `discovery-flow` 等の既存コマンドファイルを参考に作成

3. **ルール／overview の更新**
   - `.claude/rules/aphelion-overview.md` の「Aphelion Workflow Model」に doc-flow を追記。フロー数を 4 → 5 に更新
   - `.claude/orchestrator-rules.md` の Triage System に doc-flow Triage 表を追記
   - `.claude/commands/aphelion-help.md` の Orchestrators 表に追加

4. **wiki / README の更新**
   - `docs/wiki/{en,ja}/Agents-Orchestrators.md` に `doc-flow` セクション追加
   - `docs/wiki/{en,ja}/Triage-System.md` に doc-flow Triage 追加
   - `docs/wiki/{en,ja}/Architecture-Domain-Model.md` の 4 フロー前提を更新
   - `docs/wiki/{en,ja}/Home.md` の概要表更新
   - `README.md`, `README.ja.md` のフロー数表記更新

5. **動作確認（手動）**
   - `/doc-flow` 起動 → triage 質問 → DOC_PLAN.md 生成 → 各 phase 進行 → DOC_FLOW_RESULT.md 生成までを 1 系統で確認
   - 推奨検証ケース: 「本 repo の wiki に doc-flow ページを追加する」を doc-flow 自身で実行（dogfooding）

### 8.2 設計上の不変条件（実装中の確認事項）

- doc-flow は **コードファイル（`src/**`, `bin/**` 等）を変更しない**。`developer` agent を呼ばない
- doc-flow は他フローと同様、**ファイル受け渡しのみで連携**（自動連鎖しない）
- triage / approval gate / auto-approve / rollback は `.claude/orchestrator-rules.md` の共通ルールを継承する
- 新規 agent の `AGENT_RESULT` 形式は `agent-communication-protocol.md` に準拠

### 8.3 Open questions の取り扱い

§4 の Q1〜Q6 は **本 issue の実装中に決着させない**。
ただし、agent 定義中で参照される箇所（特に Q3: HLD と ARCHITECTURE.md の関係）については、
暫定方針として **「ARCHITECTURE.md は現行通りに残し、HLD は新規ファイルとして並列に置く」（§4 Q3 案 (b)）** を採用する。
Q3 の最終決着は `architect` 改修の別 issue で実施する。

### 8.4 参照すべきファイル

- 既存 orchestrator: `.claude/agents/discovery-flow.md`, `delivery-flow.md`, `operations-flow.md`, `maintenance-flow.md`
- 既存 doc 関連 agent: `.claude/agents/doc-writer.md`, `architect.md`, `spec-designer.md`, `ux-designer.md`
- ルール: `.claude/rules/aphelion-overview.md`, `.claude/orchestrator-rules.md`, `.claude/rules/agent-communication-protocol.md`
- wiki テンプレート: `docs/wiki/en/Agents-Orchestrators.md`（en/ja 両方の構造把握）
