> Last updated: 2026-05-05
> GitHub Issue: [#117](https://github.com/kirin0198/aphelion-agents/issues/117)
> Analyzed by: analyst (2026-05-05)
> Next: architect

# Aphelion 生成ドキュメントの配置先を docs/ 配下にデフォルト化

## §1 Background / motivation

Aphelion ワークフローでは analyst / architect / developer / doc-reviewer / handover-author
など複数のエージェントが、リポジトリ直下に対して以下のような Markdown ドキュメントを
新規生成・更新する設計になっている。

- `SPEC.md`
- `ARCHITECTURE.md`
- `UI_SPEC.md`
- `DISCOVERY_RESULT.md`
- `HANDOVER.md` 系
- (一部の) ADR / メモ系の追加 .md

これらは **Aphelion 採用プロジェクトのリポジトリ直下** に直接コミットされる前提になっており、
現状以下の問題を生む。

1. **直下に Aphelion 由来の .md が積み重なる** — README.md / LICENSE / CHANGELOG.md など
   一般的にリポ直下に置かれる .md と Aphelion ワークフロー由来の .md が混在する。新規参加者は
   どれが Aphelion の生成物でどれが汎用ドキュメントか一目で見分けにくい。
2. **「ドキュメントは docs/ 配下にまとめたい」というユーザー要望と衝突する** — 既存プロジェクトに
   Aphelion を後付け導入したい場合、`docs/` 配下に集約しているチームでは Aphelion だけが
   ルート直下に書き出してくる挙動が摩擦になる。
3. **dogfooding している aphelion-agents 自身も歪みを抱えている** — 当リポジトリは
   `docs/design-notes/` `docs/wiki/` のように docs/ 配下を活用しているが、もし Aphelion を
   通常運用したら `SPEC.md` `ARCHITECTURE.md` 等が直下に出てくる構造になり、自リポジトリの
   レイアウト方針と矛盾する。

このため「Aphelion が生成するドキュメントの **デフォルト配置先を docs/ 配下に変更する**」
ことを提案する。

## §2 現状

### 2.1 各エージェントの出力先 (現状)

| エージェント / コマンド | 主な出力 | 現在の配置先 |
| --- | --- | --- |
| analyst | `docs/design-notes/<slug>.md`, GitHub Issue | docs/design-notes/ (済) |
| architect | `ARCHITECTURE.md` (新規 / 更新) | リポジトリ直下 |
| developer | `SPEC.md` 更新, ADR 追記 | リポジトリ直下 |
| ui-designer (オプション) | `UI_SPEC.md` | リポジトリ直下 |
| discovery agent | `DISCOVERY_RESULT.md` | リポジトリ直下 |
| handover-author | `HANDOVER.md` (en/ja) | リポジトリ直下 (またはユーザ指定) |
| doc-reviewer | (上記の整合性チェックのみ; 新規ファイルは作らない) | — |

→ `docs/design-notes/` だけが docs/ 配下に揃っており、それ以外は **リポジトリ直下** に出る。

### 2.2 関連参照

エージェント定義 (`.claude/agents/*.md`) の冒頭〜中盤で、出力先パスがハードコードされている
箇所が多数ある。例:

- `.claude/agents/architect.md` → `ARCHITECTURE.md` を read/write
- `.claude/agents/developer.md` → `SPEC.md` の Acceptance Criteria を read/edit
- `.claude/agents/handover-author.md` → `HANDOVER.md` を新規作成
- `.claude/agents/doc-reviewer.md` → SPEC / ARCHITECTURE / UI_SPEC / design-notes を read

また `.claude/templates/doc-flow/` 配下のテンプレートも、参照先パスとして
リポジトリ直下を前提にしている。

## §3 提案

### 3.1 推奨案: docs/ 配下にまとめて移動 (デフォルト変更)

Aphelion が新規生成する以下のドキュメントの **デフォルト配置先** を `docs/` 配下に変更する:

| ドキュメント | 旧 | 新 (推奨) |
| --- | --- | --- |
| SPEC.md | `./SPEC.md` | `docs/SPEC.md` |
| ARCHITECTURE.md | `./ARCHITECTURE.md` | `docs/ARCHITECTURE.md` |
| UI_SPEC.md | `./UI_SPEC.md` | `docs/UI_SPEC.md` |
| DISCOVERY_RESULT.md | `./DISCOVERY_RESULT.md` | `docs/DISCOVERY_RESULT.md` |
| HANDOVER.md (en/ja) | `./HANDOVER.{en,ja}.md` | `docs/HANDOVER.{en,ja}.md` |
| design-notes | `docs/design-notes/` | `docs/design-notes/` (現状維持) |

→ 新規プロジェクトに `aphelion-agents init` で導入した場合、Aphelion 由来の .md は
**全て docs/ 配下にまとまる** ことになる。リポ直下は README/LICENSE/CHANGELOG 等の
汎用ファイルだけが残り、見通しが良くなる。

### 3.2 設計上のポイント

1. **エージェント定義の参照パスを書き換える** — `.claude/agents/architect.md`
   `developer.md` `handover-author.md` `doc-reviewer.md` などで `SPEC.md` / `ARCHITECTURE.md`
   等にハードコードされている箇所を、`docs/SPEC.md` 等に置き換える。
2. **テンプレートも追従する** — `.claude/templates/doc-flow/handover.{en,ja}.md` 内で
   ファイルパスを表示している箇所、相互参照リンクなど。
3. **doc-reviewer の整合性チェック対象も同期** — sync 対象ファイル一覧が `SPEC.md` /
   `ARCHITECTURE.md` 直下を前提にしているため、`docs/` 配下に変更する。
4. **「リポ直下に既に SPEC.md 等がある既存プロジェクト」への配慮** — 既に直下に
   `SPEC.md` 等を運用しているリポジトリでは、強制的に docs/ 配下に移すと壊れる。
   後方互換戦略 (§6) を必ず用意する。

## §4 選択肢の比較

| 案 | 概要 | Pros | Cons |
| --- | --- | --- | --- |
| **A. docs/ 配下に強制統一 (破壊的)** | 全プロジェクトで `docs/SPEC.md` 等に決め打ち | 実装シンプル / 一貫性最大 | 既存プロジェクトを破壊する / 後方互換 0 |
| **B. docs/ 配下デフォルト + 直下フォールバック (推奨)** | 新規は docs/ 配下、既存ファイルがあれば直下を尊重 | 既存も新規も壊れない / 移行が緩やか | エージェント側で「どちらを使うか」検出ロジックが必要 |
| **C. 設定ファイルでカスタマイズ可能にする** | `.claude/aphelion.config.json` のような設定で出力先を指定 | 柔軟 / カスタムディレクトリも対応 | 設計負荷大 / MVP で過剰スコープ |
| **D. 現状維持 (リポ直下)** | 何もしない | 移行コスト 0 | ユーザー摩擦が解消されない |

→ **推奨は B (docs/ 配下デフォルト + 既存ファイルフォールバック)**。
   C は将来的な拡張余地として残し、MVP では B を採る。

## §5 影響範囲

### 5.1 修正が必要なファイル (見込み)

- `.claude/agents/architect.md` — ARCHITECTURE.md の参照パス
- `.claude/agents/developer.md` — SPEC.md の参照パス
- `.claude/agents/handover-author.md` — HANDOVER.md の出力先
- `.claude/agents/doc-reviewer.md` — sync チェック対象パス
- `.claude/agents/analyst.md` — SPEC.md / UI_SPEC.md 更新時の参照パス
- `.claude/agents/discovery.md` (もし存在すれば) — DISCOVERY_RESULT.md
- `.claude/agents/ui-designer.md` (もし存在すれば) — UI_SPEC.md
- `.claude/templates/doc-flow/handover.en.md` / `handover.ja.md` — リンク先パス
- `scripts/check-readme-wiki-sync.sh` (該当があれば) — 参照パス
- `docs/wiki/` 配下の関連ドキュメント — Contributing.md / Architecture.md など、
  「SPEC.md がリポ直下」と書かれている箇所

### 5.2 ユーザー影響

- **新規ユーザー (新規プロジェクトで `aphelion-agents init`)** — 影響なし。
  最初から docs/ 配下に出るだけ。
- **既存ユーザー (既に直下に SPEC.md 等がある)** — 後方互換戦略により影響なし
  (既存ファイルがあればそちらを使う)。
- **dogfooding している aphelion-agents リポ自身** — ARCHITECTURE.md 等を
  実際に運用していれば `docs/` 配下に移動する必要がある。実態として
  `aphelion-agents` リポは Aphelion ワークフローのフルセットを自分自身に
  適用していないため、この点はリスク低。

## §6 後方互換戦略

各エージェントが「SPEC.md / ARCHITECTURE.md 等を読む」段階で、以下の優先順位で
解決する:

1. `docs/<NAME>.md` が存在すればそれを使う (新規デフォルト)
2. 上が無く、`./<NAME>.md` (リポ直下) が存在すればそれを使う (既存リポ互換)
3. どちらも無く、新規作成する場合は **デフォルトの `docs/<NAME>.md` を作る**

→ 既存プロジェクトは黙って動き続け、新規プロジェクトは docs/ 配下に揃う。

ドキュメント (Contributing.md など) には、新規・既存どちらの配置でも有効である旨を
明記する。

## §7 Acceptance Criteria

- [ ] 新規プロジェクトで Aphelion ワークフローを最初から走らせると、生成される
      SPEC.md / ARCHITECTURE.md / UI_SPEC.md / DISCOVERY_RESULT.md / HANDOVER.md は
      **`docs/` 配下** に作成される。
- [ ] 既に直下に `SPEC.md` `ARCHITECTURE.md` 等を持つリポジトリでは、エージェントは
      直下のファイルを読み続け、勝手に docs/ 配下にコピーや移動を行わない。
- [ ] `.claude/agents/*.md` のうち、ファイルパスをハードコードしている箇所が
      新ルール (docs/ 配下優先 + 直下フォールバック) に更新されている。
- [ ] `doc-reviewer` の整合性チェックは、新旧どちらの配置でも誤検知 / 取りこぼしを起こさない。
- [ ] CHANGELOG / wiki に「Aphelion が生成する .md のデフォルト配置先が
      docs/ 配下に変わった」旨と、移行不要であることが明記される。
- [ ] dogfooding 観点で、aphelion-agents リポ自身に SPEC.md 等を新規作成する場合は
      docs/ 配下に置かれる。

## §8 Handoff brief for architect

- 主担当: architect (パス解決ロジックの設計と各エージェントへの反映)
- 設計ポイント:
  1. 「docs/ 配下優先 + 直下フォールバック + 新規は docs/」というファイル解決アルゴリズムを
     明文化する (ARCHITECTURE.md or .claude/rules/ に新規ルール)。
  2. 各エージェントの該当箇所をどう書き換えるか、命令文レベルで具体化する
     (例: `Read("docs/SPEC.md") || Read("./SPEC.md") || (none)`)。
  3. 既存テンプレート (handover.{en,ja}.md) のリンク先表現を、相対パスのままにするか
     `docs/...` に書き換えるか決める。
  4. wiki ページ (Contributing.md, Architecture.md など) の更新範囲を発見して
     列挙する (本 doc の §5 は概算なので architect で再走査する)。
- 残課題 / 開放質問:
  - `.aphelionrc` のような設定ファイルで配置先をカスタマイズ可能にするか?
    (本 doc では MVP 範囲外として保留。Future work)
  - dogfooding として aphelion-agents リポ自身に SPEC.md / ARCHITECTURE.md を
    新設するかは別 issue。今回はあくまで「生成ロジックを変える」までが範囲。
