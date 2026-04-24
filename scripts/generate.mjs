#!/usr/bin/env node
// generate.mjs
// .claude/ 配下の各種 .md を読み、frontmatter を書き換えて
// platforms/copilot/ と platforms/codex/ に書き出すスクリプト。
// generate.py の Node.js 移植版。Node.js 標準ライブラリのみで動作。

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(ROOT, '.claude');
const PLATFORMS_DIR = path.join(ROOT, 'platforms');

// ---------------------------------------------------------------------------
// ツール名マッピング: Claude Code -> GitHub Copilot
// ---------------------------------------------------------------------------
/** @type {Record<string, string>} */
const COPILOT_TOOL_MAP = {
  Read: 'read',
  Write: 'edit',
  Edit: 'edit',
  Bash: 'execute',
  Glob: 'search',
  Grep: 'search',
  Agent: 'agent',
  WebSearch: 'web',
  WebFetch: 'web',
};

// オーケストレーターエージェント (orchestrator-rules をインライン展開する対象)
const ORCHESTRATOR_NAMES = new Set([
  'discovery-flow',
  'delivery-flow',
  'operations-flow',
  'maintenance-flow',
]);

// Codex スキルに変換するコマンド (スタンドアロンユーティリティのみ)
const CODEX_SKILL_COMMANDS = ['vuln-scan', 'secrets-scan'];

// Codex AGENTS.md サイズ上限
const CODEX_MAX_BYTES = 32 * 1024;

// ---------------------------------------------------------------------------
// YAML frontmatter パーサー (外部依存なし)
// ---------------------------------------------------------------------------
/**
 * ファイル内容から YAML frontmatter と本文を分離する。
 * frontmatter がない場合は ({}, full_content) を返す。
 * @param {string} content
 * @returns {[Record<string, string>, string]}
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return [{}, content];
  }

  const lines = content.split('\n');
  let endLine = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endLine = i;
      break;
    }
  }

  if (endLine === null) {
    return [{}, content];
  }

  const fmLines = lines.slice(1, endLine);
  const body = lines.slice(endLine + 1).join('\n');

  /** @type {Record<string, string>} */
  const fm = {};
  /** @type {string | null} */
  let currentKey = null;
  /** @type {string[]} */
  let multilineBuf = [];

  for (const line of fmLines) {
    const m = line.match(/^([a-z_-]+):\s*(.*)/);
    if (m) {
      // 前のキーをフラッシュ
      if (currentKey !== null && multilineBuf.length > 0) {
        fm[currentKey] = multilineBuf.join('\n').trim();
      }
      currentKey = m[1];
      const value = m[2].trim();
      if (value === '|') {
        multilineBuf = [];
      } else if (value) {
        fm[currentKey] = value;
        currentKey = null;
        multilineBuf = [];
      } else {
        fm[currentKey] = '';
        currentKey = null;
        multilineBuf = [];
      }
    } else if (currentKey !== null) {
      multilineBuf.push(line);
    }
  }

  if (currentKey !== null && multilineBuf.length > 0) {
    fm[currentKey] = multilineBuf.join('\n').trim();
  }

  return [fm, body];
}

// ---------------------------------------------------------------------------
// Copilot 生成
// ---------------------------------------------------------------------------
/**
 * Claude エージェントのメタデータから Copilot 互換の frontmatter を構築する。
 * @param {Record<string, string>} fm
 * @returns {string}
 */
function copilotFrontmatter(fm) {
  const parts = ['---'];

  if ('name' in fm) {
    parts.push(`name: ${fm['name']}`);
  }

  if ('description' in fm) {
    const desc = fm['description'];
    if (desc.includes('\n')) {
      parts.push('description: |');
      for (const dl of desc.split('\n')) {
        parts.push(`  ${dl}`);
      }
    } else {
      parts.push(`description: "${desc}"`);
    }
  }

  if ('tools' in fm) {
    const claudeTools = fm['tools'].split(',').map((t) => t.trim());
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {string[]} */
    const copilotTools = [];
    for (const t of claudeTools) {
      const mapped = COPILOT_TOOL_MAP[t] ?? t.toLowerCase();
      if (!seen.has(mapped)) {
        copilotTools.push(mapped);
        seen.add(mapped);
      }
    }
    parts.push('tools:');
    for (const t of copilotTools) {
      parts.push(`  - ${t}`);
    }
  }

  // model は省略 — Copilot は独自のモデル選択を使用する
  parts.push('---');
  return parts.join('\n');
}

/**
 * Copilot 向けに Claude Code 固有の参照を置換する。
 * @param {string} text
 * @returns {string}
 */
function replaceCopilot(text) {
  let result = text;

  // バッククォートで囲まれたツール名
  for (const [claude, copilot] of Object.entries(COPILOT_TOOL_MAP)) {
    result = result.split('`' + claude + '`').join('`' + copilot + '`');
  }

  // AskUserQuestion — バッククォートありおよび呼び出しパターン
  result = result.split('`AskUserQuestion`').join('text output with structured choices');
  result = result.replace(
    /(?:Use |use |via |using )`?AskUserQuestion`?/g,
    'present choices to the user via text output',
  );
  // セクションヘッダーと残余の参照
  result = result.split('### AskUserQuestion Tool (Recommended)').join(
    '### Structured Choices (Recommended)',
  );
  result = result.split('### AskUserQuestion Usage Examples').join(
    '### Structured Choice Examples',
  );
  result = result.replace(/AskUserQuestion/g, 'structured choice prompt');

  // パス参照
  result = result.split('.claude/orchestrator-rules.md').join(
    '.github/orchestrator-rules.md',
  );
  result = result.split('.claude/agents/').join('.github/agents/');
  result = result.split('.claude/rules/aphelion-overview.md').join('.github/copilot-instructions.md');
  // スタンドアロンの CLAUDE.md 参照 (パス区切り文字の直前でない) を置換
  result = result.replace(/(?<![/.])CLAUDE\.md/g, 'copilot-instructions.md');

  // Agent 呼び出しパターン
  result = result.replace(
    /Agent\(\s*\n?\s*subagent_type:\s*"([^"]+)"/g,
    '@$1 (',
  );

  return result;
}

/**
 * GitHub Copilot 設定を platforms/copilot/ 配下に生成する。
 * @param {{ clean: boolean }} options
 */
function generateCopilot({ clean = false } = {}) {
  const copilotDir = path.join(PLATFORMS_DIR, 'copilot');

  if (clean) {
    if (fs.existsSync(copilotDir)) {
      fs.rmSync(copilotDir, { recursive: true, force: true });
      console.log(`  Cleaned: ${copilotDir}`);
    }
    return;
  }

  fs.mkdirSync(copilotDir, { recursive: true });
  const agentsDir = path.join(copilotDir, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // --- copilot-instructions.md (aphelion-overview.md から) ---
  let claudeMd = fs.readFileSync(path.join(CLAUDE_DIR, 'rules', 'aphelion-overview.md'), 'utf-8');
  let instructions = replaceCopilot(claudeMd);
  instructions = instructions.split(
    '# Aphelion Workflow Overview',
  ).join('# Aphelion Workflow Common Rules');
  // Claude 固有のオーケストレーターファイル参照を削除
  instructions = instructions.replace(
    /> \*\*For flow orchestrators:\*\*[^\n]*\n/g,
    '',
  );
  const outInstructions = path.join(copilotDir, 'copilot-instructions.md');
  fs.writeFileSync(outInstructions, instructions, 'utf-8');
  console.log(`  ${outInstructions}`);

  // --- orchestrator-rules (オーケストレーターエージェントへのインライン展開用) ---
  const orchRulesRaw = fs.readFileSync(
    path.join(CLAUDE_DIR, 'orchestrator-rules.md'),
    'utf-8',
  );
  const orchRules = replaceCopilot(orchRulesRaw);

  // --- エージェントファイル ---
  let count = 0;
  const agentSources = fs
    .readdirSync(path.join(CLAUDE_DIR, 'agents'))
    .filter((f) => f.endsWith('.md'))
    .sort();

  for (const srcFile of agentSources) {
    const srcPath = path.join(CLAUDE_DIR, 'agents', srcFile);
    const content = fs.readFileSync(srcPath, 'utf-8');
    const [fm, body] = parseFrontmatter(content);

    // Copilot は .agent.md 拡張子を使用
    const stem = srcFile.replace(/\.md$/, '');
    const outName = stem + '.agent.md';

    if (Object.keys(fm).length === 0) {
      // プレーンファイル — テキスト置換のみ実施
      fs.writeFileSync(
        path.join(agentsDir, outName),
        replaceCopilot(content),
        'utf-8',
      );
      count++;
      continue;
    }

    const header = copilotFrontmatter(fm);
    let converted = replaceCopilot(body);

    // オーケストレーターには orchestrator-rules をインライン展開
    if (ORCHESTRATOR_NAMES.has(stem)) {
      converted = converted.replace(/> \*\*共通ルール:\*\*[^\n]*\n/g, '');
      converted = converted.trimEnd() + '\n\n---\n\n' + orchRules;
    }

    fs.writeFileSync(
      path.join(agentsDir, outName),
      header + '\n' + converted,
      'utf-8',
    );
    count++;
  }

  console.log(`  ${agentsDir}/ (${count} agents)`);
}

// ---------------------------------------------------------------------------
// Codex 生成
// ---------------------------------------------------------------------------
/**
 * Codex 向けに Claude Code 固有の参照を削除・中立化する。
 * @param {string} text
 * @returns {string}
 */
function replaceCodex(text) {
  let result = text;

  // バッククォートで囲まれたツール名をプレーンワードに変換
  for (const claude of Object.keys(COPILOT_TOOL_MAP)) {
    result = result.split('`' + claude + '` tool').join('the appropriate tool');
    result = result.split('`' + claude + '`').join(claude.toLowerCase());
  }

  result = result.split('`AskUserQuestion`').join('asking the user');
  result = result.replace(
    /(?:Use |use |via |using )`?AskUserQuestion`?/g,
    'ask the user',
  );
  // セクションヘッダーと残余の参照
  result = result.split('### AskUserQuestion Tool (Recommended)').join(
    '### Structured User Questions (Recommended)',
  );
  result = result.replace(/AskUserQuestion/g, 'user prompt');

  // パス参照
  result = result.split('.claude/orchestrator-rules.md').join(
    'the orchestrator rules section below',
  );
  result = result.split('.claude/agents/').join('agents/');
  result = result.split('.claude/rules/aphelion-overview.md').join('the global rules above');
  result = result.replace(/(?<![/.])CLAUDE\.md/g, 'global rules');

  return result;
}

/**
 * OpenAI Codex 設定を platforms/codex/ 配下に生成する。
 * @param {{ clean: boolean }} options
 */
function generateCodex({ clean = false } = {}) {
  const codexDir = path.join(PLATFORMS_DIR, 'codex');

  if (clean) {
    if (fs.existsSync(codexDir)) {
      fs.rmSync(codexDir, { recursive: true, force: true });
      console.log(`  Cleaned: ${codexDir}`);
    }
    return;
  }

  fs.mkdirSync(codexDir, { recursive: true });

  // --- AGENTS.md (aphelion-overview.md + orchestrator-rules) ---
  const claudeMd = fs.readFileSync(path.join(CLAUDE_DIR, 'rules', 'aphelion-overview.md'), 'utf-8');
  const orchRules = fs.readFileSync(
    path.join(CLAUDE_DIR, 'orchestrator-rules.md'),
    'utf-8',
  );

  let claudeConv = replaceCodex(claudeMd);
  const orchConv = replaceCodex(orchRules);

  claudeConv = claudeConv.split(
    '# Aphelion Workflow Overview',
  ).join('# Aphelion Workflow Rules');
  claudeConv = claudeConv.replace(
    /> \*\*For flow orchestrators:\*\*[^\n]*\n/g,
    '',
  );

  const agentsMd = claudeConv.trimEnd() + '\n\n---\n\n' + orchConv;

  const sizeBytes = Buffer.byteLength(agentsMd, 'utf-8');
  const sizeKb = sizeBytes / 1024;
  const out = path.join(codexDir, 'AGENTS.md');
  fs.writeFileSync(out, agentsMd, 'utf-8');
  const status = sizeBytes <= CODEX_MAX_BYTES ? 'OK' : 'EXCEEDS 32KiB LIMIT';
  console.log(`  ${out} (${sizeKb.toFixed(1)}KiB — ${status})`);

  // --- コマンドからスキル生成 ---
  const commandsDir = path.join(CLAUDE_DIR, 'commands');
  for (const cmdName of CODEX_SKILL_COMMANDS) {
    const cmdPath = path.join(commandsDir, `${cmdName}.md`);
    if (!fs.existsSync(cmdPath)) {
      continue;
    }

    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    const firstLine = cmdContent.split('\n')[0].trim();

    const skillDir = path.join(codexDir, 'skills', cmdName);
    fs.mkdirSync(skillDir, { recursive: true });

    // $ARGUMENTS プレースホルダーを削除
    let body = replaceCodex(cmdContent);
    body = body.replace(/\n?\$ARGUMENTS\s*\n?/g, '');

    const skillMd = `---\nname: ${cmdName}\ndescription: ${firstLine}\n---\n\n${body}`;
    const skillOut = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillOut, skillMd, 'utf-8');
    console.log(`  ${skillOut}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const { values } = parseArgs({
    options: {
      platform: {
        type: 'string',
        short: 'p',
      },
      clean: {
        type: 'boolean',
        default: false,
      },
    },
    strict: true,
  });

  const platform = values.platform ?? null;
  const clean = values.clean;

  // platform の値を検証
  if (platform !== null && platform !== 'copilot' && platform !== 'codex') {
    console.error(
      `error: --platform must be 'copilot' or 'codex', got '${platform}'`,
    );
    process.exit(1);
  }

  console.log('Aphelion — Platform Generator');
  console.log('='.repeat(40));

  if (platform === null || platform === 'copilot') {
    console.log('\n[GitHub Copilot]');
    generateCopilot({ clean });
  }

  if (platform === null || platform === 'codex') {
    console.log('\n[OpenAI Codex]');
    generateCodex({ clean });
  }

  if (!clean) {
    console.log('\n' + '='.repeat(40));
    console.log('Done! To use in your project:\n');
    console.log('  Copilot:  cp -r platforms/copilot/* <project>/.github/');
    console.log('  Codex:    cp platforms/codex/AGENTS.md <project>/');
    console.log('            cp -r platforms/codex/skills/ <project>/');
  }
}

main();
