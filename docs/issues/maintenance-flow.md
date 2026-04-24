# 新規フロー設計: `/maintenance-flow`

> 最終更新: 2026-04-24
> 更新履歴:
>   - 2026-04-24: 初版作成 (analyst 前段分析・方針決定ドキュメント)
> ブランチ: `feat/maintenance-flow`
> Issue 分類: **feature (新規フロー・新規エージェント2つの追加)**
> 関連 Issue: (このドキュメント確定時に gh issue で起票)

---

## 0. 本ドキュメントの位置付け

本ドキュメントは `analyst` フェーズによる**方針決定ドキュメント (GitHub issue 相当)** である。
実装 (`.claude/agents/*.md`・`.claude/commands/*.md` の新規作成) は別フェーズ (architect/developer 相当) に委ねる。

本プロジェクトは **agent definition のメタリポジトリ**であり、リポジトリ直下に `SPEC.md` / `ARCHITECTURE.md` を保持しない。
したがって本ドキュメントが実質的な「仕様 + 設計」の統合成果物として機能する。

---

## 1. 背景

### 1.1 現状の課題

既存プロジェクトへの変更・保守を扱う入口として、Aphelion は現時点で 2 つしか提供していない。

| 入口 | 粒度 | 用途 |
|------|------|------|
| `analyst` | issue 単位 (1 件のバグ/機能追加/リファクタリング) | ドキュメント差分更新 + GitHub issue 起票 + architect 引き継ぎ |
| `codebase-analyzer` | プロジェクト全体 | SPEC.md / ARCHITECTURE.md が存在しない既存コードベースの逆生成 |

このため、以下のユースケースが構造的に拾えていない。

1. **インシデント / ログエラー由来のバグ報告** — ユーザーが issue として整理する前の、生のエラー情報
2. **依存パッケージの脆弱性アラート・CVE 対応** — Dependabot / Renovate 等から流入する更新依頼
3. **パフォーマンス劣化** — 計測結果に基づく改善要求 (SPEC 変更なし)
4. **技術的負債解消** — 型付け強化・リファクタ・依存バージョン更新
5. **複数 issue にまたがる小さな変更** — 1 件ずつ `analyst → delivery-flow` を通すには重いが放置もできない粒度

現状は全て `analyst → delivery-flow` に流すか、フロー外で場当たり的に処理するしかない。

### 1.2 delivery-flow をそのまま流用できない理由

`delivery-flow` の最小構成 (Minimal) でも以下のエージェントを通す:
`spec-designer → architect → developer → tester → security-auditor` (5 エージェント)。

これは**新規開発を前提とした構成**であり、以下の点で既存プロジェクトの小規模保守には過剰である。

- `spec-designer` は SPEC.md の新規生成を想定 (既存 SPEC.md への差分更新は `analyst` の責務)
- `architect` は ARCHITECTURE.md の新規生成を想定 (差分設計モードが明示的に存在しない)
- 全フェーズでユーザー承認ゲートが必要 — 脆弱性パッチのような定型作業にはオーバーヘッドが大きい
- Full 構成は OSS 公開プロジェクトを前提とした構成 (releaser 含む) で、保守タスクには不向き

---

## 2. 目的

既存プロジェクトへの**変更・保守に特化した軽量フロー**を新設する。

### 2.1 ゴール

- issue 単位ではない多様なトリガー (ログエラー・CVE・パフォーマンス計測・Dependabot 等) を受け付ける
- 変更規模に応じた 3 段階トリアージ (Patch / Minor / Major) で、過剰な工程を自動的にスキップする
- Patch / Minor は `/maintenance-flow` 単独で完結させる (delivery-flow に引き渡さない)
- Major のみ前処理として振る舞い、delivery-flow に引き渡す

### 2.2 スコープ (IN)

- 新規エージェント 2 つの設計仕様 (`change-classifier`, `impact-analyzer`)
- 新規オーケストレーター 1 つの設計仕様 (`maintenance-flow`)
- スラッシュコマンド 1 つの設計仕様 (`/maintenance-flow`)
- 既存エージェント (`analyst`, `architect`, `developer`, `tester`, `reviewer`, `security-auditor`, `codebase-analyzer`, `sandbox-runner`) の再利用方針
- `scripts/generate.mjs` への影響評価
- `.claude/rules/aphelion-overview.md` への追記案
- `.claude/orchestrator-rules.md` への追記案

### 2.3 スコープ (OUT)

- 実装 (各 `.md` ファイルの新規作成) — architect/developer 相当の別フェーズで実施
- Dependabot / Renovate との自動連携 (トリガー受信チャネル自体の実装)
- 既存エージェント本体の機能拡張 (差分更新モードの内部実装等)

---

## 3. 受け付けるトリガー種別

`/maintenance-flow` が入口として受け付けるトリガー種別を明示する。

| トリガー種別 | 説明 | 典型例 |
|------------|------|--------|
| `bug` | 既存 SPEC.md の UC 受け入れ基準に反する動作不良 | ログエラー・再現バグ・ユーザー報告 |
| `feature` | 既存機能への追加・変更 (新規 UC ではなく既存 UC の拡張) | フィルタ条件の追加・表示項目の追加 |
| `tech_debt` | 機能変更を伴わない改善 | リファクタ・依存更新・型付け強化 |
| `performance` | パフォーマンス改善 | クエリ最適化・メモリリーク修正・レイテンシ削減 |
| `security` | CVE 対応・脆弱性パッチ | 依存パッケージ脆弱性・OWASP 指摘への対応 |

> **注**: 新規 UC 追加のような「既存 SPEC の拡張ではなく新たな機能領域の追加」は従来どおり `analyst → delivery-flow` を使う。`/maintenance-flow` は**既存 UC の範囲内での変更**が原則。

---

## 4. トリアージ (3 段階)

### 4.1 判定基準

`change-classifier` が以下の 4 観点から総合的に Patch / Minor / Major を判定する。

| 観点 | Patch | Minor | Major |
|------|-------|-------|-------|
| 緊急度 (P1–P4) | P1 / P2 (本番障害・緊急) | P3 (通常) | P4 または P1 (計画的な大規模変更) |
| 影響ファイル数 | 1–3 ファイル | 4–10 ファイル | 11 ファイル以上 または複数モジュール跨り |
| 破壊的変更 | なし (API/DB スキーマ変更なし) | なし (内部構造のみ) | あり (公開 API / DB schema / 依存メジャーバージョン更新) |
| SPEC.md への影響 | なし (受け入れ基準に合致する修正) | 軽微な差分 (1 UC の文言調整) | 複数 UC / 非機能要件 / データモデルへの影響 |

**いずれか 1 つが上位レベルに該当すれば上位プランを選択する**。具体判定例:

- CVE の脆弱性パッチ (1 ファイル・破壊的変更なし・緊急度 P1) → **Patch**
- リファクタで 8 ファイル改修・破壊的変更なし・SPEC 影響なし → **Minor**
- DB スキーマ変更を伴うパフォーマンス改善 → **Major**
- 公開 API のシグネチャ変更 → **Major**

### 4.2 プランごとのフロー

#### Patch プラン (バグ修正・セキュリティパッチ)

```
Phase 1: 分類・緊急度判定   → change-classifier   → ⏸ ユーザー承認 (変更計画)
Phase 2: issue化・方針決定  → analyst            → ⏸ ユーザー承認 (方針)  ※ analyst 内部のゲートに合流
Phase 3: 実装              → developer          → ⏸ ユーザー承認
Phase 4: テスト実行         → tester             → ⏸ ユーザー承認
Phase 5: 最終確認           → (orchestrator)      → ⏸ ユーザー承認 → 完了
```

- security-auditor は CVE 対応時のみ任意起動 (ユーザー確認)
- reviewer は省略 (Patch 粒度の変更は作者セルフレビューで十分)
- architect は省略 (SPEC/ARCHITECTURE への差分なし前提)

#### Minor プラン (機能追加・リファクタ)

```
Phase 1: 分類・緊急度判定     → change-classifier   → ⏸ ユーザー承認 (変更計画)
Phase 2: 影響範囲調査         → impact-analyzer     → ⏸ ユーザー承認 (影響評価)
Phase 3: issue化・方針決定    → analyst            → ⏸ ユーザー承認 (方針)
Phase 4: 差分アーキテクチャ設計 → architect (差分モード) → ⏸ ユーザー承認
Phase 5: 実装                → developer          → ⏸ ユーザー承認
Phase 6: テスト実行           → tester             → ⏸ ユーザー承認
Phase 7: レビュー             → reviewer           → ⏸ ユーザー承認
Phase 8: 最終確認             → (orchestrator)      → ⏸ ユーザー承認 → 完了
```

- security-auditor は任意 (ユーザー選択)
- architect は差分モード (4.4 節参照)

#### Major プラン (大規模・破壊的変更) — delivery-flow への引き渡し

```
Phase 1: 分類・緊急度判定     → change-classifier   → ⏸ ユーザー承認
Phase 2: 影響範囲調査         → impact-analyzer     → ⏸ ユーザー承認
Phase 3: issue化・方針決定    → analyst            → ⏸ ユーザー承認
Phase 4: セキュリティ事前監査 → security-auditor    → ⏸ ユーザー承認
Phase 5: delivery-flow 引き渡し → delivery-flow        → ⏸ ユーザー承認 (引き渡し内容確認)
```

Major は `/maintenance-flow` が**前処理フロー**として機能し、以降は `delivery-flow` の Standard または Full プランで処理される。
引き渡し時には以下を `MAINTENANCE_RESULT.md` として出力する (7.3 節参照)。

### 4.3 SPEC.md / ARCHITECTURE.md 未存在時の扱い

`change-classifier` は起動時に SPEC.md / ARCHITECTURE.md の存在を確認する。
**いずれかが存在しない場合**:

1. ユーザーに通知し、`codebase-analyzer` を起動するか確認 (AskUserQuestion)
2. ユーザー承認後、`codebase-analyzer` を前段フェーズ (Phase 0) として挿入
3. SPEC.md / ARCHITECTURE.md 生成後、通常のトリアージ判定に戻る

### 4.4 architect の差分モード (採用方針)

`architect` 本体のエージェント定義は変更しない。代わりに `maintenance-flow` オーケストレーターが **`architect` 呼び出し時のプロンプトに `mode: differential` という規約を埋め込む**ことで差分モードを表現する。

呼び出し規約:

```
Agent(
  subagent_type: "architect",
  prompt: "mode: differential
           base_version: ARCHITECTURE.md ({最終更新日})
           analyst_brief: {ARCHITECT_BRIEF from analyst}
           impact_summary: {IMPACT_SUMMARY from impact-analyzer}
           scope: 以下の差分のみを ARCHITECTURE.md に反映すること。全体書き換えは禁止。
           ...",
  description: "architect (differential mode)"
)
```

`architect` は現状でも既に `SPEC.md を参照し ARCHITECTURE.md に出力` する責務を持っており、プロンプトで差分 scope を指定すれば部分更新は可能 (Edit ツールを所持している)。**差分モードは明示的に `architect.md` に追記しても良いが、本方針では**:

- Phase 1 (本 issue の実装): プロンプト規約のみで差分モードを表現 (architect.md への破壊的変更なし)
- Phase 2 (将来的オプション): 差分モード利用が定着した後、`architect.md` にモード分岐を正式に追記する

> 代替案としては「architect に `mode` パラメータを正式追加する (architect.md 改定)」もあり得るが、
> 既存の delivery-flow 等の呼び出し互換性を崩さないため、まずはプロンプト規約で実装し、運用実績をもって正式化する段階的アプローチを採る。

---

## 5. 新設エージェント仕様

### 5.1 change-classifier

#### 責務

トリガー入力を受け取り、Patch / Minor / Major のプラン判定と緊急度スコアリング (P1–P4) を行う。
SPEC.md / ARCHITECTURE.md の存在確認も担う。

#### 入力

- ユーザーから受け取るトリガー情報 (自由記述。ログエラー / 機能要望 / CVE 通知 / Renovate PR 本文 等)
- リポジトリ内の既存ファイル (SPEC.md, ARCHITECTURE.md, package.json / pyproject.toml 等)

#### 処理

1. トリガー種別の判定 (4.0 節のトリガー種別テーブルに基づく分類)
2. 緊急度スコアリング (P1–P4)
   - P1: 本番障害・データ損失可能性あり・セキュリティ CRITICAL
   - P2: ユーザー影響のある不具合・セキュリティ WARNING
   - P3: 通常 (ユーザー影響軽微 or 開発者のみ)
   - P4: 技術的負債・事後対応可能
3. 影響ファイル数の推定 (Grep/Glob で関連キーワード検索)
4. 破壊的変更の有無推定 (API 定義ファイル / スキーマ定義ファイル / 公開シンボルへの影響)
5. SPEC.md への影響度推定
6. 上記 4 観点の総合判定で Patch / Minor / Major を決定
7. SPEC.md / ARCHITECTURE.md 未存在時は codebase-analyzer 起動を提案

#### 出力

変更計画を構造化テキストで出力 + ユーザー承認ゲート (AskUserQuestion)。

#### AGENT_RESULT

```
AGENT_RESULT: change-classifier
STATUS: success | error | blocked
TRIGGER_TYPE: bug | feature | tech_debt | performance | security
PLAN: Patch | Minor | Major
PRIORITY: P1 | P2 | P3 | P4
ESTIMATED_FILES: {推定影響ファイル数}
BREAKING_CHANGE: true | false
SPEC_IMPACT: none | minor | major
DOCS_PRESENT:
  - SPEC.md: present | missing
  - ARCHITECTURE.md: present | missing
REQUIRES_CODEBASE_ANALYZER: true | false
RATIONALE: |
  {判定根拠}
NEXT: impact-analyzer | analyst | codebase-analyzer
```

NEXT の決定ルール:
- `REQUIRES_CODEBASE_ANALYZER: true` → `codebase-analyzer` (再帰的に change-classifier に戻る)
- PLAN: Patch → `analyst` (impact-analyzer スキップ)
- PLAN: Minor / Major → `impact-analyzer`

#### tools

`Read, Glob, Grep, Bash`
(Bash は `git log` / `git diff` による影響評価のため)

#### model

`opus` (判定品質を優先)

---

### 5.2 impact-analyzer

#### 責務

変更対象ファイル・モジュールを具体的に特定し、依存グラフから影響範囲を調査する。
リグレッションリスク評価と破壊的変更の検出を行う。

#### 入力

- `change-classifier` の AGENT_RESULT (PLAN, TRIGGER_TYPE, ESTIMATED_FILES 等)
- トリガー情報 (ユーザーの元入力)
- SPEC.md, ARCHITECTURE.md

#### 処理

1. **変更対象ファイル特定** — Grep/Glob で関連コード位置を特定
2. **依存グラフ調査** — import/require/使用箇所を追跡
   - 言語依存: Python (`import X` / `from X`), TypeScript (`import`), Go (`import`), Rust (`use`)
   - 関数・型・クラスの使用箇所を列挙
3. **破壊的変更検出**
   - 公開 API (export されている関数・型・クラス) の変更有無
   - DB スキーマ変更 (migration files の追加) の有無
   - 設定ファイル / 環境変数の変更の有無
4. **リグレッションリスク評価**
   - 変更箇所のテストカバレッジ (テストファイル存在確認)
   - 過去 3 ヶ月のコミット頻度 (`git log`) から stability を推定
   - 他モジュールからの依存度 (fan-in)
5. **推奨テスト範囲の提示**
   - 単体テストで十分か / 統合テスト必要か / E2E 必要か

#### 出力

影響レポートをテキストで出力 + ユーザー承認ゲート。

#### AGENT_RESULT

```
AGENT_RESULT: impact-analyzer
STATUS: success | error
TARGET_FILES:
  - path/to/file1.py: {変更予定の箇所}
  - path/to/file2.py: {変更予定の箇所}
DEPENDENCY_FILES:
  - path/to/dep1.py: {影響を受ける箇所}
BREAKING_API_CHANGES:
  - {公開 API 変更の一覧 / 「なし」}
DB_SCHEMA_CHANGES: true | false
REGRESSION_RISK: low | medium | high
RECOMMENDED_TEST_SCOPE: unit | integration | e2e
IMPACT_SUMMARY: |
  {architect 引き渡し用の要約}
NEXT: analyst
```

#### tools

`Read, Glob, Grep, Bash`
(Bash は `git log` / 依存グラフ解析ツール呼び出し用)

#### model

`opus`

---

## 6. 既存エージェントの再利用方針

### 6.1 差分更新が必要なエージェント

| エージェント | 変更要否 | 理由 |
|------------|---------|------|
| `analyst` | **任意** (推奨: 小さく追記) | Side entry 元として `maintenance-flow` を追記。必須ではない (analyst は呼び出し元を問わず動作するため) |
| `architect` | **不要** (Phase 1) | 差分モードはプロンプト規約で表現 (4.4 節)。将来的には正式追記を検討 |
| `developer` | **不要** | 既存の分業モード (ARCHITECT_BRIEF 受領) がそのまま機能する |
| `tester` | **不要** | 既存のテスト実行ロジックで対応可能 |
| `reviewer` | **不要** | Minor プランでのみ起動。既存の review ロジックで対応可能 |
| `security-auditor` | **不要** | Major 必須・Patch/Minor 任意として呼び出し側で制御 |
| `sandbox-runner` | **不要** | change-classifier / impact-analyzer が Bash を使う際の委譲先として既存仕様で対応 |
| `codebase-analyzer` | **不要** | `maintenance-flow` が前段フェーズとして呼び出す。既存仕様で対応可能 |

### 6.2 analyst への追記案 (任意・小規模)

analyst.md の description 冒頭に以下を追記する案:

> Can also be invoked as Phase 3 of `maintenance-flow` after `change-classifier` / `impact-analyzer` have pre-analyzed the change.

実装時に追加する場合でも 1–2 行程度に留める。

---

## 7. maintenance-flow オーケストレーター仕様

### 7.1 位置付け

- **ドメイン**: Aphelion の既存 3 ドメイン (Discovery / Delivery / Operations) とは**独立した第 4 のフロー**として位置付ける
- **呼び出し**: `/maintenance-flow` スラッシュコマンドによりユーザーが明示的に起動 (delivery-flow から自動呼び出しはしない)
- **完結性**: Patch / Minor は単独完結。Major は delivery-flow への前処理フロー
- **ファイル**: `.claude/agents/maintenance-flow.md`

### 7.2 フェーズ実行仕様

```
起動時検証
  ├─ .claude/orchestrator-rules.md を Read
  ├─ auto-approve モード検出 (.aphelion-auto-approve)
  └─ ユーザー入力 (トリガー情報) を受領

Phase 1: change-classifier 起動
  └─ AGENT_RESULT 解析 → PLAN, PRIORITY, REQUIRES_CODEBASE_ANALYZER 確認

Phase 0 (条件付き): codebase-analyzer 起動
  └─ REQUIRES_CODEBASE_ANALYZER: true の場合のみ
  └─ 完了後 change-classifier を再実行

[ユーザー承認ゲート: 変更計画の承認]

分岐:
  Patch → Phase 2 (analyst) → Phase 3 (developer) → Phase 4 (tester) → 最終確認
  Minor → Phase 2 (impact-analyzer) → Phase 3 (analyst) → Phase 4 (architect 差分モード)
          → Phase 5 (developer) → Phase 6 (tester) → Phase 7 (reviewer) → 最終確認
  Major → Phase 2 (impact-analyzer) → Phase 3 (analyst) → Phase 4 (security-auditor)
          → MAINTENANCE_RESULT.md 生成 → delivery-flow への引き渡し

各 Phase 後にユーザー承認ゲート

[ユーザー承認ゲート: フロー完了最終確認]
```

### 7.3 MAINTENANCE_RESULT.md (Major → delivery-flow 引き渡しファイル)

Major プラン時のみ生成。delivery-flow の startup validation が DISCOVERY_RESULT.md の代替として読み取れる形式とする。

```markdown
# Maintenance Result: {変更サマリ}

> 作成日: {YYYY-MM-DD}
> Maintenance プラン: Major
> トリガー種別: {bug | feature | tech_debt | performance | security}
> 緊急度: {P1 | P2 | P3 | P4}

## 変更概要
{1–3 行の要約}

## change-classifier 判定
- PLAN: Major
- BREAKING_CHANGE: true
- SPEC_IMPACT: major
- RATIONALE: {判定根拠}

## impact-analyzer 調査結果
- TARGET_FILES: {ファイル一覧}
- BREAKING_API_CHANGES: {公開 API 変更}
- DB_SCHEMA_CHANGES: {true | false}
- REGRESSION_RISK: {low | medium | high}
- RECOMMENDED_TEST_SCOPE: {unit | integration | e2e}

## analyst による差分設計方針
- SPEC.md への差分: {UC-XXX を更新 / UC-XXX を追加}
- ARCHITECTURE.md への影響: {architect が差分設計する箇所}
- GitHub Issue URL: {#番号}

## security-auditor 事前監査結果
- CRITICAL: {N}
- WARNING: {N}
- 事前対策必須項目: {リスト}

## delivery-flow への引き継ぎ
- 推奨プラン: Standard | Full
- 追加指示: {delivery-flow 実行時に考慮すべき事項}

## PRODUCT_TYPE
{既存 SPEC.md の PRODUCT_TYPE をそのまま継承}
```

delivery-flow は起動時検証時に `DISCOVERY_RESULT.md` の代わりに `MAINTENANCE_RESULT.md` が存在すれば同様に扱うよう、将来的に delivery-flow.md の startup validation セクションに 1 行追記する (本 issue のスコープ外・将来 issue)。

### 7.4 ロールバックルール

`.claude/orchestrator-rules.md` の「Rollback Rules」を継承しつつ、maintenance-flow 固有の簡略化を加える。

| トリガー | 差し戻し先 | 備考 |
|---------|-----------|------|
| tester 失敗 | developer | 3 回までリトライ |
| reviewer CRITICAL | developer | Minor のみ (Patch は reviewer 未起動) |
| security-auditor CRITICAL | developer | Major のみ (事前監査で検出した場合) |
| developer blocked | architect (差分モード) | Minor のみ。Patch は analyst に差し戻し |

### 7.5 承認ゲート

以下の 2 回が**必須 HITL ゲート** (ユーザー依頼どおり)。

1. **change-classifier 完了後: 変更計画の承認**
   - PLAN / PRIORITY / 予想フェーズ数をユーザーに提示
   - ユーザーはプラン変更 (例: Patch を Minor に格上げ) も選択可能
2. **フロー完了後: 変更内容の最終確認**
   - 実装・テスト結果・PR URL をユーザーに提示
   - Major の場合は「delivery-flow に引き渡す」ことの最終確認も兼ねる

各 Phase 後の承認ゲートは `auto-approve` モード時に自動通過 (既存オーケストレーターと同じ挙動)。

### 7.6 AGENT_RESULT (maintenance-flow 自身)

オーケストレーターは原則として AGENT_RESULT を出力しない (フロー全体の最終成果物は PR + GitHub Issue)。
ただし Major 引き渡し時のみ以下を出力する:

```
AGENT_RESULT: maintenance-flow
STATUS: success
PLAN: Major
MAINTENANCE_RESULT: MAINTENANCE_RESULT.md
HANDOFF_TO: delivery-flow
NEXT: delivery-flow
```

---

## 8. `.claude/commands/maintenance-flow.md` 仕様

既存の `delivery-flow.md` / `operations-flow.md` / `analyst.md` コマンドと同じ書式に従う。

### 8.1 内容

```
Maintenance Flowエージェント（保守・変更オーケストレーター）を起動してください。

既存プロジェクトへの変更・保守トリガー（バグ・機能追加・技術的負債・パフォーマンス・セキュリティパッチ）を受け取り、
Patch / Minor / Major のトリアージを実施してください。
change-classifier → (codebase-analyzer if needed) → impact-analyzer → analyst → architect → developer → tester → reviewer
の順で必要なエージェントを起動し、フェーズ完了ごとにユーザーの承認を得てから次へ進めてください。

Patch / Minor は maintenance-flow 単独で完結させ、Major は delivery-flow へ引き渡してください。

ユーザーの要件:
$ARGUMENTS
```

### 8.2 配置

- ファイル: `.claude/commands/maintenance-flow.md`
- 配置後、`npx github:kirin0198/aphelion-agents update` により利用者側にも配布される

---

## 9. `scripts/generate.mjs` への影響

### 9.1 自動処理される範囲

`generate.mjs` は以下の形で新規ファイルを自動的に取り込む。

| 新規ファイル | 自動処理 | 理由 |
|------------|---------|------|
| `.claude/agents/change-classifier.md` | **自動処理される** | `readdirSync(path.join(CLAUDE_DIR, 'agents'))` で全 .md を列挙 |
| `.claude/agents/impact-analyzer.md` | **自動処理される** | 同上 |
| `.claude/agents/maintenance-flow.md` | **自動処理される + オーケストレーター扱い** | `ORCHESTRATOR_NAMES` の追加更新が必要 (下記 9.2) |
| `.claude/commands/maintenance-flow.md` | **条件付き** (下記 9.3) | Copilot は commands を直接変換しない。Codex は `CODEX_SKILL_COMMANDS` リストで制御 |

### 9.2 手動追加が必要な箇所

**`scripts/generate.mjs` L36 の `ORCHESTRATOR_NAMES` に `maintenance-flow` を追加する必要がある**。

```javascript
const ORCHESTRATOR_NAMES = new Set([
  'discovery-flow',
  'delivery-flow',
  'operations-flow',
  'maintenance-flow',  // ← 追加
]);
```

追加しない場合、`maintenance-flow.md` を Copilot 向けに生成する際に `orchestrator-rules` がインライン展開されない (他のオーケストレーターと挙動が食い違う)。

### 9.3 スラッシュコマンドの Codex 対応

`CODEX_SKILL_COMMANDS` (L40) は現状 `['vuln-scan', 'secrets-scan']` のみ (スタンドアロンユーティリティのみ)。
`maintenance-flow` はオーケストレーター呼び出しであり、既存の `delivery-flow` / `operations-flow` / `analyst` も Codex skill として生成されていないため、**追加不要**。

Copilot 側は `commands/` を直接生成していない (orchestrator は `agents/` に展開される)。こちらも追加作業不要。

### 9.4 generate.mjs 改修の要約

```diff
 const ORCHESTRATOR_NAMES = new Set([
   'discovery-flow',
   'delivery-flow',
   'operations-flow',
+  'maintenance-flow',
 ]);
```

この 1 行追加のみ。それ以外のファイル処理は自動で取り込まれる。

---

## 10. `.claude/rules/aphelion-overview.md` への追記案

既存の `.claude/rules/aphelion-overview.md` に以下の追記が必要。

### 10.1 Domain and Flow Overview セクションへの追記

現状は 3 ドメイン (Discovery → Delivery → Operations) で構成されている。**Maintenance Flow を第 4 のフローとして追記する**。

```markdown
### Domain and Flow Overview

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (requirements)                         (design & impl)                       (deploy & ops)
 6 agents                               12 agents                              4 agents

                         Maintenance Flow  ──[MAINTENANCE_RESULT.md]──▶ Delivery Flow (Major only)
                         (existing project maintenance)
                         3 new agents + reuse (analyst, architect, developer, tester,
                                                reviewer, security-auditor, codebase-analyzer)
```

**Maintenance Flow (new)**: Triggered by bug reports, CVE alerts, performance regressions,
tech debt, or small feature requests on existing projects with SPEC.md/ARCHITECTURE.md.
Performs Patch/Minor/Major triage and completes independently for Patch/Minor.
Major handoff targets Delivery Flow as a pre-processing stage.
```

### 10.2 Branching by Product Type セクションへの追記

現状の表には Maintenance Flow の列がない。追加する:

```markdown
| PRODUCT_TYPE | Discovery | Delivery | Maintenance | Operations |
|-------------|-----------|----------|-------------|------------|
| `service` | Run | Run | Run (for maintenance) | Run |
| `tool` / `library` / `cli` | Run | Run | Run (for maintenance) | **Skip** |
```

### 10.3 `.claude/orchestrator-rules.md` への追記案

**Triage System セクションに Maintenance Flow Triage サブセクションを追加**:

```markdown
### Maintenance Flow Triage

| Plan | Condition | Agents to Launch |
|------|-----------|-----------------|
| Patch | Bug fix / security patch / 1–3 files / no breaking change | change-classifier → analyst → developer → tester |
| Minor | Feature addition / refactor / 4–10 files / no breaking change | + impact-analyzer → architect (differential mode) → reviewer |
| Major | Breaking change / DB schema change / 11+ files / major SPEC impact | + security-auditor → handoff to delivery-flow |

`security-auditor` is mandatory only for Major. Patch and Minor may skip it unless trigger_type is `security`.

> **About maintenance-flow**: This is a fourth flow independent from Discovery/Delivery/Operations.
> Triggered manually by the user via `/maintenance-flow` for existing-project maintenance tasks.
> Patch/Minor complete standalone; Major hands off to delivery-flow via MAINTENANCE_RESULT.md.

> **SPEC.md / ARCHITECTURE.md preconditions**: If either is missing at flow start,
> `change-classifier` proposes inserting `codebase-analyzer` as Phase 0 (with user confirmation).
```

---

## 11. 成果物一覧 (実装フェーズで作成すべきファイル)

本 issue が承認され、次フェーズ (architect/developer 相当) に進んだ際に作成するファイル。

| ファイル | 新規/差分 | 内容 |
|---------|----------|------|
| `.claude/agents/change-classifier.md` | 新規 | 5.1 節の仕様を既存エージェント定義フォーマットに従って記述 |
| `.claude/agents/impact-analyzer.md` | 新規 | 5.2 節の仕様を同フォーマットで記述 |
| `.claude/agents/maintenance-flow.md` | 新規 | 7 節の仕様をオーケストレーター定義フォーマット (delivery-flow.md 等を参考) で記述 |
| `.claude/commands/maintenance-flow.md` | 新規 | 8 節の内容 |
| `scripts/generate.mjs` | 差分 | 9.2 節の 1 行追加 (`ORCHESTRATOR_NAMES` に `maintenance-flow` 追加) |
| `.claude/rules/aphelion-overview.md` | 差分 | 10.1 / 10.2 節の追記 |
| `.claude/orchestrator-rules.md` | 差分 | 10.3 節の追記 (Maintenance Flow Triage サブセクション) |
| `.claude/agents/analyst.md` | 任意・軽微 | 6.2 節の 1–2 行追記 (推奨だが必須ではない) |

---

## 12. 設計上の判断記録 (ADR)

### ADR-001: change-classifier と impact-analyzer を分離する

- **状況**: 両エージェントは「変更の性質を分析する」点で近い責務を持つ
- **決定**: 分離する (ユーザー依頼どおり)
- **理由**:
  - Patch プランでは impact-analyzer は不要 (ファイル数が少なく影響調査コストに見合わない)
  - change-classifier は**判定**、impact-analyzer は**探索**と責務が明確に分離できる
  - テスト容易性・再利用性が高まる (将来 impact-analyzer のみを単独起動することも可能)
- **却下した代替案**: 単一エージェント `change-analyzer` として統合 → Patch での過剰コストを避けられない

### ADR-002: architect の差分モードをプロンプト規約で表現する (Phase 1)

- **状況**: architect に差分モードをどう導入するか
- **決定**: architect.md の構造は変更せず、maintenance-flow オーケストレーターが呼び出し時のプロンプトに `mode: differential` 規約を埋め込む
- **理由**:
  - 既存の delivery-flow / analyst → architect 経路の互換性を保つ
  - architect は Edit ツールを持つため、プロンプトで scope を絞れば差分更新は技術的に可能
  - 運用実績を蓄積してから正式化する段階的アプローチを採る
- **却下した代替案**: architect.md に `mode` パラメータを正式追加 → 互換性影響が大きく、本 issue スコープを超える

### ADR-003: maintenance-flow を独立した第 4 フローとする

- **状況**: delivery-flow の新プラン (例: Patch プラン) として組み込む選択肢もあった
- **決定**: 独立した第 4 フローとする (ユーザー依頼どおり)
- **理由**:
  - トリアージ観点 (緊急度・破壊的変更・SPEC 影響) が delivery-flow と根本的に異なる
  - delivery-flow は「新規開発 or DISCOVERY_RESULT.md からの継続」を前提としており、保守トリガーは異質
  - Major 時に delivery-flow に引き渡す構造が自然に表現できる
- **却下した代替案**: delivery-flow に Patch / Maintenance プランを追加 → delivery-flow の肥大化・責務の混在

### ADR-004: MAINTENANCE_RESULT.md を DISCOVERY_RESULT.md の代替として設計する

- **状況**: Major プラン時の delivery-flow への引き渡しファイル形式
- **決定**: DISCOVERY_RESULT.md と互換性のあるフィールド構造にする (PRODUCT_TYPE 等)
- **理由**: 将来的に delivery-flow の startup validation を「DISCOVERY_RESULT.md または MAINTENANCE_RESULT.md」として拡張する際の改修コストを最小化
- **却下した代替案**: 完全独自フォーマット → delivery-flow 側の受け入れ処理を二重管理する必要が出る

---

## 13. 未解決事項 / 将来 issue 候補

- **delivery-flow の startup validation 拡張**: MAINTENANCE_RESULT.md を DISCOVERY_RESULT.md の代替として受け入れる改修 (本 issue スコープ外)
- **architect.md への `mode` パラメータ正式追加**: 差分モードが定着した後に実施 (ADR-002)
- **Dependabot / Renovate 連携**: PR 本文から `/maintenance-flow` を自動起動するための GitHub Actions 連携 (本 issue スコープ外)
- **E2E テスト戦略**: Minor / Major でフロントエンド変更を含む場合の e2e-test-designer 呼び出しタイミング

---

## 14. ユーザー承認事項

次フェーズに進む前に、以下の設計判断についてユーザー承認を得たい。

1. **ADR-001**: change-classifier と impact-analyzer を別エージェントにする方針
2. **ADR-002**: architect の差分モードをプロンプト規約で表現する方針 (Phase 1)
3. **ADR-003**: maintenance-flow を独立した第 4 フローとする方針
4. **トリアージ判定基準 (4.1 節)**: Patch / Minor / Major の閾値設定
5. **HITL ゲートの配置 (7.5 節)**: 「変更計画の承認」「フロー完了最終確認」の 2 箇所のみを必須とする方針
6. **generate.mjs への影響 (9 節)**: `ORCHESTRATOR_NAMES` への 1 行追加のみで済む見込み

---

## 15. SPEC.md / ARCHITECTURE.md 差分更新

**本プロジェクトのリポジトリ直下には SPEC.md / ARCHITECTURE.md は存在しない**。
このリポジトリは Aphelion 本体 (agent definition のメタリポジトリ) であり、
`docs/issues/*.md` が仕様・設計の統合成果物として機能する既存慣行に従う。

したがって:
- SPEC.md への差分更新: **該当なし** (ファイル不在)
- ARCHITECTURE.md への差分更新: **該当なし** (ファイル不在)
- 本 `docs/issues/maintenance-flow.md` が実質的な仕様・設計ドキュメントとして機能する

将来 Aphelion 自体に SPEC.md / ARCHITECTURE.md を導入する場合は、本ドキュメントを参照元として吸収すればよい。
