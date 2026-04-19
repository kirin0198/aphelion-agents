# Unify scripts runtime to Node.js

> 最終更新: 2026-04-19
> 関連 Issue: [#14](https://github.com/kirin0198/aphelion-agents/issues/14)
> ブランチ: `refactor/unify-scripts-to-node`
> Issue 分類: refactor

## 1. ユーザー要件

`scripts/` 配下のランタイムを単一化したい。現状 Python (`generate.py`) と Node.js (`sync-wiki.mjs`) が混在しており、開発者体験・ドキュメンテーション・CI 設定の観点でノイズが大きい。

どちらか一方に寄せる方針を決定し、最小限の手数で移行する。

## 2. 現状分析

### 2.1 現在のスクリプト構成

| ファイル | ランタイム | 役割 |
|---------|----------|------|
| `scripts/generate.py` | Python 3 (標準ライブラリのみ) | `.claude/` 配下の各種 .md を読み、frontmatter を書換えて `platforms/copilot/` `platforms/codex/` に書き出す |
| `scripts/sync-wiki.mjs` | Node.js (ESM, 標準モジュールのみ) | `wiki/` → GitHub Wiki 用の同期処理 |

### 2.2 `generate.py` の主要機能

- `argparse` による CLI: `--platform copilot|codex|all`, `--clean` 等のフラグ
- frontmatter (YAML) のパース / シリアライズ (独自実装)
- YAML multiline `|` 形式のハンドリング (独自実装)
- `.claude/` 配下を再帰走査し、プラットフォーム別に書き出し
- `shutil.rmtree` による既存生成物のクリーンアップ

### 2.3 混在による課題

1. 開発者は Python 3 と Node.js 両方のランタイムを前提にする必要がある
2. devcontainer / CI のベースイメージ選定が煩雑
3. frontmatter パースのロジックが 2 言語で重複している
4. ドキュメントで「どちらのコマンドを使うか」の記述が分散している

## 3. 選択肢比較

| 案 | 内容 | 評価 |
|---|------|------|
| **Target A** | `generate.py` を Node.js (.mjs) 化 | 採用。`sync-wiki.mjs` と揃えられる。依存は Node のみ |
| Target B | `sync-wiki.mjs` を Python 化 | 不採用。Node 側は外部依存がなく、既に ESM 化済みで完成度が高い |
| Target C | TypeScript 統一 | 不採用。ビルドステップが増えて学習コストが上がる |

## 4. 決定事項 (承認済み)

1. **Target A** (`scripts/generate.py` のみを Node.js 化) を採用
2. 言語は **JavaScript (.mjs)**、既存 `sync-wiki.mjs` と同じ ESM スタイル
3. ルート `package.json` を **新設** し、`npm run generate` / `npm run sync-wiki` を可能にする
4. `scripts/generate.py` は生成物の同等性を diff で検証した上で **即削除**
5. テストは最小限 (生成物 byte-for-byte diff のみ、ユニットテストは追加しない)
6. `CLAUDE.md` / `.claude/rules/` の変更は行わない。README に 1 行追加のみ

## 5. 実装プラン

### Phase 1: `scripts/generate.mjs` 新規作成

- `generate.py` と同等のロジックを JavaScript (.mjs) で実装
- 外部依存は追加しない（Node 標準モジュールのみ）
  - `node:fs`, `node:path`, `node:util` (`parseArgs` for CLI)
- frontmatter パース / シリアライズは `scripts/sync-wiki.mjs` の `extractFrontmatter` / `serializeFrontmatter` を参考に流用可
- YAML multiline `|` の扱いは Python 版のロジックを正確に再現する
- `shutil.rmtree` → `fs.rmSync(..., { recursive: true, force: true })`

### Phase 2: 生成物 diff 検証

```bash
# Python 版で生成
python3 scripts/generate.py
mkdir -p /tmp/python-output
cp -r platforms/copilot /tmp/python-output/
cp -r platforms/codex /tmp/python-output/

# Node 版で生成
node scripts/generate.mjs

# diff
diff -r /tmp/python-output/copilot platforms/copilot
diff -r /tmp/python-output/codex platforms/codex
# 差分ゼロを確認
```

### Phase 3: ルート `package.json` 作成

最小構成:

```json
{
  "name": "aphelion-agents",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "node scripts/generate.mjs",
    "sync-wiki": "node scripts/sync-wiki.mjs"
  }
}
```

### Phase 4: ドキュメントの参照書換

リポジトリ内の `python3 scripts/generate.py` 参照をすべて `node scripts/generate.mjs` もしくは `npm run generate` に書き換える。想定対象は 13 ファイル前後 (developer が `rg` で抽出)。

### Phase 5: `scripts/generate.py` 削除

Phase 2 で bit-for-bit 同等であることが確認できたら、`git rm scripts/generate.py`。

## 6. 受入条件

- `platforms/copilot/**` と `platforms/codex/**` が Python 版と Node 版で **バイト単位一致** する
- 既存の wiki / README / ドキュメント参照が新コマンドで全て動作する
- Cloudflare Pages (`wiki/` のビルド) に影響がない
- `scripts/generate.py` が削除されている

## 7. スコープ外

- TypeScript 化
- `scripts/sync-wiki.mjs` の改修
- `.claude/rules/` や `wiki/` 内に残る Python 実行例の書換
  （本 issue は「スクリプトランタイム統一」が目的であり、ガイドライン文書内の例示コードは別 issue とする）
- ユニットテストの追加

## 8. コミット戦略 (developer 向け目安)

| # | prefix | メッセージ案 |
|---|--------|------------|
| 1 | feat | `feat: add scripts/generate.mjs (node port of generate.py)` |
| 2 | chore | `chore: add root package.json with generate and sync-wiki scripts` |
| 3 | docs | `docs: update script references to use node runtime` |
| 4 | chore | `chore: remove scripts/generate.py (replaced by generate.mjs)` |

Phase 2 の検証はコミットを残さないか、検証ログのみを含める。

## 9. ハンドオフ

- Issue: [#14](https://github.com/kirin0198/aphelion-agents/issues/14)
- 次の担当: `developer`
- `architect` はスキップ (SPEC / ARCHITECTURE の変更なし、設計に影響しないリファクタリングのため)
