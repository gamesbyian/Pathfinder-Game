#!/usr/bin/env node
/**
 * Verifies package-script/tooling lifecycle references and the mandatory agent-context budget.
 *
 * This intentionally checks drift patterns that have hurt this repo: scripts such
 * as `node scripts/foo.mjs` surviving after the target file was removed, invalid
 * lifecycle overrides, and mandatory agent orientation quietly growing past its
 * recorded route ceiling.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const TOOLING_LIFECYCLE_PATH = path.join(ROOT, 'scripts', 'tooling-lifecycle.json');
const AGENT_CONTEXT_CHECK_PATH = path.join(ROOT, 'scripts', 'agent-context-budget.mjs');
const VALID_TOOLING_LIFECYCLES = new Set(['completed-migration', 'specialist-forensic', 'cold-research']);
const NODE_FLAGS_WITH_VALUES = new Set([
  '--conditions',
  '--diagnostic-dir',
  '--icu-data-dir',
  '--import',
  '--loader',
  '--max-old-space-size',
  '--openssl-config',
  '--preserve-symlinks-main',
  '--require',
  '--test-name-pattern',
  '--test-reporter',
  '--test-reporter-destination',
  '--title',
  '--user-data-dir',
]);

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
const scripts = packageJson.scripts || {};
const missing = [];

function tokenize(command) {
  // This is enough for the repo's package scripts: split on shell whitespace while
  // preserving simple single/double-quoted tokens.
  return command.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)?.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  }) || [];
}

function isShellBoundary(token) {
  return token === '&&' || token === '||' || token === ';' || token === '|';
}

function isLocalScriptPath(token) {
  if (!token || token.startsWith('-')) return false;
  if (/^(?:https?:|data:)/i.test(token)) return false;
  return /^(?:\.?\.?\/|[A-Za-z0-9_.-]+\/).+\.(?:mjs|cjs|js)$/.test(token);
}

for (const [scriptName, command] of Object.entries(scripts)) {
  const tokens = tokenize(command);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token !== 'node') continue;

    for (let probe = index + 1; probe < tokens.length; probe += 1) {
      const candidate = tokens[probe];
      if (isShellBoundary(candidate)) break;
      if (candidate === '-e' || candidate === '--eval' || candidate === '-p' || candidate === '--print') break;
      if (NODE_FLAGS_WITH_VALUES.has(candidate)) {
        probe += 1;
        continue;
      }
      if (candidate.startsWith('--') && candidate.includes('=')) continue;
      if (candidate.startsWith('-')) continue;
      if (!isLocalScriptPath(candidate)) break;

      const target = path.resolve(ROOT, candidate);
      if (!fs.existsSync(target)) {
        missing.push({ scriptName, target: candidate, command });
      }
      break;
    }
  }
}

if (missing.length > 0) {
  console.error('package.json references missing local Node script files:');
  for (const { scriptName, target, command } of missing) {
    console.error(`  - ${scriptName}: ${target}`);
    console.error(`    ${command}`);
  }
  console.error('\nRemove the stale script, restore the missing file, or update the path.');
  process.exit(1);
}

if (fs.existsSync(TOOLING_LIFECYCLE_PATH)) {
  const lifecycleDoc = JSON.parse(fs.readFileSync(TOOLING_LIFECYCLE_PATH, 'utf8'));
  const lifecycleErrors = [];
  if (lifecycleDoc.schemaVersion !== 1 || !lifecycleDoc.entries || typeof lifecycleDoc.entries !== 'object') {
    lifecycleErrors.push('scripts/tooling-lifecycle.json must have schemaVersion 1 and an entries object.');
  } else {
    for (const [file, info] of Object.entries(lifecycleDoc.entries)) {
      if (!file.startsWith('scripts/') || !fs.existsSync(path.join(ROOT, file))) {
        lifecycleErrors.push(`${file}: lifecycle override points to a missing/non-script path.`);
      }
      if (!VALID_TOOLING_LIFECYCLES.has(info?.lifecycle)) {
        lifecycleErrors.push(`${file}: unknown lifecycle ${JSON.stringify(info?.lifecycle)}.`);
      }
      if (typeof info?.note !== 'string' || info.note.trim() === '') {
        lifecycleErrors.push(`${file}: lifecycle override needs a non-empty note.`);
      }
    }
  }
  if (lifecycleErrors.length) {
    console.error('Invalid tooling lifecycle overrides:');
    for (const error of lifecycleErrors) console.error(`  - ${error}`);
    process.exit(1);
  }
}

if (!fs.existsSync(AGENT_CONTEXT_CHECK_PATH)) {
  console.error('Missing scripts/agent-context-budget.mjs; mandatory context routes cannot be checked.');
  process.exit(1);
}
const contextCheck = spawnSync(process.execPath, [AGENT_CONTEXT_CHECK_PATH, '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (contextCheck.status !== 0) {
  console.error('Agent-context budget check failed:');
  if (contextCheck.stdout?.trim()) console.error(contextCheck.stdout.trim());
  if (contextCheck.stderr?.trim()) console.error(contextCheck.stderr.trim());
  process.exit(contextCheck.status || 1);
}

console.log('Package script entrypoints, tooling lifecycle references, and agent-context budgets are valid.');
