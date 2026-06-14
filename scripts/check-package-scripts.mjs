#!/usr/bin/env node
/**
 * Verifies that package.json scripts do not reference missing local Node entrypoints.
 *
 * This intentionally checks the drift pattern that has hurt this repo: scripts such
 * as `node scripts/foo.mjs` or `node LegacySolver/foo.mjs` surviving after the
 * target file was removed. It is conservative about shell parsing, but handles the
 * simple command shapes used in this package.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, 'package.json');
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

console.log('Package script entrypoints exist.');
