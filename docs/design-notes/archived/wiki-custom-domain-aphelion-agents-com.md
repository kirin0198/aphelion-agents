> Last updated: 2026-04-30
> GitHub Issue: [#84](https://github.com/kirin0198/aphelion-agents/issues/84)
> Analyzed by: analyst (2026-04-29)
> Implemented by: developer (2026-04-30)
> PR: chore/wiki-custom-domain → main

# Wiki カスタムドメイン移行（aphelion-agents.com）

## 1. Problem statement

公開済みの Wiki サイトは Cloudflare Pages のデフォルトドメイン
`https://aphelion-agents.pages.dev/` で配信されていた。利用者がカスタムドメイン
`aphelion-agents.com` を取得し、Cloudflare Pages 側にバインドしたため、
リポジトリ内の「外部に晒す URL」を新ドメインに揃える必要がある。

ユーザー要望（原文）:

> wiki のページについて、カスタムドメインを取得しました。
> aphelion-agents.com で登録したので、バッジとリンクの記載を更新してください。

DNS 設定および Cloudflare Pages 側のカスタムドメインバインドはユーザーが
ダッシュボードで完了済みである前提（本 design note の対象外）。本 PR は
リポジトリ内のドキュメント／メタデータの URL 表記を更新するのみ。

## 2. Current state

`grep -rn "aphelion-agents\.pages\.dev"` の結果（2026-04-29 時点）:

ライブ参照（更新対象）:

| File | Line | 現在の内容（抜粋） |
| --- | --- | --- |
| `package.json` | 11 | `"homepage": "https://aphelion-agents.pages.dev/",` |
| `README.md` | 5 | `[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.pages.dev-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.pages.dev/)` |
| `README.ja.md` | 5 | `[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.pages.dev-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.pages.dev/)` |

アーカイブ済み（**更新しない**。`docs/wiki/en/Contributing.md` のアーカイブ
ポリシーにより読み取り専用）:

| File | Line |
| --- | --- |
| `docs/design-notes/archived/drop-platforms.md` | 422 |
| `docs/design-notes/archived/readme-readability-wiki-links.md` | 24, 187 |

その他の確認:

- `docs/wiki/` 配下に `pages.dev` 参照は無い（`aphelion-agents` は GitHub リポジトリ
  URL としての出現のみ）。
- `site/`、`.github/workflows/` 配下にハードコードされたドメイン参照は無い。
- `wrangler.toml` / `cloudflare.json` は存在しない。
- 新ドメイン `aphelion-agents.com` のリポジトリ内既存参照はゼロ（新規導入）。

## 3. Constraints

- **アーカイブ済み design note は更新しない。** `Contributing.md` のアーカイブ
  ポリシー（read-only）に従う。歴史的記録としての URL は当時の事実なのでそのまま
  保持する。
- **DNS／Cloudflare Pages カスタムドメイン設定はスコープ外。** ユーザーが
  Cloudflare ダッシュボードで完了済みである前提。本変更はリポジトリ内ドキュメント
  の URL 表記更新のみ。
- **バージョンバンプ不要。** 変更対象は `.claude/` 配下を含まないため、`package.json`
  の `version` フィールドは据え置き（`homepage` のみ更新）。`CHANGELOG.md` への
  記載要否は project policy に従う（本 issue の作業範囲外と判断）。
- **正規 URL のトレーリングスラッシュ運用を踏襲。** 既存の `pages.dev/` は末尾
  スラッシュ付きで統一されているため、`aphelion-agents.com/` も末尾スラッシュ
  付きで揃える（バッジリンク・`homepage` の両方）。
- **README 同期規約。** `README.md` と `README.ja.md` はバッジ行が完全に同形。
  片方だけ更新する状態を作らない。

## 4. Goals & success criteria

Goals:

- リポジトリ内のライブ参照 3 箇所の URL を `https://aphelion-agents.com/` に
  揃える。
- バッジのラベル文字列を新ドメインに揃え、シールド画像が正しく再生成される
  ことを確認する。
- アーカイブ済み design note は触らない。

Success criteria:

- `grep -rn "aphelion-agents\.pages\.dev"` の結果が `docs/design-notes/archived/`
  配下のみとなる（ライブ参照ゼロ件）。
- `grep -rn "aphelion-agents\.com"` で `package.json` / `README.md` / `README.ja.md`
  の 3 件がヒットする。
- `README.md` と `README.ja.md` のバッジ行が文字列レベルで一致する（言語切替の
  本文以外は同一）。
- バッジ画像が GitHub 上で正しく描画される（shields.io 側のキャッシュ更新は
  ラベル変更により自動的に発火）。

## 5. Approach

### バッジラベルは新ドメインに合わせて差し替える

`Wiki-aphelion--agents.pages.dev` → `Wiki-aphelion--agents.com` に変更する。

理由:

- バッジは「Wiki がここにある」という到達経路を示すものであり、表示文字列が
  リンク先と乖離するのは README の信頼性を損なう。
- shields.io の画像 CDN キャッシュはラベル文字列が URL の一部に組み込まれて
  いるため、ラベル変更は自動的にキャッシュキーの再生成になり、無駄な手動
  パージが不要。
- 視覚的継続性は色（`F38020`）とロゴ（`cloudflarepages`）で十分維持される。

### バッジロゴ `logo=cloudflarepages` は据え置く

理由:

- カスタムドメインはユーザー向けの正規 URL を変えるだけで、配信基盤は引き続き
  Cloudflare Pages である。ロゴが嘘になっていない。
- 「どの基盤にホストされているか」を伝える情報量は引き続き有用（contributor が
  デプロイ手順を辿る際の手がかりになる）。
- 別ロゴ（`readthedocs` / `mdbook` 等）に切り替える積極的な理由が無い。

ただし「ロゴが基盤を露出させるのが嫌だ」という要望が来た場合は §7 の Open
question として再検討する。

### `package.json` `homepage` は新 URL に差し替え、トレーリングスラッシュも維持

`"homepage": "https://aphelion-agents.com/"`。npm メタデータとして読まれる
フィールドのため、バッジリンクと同じ正規形にする。

### 旧ドメインからのリダイレクトはスコープ外

ユーザーが Cloudflare Pages ダッシュボード側で扱う事項であり、本 PR では
ドキュメント変更のみに留める。設計上の前提として §3 に記載済み。

## 6. Document changes

### `package.json`

```diff
-  "homepage": "https://aphelion-agents.pages.dev/",
+  "homepage": "https://aphelion-agents.com/",
```

### `README.md`（5 行目）

```diff
-[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.pages.dev-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.pages.dev/)
+[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.com-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.com/)
```

### `README.ja.md`（5 行目）

```diff
-[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.pages.dev-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.pages.dev/)
+[![Wiki](https://img.shields.io/badge/Wiki-aphelion--agents.com-F38020?logo=cloudflarepages&logoColor=white&style=flat)](https://aphelion-agents.com/)
```

注: 旧ラベルでは `aphelion--agents.pages.dev` のように `--`（エンコード後は
`-`）で区切られていた。新ラベルではドメインに `-` が一箇所しか含まれず
shields.io のエスケープ規則に合わせて `aphelion--agents.com` とする
（`--` → `-` に展開される）。

### 触らないもの

- `docs/design-notes/archived/drop-platforms.md`（422 行目の歴史的言及）
- `docs/design-notes/archived/readme-readability-wiki-links.md`（24, 187 行目の
  歴史的言及）
- `docs/wiki/` 配下（旧ドメイン参照は存在しない）
- `.github/workflows/`（旧ドメイン参照は存在しない）
- `package.json` の `version` フィールド（`.claude/` を触らないため）

## 7. Open questions

| # | 内容 | 推奨 | 実装前にユーザー判断必要か |
| --- | --- | --- | --- |
| Q1 | バッジラベルを `Wiki-aphelion--agents.com` に変更してよいか？（旧 `pages.dev` 表記を残す選択肢もある） | 変更する（§5 参照） | 不要（推奨どおり進める） |
| Q2 | バッジロゴ `logo=cloudflarepages` を維持してよいか？（基盤露出が嫌なら `logo=readthedocs` 等に変更可能） | 維持 | 不要（推奨どおり進める） |
| Q3 | 旧 `aphelion-agents.pages.dev` から新ドメインへのリダイレクト方針を README/wiki に明記すべきか？ | 不要。Cloudflare 側で透過的にハンドルされる前提なら README で触れる必要はない | **要確認**: 利用者向けに「旧 URL を bookmark している人へのガイド」を README/wiki に追加する意図があるか |
| Q4 | `CHANGELOG.md` に本変更を記載するか？ | 任意（コード変更ではないため省略可） | **要確認**: project の CHANGELOG 運用ポリシー次第 |

Q1/Q2 は §5 の推奨どおり実装すれば問題ない（auto mode で進められる）。
Q3/Q4 のみ、実装着手前にユーザー判断が望ましい。

### 決定事項（2026-04-30）

- **Q3**: 2026-04-30 決定: 追加しない。Cloudflare Pages 側でリダイレクトを透過的に処理するため README/wiki への記載不要。
- **Q4**: 2026-04-30 決定: 追加しない。コード変更を伴わないため CHANGELOG への記載を省略。

## 8. Handoff brief for developer

**目的**: リポジトリ内のライブ参照 3 箇所を `aphelion-agents.com` に揃える。

**作業手順**:

1. ブランチ作成: `chore/wiki-custom-domain-aphelion-agents-com`（または同等の名前）。
2. 以下 3 ファイルを §6 の diff どおりに編集する:
   - `package.json`（11 行目の `homepage` を `https://aphelion-agents.com/` に）
   - `README.md`（5 行目のバッジを §6 の diff どおりに）
   - `README.ja.md`（5 行目のバッジを §6 の diff どおりに）
3. 検証:

   ```bash
   grep -rn "aphelion-agents\.pages\.dev"
   # 期待結果: docs/design-notes/archived/ 配下のヒットのみ
   #   - docs/design-notes/archived/drop-platforms.md:422
   #   - docs/design-notes/archived/readme-readability-wiki-links.md:24,187

   grep -rn "aphelion-agents\.com"
   # 期待結果: 3 件
   #   - package.json:11
   #   - README.md:5
   #   - README.ja.md:5
   ```

4. README の差分を `git diff README.md README.ja.md` で確認し、両ファイルが
   バッジ行で完全一致していることを目視確認する。
5. コミットメッセージ案: `chore: switch wiki references to aphelion-agents.com custom domain (#<issue>)`。
6. アーカイブ済み design note（`docs/design-notes/archived/` 配下）は **絶対に
   触らない**。
7. `package.json` の `version` フィールドは据え置き（`.claude/` 配下を変更
   していないため）。
8. PR 作成後、GitHub 上で README のバッジ画像が新ラベル `aphelion-agents.com`
   で正しく描画されることを確認する（shields.io キャッシュは自動更新）。

**スコープ外**:

- DNS 設定変更
- Cloudflare Pages のカスタムドメインバインド
- 旧ドメインからのリダイレクト設定
- `CHANGELOG.md` 更新（Q4 でユーザー判断が必要）
