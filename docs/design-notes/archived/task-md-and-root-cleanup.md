# refactor: clean up TASK.md placeholder, ISSUE.md residue, and other root-directory clutter

> Reference: current `main` (HEAD `0c1b527`, 2026-04-29)
> Created: 2026-04-29
> Last updated: 2026-04-29
> GitHub Issue: [#80](https://github.com/kirin0198/aphelion-agents/issues/80)
> Analyzed by: analyst (2026-04-29)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> Next: developer (実装フェーズで `docs/design-notes/<slug>.md` に従って削除・ルール調整を行う)

---

## 1. Problem statement

ユーザは「`TASK.md` は現状使用されていないため不要なら削除したい。同様にリポジトリ ルートに残っている使われていないファイルも整理したい」と要望している。

実態を確認した結果、ルート直下には以下のような状態の残留物が混在しており、新規貢献者がリポジトリを開いた際に *「これは生きたファイルか／死んだファイルか」* を即座に判別できない状況になっている。

- 仕様上は使われるはずだが「現在のタイミングでは中身が空」のプレースホルダ（`TASK.md`）
- 仕様上は既に廃止されたが「ファイルだけが消し忘れられて残っている」明確な残骸（`ISSUE.md`）
- gitignore された個人ローカル状態に対応する空のディレクトリ（`.claude/worktrees/`）

これらを「不要であれば消す」「不要ではないなら *なぜ残しているのか* を仕様側に書く」のどちらかに揃えることが本タスクの趣旨である。なお、ユーザの当初の前提（`TASK.md` は未使用 → 即削除）は **部分的に誤り** であり、調査結果に基づく方針修正を §5 に記載する。

---

## 2. Current state

### 2.1 ルート直下のファイル一覧（調査時点）

`find . -maxdepth 1 -type f` の結果:

| ファイル | 種別 | 判定 | 根拠 |
|---|---|---|---|
| `.gitignore` | 標準 | keep | Git 標準。中身も #31 のテンプレート分離方針を反映済み |
| `LICENSE` | 標準 | keep | OSS 標準 |
| `README.md` / `README.ja.md` | 標準 | keep | プロジェクト入口（バイリンガル） |
| `CHANGELOG.md` | 標準 | keep | リリースノート、`v0.3.3` まで記載済み |
| `package.json` | 標準 | keep | npm パッケージ メタデータ |
| `docker-compose.yml` | 標準 | keep | Wiki サイトのローカルビルド スタック（用途は冒頭コメントで明示済み） |
| **`TASK.md`** | プロジェクト固有 | **要審議** | §2.2 で詳述 |
| **`ISSUE.md`** | プロジェクト固有 | **削除推奨** | §2.3 で詳述 |

### 2.2 `TASK.md` の実態

- **ファイル内容（現在）**: ヘッダ 1 行と HTML コメント `<!-- 次のdeveloperセッション開始時にここにタスクを記載してください -->` のみ。事実上空のプレースホルダ。
- **仕様上の位置付け**: `src/.claude/rules/document-versioning.md` の `## TASK.md Format` / `## TASK.md Lifecycle`、および `.claude/agents/developer.md` 全体で *正規の進捗管理ファイル* として定義されている。
- **参照箇所（active な canonical sources のみ）**:
  - `src/.claude/rules/document-versioning.md` (5 箇所)
  - `src/.claude/rules/git-rules.md` (3 箇所)
  - `src/.claude/rules/library-and-security-policy.md` (1 箇所)
  - `.claude/agents/developer.md` (15 箇所)
  - `.claude/agents/delivery-flow.md` (1 箇所)
  - `docs/wiki/{en,ja}/Rules-Reference.md` / `Agents-Delivery.md` / `Getting-Started.md` (合計 16 箇所)
- **git 履歴上の利用実績**:
  - 追加: `927795d feat: add sandbox capability (#7)`
  - 過去のリセット コミット: `b8b3a2c chore: reset TASK.md and document phase-completion lifecycle (#16)` — このコミットでルール側に「フェーズ完了時は空テンプレートに戻す」というライフサイクルが明文化された。
- **結論**: ファイル自体は「現フェーズ非実行中の placeholder 状態」であり、ルール上の正規の状態である。**単純削除は不可**。ただし「placeholder をリポジトリにコミットする運用」自体に対しては §5 で再検討する。

### 2.3 `ISSUE.md` の実態

- **ファイル内容**: 旧 analyst が `feat: add wiki for agent/rule/platform references` 用に書いた issue 草稿（2026-04-18 作成、ja narrative 約 190 行）。
- **仕様上の位置付け**: **既に廃止されている**。
  - `.claude/agents/analyst.md:265` に `"All analysis results and approach details are recorded in the GitHub Issue body and in docs/design-notes/<slug>.md. **No local ISSUE.md file is created.**"` と明記されている。
  - 廃止コミット: `9c2b200 refactor: replace ISSUE.md file management with GitHub Issues`。
- **active な参照箇所**: `.claude/agents/analyst.md` の上記 1 行（「作成しない」と否定する記述）のみ。それ以外に書き手も読み手も存在しない。
- **結論**: 純粋な消し忘れ残骸。**安全に削除可能**。

### 2.4 `.claude/worktrees/`

- **状態**: 空のディレクトリ。git にトラッキングされておらず、`git log` 上に存在しない。
- **参照**: 全 canonical sources をスキャンしてもヒット 0 件。
- **結論**: 個人開発時に作られた未追跡の空ディレクトリ。git 管理対象外なので「リポジトリ クリーンアップ」観点では本 issue では扱わない（ローカル `rmdir` で済む）。`.gitignore` 追記の必要もない（既に追跡外）。

### 2.5 ルート直下のディレクトリ

`find . -maxdepth 1 -type d` の結果いずれも **意図的**:

| ディレクトリ | 役割 |
|---|---|
| `.claude/` | このリポジトリ自身が dogfooding する agents / commands / orchestrator-rules |
| `bin/` | npm パッケージの CLI エントリ (`aphelion-agents.mjs`) |
| `docs/` | wiki / design-notes |
| `node_modules/` | gitignore 済み |
| `scripts/` | `sync-wiki.mjs`, `smoke-update.sh` |
| `site/` | Astro Starlight サイト (Cloudflare Pages デプロイ対象) |
| `src/` | canonical な `src/.claude/rules/` を保持 (#44) |

不要ディレクトリは無し。

### 2.6 過去 refactor の残骸スキャン

| 過去 PR | 旧パス / 旧ファイル | 現状 |
|---|---|---|
| #51 (`docs/issues/` → `docs/design-notes/`) | `docs/issues/` | 既に消滅。残る言及は CHANGELOG 的な wiki 履歴行 2 件のみ（正常） |
| `drop-platforms` 系 | `platforms/` | active な canonical sources からの参照 0 件（archived design-notes のみ） |
| #44 (`.claude/rules/` 隔離) | ルートの `.claude/rules/` | 既に `src/.claude/rules/` に移動済み |
| `consolidate-rules-no-claude-md` (#26) | ルートの `CLAUDE.md` | 既に消滅 |

過去 refactor 起因のファイル残骸は **`ISSUE.md` のみ**。

---

## 3. Constraints

- **canonical source の取り扱い**: `src/.claude/rules/` および `.claude/agents/` の編集は wiki (`docs/wiki/{en,ja}/`) と同一 PR で同期させる必要がある (#75 で再確認された運用)。
- **言語ポリシー**: Hand-authored canonical narrative は英語、agent-emitted templates も英語、本設計ノートのような hand-authored design-note は本文 ja・見出し English-fixed（#75）。
- **後方互換**: ユーザ プロジェクト側で既に `developer` セッションを走らせて生成した `TASK.md` を持つ環境への影響を考慮する必要がある。
- **analyst の責務範囲** (#62 / #66): 本セッションでは設計書と GitHub issue 作成のみ。ブランチ作成・コミット・PR は禁止。
- **破壊的操作の事前確認**: ファイル削除を伴う実装フェーズでは developer が user 確認を取ってから `git rm` を行う。

---

## 4. Goals / success criteria

実装フェーズ（後続 PR）完了時点で以下が達成されていること。

1. `ISSUE.md` がリポジトリから削除されている（`git rm ISSUE.md`）。
2. `TASK.md` の扱いに関するポリシーが §5 のいずれかに沿って確定し、ルール／agent 定義／wiki が整合している。
3. `.claude/worktrees/` の空ディレクトリ問題に対する方針（ローカル運用の注意 or `.gitignore` 追記 or 黙殺）が決定されている。
4. ルート直下の各ファイルについて *なぜそこにあるか* が README もしくは内部コメントで一目で判別できる状態になっている。
5. 過去 refactor 由来の phantom reference が他に残っていないことを最終チェックで確認する。

---

## 5. Approach

### 5.1 `ISSUE.md`: 単純削除（即実施可）

- 旧 analyst フロー (#5 の wiki 追加 issue 草稿) の物理残骸。仕様上は #5 マージ後すぐに削除されるべきだったもの。
- 削除のみ。ルール側追加変更は不要（既に `analyst.md:265` で「作成しない」と明記済み）。
- `.gitignore` 追加も不要（廃止済み概念のため、再生成リスクなし）。

### 5.2 `TASK.md`: ポリシー再確認（**ユーザ前提を上書き**）

ユーザの初期前提「`TASK.md` は使われていないので消したい」は誤認識であり、`TASK.md` は **「フェーズ非実行時は空 placeholder で commit しておく」** という #16 で明文化された運用に従っている。

ただし「placeholder ファイルを必ず commit して残す」運用には議論の余地があるため、3 案を提示し developer フェーズの直前に user 決裁を取る。

#### Option A — 現状維持 (**推奨**)

- 何も変更しない。`TASK.md` は空 placeholder のまま残す。
- ルール上の整合性が既に取れており、新規 contributor が *存在を発見しやすい* メリットがある。
- リスク: 「未使用に見える」誤認は今後も起き得る。緩和策として README に *"`TASK.md` is the placeholder used by the `developer` agent during a phase; an empty file is the correct idle state"* の 1 行追記を提案。

#### Option B — Phase 終了時に削除する運用に変更

- `document-versioning.md` の `## TASK.md Lifecycle` を改訂し、phase 完了時は **空テンプレへリセット** ではなく **`git rm TASK.md`** に変更。
- 影響範囲: `developer.md` の resume mode 判定（"if `TASK.md` exists"）はそのまま動く（むしろ判定が綺麗になる）。
- 副作用: ユーザ プロジェクト側の既存 `TASK.md`（過去に reset 済みの placeholder）も「削除して main にプッシュ」というアクションが発生するため、**user 環境への migration コスト** が出る。
- 推奨度: 中。ルール変更の影響面が広く、本 cleanup 単独の便益に対しては過剰。

#### Option C — そもそもこのリポジトリでは Aphelion を dogfooding しないことにする

- 本リポジトリ自体は agent 定義集であり、ユーザ プロジェクトに配信される側。リポジトリ自身の進捗を `TASK.md` で管理してきたのは過去の経緯（#7 / #15 / #24 / #34）であり、現状は通常の GitHub Issue + PR フローで十分回っている。
- `TASK.md` をリポジトリ ルートから恒久削除し、ルール／wiki の記述は「ユーザ プロジェクト側で `developer` が生成・利用するファイル」と明記する。
- 副作用: ルール本文・wiki 双方を改訂する必要があるが、説明文の主語を *"in user projects"* に揃えるだけで足りる。
- 推奨度: 中〜高。ただし本 cleanup タスクだけで決め切るのは大きい。**別 issue として切り出すのが望ましい**。

#### 本 design-note の推奨

**Option A + README 1 行追記** を本 issue のスコープとし、Option C は §7 の Open question として残す（別 issue 化 or 棄却を後日決める）。

### 5.3 `.claude/worktrees/`

- ローカル開発で生まれた空ディレクトリ。git 管理対象外なので **本 cleanup 内では扱わない**。
- ただし「他 contributor の手元で同様のゴミが出ても困らない」よう、`.gitignore` に `/.claude/worktrees/` を予防的に追加することを検討。
- 推奨: 追加する（コスト 1 行、再発防止になる）。

### 5.4 README へのキャプション追記

§5.2 Option A を採るならば、README にルート直下のファイル一覧と役割の短い表を追加すると、未来の同種疑問を防げる。ただし README 肥大化を嫌う #76 の方針もあるので、**Wiki 側 (`docs/wiki/{en,ja}/Getting-Started.md` または `Architecture.md`)** に書く方が筋が良い。具体的な追記場所は developer フェーズで判断する。

---

## 6. Document changes (planned)

実装フェーズで以下を変更する想定。

| ファイル | 変更内容 |
|---|---|
| `ISSUE.md` | **削除** (`git rm`) |
| `.gitignore` | `/.claude/worktrees/` を追記（予防） |
| `docs/wiki/en/Getting-Started.md` (または `Architecture.md`) | `TASK.md` がフェーズ非実行時には空 placeholder であることを 1〜2 行で明記 |
| `docs/wiki/ja/Getting-Started.md` (または `Architecture.md`) | 同上の日本語訳（同 PR 内で同期） |
| `CHANGELOG.md` | `## [Unreleased]` セクションに 3 行（cleanup の概要） |

**変更しないもの**:
- `TASK.md` 自体（中身も削除も触らない）
- `src/.claude/rules/document-versioning.md` / `git-rules.md` / `developer.md`（Option A 採用前提のため）

---

## 7. Open questions

1. **Option C を別 issue として切り出すか**: 「Aphelion 自身は今後 `TASK.md` ベースの phase 管理を採用しないと宣言する」決定は、本 cleanup の射程を超える運用方針変更である。別 issue として `chore: stop dogfooding TASK.md in this repo` のような形で切り出すか、あるいは現状の placeholder 運用で恒久的に良しとするか、ユーザ判断を仰ぐ。
   > 2026-04-30 決定: Option A + README/wiki note のみ採用。Option C は別 issue 化せず完全に棄却 (dropped, no follow-up)。プレースホルダー規約は継続し、緩和策は wiki note (`docs/wiki/{en,ja}/Getting-Started.md`) への説明追記のみとする。
2. **Wiki への追記場所**: `Getting-Started.md` (新規 contributor が読む) と `Architecture.md` (内部構造を説明する) のどちらに `TASK.md` placeholder 説明を置くべきか。ja/en 同期の手間は同等なので、developer フェーズで判断する。
   > 2026-04-30 決定: `docs/wiki/{en,ja}/Getting-Started.md` に追記 (analyst 推奨箇所)。
3. **`.claude/worktrees/` を `.gitignore` する is overkill?**: 純粋にローカル副産物なので各人で `rm` すれば済む話とも言える。ただし新規 contributor が `claude` CLI を立ち上げた際に同じディレクトリが自動生成される可能性は低くない。1 行のコストで防げるので追加推奨だが、棄却も妥当。
   > 2026-04-30 決定: `.gitignore` に `/.claude/worktrees/` を追記する。

> Implemented in: [PR #86](https://github.com/kirin0198/aphelion-agents/pull/86)

---

## 8. Handoff brief for developer

実装フェーズに入る `developer` への引き継ぎブリーフ。

### 8.1 必須タスク

1. **`git rm ISSUE.md`** を実行。コミット メッセージ例: `chore: remove obsolete ISSUE.md residue from analyst v1 era`。理由は本 design-note §2.3 / §5.1 を引用すること。
2. **`.gitignore` に `/.claude/worktrees/` を追記**。コミット メッセージ例: `chore: ignore .claude/worktrees/ local dev artifact`。
3. **Wiki 追記**: `docs/wiki/en/Getting-Started.md` に `TASK.md` placeholder の説明を 1〜2 行追加し、`docs/wiki/ja/Getting-Started.md` にも同期翻訳を追加（同一 PR）。設置場所は §3 *"What `developer` produces"* 周辺が自然。
4. **`CHANGELOG.md` `[Unreleased]`** セクションを更新。
5. **PR タイトル**: `chore: clean up obsolete root-level files (ISSUE.md, worktrees gitignore)`。
6. **PR 本文**: 本 design-note へリンク。「TASK.md は仕様通りの placeholder のため触らない」旨を明示し、Option C 議論は別 issue にスコープ移動した（あるいはしない）ことを明記。

### 8.2 やらないこと（スコープアウト）

- `TASK.md` の削除や中身変更
- `src/.claude/rules/document-versioning.md` の改訂
- `.claude/agents/developer.md` の改訂
- README 本体の改訂（Wiki に書く）
- `docs/design-notes/` 配下の整理（active 4 件 + archived 多数 はいずれも適切な状態と確認済み）

### 8.3 確認事項

- 削除前に `gh issue list --state open --search ISSUE.md` で参照の最終チェック
- PR 提出前に `grep -rn "ISSUE.md" .` で active sources に取りこぼしがないか確認

### 8.4 Branch / PR 戦略

`git-rules.md` の `## Branch & PR Strategy` に従う。ブランチ名候補: `chore/root-cleanup-issue-md`。

### 8.5 Risks

- **低**: いずれの変更も canonical な agent 動作には影響しない。
- 万一 `ISSUE.md` 復活が必要になったら git 履歴から取り戻せる。
