#!/usr/bin/env node
/**
 * Verifies package-script/tooling lifecycle references, mandatory agent-context budgets,
 * local/GitHub Actions gate parity, and the permanent-CI lifecycle boundary.
 *
 * This intentionally checks drift patterns that have hurt this repo: scripts such
 * as `node scripts/foo.mjs` surviving after the target file was removed, explicit
 * Vitest file arguments surviving a rename, invalid lifecycle overrides, mandatory
 * agent orientation quietly growing past its recorded route ceiling, deterministic
 * PR checks drifting out of the local finish-line contract, and completed campaign
 * scaffolding creeping back into the permanent gate.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const TOOLING_LIFECYCLE_PATH = path.join(ROOT, 'scripts', 'tooling-lifecycle.json');
const AGENT_CONTEXT_CHECK_PATH = path.join(ROOT, 'scripts', 'agent-context-budget.mjs');
const CI_GATE_PARITY_CHECK_PATH = path.join(ROOT, 'scripts', 'check-ci-gate-parity.mjs');
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

function isExplicitVitestFilePath(token) {
  if (!token || token.startsWith('-')) return false;
  if (/[*?\[\]{}]/.test(token)) return false;
  if (/^(?:https?:|data:)/i.test(token)) return false;
  return /^(?:\.?\.?\/|[A-Za-z0-9_.-]+\/).+\.(?:[cm]?[jt]sx?)$/.test(token);
}

for (const [scriptName, command] of Object.entries(scripts)) {
  const tokens = tokenize(command);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === 'node') {
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
      continue;
    }

    if (token !== 'vitest') continue;
    for (let probe = index + 1; probe < tokens.length; probe += 1) {
      const candidate = tokens[probe];
      if (isShellBoundary(candidate)) break;
      if (!isExplicitVitestFilePath(candidate)) continue;

      const target = path.resolve(ROOT, candidate);
      if (!fs.existsSync(target)) {
        missing.push({ scriptName, target: candidate, command });
      }
    }
  }
}

if (missing.length > 0) {
  console.error('package.json references missing local entrypoint files:');
  for (const { scriptName, target, command } of missing) {
    console.error(`  - ${scriptName}: ${target}`);
    console.error(`    ${command}`);
  }
  console.error('\nRemove the stale reference, restore the missing file, or update the path.');
  process.exit(1);
}

// Completed migrations/research bridges may remain in Git history or as explicitly retained
// forensic tools, but they do not get lifetime tenure in the universal PR gate. Durable behavior
// must be represented by a current, domain-named owner test instead.
const permanentGateErrors = [];
const forbiddenPermanentGateTasks = [
  [/^(?:check|test):naming/u, 'completed repository-wide naming migration'],
  [/^test:solver-research-resumption$/u, 'completed post-naming solver-resumption bridge'],
  [/^test:legacy-latency-portfolio-report-cli$/u, 'legacy research-report utility'],
];
for (const gate of ['check:validators', 'test:node']) {
  const command = scripts[gate];
  if (typeof command !== 'string') continue;
  for (const task of tokenize(command)) {
    if (!/^(?:check|test):/u.test(task)) continue;
    for (const [pattern, reason] of forbiddenPermanentGateTasks) {
      if (pattern.test(task)) {
        permanentGateErrors.push(`${gate}: ${task} belongs to ${reason}; retain the live invariant under a current owner test or run it on demand.`);
      }
    }
  }
}
if (permanentGateErrors.length) {
  console.error('Completed/legacy campaign tasks re-entered permanent CI:');
  for (const error of permanentGateErrors) console.error(`  - ${error}`);
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

function runRequiredCheck(scriptPath, label) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Missing ${path.relative(ROOT, scriptPath)}; ${label} cannot be checked.`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [scriptPath, '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`${label} failed:`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(result.status || 1);
  }
}

runRequiredCheck(AGENT_CONTEXT_CHECK_PATH, 'Agent-context budget check');
runRequiredCheck(CI_GATE_PARITY_CHECK_PATH, 'Local/GitHub Actions gate parity check');

console.log('Package script entrypoints, tooling lifecycle references, permanent-CI lifecycle, agent-context budgets, and CI gate parity are valid.');
