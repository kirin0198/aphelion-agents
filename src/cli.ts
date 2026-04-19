import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cac from 'cac';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';

// Node バージョンチェック (20 未満は終了)
const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] < 20) {
  console.error(`エラー: Node.js v20 以上が必要です。現在のバージョン: v${process.versions.node}`);
  process.exit(1);
}

// package.json から version を取得
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/cli.js から見た package.json のパスを解決
const pkg = require(path.resolve(__dirname, '..', 'package.json')) as { version: string };

const cli = cac('aphelion-agents');

cli
  .command('init', 'Install Aphelion agent definitions into current directory')
  .option('--platform <name>', 'Target platform: claude-code (default) | copilot | codex')
  .option('--all', 'Install all three platforms')
  .option('--force', 'Overwrite without prompting')
  .action(initCommand);

cli
  .command('update', 'Update installed Aphelion agent definitions to the bundled version')
  .option('--force', 'Overwrite without prompting')
  .action(updateCommand);

cli.help();
cli.version(pkg.version);
cli.parse();
