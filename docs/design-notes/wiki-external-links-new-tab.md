> Last updated: 2026-05-31
> GitHub Issue: [#158](https://github.com/kirin0198/aphelion-agents/issues/158)
> Authored by: analyst-intake (2026-05-31)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/wiki-external-links-new-tab.md
slug: wiki-external-links-new-tab
branch_name: feat/wiki-external-links-new-tab
issue_url: https://github.com/kirin0198/aphelion-agents/issues/158
issue_number: 158
issue_title: feat: wiki サイト上の外部リンクを新しいタブで開く（rehype-external-links 導入）
issue_type: feature
intake_summary: |
  【背景・症状】
  aphelion-agents.com（Astro 6 + Starlight 0.38）上に公開されている wiki ページ本文中の
  外部リンク（http(s)://他ドメインへのリンク）は、クリックすると現在のタブで遷移する。
  ユーザーは「wiki のバッジ/外部リンクを新しいタブで開きたい」と要望している。
  ※ GitHub README のバッジは GitHub のサニタイザにより target="_blank" は付与不可のため、
  Astro サイト側の対応として対象範囲を整理した。

  【ゴール / 受け入れ条件】
  Starlight サイト（aphelion-agents.com）上の wiki ページに含まれる外部リンクが、
  クリック時に新しいタブ（target="_blank" rel="noopener noreferrer"）で開かれること。
  内部リンク（相対パスや同一ドメイン）は現在のタブのままとする。

  【スコープ】
  site/ ディレクトリ配下の Astro 設定（site/astro.config.mjs）に
  rehype-external-links プラグインを追加する。
  docs/wiki/{en,ja}/*.md 本文は変更不要（プラグインが自動付与）。
  README.md / README.ja.md は Astro サイトに出力されないため対象外。
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# wiki サイト上の外部リンクを新しいタブで開く

## §1 背景・動機

aphelion-agents.com（Astro 6 + @astrojs/starlight 0.38）上の wiki ページには、
外部サービスや参考ドキュメントへのリンクが含まれている。
現状ではこれらのリンクをクリックすると同一タブで遷移し、
ユーザーが読み途中の wiki ページから離脱してしまう。

ユーザー要望は「wiki を表示するバッジについて、新しいタブを開いて表示するようにしたい」
であった。調査・確認の結果、以下の技術的制約と解釈が確定した:

- **GitHub README 上では実現不可**: GitHub の Markdown レンダラーは
  `target="_blank"` 等の HTML 属性をセキュリティのためサニタイズ除去する。
  README のバッジを GitHub 表示で新タブ化する手段は存在しない。
- **README は Astro サイトに出力されない**: `scripts/sync-wiki.mjs` が同期するのは
  `docs/wiki/{en,ja}/*.md` のみ（→ `site/src/content/docs/{en,ja}/`）。
  `README.md` / `README.ja.md` は Starlight ページにならない。
- **真の要望**: 「Starlight サイト（aphelion-agents.com）上のページに含まれる
  外部リンクを、クリック時に新しいタブで開く」が最も自然な解釈。

> **analyst-core 確認事項**: この解釈の妥当性を承認ゲートで確認すること。
> 特に「README のバッジ」ではなく「wiki ページ本文の外部リンク全般」を対象とする
> 方針でユーザーが合意しているかを明示的に確認する。

## §2 ゴール / 受け入れ条件

1. Starlight サイト上のすべての wiki ページで、外部リンク（`http://` または `https://`
   で始まる他ドメインへのリンク）をクリックすると新しいタブで開く。
2. `target="_blank"` に加えて `rel="noopener noreferrer"` が自動付与される
   （セキュリティ要件）。
3. 内部リンク（相対パス、または `aphelion-agents.com` 同一ドメイン）は
   現在のタブのまま遷移する（変更なし）。
4. 既存の wiki コンテンツ（`docs/wiki/{en,ja}/*.md`）の Markdown ファイルを
   個別に書き換える必要がない（プラグインが自動付与）。

## §3 スコープ

**変更対象:**
- `site/astro.config.mjs` — `markdown.rehypePlugins` に `rehype-external-links` を追加
- `site/package.json` — `rehype-external-links` パッケージの依存追加

**変更対象外:**
- `docs/wiki/{en,ja}/*.md` — Markdown ソースは変更不要
- `README.md` / `README.ja.md` — Astro サイトに出力されないため対象外
- `scripts/sync-wiki.mjs` — 同期スクリプトは変更不要

**影響範囲:**
- `site/src/content/docs/` 配下のすべてのページ（wiki コンテンツ）
- ビルド成果物（`site/dist/`）に含まれるすべての HTML ファイルの外部リンク

## §4 制約 / 未解決事項

### 技術的制約
- `rehype-external-links` は ESM パッケージ。`site/astro.config.mjs` が
  ESM 形式（`export default`）であれば問題なし（Astro 6 はデフォルト ESM）。
- Starlight の内部リンクが `rehype-external-links` で誤って対象にならないよう、
  `content` オプションまたは `target` オプションの設定を確認する必要がある。

### 未解決事項
1. **ユーザー解釈の確認**: 「wiki ページ本文の外部リンク全般を新タブ」という
   解釈でよいか、analyst-core の調査フェーズで確認ゲートを設けること。
2. **rehype-external-links のバージョン**: 最新安定版の確認（npm audit 対応）。
3. **Starlight 独自リンク**: Starlight が生成するナビゲーション内部リンクへの
   影響有無を確認する。
4. **プラグイン設定の詳細**: `targetBlank` の対象を外部リンクのみに限定する
   正確なフィルタ条件（デフォルト動作で十分か、または `test` オプションが必要か）。

---

> Updated: 2026-05-31（analyst-core 深掘り分析・方針確定。ユーザー承認済み: 案1 + ↗ アイコン付与）

## §5 深掘り分析（analyst-core）

> 本節は site/ 配下の実コードを調査した結果。方針は承認ゲートを通過し**確定済み**。

### 5.1 現状調査の確定事項

- **astro.config.mjs**: `markdown.remarkPlugins: [remarkMermaid]` のみ定義。
  `markdown.rehypePlugins` は未設定 → 外部リンクはデフォルトで同一タブ遷移。
- **package.json**: `rehype-external-links` は未導入。hast 系ユーティリティ
  （`hast-util-*`, `hastscript` 等）は Astro/Starlight の依存として
  `site/node_modules` に既に解決済み → 追加導入による依存ツリー肥大は最小。
- **wiki 本文の外部リンク総数**: わずか 4 件（いずれも `https://github.com/...`）。
  - `docs/wiki/{en,ja}/Getting-Started.md`（package.json への GitHub リンク）
  - `docs/wiki/{en,ja}/Hooks-Reference.md`（リポジトリ root への GitHub リンク）
  これらは Markdown 本文であり `markdown.rehypePlugins`（rehype-external-links）
  の適用対象 → 確実に新タブ化される（MVP の確実な範囲）。
- **wiki 本文の絶対 self-domain リンク**: 0 件。内部リンクはすべて相対パス
  → `rehype-external-links` のデフォルト外部判定（絶対 URL のみ外部扱い）で
  内部リンクが誤検出されるリスクは無い。
- **ヘッダの GitHub アイコンリンク**（`social: [{ icon: 'github', href: ... }]`）は
  Starlight の UI コンポーネント由来であり **Markdown 本文ではない**。
  `markdown.rehypePlugins` の適用対象外 → 本対応では変化しない（要件外）。
- **splash トップの hero アクション "View on GitHub"**
  （`site/src/content/docs/{en,ja}/index.mdx` の frontmatter
  `hero.actions[].link: https://github.com/kirin0198/aphelion-agents`,
  `icon: external`）は **frontmatter の hero 定義であり Markdown 本文ではない**。
  Starlight のコンポーネントがレンダリングするため、
  `markdown.rehypePlugins`（rehype-external-links）の**適用対象外になる可能性が高い**。
  → この hero ボタンを新タブ化したい場合は別手段（Starlight の設定 or
  コンポーネント override）が必要。**MVP の確実な範囲には含めず**、
  実装時の追加検証事項とする（§8 に明記）。
- **splash 本文の CardGrid 内リンク**は全て相対リンク（`/en/...` 等）= 内部リンク
  のため対象外（正しく非対象）。

### 5.2 実装方式の比較

| 案 | 内容 | 評価 |
|----|------|------|
| **案1（推奨）** | `rehype-external-links` を `site/package.json` に追加し、`astro.config.mjs` の `markdown.rehypePlugins` に登録。`target="_blank"` / `rel=["noopener","noreferrer"]` を付与 | Astro 6 / Starlight 0.38 の標準サポート機構。最小変更・実績豊富 |
| 案2 | Starlight component override または CSS のみ | CSS では `target` を制御不可。component override は過剰かつ本文リンクを捕捉できない → **不採用** |
| 案3 | 自前 rehype プラグイン（hast ツリー走査で a 要素を判定） | 定番ライブラリで足りる要件に対し車輪の再発明 → **不採用** |

→ **案1 を推奨。** 互換性評価:
- `rehype-external-links@3.0.0`（最新安定版・MIT・ESM `type: module`）。
- Starlight 0.38 / Astro 6 はともに ESM・hast パイプラインで動作。
  `astro.config.mjs` は `export default`（ESM）なので import 形式で問題なし。
- Starlight 公式も `markdown.rehypePlugins` 経由の rehype プラグイン追加を
  公式サポート対象として明記している。

### 5.3 外部 / 内部リンク判定

- `rehype-external-links` はデフォルトで **絶対 URL（`http://` / `https://` を持つ）**
  を外部リンクと判定し、相対リンク（`./`, `../`, `/en/...`）は対象外。
- 5.1 の調査どおり wiki 内部リンクはすべて相対パスのため、Starlight の
  言語スイッチャ・サイドバーナビ・内部リンクへの誤適用は発生しない。
- なお Starlight ナビゲーション要素は Markdown 本文ではない（5.1 末尾）ため、
  そもそも `markdown.rehypePlugins` の処理対象に含まれない。

### 5.4 セキュリティ / UX

- **セキュリティ**: `target="_blank"` には reverse tabnabbing 対策として
  `rel="noopener noreferrer"` を必ず付与する（`library-and-security-policy.md`
  の観点でも妥当）。案1 のプラグインオプションで `rel: ['noopener', 'noreferrer']`
  を明示指定する。
- **a11y / UX（承認確定）**: 新しいタブで開く旨を視覚的に示すため、外部リンク
  アイコン `↗` を **付与する（確定）**。`rehype-external-links` の `content`
  オプションで外部リンクにアイコンを表示する。これにより、リンクが別タブで開く
  ことをユーザーが事前に認識でき、a11y 上も望ましい。

### 5.5 依存追加の妥当性（library-and-security-policy.md 採用基準）

| 基準 | 評価 |
|------|------|
| 標準ライブラリ優先 | rehype 公式エコシステムの定番プラグイン。自前実装より適切 |
| メンテナンス | rehype/unified 公式 org 管理。安定版 3.0.0 |
| 採用実績 | remark/rehype エコシステムの de-facto standard |
| 既知の脆弱性 | なし（追加後 `npm audit` で確認すること） |
| ライセンス | MIT（プロジェクトと互換） |
| 依存ツリー深さ | hast 系依存は既に解決済み。追加負荷は最小 |

→ 採用基準を満たす。**案1 採用が妥当。**

## §6 方針（確定 / ユーザー承認済み）

> 承認ゲートを通過。以下が確定方針（案1 + ↗ アイコン付与）。

1. `site/package.json` の `dependencies` に `rehype-external-links@^3.0.0` を追加。
2. `site/astro.config.mjs` で `rehype-external-links` を import し、
   `markdown.rehypePlugins` に以下相当を登録:
   ```js
   import rehypeExternalLinks from 'rehype-external-links';
   // ...
   markdown: {
     remarkPlugins: [remarkMermaid],
     rehypePlugins: [
       [
         rehypeExternalLinks,
         {
           target: '_blank',
           rel: ['noopener', 'noreferrer'],
           content: { type: 'text', value: ' ↗' }, // 外部リンクアイコン（確定）
         },
       ],
     ],
   },
   ```
   ※ `content` の具体的な指定形式（テキスト `↗` か hast ノードか）は実装時に
   `rehype-external-links@3` の API に合わせて調整する。意図は「外部リンクに
   ↗ アイコン（外部リンクであることを示す視覚的マーカー）を付与する」こと。
3. 外部リンクアイコン（`content`）を **付与する（確定）**。
4. `docs/wiki/{en,ja}/*.md` / `README*.md` / `scripts/sync-wiki.mjs` は変更しない。

## §7 ドキュメント変更（確定）

- SPEC.md: 対象外（本プロジェクトに SPEC.md は不在。ドキュメントサイト設定の変更でアプリ仕様変更ではない）。
- UI_SPEC.md: 対象外（不在）。
- ARCHITECTURE.md: 対象外（不在）。本対応はサイトビルド設定の追加であり、設計ドキュメント更新を伴わない。

## §8 architect への引き継ぎ（確定）

> 本プロジェクトには ARCHITECTURE.md が存在せず、変更は
> `site/astro.config.mjs` の rehype プラグイン登録 + 依存 1 件追加に閉じる
> 小規模対応。architect が扱う設計ドキュメント更新は無い。

- 実装タスク（architect → developer 想定）:
  1. `cd site && npm install rehype-external-links@^3.0.0`（依存追加）
  2. `astro.config.mjs` の `markdown` に `rehypePlugins` を追加し、
     `target: '_blank'`, `rel: ['noopener','noreferrer']`, `content`（↗ アイコン）
     を指定（§6.2）
  3. `npm run build` でビルド成功を確認、`site/dist/` の wiki ページ HTML で
     外部 GitHub リンクに `target="_blank" rel="noopener noreferrer"` と
     ↗ アイコンが付与され、内部相対リンクには付与されない（不変）ことを検証
  4. `npm audit` で追加依存に脆弱性がないことを確認
- 設計上の制約・決定:
  - rel は `noopener noreferrer` 固定（tabnabbing 対策）。
  - ↗ アイコンを付与する（`content` オプション・確定方針）。
  - 内部判定はデフォルト（絶対 URL のみ外部）。test オプション追加は不要。
  - Starlight ヘッダの GitHub アイコンは対象外（Markdown 本文でないため）。
- **実装時の追加検証事項（重要・hero ボタン）:**
  - splash トップの hero アクション "View on GitHub"
    （`site/src/content/docs/{en,ja}/index.mdx` の frontmatter `hero.actions`）は
    **frontmatter の hero 定義であり Markdown 本文ではない**ため、
    `markdown.rehypePlugins`（rehype-external-links）では**効かない可能性が高い**。
  - MVP の確実な範囲は「Markdown 本文の外部リンク（現状 4 箇所）を ↗ アイコン付き
    で新タブ化」とする。
  - hero ボタンをスコープに含めるかは実装時に判断する。含める場合は別手段
    （Starlight の設定 / コンポーネント override 等）が必要になる点を実装時に検証
    すること。rehype プラグイン登録だけでは hero ボタンは新タブ化されない見込み。

## §9 承認ゲート（Step 3 / テキスト整理・承認待ち）

> サブエージェントでは AskUserQuestion を使用できないため、承認質問はテキストで整理する。
> オーケストレーターがユーザー承認を取得する。

**[承認済み — 2026-05-31]**

承認結果:
- 対象 = Starlight サイト（aphelion-agents.com）上の wiki ページ本文の外部リンク全般。
- 外部リンクアイコン `↗` を **付与する**（`content` オプション）。
- README.md / README.ja.md の Wiki バッジは GitHub の Markdown サニタイザで
  `target="_blank"` 不可のため対象外（issue に明記）。
- 実装方式 = 案1（rehype-external-links 導入 + markdown.rehypePlugins 登録）。

**[当初の承認待ち質問・整理]**

```
イシュー分析完了

[イシュー種別] 機能追加（feature）
[イシュー要約] aphelion-agents.com（Astro 6 + Starlight 0.38）の wiki ページ本文中の
  外部リンクを、target="_blank" rel="noopener noreferrer" で新しいタブで開くようにする。

[分析結果]
  - wiki 本文の外部リンクは 4 件のみ（すべて github.com への絶対 URL）。
  - 内部リンクはすべて相対パス → 外部判定の誤検出リスクなし。
  - astro.config.mjs は rehypePlugins 未設定。hast 系依存は導入済みで追加負荷最小。
  - Starlight ヘッダの GitHub アイコンは Markdown 本文でないため対象外（要件にも含まれない）。

[方針（案）]
  - rehype-external-links@^3.0.0（MIT/ESM/定番）を site/package.json に追加。
  - astro.config.mjs の markdown.rehypePlugins に
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener','noreferrer'] }] を登録。
  - 外部リンクアイコン（content オプション）は初期実装では付与しない。
  - docs/wiki/ / README*.md / sync-wiki.mjs は変更しない。

[確認したい点]
  1. 対象は「README のバッジ」ではなく「Starlight サイト上の wiki ページ本文の
     外部リンク全般」で合っているか（バッジは GitHub README 固有でサイトに存在しない）。
  2. 外部リンクアイコン（↗）の付与は不要（target/rel のみ）でよいか。

[ドキュメント変更]
  - SPEC.md / UI_SPEC.md / ARCHITECTURE.md: いずれも不在のため変更なし。

[GitHub Issue] #158（承認後に gh issue edit で方針確定を反映）
  - ラベル: enhancement

[architect への引き継ぎ]
  site/astro.config.mjs への rehypePlugins 追加 + 依存 1 件追加に閉じる小規模対応。
  設計ドキュメント更新なし。
```
