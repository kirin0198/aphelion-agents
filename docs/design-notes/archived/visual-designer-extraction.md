> Last updated: 2026-05-01
> GitHub Issue: [#109](https://github.com/kirin0198/aphelion-agents/issues/109)
> Analyzed by: analyst (2026-05-01)
> Supersedes: docs/design-notes/has-ui-subflow-enhancement.md (#108)
> Next: rules-designer

# visual-designer 新設による Visual Design 層分離（Phase 1, scaled-down from #108）

## 0. このドキュメントの位置づけ

#108 で当初提案された「`visual-designer` + `ui-architect` + `frontend-developer` 3 エージェント新設 + `UI_TYPE: web | gui | tui` 導入」は、レビューの結果 Aphelion の YAGNI / 最小構成原則と摩擦を起こすことが判明した。本 design note はその縮小版（Phase 1）として「`visual-designer` 1 エージェントの新設のみ」に絞った再提案である。`ui-architect` / `frontend-developer` / `UI_TYPE` 分岐の導入は YAGNI 棚上げとし、実観測されてから別 issue で再検討する。

## 1. 背景 / 縮小判断の経緯

#108 の当初設計に対し、以下の懸念が確認された:

1. **Aphelion 思想との乖離** — Minimal/Light でも 3 段階チェーン強制は「最小構成で素早く」原則を破る。エージェント数が 30 を超えていく追加圧。`frontend-developer` は単独起動の意味が薄く Independent invocation 原則と摩擦。
2. **設計前提の事実誤認** — `ux-designer.md` Section 1 "Design Policy" は既に Color Palette / Typography / Component Library を扱っており、「Visual Design 層が完全欠落」というのは誤り。実際は薄いだけ。
3. **境界の曖昧さ** — `architect` / `ui-architect` で API 設計接合の責任が二重化する。さらに `ui-architect` が `VISUAL_SPEC.md` 不在時にデザイントークンを書く責任越境が必要になる。
4. **直列手戻りリスク** — `developer → frontend-developer` の全完了直列は、API 仕様変更時のロールバック範囲が大きい。
5. **`UI_TYPE: gui` への visual-designer 適用過大** — ネイティブ GUI は OS HIG 準拠が主で、Web 寄りトークン設計はミスマッチ。
6. **TUI への ux-designer 現テンプレ半適合** — Mermaid 遷移 / ASCII wireframe は TUI に部分的にしか合わない。Phase 1 の範囲外。

これらを踏まえ、ユーザー判断として **YAGNI に寄せた縮小案**で再 issue 化することになった。

## 2. 目的 / 受け入れ基準

`HAS_UI: true` の場合に「見た目」の正準仕様（カラー / タイポ / 余白 / コンポーネントライブラリ選定 / トーン）を明示的に担う `visual-designer` を新設する。`ux-designer` の責任範囲は「情報設計・画面遷移・ワイヤー・コンポーネント仕様」に絞り、Section 1 "Design Policy" を `VISUAL_SPEC.md` 参照へ置換する。

受け入れ基準:

- `.claude/agents/visual-designer.md` が新規作成され、frontmatter / Mission / Prerequisites / Output / AGENT_RESULT セクションが完備されている。
  - 起動条件: `HAS_UI: true` かつ Standard+
  - 入力: `UI_SPEC.md`, `CONCEPT_VALIDATION.md`（任意）
  - 出力: `VISUAL_SPEC.md`
  - NEXT: `architect`
  - 冒頭インテーク（`AskUserQuestion`）: ブランドカラー / 参考サイト / デザインシステム指定の有無
- `.claude/agents/ux-designer.md` が差分更新され、Section 1 が `VISUAL_SPEC.md` 参照に簡略化されている。ただし `visual-designer` がスキップされる Minimal/Light に備え、ux-designer 内部で簡易デフォルト（system-ui / 基本カラー / 基本余白）を保持する。
- `.claude/agents/delivery-flow.md` が差分更新され、`visual-designer` が `ux-designer` 後・`architect` 前に挿入されている。トリアージ表に Standard+ 限定の起動条件が追加されている。
- `docs/wiki/{en,ja}/` の関連ページがバイリンガル同期で更新されている。
- `scripts/check_*.sh` 系（sync-check / agent 一覧チェックなど）に `visual-designer` が追加されている（該当する場合）。

## 3. スコープ

### 3.1 含む（Phase 1）

| 項目 | 内容 |
|------|------|
| `visual-designer` 新設 | `.claude/agents/visual-designer.md` を新規作成 |
| `ux-designer` Section 1 縮約 | Color Palette / Typography / Component Library / Tone & Manner を `VISUAL_SPEC.md` 参照化 |
| `delivery-flow` 差分 | `ux-designer → visual-designer → architect` の挿入、Standard+ 限定の triage 条件追加 |
| wiki 同期 | `docs/wiki/{en,ja}/` の関連ページ（HAS_UI 解説 / agent 一覧 / flow 図）に visual-designer を追記 |
| sync-check 更新 | 該当する場合のみ |

### 3.2 含まない（YAGNI 棚上げ）

| 項目 | 棚上げ理由 |
|------|----------|
| `ui-architect` 新設 | architect の肥大化が実プロジェクトで観測されてから再検討 |
| `frontend-developer` 新設 | developer の context 限界が実観測されてから再検討 |
| `UI_TYPE: web | gui | tui` 分岐 | 当面は visual-designer 単独で UI 種別ごとの内部分岐を持たせるか、後続 issue で扱う |
| `spec-designer` / `interviewer` への `UI_TYPE` フィールド追加 | 上に同じ |
| `architect.md` / `developer.md` の責任縮小 | 上記 3 件をやらないため、本 Phase では現状維持 |

## 4. アプローチ

### 4.1 visual-designer の役割定義

- **インテーク**: 起動時に `AskUserQuestion` で以下 3 点を確認する（最大 4 質問の枠内）。
  - 既存ブランドカラー / ロゴの有無
  - 参考サイト / デザイン方向性（モダン・カジュアル・エンタープライズ等）
  - デザインシステム指定の有無（Tailwind / MUI / shadcn/ui / 独自 / 任せる）
- **責任**: カラーパレット / タイポグラフィ / 余白スケール / デザイントークン定義 / コンポーネントライブラリ選定 / アクセシビリティ要件（コントラスト比・WCAG レベル） / レスポンシブブレークポイント / トーン & マナー。
- **入力**: `UI_SPEC.md`（必須）, `CONCEPT_VALIDATION.md`（任意）。
- **出力**: `VISUAL_SPEC.md`。
- **起動条件**: `HAS_UI: true` かつ triage が Standard 以上。Minimal/Light ではスキップされ、`ux-designer` 内部の簡易デフォルトが代替する。
- **NEXT**: `architect`（Phase 1 では `ui-architect` を新設しないため、フローは `ux-designer → visual-designer → architect` で従来の architect に戻る）。

### 4.2 ux-designer の差分

- Section 1 "Design Policy" を以下のように簡略化:
  - Standard+: 「Color Palette / Typography / Component Library / Tone & Manner は `VISUAL_SPEC.md` を参照すること」と記述し、本文では扱わない。
  - Minimal/Light: 内部に簡易デフォルト（system-ui / モノクロ + アクセント 1 色 / 8px グリッド余白）を持ち、UI_SPEC.md 内に「Visual Design は visual-designer 未起動のため簡易デフォルト適用」と明示する。
- 情報設計・画面遷移・ワイヤー・コンポーネント仕様は従来どおり `ux-designer` の責任。

### 4.3 delivery-flow の差分

- HAS_UI: true の経路:
  - 従来: `ux-designer → architect → ...`
  - 変更後: `ux-designer → (Standard+ なら visual-designer →) architect → ...`
- triage 表に以下を追加:

| エージェント | Minimal | Light | Standard | Full |
|------|------|------|------|------|
| visual-designer | ✗ | ✗ | ○ | ○ |

※ `HAS_UI: true` の場合のみ起動。

### 4.4 棚上げ事項の扱い

- `ui-architect` / `frontend-developer` 新設、`UI_TYPE` 分岐は本 Phase 1 では着手しない。
- それらが必要になる兆候（architect の ARCHITECTURE.md が肥大、developer の context 限界、GUI/TUI プロジェクトでの摩擦）が実観測されたら、別 issue として再起票する。
- 旧 design note (`docs/design-notes/has-ui-subflow-enhancement.md`) は履歴として残し、冒頭に supersede 表示を入れる。

## 5. ドキュメント変更

| ドキュメント | 変更 |
|-------------|------|
| SPEC.md | 該当なし |
| UI_SPEC.md | 該当なし |
| ARCHITECTURE.md | 該当なし |
| `.claude/agents/visual-designer.md` | 新規作成 |
| `.claude/agents/ux-designer.md` | Section 1 を `VISUAL_SPEC.md` 参照化、Minimal/Light 用の簡易デフォルトを内部保持 |
| `.claude/agents/delivery-flow.md` | `visual-designer` 挿入、triage 表更新 |
| `docs/wiki/{en,ja}/` 関連ページ | バイリンガル同期で visual-designer を追記 |
| `scripts/check_*.sh`（該当する場合） | エージェント一覧 / sync-check に visual-designer を追加 |

`architect.md` / `developer.md` は Phase 1 では更新しない（`ui-architect` / `frontend-developer` を新設しないため）。

## 6. ハンドオフ Brief — rules-designer

本案件は Aphelion 自身のエージェント定義変更（メタプロジェクト）であるため、後続は通常の `architect` ではなく **`rules-designer`** が `.claude/agents/` 配下の差分を直接実装する。

実装観点の指示:

1. **`visual-designer.md` の新規作成**: 既存の `ux-designer.md` の構造（frontmatter / Project-Specific Behavior / Mission / Prerequisites / Output / AGENT_RESULT）を踏襲する。冒頭インテークは `AskUserQuestion` を 1 回（3 問）に収める。
2. **`ux-designer.md` の差分**: Section 1 縮約と Minimal/Light 用簡易デフォルト保持。Section 2 以降（情報設計 / 画面遷移 / ワイヤー / コンポーネント仕様）は変更しない。
3. **`delivery-flow.md` の差分**: HAS_UI: true 経路に `visual-designer` を `ux-designer` 後・`architect` 前で挿入。triage 表に Standard+ 限定の起動条件を追加。Minimal/Light での skip 動作と「ux-designer の簡易デフォルトが代替する」旨を明記。
4. **wiki バイリンガル同期**: `docs/wiki/en/` と `docs/wiki/ja/` を同一 PR で更新（`docs/wiki/en/Contributing.md` Bilingual Sync Policy 準拠）。HAS_UI 解説ページ / エージェント一覧 / フロー図に `visual-designer` を追加する。
5. **sync-check / 自動チェック**: `scripts/check_*.sh` 系にエージェント名一覧があれば `visual-designer` を追加。Rules-Reference や Agent-Reference 系の wiki ページにも反映。
6. **棚上げ事項の文書化**: `ui-architect` / `frontend-developer` / `UI_TYPE` は本 Phase 1 のスコープ外であることを、コミットメッセージ / PR 本文 / wiki 更新の双方で明示する（誤って実装されないよう）。

## 7. Resume Checklist (起床後)

> 本セクションは作業中断後の再開支援。

### 7.1 リンク

- 新 GitHub Issue: https://github.com/kirin0198/aphelion-agents/issues/109
- 旧 GitHub Issue (superseded & closed): https://github.com/kirin0198/aphelion-agents/issues/108
- 旧 design note (履歴保全): `/home/ysato/git/aphelion-agents/docs/design-notes/has-ui-subflow-enhancement.md`
- 本 design note: `/home/ysato/git/aphelion-agents/docs/design-notes/visual-designer-extraction.md`

### 7.2 着手コマンド例

```
# Claude Code セッション内で:
/agent rules-designer

# 渡す入力:
#   - design note: /home/ysato/git/aphelion-agents/docs/design-notes/visual-designer-extraction.md
#   - GitHub issue: #N (新 issue 番号)
#   - 期待アウトプット: §6 ハンドオフ Brief の 1〜6
```

### 7.3 触る予定のファイル（絶対パス）

- 新規作成: `/home/ysato/git/aphelion-agents/.claude/agents/visual-designer.md`
- 差分更新: `/home/ysato/git/aphelion-agents/.claude/agents/ux-designer.md`（Section 1 縮約）
- 差分更新: `/home/ysato/git/aphelion-agents/.claude/agents/delivery-flow.md`（triage 表 + フロー図）
- 差分更新: `/home/ysato/git/aphelion-agents/docs/wiki/en/` 配下の関連ページ
- 差分更新: `/home/ysato/git/aphelion-agents/docs/wiki/ja/` 配下の関連ページ
- 確認: `/home/ysato/git/aphelion-agents/scripts/`（sync-check / agent list 系の更新要否）

### 7.4 完了チェックリスト

- [ ] `.claude/agents/visual-designer.md` 新規作成（frontmatter / Mission / Prerequisites / Output / AGENT_RESULT 完備）
- [ ] `.claude/agents/ux-designer.md` Section 1 縮約 + Minimal/Light 用簡易デフォルトの内部保持
- [ ] `.claude/agents/delivery-flow.md` triage 表 + フロー図に visual-designer を反映
- [ ] `docs/wiki/en/` と `docs/wiki/ja/` をバイリンガル同期で更新
- [ ] sync-check / 自動チェック系の更新要否を確認、必要なら反映
- [ ] PR 本文に「Phase 1 / scaled-down from #108」「`ui-architect` / `frontend-developer` / `UI_TYPE` は YAGNI 棚上げ」を明記
- [ ] PR 本文に `Closes #N`（新 issue 番号）を含める
