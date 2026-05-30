> Last updated: 2026-05-30
> GitHub Issue: [#150](https://github.com/kirin0198/aphelion-agents/issues/150)
> Authored by: analyst-intake (2026-05-30)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/archive-workflow-headn20-fix.md
slug: archive-workflow-headn20-fix
branch_name: fix/archive-workflow-headn20
issue_url: https://github.com/kirin0198/aphelion-agents/issues/150
issue_number: 150
issue_title: "bug: archive-closed-plans.yml head -n 20 misses GitHub Issue marker behind analyst-handoff block"
issue_type: bug
intake_summary: |
  【症状/背景】
  archive-closed-plans.yml は各プランニングドックの先頭 20 行だけを grep して
  「GitHub Issue: [#N]」マーカーを探す。Pattern B（analyst-handoff ブロック付き）
  のドックでは ~24 行の YAML コメントブロックが先頭に置かれるため、マーカーが
  ~35 行目に押し出され、head -n 20 の窓外になる。Issue #130 クローズ時に
  setup-improvement.md がアーカイブされなかったことで発覚。

  【期待動作/目標】
  24 行以上の analyst-handoff ブロックを持つドックの「> GitHub Issue: [#N]」
  マーカーが正しく検出され、対象 Issue クローズ時に自動アーカイブされること。
  cron 安全網 (archive-orphan-plans.yml) も同じ制約を持たない状態にすること。

  【スコープ】
  .github/workflows/archive-closed-plans.yml、
  .github/workflows/archive-orphan-plans.yml（確認・修正）、
  リグレッション用フィクスチャ（検討）。
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: <none>
  - UI_SPEC: <none>
  - ARCHITECTURE: <none>
auto_approve: false
output_language: ja
-->

## §1 Background / Motivation（背景・動機）

### 発生事象

Issue #130（setup-improvement バンドル）が PR #149 マージによってクローズされた際、
`docs/design-notes/setup-improvement.md` が `docs/design-notes/archived/` へ移動されなかった。
ワークフローのログは "No matching active planning docs found" と出力しており、
マッチングが起きていないことが判明した。

### 根本原因

`archive-closed-plans.yml` のマッチングロジック：

```bash
if head -n 20 "$f" | grep -qE "(GitHub Issue:|Issue) \[?#${n}\b"; then
```

先頭 **20 行だけ**を走査する。
一方、Pattern B（#139 / PR #140 で導入された analyst-handoff ブロック付き）の
プランニングドックは以下の構造を持つ：

| 行 | 内容 | head -n 20 で検出可能か |
|----|------|------------------------|
| 1–24 | `<!-- analyst-handoff ... -->` YAML ブロック | — |
| 2 | `issue_number: 130` | No（`#` 無し、トークン不一致） |
| 4 | `issue_url: .../issues/130` | No（`#130` 形式ではない） |
| 35 | `> GitHub Issue: [#130](...)` | Yes — ただし 20 行目を超えている |

結果として、プランニングドックは存在するにもかかわらず「対象なし」と判定され、
アーカイブがスキップされた。

### 影響範囲

- **即時影響**: `setup-improvement.md` が未アーカイブ（別 PR で手動修正済み）。
- **構造的影響**: #140 以降に作成された全 Pattern B ドック（analyst-handoff ブロック付き）
  がサイレントにアーカイブミスするリスクを抱えている。
- **安全網の懸念**: Issue #118 で導入された cron `archive-orphan-plans.yml` が
  同じ `head -n 20`（または同等）制約を持つ場合、安全網も Pattern B ドックを見落とす。

---

## §2 Goal / Acceptance Criteria（目標・受け入れ基準）

1. **PR クローズトリガー**: `archive-closed-plans.yml` が、~24 行の analyst-handoff
   ブロックを持ち `> GitHub Issue: [#N]` マーカーが ~35 行目にあるドックを
   正しく検出してアーカイブできること。
2. **cron 安全網**: `archive-orphan-plans.yml` が、handoff ブロック付きドックに対しても
   「Issue がクローズ済みかつドックがアクティブ」を正しく検出できること。
3. **リグレッション防止**: 今後 Pattern B ドックが追加されても同じ問題が再発しないよう、
   変更がテスト・フィクスチャで担保されていることが望ましい。

---

## §3 Scope（スコープ）

### 修正対象

| ファイル | 対応 |
|----------|------|
| `.github/workflows/archive-closed-plans.yml` | head -n 20 ウィンドウ拡張 or 正規表現拡張 or 全行スキャン化 |
| `.github/workflows/archive-orphan-plans.yml` | 同一制約の有無を確認し、あれば同様に修正 |

### 検討対象

| 対象 | 内容 |
|------|------|
| リグレッションフィクスチャ / テストノート | analyst-handoff ブロック付きスタブが正しくマッチされることを示す説明・例 |

### スコープ外

- 未アーカイブ済みドックの手動救済（setup-improvement.md は別 PR で対処済み）
- analyst-handoff ブロック自体の構造変更
- 他ワークフローへの影響調査（archive 系 2 本のみが対象）

---

## §4 Constraints / Open Questions（制約・未解決事項）

### 制約

- **冪等性**: すでにアーカイブ済みのドックに対して再度コピー・コミットしない動作を維持すること。
- **ボットループ防止**: `github.actor != 'github-actions[bot]'` チェックを削除・変更しないこと。
- **後方互換性**: Pattern A（handoff ブロックなし）ドックへのマッチングを壊さないこと。

### 未解決事項（analyst-core が §5-8 で検討）

1. **修正オプションの選択**: 以下 3 案のうちどれを採用するか（または組み合わせるか）。
   - **Option 1**: `head -n 20` → `head -n 50` に拡張（低コスト・低リスク）
   - **Option 2**: 正規表現を拡張し `ISSUE_NUMBER:\s*${n}\b` および
     `ISSUE_URL:.*/issues/${n}\b` も受理する（Issue 本文推奨）
   - **Option 3**: `head -n` を廃止してファイル全体をスキャン（最もシンプル・将来性高）
   - ※ Issue 本文推奨: Option 2 ＋ `head -n 50` の組み合わせ
2. **archive-orphan-plans.yml の実態確認**: 実際に `head -n 20` 相当の制約を持つか要確認。
3. **リグレッションフィクスチャ**: ワークフロー YAML 内でのインラインテストか、
   別ファイルのスタブドックかを決定する。
4. **既存 Pattern B ドックの棚卸し**: #140 以降に作成されたドックで
   未アーカイブのものがないか一覧確認が必要か（スコープ外との整理）。

---

<!-- §5-8: analyst-core が記入 -->
