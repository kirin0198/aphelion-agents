# refactor: clarify README ↔ Wiki responsibility split and add cross-source consistency checks

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#76](https://github.com/kirin0198/aphelion-agents/issues/76)
> Implemented in: TBD

---

## 1. Background & Motivation

### 1.1 元 issue の主旨

> README ↔ Wiki の二重情報・責任分担が暗黙のままになっている。PR #69 で README を 208/202 行 → 75 行に圧縮したが、依然として両者をまたぐ情報（コマンド一覧、agent 数、Quick Start、Features 等）が残り、片方だけ更新される事故が起こりうる。

### 1.2 補足コンテキスト

- **本 issue は #53 の意図的な持ち越し**。`docs/design-notes/archived/readme-readability-wiki-links.md` §4 question 3 および §7 Out of scope の第 1 項目が、まさに「Wiki と README のメンテ責任分担の明文化」を別 issue へ送ると明記している。
- README は PR #69 で「ランディングページ」として再定義されたが、その**位置づけ自体はリポジトリ内のどこにも明文化されていない**。Contributing.md §"README vs Wiki separation" には簡素な 3 行の指示があるのみ（後述 §2.3）。
- PR #67（`/pm` ショートカット削除、Closes #55）は本問題の**生きた実例**。PR body から:

  > Drop 11 `/pm` references across 6 files (Shortcuts table, READMEs, wiki Home + Getting-Started for both languages)

  この 6 ファイル同時更新が必要であることは、貢献者が `grep -rn '/pm'` を手で打って初めて分かった。Contributing.md / PR Checklist のどこにも「コマンド削除時は最低でもこの 6 サーフェスを当たれ」とは書かれていない。
- Aphelion のリリースサイクル（`package.json` version bump → `npx ... update`）でユーザーに届くのは `.claude/` 配下のみだが、READMEとWiki はリポジトリ可視層であり、GitHub の repo ホームを開いた読者にとっては **README が事実上の正規ソース**として機能する。Wiki が canonical という運用と GitHub 側 UX のズレも、責任分担を明文化すべき動機の 1 つ。

### 1.3 ゴール

新規貢献者が「ある変更を加えるとき、どのファイル群を同時に触るべきか」を **grep に頼らず Contributing.md または overview から判断できる** 状態にする。さらに、忘れがちな項目（agent 数、コマンド一覧）を機械チェックで担保する。

---

## 2. Current state

### 2.1 README と Wiki の現行ファイル群

| ファイル | 行数 (HEAD) | 性格 |
|----------|-------------|------|
| `README.md` | 75 | ランディングページ (en) |
| `README.ja.md` | 75 | ランディングページ (ja) |
| `docs/wiki/en/Home.md` | 103 | Wiki エントリ (en) |
| `docs/wiki/ja/Home.md` | 104 | Wiki エントリ (ja) |
| `docs/wiki/en/Getting-Started.md` | 319 | クイックスタート canonical (en) |
| `docs/wiki/ja/Getting-Started.md` | 306 | クイックスタート canonical (ja) |
| `docs/wiki/en/Contributing.md` / `ja/Contributing.md` | (相互 sync 規定あり) | 貢献ルール |
| `.claude/commands/aphelion-help.md` | 46 | スラッシュコマンド一覧（実行時表示） |

### 2.2 README ↔ Wiki / コマンド定義間の重複箇所（実 grep で確認）

`grep -nE "npx github:kirin0198|aphelion-init|aphelion-help|/discovery-flow|/delivery-flow|/operations-flow|/maintenance-flow"` および `grep "31 agents\|31 specialized"` の結果から得られた重複点:

| 項目 | README.md | README.ja.md | Wiki Home (en/ja) | Wiki Getting-Started (en/ja) | aphelion-help.md | `.claude/agents/` 実体 |
|------|-----------|--------------|--------------------|------------------------------|------------------|----------------------|
| **Aphelion キャッチコピー（agent 数）** | L3: `31 specialized agents` | L3: `31 の専門エージェント` | Home L22 / L37: `all 31 agents` | — | — | `ls .claude/agents/ \| wc -l` = **31** |
| **Quick Start `npx ... init` コマンド** | L41 | L41 | — | L29 (prose) / L45 (code) | — | — |
| **`/aphelion-init` 案内** | L43 | L43 | — | L99 / L235 | "Shortcuts" 表 | `aphelion-init.md` |
| **`/aphelion-help` 案内** | L49 | L49 | — | L105 / L236 / L250 | "Discoverability" 表 | `aphelion-help.md` |
| **`/discovery-flow` 言及** | (Learn more 圏外) | — | Home L48 | L79, L110, L148, L237 | Orchestrators 表 | `discovery-flow.md` |
| **`/delivery-flow` 言及** | — | — | — | L122, L154, L168, L184, L216, L238 | Orchestrators 表 | `delivery-flow.md` |
| **`/operations-flow` 言及** | — | — | — | L134, L160, L239 | Orchestrators 表 | `operations-flow.md` |
| **`/maintenance-flow` 言及** | — | — | Home L67, L89 | L194, L241 | Orchestrators 表 | `maintenance-flow.md` |
| **3-domain 図 (mermaid)** | L15-26 | L15-26 | — (描かない) | — | — | — |
| **Features 5 項目** | L55-59 | L55-59 | — | — | — | — |
| **Wiki ページ目次（5 項目）** | L65-69 | L65-69 | L29-39 (Core Pages 表) | — | — | — |
| **Triage Plan 名 (Minimal/Light/Standard/Full)** | (削除済) | — | Home L79 (glossary) | — | — | `aphelion-overview.md` |

### 2.3 Contributing.md の現行記述（en, L125-129）

```markdown
### README vs Wiki separation

- **README**: Entry point and Quick Start. Keep it short — setup, scenarios, command reference.
- **Wiki**: Detailed reference. Agent schemas, rule explanations, triage logic.
- Do not add detailed reference content to README. Do not add Quick Start content to the wiki Home.md.
```

評価:
- **役割定義は最低限ある**が、抽象的（"keep it short" / "detailed reference"）。
- **どの項目が両方に存在し、同時更新を要するか**は一切列挙されていない。
- **README 自体が canonical か mirror か**の宣言がない（読者は「README がランディング」と認識するが、執筆責任までは追えない）。
- **PR Checklist (L155-163)** は wiki/en ↔ wiki/ja の sync を強制しているが、`README.md` `README.ja.md` は登場しない。Wiki ↔ README の co-update も同様に登場しない。
- bilingual sync policy (L133-147) は wiki 限定で、README en ↔ ja には適用されない（運用慣行として両方更新する暗黙合意のみ）。

### 2.4 アクシデントモデル（過去の更新パターン）

PR ログを見るに、README と Wiki の同時更新が必要だった近過去の典型例:

| PR | 必要だった同時更新サーフェス | 漏れの起こりやすさ |
|----|------------------------------|----------------------|
| #67 (remove `/pm`) | aphelion-help.md / README.md / README.ja.md / Home (en/ja) / Getting-Started (en/ja) = 6 ファイル | 高（grep に頼った） |
| #69 (README compression) | README.md / README.ja.md + Wiki Getting-Started 軽微補強 = 3〜4 ファイル | 中（事前 plan があった） |
| #42 (Agents-Reference 分割) | wiki/en/ と wiki/ja/ の Agents-* 5 ペア + Home の目次 + Contributing | 中（bilingual sync policy が機能） |
| 仮想シナリオ: 32 番目の agent 追加 | `.claude/agents/` 追加 + Agents-{Domain}.md (en/ja) + README.md L3 + README.ja.md L3 + Home.md L22, L37 (en) + ja Home の対応行 | **高**（README L3 を忘れがち） |

agent 数の 32 化は将来必ず起こる。`grep -rn "31 agents\|31 specialized"` で 4 サーフェスがヒットするが、貢献者が事前にこの grep を実行する保証はない。

### 2.5 現行 PR Checklist の限界

`docs/wiki/en/Contributing.md` L155-163 の Checklist:

- [x] Canonical source (`.claude/agents/` or `.claude/rules/`) updated
- [x] `wiki/en/` page updated (if the change affects wiki content)
- [x] `wiki/ja/` page updated in the same PR (bilingual sync)
- [x] `> Last updated:` line updated in modified wiki pages
- [x] `> EN canonical:` line updated in corresponding `wiki/ja/` pages
- [x] Matching `Agents-{Domain}.md` or `Rules-Reference.md` entry updated
- [x] If a new flow / orchestrator is added, update all integration points: Architecture-Domain-Model.md figures, ...
- [x] If a new file is added under `.claude/commands/`, also append a row to `.claude/commands/aphelion-help.md`
- [x] `package.json` `version` bumped if any file under `.claude/agents/`...

漏れ:
- **README.md / README.ja.md の co-update が一切登場しない**。
- agent 数表記の整合性チェックがない。
- aphelion-help.md ↔ Wiki Getting-Started.md §Command Reference の整合性チェックがない（既に列構造が異なる）。

---

## 3. Proposed approach

### 3.1 設計方針

1. **ドキュメントによる明文化 + 機械チェックのハイブリッド**: 暗黙ルールを Contributing.md に書き起こすだけでは漏れる（PR #67 の経験）。grep ベースの軽量スクリプトで重要 2 項目（agent 数、コマンド一覧）を機械的にガードする。
2. **README は「mirror」、Wiki は「canonical」の関係を明示する**。ただし「mirror」と書くと自動同期の含意が出るので、**"landing page that snapshots key facts from the Wiki"** のような表現にする（自動再生成は Out of scope）。
3. **PR Checklist に README 行を追加する**。Wiki のページが触られたとき、`README.md` `README.ja.md` を grep で確認するチェック項目を増やす。
4. **bilingual sync policy を README にも拡張する**。en ↔ ja 同時更新は既に運用されているが、Contributing.md の policy 文言上は wiki 限定なので、README ファイル群もスコープに含める。
5. **重複項目の "co-update set" 表を 1 つ作る**。Contributing.md に「以下の値はリポジトリ内 N サーフェスに重複している。ひとつ更新したら全部探せ」という物理的なリストを置く。

### 3.2 ドキュメント変更案

#### 3.2.1 `docs/wiki/{en,ja}/Contributing.md` §"README vs Wiki separation" の拡張

現行 3 行を以下のような節へ拡充:

```markdown
### README ↔ Wiki responsibility split

**Roles**

- **README** (`README.md` / `README.ja.md`) — landing page. Snapshots a small,
  hand-curated subset of facts from the Wiki: tagline + agent count, Quick Start
  command, Features (5 bullet points), and a Learn-more link section. The README
  is **not** a canonical source for any of these; it mirrors the Wiki.
- **Wiki** (`docs/wiki/{en,ja}/`) — canonical reference. Agent schemas, rule
  explanations, triage logic, command reference, troubleshooting all live here.
  The Wiki is the source of truth for everything the README mentions.

**Co-update set**

The following facts are intentionally duplicated between README and Wiki.
Updating one without the others is a defect; reviewers will block the PR.

| Fact | README sites | Wiki sites | Other sites |
|------|--------------|------------|-------------|
| Agent count (`31`, `32`, …) | `README.md` L3, `README.ja.md` L3 | `docs/wiki/en/Home.md` (×2), `docs/wiki/ja/Home.md` (×2) | — |
| Slash command names | (none — README defers to `/aphelion-help`) | `docs/wiki/{en,ja}/Getting-Started.md` §Command Reference | `.claude/commands/aphelion-help.md` |
| Quick Start command (`npx … init`) | `README.md`, `README.ja.md` (Quick Start section) | `docs/wiki/{en,ja}/Getting-Started.md` §Quick Start | — |
| 3-domain mermaid figure | `README.md`, `README.ja.md` | (Wiki uses prose + Architecture diagrams instead) | — |
| Features bullets (5 items) | `README.md`, `README.ja.md` | (Wiki Home Persona-Based Entry Points covers same ground in prose) | — |
| Plan tier names (Minimal/Light/Standard/Full) | (none currently) | `docs/wiki/{en,ja}/Triage-System.md`, `Home.md` glossary | `.claude/rules/aphelion-overview.md` |

**README en ↔ ja parity**

`README.md` and `README.ja.md` follow the same bilingual sync rule as the Wiki:
both must be updated in the same PR, and section headings / order must match
1:1. The minor-fix exception (typo + broken link only) applies here too.
```

#### 3.2.2 PR Checklist の追記（`Contributing.md` §"Pull Request Checklist"）

現行の 9 項目に以下を追加:

```markdown
- [ ] If the change touches anything in the **README ↔ Wiki co-update set**
      (see "README ↔ Wiki responsibility split"), all duplicated sites are
      updated in this PR. Run:
      ```
      bash scripts/check-readme-wiki-sync.sh
      ```
      and confirm no diffs are reported.
- [ ] `README.md` and `README.ja.md` were updated together (same section count
      and order) when either was modified.
```

#### 3.2.3 `aphelion-overview.md` の 1 行追記（任意）

ルールファイルに 1 文だけ "README is the landing snapshot; Wiki is canonical" を加えるかどうかは判断分岐。aphelion-overview.md は Claude Code のセッション起動時に auto-load されるため、過剰に増やすと token を消費する。**推奨**: aphelion-overview.md は触らず、Contributing.md だけで完結させる。理由は overview がエージェントの実行時挙動の文書であり、人間貢献者向けの sync ルールはスコープ外であるため。

#### 3.2.4 機械チェックスクリプト `scripts/check-readme-wiki-sync.sh`

最小実装案:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Check 1: agent count
ACTUAL=$(ls .claude/agents/ | wc -l)
README_EN=$(grep -oE "[0-9]+ specialized agents" README.md | grep -oE "[0-9]+")
README_JA=$(grep -oE "[0-9]+ の専門エージェント" README.ja.md | grep -oE "[0-9]+")
HOME_EN=$(grep -oE "all [0-9]+ agents" docs/wiki/en/Home.md | head -1 | grep -oE "[0-9]+")
HOME_JA=$(grep -oE "全 [0-9]+ エージェント" docs/wiki/ja/Home.md | head -1 | grep -oE "[0-9]+" || echo MISSING)

fail=0
for v in "$README_EN" "$README_JA" "$HOME_EN" "$HOME_JA"; do
  if [ "$v" != "$ACTUAL" ]; then
    echo "✗ agent count mismatch: actual=$ACTUAL, found=$v" >&2
    fail=1
  fi
done

# Check 2: slash command list parity
HELP_CMDS=$(grep -oE '/[a-z-]+' .claude/commands/aphelion-help.md | sort -u)
WIKI_CMDS=$(grep -oE '`/[a-z-]+' docs/wiki/en/Getting-Started.md | tr -d '`' | sort -u)
DIFF=$(diff <(echo "$HELP_CMDS") <(echo "$WIKI_CMDS") || true)
if [ -n "$DIFF" ]; then
  echo "✗ command list mismatch between aphelion-help.md and Getting-Started.md (en):" >&2
  echo "$DIFF" >&2
  fail=1
fi

exit $fail
```

これは grep ベースの**仮実装案**。developer フェーズで実装する際:
- `awk` / `jq` ベースで stricter にする選択肢
- `grep -oP` (Perl regex) を避ける（macOS 互換のため）
- CI で `pull_request` イベント時に走らせる（GitHub Actions ワークフローを追加するかどうかは別判断）

#### 3.2.5 CI 統合（任意拡張）

`.github/workflows/check-readme-wiki-sync.yml` を新設し、`on: pull_request` で `bash scripts/check-readme-wiki-sync.sh` を実行する。失敗時は PR ステータスチェックを fail させる。

ただしこの拡張は **本 issue ではオプション扱い**とする。ローカル実行の Checklist チェックボックスのみで運用上は十分機能する見込み。CI 化は最初の数回 PR を経て「漏れが発生する」と判明してから別 issue で追加してもよい。

### 3.3 ドキュメント変更しないもの（明示）

- README.md / README.ja.md 本文の文言変更は行わない（PR #69 の構成を保持）。
- Wiki Home / Getting-Started の本文変更は行わない。
- `.claude/rules/aphelion-overview.md` は触らない（理由: §3.2.3）。
- `.claude/commands/aphelion-help.md` も触らない（コマンド一覧は実態に既に追従している）。

---

## 4. Open questions

implementation 前に判断したい事項:

1. **CI 統合を本 issue で行うか、別 issue に分けるか**
   - 推奨: **別 issue に分ける**。本 issue は "documentation + local script" までを完了とし、CI 化はスクリプトが安定してから判断。
   - 理由: CI ワークフロー追加は GitHub Actions の権限（GITHUB_TOKEN scope）や `archive-closed-plans.yml` との干渉を再確認する必要があり、本 issue のスコープを膨らませる。

2. **agent 数を「マニフェスト化」するか**
   - 案: `.claude/manifest.json` のようなファイルを 1 つ作り、`{ "agent_count": 31 }` を保持。スクリプトはこれを参照。
   - 推奨: **やらない**（本 issue では）。`ls .claude/agents/ | wc -l` で十分自己記述的。マニフェスト導入は overhead に見合わない。

3. **Contributing.md 拡張だけで十分か、`Architecture-*.md` にも書くか**
   - 推奨: **Contributing.md に集約**。Architecture ページは「Aphelion の構造」を説明する場所であり、貢献ルールはここではない。

4. **bilingual 表現の扱い（README ↔ Wiki 表に "ja sites" 列を加えるか）**
   - 推奨: 表は **bilingual 表現を 1 行に圧縮**（例: `README.md` L3, `README.ja.md` L3 を 1 セルに）。理由: 表が縦に伸びると Contributing.md が膨張するため。

5. **Features 5 項目を co-update set に含めるべきか**
   - Features は意図的に Wiki に直接対応がない（Wiki Home の Persona-Based Entry Points が機能的に近いだけ）。完全 mirror ではないので、co-update set 表に含める意義は薄い。
   - 推奨: 表には残すが「Wiki sites: (none — README-only summary)」と明示する。

6. **`scripts/` ディレクトリの新規作成可否**
   - 既に `scripts/smoke-update.sh` (Contributing.md L165 で言及) が存在することから、`scripts/` は既存ディレクトリ。新規ディレクトリ作成は不要、ファイル追加のみ。
   - 確認: `ls scripts/` を developer 着手時に再実行する。

---

## 5. Document changes

### 5.1 編集対象ファイル

| ファイル | 変更種別 | 概要 |
|----------|----------|------|
| `docs/wiki/en/Contributing.md` | 修正 | §"README vs Wiki separation" を拡張（co-update set 表 + en ↔ ja parity 文）。PR Checklist に 2 行追加 |
| `docs/wiki/ja/Contributing.md` | 修正 | en と同期。`> EN canonical:` 更新 |
| `scripts/check-readme-wiki-sync.sh` | 新規 | agent count + command list の 2 種を確認する grep スクリプト |
| `docs/design-notes/readme-wiki-responsibility-split.md` | 新規（本ファイル） | analyst による設計ノート。本 PR の段階では untracked のまま |

### 5.2 編集しないファイル

- `README.md` / `README.ja.md`（行数 75 を維持）
- `docs/wiki/{en,ja}/Home.md`
- `docs/wiki/{en,ja}/Getting-Started.md`
- `.claude/commands/aphelion-help.md`
- `.claude/rules/aphelion-overview.md`
- `.github/workflows/`（CI 統合は別 issue に持ち越し）

### 5.3 文書バージョン更新

- `docs/wiki/en/Contributing.md` 冒頭の `> Last updated:` を `2026-MM-DD (updated 2026-MM-DD: README ↔ Wiki responsibility split documented, #76)` に更新
- `docs/wiki/ja/Contributing.md` 冒頭の `> EN canonical:` を同日付に更新

---

## 6. Acceptance criteria

PR レビュー時に以下を機械的または目視で確認:

1. `docs/wiki/en/Contributing.md` に "Co-update set" 表が存在し、最低 4 行（agent count / slash command names / Quick Start command / mermaid 図）を含む
2. 同表が `docs/wiki/ja/Contributing.md` にも対応する形で存在
3. PR Checklist に最低 2 つの新規行（co-update set チェック / README en ↔ ja sync）が追加されている
4. `scripts/check-readme-wiki-sync.sh` が実行可能ファイルとして存在し、`bash scripts/check-readme-wiki-sync.sh` がリポジトリ HEAD で `exit 0` を返す
5. スクリプトを意図的に壊した状態（README L3 を `99 specialized agents` に書き換える）でローカル実行すると `exit 1` を返し、stderr に違反箇所が出力される
6. en ↔ ja 同期: Contributing.md (en) で更新したセクションが ja にも対応形で存在し、章数・順序が一致
7. 既存の bilingual sync policy / README vs Wiki separation の他部分が壊れていない（`grep "README vs Wiki separation\|Bilingual Sync Policy"` でセクション存在確認）
8. `package.json` `version` の bump は **不要**（`.claude/` 配下を変更しないため。Contributing.md L166-172 の version policy に該当しない）

---

## 7. Out of scope

以下は本 issue の範囲外。必要なら別 issue を切る:

- **README.md / README.ja.md の文言変更**（PR #69 の構成を尊重）
- **Wiki ページの本文変更**（Home / Getting-Started 等）
- **CI 統合**（`.github/workflows/check-readme-wiki-sync.yml` の追加）
- **agent 数のマニフェスト化** (`manifest.json` / `version.lock` 等)
- **README en ↔ ja の自動翻訳・自動同期ツール導入**
- **Wiki の構造変更**（5-page Agents-Reference 分割は維持）
- **Cloudflare Pages デプロイ設定の変更**
- **`aphelion-overview.md` への記載追加**（本 issue では Contributing.md に集約）
- **既存 PR Checklist の他項目の整理**（version bumping policy, settings deny-list policy 等）

---

## 8. Handoff brief for developer

### 8.1 対象ファイル

- `docs/wiki/en/Contributing.md` — 修正
- `docs/wiki/ja/Contributing.md` — 修正
- `scripts/check-readme-wiki-sync.sh` — 新規（実行ビット必須）
- (任意) `docs/design-notes/readme-wiki-responsibility-split.md` — `Implemented in:` を実装 PR 番号に更新

### 8.2 編集方針

1. **§3.2.1 の文面案** をベースに `docs/wiki/en/Contributing.md` §"README vs Wiki separation" を書き換える。Co-update set 表は §2.2 のデータに基づき、不正確な行番号があれば実 grep で更新してから記載すること。
2. **§3.2.2 の追加 Checklist 行** を `Contributing.md` §"Pull Request Checklist" の末尾に追加。
3. **`docs/wiki/ja/Contributing.md`** を en と同じ章立てで同期更新。文面は ja の自然な敬体に。`> EN canonical:` を更新。
4. **`scripts/check-readme-wiki-sync.sh`** を §3.2.4 の案ベースで実装。注意:
   - shebang は `#!/usr/bin/env bash`
   - `set -euo pipefail`
   - macOS / Linux 両対応（`grep -oP` を避ける）
   - 失敗時は人間可読なメッセージを stderr へ
   - chmod +x してコミットすること
5. **README / Wiki Home / Getting-Started 本文は触らない**。
6. **agent 数は実行時に `ls .claude/agents/ \| wc -l` で取得**し、ハードコードしない。

### 8.3 検証手順

1. **スクリプトの正常系**:
   ```bash
   bash scripts/check-readme-wiki-sync.sh
   echo "exit=$?"  # exit=0 を期待
   ```
2. **スクリプトの異常系**:
   ```bash
   sed -i.bak 's/31 specialized agents/99 specialized agents/' README.md
   bash scripts/check-readme-wiki-sync.sh
   echo "exit=$?"  # exit=1 を期待
   mv README.md.bak README.md  # 復旧
   ```
3. **ja Wiki の Home.md に agent 数表記があるか確認**:
   ```bash
   grep -nE "31|全[ ]?[0-9]+" docs/wiki/ja/Home.md
   ```
   ja 側の表記揺れ（"全 31 エージェント" vs "all 31 agents" の直訳）を吸収する正規表現にする。`MISSING` を返す場合はスクリプトの正規表現を ja に合わせて調整。
4. **章立て対応確認**:
   ```bash
   grep -nE "^### |^## " docs/wiki/en/Contributing.md
   grep -nE "^### |^## " docs/wiki/ja/Contributing.md
   ```
   一致を確認。
5. **lint**: Contributing.md は markdown のみ。`markdownlint` 等は導入されていないため省略可。
6. **smoke**: `bash scripts/smoke-update.sh` を念のため走らせて exit 0 を確認（既存の release-time gate）。

### 8.4 コミット・PR 方針

- ブランチ: `refactor/readme-wiki-responsibility-split`（developer が main から派生）
- コミット粒度:
  - コミット 1: `docs(wiki): document README ↔ Wiki responsibility split and co-update set (#76)` — Contributing.md (en/ja) 更新
  - コミット 2: `chore(scripts): add check-readme-wiki-sync.sh consistency script (#76)` — scripts/ 追加
  - 1 コミットにまとめても可。判断は developer に委ねる。
- PR 本文に: 追加されたチェック項目の一覧、スクリプトの正常系・異常系の動作証跡、Contributing.md の before/after diff サマリーを含める。
- Issue クローズ: PR マージで `Closes #76`。
- `archive-closed-plans` workflow が `docs/design-notes/readme-wiki-responsibility-split.md` を `archived/` へ移動するため、PR body に `Closes #76` を必ず含める。

### 8.5 リスクと対処

| リスク | 対処 |
|--------|------|
| ja Wiki Home の agent 数表記が "全 31" 形式でなく英語のまま等の表記揺れ | スクリプトの正規表現を grep で実態確認しつつ調整。表記揺れを発見したら ja Home.md を最小修正で揃える（Out of scope を逸脱しない範囲） |
| Contributing.md の co-update 表が将来陳腐化（行番号などが変わる） | 表に行番号を**書かない**（§2.2 では参考に書いてあるが、§3.2.1 のサンプルではセル内容を「ファイルパスのみ」にする運用も検討） |
| スクリプトが false negative（漏らし）を出す | scripts は最小実装。漏れが見つかった場合は別 issue で改善。本 issue のゴールは「主要 2 項目だけでも自動化する」 |
| CI 化を期待されるが本 issue では実装しない | PR 本文と Out of scope に明記し、follow-up issue を別途切る旨を書く |
| README ↔ Wiki sync 慣行を「強制」と読まれて摩擦になる | Contributing.md 文言は "reviewers will block the PR" の強さを保ちつつ、minor-fix exception (typo / broken link only) を併記する |

---

> **Note**: 本設計ノートは untracked のまま留めて構わない（ユーザー要請）。実装フェーズで developer が `git add docs/design-notes/readme-wiki-responsibility-split.md` を行う。
