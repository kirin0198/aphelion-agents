# CLAUDE.md — Telescope ワークフロー共通ルール

このファイルは Telescope ワークフローの全エージェントが参照する共通ルールです。
各エージェント固有のルールは `agents/` 配下の個別ファイルに記載されています。

---

## Telescope ワークフローモデル

Telescope は、プロジェクトの全工程を **Discovery（要件探索）→ Delivery（設計・実装）→ Operations（デプロイ・運用）** の3領域に分割し、各領域を独立したオーケストレーター（PM）が管理するワークフローモデルです。

### 設計原則

- **ドメイン分離**: 各領域は独立したセッションで実行される
- **ファイルハンドオフ**: 領域間は `.md` ファイル（DISCOVERY_RESULT.md, DELIVERY_RESULT.md）で接続。自動チェーンしない
- **セッション分離**: 各PMは独立セッション。コンテキストウィンドウの圧迫を防ぐ
- **トリアージ適応**: 各PMがフロー開始時にプロジェクト特性を判定し、Minimal/Light/Standard/Full の4段階から選択
- **独立起動**: 全エージェントは入力ファイルが揃っていれば単独呼び出し可能

### 領域とフロー概要

```
Discovery PM ──[DISCOVERY_RESULT.md]──▶ Delivery PM ──[DELIVERY_RESULT.md]──▶ Operations PM
 (要件探索)                             (設計・実装)                            (デプロイ・運用)
 5 agents                               12 agents                              4 agents
```

### 成果物の性質による分岐

| PRODUCT_TYPE | Discovery | Delivery | Operations |
|-------------|-----------|----------|------------|
| `service` | 実行 | 実行 | 実行 |
| `tool` / `library` / `cli` | 実行 | 実行 | **スキップ** |

---

## ディレクトリ構造

```
agents/
├── discovery/          # Discovery 領域
│   ├── PM.md           # Discovery PM（オーケストレーター）
│   ├── interviewer.md
│   ├── researcher.md
│   ├── poc-engineer.md
│   ├── concept-validator.md
│   └── scope-planner.md
├── delivery/           # Delivery 領域
│   ├── PM.md           # Delivery PM（オーケストレーター）
│   ├── spec-designer.md
│   ├── ux-designer.md
│   ├── architect.md
│   ├── scaffolder.md
│   ├── developer.md
│   ├── test-designer.md
│   ├── tester.md
│   ├── reviewer.md
│   ├── security-auditor.md
│   ├── doc-writer.md
│   ├── releaser.md
│   └── analyst.md
└── operations/         # Operations 領域（サービス専用）
    ├── PM.md           # Operations PM（オーケストレーター）
    ├── infra-builder.md
    ├── db-ops.md
    ├── observability.md
    └── ops-planner.md
```

### エージェント定義の同期

`agents/` が**ソースオブトゥルース**であり、`.claude/agents/` はデプロイ用のフラットコピーである。

- エージェント定義を変更したら `agents/` 側を編集する
- 編集後は `bash scripts/sync-agents.sh` で `.claude/agents/` に同期する
- `bash scripts/verify-sync.sh` でドリフトがないことを確認する
- PM.md は同期時に `{phase}-PM.md`（例: `discovery-PM.md`）にリネームされる

---

## トリアージシステム

### Discovery PM トリアージ

| プラン | 条件 | 起動エージェント |
|--------|------|-----------------|
| Minimal | 個人ツール・小規模スクリプト | interviewer |
| Light | 個人サイドPJ・機能が複数 | interviewer → scope-planner |
| Standard | 外部依存あり・既存システム連携 | interviewer → researcher → poc-engineer → scope-planner |
| Full | 規制あり・大規模・複雑 | interviewer → researcher → poc-engineer → concept-validator → scope-planner |

### Delivery PM トリアージ

| プラン | 条件 | 起動エージェント |
|--------|------|-----------------|
| Minimal | 単機能ツール | spec-designer → architect → developer → tester（test-designer統合）→ security-auditor |
| Light | 個人サイドPJ | + ux-designer（UI時）+ test-designer + reviewer |
| Standard | 複数ファイルPJ | + scaffolder + doc-writer |
| Full | 公開PJ・OSS | + releaser |

`security-auditor` は**全プランで必ず実行**。`ux-designer` は UI を含むプロジェクトのみ。

> **analyst について:** `analyst` はトリアージ外のサイドエントリーエージェント。既存プロジェクトへのバグ報告・機能追加・リファクタリング要求を起点とし、完了後に Delivery PM が Phase 3（architect）から合流する。

### Operations PM トリアージ

| プラン | 条件 | 起動エージェント |
|--------|------|-----------------|
| Light | PaaS・単一コンテナ | infra-builder → ops-planner |
| Standard | API + DB 構成 | + db-ops |
| Full | 可用性が重要 | + observability |

> **Minimal プランがない理由:** `PRODUCT_TYPE: service` のデプロイには最低限インフラ定義（infra-builder）と運用計画（ops-planner）が必要であるため、Operations は Light を最小プランとする。

---

## ハンドオフファイル仕様

領域間の接続に使用するハンドオフファイルの共通フォーマット。
各ファイルは次の領域の PM が起動時に読み込み、前提条件が満たされているかを検証する。


### バリデーションルール

各 PM は起動時にハンドオフファイルの必須フィールドを検証する。不足がある場合は `STATUS: error` で報告し、ユーザーに修正を求める。

**DISCOVERY_RESULT.md の必須フィールド:**
- `PRODUCT_TYPE`（service / tool / library / cli のいずれか）
- 「プロジェクト概要」セクション（空でないこと）
- 「要件サマリー」セクション（空でないこと）

**DELIVERY_RESULT.md の必須フィールド:**
- `PRODUCT_TYPE`
- 「成果物」セクション（SPEC.md と ARCHITECTURE.md のステータスを含む）
- 「技術スタック」セクション（空でないこと）
- 「テスト結果」セクション
- 「セキュリティ監査結果」セクション

**OPS_RESULT.md の必須フィールド:**
- 「成果物一覧」テーブル
- 「デプロイ準備状態」チェックリスト
### DISCOVERY_RESULT.md

Discovery PM の最終出力。Delivery PM の `spec-designer` への入力となる。

```markdown
# Discovery Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Discovery プラン: {Minimal | Light | Standard | Full}

## プロジェクト概要
{1〜3行の要約}

## 成果物の性質
PRODUCT_TYPE: {service | tool | library | cli}

## 要件サマリー
{構造化された要件の要約}

## スコープ（確定している場合）
- MVP: {最小スコープ}
- IN: {含むもの}
- OUT: {含まないもの}

## 技術リスク・制約（調査済みの場合）
{PoCの結果、外部依存の制約等}

## 未解決事項
{Delivery で解決すべき残課題}
```

### DELIVERY_RESULT.md

Delivery PM の最終出力。Operations PM への入力となる（service の場合）。

```markdown
# Delivery Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Delivery プラン: {Minimal | Light | Standard | Full}
> PRODUCT_TYPE: {service | tool}

## 成果物
- SPEC.md: {あり/なし}
- ARCHITECTURE.md: {あり/なし}
- UI_SPEC.md: {あり/なし/該当なし}
- TEST_PLAN.md: {あり/なし}
- 実装コード: {ファイル数}
- README.md: {あり/なし}

## 技術スタック
{確定した技術スタックの要約}

## テスト結果
- 合計: {N} / 成功: {N} / 失敗: {N}

## セキュリティ監査結果
- CRITICAL: {N} / WARNING: {N}

## Operations への引き継ぎ（service の場合）
{デプロイに必要な情報、環境変数一覧、DB要件等}
```

### OPS_RESULT.md

Operations PM の最終出力。デプロイ準備状態の最終確認に使用する。

```markdown
# Operations Result: {プロジェクト名}

> 作成日: {YYYY-MM-DD}
> Operations プラン: {Light | Standard | Full}

## 成果物一覧
| ファイル | 内容 | 状態 |
|---------|------|------|
| Dockerfile | コンテナ定義 | あり/なし |
| docker-compose.yml | コンテナ構成 | あり/なし |
| .github/workflows/ci.yml | CI/CD | あり/なし |
| .env.example | 環境変数テンプレート | あり/なし |
| DB_OPS.md | DB運用ガイド | あり/なし |
| OBSERVABILITY.md | 可観測性設計 | あり/なし |
| OPS_PLAN.md | 運用計画書 | あり |

## デプロイ準備状態
- [ ] Dockerfile / docker-compose 作成済み
- [ ] CI/CD パイプライン構築済み
- [ ] 環境変数テンプレート作成済み
- [ ] DB運用ガイド作成済み（該当する場合）
- [ ] 可観測性設計完了（該当する場合）
- [ ] デプロイ手順書作成済み
- [ ] ロールバック手順策定済み
- [ ] インシデント対応プレイブック作成済み

## 未対応事項
{残タスクがあれば記載}
```

---

## 言語ルール

- コード・変数名・コミットメッセージ: **英語**
- コードコメント・ドキュメント・ユーザーへの報告: **日本語**
- AGENT_RESULT ブロック内のキー・値: **英語**

---

## エージェント間通信プロトコル

### AGENT_RESULT ブロック（必須）

全エージェントは作業完了時に `AGENT_RESULT` ブロックを出力すること。
各領域の PM はこの出力を解析して次フェーズの判断を行う。

> **PM（オーケストレーター）の例外:** Discovery PM / Delivery PM / Operations PM 自体は `AGENT_RESULT` を出力しない。PMの最終成果物はハンドオフファイル（DISCOVERY_RESULT.md 等）であり、完了時は承認ゲートで報告する。

```
AGENT_RESULT: {agent-name}
STATUS: success | error | failure | suspended | blocked | approved | conditional | rejected
...（エージェント固有のフィールド）
NEXT: {次のエージェント名 | done | suspended}
```

### STATUS の意味

| STATUS | 意味 | オーケストレーターの動作 |
|--------|------|----------------------|
| `success` | 正常完了 | 承認ゲートへ進む |
| `error` | エラーで完了できなかった | ユーザーに状況を報告し判断を仰ぐ |
| `failure` | テスト失敗等の品質問題 | 差し戻しルールに従う |
| `suspended` | セッション中断 | ユーザーに再開を促す |
| `blocked` | 設計の曖昧さ等で作業継続不可 | PMが該当エージェントに軽量確認を依頼 |
| `approved` / `conditional` / `rejected` | レビュー結果 | 差し戻し or 完了判定 |

### blocked STATUS の運用

`developer` が実装中に設計の曖昧さや矛盾を発見した場合に使用する。

```
AGENT_RESULT: developer
STATUS: blocked
BLOCKED_REASON: {理由}
BLOCKED_TARGET: architect
CURRENT_TASK: TASK-005
NEXT: suspended
```

### エラー時の共通動作

エージェントが `STATUS: error` を返した場合、オーケストレーターは：
1. エラー内容をユーザーに報告する
2. ユーザーの判断を仰ぐ（再実行 / スキップ / 中断）
3. ユーザーの指示なく自動で再実行しない

---

## 承認ゲート

全PMに共通する承認ゲートのフォーマット。各フェーズ完了後、PMは必ず停止してユーザーに承認を求める。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏸ Phase {N} 完了 — ユーザー承認待ち
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【完了エージェント】{エージェント名}
【生成された成果物】
  - {ファイルパス}: {概要}

【内容サマリー】
{3〜5行で要約}

【次フェーズ】Phase {N+1}: {次のエージェント名}
  └─ 実行内容: {1行で説明}

続行する場合は「承認」または「進めて」と入力してください。
修正が必要な場合は修正内容を指示してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Git ルール

### コミット単位
- タスク単位で1コミット（複数タスクをまとめない）
- テストコードも実装と同様にコミットする

### ステージング（重要）
- `git add -A` は**禁止**（機密ファイル・不要ファイルの混入を防止）
- `git add {対象ファイル}` で明示的に指定すること
- `.env`, `credentials.*`, `*.secret` 等はコミットしない

### コミットメッセージ

```
{prefix}: {タスク名} (TASK-{N})

- {実装内容の箇条書き}
- 対応UC: UC-XXX（あれば）
```

| prefix | 用途 |
|--------|------|
| `feat:` | 新機能・新しいエンドポイント |
| `fix:` | バグ修正 |
| `refactor:` | リファクタリング |
| `test:` | テストの追加・修正 |
| `docs:` | ドキュメントの追加・修正 |
| `chore:` | 設定・環境 |
| `ci:` | CI/CD 関連 |
| `ops:` | インフラ・運用関連 |

---

## ドキュメントバージョニング

### 更新履歴の記録

全ての設計ドキュメント（SPEC.md・ARCHITECTURE.md・UI_SPEC.md・TEST_PLAN.md）を更新する際は、ファイル冒頭に更新日を記録すること。

```markdown
> 最終更新: {YYYY-MM-DD}
> 更新履歴:
>   - {YYYY-MM-DD}: {変更概要}
```

### トレーサビリティ

- `architect` は SPEC.md のどの版を元に設計したかを `ARCHITECTURE.md` 冒頭に記録する
- `developer` は ARCHITECTURE.md のどの版を元に実装したかを `TASK.md` に記録する
- 各 PM はハンドオフファイルに前の領域の成果物バージョンを記録する

### TASK.md フォーマット

`developer` がセッションをまたいで実装の進捗を保持するための状態ファイル。
実装開始時に生成し、タスク完了のたびに更新する。

```markdown
# TASK.md

> 参照元: ARCHITECTURE.md ({バージョン or 最終更新日})

## フェーズ: {フェーズ名}
最終更新: {日時}
ステータス: 進行中

## タスク一覧

### Phase {N}
- [ ] TASK-001: {タスク名} | 対象ファイル: src/...
- [ ] TASK-002: {タスク名} | 対象ファイル: src/...

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
```

---

## ファイル操作の原則

- 既存ファイルを上書きする前に必ず `Read` で内容を確認する
- ファイルの削除は行わない（ユーザーの明示的な指示がある場合を除く）
- 設計ドキュメント（SPEC.md / ARCHITECTURE.md）に記載のないディレクトリは作成しない

---

## ユーザーへの質問

エージェントの `tools` に対話ツールが含まれていない場合でも、不明点がある場合は**作業を中断してテキスト出力で質問すること**。推測で進めるより確認を優先する。

質問時のフォーマット:
```
⏸ 確認事項があります

{質問内容を箇条書きで記載}

回答をいただいてから作業を再開します。
```

---

## 技術スタック別のビルド確認コマンド

### 構文チェック + lint/format ゲート

developer はタスク完了時に構文チェックに加えて lint/format を実行する。
lint エラーは**テスト前に修正**すること。

| 言語/FW | 構文チェック | lint/format | テスト実行 |
|---------|------------|-------------|-----------|
| Python | `python -m py_compile {file}` | `uv run ruff check . && uv run ruff format --check .` | `uv run pytest` or `pytest` |
| TypeScript | `npx tsc --noEmit` | `npx eslint . && npx prettier --check .` | `npm test` or `npx vitest` |
| Go | `go build ./...` | `go vet ./... && gofmt -l .` | `go test ./...` |
| Rust | `cargo check` | `cargo clippy && cargo fmt --check` | `cargo test` |
| Node.js (JS) | `node --check {file}` | `npx eslint .` | `npm test` |

lint/format ツールが未導入の場合は構文チェックのみ実行し、レポートにその旨を記載する。

---

## 差し戻しルール

テスト失敗やレビューの CRITICAL 指摘は、PMが自動で差し戻す。
差し戻しは**最大3回**。3回を超えた場合はユーザーに状況を報告して判断を仰ぐ。

**テスト失敗の判定:** tester は失敗数が 1 件以上あれば `STATUS: failure` を返す。部分的な成功（一部テストのみ通過）は failure として扱う。

### テスト失敗時の差し戻しフロー

```
tester（失敗検知）
  → test-designer（原因分析・修正フィードバック作成）
    → developer（修正実装）
      → tester（再実行）
```

### テスト失敗の原因切り分け判断木

1. **テストコード自体のバグか?** → Yes: test-designer がテストコードを修正
2. **テスト環境の問題か?** → Yes: developer に環境修正を指示
3. **実装のバグか?** → Yes: developer に修正フィードバックを渡す
4. **仕様の不備か?** → Yes: ユーザーに報告し判断を仰ぐ（自動差し戻ししない）

### レビュー CRITICAL 時の差し戻しフロー

```
reviewer（CRITICAL 検知）→ developer（修正）→ tester（再実行）→ reviewer（再レビュー）
```

---

## security-auditor の必須実行ルール

`security-auditor` は Delivery の**全プラン（Minimal を含む）で必ず実行**する。

検証項目:
1. OWASP Top 10 検証
2. 依存パッケージの脆弱性スキャン
3. 認証・認可の実装漏れ
4. 機密情報のハードコード検出
5. 入力値バリデーションの確認
6. CWE チェックリスト

---

## 非Pythonプロジェクトへの対応

各エージェントにはPython（FastAPI）ベースのデフォルト例が記載されているが、これは**デフォルトであり必須ではない**。

- SPEC.md で決定された技術スタックを常に優先する
- Python固有の記述は該当技術スタックの同等ツールに読み替えること
- 判断に迷う場合はユーザーに確認する
