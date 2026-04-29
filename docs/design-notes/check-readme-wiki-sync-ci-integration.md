# ci: integrate check-readme-wiki-sync.sh into GitHub Actions (follow-up to #76)

> Reference: current `main` (HEAD post-#87, 2026-04-29)
> Created: 2026-04-29
> Last updated: 2026-04-30
> GitHub Issue: [#81](https://github.com/kirin0198/aphelion-agents/issues/81)
> Analyzed by: analyst (2026-04-29)
> Author: analyst (design-only phase — implementation deferred to `developer`)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> Next: developer (実装フェーズで本ノートに従って `.github/workflows/check-readme-wiki-sync.yml` を新設する)
> Implemented in: [PR #88](https://github.com/kirin0198/aphelion-agents/pull/88)

> **Language policy note** — 本ノートは #75 の「Hand-authored canonical narrative」
> 規定（`docs/design-notes/<slug>.md` は単一言語、Output Language に追従、現状 `ja`）
> に従う。skeleton 見出し（`## 1. Problem statement` など）は英語固定で残し、
> 本文は日本語で記述する。
>
> 一方、本 issue が新設対象とする `.github/workflows/*.yml` は
> `language-rules.md` の "Hand-authored canonical narrative" の対象外であり、
> 業界慣習通り英語固定とする（既存の `archive-closed-plans.yml` も英語コメント
> 統一）。

---

## 1. Problem statement

#76（PR #83）で `scripts/check-readme-wiki-sync.sh` が新設された。同スクリプトは
README ↔ Wiki の co-update set 整合性を 3 種類の grep ベースで検査する:

1. agent count parity（`README.md` / `README.ja.md` / `docs/wiki/{en,ja}/Home.md`）
2. slash command parity（`.claude/commands/aphelion-help.md` ↔ `docs/wiki/en/Getting-Started.md`）
3. README.md ↔ README.ja.md の `^## ` 見出し数 + 行位置の一致

しかし #76 のスコープでは **CI 統合は意図的に follow-up に分離**された
（`docs/design-notes/archived/readme-wiki-responsibility-split.md` §4 Q1 参照、
2026-04-30 決定で本 issue #81 として切り出し）。現状、スクリプトは PR Checklist
（`docs/wiki/en/Contributing.md` L217–223）に「実行してくれ」と書かれているのみで、
**機械的な強制が何もない**。レビューア／作成者がチェックボックスを盲信した場合、
ドリフトはそのまま merge される。

issue #81 はこのギャップを GitHub Actions ワークフロー新設で埋めることを目的と
する。本 design note は、issue 文面 §3.1–§3.4 の 4 設計判断（trigger / required
vs advisory / bypass / coexistence with archive-closed-plans.yml）に対して
evidence ベースで推奨案を提示し、`developer` への handoff brief を確定する。

---

## 2. Current state

### 2.1 関連ファイル一覧（行番号つき）

| File | 役割 | Key lines |
|------|------|-----------|
| `scripts/check-readme-wiki-sync.sh` | 本 issue の対象スクリプト | L13 `set -euo pipefail` / L19 `fail=0` / L24 agent count actual / L35–42 Check 1 loop / L49–58 Check 2（commands diff）/ L70–76 Check 3 heading count / L83–91 Check 3 line positions / L93 `exit $fail` |
| `.github/workflows/archive-closed-plans.yml` | リポジトリ唯一の既存 workflow（参照モデル） | L20–22 trigger（`pull_request: [opened, edited, synchronize]`）/ L28–30 fork + bot loop guard / L31 `runs-on: ubuntu-latest` / L32–35 `permissions: contents: write / pull-requests: read / issues: read` / L38–43 checkout（PR ブランチを `persist-credentials: true` で取得）/ L93–111 push-back ステップ |
| `docs/wiki/en/Contributing.md` | PR Checklist L217–223 に `bash scripts/check-readme-wiki-sync.sh` の手動実行行 | L217–223 |
| `docs/wiki/ja/Contributing.md` | ja 版 PR Checklist L214 に同等行 | L214 |
| `docs/design-notes/archived/readme-wiki-responsibility-split.md` | #76 design note。§4 Q1 (L306–309) で「CI 化は #81 follow-up」と決定 | L285–289（§3.2.5 CI 統合「任意拡張」）/ L306–309（§4 Q1 決定） |
| `src/.claude/rules/language-rules.md` | #82（PR #87）で「Repo-root README sync convention」§3.3 に Check 3 への直接 cross-ref | L99–107 |
| `CHANGELOG.md` | `[Unreleased]` に #76 / #82 のスクリプト追記履歴 | L12–18, L40–46 |

### 2.2 スクリプト挙動

`scripts/check-readme-wiki-sync.sh` を repo HEAD（post-#87）で実行すると:

- 終了コード: `exit 0`（HEAD 健全状態）
- 実行時間: 純粋に grep のみ（外部呼び出し・依存ツールなし）。L24–33 / L49–53 /
  L70–84 のいずれも数百行未満のテキストに対する正規表現マッチ。**実測値は
  1 秒未満**（環境差を考慮しても十分に「即時」と扱える）。
- 出力: 成功時は silent。失敗時は stderr に該当 surface のミスマッチを 1 行で
  プリントしつつ `fail=1` を立て、最終 `exit 1`。L39 / L55–57 / L74 / L87–89。

### 2.3 リポジトリ周辺状態

`gh repo view kirin0198/aphelion-agents --json defaultBranchRef,visibility`:

```json
{"defaultBranchRef":{"name":"main"},"visibility":"PUBLIC"}
```

→ public リポジトリのため GitHub Actions の minute は実質無制限（public repo は
billing 対象外）。`every PR` で走らせても課金懸念なし。

`gh api repos/kirin0198/aphelion-agents/branches/main/protection`:

```
{"message":"Branch not protected","status":"404"}
```

→ **main ブランチに branch protection が一切設定されていない**。これは §3.2
（required check policy）の判断に直接効く。required check は branch protection
rule 上の "Require status checks to pass before merging" + "Require branches to
be up to date" でしか強制できない。protection が無い現状では、workflow が
fail しても merge は技術的に可能（人間レビューに依存）。

### 2.4 既存 workflow の trigger / permissions / actor filter パターン

`archive-closed-plans.yml` を参照モデルとして再利用可能なパターン:

- **trigger**: `pull_request: [opened, edited, synchronize]`（L20–22）。
  本 issue でも同じ 3 種類で十分（fork PR でない PR の作成・本文編集・新コミット
  push の全タイミングをカバー）。
- **fork PR / bot loop guard**: L28–30
  ```yaml
  if: |
    github.event.pull_request.head.repo.full_name == github.repository
    && github.actor != 'github-actions[bot]'
  ```
  `archive-closed-plans.yml` は push-back を行うため bot loop guard が必須。
  本 issue の workflow は **read-only / no push-back** のため fork PR でも
  動作可能（fork からの PR でも実行コストはゼロに近い）が、後述 §5.4 で議論する
  ように `archive-closed-plans.yml` の bot コミットに対しても本 workflow が
  走ることになるため、bot loop 防止は不要だが「無駄な再実行」を抑える目的で
  `actor != 'github-actions[bot]'` だけは継承する価値がある。
- **permissions**: 本 issue では push-back しないため `contents: read` のみで
  十分（`archive-closed-plans.yml` の `contents: write` は不要）。
- **runs-on**: `ubuntu-latest` を踏襲。

---

## 3. Constraints

1. **Read-only archive policy**: `docs/design-notes/archived/**` 配下は本
   analysis pass で編集しない（issue 指示）。
2. **No script modification**: `scripts/check-readme-wiki-sync.sh` は本 pass で
   触らない。スクリプトのバグを発見しても §7 open question として上げて別
   issue 化（issue 指示）。
3. **No rule file modification**: `src/.claude/rules/*.md` は本 pass で触らない。
4. **Branch protection 未設定**: §2.3 のとおり main に protection が無い。
   `required check` への昇格は workflow YAML 単独では完了しない（GitHub の
   Settings UI または `gh api -X PUT .../branches/main/protection` での
   protection 作成が前提）。これは §5.2 の判断に直接影響する。
5. **`archive-closed-plans.yml` との並走**: 両者とも `pull_request: [opened,
   edited, synchronize]` で起動するため、PR 作成 / 編集 / push 時に**並列**で
   走る。GitHub Actions は同一 PR に対して複数 workflow を独立した job として
   実行するため、race condition は発生しない（§5.4 で詳述）。
6. **`.github/workflows/*.yml` の言語**: 「Hand-authored canonical narrative」
   セクション（`language-rules.md` L46–69）は `docs/wiki/`、
   `docs/design-notes/`、`README*.md` のみを対象とし、`.github/workflows/` は
   含まない。既存 `archive-closed-plans.yml` の慣習（英語コメント）に従う。
7. **`refactor` ラベル維持**: issue は既に `refactor` ラベル付き。本 design
   note は label 変更を提案しない。

---

## 4. Goals & success criteria

issue 文面 §"Acceptance criteria" を本 design note の DoD とする:

1. `.github/workflows/check-readme-wiki-sync.yml` が存在し、PR で起動する。
2. 健全な main では `exit 0`。意図的にドリフト（例: README.md の agent count
   を 31 → 32 に変更し Home.md は据え置き）を入れた状態で `exit 1` し、
   workflow が `failure` ステータスを返す。
3. trigger / required-vs-advisory / bypass の判断が workflow YAML の
   top-of-file コメントに記載され、将来のメンテナがトレードオフを把握できる。

加えて本 design note の自己 DoD:

4. §5 が §3.1–§3.4 の 4 設計判断それぞれに対し evidence-based な推奨を提示し、
   `developer` が迷わず実装に着手できる。
5. §7 で残存する `needs-user-decision` 項目を明示する。
6. `developer` handoff brief（§8）が runnable な手順に落ちている。

---

## 5. Approach

### 5.1 §3.1 trigger conditions — **every PR（path-filter なし）を推奨**

**選択肢:**
- (a) `pull_request: [opened, edited, synchronize]`（every PR）
- (b) (a) + `paths:` filter（`README.md` / `README.ja.md` /
  `docs/wiki/{en,ja}/Home.md` / `.claude/commands/aphelion-help.md` /
  `docs/wiki/en/Getting-Started.md` / `scripts/check-readme-wiki-sync.sh`）
- (c) (a) + `paths-ignore: ['docs/design-notes/archived/**']`

**推奨: (a) every PR**。

**Evidence:**

- スクリプト実行時間 < 1 秒（§2.2）。GitHub Actions の job overhead（runner 起動
  + checkout）が支配的でスクリプト本体の負荷は無視できる。
- public repo（§2.3）のため Actions minute 課金なし。
- (b) の path-filter には**致命的な漏れ**がある: 「agent file を新規追加したが
  README.md / Home.md のいずれかしか更新していない」ケースで、agent file
  （`.claude/agents/*.md`）自体は filter 対象外のため workflow が起動しない。
  これは Check 1（agent count parity）が捉えるべき**典型的なドリフト**であり、
  filter で漏らすのは本末転倒。`paths` を `.claude/agents/**` まで広げると
  ほぼ "every PR" と等価になり、filter の存在意義が薄れる。
- (c) は "archive 移動 PR を除外" を狙うが、`archive-closed-plans.yml` の
  bot コミットを除外する手段は §5.4 のとおり actor filter で十分。`paths-ignore`
  を入れる価値は低い。

**結論:** 単純に every PR で起動する。実装の YAML は `archive-closed-plans.yml`
L20–22 をそのまま借りる。

### 5.2 §3.2 required check policy — **advisory として導入、後続 PR で promote 判断**

**選択肢:**
- (a) advisory only（fail しても merge 可能。人間判断で blocker 化）
- (b) required check（branch protection 経由で merge を技術的にブロック）

**推奨: (a) advisory として導入。1〜2 PR サイクルで false positive 率を観測
してから (b) への promote を別 issue で判断**。

**Evidence:**

- §2.3 のとおり main に branch protection が無い。required check の前提条件
  （branch protection rule の作成）が満たされていない。本 issue のスコープに
  protection 設定変更を含めるのは越権（issue 文面は workflow 追加に focus し、
  リポジトリ運営方針の変更は明記されていない）。
- スクリプトは grep ベースで「正規表現が変わると false positive を出しうる」
  リスクが残る。例: README.md の "31 specialized agents" 表記が将来
  "31 expert agents" など微妙に変わった場合、Check 1 の grep `[0-9]+ specialized
  agents` が空ヒットして「`README.md reports '', actual=31`」のミスマッチを
  返す。これは regex drift であり実態のドリフトではない。advisory として
  運用しつつ false positive 率を観測する期間が必要。
- archived design note (`readme-wiki-responsibility-split.md` §4 Q1, L308) も
  「CI ワークフロー追加は ... 別 issue のスコープを膨らませる」と慎重姿勢。
  本 note はその姿勢を踏襲し、required 化は更に分離する。

**実装上の意味:**

- workflow の `runs-on` / `steps:` は通常通り。ただし top-of-file コメントに
  「This workflow is advisory at the time of introduction. Promotion to a
  required status check via branch protection is a deliberate follow-up
  decision (#TBD)」と明記する。
- required 化したい場合は GitHub Settings → Branches → "Add branch protection
  rule" で `main` に対して "Require status checks to pass" を有効化し、
  `check-readme-wiki-sync` を必須チェックとして追加するという**運用変更が
  別途必要**である旨を §8 handoff brief に書く。

### 5.3 §3.3 false positive bypass — **(a) では不要、required 化時に再検討**

**選択肢:**
- (a) advisory なので bypass 機構不要
- (b) `[skip-readme-wiki-sync]` PR-body キーワード
- (c) `docs:wiki-sync-skip` ラベル
- (d) rerun-after-fix（false positive を検知したら正規表現側を修正してから再 push）

**推奨: §5.2 で advisory にとどめる前提のため (a) 不要**。
将来 required 化する際の bypass は **(d) rerun-after-fix を第一選択、(b) PR-body
キーワードを次善**で検討する（required 化 issue で本格議論）。

**Evidence:**

- advisory check は merge を物理的にブロックしないため、bypass 機構を持つこと
  自体が無意味（merge 側で無視するだけ）。
- false positive の典型は「regex drift」または「意図的非対称な表現変更」。
  どちらも**スクリプト側の修正で恒久対処すべき**であり、PR ごとに skip する
  のは技術的負債を温存する。よって (d) rerun-after-fix（実体は「regex を直す
  PR を別途出してから本 PR に rebase」）が最も健全。
- (c) ラベル方式は GitHub の自動ラベル merge bot との競合や、ラベル管理の
  オーバーヘッドが発生する。(b) PR-body キーワードのほうが軽量で discoverable。
- 本 issue では **bypass 機構を実装しない**。required 化フェーズで初めて議論する。

### 5.4 §3.4 coexistence with archive-closed-plans.yml — **並走を明示し、actor filter を継承する**

**Evidence:**

- 両 workflow は同一 trigger（`pull_request: [opened, edited, synchronize]`）で
  起動するが、GitHub Actions は同一 PR に対して**複数 workflow を独立した
  job として並列実行**する。共有リソース（同一ブランチへの書き込み）が
  なければ race は発生しない。
- `archive-closed-plans.yml` は L93–111 で **PR ブランチに push-back する**
  （`git mv` した archive 移動を bot コミット化）。この bot コミットは
  `synchronize` イベントを再発火させ、両 workflow を再実行させる。
  - 本 issue の新 workflow は read-only（grep + exit code）なので、再実行
    自体に副作用はない。
  - ただし「bot コミットに対しては checkout すべき commit がスクリプトに
    関係ない」場合があるため、actor filter `github.actor != 'github-actions[bot]'`
    を継承して**無駄な再実行を 1 回スキップ**することを推奨。
- fork PR の扱い: `archive-closed-plans.yml` L29 は
  `head.repo.full_name == github.repository` で fork を弾いているが、これは
  `contents: write` permission が必要なため。本 issue は read-only のため
  **fork PR からも実行可能**にして問題ない（むしろ external contributor の
  PR でも drift を捉えたい）。よって fork filter は継承しない。
- 結果として if 条件は次のようになる:
  ```yaml
  if: github.actor != 'github-actions[bot]'
  ```

### 5.5 推奨 workflow YAML の概形

```yaml
name: Check README ↔ Wiki sync

# Advisory check at introduction (#81 / follow-up to #76).
# Promotion to a required status check via branch protection is a
# deliberate follow-up decision; see docs/design-notes/check-readme-wiki-sync-ci-integration.md §5.2.
#
# Triggers: pull_request: [opened, edited, synchronize] — every PR, no path filter.
#   Rationale: the script (scripts/check-readme-wiki-sync.sh) runs in <1s,
#   public repo Actions minutes are unmetered, and a path filter would miss
#   "agent added but only one surface updated" — exactly the drift this
#   check is designed to catch. See §5.1 of the design note.
#
# Coexistence: archive-closed-plans.yml runs on the same triggers but is
# independent (no shared writes). The actor filter below skips the no-op
# re-run after archive-closed-plans pushes its bot commit. See §5.4.

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  check:
    if: github.actor != 'github-actions[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout PR head
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 1
      - name: Run README ↔ Wiki sync check
        shell: bash
        run: bash scripts/check-readme-wiki-sync.sh
```

---

## 6. Document changes (planned)

**本 analysis pass ではこれらは行わない**（§3 制約）。

| File | 変更 | Rationale |
|------|------|-----------|
| `.github/workflows/check-readme-wiki-sync.yml` | 新規作成 | §5.5 の概形を実装。issue Acceptance criteria #1。 |
| `CHANGELOG.md` | `[Unreleased]` セクション "Added" に1 行追記。例: `.github/workflows/check-readme-wiki-sync.yml — new advisory CI workflow that runs scripts/check-readme-wiki-sync.sh on every PR (#81)`。 | 新 workflow 追加の追跡。 |
| （任意）`docs/wiki/{en,ja}/Contributing.md` PR Checklist 行 | 注記として「CI でも自動実行されます（advisory）」と一文追加するか。**本 design note では追加を推奨しない**（PR Checklist の手動実行行は CI 落ちのリカバリ手順としても機能するため、運用面で残しておく価値がある）。 | 不変が望ましい。 |

**触らないファイル**:

- `scripts/check-readme-wiki-sync.sh` — §3 制約。
- `src/.claude/rules/*.md` — §3 制約。
- `package.json` `version` — `.github/workflows/` は version bumping policy
  （`Contributing.md` L226–238 が指定する `.claude/agents/`、`.claude/rules/`、
  `.claude/commands/`、`.claude/orchestrator-rules.md`）の対象外。bump 不要。
- `docs/design-notes/archived/**` — read-only policy。
- `README.md` / `README.ja.md` / `docs/wiki/{en,ja}/Home.md` — 検査対象であり
  本 issue では変更しない。
- main の branch protection 設定 — §5.2 で明示的に scope 外とした
  （required 化は別 issue）。

---

## 7. Open questions

§5 で evidence ベースの推奨を確定できた問いは省く。以下は残存する判断事項。

1. **(needs-user-decision: yes)** §5.2 advisory にとどめる方針で良いか確認。
   - 推奨: advisory で導入し、1〜2 PR サイクル後に required 化を別 issue で
     議論。
   - 別案: 最初から branch protection を作成して required 化（本 issue の
     scope を branch protection 設定変更まで拡張）。
   - 判断材料: 本リポジトリは現状「人間レビュー + PR Checklist」で品質を
     担保しており、protection rule を一切持たない運用方針。protection 導入は
     1 ファイルの追加を超えるリポジトリ運営ポリシーの変更となるため、user
     確認推奨。
   - 2026-04-30 決定: advisory only。branch protection rule の変更なし。
     workflow は全 PR で実行され、fail は visible だが merge をブロックしない。
     required 化は将来の別 issue に明示的に委ねる。

2. **(needs-user-decision: yes)** §5.4 actor filter を継承する方針で良いか確認。
   - 推奨: `github.actor != 'github-actions[bot]'` を入れる。
   - 別案: filter なし（bot コミットでも check を再実行する）。bot コミット
     （archive 移動）が檢査対象 surface を変えないため、再実行は冗長だが
     害はない。Actions minute も public repo なら無料。
   - 判断: 推奨案（filter あり）でシンプルに。filter なしを選ぶ強い動機はない。
   - 2026-04-30 決定: `if: github.actor != 'github-actions[bot]'` を継承する。
     archive-closed-plans.yml が bot コミットを PR ブランチに push-back した際の
     無駄な再実行をスキップする。fork filter は継承しない（本 workflow は
     read-only なので fork PR からの実行も問題ない）。

3. **(needs-user-decision: no)** §5.5 で `actions/checkout@v4` の `fetch-depth`
   を `1` にしている件。
   - スクリプトは `git log` 系を使わない（grep のみ）ため shallow clone で
     十分。`archive-closed-plans.yml` L42 が `fetch-depth: 0` を使っているのは
     `git mv` + 履歴を保つためで、本 workflow は不要。

4. **(needs-user-decision: no)** Script に潜在的バグ（`scripts/check-readme-wiki-sync.sh`
   L33 の `HOME_JA`）。
   - 観察: `wiki/ja/Home.md` の `[0-9]+ エージェント` を `sort -u` で 1 行に
     正規化しているが、L33 の最終出力は `tr '\n' ',' | sed 's/,$//'`。
     仮に L23 と L38 で異なる数字（例: `31` と `32`）が並んだ場合、HOME_JA は
     `31,32` のような **comma-separated 文字列**となり、L38 の比較
     `[ "$value" != "$ACTUAL" ]` で `31,32 != 31` として fail する。
     これは「ja Home 内ドリフト自体を検出する」設計（archived note
     `readme-wiki-responsibility-split.md` §3.2.4 の comment）として意図的。
     **バグではなく仕様**。本 issue では何もしない。

5. **(needs-user-decision: no)** workflow 名は `check-readme-wiki-sync` でよいか。
   - 慣習上、ファイル名と job 内 status check 名は揃えるのが望ましい。issue
     Acceptance criteria #1 もこの名前を指定している。

---

## 8. Handoff brief for developer

**handoff target: developer (§7 Q1 / Q2 が解決した後に着手)**

実装内容:

1. `.github/workflows/check-readme-wiki-sync.yml` を新規作成。中身は §5.5 の
   YAML をそのまま採用。top-of-file コメントは英語固定（`archive-closed-plans.yml`
   と同じ慣習）。
2. `CHANGELOG.md` `[Unreleased]` セクション "Added" に下記 1 行を追加:
   ```
   - `.github/workflows/check-readme-wiki-sync.yml` — new advisory CI workflow
     that runs `scripts/check-readme-wiki-sync.sh` on every PR
     (`pull_request: [opened, edited, synchronize]`). Read-only check; does
     not block merge. Promotion to a required status check is a deliberate
     follow-up decision. (#81)
   ```
3. PR body に `Closes #81` を含める。`archive-closed-plans.yml` が本 design
   note を archived に移動する。

実装後検証:

```bash
# 1. workflow ファイルが新設されていること
test -f .github/workflows/check-readme-wiki-sync.yml && echo OK

# 2. YAML 構文チェック（リポジトリ環境で実行可能なら）
python -c "import yaml; yaml.safe_load(open('.github/workflows/check-readme-wiki-sync.yml'))" && echo "yaml OK"

# 3. ローカルで対象スクリプトが pass すること（healthy main 確認）
bash scripts/check-readme-wiki-sync.sh && echo "script OK"

# 4. PR を出した後、Actions タブで本 workflow が起動し success したことを確認
gh run list --workflow=check-readme-wiki-sync.yml --limit 5

# 5. 意図的ドリフトテスト（acceptance criteria #2）:
#    別ブランチで README.md の "31 specialized agents" → "32 specialized agents"
#    に書き換え、PR を draft で出して本 workflow が exit 1 を返すことを確認。
#    確認後 draft PR は close するか、書き換えを revert する。

# 6. CHANGELOG 追記
grep -A3 '\[Unreleased\]' CHANGELOG.md | head
```

実装規模見込み: workflow YAML 約 35 行新規 + `CHANGELOG.md` 1 行追記 =
1 ファイル新規 + 1 ファイル微編集。所要 ~15–25 分（acceptance #2 のドリフト
テスト含む）。

`architect` 起動は不要（ARCHITECTURE.md 影響なし、purely CI/policy 改訂）。
