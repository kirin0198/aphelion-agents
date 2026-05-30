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

## §5 Deep Analysis（深掘り分析）

> Authored by: analyst-core (2026-05-30)

### 5.1 失敗している正規表現とスキャン窓（archive-closed-plans.yml）

`archive-closed-plans.yml` L78：

```bash
if head -n 20 "$f" | grep -qE "(GitHub Issue:|Issue) \[?#${n}\b"; then
```

- スキャン窓：**先頭 20 行のみ**（`head -n 20`）。
- 受理パターン：`GitHub Issue: [#N` または `Issue [#N`（リテラル `#` が必須）。
- ヒットしないケース：handoff ブロック内の `ISSUE_NUMBER: 130` / `ISSUE_URL: .../issues/130`
  は `#` を含まないトークンのため不一致。`> GitHub Issue: [#130]` は一致するが
  35 行目にあり窓外。→ サイレントスキップ。

### 5.2 archive-orphan-plans.yml も同じバグを共有するか → **YES（確定）**

`archive-orphan-plans.yml` L70-74：

```bash
issue_ref=$(head -n 20 "$f" \
  | grep -oiE 'GitHub Issue:\s*\[?#[0-9]+' \
  | grep -oE '#[0-9]+' | tr -d '#' | head -n1 || true)
```

- 同じく **`head -n 20`** ウィンドウ。さらに `GitHub Issue:\s*\[?#` という
  legacy ヘッダー形式のみを受理し、handoff ブロックの `ISSUE_NUMBER:` を無視する。
- 結論：**cron 安全網も完全に同じ盲点を持つ**。setup-improvement.md が
  PR トリガーで取りこぼされた後、週次 cron でも救済されない（marker が 35 行目のため）。
  → 安全網が機能しないので、両ワークフローを同時に修正する必要がある。

### 5.3 リスクのある既存ドックの棚卸し

アクティブ／アーカイブ済みドックを `head -n 20` で走査して実測した結果：

| 状態 | ドック | marker 行 | head-20 で検出 |
|------|--------|-----------|----------------|
| archived | `setup-improvement.md` | `> GitHub Issue:` = L35, `ISSUE_NUMBER:` = L2 | **MISS**（本件で発覚した実害ケース） |
| active 全件 | 現行の active ドック（#150 stub 含む） | L2–L8 | IN20（現時点で実害なし） |
| archived（古い Pattern A） | sandbox.md, maintenance-flow.md 等 | marker 無し | 該当せず（意図的に evergreen / proposals） |

→ **実害が出ているのは `setup-improvement.md` の 1 件のみ**（別 PR で手動アーカイブ済み）。
ただし構造的には、**今後 analyst-handoff ブロックが先頭に置かれ marker が後方に回る
Pattern B ドックすべて**が同じ取りこぼしリスクを持つ。`> GitHub Issue:` を先頭に置く
かどうかは intake の生成形式次第で揺れており（#150 stub は L2、setup-improvement は L35）、
**生成形式に依存しない検出ロジックにするのが本質的解**。

### 5.4 handoff ブロックのフィールド名は 2 系統存在する

| ドック | 形式 |
|--------|------|
| setup-improvement.md (#130) | `<!-- analyst-handoff` 直後に **大文字** `ISSUE_NUMBER: 130` |
| 本 stub (#150) | `<!-- analyst-handoff` 内に **小文字** `issue_number: 150` |

→ 修正正規表現はフィールド名を **case-insensitive**（`grep -i`）で扱う必要がある。

### 5.5 3 オプションの評価

| 案 | 内容 | 堅牢性 | 誤検出リスク | 将来性 |
|----|------|--------|--------------|--------|
| **Opt 1** | `head -n 20` → `head -n 50` | △ ブロックが 50 行を超えれば再発する**脆い定数** | 低 | △ |
| **Opt 2** | 正規表現に `ISSUE_NUMBER: N` / `issue_url:.*/issues/N` を追加 | ◎ ブロック長に**非依存** | 低（アンカー付き） | ◎ |
| **Opt 3** | `head -n` 廃止・全行スキャン | ○ | △ 本文中の偶発的 `#N` を拾う恐れ | ○ |

- Opt 1 は本件を直すが、handoff ブロックが将来 24→50 行超に伸びれば**同じ形で再発**する。
- Opt 2 は handoff ブロック内の機械可読フィールドを直接見るため、ブロック長・marker 位置に
  一切依存しない。最も本質的。
- Opt 3 単独はアンカーが弱いと本文中の Issue 言及（例：「Related: #118」）を誤検出しうる。

---

## §6 Approach Decision（採用方針）

### 6.1 採用案：**Opt 2 ＋ 窓を `head -n 50` に拡張（組み合わせ）**

handoff ブロックの機械可読フィールド（`ISSUE_NUMBER:` / `issue_number:`）と
legacy ヘッダー（`> GitHub Issue: [#N]`）の**両方**を、ブロック長に余裕のある
50 行窓で受理する。Opt 2 が主役（ブロック長非依存）、`head -n 50` は legacy ヘッダーが
ブロック後方に来るケースの保険。全行スキャンにしない理由は §5.5 の誤検出回避。

### 6.2 archive-closed-plans.yml（L78）の置換

現行：
```bash
if head -n 20 "$f" | grep -qE "(GitHub Issue:|Issue) \[?#${n}\b"; then
```
置換後：
```bash
if head -n 50 "$f" | grep -qiE "(GitHub Issue:|Issue) \[?#${n}\b|ISSUE_NUMBER:[[:space:]]*${n}\b|ISSUE_URL:.*/issues/${n}\b"; then
```
- `grep -qi`：フィールド名の大小文字（`ISSUE_NUMBER` / `issue_number`）を吸収。
- legacy `[#N]` パターンと handoff フィールドを `|` で OR 結合。
- `${n}\b` の単語境界で `#13` が `#130` を誤マッチしないよう維持。

### 6.3 archive-orphan-plans.yml（L70-74）の置換

`issue_ref` 抽出ロジックを、複数ソースから最初に見つかった番号を取る形に拡張：
```bash
issue_ref=$(head -n 50 "$f" \
  | grep -oiE 'GitHub Issue:[[:space:]]*\[?#[0-9]+|ISSUE_NUMBER:[[:space:]]*[0-9]+|ISSUE_URL:[^[:space:]]*/issues/[0-9]+' \
  | grep -oE '[0-9]+' \
  | head -n1 || true)
```
- legacy ヘッダー・`ISSUE_NUMBER:`・`ISSUE_URL:.../issues/N` のいずれからも番号を抽出。
- `head -n1` で最初の 1 件のみ採用（既存挙動を維持）。

### 6.4 リグレッションフィクスチャ

`tests/fixtures/` 配下にスタブを置く方式を採用（ワークフロー内インラインより検証が独立）：
- `tests/fixtures/archive/pattern-b-handoff.md`：24 行以上の `<!-- analyst-handoff -->`
  ブロックを持ち、`> GitHub Issue: [#9999]` が ~35 行目に来るスタブ。
- 併せて、両ワークフローのマッチングロジックを抜き出して fixture に対して検証する
  軽量シェルテスト（例：`tests/archive-matcher.bats` または `scripts/` 下の検証スクリプト）。
  既存のテスト基盤が無い場合は、developer がスタブ + grep 一行検証スクリプトで最小構成にする。

> ※ テスト基盤の有無は developer がリポジトリ実態（`tests/` の有無、bats/Node 等）を見て
> 最小コストの方式を選ぶこと。最低限、上記 fixture に対して 6.2 / 6.3 の正規表現が
> `#9999` を検出することを示せれば十分。

### 6.5 メンテナンス階層

**Patch**。CI ワークフローのバグ修正のみで、製品コード・SPEC・ARCHITECTURE への
影響なし。architect 不要、developer 直行。

---

## §7 Document Changes（ドキュメント変更）

developer が編集／追加するファイル：

| ファイル | 変更 |
|----------|------|
| `.github/workflows/archive-closed-plans.yml` | L78 のマッチング正規表現を §6.2 へ置換 |
| `.github/workflows/archive-orphan-plans.yml` | L70-74 の `issue_ref` 抽出を §6.3 へ置換 |
| `tests/fixtures/archive/pattern-b-handoff.md`（新規） | リグレッションフィクスチャ（§6.4） |
| 軽量検証スクリプト／テスト（新規・任意） | fixture に対する正規表現検出テスト |

- SPEC.md：no change（メタプロジェクト・該当なし）
- UI_SPEC.md：not_exists
- ARCHITECTURE.md：no change

---

## §8 Handoff Brief for developer（実装ブリーフ）

### 目的
両 archive ワークフローが、handoff ブロックの位置・長さに依存せず GitHub Issue 番号を
検出できるようにする。

### 実装手順（ファイル別）

1. **`.github/workflows/archive-closed-plans.yml`（L78）**
   - `head -n 20` → `head -n 50`、`grep -qE` → `grep -qiE`。
   - パターンを legacy `[#N]` ＋ `ISSUE_NUMBER:[[:space:]]*${n}\b` ＋
     `ISSUE_URL:.*/issues/${n}\b` の OR に拡張（§6.2 のとおり）。
   - `${n}\b` の単語境界は維持（`#13` が `#130` を誤マッチしないため）。

2. **`.github/workflows/archive-orphan-plans.yml`（L70-74）**
   - `issue_ref` 抽出を §6.3 のマルチソース抽出へ置換。`head -n 50`・`grep -oiE`。
   - 後段の `gh issue view` / `state=CLOSED` 判定・冪等性・PR 作成ロジックは**変更しない**。

3. **リグレッションフィクスチャ（§6.4）**
   - `tests/fixtures/archive/pattern-b-handoff.md` を新規作成（marker を ~35 行目に配置）。
   - 最小の検証スクリプトで 1・2 の正規表現が `#9999` を拾うことを確認。
   - リポジトリにテスト基盤が無ければ、grep 一行 + 終了コード確認の最小スクリプトで可。

### 不変条件（壊さないこと）
- 冪等性：アーカイブ済みドックは no-op（`docs/design-notes/*.md` のみ走査する現行構造を維持）。
- ボットループ防止：`github.actor != 'github-actions[bot]'`（closed 側）を保持。
- Pattern A（handoff ブロック無し）ドックの legacy `> GitHub Issue:` マッチを保持。
- archive-orphan 側の `concurrency` グループ・`gh issue view` リトライ挙動を保持。

### 受け入れ基準
- 24 行以上の handoff ブロックを持ち marker が ~35 行目のスタブが、両ワークフローの
  マッチングロジックで `#N` として検出される。
- 大文字 `ISSUE_NUMBER:` と小文字 `issue_number:` の両系統を検出できる（`grep -i`）。
- 既存 Pattern A ドックのマッチが回帰しない。

### 補足
- 本 Issue（#150）本文の status 更新は任意。本プランニングドックが decision の正本。
- architect は不要（Patch・CI 修正のみ）。developer 直行。

