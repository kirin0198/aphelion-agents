import path from 'node:path';
import { fileURLToPath } from 'node:url';

// dist/cli.js から見て package root は 1 つ上
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(__dirname, '..');

export const CLAUDE_SOURCE = path.join(PACKAGE_ROOT, '.claude');
export const COPILOT_SOURCE = path.join(PACKAGE_ROOT, 'platforms', 'copilot');
export const CODEX_SOURCE = path.join(PACKAGE_ROOT, 'platforms', 'codex');
