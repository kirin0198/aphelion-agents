> Last updated: 2026-05-05
> GitHub Issue: [#118](https://github.com/kirin0198/aphelion-agents/issues/118)
> Analyzed by: analyst (2026-05-05)
> Next: architect

# design-notes archive 自動化の safety net + README 整備 + proposals/ 新設

## §1 Background / motivation

`docs/design-notes/` は Aphelion ワークフローにおいて、analyst / architect 段階の
設計判断を記録する一次資料であり、対応する GitHub Issue が close されたタイミングで
`docs/design-notes/archived/` 配下に自動移動される設計になっている (PR #112 系)。

自動 archive は `.github/workflows/archive-closed-plans.yml` が担当し、
PR 本文の `Closes #N` / `Fixes #N` / `Resolves #N` を検出して、ヘッダ行
`> GitHub Issue: [#N](...)` を持つ planning doc を `git mv` で archived/ 配下に
移動する。

この仕組みは **PR 経由でマージされる前提** で組まれており、以下のような穴がある。

1. **PR 本文で `Closes #N` を書き忘れた場合、archive されないまま残る** — 単なる
   bug fix で issue 番号を本文に書かずに直接マージされたケース。原稿は
   `docs/design-notes/` に残り続け、後で見ると「open だっけ closed だっけ」が
   一目で分からない。
2. **issue を PR を介さず直接 `gh issue close` した場合、archive されない** —
   コードを伴わない決定 (Won't fix, スコープ外, 重複, 取りやめ) は PR を経由せず
   に閉じることがあり、その場合は workflow が発火しない。
3. **PR を merge せず close した場合の巻き戻し負担** — workflow は PR open 時点で
   archived/ に move してしまうため、merge せず close した場合は手動で巻き戻す
   必要があり、運用上のリスクが残る。
4. **「アイデア段階で issue 化する前のメモ」を置く場所が無い** — 現状
   `docs/design-notes/` は「issue が立った後の analyst phase 出力」を前提に
   していて、issue 化前のラフ提案 / 検討メモを置くと「どの issue?」が空になる。
   それを許容するか、別ディレクトリで運用するかが曖昧。
5. **README が archived/ にしか無い** — `docs/design-notes/archived/README.md`
   は丁寧に書かれているが、`docs/design-notes/` 直下には README が無く、新規参加者は
   「何を書く場所か / archive はどう動くか」を archived 側に潜らないと知れない。

このため、3 点をまとめた強化を提案する。

- **archive 自動化の safety net 強化** — 取りこぼしを定期スキャンで救済する
- **README 整備** — `docs/design-notes/README.md` を新規作成し運用ルールを明文化
- **proposals/ 新設** — issue 起票前のラフ提案 / 検討メモを置く専用ディレクトリ

## §2 現状

### 2.1 archive 自動化の動作

- 発火: `pull_request: opened / edited / synchronize`
- 検出: PR 本文の `Closes #N` / `Fixes #N` / `Resolves #N`
- マッチング: planning doc 先頭 20 行の `GitHub Issue: [#N](...)` ヘッダ行
- 動作: `git mv docs/design-notes/<slug>.md docs/design-notes/archived/<slug>.md`
- 冪等性: 既に archived/ 配下にあるものは no-op

### 2.2 取りこぼしパターン

| パターン | 現状の挙動 |
| --- | --- |
| PR 本文に `Closes #N` を書き忘れた | archive されない。手動 `git mv` 必要 |
| Issue を PR 無しで直接 close (Won't fix 等) | archive されない |
| PR を merge せず close | PR open 時点で move 済 → 手動巻き戻し必要 |
| 1 issue に複数 design-note (analyst + architect) | workflow は break せず両方 move する (対応済) |

### 2.3 ディレクトリ構成 (現状)

```
docs/design-notes/
├── archived/                       # close 済みの planning doc が集約
│   ├── README.md                   # 立派な解説あり
│   └── *.md                        # 過去の planning docs
├── readme-shields-badges.md        # 現在 active な planning doc
├── rules-ref-and-sync-check-hardening.md
└── wiki-and-site-update-audit.md
```

→ `docs/design-notes/` 直下には README が無い。

## §3 提案

### 3.1 推奨案: 3 点セットでの整備

#### A. archive 自動化の safety net (定期スキャン workflow)

新規 workflow `.github/workflows/archive-orphan-plans.yml` を追加:

- トリガ: `schedule` (週次 cron) + `workflow_dispatch` (手動実行)
- 処理:
  1. `docs/design-notes/*.md` (archived/ 除外) を全列挙
  2. 各ファイルの `> GitHub Issue: [#N](...)` ヘッダから issue 番号を抽出
  3. `gh issue view <N> --json state` で当該 issue の状態を取得
  4. **closed** であれば `git mv` で archived/ に移動
  5. 移動が発生したら自動 PR を作る (タイトル: `chore: archive orphaned planning docs`)
- 安全策:
  - 1 PR 1 commit に集約 (まとめて archive)
  - `--label automated, chore` 等を付与
  - 失敗しても何も壊れない (read のみ → git mv → PR)
- 既存 `archive-closed-plans.yml` との関係:
  - 既存は **PR 起点 (リアクティブ)**
  - 新規は **issue 状態起点 (定期スキャン)**
  - 役割分担: 通常は既存で十分、書き忘れ等の取りこぼしを新規が救済

#### B. `docs/design-notes/README.md` の新規作成

archived/README.md と対になる active 側のガイドを書く。記載項目:

- design-notes は何を置く場所か (analyst phase の planning doc)
- ヘッダ規約 (`> Last updated:`, `> GitHub Issue:`, `> Next:`)
- ライフサイクル (active → archived の自動 archive 動作)
- archive されない場合の手動 fallback コマンド
- proposals/ との使い分け (B と C を相互参照)

#### C. `docs/design-notes/proposals/` の新設

issue 起票前のラフ提案 / 検討メモ専用ディレクトリ:

- 配置: `docs/design-notes/proposals/<slug>.md`
- ヘッダ: `> GitHub Issue:` 行は **持たなくて良い** (issue 化前のため)
- 代わりに `> Status: proposal` `> Author: <name>` `> Created: <date>` を置く
- ライフサイクル:
  - 採用 → analyst が `docs/design-notes/<slug>.md` に昇格させ issue 起票
  - 却下 / pending → そのまま proposals/ に残る (もしくは proposals/archived/ へ)
- 既存の `archive-closed-plans.yml` の対象外にする (issue 番号を持たないため
  自然に対象外だが、明示的に記載)
- doc-reviewer / handover-author など各エージェントの読み取り対象には
  **含めない** (proposals/ はあくまで人間のメモ)

### 3.2 設計上のポイント

1. **safety net workflow の頻度** — 週次が妥当 (毎日は過剰)。`cron: '0 3 * * 1'`
   (毎週月曜 03:00 UTC) 等で十分。
2. **safety net workflow の権限** — `contents: write` `pull-requests: write`
   `issues: read`。`gh` CLI を使うので `GH_TOKEN: ${{ github.token }}` を
   渡す。
3. **proposals/ を MVP で導入するか** — 既存ユーザーの混乱を避けるため、
   README 整備と同時に「空ディレクトリ + .gitkeep + README に運用ルール記載」で
   始め、実例ができたタイミングで運用を回していく。
4. **archived/README.md との重複** — active 側 README から archived 側 README を
   参照する形にして、運用ルールの単一情報源を保つ。

## §4 選択肢の比較

### 4.1 archive 取りこぼしへの対応

| 案 | 概要 | Pros | Cons |
| --- | --- | --- | --- |
| **A. 定期スキャン workflow を追加 (推奨)** | 週次 cron で issue state を確認し archive | 取りこぼし自動救済 / 既存 workflow を壊さない | 新規 workflow 1 個増える |
| B. archive-closed-plans.yml 自体に issue close trigger を追加 | `issues: closed` で発火 | リアルタイム性が高い | PR 起点との二重発火リスク / 設計が混乱 |
| C. PR template に `Closes #N` 必須チェックを入れるだけ | CI でチェック | workflow 増えない | PR 経由じゃない close を拾えない / proposals 案件は弾けない |
| D. 何もしない | — | コスト 0 | 取りこぼし放置 |

→ 推奨は **A**。リアルタイム性は既存の PR trigger が担い、新規は救済役。

### 4.2 proposals/ ディレクトリの位置

| 案 | 概要 | Pros | Cons |
| --- | --- | --- | --- |
| **A. `docs/design-notes/proposals/` (推奨)** | design-notes 配下に共置 | 既存ディレクトリ内で完結 / ライフサイクルが見える | design-notes の守備範囲がやや広がる |
| B. `docs/proposals/` | 並列ディレクトリ | 概念的に分離が綺麗 | docs/ 配下のディレクトリ数が増え俯瞰しにくい |
| C. GitHub Discussions に寄せる | 機能で分離 | リポに置かない / 議論しやすい | コード履歴に残らない / 後で参照しにくい |

→ 推奨は **A**。既存運用との連続性を優先する。

## §5 影響範囲

### 5.1 新規追加ファイル

- `.github/workflows/archive-orphan-plans.yml` — 定期スキャン workflow
- `docs/design-notes/README.md` — active 側ガイド (新規)
- `docs/design-notes/proposals/.gitkeep` — proposals/ 新設マーカー
- (任意) `docs/design-notes/proposals/README.md` — proposals 運用ルール

### 5.2 修正が必要なファイル

- `docs/design-notes/archived/README.md` — active 側 README へのリンクを追加
- `.claude/agents/analyst.md` — proposals/ から昇格するワークフローを明記する
  (任意)
- `.claude/agents/doc-reviewer.md` — proposals/ を sync チェック対象から除外
  することを明記
- `.claude/agents/handover-author.md` — proposals/ を Glob 対象外にすることを
  明記
- `docs/wiki/` 配下の Contributing.md — design-notes / proposals の使い分けを記載

### 5.3 ユーザー影響

- 既存 planning doc には影響しない (heading 規約・archive 動作は維持)
- 新規 cron workflow は read 中心で副作用は PR 作成のみ。merge は人間判断
- proposals/ は opt-in。空ディレクトリで始まるので何も困らない

## §6 後方互換戦略

- 既存 `archive-closed-plans.yml` は変更しない (壊れていないため)
- 新規 `archive-orphan-plans.yml` は **追加** であり、既存 workflow を置き換えない
- proposals/ は新設ディレクトリで、既存ファイルの移動は行わない
- README.md (active 側) は新規作成のみ。archived/README.md は既存のまま
  (リンク追加程度の小修正に留める)

## §7 Acceptance Criteria

- [ ] 新規 workflow `.github/workflows/archive-orphan-plans.yml` が追加され、
      週次 cron + `workflow_dispatch` で動作することがドキュメント化されている。
- [ ] その workflow は `docs/design-notes/*.md` (archived/ 除外) を走査し、
      `> GitHub Issue: [#N](...)` ヘッダを持ち、かつ当該 issue が **closed** な
      ものを `git mv` で archived/ に移動して PR を作成する。
- [ ] 1 度のスキャンで複数ファイルが対象になっても、1 PR にまとまる
      (= ファイルごとの量産 PR にならない)。
- [ ] 既存 `archive-closed-plans.yml` の挙動は変わらない (PR open 時の動作は維持)。
- [ ] `docs/design-notes/README.md` が新規作成され、以下を含む:
      ヘッダ規約 / archive ライフサイクル / 手動 fallback コマンド / proposals/ との関係。
- [ ] `docs/design-notes/proposals/` が `.gitkeep` と共に新設されている。
- [ ] doc-reviewer / handover-author が proposals/ 配下を読み取り対象から
      除外していることが、エージェント定義に明記されている。
- [ ] CHANGELOG に「archive 自動化に定期スキャン safety net を追加」「proposals/
      ディレクトリを新設」が記録されている。

## §8 Handoff brief for architect

- 主担当: architect (workflow 設計 + ディレクトリ運用ルールの確定)
- 設計ポイント:
  1. `archive-orphan-plans.yml` の YAML 仕様 (cron 表記、permissions、
     concurrency, gh CLI 呼び出しの shell スニペット, 失敗時の挙動)
  2. PR 自動作成の細部 (タイトル / 本文 / ラベル / 著者表記
     `github-actions[bot]`)
  3. 1 PR にまとめる際の git operations (single commit / multi-file
     `git mv` の順序)
  4. proposals/ の README ドラフト (ヘッダ規約、昇格時の手順、却下ポリシー)
  5. doc-reviewer / handover-author 側の Glob 範囲を「proposals/ 除外」に
     更新する具体的な行
- 残課題 / 開放質問:
  - 定期スキャンの頻度 (週次 vs 隔週) は議論の余地あり。週次で開始する。
  - proposals/ にも archived/ 相当を作るかは保留 (運用が回ってから判断)。
  - GitHub Actions の `gh` CLI 呼び出しに必要な token scope を確定する
    (issues:read + contents:write + pull-requests:write を想定)。
