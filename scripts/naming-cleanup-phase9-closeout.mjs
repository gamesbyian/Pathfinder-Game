#!/usr/bin/env node
/** Consumer-inward closeout guard for the Phase-9 command and live-path migration. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readRepositoryText, repositoryPathKind } from './repository-file-view.mjs';

const originalCwd = process.cwd();
const rootArg = process.argv.find(arg => arg.startsWith('--scan-root='));
const ledgerArg = process.argv.find(arg => arg.startsWith('--ledger='));
const root = path.resolve(rootArg?.slice('--scan-root='.length) ?? originalCwd);
const ledgerPath = path.resolve(originalCwd, ledgerArg?.slice('--ledger='.length) ?? 'docs/naming-cleanup-ledger.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const phaseRows = ledger.entries.filter(entry => entry.phase === 9);
const legacy = [...new Set(phaseRows.map(entry => entry.old))];
const roots = ['modules', 'scripts', 'docs', '.github', 'data', 'tests'];
const topLevel = ['package.json', 'AGENTS.md', 'README.md', 'DEVELOPER_REFERENCE.md', 'CLAUDE.md'];
const extensions = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.py', '.md', '.json', '.yml', '.yaml']);
const requiredCurrentArtifacts = [
  'logs/stress-corpus1-baseline.json',
  'logs/stress-corpus2-baseline.json',
  'reports/stress/solver-corpus1-latest.json',
  'reports/stress/solver-corpus2-latest.json',
];
const currentArtifacts = ledger.phaseCurrentArtifacts?.['9'] ?? [];

function walk(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function excludedAuthorityOrHistory(file) {
  return file.startsWith('docs/archive/') ||
    file.startsWith('docs/history/') ||
    file.startsWith('docs/naming-cleanup-') ||
    file.startsWith('scripts/naming-cleanup-');
}

function repositorySurfaceExists(file) {
  if (existsSync(path.join(root, file))) return true;
  // Synthetic --scan-root fixtures are ordinary filesystem trees. Real CI may sparse-check out
  // logs/reports, so ask Git about the tested HEAD instead of materializing multi-megabyte blobs.
  return !rootArg && repositoryPathKind(root, file) === 'file';
}

const files = [...roots.flatMap(walk), ...topLevel]
  .filter((file, index, all) => all.indexOf(file) === index && !excludedAuthorityOrHistory(file))
  .filter(file => existsSync(path.join(root, file)) && statSync(path.join(root, file)).isFile() &&
    extensions.has(path.extname(file)))
  .sort();

const failures = [];
const coverage = ledger.phaseCloseoutCoverage?.['9'] ?? {};
for (const row of phaseRows) {
  if (coverage[row.id]?.kind !== 'literal-legacy-surface' || coverage[row.id]?.legacy !== row.old) {
    failures.push(`docs/naming-cleanup-ledger.json: missing/drifted closeout coverage for ${row.id}`);
  }
}
for (const id of Object.keys(coverage)) {
  if (!phaseRows.some(row => row.id === id)) failures.push(`docs/naming-cleanup-ledger.json: unknown Phase-9 coverage row ${id}`);
}

if (!Array.isArray(currentArtifacts) || new Set(currentArtifacts).size !== currentArtifacts.length ||
    currentArtifacts.some(file => typeof file !== 'string' || !file.trim())) {
  failures.push('docs/naming-cleanup-ledger.json: phaseCurrentArtifacts["9"] must be a unique non-empty path list');
}
for (const file of requiredCurrentArtifacts) {
  if (!currentArtifacts.includes(file)) {
    failures.push(`docs/naming-cleanup-ledger.json: Phase-9 current-artifact registry omits ${file}`);
  }
}
for (const row of phaseRows.filter(row => row.kind === 'file')) {
  if (!currentArtifacts.includes(row.new)) {
    failures.push(`docs/naming-cleanup-ledger.json: Phase-9 canonical file row ${row.id} is not registered as current: ${row.new}`);
  }
}

const scanFiles = [...new Set([...files, ...currentArtifacts])];
for (const file of scanFiles) {
  if (!repositorySurfaceExists(file)) {
    failures.push(`${file}: registered/current Phase-9 surface missing`);
    continue;
  }
  const source = currentArtifacts.includes(file)
    ? readRepositoryText(root, file)
    : readFileSync(path.join(root, file), 'utf8');
  for (const spelling of legacy) {
    if (source.includes(spelling)) failures.push(`${file}: legacy Phase-9 spelling ${spelling}`);
  }
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const expectedCommands = {
  'solver:direct': 'node scripts/run-bundled.mjs scripts/run-solver-direct.mjs',
  'solver:regression': 'node scripts/run-bundled.mjs scripts/solver-bench.mjs',
  'solver:measure-speed': 'node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs',
  'stress:measure-solver': 'node scripts/run-bundled.mjs scripts/stress/benchmark.mjs',
  'stress:measure-solver:raced': 'node scripts/run-bundled.mjs scripts/solver-parallel/benchmark.mjs',
  'solver:combine-sweep-reports': 'node scripts/combine-solver-sweep-reports.mjs',
};
for (const [command, target] of Object.entries(expectedCommands)) {
  if (pkg.scripts?.[command] !== target) failures.push(`package.json: missing/drifted ${command} target`);
}

for (const file of ['scripts/run-solver-direct.mjs', 'scripts/combine-solver-sweep-reports.mjs']) {
  if (!repositorySurfaceExists(file)) failures.push(`${file}: canonical Phase-9 surface missing`);
}

if (failures.length) {
  console.error(`Phase-9 closeout failed (${failures.length} issue(s)):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Phase-9 closeout clean: ${files.length} maintained text surfaces plus ${currentArtifacts.length} registered current artifacts scanned; canonical commands and live paths are present.`);
