#!/usr/bin/env node
/** Consumer-inward guard for Phase 10 repair, pruning, and budget terminology. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readRepositoryText, repositoryPathKind } from './repository-file-view.mjs';

const cwd = process.cwd();
const rootArg = process.argv.find(arg => arg.startsWith('--scan-root='));
const ledgerArg = process.argv.find(arg => arg.startsWith('--ledger='));
const root = path.resolve(rootArg?.slice('--scan-root='.length) ?? cwd);
const ledgerPath = path.resolve(ledgerArg?.slice('--ledger='.length) ?? path.join(cwd, 'docs/naming-cleanup-ledger.json'));
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const currentArtifacts = ledger.phaseCurrentArtifacts?.['10'] ?? [];
const roots = ['modules', 'scripts', 'tests', '.github', 'docs'];
const extensions = new Set(['.ts', '.mjs', '.js', '.md', '.json', '.yml', '.yaml']);
const legacy = [
  'closeLengthGap', 'prune-gauntlet', 'prune gauntlet',
  'REPAIR_EXTRA_BUDGET_FRACTION', 'repairBudgetFractionOverride',
];
function walk(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function excluded(file) {
  if (file.startsWith('scripts/naming-cleanup-phase10-closeout')) return true;
  return file.startsWith('docs/archive/') || file.startsWith('docs/history/') ||
    file.startsWith('docs/naming-cleanup-') || file.startsWith('reports/') || file.startsWith('logs/');
}
const files = roots.flatMap(walk).filter(file => !excluded(file) && extensions.has(path.extname(file)) &&
  statSync(path.join(root, file)).isFile());
const failures = [];
const phaseRows = ledger.entries.filter(entry => entry.phase === 10);
const coverage = ledger.phaseCloseoutCoverage?.['10'] ?? {};
for (const row of phaseRows) {
  if (!coverage[row.id] || coverage[row.id].legacy !== row.old) failures.push(`ledger: missing/drifted closeout coverage for ${row.id}`);
}
for (const file of currentArtifacts) {
  if (repositoryPathKind(root, file) !== 'file') { failures.push(`${file}: registered current artifact missing`); continue; }
  const source = readRepositoryText(root, file);
  for (const spelling of legacy) if (source.includes(spelling)) failures.push(`${file}: current artifact contains legacy ${spelling}`);
}
for (const file of files) {
  const source = readFileSync(path.join(root, file), 'utf8');
  for (const spelling of legacy) if (source.includes(spelling)) failures.push(`${file}: legacy ${spelling}`);
}
for (const file of ['modules/solver/hard-prune-pipeline.ts', 'modules/solver/repair-search.ts', 'modules/solver/stage-budget.ts']) {
  if (!existsSync(path.join(root, file))) failures.push(`${file}: canonical surface missing`);
}
const required = {
  'modules/solver/repair-search.ts': 'searchCompletionFromPartialPath',
  'modules/solver/stage-budget.ts': 'REPAIR_ADDITIVE_BUDGET_MULTIPLIER',
  'modules/solver/orchestration.ts': 'repairAdditiveBudgetMultiplierOverride',
  'scripts/portfolio-solve-sweep-worker.mjs': 'repairAdditiveBudgetMultiplierOverride',
  'scripts/solver-parallel/race.mjs': 'repairAdditiveBudgetMultiplierOverride',
};
for (const [file, spelling] of Object.entries(required)) {
  if (!existsSync(path.join(root, file)) || !readFileSync(path.join(root, file), 'utf8').includes(spelling)) {
    failures.push(`${file}: canonical ${spelling} missing`);
  }
}
if (failures.length) {
  console.error(`Phase-10 closeout failed (${failures.length} issue(s)):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Phase-10 closeout clean: ${files.length} maintained surfaces plus ${currentArtifacts.length} registered current artifacts scanned; canonical definition, worker, and race boundaries present.`);
