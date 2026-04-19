import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { copyDir } from '../lib/copy.js';
import { CLAUDE_SOURCE, CODEX_SOURCE, COPILOT_SOURCE } from '../lib/sources.js';

type Platform = 'claude-code' | 'copilot' | 'codex';

interface InitOptions {
  platform?: string;
  all?: boolean;
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
 * ファイルが存在するかチェックする
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Claude Code プラットフォームをインストールする
 */
async function installClaudeCode(cwd: string, force: boolean): Promise<void> {
  const destDir = path.join(cwd, '.claude');

  if (!force && (await dirExists(destDir))) {
    const overwrite = await p.confirm({
      message: '.claude/ ディレクトリが既に存在します。上書きしますか？',
      initialValue: true,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.log.info('.claude/ のインストールをスキップしました。');
      return;
    }
  }

  await copyDir(CLAUDE_SOURCE, destDir, { destBase: path.join(cwd) });
  p.log.success(pc.green('.claude/ をインストールしました。'));
}

/**
 * GitHub Copilot プラットフォームをインストールする
 */
async function installCopilot(cwd: string, force: boolean): Promise<void> {
  const destDir = path.join(cwd, '.github');

  if (!force && (await dirExists(destDir))) {
    const overwrite = await p.confirm({
      message: '.github/ ディレクトリが既に存在します。Copilot ファイルをマージしますか？',
      initialValue: true,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.log.info('Copilot ファイルのインストールをスキップしました。');
      return;
    }
  }

  await copyDir(COPILOT_SOURCE, destDir, { destBase: cwd });
  p.log.success(pc.green('.github/ (Copilot) をインストールしました。'));
}

/**
 * OpenAI Codex プラットフォームをインストールする
 */
async function installCodex(cwd: string, force: boolean): Promise<void> {
  const agentsMdSrc = path.join(CODEX_SOURCE, 'AGENTS.md');
  const agentsMdDest = path.join(cwd, 'AGENTS.md');
  const skillsSrc = path.join(CODEX_SOURCE, 'skills');
  const skillsDest = path.join(cwd, 'skills');

  // AGENTS.md のコピー
  if (!force && (await fileExists(agentsMdDest))) {
    const overwrite = await p.confirm({
      message: 'AGENTS.md が既に存在します。上書きしますか？',
      initialValue: true,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.log.info('AGENTS.md のインストールをスキップしました。');
    } else {
      await fs.copyFile(agentsMdSrc, agentsMdDest);
      p.log.success(pc.green('AGENTS.md をインストールしました。'));
    }
  } else {
    await fs.copyFile(agentsMdSrc, agentsMdDest);
    p.log.success(pc.green('AGENTS.md をインストールしました。'));
  }

  // skills/ のコピー
  if (!force && (await dirExists(skillsDest))) {
    const overwrite = await p.confirm({
      message: 'skills/ ディレクトリが既に存在します。上書きしますか？',
      initialValue: true,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.log.info('skills/ のインストールをスキップしました。');
      return;
    }
  }

  await copyDir(skillsSrc, skillsDest, { destBase: cwd });
  p.log.success(pc.green('skills/ をインストールしました。'));
}

/**
 * init コマンドのメイン処理
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();

  p.intro(pc.bold(pc.cyan('Aphelion Agent Definitions Installer')));

  try {
    const force = options.force ?? false;

    if (options.all) {
      // 全プラットフォームをインストール
      const platforms: Platform[] = ['claude-code', 'copilot', 'codex'];
      for (const platform of platforms) {
        p.log.step(`${platform} をインストール中...`);
        await installPlatform(platform, cwd, force);
      }
    } else {
      // 指定プラットフォームをインストール (デフォルト: claude-code)
      const platformInput = options.platform ?? 'claude-code';
      const validPlatforms: Platform[] = ['claude-code', 'copilot', 'codex'];

      if (!validPlatforms.includes(platformInput as Platform)) {
        p.log.error(
          `無効なプラットフォームです: ${platformInput}\n有効な値: claude-code, copilot, codex`,
        );
        process.exit(1);
      }

      await installPlatform(platformInput as Platform, cwd, force);
    }

    p.outro(pc.bold(pc.green('インストールが完了しました！')));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    p.log.error(`インストール中にエラーが発生しました: ${message}`);
    process.exit(1);
  }
}

/**
 * プラットフォーム別のインストール処理を振り分ける
 */
async function installPlatform(platform: Platform, cwd: string, force: boolean): Promise<void> {
  switch (platform) {
    case 'claude-code':
      await installClaudeCode(cwd, force);
      break;
    case 'copilot':
      await installCopilot(cwd, force);
      break;
    case 'codex':
      await installCodex(cwd, force);
      break;
  }
}
