# docs(readme): improve readability by deferring deep content to wiki

> Reference: current `main` (HEAD `a3c6494`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#53](https://github.com/kirin0198/aphelion-agents/issues/53)
> Implemented in: TBD

---

## 1. Background & Motivation

### 1.1 元 issue の主旨

> READMEの可読性を向上させたい。アーキテクトなどWikiへのリンクで済む記載は基本的にWiki参照として、特徴や初期セットアップなどの記載とすることで、可読性が上がりそう。

### 1.2 補足コンテキスト

- Aphelion は **Aphelion 自身の README を、Aphelion を試そうとする読者にとって最短経路にしたい**。現在の README は「特徴を眺めたい新規読者」と「アーキテクチャ詳細を理解したい読者」が混ざっており、前者にとって情報過多になっている。
- 既に独立した Wiki (`docs/wiki/{en,ja}/`、計 13 ページ × 2 言語 = 26 ファイル) が存在し、Architecture Domain Model / Protocols / Operational Rules / Triage System / Agents Reference (5 ページ) / Rules Reference / Contributing を保持している。すなわち「README で深く書く」必要は薄れている。
- README は現在 `README.md` 208 行 / `README.ja.md` 202 行で、目視スクロールに 3〜4 画面分を要する。特に「Architecture」「Documentation」「Features」セクションが Wiki と重複しており、読者は同じ情報を二度読まされている。
- Cloudflare Pages デプロイされた Wiki (`https://aphelion-agents.pages.dev/`) のバッジは既に README 冒頭にあるため、Wiki への到達経路は確保済み。今回はその到達経路をより明確にする。

### 1.3 ゴール

新規読者が README を 1 画面〜1.5 画面でスキャンし、(a) Aphelion が何か、(b) どうインストールするか、(c) 詳しく知るには Wiki のどこへ行けばよいか、を即座に判断できる状態にする。

---

## 2. Current state

### 2.1 README.md / README.ja.md の章構成と現状評価

| # | セクション | 現在の行数 (en) | Wiki に同等ページがあるか | 判定 |
|---|------------|------------------|---------------------------|------|
| 1 | タイトル + Wiki バッジ + 言語切替リンク | 1–9 | — | **残す** |
| 2 | What's Aphelion (mermaid 図 + 1 段落) | 11–28 | Architecture-Domain-Model に詳細あり | **残す（要約のみ）** |
| 3 | Why Aphelion (1 段落) | 32–34 | — | **残す** |
| 4 | Getting Started — Install via npx | 38–70 | Getting-Started に同等＋詳細あり | **残す（コア手順）** |
| 5 | Getting Started — Install via git clone | 72–84 | Getting-Started に同等あり | **Wiki に委ねる** |
| 6 | Getting Started — Usage Scenarios (4 シナリオ) | 86–118 | Getting-Started に同等あり | **Wiki に委ねる** |
| 7 | Getting Started — Command Reference (表) | 120–131 | Getting-Started / aphelion-help に同等あり | **Wiki に委ねる** |
| 8 | Architecture — Three-Domain Model (列挙) | 134–146 | Architecture-Domain-Model に詳細あり | **Wiki に委ねる** |
| 9 | Architecture — Triage System (表) | 148–159 | Triage-System に詳細あり | **Wiki に委ねる** |
| 10 | Architecture — File Structure | 161–172 | Architecture-Operational-Rules / Contributing に同等 | **Wiki に委ねる** |
| 11 | Documentation (Wiki への目次表) | 176–188 | Wiki Home がそのもの | **大幅圧縮（Home へ 1 リンク中心）** |
| 12 | Features (10 項目) | 192–202 | Architecture-Domain-Model / Triage / Rules に分散 | **3〜5 項目に圧縮** |
| 13 | License | 206–208 | — | **残す** |

### 2.2 重複と冗長の所在

- **Architecture セクション**: README に 3 サブセクション (Three-Domain Model / Triage System / File Structure) が存在し、いずれも Wiki により詳しいページが既にある。新規読者にとってはノイズ。
- **Documentation セクション**: README の表 (5 行) と Wiki Home の表 (Core Pages) がほぼ重複。両方をメンテすると同期コストが二重に発生する（実際 Wiki Home は最近更新されたが README の表は 27 / 29 agents 表記がブレる等の差分が出やすい）。
- **Features (10 項目)**: 半分以上が Wiki の Triage / Rules / Architecture を読めば理解できる事項であり、README に 10 個並べる意義は薄い。
- **Usage Scenarios**: 4 シナリオの並列列挙は新規読者に「全部読まないといけない感」を与えがち。Wiki Getting-Started 側に「ペルソナ別エントリーポイント」が既にあるためそちらに委ねる方が読者にとって誘導が明確。

### 2.3 残すべき要素（README の存在意義）

- **What is Aphelion** (1 段落 + mermaid)
- **Why Aphelion** (1 段落)
- **Quick install** (`npx ... init` のコマンドだけ)
- **次の一歩** (Wiki Getting Started へのリンク)
- **Wiki への目次** (1 リンクの誘導文 or 5 行以下の超圧縮表)
- **License**

### 2.4 README ja / en 並行関係

- 現状、README.ja.md と README.md は構成も行数もほぼ 1:1 対応している。Wiki も `en/` `ja/` 並行構成。今回の改修も **両方を同期して更新する** 方針が必須。
- `docs/wiki/{en,ja}/Contributing.md` には bilingual sync policy の規定がある（PR チェックリスト含む）。今回の改修もそれに従う。

---

## 3. Proposed approach

### 3.1 設計方針

1. **README は「ランディングページ」に徹する**。読者が 1 画面〜1.5 画面で「これは何か / 入れ方 / 次どこへ行くか」を判断できることを唯一の目的とする。
2. **深い内容は Wiki に物理的に存在する場合のみ削除**する（Wiki 側の不在を新規執筆で埋めにいかない。Out of scope）。
3. **Wiki への動線は 2 段構成**にする:
   - 冒頭バッジ（既存）
   - 末尾の「Learn more」セクションで Wiki Home に 1 リンク（+ 必要なら Getting Started への直リンク）
4. **英日同期**: README.md と README.ja.md を同じ章立てで更新する。

### 3.2 README の章立て案 (after)

```
1. Title + Wiki badge + language switch link        (8 lines)
2. What's Aphelion (1 paragraph + mermaid)          (~18 lines)
3. Why Aphelion (1 paragraph)                       (~3 lines)
4. Quick Start                                      (~15 lines)
   - `npx ... init` のみ（cache caveat / git clone は Wiki に委譲）
   - "Next: see Getting Started on the Wiki" リンク
5. Features (3〜5 項目に圧縮)                       (~7 lines)
6. Learn more                                        (~10 lines)
   - Wiki Home へのリンク + 主要 4 ページへのショートカット
7. License                                           (~3 lines)
```

**目標行数**: README.md / README.ja.md それぞれ **80〜100 行以内**（現状の 208 / 202 行から半分以下）。

### 3.3 章立て before / after 対比

| 現在のセクション | After の扱い |
|------------------|-------------|
| Title + badges | **残す**（変更なし） |
| What's Aphelion (mermaid) | **残す**（mermaid と直後 1 段落のみ） |
| Why Aphelion | **残す**（1 段落のまま） |
| Getting Started → Install via npx | **残す（圧縮）** — 4 コマンド + バージョン確認 1 文のみ。Cache caveat は Wiki に委譲しリンクで触れる |
| Getting Started → Install via git clone | **削除** → Wiki Getting Started へ |
| Getting Started → Usage Scenarios (4 シナリオ) | **削除** → Wiki Getting Started へ |
| Getting Started → Command Reference 表 | **削除** → Wiki Getting Started + `/aphelion-help` 案内へ |
| Architecture → Three-Domain Model | **削除** → Wiki Architecture-Domain-Model へ |
| Architecture → Triage System 表 | **削除** → Wiki Triage-System へ |
| Architecture → File Structure | **削除** → Wiki Contributing / Operational-Rules へ |
| Documentation 表 (Wiki 目次) | **大幅圧縮** → 「Learn more」セクションに統合し、Wiki Home + 主要ページ 3〜4 個に絞る |
| Features (10 項目) | **圧縮**: 上位 4〜5 項目（3-domain / Triage / Approval gates / Security mandatory / Document-driven）のみ |
| License | **残す** |

### 3.4 「Learn more」セクション（新設）案

```markdown
## Learn more

- **[Wiki Home](docs/wiki/en/Home.md)** ([日本語](docs/wiki/ja/Home.md)) — full reference, persona-based entry points
- [Getting Started](docs/wiki/en/Getting-Started.md) — first-run walkthrough, scenarios, troubleshooting
- [Architecture: Domain Model](docs/wiki/en/Architecture-Domain-Model.md) — 3-domain model & handoff files
- [Triage System](docs/wiki/en/Triage-System.md) — plan tiers & agent selection
- [Agents Reference](docs/wiki/en/Agents-Orchestrators.md) — all 29 agents
```

JA 版は同じ構造で `docs/wiki/ja/...` を指す。

### 3.5 Quick Start セクション（新設）案

```markdown
## Quick Start

```bash
npx github:kirin0198/aphelion-agents init
cd /path/to/your-project && claude
/aphelion-init
```

For `--user` install, cache troubleshooting, git-clone alternative, and full
usage scenarios, see [Getting Started on the Wiki](docs/wiki/en/Getting-Started.md).
```

### 3.6 Features セクション圧縮案

10 項目 → 5 項目程度に絞る。残す候補:

- **3-domain separation** — Discovery / Delivery / Operations を独立セッションで動かしコンテキスト圧迫を防止
- **Triage adaptation** — Minimal〜Full を自動選択
- **Approval gates** — 各フェーズでユーザー承認を必須化
- **Security mandatory** — `security-auditor` が全プランで実行
- **Document-driven handoff** — 領域間は `.md` ファイルで連携、トレーサビリティ確保

「自動差し戻し / セッション再開 / Claude Code ネイティブ / 多言語対応 / コンテナ隔離」は Wiki の Architecture / Operational-Rules で説明されているため Features 列挙からは外す（Learn more の誘導でカバー）。

---

## 4. Open questions

実装前に確認しておきたい事項。**developer フェーズで判断 or 別途ユーザー確認が必要**:

1. **Features セクションを残すか完全削除するか**
   - 残す: GitHub repo ホームでの「ぱっと見の魅力訴求」になる。
   - 削除: README をさらに圧縮できる。
   - 推奨: 5 項目程度に圧縮して残す（§3.6 案）。最終判断は developer に委ねる or PR レビュー時に確認。

2. **mermaid 図を残すか**
   - 残す: 視覚的に 3-domain モデルが伝わる。GitHub は mermaid をレンダリングする。
   - 削除: 行数削減（mermaid ブロックは約 13 行）。
   - 推奨: 残す（mermaid は README の "What's Aphelion" の核であり、新規読者の理解コストを大きく下げる）。

3. **Wiki と README のメンテ責任分担**
   - Wiki が canonical source、README は Wiki への入口、という前提を明記すべきか？
   - 推奨: README 末尾の「Learn more」セクションで暗黙的に示す。明文化が必要なら Wiki Contributing 側で扱う（README には書かない）。

4. **英日両 README の並行更新ポリシー**
   - 既に bilingual sync policy が `docs/wiki/{en,ja}/Contributing.md` にあるが、README.md / README.ja.md にも同じポリシーが適用される旨を明記すべきか？
   - 推奨: 改修自体には不要。両ファイルを同 PR 内で同期して更新するという運用を developer に明示する（§8 で指示）。

5. **Cloudflare Pages の Wiki URL を README 末尾の「Learn more」でも明示するか**
   - 冒頭バッジで既にリンクされているが、`docs/wiki/en/Home.md` (リポジトリ内パス) と `https://aphelion-agents.pages.dev/` (公開 URL) のどちらをメインに据えるか。
   - 推奨: 「Learn more」セクションは リポジトリ内 `docs/wiki/...` 相対パスを使う（GitHub 上で読む読者にとって自然）。バッジは公開 Wiki URL のまま維持。

6. **Command Reference 表を完全に削除するか**
   - 削除: README が大幅に短くなる。
   - `/aphelion-help` で代替案内: 既にコマンドが存在するため一行紹介のみで十分。
   - 推奨: 完全削除し、Quick Start 末尾で `/aphelion-help` を案内する 1 行に置換。

---

## 5. Document changes

### 5.1 README.md (英語)

- §1 (Title + badges + language switch): 変更なし
- §2 (What's Aphelion): 既存の mermaid + 1 段落を維持。直後の "non-`service` types skip Operations" の脚注は残す。
- §3 (Why Aphelion): 変更なし
- §4 (Getting Started): **大幅縮小** → §4 (Quick Start) に置換。npx 1 コマンド + `/aphelion-init` のみ。`--user` / cache caveat / git clone / Usage Scenarios / Command Reference 表は **すべて削除**し Wiki Getting-Started へリンク。
- §5 (Architecture セクション全体): **削除**
- §6 (Documentation 表): **削除**（後述「Learn more」に統合）
- §7 (Features): **5 項目に圧縮**（§3.6 案）
- §8 (Learn more): **新設**（§3.4 案）
- §9 (License): 変更なし

### 5.2 README.ja.md (日本語)

英語と同じ章立てで同期更新。各文面は ja の自然な日本語にする（英語の直訳ではなく、現行 README.ja.md と同じトーン）。

### 5.3 docs/wiki/ 側の変更

- **基本的に新規執筆は行わない**（Out of scope）。
- **ただし軽微な確認・補強**のみ実施:
  - `docs/wiki/en/Getting-Started.md` / `docs/wiki/ja/Getting-Started.md` に「git clone alternative」「cache caveat」「Usage Scenarios」「Command Reference」が既に記載されているか確認し、不足分があれば**最小限**追記する。
  - 既に記載されている場合は変更不要。
  - 大幅な新規執筆が必要と判明した場合は、developer がその旨を blocked で報告し、別 issue を切る。

### 5.4 ファイル一覧

| ファイル | 変更種別 | 概要 |
|----------|----------|------|
| `README.md` | 修正 | §3.2 の章立てへ書き換え（208 → 80〜100 行） |
| `README.ja.md` | 修正 | 英語版と同期 |
| `docs/wiki/en/Getting-Started.md` | 確認 / 軽微補強 | git clone / cache caveat / scenarios / command 表が揃っているか確認 |
| `docs/wiki/ja/Getting-Started.md` | 確認 / 軽微補強 | 同上 |

---

## 6. Acceptance criteria

PR レビュー時に以下を機械的に確認できるようにする:

1. **README.md の行数が 100 行以下** （目標: 80〜100 行。現状 208 行）
2. **README.ja.md の行数が 100 行以下** （目標: 80〜100 行。現状 202 行）
3. **README.md および README.ja.md に以下のリンクが存在する**:
   - Wiki Home (`docs/wiki/en/Home.md` / `docs/wiki/ja/Home.md`)
   - Getting Started (`docs/wiki/en/Getting-Started.md` / `docs/wiki/ja/Getting-Started.md`)
4. **README から削除した項目が Wiki 側に存在することを確認済み**:
   - git clone alternative → `docs/wiki/{en,ja}/Getting-Started.md`
   - npx cache caveat → `docs/wiki/{en,ja}/Getting-Started.md`
   - Usage Scenarios (4 シナリオ) → `docs/wiki/{en,ja}/Getting-Started.md`
   - Command Reference 表 → `docs/wiki/{en,ja}/Getting-Started.md` または `/aphelion-help` 出力
   - Three-Domain Model 詳細 → `docs/wiki/{en,ja}/Architecture-Domain-Model.md`
   - Triage System 表 → `docs/wiki/{en,ja}/Triage-System.md`
   - File Structure → `docs/wiki/{en,ja}/Architecture-Operational-Rules.md` または `Contributing.md`
5. **mermaid 図がレンダリング可能な状態で残っている**（GitHub での表示確認）
6. **Wiki バッジが冒頭に維持されている**
7. **Features セクションは 3〜5 項目**（10 項目から圧縮）
8. **README.md と README.ja.md の章立てが 1:1 対応している**（章数・順序が一致）
9. **既存の壊れたリンクが発生していない**（`grep -r "docs/wiki" README*.md` で全リンクの存在確認）

---

## 7. Out of scope

以下は本 issue の範囲外（必要なら別 issue を切る）:

- **Wiki コンテンツの大幅な新規執筆** — 既存 Wiki にない情報を新規に書き起こすことは行わない。最小限の確認・補強に留める。
- **Wiki 側の構成変更（ページ分割・統合）** — Architecture / Agents Reference の現行ページ分割は維持する。
- **README の英語表現・トーンの全面リライト** — 既存の自然な表現を尊重し、削除と再配置を主作業とする。
- **README に新セクションを追加する（FAQ, Changelog, Roadmap 等）** — 今回は「圧縮」が目的であり、追加はしない。
- **Wiki の Cloudflare Pages デプロイ設定の変更**
- **CONTRIBUTING.md / SECURITY.md / LICENSE 等のリポジトリメタファイルの変更**
- **README.md 以外の `*.md` の章立て変更**（INTERVIEW_RESULT 等）
- **bilingual sync 自動化（CI 等）の導入**

---

## 8. Handoff brief for developer

### 8.1 対象ファイル

- `README.md` (en) — 修正
- `README.ja.md` (ja) — 修正
- `docs/wiki/en/Getting-Started.md` — 確認のみ。不足があれば最小補強
- `docs/wiki/ja/Getting-Started.md` — 確認のみ。不足があれば最小補強

### 8.2 編集方針

1. **§3.2 の章立て案** に従って README.md を書き換える。
2. **README.ja.md は en と同じ章立て・章数・章順序**で同期更新する。文面は既存の README.ja.md のトーンを踏襲（敬体・カタカナ用語の整え方は既存に合わせる）。
3. **削除する内容は事前に Wiki Getting-Started に存在することを確認**してから削除する。`grep` で対応する記述があるか確認:
   ```bash
   grep -n "git clone" docs/wiki/en/Getting-Started.md docs/wiki/ja/Getting-Started.md
   grep -n "cache" docs/wiki/en/Getting-Started.md docs/wiki/ja/Getting-Started.md
   grep -n "Usage Scenarios\|利用シナリオ" docs/wiki/en/Getting-Started.md docs/wiki/ja/Getting-Started.md
   grep -n "Command Reference\|コマンド一覧" docs/wiki/en/Getting-Started.md docs/wiki/ja/Getting-Started.md
   ```
   不足が見つかれば、Wiki Getting-Started に最小限の追記を行う（Out of scope を逸脱しない範囲で）。
4. **mermaid 図はそのまま維持**する（編集しない）。
5. **Wiki バッジ + 言語切替リンクはそのまま維持**する。
6. **Features セクションは §3.6 の 5 項目案を採用**。文面は既存 README から流用可。

### 8.3 検証手順

1. **行数確認**:
   ```bash
   wc -l README.md README.ja.md
   ```
   両方 100 行以下であること（目標 80〜100 行）。
2. **リンク存在確認**:
   ```bash
   grep -E "docs/wiki/(en|ja)/" README.md README.ja.md
   ```
   Home / Getting-Started / Architecture-Domain-Model / Triage-System / Agents-Orchestrators が含まれること。
3. **章立て対応確認**: README.md と README.ja.md の `^## ` で始まる見出しを抜き出し、数と順序が一致することを確認。
   ```bash
   grep -n "^## " README.md
   grep -n "^## " README.ja.md
   ```
4. **削除項目の Wiki 存在確認**: §6 acceptance criteria #4 の項目それぞれについて Wiki に存在することを `grep` で確認。
5. **mermaid レンダリング確認**: GitHub PR プレビュー上で What's Aphelion セクションの mermaid 図がレンダリングされていること。
6. **lint / format**: 本リポジトリは Markdown 専用変更のため lint なし。textlint 等は使われていないことを `package.json` で確認済みなら省略可。

### 8.4 コミット・PR 方針

- ブランチ: `docs/readme-readability-wiki-links` (developer が main から派生)
- コミット粒度: 「README.md + README.ja.md + Wiki 軽微補強」を 1 コミットに含める（同一 issue の同期更新のため）。
- コミットメッセージ prefix: `docs:`
- PR 本文に: 行数 before/after、章立て before/after、削除項目と Wiki 内対応箇所のマッピング表を含める。
- Issue クローズ: PR マージで `Closes #53`。

### 8.5 リスクと対処

| リスク | 対処 |
|--------|------|
| Wiki Getting-Started に既存読者向けシナリオが不足している | developer が確認し、不足分のみ最小補強。大規模新規執筆が必要なら blocked で別 issue 化 |
| GitHub repo ホームで「特徴が伝わらない」と懸念が出る | Features 5 項目 + Why Aphelion + mermaid で十分訴求可能と判断。レビューで指摘があれば再調整 |
| README 短縮で SEO や initial impression が損なわれる | バッジ + Quick Start + Features は維持されるため、初期印象は損なわれない |
| 英日同期ずれ | §8.3 #3 の章立て対応確認スクリプトで機械的にチェック |
