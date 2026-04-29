# docs: repo-root README sync convention (follow-up to #75)

> Reference: current `main` (HEAD post-#83, 2026-04-29)
> Created: 2026-04-29
> Last updated: 2026-04-29
> GitHub Issue: [#82](https://github.com/kirin0198/aphelion-agents/issues/82)
> Analyzed by: analyst (2026-04-29)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> Next: developer (実装フェーズで本ノートに従って `language-rules.md` および新ドキュメントを編集する)

> **Language policy note** — 本ノートは #75 の「Hand-authored canonical narrative」
> 規定（`docs/design-notes/<slug>.md` は単一言語、Output Language に追従、現状 `ja`）
> に従う。skeleton 見出し（`## 1. Problem statement` など）は英語固定で残し、
> 本文は日本語で記述する。

---

## 1. Problem statement

#75 が `src/.claude/rules/language-rules.md` の "Hand-authored canonical narrative"
セクションに次の節を導入した（L66–68 を引用）:

```
- **`README.md` / `README.ja.md`** — bilingual at the repository root with
  English canonical, governed by the repo-root README sync convention (not
  by Contributing.md's wiki bilingual policy).
```

この節は **「repo-root README sync convention」** という外部参照を導入したが、
**該当する規約文書はリポジトリ内のどこにも存在しない**。
`grep -rn "repo-root README sync"` を実行しても、`language-rules.md` 自身と
`docs/wiki/{en,ja}/Contributing.md`（#75 で追記された "README en ↔ ja parity"
ポインタ）以外にヒットしない（後者も同じ未存在の文書を指している）。

結果として、「README の同期はどう運用するのか」という具体的なルール — 同一 PR 必須
か follow-up を許すか、heading parity を強制するか、`> EN canonical:` 日付を
README.ja.md にも導入するか — が**全く未定義**で、PR レビュー時に判断材料がない。

#76 の design note (`docs/design-notes/archived/readme-wiki-responsibility-split.md`)
§7 Q5 が本ギャップを surface し、#76 のスコープからは外して #82 で扱うことが
合意された（PR #83 body 内 "Decisions taken / Q5 → follow-up issue **#82**"）。

本 issue (#82) は、その規約文書を**新規に著述**するための design note を作る
フェーズである。`language-rules.md` の編集は本 design note のスコープ外であり、
実装 PR に委ねる。

---

## 2. Current state

### 2.1 dangling pointer の位置

| ファイル | 行 | 内容 |
|----------|----|------|
| `src/.claude/rules/language-rules.md` | L66–68 | "...governed by the repo-root README sync convention (not by Contributing.md's wiki bilingual policy)." |
| `docs/wiki/en/Contributing.md` | L172–176 | "...governed by [`language-rules.md` → 'Hand-authored canonical narrative'](...) and the repo-root README sync convention — **not** by this Wiki Bilingual Sync Policy. See `language-rules.md` for the authoritative rule. (#75)" |
| `docs/wiki/ja/Contributing.md` | L168–171 | 同上の日本語版（"...と repo-root README sync convention によって管理されており、**この Wiki バイリンガル同期ポリシーではありません**。権威あるルールは `language-rules.md` を参照してください。(#75)"） |

3 か所がいずれも「repo-root README sync convention」という存在しない文書を
権威ソースとして参照している。

### 2.2 既存の README 同期に関するルール断片

`grep -rn "README" src/.claude/rules/ docs/wiki/en/Contributing.md docs/wiki/ja/Contributing.md` および
`scripts/check-readme-wiki-sync.sh` の検査内容から、以下の断片的ルールが**実態としては既に存在している**ことが分かる:

| 場所 | 規定内容 | 強制力 |
|------|---------|--------|
| `language-rules.md` L66–68 | README は bilingual / English canonical | 宣言のみ（運用ルールなし） |
| `wiki/en/Contributing.md` L156–168 (Co-update set 表) | agent count・Quick Start・3-domain mermaid・Features 5 項目は README と Wiki 間で同時更新必須 | PR Checklist L218–223（同 PR で `bash scripts/check-readme-wiki-sync.sh`）+ Check 1 (agent count) で機械検査 |
| `wiki/en/Contributing.md` L141–144（Boundary rule "may stay in README"） | README に置いてよい項目を 5 種に限定 | レビュー時の運用判断（自動検査なし） |
| `scripts/check-readme-wiki-sync.sh` L70–91 (Check 3) | README.md と README.ja.md の `^## ` heading 数および出現行位置が一致すること | 機械検査（PR Checklist 経由で必須） |

つまり**「機械検査としては Check 3 で heading parity がすでに enforced されている」**が、
**「文書化された README 同期規約としては『language-rules.md にポインタだけある』状態」**
である。

### 2.3 README.md / README.ja.md の現行構造

heading inventory（`grep -n "^## "`）:

| 行 | README.md | README.ja.md |
|----|-----------|--------------|
| 11 | `## What's Aphelion` | `## What's Aphelion` |
| 32 | `## Why Aphelion` | `## Why Aphelion` |
| 38 | `## Quick Start` | `## クイックスタート` |
| 53 | `## Features` | `## Features` |
| 63 | `## Learn more` | `## 詳しく知るには` |
| 73 | `## License` | `## License` |

`scripts/check-readme-wiki-sync.sh` を HEAD で実行すると `exit 0`（heading 数 6 と
6、行位置も `11,32,38,53,63,73,` で完全一致）。
**heading 数・出現位置は完全 lockstep**、ただし heading 文字列自体は en 側が英語、
ja 側が一部和訳（"クイックスタート"、"詳しく知るには"）。これは
`language-rules.md` "Hand-authored canonical narrative" の skeleton 規定とは
**整合性が緩い**点に注意 — wiki 側では skeleton を English-fixed と明記しているが、
README については未定義のため、現状の混在（`## What's Aphelion` 英・
`## クイックスタート` 和）が違反かどうかも未判定である（§5.3 で扱う）。

### 2.4 README.ja.md のヘッダ構造 — `> EN canonical:` 行は存在しない

現行 `README.ja.md` (L1–L9) の冒頭:

```
1: # Aphelion — Frontier AI Agents
2:
3: Claude Code 向け AI コーディングエージェント定義集です。31 の専門エージェントが…
4:
5: [![Wiki](...)](...)
6:
7: **[English README](README.md)**
8:
9: ---
```

対比として、wiki/ja の各ページは L5 付近に `> **EN canonical**: {date} of wiki/en/{slug}.md` を持つ。
README.ja.md には**そのような行は無い** — 言語スイッチャ（L7）のみがリンクとして存在する。

したがって、§3.4「README.ja.md に `> EN canonical:` を導入するか」は
*既存の運用を文書化する* タスクではなく、*新しいヘッダ行を追加する behavior change* である。
本 design note の §5 で正直にそう扱う。

### 2.5 Contributing.md に "Repository-root README sync" 節が存在するか — 確認済み: 存在しない

`grep -nE "Repository-root README|repo-root README sync" docs/wiki/en/Contributing.md` の
結果は L174 のリンクテキスト 1 件のみ（§2.1 で既に列挙）。本文中に節は存在しない。
これは #76 の決定どおり（README sync 規約は Contributing.md には含めない）。

---

## 3. Constraints

- **`docs/design-notes/archived/*.md` は read-only**（`wiki/en/Contributing.md`
  L302–306 / `ja` L253）。本 issue の解決として archived な #75 / #76 の design note
  を改訂することはできない。
- **#75 の宣言は確定済み**: `language-rules.md` L66–68 で「English canonical」
  「Contributing.md ではなく repo-root README sync convention で管理」が既に
  決まっている。本 design note はこれを覆さず、このパラメータを所与として詳細を
  詰める。
- **本 analysis pass では rule ファイルを編集しない**。ユーザ指示（"Do NOT modify
  `language-rules.md` in this analysis pass"）に従い、`language-rules.md`・
  `Contributing.md` などへの編集は実装 PR に委ねる。
- **Version bumping policy**（`Contributing.md` L226–238）: 本 design note の
  実装フェーズでは `src/.claude/rules/language-rules.md` を編集するため、
  実装 PR で `package.json` `version` の patch bump および `CHANGELOG.md`
  `[Unreleased]` への追記が必須となる。
- **Output language**: 本 design note は ja。skeleton は English-fixed。
- **Issue ラベル**: `#82` には `documentation, refactor` ラベル既設。変更しない。

---

## 4. Goals & success criteria

1. リポジトリ内に**唯一の権威ある「repo-root README sync convention」文書**が
   存在し、`language-rules.md` L66–68 の dangling pointer がそこを指す。
2. その文書が、issue #82 §3.1〜§3.5 の問いに**全て**答えている:
   - §3.1 Canonical direction（英語 canonical を確認）
   - §3.2 Same-PR vs follow-up sync 規約
   - §3.3 Heading-structure parity（`check-readme-wiki-sync.sh` Check 3 への
     cross-reference を含む written rule）
   - §3.4 EN canonical date marker（README.ja.md に導入するか / しないか、
     導入する場合の運用）
   - §3.5 文書の配置場所
3. 文書が直接 `language-rules.md` に置かれない場合は、`language-rules.md` から
   新文書への明示的なリンクが追記され、`Contributing.md` (en + ja) からも
   同じ新文書への cross-reference が保たれる。
4. PR レビュアが README 関連の同期判断を `grep -rn` 無しで一意に行える。

---

## 5. Approach

### 5.1 §3.5 配置場所 — **`language-rules.md` 内に "Repo-root README sync convention" sub-section を新設**

issue は 3 つの選択肢を提示している:

(a) `docs/wiki/en/Contributing.md` に "Repository-root README sync" 節を新設
(b) `README.md` 自身の末尾に maintainer-only セクション
(c) `docs/conventions/readme-sync.md` を新設

**いずれも採用しない**。代わりに **(d) `language-rules.md` "Hand-authored
canonical narrative" セクション直下に "Repo-root README sync convention"
sub-section を新設する**ことを推奨する。

根拠:

1. **#75 が既に "Contributing.md ではない" と明示**している（`language-rules.md`
   L66–68: "...not by Contributing.md's wiki bilingual policy"）。(a) は #75 の
   宣言と直接矛盾する。
2. **Contributing.md は wiki bilingual policy のみを enforce すると #75 が
   宣言済み**（`wiki/en/Contributing.md` L185–188 "Source of truth" callout:
   "This section enforces only the wiki-bilingual subset. For
   `docs/design-notes/` single-file conventions or README sync, consult
   `language-rules.md` directly."）。Contributing.md は既に「README sync は
   `language-rules.md` を見ろ」と読者に**明示的に投げ返している**。読者の参照経路
   `Contributing.md → language-rules.md` が既に確立されているのに、規約本体を
   別のサードパーティ場所（(c) `docs/conventions/`）に置くのは経路を不必要に
   増やす。
3. **(b) README.md 内 maintainer section は landing page 思想と衝突**。
   #76 PR #83 で確立した「README はランディング、Wiki が canonical」という
   責任分担に対し、README 末尾に運用ポリシーを置くと「README はランディング
   ではなくなる」。Contributing.md L129–135 のロール定義（"README is **not** a
   canonical source for any of these"）と矛盾する。
4. **(c) `docs/conventions/` ディレクトリ新設は過剰**。現時点で同種の規約は
   1 件のみであり、ディレクトリを新設しても住人は本文書 1 個。`language-rules.md`
   は既に「言語ポリシー全般の権威」として位置づけられており、その一節として
   README 同期規約を含めるのは scope-creep ではなく自然な拡張。
5. **(d) は実装コストが最小**。新ファイルを追加せず、既存の `language-rules.md`
   の "Hand-authored canonical narrative" セクション直下に同階層の見出しを
   1 つ加えるだけで完結する。`language-rules.md` L66–68 の dangling pointer は
   "see below" 形式に書き換えるだけで closure する。

#75 の Contributing.md 改訂が「README sync の問い合わせは `language-rules.md`
へ送れ」と既に書いている事実を踏まえれば、Contributing.md scope の muddying
リスクは**現時点では既に発生済み**であり、(a) を採れば *さらに* muddying が
進む。最小手数で dangling pointer を解消する (d) が最善である。

### 5.2 §3.1 Canonical direction — **English canonical（#75 で確定済みを再確認のみ）**

`language-rules.md` L66 が "English canonical" を既に declare している。本
sub-section では「これは #75 で既に確定済みの方針である」と書き、決定を覆さない。

evidence: `language-rules.md` L66 "bilingual at the repository root with English
canonical"。

### 5.3 §3.2 Same-PR vs follow-up sync — **Same-PR 必須 + 軽微修正例外（7 日 follow-up）を採用**

wiki bilingual policy（`wiki/en/Contributing.md` L184–197）と同じ規約を採用する
ことを推奨する。理由:

1. **wiki と README で運用ルールを違わせる正当な理由がない**。むしろ違わせると
   レビュアの認知負荷（「これは wiki だから 7 日 OK / これは README だから NG」）
   が増える。wiki と同じ規約に揃えるのが「最小驚き」。
2. **README は wiki より visible**との懸念があるが、heading parity を Check 3
   で機械検査している現状では、構造的不整合は merge 時点で必ず検知される。
   軽微修正（typo / broken link）に限定した 7 日 follow-up 例外は wiki と同様に
   許容できる。本格的な内容変更（例: agent 数、Quick Start コマンド変更、
   Features bullet 変更）は同一 PR 必須。
3. **既存の `check-readme-wiki-sync.sh` Check 1 / Check 3 が安全網として機能する**。
   agent count drift（Check 1）、heading 構造 drift（Check 3）はどちらも
   blocking で検知される。残るリスクは「同一 heading 内の散文 drift」のみで、
   これはレビュアの目視に委ねるしかない（wiki と同じ前提）。

採用するルール文言（§6 で実装）:

```
**Mandatory:**
- Every PR that modifies `README.md` must also update `README.ja.md` in the
  same PR (and vice versa).
- English-only merges are prohibited (except for the minor-fix exception).

**Minor fix exception:**
- Typo fixes and broken-link corrections in `README.md`-only may be merged
  without same-PR Japanese sync.
- A follow-up issue must be opened and assigned for the Japanese update
  within 7 days.
```

### 5.4 §3.3 Heading parity — **`check-readme-wiki-sync.sh` Check 3 を written rule として明文化**

evidence: `scripts/check-readme-wiki-sync.sh` L70–91（Check 3 で `^## ` heading
数 + 行位置が完全一致を要求）+ HEAD で `exit 0` が確認済み（§2.3）。

written rule としての文言（§6 で実装）:

```
**Heading parity:**
- `README.md` and `README.ja.md` must have identical `^## ` heading counts
  and identical line positions for each heading. Heading **text** may be
  translated (e.g., `## Quick Start` ↔ `## クイックスタート`); **structure**
  must be lockstep.
- Enforced by `scripts/check-readme-wiki-sync.sh` Check 3, run as part of
  the PR Checklist (`wiki/en/Contributing.md` L218–223).
```

なお現状 `## What's Aphelion` のように en 側英語見出しが ja 側にもそのまま
残っているケースがある — heading text の翻訳ポリシーは「翻訳してもよい / しなくてもよい」
として **強制しない**。理由: heading text は narrative の一部であり、
`language-rules.md` "Hand-authored canonical narrative" の "Only the narrative
body is localised" 規定の対象。skeleton（frontmatter / metadata block）とは
区別して扱う。

### 5.5 §3.4 EN canonical date marker — **README.ja.md には導入しない**

issue 文面が「`> EN canonical: {date}` を README.ja.md に導入すべきか」と
問うているが、§2.4 で確認したとおり README.ja.md の現行ヘッダにはそのような
行は無く、導入は **新しい behavior change** である。

**推奨: 導入しない**。理由:

1. **README は landing page**（Contributing.md L129 "landing page"）。
   landing page の冒頭に `> EN canonical: 2026-04-30 of README.md` のような
   maintainer 向けメタデータを置くことは、ドライブバイ訪問者の視覚的ノイズに
   なる（特に GitHub の repo home は README.md を full render する）。
2. **wiki/ja で `> EN canonical:` を運用している主動機は「複数ページ間で同期
   進捗を個別に追跡したい」から**。wiki は 13 ページあり、ページごとに最後の
   en sync 日付が異なる。一方で README は **2 ファイル 1 ペアのみ**で、Same-PR
   必須が enforce されている限り「en と ja の最後の同期日付」は git log で
   一意に取得できる（同 PR の merge 日 = 最後の同期日）。専用ヘッダの追加価値
   が低い。
3. **drift 検知は `check-readme-wiki-sync.sh` で機械化済み**。
   Check 1（agent count drift）と Check 3（heading 構造 drift）が PR Checklist で
   blocking 実行される現状、`> EN canonical:` 日付による「目視 drift 検知」は
   redundant。
4. **新ヘッダ行を導入すると README.ja.md L1–L9 の構造が変わり**、そのこと自体が
   小さな drift として L7 の言語スイッチャと並ぶ。ヘッダ簡素を保つ landing
   page 思想とトレードオフが悪い。

written rule としての文言（§6 で実装）:

```
**EN canonical date marker:**
- README.ja.md does **not** carry a `> EN canonical: {date}` header line.
  Unlike `wiki/ja/{slug}.md` (which uses this marker to track per-page sync
  progress across 13 pages), the README pair is governed by Same-PR
  mandatory sync (above), so the latest sync date is recoverable from
  `git log` and a per-file marker is unnecessary.
```

### 5.6 implications まとめ

§5.1–§5.5 を統合すると、実装 PR が触る範囲は次のようになる:

- `src/.claude/rules/language-rules.md`: "Hand-authored canonical narrative"
  セクションの直下に "Repo-root README sync convention" sub-section を新設。
  L66–68 の dangling pointer 部分を "see below" 形式に書き換え。
- 新規ファイル**なし**（(d) を採用したため）。
- `wiki/en/Contributing.md` L172–176 / `ja` L168–171 の "README en ↔ ja parity"
  ポインタは現状維持で十分（`language-rules.md` を指している）。
- `package.json` patch bump、`CHANGELOG.md` `[Unreleased]` 追記。
- README.md / README.ja.md 自体は**触らない**（behavior change なし、
  ヘッダ追加もなし）。

---

## 6. Document changes (planned)

本 design note では以下のファイル変更を**実装フェーズに対して提案**する。
**本 analysis pass ではこれらは行わない**（§3 制約）。

| File | 変更 | Rationale |
|------|------|-----------|
| `src/.claude/rules/language-rules.md` | "Hand-authored canonical narrative" セクション直下に新 sub-section "Repo-root README sync convention" を追加。L66–68 の "...governed by the repo-root README sync convention (not by Contributing.md's wiki bilingual policy)." を "...governed by the repo-root README sync convention (see below)." に書き換え。新 sub-section は §5.2–§5.5 の written rule 4 ブロック（Mandatory / Minor fix exception / Heading parity / EN canonical date marker）を含む。 | §5.1（配置）+ §5.2–§5.5（中身） |
| `package.json` | `version` を patch bump（`0.3.3` → `0.3.4`） | `language-rules.md` 改訂は `src/.claude/rules/` 配下のため version bumping policy 必須（`Contributing.md` L226–238） |
| `CHANGELOG.md` | `[Unreleased]` セクションに "Add repo-root README sync convention to language-rules.md (#82)" を追記 | version bumping policy（`Contributing.md` L237） |

**触らないファイル**:

- `README.md` / `README.ja.md` — 本変更は purely documentation。ヘッダ追加なし
  （§5.5 の判断）、heading 構造変更なし。
- `wiki/en/Contributing.md` / `wiki/ja/Contributing.md` — #75 で既に
  `language-rules.md` への cross-reference が入っており、新 sub-section が
  `language-rules.md` 内に追加されることで自動的に references が working pointer に
  昇格する。Contributing.md 自体は再編集不要。
- `scripts/check-readme-wiki-sync.sh` — Check 3 は既に heading parity を
  enforce しており、本 design note は **既存の機械検査を written rule として
  明文化するのみ**。スクリプト改変なし。
- archived design note 全般 — read-only policy。

---

## 7. Open questions

§5 で evidence ベースの推奨を確定できた問いは省く。以下は残存する判断事項。

1. **(needs-user-decision: yes)** §3.5 配置選択を (d) `language-rules.md` 内 sub-section で良いか確認。
   - 推奨は (d)。issue 文面の選択肢 (a)/(b)/(c) のいずれも採用しない。実装 PR に
     入る前に user の合意があると安全。
   - 2026-04-30 決定: Option (d) を採用。`language-rules.md` の "Hand-authored
     canonical narrative" セクション直下に "Repo-root README sync convention"
     sub-section を新設。新ファイル・新ディレクトリ不要。
2. **(needs-user-decision: yes)** §3.4 EN canonical date marker を README.ja.md に **導入しない** という方針で良いか確認。
   - 推奨は導入しない。これは behavior change であり、`> EN canonical:` を
     導入する選択肢もありうる。issue 文面が「同じ convention を adopt すべきか」
     と中立に問うているため、user 確認したい。
   - 2026-04-30 決定: 導入しない。README.ja.md には `> EN canonical:` 行を
     追加しない。Same-PR 必須 + `scripts/check-readme-wiki-sync.sh` Check 3 +
     新規 convention 文書が揃うことで十分。ランディングページの簡素さを保つ
     意図的な wiki からの divergence として明文化済み。
3. **(needs-user-decision: no)** Heading text の翻訳可否。
   - §5.4 で「heading text は翻訳してもしなくてもよい」と決めた。現状の
     混在（`## What's Aphelion` 英・`## クイックスタート` 和）が許容される。
     これは §5.4 で結論済みなので user 判断不要。実装 PR でも追加変更なし。
4. **(needs-user-decision: no)** Same-PR sync の「軽微修正」の境界定義。
   - typo / broken-link に限定すれば wiki ポリシーと完全一致。それ以上の
     精緻化は不要（wiki でも同じ粒度で運用されており実害なし）。
5. **(needs-user-decision: no)** `check-readme-wiki-sync.sh` Check 3 の
   strictness（heading **数** だけでなく **行位置** まで一致を要求している点）
   を維持するか緩めるか。
   - 現状維持を推奨。HEAD で `exit 0` が出る lockstep 状態が既に達成されており、
     緩める動機がない。

---

## 8. Handoff brief for developer

**handoff target: developer (deferred until §7 Q1 / Q2 が解決した後)**

実装内容（§6 の表をそのまま実行）:

1. `src/.claude/rules/language-rules.md` を編集:
   - L66–68 の "(not by Contributing.md's wiki bilingual policy)" を
     "(see 'Repo-root README sync convention' below)" 系の表現に書き換え。
   - "Hand-authored canonical narrative" セクションの直下、"Out of scope" の
     **前**に新 sub-section "### Repo-root README sync convention" を追加。
     中身は §5.2–§5.5 の written rule 4 ブロック（Canonical direction の確認、
     Mandatory / Minor-fix exception、Heading parity（`scripts/check-readme-wiki-sync.sh`
     Check 3 への明示的 cross-reference を含む）、EN canonical date marker
     not adopted の declaration）。
2. `package.json`: `version` を `0.3.3` → `0.3.4` に bump。
3. `CHANGELOG.md` `[Unreleased]` に "Add repo-root README sync convention to
   `language-rules.md` (#82)" を追記。
4. PR body に `Closes #82` を含める。`archive-closed-plans.yml` が本 design
   note を archived に移動する。

実装後検証:

```bash
# convention が正しく追記されたこと
grep -n "Repo-root README sync convention" src/.claude/rules/language-rules.md
# dangling pointer が closure されていること
grep -n "repo-root README sync convention" src/.claude/rules/language-rules.md docs/wiki/en/Contributing.md docs/wiki/ja/Contributing.md
# heading parity check が依然 pass すること
bash scripts/check-readme-wiki-sync.sh && echo OK
# version bump
grep '"version"' package.json
# CHANGELOG 追記
grep -A3 '\[Unreleased\]' CHANGELOG.md | head
```

実装規模見込み: `language-rules.md` 30〜40 行追記、`package.json` 1 行変更、
`CHANGELOG.md` 1 行追記。合計 1 ファイル新規 + 3 ファイル微編集 = なし、
0 ファイル新規 + 3 ファイル編集。所要 ~20–30 分。

`architect` 起動は不要（ARCHITECTURE.md 影響なし、purely docs/policy 改訂）。

> Implemented in: PR #87
