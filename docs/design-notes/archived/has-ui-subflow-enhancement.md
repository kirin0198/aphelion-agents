> Status: **superseded by `docs/design-notes/visual-designer-extraction.md`** (2026-05-01)
> Last updated: 2026-05-01
> GitHub Issue: [#108](https://github.com/kirin0198/aphelion-agents/issues/108) — closed as `not planned` (superseded)
> Analyzed by: analyst (2026-05-01)
> Update history:
>   - 2026-05-01 (initial): visual-designer / ui-architect / frontend-developer の新設方針を策定
>   - 2026-05-01 (revision-1): `UI_TYPE: web | gui | tui` を導入し、起動マトリクス・フロー図を UI 種別ごとに分岐
>   - 2026-05-01 (superseded): YAGNI レビューの結果、Phase 1 を `visual-designer` 新設のみに縮小して新 design note `visual-designer-extraction.md` へ移行。本ドキュメントは履歴として残置。
> Next: (superseded) — 後続作業は `visual-designer-extraction.md` の §6 ハンドオフを参照

# HAS_UI サブフロー強化 — visual-designer / ui-architect / frontend-developer 新設

## 1. 背景 / Motivation

Delivery Flow の `HAS_UI: true` 経路は、現状 `[ux-designer]` と `[e2e-test-designer]` の挿入のみでバックエンド／フロントエンドを区別しておらず、以下の構造的負債を抱えている。

1. **architect の責任過多** — バックエンド設計（API・DB・ビジネスロジック）とフロントエンド設計（コンポーネント構造・状態管理・ルーティング・SSR/CSR 判断）を 1 エージェントが担っている。アウトプットの ARCHITECTURE.md が肥大化し、レビュー粒度も粗くなる。
2. **Visual Design 層の欠落** — `ux-designer` はワイヤーフレーム・画面遷移・コンポーネント仕様（UI_SPEC.md）を扱うが、カラー・タイポグラフィ・余白・デザイントークン・デザインシステム選定（Tailwind / MUI / shadcn/ui 等）といった「見た目」の正準仕様を生成するエージェントが存在しない。結果として `developer` がアドホックに決めるか、UI が破綻する。
3. **developer の責任過多** — バックエンド（API・DB）・フロントエンド（コンポーネント・状態・ルーティング）・スタイリング（CSS / トークン適用）を単一エージェントが実装している。コンテキストウィンドウ・専門性・テスト粒度のいずれの観点でも限界がある。

## 2. 目的 / 受け入れ基準

`HAS_UI: true` の場合に、設計と実装をフロントエンド／バックエンドへ明確に分離するサブフローを定義する。

受け入れ基準:

- 新エージェント 3 つ（`visual-designer`, `ui-architect`, `frontend-developer`）の定義ファイルが `.claude/agents/` 配下に追加され、入力・出力・起動条件・NEXT・トリアージ別の挙動が明記されている。
- 既存エージェント 3 つ（`architect`, `developer`, `delivery-flow`）が、責任範囲の縮小・NEXT 変更・サブフロー組み込みの差分更新を受けている。
- トリアージ表（Minimal / Light / Standard / Full × 各エージェント）が delivery-flow.md に反映されている。
- `visual-designer` は Minimal/Light でスキップされ、Standard+ のみで起動する。
- `ui-architect` と `frontend-developer` は HAS_UI: true なら全プランで起動する。

## 3. スコープ / Scope

| 項目 | 含む / 含まない |
|------|----------------|
| `.claude/agents/visual-designer.md` 新規作成 | 含む |
| `.claude/agents/ui-architect.md` 新規作成 | 含む |
| `.claude/agents/frontend-developer.md` 新規作成 | 含む |
| `.claude/agents/architect.md` 差分更新 | 含む |
| `.claude/agents/developer.md` 差分更新 | 含む |
| `.claude/agents/delivery-flow.md` 差分更新 | 含む |
| `.claude/agents/spec-designer.md`（または `interviewer.md`）差分更新 — `UI_TYPE` 判定の追加 | 含む（revision-1） |
| `.claude/agents/maintenance-flow.md` への波及検討 | 含む（影響有無の調査のみ） |
| `docs/wiki/{en,ja}/` 関連ページの更新 | 含む（バイリンガル同期義務） |
| 既存生成プロジェクト（このリポジトリ外）への遡及適用 | 含まない |
| Aphelion 自身の SPEC.md / ARCHITECTURE.md 更新 | 含まない（このリポジトリには存在しない） |

## 4. 制約 / Open questions

- **OQ1**: `developer` と `frontend-developer` の直列実行において、developer 完了の判定は「TASK.md 全タスク済」とするか「API モックが固まった時点」とするか。本 issue では前者（フル完了後）を default とし、フロー orchestrator 側で別 issue として高速化検討を行う。
- **OQ2**: `visual-designer` をスキップした Light/Minimal で `ui-architect` がデザイントークン未確定のまま動く場合、`ui-architect` は最小デフォルト（system-ui / 基本カラー）を内部的に仮置きするのか、`frontend-developer` 側で吸収するのか。本 issue 内では「`ui-architect` が `VISUAL_SPEC.md` 不在を検知したら最小デフォルトを `UI_ARCHITECTURE.md` 内に明記する」方針で進める。
- **OQ3**: `doc-reviewer` の呼び出しタイミング追加（ui-architect 完了後）は本 issue で扱うが、レビュー観点の追加（フロントエンド固有のレビューチェックリスト）は別 issue として切り出す。
- **OQ4**: maintenance-flow の HAS_UI 取り扱いに本変更が波及するか。実装フェーズで調査する。

## 5. 分析 / Analysis

### 5.1 既存フロー（現状）

```
spec-designer → [ux-designer] → architect → [scaffolder] → developer → test-designer → [e2e-test-designer] → tester → reviewer → security-auditor → [doc-writer] → [releaser]
```

`[ux-designer]` は HAS_UI: true で起動するが、その後の architect / developer は UI 専任レーンを持たず、結果として上記 3 課題が顕在化している。

### 5.2 課題マッピング

| 課題 | 現在の担当 | あるべき担当 |
|------|-----------|-------------|
| バックエンドアーキテクチャ | architect | architect（変更なし） |
| フロントエンドアーキテクチャ | architect | **ui-architect（新設）** |
| Visual Design（カラー / トークン / デザインシステム選定） | （誰も担当せず） | **visual-designer（新設）** |
| バックエンド実装（API / DB / ビジネスロジック） | developer | developer（変更なし） |
| フロントエンド実装（コンポーネント / 状態 / ルーティング） | developer | **frontend-developer（新設）** |
| スタイリング適用 | developer | frontend-developer（new） |

## 6. アプローチ / Approach

### 6.1 新設エージェント

#### `visual-designer`

- **役割**: ux-designer 出力の UI_SPEC.md を読み、Visual Design 仕様 VISUAL_SPEC.md を生成。
- **責任**: カラーパレット / タイポグラフィ / 余白 / デザイントークン定義、ブランドガイドライン適用、レスポンシブブレークポイント、アクセシビリティ要件（コントラスト比・WCAG 準拠レベル）、デザインシステム選定（Tailwind / MUI / shadcn/ui 等）。
- **インテーク（冒頭で `AskUserQuestion`）**: 既存ブランドカラー・ロゴの有無 / 参考サイト・デザイン方向性 / デザインシステム指定有無。
- **入力**: UI_SPEC.md, CONCEPT_VALIDATION.md（optional）。
- **出力**: VISUAL_SPEC.md。
- **起動条件**: `HAS_UI: true` かつ Standard+。Minimal/Light ではスキップ。
- **NEXT**: `ui-architect`。

#### `ui-architect`

- **役割**: UI_SPEC.md と VISUAL_SPEC.md（任意）を読み、フロントエンドアーキテクチャを設計。架空 architect のフロントエンド責任を分離。
- **責任**: コンポーネントアーキテクチャ、状態管理（Redux / Zustand / Context 選定と構造）、ルーティング、SSR/CSR/SSG 判断、ディレクトリ構造・命名規則、バックエンド API とのデータフェッチ設計（architect の API 設計と接合）。
- **入力**: UI_SPEC.md, VISUAL_SPEC.md（optional）, ARCHITECTURE.md。
- **出力**: UI_ARCHITECTURE.md。
- **起動条件**: `HAS_UI: true` の全プラン。
- **NEXT**: scaffolder（Standard+）または developer（Minimal/Light）。
- **VISUAL_SPEC.md 不在時**: `UI_ARCHITECTURE.md` 内に「最小デフォルトトークン（system-ui フォント、基本カラー）」を明記する（OQ2 解）。

#### `frontend-developer`

- **役割**: UI_ARCHITECTURE.md と VISUAL_SPEC.md に従いフロントエンド実装。
- **責任**: コンポーネント実装（UI_ARCHITECTURE.md の順序準拠）、スタイリング（VISUAL_SPEC.md のデザイントークン準拠）、状態管理実装、ルーティング実装、バックエンド API との結合（developer 成果物との統合）、TASK.md による進捗管理・セッション再開対応。
- **入力**: UI_ARCHITECTURE.md, VISUAL_SPEC.md, ARCHITECTURE.md（API 仕様参照）, developer 成果物。
- **出力**: フロントエンド実装コード, TASK.md。
- **起動条件**: `HAS_UI: true` の全プラン。
- **NEXT**: `e2e-test-designer`。

### 6.2 新フロー（HAS_UI: true）

> revision-1 反映後の正準フローは §9.3 を参照。本セクションは初期案として残置する。

初期案（`UI_TYPE` 未導入時の Web 想定フロー）:

```
spec-designer
  ↓
ux-designer → UI_SPEC.md
  ↓
visual-designer → VISUAL_SPEC.md         # Standard+ のみ
  ↓
architect → ARCHITECTURE.md              # バックエンド専任に縮小
  ↓
ui-architect → UI_ARCHITECTURE.md        # HAS_UI 時のみ追加
  ↓
scaffolder（Standard+）
  ↓
developer（バックエンド専任） → frontend-developer（フロントエンド専任）
  ↓（統合完了後）
test-designer → e2e-test-designer → tester → reviewer → security-auditor → ...
```

直列順序の根拠: バックエンド API が固まってから frontend-developer が結合実装に入ることで、API 仕様の手戻りを最小化する（OQ1）。

### 6.3 既存エージェントへの差分

| ファイル | 差分 |
|----------|------|
| `.claude/agents/architect.md` | フロントエンド設計責任を ui-architect に移譲。ARCHITECTURE.md からフロントエンドセクションを除去。UI_SPEC.md の参照は「API 設計の参考」に限定。HAS_UI: true の NEXT を `ui-architect` に変更。 |
| `.claude/agents/developer.md` | フロントエンド実装責任を frontend-developer に移譲。HAS_UI: true 時の入力から UI_SPEC.md / VISUAL_SPEC.md を除去。バックエンド専任（API・DB・ビジネスロジック）に責任を限定。HAS_UI: true の NEXT を `frontend-developer` に変更。 |
| `.claude/agents/delivery-flow.md` | HAS_UI: true 時のシーケンスに visual-designer / ui-architect / frontend-developer を組み込む。visual-designer の Minimal/Light スキップ条件を追加。doc-reviewer の呼び出しタイミングに ui-architect 完了後を追加（OQ3）。トリアージ表更新。 |

### 6.4 トリアージ別起動マトリクス

> revision-1 反映後の正準マトリクスは §9.2 を参照。本セクションは初期案として残置する。

初期案（Web のみを想定）:

| エージェント | Minimal | Light | Standard | Full |
|------|------|------|------|------|
| ux-designer | ○ | ○ | ○ | ○ |
| visual-designer | ✗ | ✗ | ○ | ○ |
| ui-architect | ○ | ○ | ○ | ○ |
| frontend-developer | ○ | ○ | ○ | ○ |

※ すべて `HAS_UI: true` の場合のみ起動。

## 7. ドキュメント変更

| ドキュメント | 変更 |
|-------------|------|
| SPEC.md | 該当なし（Aphelion 自身のリポジトリには存在しない） |
| UI_SPEC.md | 該当なし |
| ARCHITECTURE.md | 該当なし |
| `.claude/agents/architect.md` | 差分更新（rules-designer / developer 系で実施） |
| `.claude/agents/developer.md` | 差分更新（同上） |
| `.claude/agents/delivery-flow.md` | 差分更新（同上） |
| `.claude/agents/visual-designer.md` | 新規作成（起動条件: `UI_TYPE: web | gui` かつ Standard+） |
| `.claude/agents/ui-architect.md` | 新規作成（起動条件: `UI_TYPE: web` のみ） |
| `.claude/agents/frontend-developer.md` | 新規作成（起動条件: `UI_TYPE: web` のみ） |
| `.claude/agents/spec-designer.md`（または `interviewer.md`） | 差分更新（`HAS_UI: true` 判定時に `UI_TYPE: web | gui | tui` も判定して AGENT_RESULT に含める） |
| `docs/wiki/{en,ja}/` 関連ページ | 新エージェントと新フローの記載追加（バイリンガル同期義務に従う） |

## 8. ハンドオフ Brief — rules-designer / developer 系

本案件は「Aphelion 自身のエージェント定義追加・更新」というメタプロジェクト変更であり、通常の Delivery Flow（architect → developer）ではなく、エージェント定義設計の専門レーンである **`rules-designer`**（または直接 `developer` 系）が後続。

実装観点の指示:

1. **新規 3 エージェント**: 既存エージェント定義（`ux-designer.md` / `architect.md` / `developer.md`）と同じ frontmatter 構造（name / description / tools / model）と「Project-Specific Behavior」「Mission」「Prerequisites」「Output」「AGENT_RESULT」セクションを踏襲する。
2. **トリアージ条件**: `delivery-flow.md` の triage 表を更新。Minimal/Light で visual-designer がスキップされる経路を明記。
3. **NEXT チェーン**: 既存 architect / developer の NEXT 値を変更する際、`HAS_UI` および `UI_TYPE` での条件分岐を明確化（HAS_UI: false なら従来通り、true なら §9.3 のフロー図に従い `UI_TYPE` ごとに分岐）。
4. **VISUAL_SPEC.md 不在時のフォールバック**: ui-architect の動作仕様に最小デフォルトトークン明記ルールを盛り込む（§4 OQ2）。
5. **maintenance-flow への波及調査**: 既存 maintenance-flow.md の HAS_UI 取り扱いを確認し、必要なら別タスクとして切り出す（§4 OQ4）。
6. **wiki バイリンガル同期**: `docs/wiki/en/` と `docs/wiki/ja/` 双方を同一 PR で更新（`docs/wiki/en/Contributing.md` の Bilingual Sync Policy 準拠）。
7. **テスト**: 既存の `scripts/check_*.sh` 系（ある場合）に新エージェント名を追加。doc-reviewer / sync-check に該当があれば更新。

実装は別エージェント（rules-designer / developer / doc-writer）に委譲するため、本 design note と GitHub issue がハンドオフ材料となる。

---

## 9. 追加修正（revision-1, 2026-05-01）— `UI_TYPE` の導入

### 9.1 背景

初期案（§6）は `HAS_UI: true` を Web UI と暗黙的に同一視し、`frontend-developer` を全 HAS_UI 経路で起動する設計だった。しかし `HAS_UI: true` には実際には以下 3 種類が存在し、それぞれ必要なエージェントが異なる:

| UI 種別 | 該当するもの |
|------|------|
| `web` | ブラウザで動作・SPA・SSR・PWA |
| `gui` | デスクトップアプリ・ネイティブ GUI・Electron（デスクトップ配布） |
| `tui` | ターミナル UI（Rich / Textual / curses / blessed 等） |

GUI / TUI に対し `ui-architect`（Web 用フロントエンドアーキテクチャ）や `frontend-developer`（Web 実装）を当てるのは責任ミスマッチであり、また TUI に対し `visual-designer`（カラー・タイポ・デザイントークン）を当てるのもターミナル制約上ほぼ無効。これらを正すため、`UI_TYPE: web | gui | tui` を一級フィールドとして導入し、起動条件を UI 種別で分岐させる。

### 9.2 起動マトリクス（UI_TYPE 対応・正準版）

| エージェント | web | gui | tui | 備考 |
|------|------|------|------|------|
| `ux-designer` | ○ | ○ | ○ | 全 UI 種別で起動（情報設計・画面遷移・コンポーネント仕様） |
| `visual-designer` | ○ Standard+ | ○ Standard+ | ✗ | Standard+ のみ起動。TUI はターミナル制約上スキップ |
| `ui-architect` | ○ | ✗ | ✗ | Web 専用（コンポーネント / 状態管理 / SSR-CSR / ルーティング） |
| `frontend-developer` | ○ | ✗ | ✗ | Web 専用（コンポーネント・スタイリング・状態・API 結合） |
| `developer` | ○ BE 専任 | ○ UI 含む | ○ UI 含む | gui / tui の UI 実装は `developer` が担当 |

※ すべて `HAS_UI: true` の場合のみ起動。`UI_TYPE` の値によって列が切り替わる。

### 9.3 UI_TYPE 別フロー（正準版）

#### web

```
spec-designer
  ↓
ux-designer → UI_SPEC.md
  ↓
visual-designer → VISUAL_SPEC.md         # Standard+ のみ
  ↓
architect → ARCHITECTURE.md              # バックエンド専任
  ↓
ui-architect → UI_ARCHITECTURE.md
  ↓
scaffolder（Standard+）
  ↓
developer（BE 専任） ‖ frontend-developer（Web FE 専任）
  ↓（統合完了後）
test-designer → e2e-test-designer → tester → reviewer → security-auditor → ...
```

#### gui

```
spec-designer
  ↓
ux-designer → UI_SPEC.md
  ↓
visual-designer → VISUAL_SPEC.md         # Standard+ のみ
  ↓
architect → ARCHITECTURE.md              # GUI アプリ全体の構造を含む
  ↓
scaffolder（Standard+）
  ↓
developer（バックエンド + GUI 実装）
  ↓
test-designer → e2e-test-designer → tester → reviewer → security-auditor → ...
```

#### tui

```
spec-designer
  ↓
ux-designer → UI_SPEC.md
  ↓
architect → ARCHITECTURE.md              # TUI アプリ全体の構造を含む
  ↓
scaffolder（Standard+）
  ↓
developer（バックエンド + TUI 実装）
  ↓
test-designer → e2e-test-designer → tester → reviewer → security-auditor → ...
```

### 9.4 delivery-flow の分岐条件（正準版）

`HAS_UI: true` のとき、`UI_TYPE` を読んで以下に分岐する:

- `UI_TYPE: web` — §9.3 web のフローを実行（visual-designer は Standard+ のみ、ui-architect / frontend-developer は全プラン）
- `UI_TYPE: gui` — §9.3 gui のフローを実行（visual-designer は Standard+ のみ起動、`ui-architect` / `frontend-developer` はスキップ）
- `UI_TYPE: tui` — §9.3 tui のフローを実行（`visual-designer` / `ui-architect` / `frontend-developer` はすべてスキップ）

`UI_TYPE` 不明（spec-designer / interviewer が判定できなかった場合）は、`delivery-flow` 起動時に `AskUserQuestion` で確認し、デフォルト推測は行わない。

### 9.5 spec-designer / interviewer 側の責務追加

`HAS_UI: true` と判定するエージェント（`spec-designer` または Discovery Flow の `interviewer`）は、判定と同時に `UI_TYPE: web | gui | tui` も判定し、`AGENT_RESULT` ブロックに以下を含めて出力する:

```
HAS_UI: true
UI_TYPE: web | gui | tui
```

判定基準:

- `UI_TYPE: web` — ブラウザで動作する想定（SPA / SSR / PWA / 一般的な Web アプリ）
- `UI_TYPE: gui` — OS のウィンドウシステム上で動作（デスクトップ配布 / Electron / ネイティブ GUI）
- `UI_TYPE: tui` — ターミナル上で動作する対話 UI（Rich / Textual / curses / blessed 等）

判定不能時は `UI_TYPE: unknown` を出力し、後続の `delivery-flow` がユーザーに確認する。

### 9.6 既存エージェントへの差分（追加分）

| ファイル | 追加差分 |
|----------|------|
| `.claude/agents/spec-designer.md`（または `interviewer.md`） | `HAS_UI: true` 判定時に `UI_TYPE: web | gui | tui` も判定するロジックを追加。AGENT_RESULT に `UI_TYPE` を含める。 |
| `.claude/agents/delivery-flow.md` | `HAS_UI: true` 経路を `UI_TYPE` で 3 分岐させる条件分岐を追加（§9.4）。`UI_TYPE: unknown` のフォールバック動作も明記。 |
| `.claude/agents/visual-designer.md` | 起動条件を `HAS_UI: true` かつ `UI_TYPE: web | gui` かつ Standard+ に変更。 |
| `.claude/agents/ui-architect.md` | 起動条件を `HAS_UI: true` かつ `UI_TYPE: web` のみに変更。 |
| `.claude/agents/frontend-developer.md` | 起動条件を `HAS_UI: true` かつ `UI_TYPE: web` のみに変更。 |
| `.claude/agents/developer.md` | `UI_TYPE: gui | tui` の場合は UI 実装責任を含む旨を明記（HAS_UI: true でも `frontend-developer` に委譲しないケースが存在する）。 |

### 9.7 ハンドオフ Brief（rules-designer / developer 系・追加分）

§8 の指示に加えて以下を反映:

1. `spec-designer` / `interviewer` の AGENT_RESULT スキーマに `UI_TYPE` フィールドを追加し、判定ロジックと判定基準（§9.5）を本文に明記する。
2. `delivery-flow.md` の triage 表は §9.2 の起動マトリクスに差し替え、`UI_TYPE` ごとの分岐ロジック（§9.4）を必ず含める。
3. `visual-designer` / `ui-architect` / `frontend-developer` の各定義ファイルの「起動条件」セクションに `UI_TYPE` 条件を明記する。
4. `developer.md` には `UI_TYPE: gui | tui` 時に UI 実装も担う旨を Mission / Prerequisites に追記する。
5. wiki の HAS_UI 解説ページがある場合は、`UI_TYPE` 概念と起動マトリクスを新設する（バイリンガル同期義務）。

