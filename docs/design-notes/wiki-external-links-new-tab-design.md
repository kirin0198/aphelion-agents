# 実装設計ブリーフ: wiki サイトの外部リンク新タブ化（rehype-external-links）

> Source: docs/design-notes/wiki-external-links-new-tab.md（2026-05-31・ユーザー承認済み §6）
> GitHub Issue: [#158](https://github.com/kirin0198/aphelion-agents/issues/158)
> Authored by: architect (2026-05-31)
> Next: developer
> ARCHITECTURE.md: 不在（小規模変更のため新規作成しない）

本ドキュメントは planning doc §6/§8 で確定した方針を、developer がそのまま実装に移れる
粒度に具体化した実装設計ブリーフである。確定方針からの逸脱は行わない。

---

## 1. site/astro.config.mjs への差分設計

### 1.1 import 文の追加

現状 4 行目に `import remarkMermaid from './src/remark-mermaid.mjs';` がある。
その直下（5 行目相当）に外部パッケージ import を追加する。
（ローカル相対 import の後・外部パッケージ import を分けても良いが、最小差分を優先し
直下に置く。）

```js
import remarkMermaid from './src/remark-mermaid.mjs';
import rehypeExternalLinks from 'rehype-external-links';
```

### 1.2 markdown ブロックの差分

現状（62-65 行目相当）:

```js
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMermaid],
	},
```

変更後（既存 `remarkPlugins: [remarkMermaid]` を壊さず `rehypePlugins` を追加）:

```js
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMermaid],
		rehypePlugins: [
			[
				rehypeExternalLinks,
				{
					target: '_blank',
					rel: ['noopener', 'noreferrer'],
					content: { type: 'text', value: ' ↗' },
				},
			],
		],
	},
```

- インデントは既存ファイルに合わせ **タブ**（このリポジトリの astro.config.mjs はタブ）。
- `defineConfig` の他フィールド（`redirects`, `integrations`）は一切変更しない。

## 2. rehype-external-links@3 の `content` オプション仕様（重要・要検証あり）

planning doc §6 のコード例は `content: { type: 'text', value: ' ↗' }` と書かれているが、
これは **rehype-external-links@3 の実 API と異なる可能性が高い**。v3 の `content` は
**hast ノード（または hast ノードの配列、もしくはそれを返す関数）** を取り、
リンク要素の**子として末尾に挿入**される。`{ type: 'text', value: ... }` は hast の
text ノードとして妥当だが、v3 の README で標準的に示される指定は **element ノード**
形式である。確実な指定として以下のいずれかを推奨する:

### 2.1 推奨A: text ノード（最小・aria 非対応）

```js
content: { type: 'text', value: ' ↗' },
```

text ノードは hast として valid。アイコン文字 `↗`（U+2197）を本文に直接挿入する。
最小実装で planning doc の例と一致する。スクリーンリーダーは "↗" を読み上げるため
a11y 上はやや冗長だが、MVP としては許容。

### 2.2 推奨B: span element ノード（aria-hidden 付与・a11y 配慮）

視覚的アイコンを装飾として扱い、スクリーンリーダーから隠す場合:

```js
content: {
	type: 'element',
	tagName: 'span',
	properties: { 'aria-hidden': 'true' },
	children: [{ type: 'text', value: ' ↗' }],
},
```

`properties` キーは hast の標準（hastscript 由来）。`aria-hidden` で支援技術から除外。

### 2.3 採用方針

**MVP は推奨A（text ノード）を採用**し、planning doc §6 の確定例と一致させる。
a11y を強化したい場合の推奨B は注記として残す（スコープ拡大は不要）。

### 2.4 実装時の検証義務（developer へ）

- rehype-external-links は未だ `site/node_modules` に存在しない（architect 確認済み）。
  `npm install` 後、`site/node_modules/rehype-external-links/readme.md` および
  `index.d.ts`（型定義）で `content` / `contentProperties` の v3 シグネチャを確認すること。
- v3 で `content` が text ノードを受け付けない／挿入位置が期待と異なる場合は、
  README の例に従って element ノード形式（推奨B）に切り替える。
- いずれの場合も「外部リンク末尾に ↗ を視覚的に付与する」意図は固定。指定形式のみ
  v3 実 API に合わせて調整可とする。

## 3. 外部 / 内部リンク判定（デフォルト動作で確定）

- rehype-external-links のデフォルトは **絶対 URL（`http://` / `https://` を持つ a 要素）
  のみを外部リンクと判定**。相対パス（`./`, `../`, `/en/...`, `#anchor`）は対象外。
- planning doc §5.1 の調査どおり、wiki 本文の内部リンクはすべて相対パス・絶対
  self-domain リンクは 0 件。よって **`test` オプションは不要**、デフォルトのままで
  言語スイッチャ・サイドバー・内部ナビへの誤適用は発生しない。
- `protocols`（デフォルト `['http', 'https']`）も変更不要。

## 4. 実装スコープ注意事項（hero ボタンは対象外）

- splash トップ（`site/src/content/docs/{en,ja}/index.mdx`）の hero アクション
  "View on GitHub"（frontmatter `hero.actions[].link`）は **Markdown 本文ではなく
  frontmatter 定義**であり、Starlight のコンポーネントがレンダリングする。
  → `markdown.rehypePlugins`（rehype-external-links）の処理対象に**含まれない**。
  本対応（rehype プラグイン登録のみ）では hero ボタンは新タブ化されない。
- **MVP スコープは「Markdown 本文中の外部リンク」に限定**（現状 4 箇所、すべて
  `https://github.com/...`: Getting-Started.md / Hooks-Reference.md の en/ja）。
- hero ボタンの新タブ化は別手段（Starlight 設定 / コンポーネント override）が必要で
  あり、本 issue のスコープ外とする。developer はこれをスコープに含めないこと。
- Starlight ヘッダの GitHub アイコン（`social: [...]`）も UI コンポーネント由来で
  対象外（変化しない・要件外）。

## 5. developer 向け検証手順

ブランチ `feat/wiki-external-links-new-tab` 上で作業（main 禁止）。

1. **依存追加**
   ```bash
   cd site
   npm install rehype-external-links@^3.0.0
   ```
   → `site/package.json` の `dependencies` に追加され、`package-lock.json` が更新される。
   コミット対象は `site/astro.config.mjs` + `site/package.json` + `site/package-lock.json`。

2. **設定変更**（§1 の差分を astro.config.mjs に適用）

3. **ビルド成功確認**
   ```bash
   npm run build
   ```
   `prebuild` で `sync-wiki.mjs` が走り `site/src/content/docs/` に同期 → `astro build`。
   エラーなく `site/dist/` が生成されること。

4. **成果物の HTML 検証（grep）**
   - 外部リンク（GitHub）に属性付与を確認:
     ```bash
     grep -rn 'github.com/kirin0198/aphelion-agents' site/dist/ \
       | grep -E 'target="_blank"' | head
     grep -rln 'rel="noopener noreferrer"' site/dist/ | head
     ```
     外部 GitHub リンクに `target="_blank"` と `rel="noopener noreferrer"`、
     および ↗ アイコン（`↗` または `&#x2197;` 等のエンティティ）が付与されていること。
   - 内部リンク不変の確認（相対リンクに target が付かないこと）:
     ```bash
     # 例: サイドバー/言語スイッチャの相対リンクに target=_blank が無いこと
     grep -rn 'href="/en/getting-started' site/dist/ | grep 'target="_blank"'
     # → 何もヒットしないのが期待（内部リンクは新タブ化されない）
     ```

5. **脆弱性スキャン**
   ```bash
   npm audit
   ```
   追加依存に既知の脆弱性が無いことを確認（library-and-security-policy.md）。

## 6. 設計上の決定（再掲・固定事項）

- `rel` は `['noopener', 'noreferrer']` 固定（reverse tabnabbing 対策）。
- `target` は `'_blank'` 固定。
- 外部判定はデフォルト（絶対 URL のみ）。`test` オプション追加は不要。
- ↗ アイコンを `content` で付与（指定形式のみ v3 実 API に合わせ調整可・§2.4）。
- 変更対象は `site/astro.config.mjs` + `site/package.json` + `site/package-lock.json`
  に限定。`docs/wiki/` / `README*.md` / `scripts/sync-wiki.mjs` は変更しない。

## 7. ADR（簡略）

### ADR-001: rehype-external-links 導入（自前 rehype プラグインを採用しない）
- **コンテキスト**: wiki 本文の外部リンクを新タブ化する要件。Astro 6 + Starlight 0.38。
- **決定**: rehype 公式エコシステムの定番プラグイン `rehype-external-links@^3.0.0`
  （MIT / ESM）を `markdown.rehypePlugins` に登録する。
- **根拠**: Starlight が `markdown.rehypePlugins` を公式サポート。hast 系依存は既に
  解決済みで追加負荷最小。自前実装は車輪の再発明。CSS では `target` 制御不可。
- **不採用案**: Starlight component override（過剰・本文リンク捕捉不可）、
  自前 rehype プラグイン（定番ライブラリで足りる要件への過剰実装）。
