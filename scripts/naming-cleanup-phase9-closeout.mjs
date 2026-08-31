#!/usr/bin/env node
/** Consumer-inward closeout guard for the Phase-9 command and live-path migration. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { repositoryPathKind } from './repository-file-view.mjs';

const rootArg = process.argv.find(arg => arg.startsWith('--scan-root='));
const ledgerArg = process.argv.find(arg => arg.startsWith('--ledger='));
const root = path.resolve(rootArg?.slice('--scan-root='.length) ?? process.cwd());
const ledgerPath = path.resolve(ledgerArg?.slice('--ledger='.length) ?? 'docs/naming-cleanup-ledger.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const read = file => readFileSync(path.join(root, file), 'utf8');
const phaseRows = ledger.entries.filter(entry => entry.phase === 9);
const legacy = [...new Set(phaseRows.map(entry => entry.old))];
const roots = ['modules', 'scripts', 'docs', '.github', 'data'];
const topLevel = ['package.json', 'AGENTS.md', 'README.md', 'DEVELOPER_REFERENCE.md'];
const extensions = new Set(['.js', '.mjs', '.ts', '.tsx', '.md', '.json', '.yml', '.yaml']);

function walk(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function excluded(file) {
  return file.startsWith('docs/archive/') || file.startsWith('docs/history/') ||
    file.startsWith('docs/naming-cleanup-') || file.startsWith('reports/') ||
    file.startsWith('logs/') || file.startsWith('scripts/naming-cleanup-');
}

const files = [...roots.flatMap(walk), ...topLevel]
  .filter((file, index, all) => all.indexOf(file) === index && !excluded(file))
  .filter(file => existsSync(path.join(root, file)) && statSync(path.join(root, file)).isFile() &&
    statSync(path.join(root, file)).size <= 2 * 1024 * 1024 && extensions.has(path.extname(file)));
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
for (const file of files) {
  const source = read(file);
  for (const spelling of legacy) {
    if (source.includes(spelling)) failures.push(`${file}: legacy Phase-9 spelling ${spelling}`);
  }
}

const pkg = JSON.parse(read('package.json'));
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
function canonicalSurfaceExists(file) {
  if (existsSync(path.join(root, file))) return true;
  // Normal CI intentionally sparse-checks out reports/. The canonical surface still exists when
  // Git tracks it at HEAD, so use the repository view rather than forcing large report blobs into
  // every Node-test checkout. Synthetic --scan-root fixtures remain ordinary filesystem checks.
  return !rootArg && repositoryPathKind(root, file) === 'file';
}

for (const file of [
  'scripts/run-solver-direct.mjs',
  'scripts/combine-solver-sweep-reports.mjs',
  'reports/stress/solver-corpus1-latest.json',
  'reports/stress/solver-corpus2-latest.json',
]) {
  if (!canonicalSurfaceExists(file)) failures.push(`${file}: canonical Phase-9 surface missing`);
}

if (failures.length) {
  console.error(`Phase-9 closeout failed (${failures.length} issue(s)):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Phase-9 closeout clean: ${files.length} maintained surfaces scanned; canonical commands and live paths are present.`);
