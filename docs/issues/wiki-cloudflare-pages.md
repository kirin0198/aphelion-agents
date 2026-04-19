> 最終更新: 2026-04-19
> 更新履歴:
>   - 2026-04-19: 初版作成（方針書。issue #TBD に対応）
>   - 2026-04-19: prebuild フック追加によりビルドコマンド簡略化、Node 22 に更新 (Astro 6 要件)

# Wiki を Cloudflare Pages で公開（MVP）

## ユーザー要件

- `docs/wiki/` ディレクトリ配下（`docs/wiki/en/*.md`, `docs/wiki/ja/*.md`）を Single Source of Truth (SSOT) とし、Aphelion プロジェクトのドキュメントサイトとして Cloudflare Pages 上で公開したい。
- 公開物はデザインが整った静的サイトであること。ロゴ（`docs/images/aphelion-logo.png`）をヘッダーに配置し、ロゴから抽出したカラースキームを採用する。
- 英語 / 日本語の i18n 切替、全文検索、Mermaid 図の表示など、開発者向けドキュメントサイトに必要な機能を備える。
- 初期リリースでは最小機能（MVP）を優先し、Hero セクションやカスタムコンポーネントなど装飾系は別 issue で段階的に追加する。

## issue 分類

**feature**（機能追加）

既存 SCOPE には含まれていない新規のドキュメント公開サイト（`site/`）を追加する。既存の `docs/wiki/` は変更しない。

## 決定事項（ユーザー承認済み）

| 項目 | 決定 |
|------|------|
| SSG | **Astro Starlight** |
| wiki 利用方式 | **ビルド時コピー + frontmatter 自動付与**。SSOT は `docs/wiki/` のまま。`scripts/sync-wiki.mjs` が `docs/wiki/en/*.md`, `docs/wiki/ja/*.md` を `site/src/content/docs/` へ変換・コピーする |
| カラースキーム | **ロゴから抽出し CSS 変数化**。`docs/images/aphelion-logo.png` から主要色をサンプリングし、`site/src/styles/custom.css` 内で CSS 変数として定義。light / dark 両対応 |
| 初期スコープ | **段階リリース**。MVP を先に公開し、Hero セクションなどのカスタムコンポーネントは別 issue で後続対応 |

## MVP スコープ（今回 issue で実装）

1. **Astro Starlight プロジェクトのセットアップ** — `site/` 配下に `npm create astro@latest -- --template starlight` で雛型生成
2. **同期スクリプト** — `scripts/sync-wiki.mjs` を作成。`docs/wiki/en/*.md`, `docs/wiki/ja/*.md` を `site/src/content/docs/en/`, `site/src/content/docs/ja/` にコピーし、Starlight 互換の frontmatter (`title`, `description`) を自動付与
3. **ロゴ配置** — `docs/images/aphelion-logo.png` を `site/src/assets/logo.png` として配置し、Starlight の `logo` 設定でヘッダーに表示
4. **カラースキーム** — ロゴから主要色をサンプリングし、`site/src/styles/custom.css` に CSS 変数化（primary / accent / bg / text）。light / dark 両対応
5. **i18n** — Starlight の locale 機能で en / ja 切替（`locales: { en: { label: 'English', lang: 'en' }, ja: { label: '日本語', lang: 'ja' } }`）
6. **サイドバー** — 自動生成もしくは `astro.config.mjs` 内に明示定義
7. **検索** — Starlight 組み込みの Pagefind ベースの全文検索を有効化
8. **Cloudflare Pages デプロイ設定** — ビルドコマンド・出力ディレクトリ・Node バージョンを定義

## 後続 issue（今回スコープ外）

- Hero セクション、Agent カードなどのカスタムコンポーネント
- アニメーション
- カスタムドメイン設定（ユーザー作業）
- Analytics
- Algolia DocSearch 連携
- OG 画像の自動生成
- RSS / sitemap 等の SEO 周りの拡張

## リポジトリ構成案

```
aphelion-agents/
├── docs/wiki/                              # SSOT（変更禁止 / 今回スコープ外）
│   ├── en/*.md
│   └── ja/*.md
├── site/                              # 新規: Astro Starlight プロジェクト
│   ├── astro.config.mjs
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── public/                        # 静的アセット
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.png               # docs/images/aphelion-logo.png から配置
│   │   ├── content/
│   │   │   ├── config.ts              # Starlight content collection 定義
│   │   │   └── docs/                  # sync-wiki.mjs による出力先
│   │   │       ├── en/*.md            # docs/wiki/en からのコピー（frontmatter 付与済み）
│   │   │       └── ja/*.md            # docs/wiki/ja からのコピー（frontmatter 付与済み）
│   │   └── styles/
│   │       └── custom.css             # ロゴ由来の CSS 変数
│   └── dist/                          # ビルド成果物（.gitignore）
├── scripts/
│   ├── generate.py                    # 既存: .claude → platforms 同期
│   └── sync-wiki.mjs                  # 新規: docs/wiki/ → site/src/content/docs/ 変換
└── docs/
    └── issues/
        └── wiki-cloudflare-pages.md   # 本ファイル
```

**.gitignore 追記対象:**
- `site/dist/`
- `site/node_modules/`
- `site/.astro/`

## Cloudflare Pages 設定

| 項目 | 値 |
|------|---|
| Framework preset | Astro |
| Build command | `cd site && npm ci && npm run build` |
| Build output directory | `site/dist` |
| Root directory | リポジトリルート（`/`） |
| Node.js version | 22 |
| Environment variables | 現時点で不要 |

`wrangler.toml` は作成しない（Pages ダッシュボード設定で完結させる）。

## scripts/sync-wiki.mjs の仕様

**入力:** `docs/wiki/en/*.md`, `docs/wiki/ja/*.md`
**出力:** `site/src/content/docs/en/*.md`, `site/src/content/docs/ja/*.md`

**変換ルール:**
- 各 markdown ファイルに Starlight 互換の frontmatter を自動付与する
  - `title`: ファイル先頭の `# <見出し>` から抽出（存在しない場合はファイル名から生成）
  - `description`: 本文の冒頭段落から先頭 150 文字程度を抽出（存在しない場合は省略可）
- `> **Last updated**: ...` ブロックは本文に残す
- Mermaid コードブロック（```mermaid ... ```）はそのまま保持（Starlight の Expressive Code もしくは `@astrojs/starlight` 互換の mermaid プラグインで対応）
- `<!-- source: ... -->` 等の HTML コメントは改変せず保持
- 既に frontmatter が存在する場合は上書きせず、欠落キーのみ補完する
- 出力ディレクトリが存在しない場合は作成、既存ファイルは上書き

**実行:**
- ローカル: `node scripts/sync-wiki.mjs`
- Cloudflare Pages: ビルドコマンド内で `node ../scripts/sync-wiki.mjs` として実行

## scaffolder / developer 向けブリーフ

### scaffolder の担当

1. `site/` ディレクトリに Astro Starlight 雛型を生成
   - `npm create astro@latest site -- --template starlight --typescript strict --install --no-git`
   - 生成後、`site/package.json` の `name`, `description` をプロジェクトに合わせる
2. `site/astro.config.mjs` に i18n 設定を記述
   - `locales: { en: { label: 'English', lang: 'en' }, ja: { label: '日本語', lang: 'ja' } }`
   - `defaultLocale: 'en'`
   - `logo: { src: './src/assets/logo.png' }`
   - `customCss: ['./src/styles/custom.css']`
3. ロゴ配置: `docs/images/aphelion-logo.png` を `site/src/assets/logo.png` にコピー（元ファイルは残す）
4. `site/src/styles/custom.css` を作成し、ロゴから手作業でサンプリングした主要色を CSS 変数として定義（primary / accent / bg / text 等）。light / dark 両対応。自動抽出ツールは不要
5. `scripts/sync-wiki.mjs` を実装（上記仕様に従う）
6. `.gitignore` に `site/dist/`, `site/node_modules/`, `site/.astro/` を追記
7. README もしくは `site/README.md` に起動手順を記載（`cd site && npm install && node ../scripts/sync-wiki.mjs && npm run dev`）

### developer の担当（scaffolder 完了後）

1. `sync-wiki.mjs` の動作確認とテスト（`docs/wiki/` の全ファイルがエラーなく `site/src/content/docs/` 配下にコピーされ、`npm run build` が成功する）
2. Starlight サイドバーの明示定義または自動生成設定の調整
3. Pagefind 検索の有効化確認
4. Cloudflare Pages 用ビルドコマンドでローカル再現
   - `cd site && npm ci && node ../scripts/sync-wiki.mjs && npm run build`
   - `site/dist/` の中身を確認

### コミット戦略（scaffolder / developer 判断）

段階的に複数コミットに分割することを推奨：

1. `chore: scaffold astro starlight project under site/`
2. `feat: add sync-wiki script for wiki to starlight conversion`
3. `chore: place aphelion logo asset and custom css variables`
4. `feat: enable i18n (en/ja) in starlight config`
5. `ci: add cloudflare pages build configuration notes`
6. `chore: ignore site build artifacts`

## スコープ外の明示

- `docs/wiki/` 配下の変更（SSOT として今回は一切触らない）
- `platforms/copilot/`, `platforms/codex/` への影響調整（独立）
- `scripts/generate.py` との統合（両スクリプトは独立稼働。`generate.py` は `.claude → platforms`、`sync-wiki.mjs` は `wiki → site`）
- Hero セクション / カスタムコンポーネント / アニメーション
- カスタムドメイン / Analytics / Algolia DocSearch
- SPEC.md / ARCHITECTURE.md の作成（本 issue はドキュメント公開インフラのため、ユーザー承認済み方針に従い作成しない）
- PR 作成（現フェーズでは方針書のコミット / push のみ）

## 関連

- GitHub issue: https://github.com/kirin0198/aphelion-agents/issues/11
- ブランチ: `feat/wiki-cloudflare-pages`
- 先行 issue: `feat/wiki-architecture-diagrams`（mermaid 図の追加。マージ済み / 参考）
