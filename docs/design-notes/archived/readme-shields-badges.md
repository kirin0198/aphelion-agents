> Last updated: 2026-04-30
> GitHub Issue: [#101](https://github.com/kirin0198/aphelion-agents/issues/101)
> Authored by: analyst (2026-04-30)
> Next: developer (architect skip — single-purpose docs change)

# README shields.io バッジ追加

## 1. Problem statement

`README.md` / `README.ja.md` には現在 Wiki への入口を示すバッジが 1 枚あるだけで、
リポジトリの規模感 (agents / commands / rules の数) や license 種別が一目で
分からない。GitHub のリポジトリトップに到達したユーザーが
"このリポジトリは何で、どれくらいの規模で、何のライセンスか" を即座に把握できる
ように shields.io 静的バッジを追加する。

参考にした事例: <https://github.com/Donchitos/Claude-Code-Game-Studios/blob/main/README.md>

## 2. Current state evidence

実測値 (2026-04-30 時点):

| 項目 | コマンド / 出典 | 実測値 | 備考 |
|------|----------------|-------|------|
| agents | `ls .claude/agents/*.md \| wc -l` | **39** | 既存 README 本文の "39 specialized agents" と一致 |
| commands | `ls .claude/commands/*.md \| wc -l` | **14** | slash command 定義 |
| rules | `ls .claude/rules/*.md \| wc -l` | 0 | リポジトリ内には存在しない |
| rules (canonical) | `ls src/.claude/rules/*.md \| wc -l` | **12** | npx 配布で `~/.claude/rules/` にコピーされる canonical source |
| hooks | `.claude/settings.json` / `src/.claude/settings.local.json` を grep | **0 (設定なし)** | Aphelion は hooks 機構を採用していない |
| license | `head -1 LICENSE` → "MIT License" | **MIT** | |

### 補足: rules バッジの canonical 対象判断

リポジトリ内の `.claude/rules/` は (PR #54 系列の整理結果として) 空で、実体は
`src/.claude/rules/` に集約されている。これは npx 配布時に `~/.claude/rules/`
へコピーされる canonical source であり、ユーザーが Aphelion を使う場合は
`src/.claude/rules/` の枚数が体感値と一致する。

→ **rules バッジは `src/.claude/rules/` の 12 を採用する** (analyst 推奨)。
README 本文には "src/" を書かずに `rules-12-green` とだけ表示し、ラベルは
"rules" の単語のみとする。バッジが `src/` 配下を指すことは README 上では
明示しない (バッジは粒度の粗いシグナルであり、詳細は README 本文や Wiki 側で
説明する)。

### 補足: hooks バッジの扱い判断

Aphelion は Claude Code の `hooks` 機構を採用していない (rules.md /
sandbox-policy.md / denial-categories.md 等のテキストルールベースで
agent 動作を制御する設計)。`hooks-0-orange` を表示するのは
"何かが欠けている" ように見えてミスリーディング。

→ **hooks バッジは追加しない** (analyst 推奨)。最終的なバッジ枚数は **4 枚**
(agents / commands / rules / license)。

## 3. Constraints

- **Repo-root README sync convention** (language-rules.md §3.1〜3.4):
  `README.md` (canonical) と `README.ja.md` を同一 PR で更新する。
  English-only マージは禁止 (typo / link 修正の minor fix exception を除く)。
- **バッジラベル文字列は英語固定**: 両言語ファイルで完全に同一の markdown 行
  を挿入する (heading parity = Check 3 を確実に満たすため)。
- **`scripts/check-readme-wiki-sync.sh` の Check 1/2/3 を通過すること**:
  - Check 1 (agent count parity): バッジは `^N specialized agents$` のような
    本文記述ではないので影響なし
  - Check 2 (slash command parity): バッジは slash command を含まないので
    影響なし
  - Check 3 (README pair heading position parity): `^## ` heading の数と
    行位置を README 両方で同じに保つ。バッジは画像 markdown 行 (`![...]`)
    で `## ` heading ではないため、両 README に **同じ行数** のバッジ block を
    **同じ相対位置** に挿入する限り heading の絶対行位置が同じだけずれて
    parity は維持される。
- **shields.io 静的バッジ URL 構文の厳守**:
  `https://img.shields.io/badge/<label>-<value>-<color>` 形式。
  ラベル中のハイフンはダブルハイフン (`--`) でエスケープする必要がある
  (今回はラベルが単語のみなので該当なし)。
- 配置位置: 既存 Wiki バッジ (L5) の **直後** (改行のみで空行なし) に
  挿入。ユーザー要求に従う。

## 4. Success criteria

- README.md / README.ja.md の Wiki バッジ直後に 4 枚のバッジが追加されている
- en / ja で **完全に同じ markdown 行** が挿入されている
- `bash scripts/check-readme-wiki-sync.sh` が pass する (ローカル + CI)
- バッジ表示時の数値が実測値と一致する (agents=39 / commands=14 / rules=12 /
  license=MIT)
- design-note (本ファイル) の `> GitHub Issue:` 行が実 issue 番号で埋まる

## 5. Approach

### 5.1 配置と最終形 (developer がそのままコピペ可能な markdown)

既存の README L5:

```markdown
[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.com-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.com/)
```

の **直後** (空行を挟まず L6 に) 1 行で 4 枚のバッジを並べる:

```markdown
![agents](https://img.shields.io/badge/agents-39-blueviolet) ![commands](https://img.shields.io/badge/commands-14-blue) ![rules](https://img.shields.io/badge/rules-12-green) ![license](https://img.shields.io/badge/license-MIT-blue)
```

(リンクは付けない静的バッジ。GitHub 側で自動的に折り返される。)

挿入後の README.md / README.ja.md L1〜10 イメージ:

```markdown
# Aphelion — Frontier AI Agents

A collection of AI coding agent definitions for Claude Code that automates the entire project lifecycle with 39 specialized agents.

[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.com-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.com/)
![agents](https://img.shields.io/badge/agents-39-blueviolet) ![commands](https://img.shields.io/badge/commands-14-blue) ![rules](https://img.shields.io/badge/rules-12-green) ![license](https://img.shields.io/badge/license-MIT-blue)

**[日本語版 README はこちら](README.ja.md)**

---

## What's Aphelion
```

(README.ja.md は L7 の "[日本語版 README はこちら]" の代わりに
"[English README](README.md)" となる点だけが既存差分。バッジ行は完全同一。)

### 5.2 1 PR / 1 commit

ユーザー要求の "small docs PR" に従い、両ファイルへのバッジ追加を **1 commit**
にまとめる。commit prefix は `docs:` (git-rules.md の prefix table より)。

ブランチ名 (developer 担当): `feat/readme-shields-badges` (Direct invocation /
feature addition の default に従う)。

## 6. Document changes

| ファイル | 変更内容 |
|----------|---------|
| `README.md` | L5 (Wiki バッジ) の直後 (新 L6) に 4 バッジ行を挿入。後続行は +1 シフト。 |
| `README.ja.md` | 同上 (L6 にバッジ行を挿入)。L5 の Wiki バッジ markdown と新 L6 のバッジ markdown は en と完全同一。 |
| `docs/design-notes/readme-shields-badges.md` | (本ファイル) 新規作成。GitHub Issue 作成後に header の `> GitHub Issue:` を実番号に更新。 |

SPEC.md / ARCHITECTURE.md / UI_SPEC.md / agent definition への変更はゼロ。

## 7. Open questions / 確認事項

AskUserQuestion は本セッションで利用不可と前提されているため、以下は
analyst の推奨判断で確定する (ユーザーが PR レビュー時に修正依頼可能):

- **Q1: rules バッジの canonical 対象**
  → **§2 の判断に従い `src/.claude/rules/` (12 枚) を採用**。
  バッジに "src/" は表示しない (粒度の粗いシグナル)。
- **Q2: hooks バッジの扱い (0 件問題)**
  → **§2 の判断に従いバッジ自体を追加しない**。最終枚数 4 枚。
  ユーザーが "0 でも表示したい" 場合は PR 上で 1 行差分で復活可能。
- **Q3: バッジへのリンク付与**
  → **付与しない**。参考にした Donchitos/Claude-Code-Game-Studios の README も
  静的バッジのみ。リンクを足すと改行が増えて Check 3 のリスクが上がる。
- **Q4: README L5 と新 L6 の間に空行を入れるか**
  → **入れない** (ユーザー要求 "改行のみ、空行なし" に従う)。バッジ群が
  Wiki バッジと一塊になることで視覚的に "tags" として認識される。

## 8. Handoff

```
HANDOFF_TO: developer
ARCHITECT_SKIP_REASON: single-file docs editing chore (no design impact)
BRANCH: feat/readme-shields-badges
COMMITS: 1 (推奨)

実測値:
  agents: 39  (.claude/agents/*.md)
  commands: 14 (.claude/commands/*.md)
  rules: 12 (src/.claude/rules/*.md, canonical source)
  hooks: N/A (バッジ追加しない)
  license: MIT

挿入位置:
  README.md L5 の直後 (新 L6)
  README.ja.md L5 の直後 (新 L6)

挿入する markdown (両ファイル完全同一の 1 行):

  ![agents](https://img.shields.io/badge/agents-39-blueviolet) ![commands](https://img.shields.io/badge/commands-14-blue) ![rules](https://img.shields.io/badge/rules-12-green) ![license](https://img.shields.io/badge/license-MIT-blue)

検証コマンド (commit 前に必ず実行):
  bash scripts/check-readme-wiki-sync.sh

PR body には:
  - Closes #{issue}
  - Linked Plan: docs/design-notes/readme-shields-badges.md
を含める (merge で auto-close + design-note auto-archive)。
```
