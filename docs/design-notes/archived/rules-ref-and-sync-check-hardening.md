> Last updated: 2026-04-30
> GitHub Issue: [#105](https://github.com/kirin0198/aphelion-agents/issues/105)
> Authored by: analyst (2026-04-30)
> Next: developer (architect skip — small docs + CI script change)

# Rules-Reference page and check-readme-wiki-sync hardening (#103 follow-up)

## 1. Problem statement

#103 の PR #104 で out-of-scope として記録された 2 件の follow-up を本ノートで解消する。

- **Follow-up A**: `docs/wiki/{en,ja}/Rules-Reference.md` の rule entries 数が canonical
  (`src/.claude/rules/*.md` = 12 件) と整合していない可能性。Home.md は #103 で 9 → 12 に
  bump 済みだが、Rules-Reference.md 本体の整合は未検証だった。
- **Follow-up B**: `scripts/check-readme-wiki-sync.sh` Check 1 が **README.md / README.ja.md
  の L3 に出現する agent count しか検証していない**。L70 の link 行 ("all 39 agents" /
  "全 39 エージェント") で同様の数値 drift が起きても CI で検出できない構造的盲点が #103
  で発覚した。

## 2. Current state evidence

### 2.1 Follow-up A: Rules-Reference.md の実測値

canonical 側 (`src/.claude/rules/*.md`) は **12 件**:

```
agent-communication-protocol.md    aphelion-overview.md
build-verification-commands.md     denial-categories.md
document-versioning.md             file-operation-principles.md
git-rules.md                       language-rules.md
library-and-security-policy.md     localization-dictionary.md
sandbox-policy.md                  user-questions.md
```

これに対し `docs/wiki/en/Rules-Reference.md` の `## ` 見出しによる rule entry は
**11 件** ── `localization-dictionary` が欠落。

```
aphelion-overview                  agent-communication-protocol
build-verification-commands        document-versioning
file-operation-principles          git-rules
language-rules                     library-and-security-policy
sandbox-policy                     denial-categories
user-questions
                                   ← localization-dictionary 欠落
```

加えて、ページ内に同じ count drift が複数箇所で発生している:

| 箇所 | 現状 | 期待値 | 備考 |
|------|------|--------|------|
| en L12 / ja L13 | "11 behavioral rules" / "11 の行動ルール" | 12 | 本文冒頭 |
| en L169 / ja L170 | "All 10 rule files" / "10のルールファイル全体" | 12 | "Canonical Sources" 節 |
| en L18-28 / ja L19-29 | ToC: 11 entries | 12 | `localization-dictionary` link 欠落 |
| en L34-156 / ja L35-157 | 本体: 11 entries | 12 | `localization-dictionary` 節欠落 |

ja 側に追加で 1 点表記揺れあり:

- L103, L104 の "AGENT_RESTULT" は "AGENT_RESULT" の typo (本タスクの主目的ではないが、
  rule entries 修正と同 PR で合わせて修正することを推奨)。

### 2.2 Follow-up B: Check 1 の現行ロジックと盲点

現行 (`scripts/check-readme-wiki-sync.sh` L26-42):

```sh
README_EN=$(grep -oE '[0-9]+ specialized agents' "$REPO_ROOT/README.md"     | grep -oE '[0-9]+' | head -1)
README_JA=$(grep -oE '[0-9]+ の専門エージェント'  "$REPO_ROOT/README.ja.md"  | grep -oE '[0-9]+' | head -1)
HOME_EN=$(grep -oE 'all [0-9]+ agents'           "$REPO_ROOT/docs/wiki/en/Home.md" | head -1 | grep -oE '[0-9]+')
HOME_JA=$(grep -oE '[0-9]+ エージェント'          "$REPO_ROOT/docs/wiki/ja/Home.md" | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
```

各ファイルの実際の出現箇所:

| ファイル | L3 (canonical sentence) | L70 / その他 | 現行 Check 1 が見る箇所 |
|----------|------------------------|---------------|--------------------------|
| README.md | "with 39 specialized agents" | L70 "all 39 agents" | L3 のみ (L70 は regex 対象外) |
| README.ja.md | "39 の専門エージェント" | L70 "全 39 エージェント" | L3 のみ (L70 は regex 対象外) |
| docs/wiki/en/Home.md | L26 "all 39 agents" | L41 "all 39 agents" | `head -1` で L26 のみ |
| docs/wiki/ja/Home.md | L27 "39 エージェント" | L42 "39 エージェント" | `sort -u` で両方検証 (OK) |

**盲点 (drift しても CI が pass してしまう箇所)**:

1. **README.md L70** ("all 39 agents") — 別 regex なので Check 1 の対象外
2. **README.ja.md L70** ("全 39 エージェント") — 別 regex なので対象外
3. **docs/wiki/en/Home.md L41** ("all 39 agents") — `head -1` で見落とし

(ja Home.md は `sort -u` のおかげで既に複数行検証されており、ここに盲点はない)

## 3. Constraints

- bilingual sync (en + ja) を 1 PR に同梱 (wiki Bilingual Sync Policy)
- `site/src/content/docs/{en,ja}/rules-reference.md` は `sync-wiki.mjs` で auto-overwrite
  されるので **直接編集しない** (`docs/wiki/` 側の修正で連動)
- 既存の Check 1 が pass する 4 ファイルはこれまで通り pass し続けること (regression なし)
- false positive 増加を最小限に: commit message / archived/ 配下 / コードブロック内の
  例示などは引き続きマッチ対象外であるべき
- `archived/` 配下と `node_modules/` は触らない
- script 改修は GNU grep の portable な範囲に留める (`grep -oE` / `grep -E` のみ)

## 4. Success criteria

- `docs/wiki/en/Rules-Reference.md` と `docs/wiki/ja/Rules-Reference.md` が **12 entries**
  で揃い、本文冒頭の "N behavioral rules" / "N の行動ルール"、ToC、本体節、Canonical
  Sources 節の数値表記がすべて 12 で整合する
- `scripts/check-readme-wiki-sync.sh` Check 1 が以下 3 箇所の drift も検出する:
  - README.md L70 link 行
  - README.ja.md L70 link 行
  - docs/wiki/en/Home.md L41 link 行
- 既存の 4 値 (`README.md=39, README.ja.md=39, Home.md(en)=39, Home.md(ja)=39`) は
  これまでどおり pass する
- `bash scripts/check-readme-wiki-sync.sh` がローカルで pass し、`astro build` (任意)
  も通る

## 5. Approach

### 5.1 Follow-up A の修復方針

`docs/wiki/en/Rules-Reference.md`:

1. L12 を "11 behavioral rules" → "12 behavioral rules" に変更
2. ToC (L18-28) に `- [localization-dictionary](#localization-dictionary)` を追加
   (アルファベット順を維持するため `library-and-security-policy` と `sandbox-policy`
   の間に挿入)
3. 本体に `## localization-dictionary` 節を新規追加 (`library-and-security-policy` 直後、
   `sandbox-policy` の直前)。記載項目は他 entry と同じスケルトン:
   - **Canonical**: `[.claude/rules/localization-dictionary.md](../../.claude/rules/localization-dictionary.md)`
   - **Scope**: All agents that emit fixed UI strings (approval gates, AskUserQuestion
     boilerplate, progress displays, "Phase N complete" headers)
   - **Auto-load behavior**: Auto-loaded by Claude Code on every session start
   - **Interactions**: Resolves at runtime against `project-rules.md` →
     `## Localization` → `Output Language`. Cooperates with `language-rules.md` Hybrid
     Localization Strategy: dictionary entries cover fixed UI strings, while free-form
     narrative is generated directly by the agent in the resolved language.
   - **Summary**: Provides the canonical en/ja translations for fixed UI strings
     organized into three sections (Approval Gate, AskUserQuestion Fallback, Progress
     Display). Template placeholders (`{N}`, `{M}`, `{agent}`) are substituted at render
     time. The file also points to `docs/design-notes/archived/ja-terminology-rebalance.md`
     for prose terminology used by Aphelion's own JA wiki/README (kept separate from
     runtime UI strings).
4. L169 を "All 10 rule files" → "All 12 rule files" に変更
5. L4 の `> **Last updated**:` と `> **Update history**:` に今回の更新行を追加

`docs/wiki/ja/Rules-Reference.md`: 上記の en と同等の修正に加えて:

6. L103, L104 の "AGENT_RESTULT" → "AGENT_RESULT" 修正 (typo cleanup)
7. L13, L170 の数値 (11 → 12, 10 → 12) を更新
8. ToC と本体に `localization-dictionary` 節を追加 (en と同じ位置・同じ skeleton、
   narrative は ja で記述)
9. L4 と L11 の `> **EN canonical**:` 日付を更新

### 5.2 Follow-up B の推奨案

**推奨案: Plan A (パターン拡張 + ファイル全体検証)**

3 案を比較:

| 案 | 内容 | Pros | Cons |
|----|------|------|------|
| Plan A | 既存 4 regex を保ちつつ、各ファイルで `head -1` を外し全行抽出 + `sort -u` で deduplicate (Home ja の現行ロジックを横展開) | 最小変更、portable bash、false positive 増えない | regex を増やしてはいないので「L70 の link 文字列」だけのために新パターンは追加しない |
| Plan B | README L3 / L70 を別パターンとして追加検証 (`all [0-9]+ agents` を README.md にも適用) | drift 箇所が明示的に列挙される | 同じ意味の行を 2 種類の regex で扱うことになり保守性低下 |
| Plan C | language-rules.md / Contributing.md に「agent count を hard-code する箇所は L3 と link 行 (L70) の 2 箇所のみ」と invariant を文書化し、script は line-number-anchored に | 規約として明示できる | 行番号固定は脆弱。README 構造変更で即崩壊 |

**推奨: Plan A** ── 理由:

- README.md L70 の文字列は実は en Home.md と同じ `all [0-9]+ agents` パターンに
  マッチするため、**README.md にも同じ regex を追加適用するのが最も自然**
- README.ja.md L70 は `[0-9]+ エージェント` パターンにマッチするため、ja Home.md と
  同じ regex を README.ja.md にも適用すれば良い
- 新たな regex を導入する必要なし。既存 regex の **適用範囲拡大 + `head -1` 削除 +
  `sort -u`** だけで盲点 3 箇所すべてをカバーできる
- false positive 対策: commit message や archived/ 配下のファイルはそもそも grep
  対象に含まれない (READMEs と Home.md のみ); コードブロック内の例示は L3 / L70 周辺の
  文章にしか出現しないため実害なし

**具体的な diff 案** (擬似コード):

```sh
# Before:
README_EN=$(grep -oE '[0-9]+ specialized agents' "$REPO_ROOT/README.md" \
  | grep -oE '[0-9]+' | head -1)

# After: collect from BOTH "specialized agents" (L3) AND "all N agents" (L70)
README_EN=$(grep -hoE '[0-9]+ specialized agents|all [0-9]+ agents' "$REPO_ROOT/README.md" \
  | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
```

`README.ja.md` も同様 (`[0-9]+ の専門エージェント|[0-9]+ エージェント` で OR 結合 +
`sort -u`)。

`Home.md (en)` は `head -1` を削除して `sort -u` を追加するだけ (既に regex は OK)。

`Home.md (ja)` は変更なし (既に対応済み)。

検証ロジック (L35-42 の for-loop) は文字列比較のままで OK。drift があれば
`HOME_JA=12,9` のような複数値文字列が `ACTUAL=12` と不一致になり fail する。

### 5.3 (任意) Plan A 適用に伴うドキュメント追記

- `docs/wiki/en/Contributing.md` (or `language-rules.md` の repo-root README sync 節)
  に「agent count は README L3 と L70 link 行の 2 箇所に出現する。両方とも同じ数値
  でなければならない (Check 1 が enforce する)」と一行追記する案がある。これは
  developer 判断で本 PR に同梱しても次回 follow-up でも可。

## 6. Document changes

| ファイル | 変更内容 |
|----------|---------|
| `docs/wiki/en/Rules-Reference.md` | 12 entries 化 (本文冒頭の 11→12, ToC entry 追加, `localization-dictionary` 節追加, "All 10 rule files" → "All 12 rule files", Last updated / Update history 更新) |
| `docs/wiki/ja/Rules-Reference.md` | 同上 (ja narrative) + AGENT_RESTULT typo 修正 + EN canonical 日付更新 |
| `scripts/check-readme-wiki-sync.sh` | Check 1 で 4 ファイル全行抽出 + `sort -u` (Plan A) |
| (任意) `docs/wiki/en/Contributing.md` and `docs/wiki/ja/Contributing.md` | agent count invariant の文書化 |

`SPEC.md` / `ARCHITECTURE.md`: 変更なし (本タスクは docs + ci-hardening のみ)。

`site/src/content/docs/{en,ja}/rules-reference.md`: **触らない** (`sync-wiki.mjs` で
auto-overwrite される)。

## 7. Open questions

- **Q1**: Rules-Reference.md の section 順は現状 "category 別 + alphabetical 部分混在"
  になっている。`localization-dictionary` は `library-and-security-policy` と
  `sandbox-policy` の間 (alphabetical 位置) に挿入することを推奨するが、developer は
  既存 entry の並びを尊重しても良い (どちらでも canonical との整合は取れる)。
- **Q2**: Plan A で `sort -u` を使うと、もし README.md 内で複数の正しい数値 (例えば
  L3 が "39 specialized agents" で L70 が "all 39 agents") があった場合に両方とも同じ
  "39" として deduplicate されるため、`HOME_JA` 同様 1 値として比較できる。drift があれば
  `12,9` のような複数値文字列となり ACTUAL と一致しない。実装上の追加検討は不要。
- **Q3**: ja Rules-Reference.md の "AGENT_RESTULT" typo 修正は本 PR 同梱で OK か、
  別 commit / 別 PR にすべきか。本 follow-up と同 commit 内で `docs(wiki): fix
  AGENT_RESTULT typo in ja Rules-Reference` 等の独立 commit にすることを推奨
  (analyst 提案、developer 判断で確定)。

## 8. Handoff

- **HANDOFF_TO**: developer (architect skip)
- **理由**: Follow-up A は単純な entry 追加と数値整合、Follow-up B は ~5 行の bash
  patch のみ。設計判断は本ノート §5 で確定済みで、新規アーキテクチャ判断は不要。
- **推奨 PR 構成**: 1 PR / 2-3 commit:
  1. `docs(wiki): align Rules-Reference rule entries to 12` (en + ja 同 commit)
  2. `ci: harden check-readme-wiki-sync to detect agent count drift in README L70`
  3. (optional) `docs(wiki): fix AGENT_RESTULT typo in ja Rules-Reference`
- **bilingual sync**: `docs/wiki/en/Rules-Reference.md` と `docs/wiki/ja/Rules-Reference.md`
  は同 PR 必須
- **検証**:
  - `bash scripts/check-readme-wiki-sync.sh` がローカルで pass
  - 可能なら `cd site && npm run build` (astro build) も pass
  - rule entries が canonical 12 件と完全に一致 (`ls src/.claude/rules/*.md | wc -l` と
    Rules-Reference.md の `## ` count から ToC + 関連ページ + 正規ソースの 3 セクション
    を引いた値が 12 になる)
