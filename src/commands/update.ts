import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { copyDir, diffDirs } from '../lib/copy.js';
import { CLAUDE_SOURCE } from '../lib/sources.js';

interface UpdateOptions {
  force?: boolean;
}

/**
 * ディレクトリが存在するかチェックする
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * update コマンドのメイン処理
 */
export async function updateCommand(options: UpdateOptions): Promise<void> {
  const cwd = process.cwd();
  const claudeDir = path.join(cwd, '.claude');

  p.intro(pc.bold(pc.cyan('Aphelion Agent Definitions Updater')));

  try {
    // 既存 .claude/ の確認
    if (!(await dirExists(claudeDir))) {
      p.log.error(
        '.claude/ ディレクトリが見つかりません。先に `aphelion-agents init` を実行してください。',
      );
      process.exit(1);
    }

    // 差分検出
    p.log.step('差分を検出中...');
    const diff = await diffDirs(CLAUDE_SOURCE, claudeDir);

    const hasChanges = diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0;

    if (!hasChanges) {
      p.log.success('既にインストール済みのファイルは最新版です。');
      p.outro(pc.bold(pc.green('更新完了（変更なし）')));
      return;
    }

    // 差分表示
    if (diff.added.length > 0) {
      p.log.info(pc.green(`追加予定ファイル (${diff.added.length}件):`));
      for (const file of diff.added) {
        p.log.info(pc.green(`  + ${file}`));
      }
    }

    if (diff.modified.length > 0) {
      p.log.info(pc.yellow(`変更予定ファイル (${diff.modified.length}件):`));
      for (const file of diff.modified) {
        // .claude/settings.local.json は保護対象のため表示から除外
        if (file === 'settings.local.json') {
          continue;
        }
        p.log.info(pc.yellow(`  ~ ${file}`));
      }
    }

    if (diff.removed.length > 0) {
      p.log.info(pc.red(`削除予定ファイル (${diff.removed.length}件、更新後に不要になったもの):`));
      for (const file of diff.removed) {
        p.log.info(pc.red(`  - ${file}`));
      }
    }

    // 確認プロンプト (--force でスキップ)
    if (!options.force) {
      const proceed = await p.confirm({
        message: '上記の変更を適用しますか？（.claude/settings.local.json は保護されます）',
        initialValue: true,
      });

      if (p.isCancel(proceed) || !proceed) {
        p.log.info('更新をキャンセルしました。');
        process.exit(0);
      }
    }

    // 上書きコピー (.claude/settings.local.json は copyDir 内で保護される)
    await copyDir(CLAUDE_SOURCE, claudeDir, { destBase: cwd });

    p.log.success(pc.green('.claude/ を更新しました。'));
    p.outro(pc.bold(pc.green('更新が完了しました！')));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    p.log.error(`更新中にエラーが発生しました: ${message}`);
    process.exit(1);
  }
}
