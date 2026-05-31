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
