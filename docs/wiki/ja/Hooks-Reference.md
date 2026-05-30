# Hooks Reference

> **Language**: [English](../en/Hooks-Reference.md) | [日本語](../ja/Hooks-Reference.md)
> **Last updated**: 2026-05-30
> **Update history**:
>   - 2026-05-30: add Hook D — aphelion-project-rules-check (SessionStart advisory) (#130 PR-6)
>   - 2026-05-01: initial release — MVP 3 hooks (#107)
> **EN canonical**: 2026-05-30 of wiki/en/Hooks-Reference.md
> **Audience**: Aphelion ユーザー（ユーザープロジェクトでフックを運用する開発者）

このページは Aphelion が配布する Claude Code フックのユーザー向けリファレンスです。
フックは第 4 の防御層として、既存の deny ルール・サンドボックス分離・事後診断の上に
積極的なコンテンツスキャンを追加します。

エージェント向けの完全なポリシー（自動ロードルール）は
[hooks-policy.md](../../.claude/rules/hooks-policy.md) を参照してください。

## 目次

- [Hook A — aphelion-secrets-precommit](#hook-a--aphelion-secrets-precommit)
- [Hook B — aphelion-sensitive-file-guard](#hook-b--aphelion-sensitive-file-guard)
- [Hook D — aphelion-project-rules-check](#hook-d--aphelion-project-rules-check)
- [Hook E — aphelion-deps-postinstall](#hook-e--aphelion-deps-postinstall)
- [フックの配布方法](#フックの配布方法)
- [フックを無効化する](#フックを無効化する)
- [独自フックを追加する](#独自フックを追加する)
- [トラブルシューティング](#トラブルシューティング)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## Hook A — aphelion-secrets-precommit

**スクリプト**: `.claude/hooks/aphelion-secrets-precommit.sh`
**イベント**: `PreToolUse`
**Matcher**: `Bash`
**発動条件**: `Bash(git commit*)`
**ブロック**: あり（exit 2）

### 動作内容

Claude Code が `git commit` を実行する前に、このフックがステージ済みの差分
（`git diff --cached -U0`）を既知のシークレットパターンで検査します。
検査対象は追加行（`+` で始まる行）のみで、削除行は無視されます。
`.claude/hooks/lib/secret-patterns.sh` に定義された 8 つの ERE 正規表現（ID: P1〜P8）を使用します。

| ID | パターン |
|----|---------|
| P1 | AWS アクセスキー (`AKIA[0-9A-Z]{16}`) |
| P2 | GitHub PAT / OAuth トークン (`gh[pousr]_...`) |
| P3 | OpenAI API キー (`sk-...`) |
| P4 | Anthropic API キー (`sk-ant-...`) |
| P5 | Slack トークン (`xox[baprs]-...`) |
| P6 | Stripe ライブシークレット (`sk_live_...`) |
| P7 | RSA / EC / DSA / OpenSSH 秘密鍵ヘッダー |
| P8 | 汎用的な認証情報代入（`api_key =`・`password =`・`token = "..."` など） |

マッチが見つかった場合、フックは：
1. マッチしたパターンの **ID のみ** を stderr に出力します（実際の値はログへの漏洩を防ぐため意図的に非表示）。
2. exit 2 で終了し、Claude Code が `git commit` 呼び出しをブロックします。

マッチがなければ exit 0 で終了し、コミットは通常通り進みます。

### bypass（回避）

コミットメッセージのどこかに `[skip-secrets-check]` を追記します：

```bash
git commit -m "feat: add sample config [skip-secrets-check]"
```

フックが安全なプレースホルダー値（例: `MY_API_KEY_HERE`）で発動した場合に使用します。
bypass する前に `/secrets-scan` で値が本物のシークレットでないことを確認してください。

### bypass を使うべき場合

- 値がプレースホルダーである（`TODO_REPLACE`・`<YOUR_TOKEN>`・`example_key` 等）。
- 値がドキュメントやテストフィクスチャ内にある（ただし理想的には `tests/` や `docs/` など
  `ALLOW_PATH_PATTERNS` に該当するパスに配置してください）。

---

## Hook B — aphelion-sensitive-file-guard

**スクリプト**: `.claude/hooks/aphelion-sensitive-file-guard.sh`
**イベント**: `PreToolUse`
**Matcher**: `Write|Edit`
**発動条件**: 下記を参照
**ブロック**: あり（exit 2）

### 動作内容

Claude Code がファイルを書き込む前に、対象パスが慣習的に機密ファイルに使用されるファイル名に
マッチするかを確認します。マッチした場合、書き込みをブロックします。

**発動するファイル名パターン**（`settings.json` から）：
```
Write(.env*)  Write(**/*.pem)  Write(**/*.key)  Write(**/credentials.*)
Write(**/*.secret)  Write(**/id_rsa)  Write(**/id_ed25519)  Write(**/id_ecdsa)
Edit(.env*)   Edit(**/*.pem)   Edit(**/*.key)   Edit(**/credentials.*)
```

**パス判定の優先順位**（上位が優先）：

| 優先度 | 条件 | 結果 |
|--------|------|------|
| 1（最高） | パスが `/tests?/`・`/__fixtures__/`・`/fixtures/`・`/examples/`・`/docs/` を含む | 許可 |
| 2 | ファイル名が `.example`・`.template`・`.sample`・`.dist` で終わる | 許可 |
| 3 | ファイル名が `BLOCK_GLOB` にマッチ | ブロック |
| 4（最低） | その他 | 許可 |

**判定例**：

| パス | 判定 | 理由 |
|------|------|------|
| `/project/.env` | ブロック | `.env` glob マッチ |
| `/project/.env.example` | 許可 | `.example` サフィックス |
| `/project/tests/fixtures/.env` | 許可 | `tests/` パスパターン |
| `/project/certs/server.pem` | ブロック | `*.pem` glob マッチ |
| `/project/docs/sample.pem` | 許可 | `docs/` パスパターン |

### bypass（回避）

Hook B には **bypass マーカーはありません**。これは意図的な設計です：
`.env` や `*.pem` などのファイルをプロジェクトツリー内に直接書き込むことはほぼ常にミスです。
どうしても必要な場合は、`.claude/settings.json` を編集して `PreToolUse` セクションから
`aphelion-sensitive-file-guard` エントリを削除してください。

`npx aphelion-agents update` でこのエントリが復元されることはありません（削除したエントリはマージ時も保持されます）。

---

## Hook D — aphelion-project-rules-check

**スクリプト**: `.claude/hooks/aphelion-project-rules-check.sh`
**イベント**: `SessionStart`
**Matcher**: （なし — SessionStart には matcher フィールドがありません）
**発動条件**: セッション開始時（`source == "startup"`）
**ブロック**: なし（常に exit 0）

### 動作内容

Claude Code の新しいセッション開始時に、プロジェクトディレクトリの
`.claude/rules/project-rules.md` が存在するかどうかを確認します。
ファイルが見つからない場合、`/aphelion-init` の実行を促す勧告を stderr に一度出力します。

`project-rules.md` がないと、Aphelion エージェントはプロジェクトに合わないデフォルト値にフォールバックします：
- **Output Language**: `en`（英語）
- **Co-Authored-By**: 有効
- **Remote type**: `github`

このフックは `source == "startup"` のときのみ発火します。`/clear`・`/compact`・セッション再開では
発火しないため、通知は新規セッションごとに最大 1 回表示されます。

**出力例**（`project-rules.md` が不在の場合）：
```
[aphelion-hook:project-rules-check] No project-rules.md found at .claude/rules/project-rules.md.
  Aphelion agents will fall back to defaults (Output Language: en, Co-Authored-By: enabled,
  Remote type: github) which may not match this project.
  Recommended: run /aphelion-init to generate project-rules.md for this repository.
  (This is an advisory only; it never blocks session start.)
  To silence this check, set APHELION_SKIP_RULES_CHECK=1 in your environment.
```

### 既知の制限事項

Hook D は**プロジェクトローカルのパス** `${cwd}/.claude/rules/project-rules.md` のみを確認します。
`init --user` でインストールした場合、`project-rules.md` は `~/.claude/rules/` にあり、
フックはこれを検出できません（誤検知）。その場合は以下の bypass を使用してください。

### bypass（回避）

Claude Code を起動する前に環境変数 `APHELION_SKIP_RULES_CHECK=1` を設定します：

```bash
export APHELION_SKIP_RULES_CHECK=1
claude
```

全プロジェクトで永続的に抑制する場合はシェルプロファイル（`~/.bashrc`・`~/.zshrc`）に追記します：

```bash
echo 'export APHELION_SKIP_RULES_CHECK=1' >> ~/.bashrc
```

---

## Hook E — aphelion-deps-postinstall

**スクリプト**: `.claude/hooks/aphelion-deps-postinstall.sh`
**イベント**: `PostToolUse`
**Matcher**: `Bash`
**発動条件**: `npm install*`・`npm i *`・`npm ci*`・`uv add*`・`uv pip install*`・`pip install*`・`cargo add*`・`go get *`
**ブロック**: なし（常に exit 0）

### 動作内容

依存関係インストールコマンドの完了後、このフックが stderr に脆弱性スキャンを推奨する
勧告メッセージを出力します。コマンドプレフィックスからtechスタックを検出し、
適切なツールを提案します：

| コマンドプレフィックス | スタック | 推奨スキャン |
|----------------------|--------|------------|
| `npm*` | Node.js | `npm audit` |
| `uv*` | Python | `uv run pip-audit` |
| `pip*` | Python | `pip-audit` |
| `cargo*` | Rust | `cargo audit` |
| `go*` | Go | `govulncheck ./...` |

**出力例**：
```
[aphelion-hook:deps-postinstall] Node.js dependency change detected.
  Recommended next step: run /vuln-scan to check for known vulnerabilities.
  (Manual equivalent: npm audit)
  Skipping recommended after lockfile-only updates or when offline.
```

### bypass（回避）

bypass は不要です — Hook E は勧告のみで、実行をブロックしません。
lockfile のみの更新やオフライン環境ではメッセージを無視して構いません。

---

## フックの配布方法

Aphelion はフックを `npx aphelion-agents init` および `npx aphelion-agents update` で配布します。

### init（初回セットアップ）

```bash
npx github:kirin0198/aphelion-agents init
```

- `src/.claude/settings.json`（フック登録テンプレート）をプロジェクトの `.claude/settings.json` に
  マージまたは新規作成します。Hook D の `SessionStart` ブロックが含まれます。
- `src/.claude/hooks/` の全ファイルを `.claude/hooks/` に再帰的にオーバーレイコピーします。
- Claude Code が実行できるよう、全 `*.sh` ファイルに実行権限（`chmod 0755`）を付与します。

### update

```bash
npx aphelion-agents update
```

- **`settings.json`** — マージ: `command` パスに `aphelion-` を含む Aphelion 管理エントリを
  再適用しつつ、ユーザーが追加・削除したエントリを保持します。Hook D の `SessionStart` ブロックが
  既存インストールに自動追加されます。
- **`hooks/`** — オーバーレイ: 常に正規ソースから再コピー。バグ修正や新しいシークレットパターンが
  自動的にプロジェクトに反映されます。
- 実行権限が失われた場合（例: Windows の git clone 後）に自動で復元します。

---

## フックを無効化する

特定のフックを永続的に無効化するには、`.claude/settings.json` を編集して
該当エントリを削除してください。

**例 — Hook A（secrets-precommit）を無効化**：

```json
{
  "hooks": {
    "PreToolUse": [
      // aphelion-secrets-precommit エントリを削除または省略
      {
        "matcher": "Write|Edit",
        "if": "...",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/aphelion-sensitive-file-guard.sh"
      }
    ],
    "PostToolUse": [ ... ]
  }
}
```

変更は `npx aphelion-agents update` で上書きされません（削除したエントリはマージ時も保持されます）。

---

## 独自フックを追加する

`update` で失われない独自フックを追加するには：

1. スクリプトを `.claude/hooks/local/your-hook.sh` に配置します（オーバーレイの対象外）。
2. 実行権限を付与します: `chmod +x .claude/hooks/local/your-hook.sh`。
3. `.claude/settings.json` の該当イベントセクションに登録します：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git push*)",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/local/your-hook.sh",
        "description": "カスタムフック"
      }
    ]
  }
}
```

`.claude/hooks/local/` 内のスクリプトは `aphelion-agents update` では変更されません。

---

## トラブルシューティング

**フックが発動しない**

1. フックスクリプトに実行権限があるか確認します：
   ```bash
   ls -la .claude/hooks/*.sh
   ```
   実行ビットがない場合は `npx aphelion-agents update` を実行して復元してください。

2. `.claude/settings.json` の正しいイベント下にフックエントリが存在するか確認します。

3. Claude Code が `.claude/settings.json` を読み込んでいるか確認します（ファイルはサブディレクトリではなくプロジェクトルートに配置する必要があります）。

**Hook A が毎回のコミットで誤検知する**

`/secrets-scan` でステージ済みコンテンツを LLM による文脈検出で確認します。
値が安全なプレースホルダーだと確認できたら、コミットメッセージに `[skip-secrets-check]` を追記します。

同じパターンが繰り返し誤検知する場合は
[github.com/kirin0198/aphelion-agents](https://github.com/kirin0198/aphelion-agents)
にイシューを開き、パターン ID（例: P8）と誤検知の安全なサンプルコンテンツを記載してください。

**Hook D がグローバル project-rules.md があるのに発火する**

Hook D はプロジェクトローカルの `.claude/rules/project-rules.md` のみを確認します。
`init --user` を使用している場合、`project-rules.md` は `~/.claude/rules/` にあり、
フックはこれを検出できません。`APHELION_SKIP_RULES_CHECK=1` を環境変数に設定して勧告を抑制してください。

**WSL / Windows に関する注意**

Aphelion のフックは `bash` と `grep -E` を必要とします。WSL2（推奨）・macOS・Linux ではデフォルトで利用可能です。
Windows ネイティブ（WSL なしの PowerShell）は**現在サポートされていません** — Phase 2 で PowerShell 互換の
フックセットを予定しています。

WSL2 で Aphelion を使用する場合は、プロジェクトを Windows マウント（`/mnt/c/…`）ではなく
WSL ファイルシステム（`/home/…`）内に配置することで、Hook A の `git diff --cached` の
パフォーマンス問題を回避できます。

---

## 関連ページ

- [Rules Reference](./Rules-Reference.md) — エージェント開発者向けの hooks-policy エントリ
- [Getting Started](./Getting-Started.md) — Aphelion 全体のセットアップガイド

## 正規ソース

- [src/.claude/hooks/](../../src/.claude/hooks/) — 正規フックスクリプト
- [src/.claude/settings.json](../../src/.claude/settings.json) — フック登録テンプレート
- [src/.claude/rules/hooks-policy.md](../../src/.claude/rules/hooks-policy.md) — 自動ロードポリシールール
