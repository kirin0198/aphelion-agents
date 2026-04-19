# プラットフォームガイド

> **Language**: [English](../en/Platform-Guide.md) | [日本語](../ja/Platform-Guide.md)
> **Last updated**: 2026-04-18
> **EN canonical**: 2026-04-18 of wiki/en/Platform-Guide.md
> **Audience**: プラットフォーム移植者

このページはAphelionが各サポートプラットフォームにどのように適用されるか、ジェネレータースクリプトが何をするか、そしてAphelionを新しいプラットフォームに移植する方法を説明します。

## 目次

- [プラットフォーム概要](#プラットフォーム概要)
- [Claude Code（正規ソース）](#claude-code正規ソース)
- [GitHub Copilot](#github-copilot)
- [OpenAI Codex](#openai-codex)
- [サンドボックスとパーミッションモード](#サンドボックスとパーミッションモード)
- [プラットフォームファイルの生成](#プラットフォームファイルの生成)
- [機能マトリクス](#機能マトリクス)
- [新しいプラットフォームへの移植](#新しいプラットフォームへの移植)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## プラットフォーム概要

Aphelionには1つの正規ソース（Claude Code）と2つの生成ターゲット（GitHub Copilot、OpenAI Codex）があります。正規ソースは`.claude/`に存在します。プラットフォーム固有ファイルは`scripts/generate.py`によって生成され、`platforms/`に保存されます。

| プラットフォーム | 設定場所 | エントリーポイント | マルチエージェントオーケストレーション |
|--------------|---------|----------------|--------------------------------|
| **Claude Code** | `.claude/agents/`, `.claude/rules/` | スラッシュコマンド（`/discovery-flow`） | フル（サブエージェント呼び出し） |
| **GitHub Copilot** | `.github/agents/` | IDE上のエージェントモード | フル（Copilot経由のエージェント間） |
| **OpenAI Codex** | `AGENTS.md`, `skills/` | `AGENTS.md`グローバル指示 | **サポートなし** |

---

## Claude Code（正規ソース）

Claude Codeは権威あるプラットフォームです。全エージェント定義、ルール、オーケストレーターの動作はここで管理されます。他のプラットフォームはこのソースから生成されます。

**ファイル構造：**

```
.claude/
  CLAUDE.md                # ワークフロー概要（自動ロード）
  orchestrator-rules.md    # トリアージ、承認ゲート、ロールバックルール（オンデマンド読み込み）
  agents/
    discovery-flow.md      # フローオーケストレーター
    delivery-flow.md
    operations-flow.md
    interviewer.md         # Discoveryドメインエージェント
    researcher.md
    ...                    # （合計27エージェント）
  rules/
    agent-communication-protocol.md
    build-verification-commands.md
    ...                    # （合計9ルール）
  commands/
    discovery-flow.md      # スラッシュコマンド定義
    delivery-flow.md
    pm.md
    ...
```

**スラッシュコマンド**（`.claude/commands/`で定義）：

| コマンド | 起動内容 |
|---------|--------|
| `/discovery-flow {説明}` | `discovery-flow`オーケストレーター |
| `/delivery-flow` | `delivery-flow`オーケストレーター |
| `/pm {説明}` | `delivery-flow`（ショートハンド） |
| `/operations-flow` | `operations-flow`オーケストレーター |
| `/analyst {issue}` | `analyst`スタンドアロンエージェント |
| `/codebase-analyzer {指示}` | `codebase-analyzer`スタンドアロンエージェント |

**セットアップ：**

```bash
cp -r /path/to/aphelion-agents/.claude /path/to/your-project/
cd /path/to/your-project && claude
```

---

## GitHub Copilot

Copilotプラットフォームファイルは`scripts/generate.py`によってClaude Codeの正規エージェントから生成されます。`platforms/copilot/`に保存され、ユーザーはプロジェクトの`.github/`にコピーします。

**ファイル構造（ユーザーのプロジェクト内）：**

```
.github/
  copilot-instructions.md  # グローバルワークフロー指示（.claude/CLAUDE.mdから）
  orchestrator-rules.md    # オーケストレーターエージェントにインライン化
  agents/
    discovery-flow.agent.md
    delivery-flow.agent.md
    ...                    # （合計27エージェント）
```

**Claude Codeとの主な違い：**

| 側面 | Claude Code | GitHub Copilot |
|-----|------------|----------------|
| フロントマター形式 | `---\nname: ...\ndescription: ...\ntools: Read, Write, Bash, ...` | `---\nname: ...\ndescription: ...\ntools:\n  - read\n  - edit\n  - execute\n  - ...` |
| ツール名 | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` | `read`, `edit`, `execute`, `search` |
| オーケストレータールール | 別ファイル（オンデマンド読み込み） | 各オーケストレーターエージェントファイルにインライン化 |
| グローバル指示 | `.claude/CLAUDE.md`（自動ロード） | `.github/copilot-instructions.md` |
| モデル選択 | フロントマターで指定 | Copilot自身のモデル選択（省略） |

**ツール名マッピング**（generate.pyが適用）：

| Claude Code | Copilot |
|------------|---------|
| `Read` | `read` |
| `Write` | `edit` |
| `Edit` | `edit` |
| `Bash` | `execute` |
| `Glob` | `search` |
| `Grep` | `search` |
| `Agent` | `agent` |
| `WebSearch`, `WebFetch` | `web` |

**セットアップ：**

```bash
cp -r platforms/copilot/* /path/to/your-project/.github/
```

その後、VS Code、JetBrains、またはNeovimでGitHub Copilotのエージェントモードを使用します。エージェントは`.github/agents/`に配置されます。

---

## OpenAI Codex

Codexプラットフォームはグローバル指示として単一の`AGENTS.md`ファイルと個別のスキルファイルを使用します。`scripts/generate.py`によって生成されますが、重大な制限があります。

**ファイル構造（ユーザーのプロジェクト内）：**

```
AGENTS.md          # マージされたグローバル指示（全ルール + ワークフロー概要）
skills/
  vuln-scan/
    SKILL.md       # 依存関係の脆弱性スキャン
  secrets-scan/
    SKILL.md       # ハードコードされたシークレット検出
```

**主な制限：**

| 制限 | 詳細 |
|-----|-----|
| サブエージェントオーケストレーションなし | Codexはエージェント内からエージェントを呼び出せません。マルチフェーズフローは利用不可。 |
| 32 KBサイズ制限 | `AGENTS.md`は32 KBに制限されます。ジェネレーターは必要に応じて切り詰めます。 |
| スキルのみ | `vuln-scan`と`secrets-scan`のみ個別ユーティリティとして利用可能。 |
| スラッシュコマンドなし | エントリーは`AGENTS.md`グローバル指示経由で、スラッシュコマンドではありません。 |

**利用可能なスキル：**

- **`vuln-scan`**: パッケージファイルからプロジェクトの技術スタックを検出し、適切な脆弱性スキャナー（pip-audit、npm audit、govulncheck、cargo audit）を実行し、検出結果を報告します。
- **`secrets-scan`**: ソースコード内のハードコードされたAPIキー、パスワード、トークン、接続文字列、AWSキー、秘密鍵、Bearerトークンをスキャンします。`.env`とテストフィクスチャは除外します。

**セットアップ：**

```bash
cp platforms/codex/AGENTS.md /path/to/your-project/
cp -r platforms/codex/skills/ /path/to/your-project/
```

> マルチフェーズのフルオーケストレーションにはClaude CodeまたはGitHub Copilotを使用してください。

---

## サンドボックスとパーミッションモード

Aphelionエージェントはユーザーの代わりに`Bash`ツールを通じてシェルコマンドを実行します。サンドボックスシステムは、リスクのあるコマンドを分類し、実行前にプラットフォームネイティブのパーミッション制御を通じてルーティングする仕組みを提供します。

完全なポリシーリファレンスは[.claude/rules/sandbox-policy.md](../../.claude/rules/sandbox-policy.md)を参照してください。
実行エージェントについては[.claude/agents/sandbox-runner.md](../../.claude/agents/sandbox-runner.md)を参照してください。

### プラットフォーム別サンドボックス機能比較

| 機能 | Claude Code | GitHub Copilot | OpenAI Codex |
|---|---|---|---|
| devcontainer によるコンテナ隔離 | あり（`container` モード — 最優先） | あり（Docker利用可能な場合） | なし |
| ネイティブパーミッションゲート | あり（permission mode） | 一部（IDEの確認プロンプト） | なし |
| Allow / Ask / Deny 3段階 | あり | Ask のみ | なし |
| 永続的な設定 | `.claude/settings.json` | IDEの設定 | N/A |
| セッションローカルオーバーライド | `.claude/settings.local.json` | セッション単位 | N/A |
| sandbox-runner 統合 | 自動挿入（Standard+）+ 明示委譲 | 明示委譲のみ | Advisoryのみ |
| 推奨フォールバック | — | 実行前の手動レビュー | 実行前の手動レビュー |

### コンテナ隔離モード

Aphelion はプラットフォームのパーミッションモードに加え、`container` 隔離モードをサポートします。`.devcontainer/devcontainer.json` が存在し Docker が利用可能な場合、`sandbox-runner` はパーミッションゲートに依存するのではなく、プロジェクトの devcontainer 内で高リスクコマンドを実行します。

**`container` モードの主な特性：**
- **実体的な物理的隔離を提供** — コマンドは制限されたファイルシステムビューを持つ別コンテナプロセスで実行されます。
- **`auto`/`allow` モード時も有効** — Claude Code のパーミッションモードが通常はプロンプトなしでコマンドを実行する設定であっても、`container` モードは構造的な境界として機能します。
- `infra-builder` は Light プラン以上で `.devcontainer/devcontainer.json` と `docker-compose.dev.yml` を生成します。
- ランタイム時に Docker が利用できない場合（Standard/Full プラン）、`sandbox-runner` は `platform_permission` に緩やかにフォールバックし、`AGENT_RESULT` に `FALLBACK_REASON` を記録します。

**優先順位：** `container` > `platform_permission` > `advisory_only` > `blocked`

完全なポリシーは [.claude/rules/sandbox-policy.md §3–§5](../../.claude/rules/sandbox-policy.md) を参照してください。
実行経路選択ロジックは [.claude/agents/sandbox-runner.md §Workflow Step 2](../../.claude/agents/sandbox-runner.md) を参照してください。

### Claude Code パーミッションモード

Claude CodeはBashコマンドに対して3段階のパーミッションレベルを提供します。

| モード | 動作 |
|------|------|
| `allow` | 確認なしで自動実行 |
| `ask` | 実行前にユーザー確認のため一時停止 |
| `deny` | 実行を完全に拒否 |

**設定の永続化：**

- **永続的** — `.claude/settings.json`に保存（リポジトリにコミット可能でチーム共有可）
- **セッション / ローカル** — `.claude/settings.local.json`に保存（デフォルトでgitignore対象；個人または環境別オーバーライド用）

**優先順位：** セッションローカル設定が永続設定より優先されます。

**sandbox-runner との関係：** `sandbox-runner`は有効なパーミッションモードを尊重します。Claude Codeのパーミッションシステムを置き換えたりバイパスしたりしません。Aphelionは`.claude/settings.json`や`.claude/settings.local.json`を直接変更しません。ユーザーがこれらのファイルを自分で設定します。

### 推奨パーミッションプロファイル

以下のプロファイルは推奨事項です。環境に合わせて`.claude/settings.json`または`.claude/settings.local.json`で設定してください。

| 環境 | destructive_fs | prod_db | external_net | privilege_escalation | secret_access | 備考 |
|---|---|---|---|---|---|---|
| **dev（開発者ローカル）** | ask | deny | ask | ask | ask | 全`required`カテゴリは確認が必要；外部ネットワークも確認 |
| **CI** | deny | deny | allow（allowlist） | deny | deny | 既知のレジストリのみネットワーク許可；破壊的操作は全面拒否 |
| **near-production** | deny | deny | deny | deny | deny | 全面拒否；例外はhuman-in-the-loop必須 |

### sandbox-runner の位置づけ

1. **トリアージが有効化レベルを決定** — Minimalプラン：advisory警告のみ。Light：明示委譲。Standard/Full：`required`ティアコマンドの前にオーケストレーターが`sandbox-runner`を自動挿入。
2. **sandbox-runner が再分類** — エージェントが`risk_hint`を提供した場合でも、`sandbox-runner`は`sandbox-policy.md`に照らして独立して再分類します。
3. **プラットフォームモードを適用** — Claude Codeでは適切なパーミッションモードを呼び出します。Copilot/Codexでは警告を表示します。
4. **監査証跡を返却** — `sandbox-runner`の`AGENT_RESULT`には実行が許可されたか拒否されたかに関わらず常に`DETECTED_RISKS`と`DECISION`が含まれます。

---

## プラットフォームファイルの生成

プラットフォームファイルは`scripts/generate.py`を使用してClaude Codeの正規ソースから生成されます。

**使用方法：**

```bash
# 全プラットフォームを生成
python scripts/generate.py

# Copilotのみ
python scripts/generate.py --platform copilot

# Codexのみ
python scripts/generate.py --platform codex

# 生成ファイルを削除
python scripts/generate.py --clean
```

**各プラットフォームでジェネレーターが行うこと：**

*Copilotの場合：*
1. 各`.claude/agents/{name}.md`ファイルを読み込む
2. YAMLフロントマターを変換（ツール名、`model`フィールドを削除）
3. オーケストレーターエージェント（discovery-flow、delivery-flow、operations-flow）に`orchestrator-rules.md`の内容をインライン化
4. `platforms/copilot/agents/{name}.agent.md`に出力を書き込む
5. `.claude/CLAUDE.md`を`platforms/copilot/copilot-instructions.md`にコピー

*Codexの場合：*
1. `.claude/CLAUDE.md`と全`.claude/rules/*.md`ファイルを`AGENTS.md`にマージ
2. `orchestrator-rules.md`の全内容を追加
3. 必要に応じて32 KBに切り詰める
4. `.claude/commands/vuln-scan.md`と`secrets-scan.md`を`platforms/codex/skills/`フォーマットに変換

**再実行のタイミング：**

`.claude/agents/`、`.claude/rules/`、または`.claude/orchestrator-rules.md`が変更された場合は`python scripts/generate.py`を実行してください。`platforms/`内のプラットフォームファイルは直接編集してはいけません — それらは生成された成果物です。

---

## 機能マトリクス

| 機能 | Claude Code | GitHub Copilot | OpenAI Codex |
|-----|------------|----------------|-------------|
| フル3ドメインフロー | あり | あり | なし |
| Discoveryフロー | あり | あり | なし |
| Deliveryフロー | あり | あり | なし |
| Operationsフロー | あり | あり | なし |
| 個別エージェント（スタンドアロン） | あり | あり | 一部（スキルのみ） |
| トリアージシステム | あり | あり | なし |
| セッション再開（TASK.md） | あり | あり | なし |
| 脆弱性スキャン | あり（`security-auditor`） | あり（`security-auditor`） | あり（`/vuln-scan`スキル） |
| シークレットスキャン | あり（`security-auditor`） | あり（`security-auditor`） | あり（`/secrets-scan`スキル） |
| スラッシュコマンド | あり | エージェントモード経由 | なし |

---

## 新しいプラットフォームへの移植

新しいAIコーディングプラットフォームのサポートを追加するには：

1. **プラットフォームのエージェントモデルを理解する**: サブエージェントの呼び出しをサポートしているか？指示ファイルのフォーマットは何か？サイズ制限はあるか？

2. **`scripts/generate.py`にジェネレーター関数を追加する**: `generate_copilot()`または`generate_codex()`のパターンに従います。ジェネレーターは以下を行う必要があります：
   - `.claude/agents/`と`.claude/rules/`から読み込む
   - プラットフォーム固有の変換を適用する（フロントマター、ツール名など）
   - `platforms/{platform-name}/`に書き込む

3. **`platforms/{platform-name}/`にプラットフォームディレクトリ構造を作成する。**

4. **CLIサポートを追加する**: `generate.py`の引数パーサーに`--platform {name}`を追加します。

5. **プラットフォームをドキュメント化する**: このwikiページ（Platform-Guide）にClaude Code / Copilot / Codexのパターンに従って新しいセクションを追加します。

6. **上記の機能マトリクスを更新する。**

> プラットフォームがサブエージェントオーケストレーションをサポートしていない場合、最低限Codexスキルパターンに合わせて`vuln-scan`と`secrets-scan`のスキル/ユーティリティを実装してください。

---

## 関連ページ

- [はじめに](./Getting-Started.md)
- [アーキテクチャ](./Architecture.md)
- [コントリビューティング](./Contributing.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — Claude Codeの正規エージェント定義
- [platforms/copilot/](../../platforms/copilot/) — 生成されたCopilotプラットフォームファイル
- [platforms/codex/](../../platforms/codex/) — 生成されたCodexプラットフォームファイル
- [scripts/generate.py](../../scripts/generate.py) — プラットフォームファイルジェネレーター
