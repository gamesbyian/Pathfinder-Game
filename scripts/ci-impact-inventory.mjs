#!/usr/bin/env node
/**
 * Report how the current tracked repository maps onto the CI impact model.
 *
 * This is intentionally diagnostic in Phase 1. It does not gate CI yet because the point of the
 * inventory is to discover and resolve unknown/blast-radius seams before scoped validation lands.
 */
import process from 'node:process';

import { classifyPaths, loadImpactRules } from './ci-impact-classifier.mjs';
import { listRepositoryFiles } from './repository-file-view.mjs';

const root = process.cwd();
const config = loadImpactRules(root);
const files = listRepositoryFiles(root);
const result = classifyPaths(files, config);

const byRule = new Map();
const bySurface = new Map();
const unclassified = [];
const fullRulePaths = [];

for (const file of result.files) {
  const rule = file.rule ?? 'UNCLASSIFIED';
  byRule.set(rule, (byRule.get(rule) ?? 0) + 1);
  if (file.rule == null) unclassified.push(file.path);
  if (file.surfaces.includes('all')) fullRulePaths.push(file.path);
  for (const surface of file.surfaces) {
    bySurface.set(surface, (bySurface.get(surface) ?? 0) + 1);
  }
}

const report = {
  schemaVersion: 1,
  trackedFiles: files.length,
  aggregateWouldBeFull: result.full,
  unclassifiedCount: unclassified.length,
  fullRulePathCount: fullRulePaths.length,
  byRule: Object.fromEntries([...byRule.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  bySurface: Object.fromEntries([...bySurface.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  unclassified: unclassified.sort(),
  fullRulePaths: fullRulePaths.sort(),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Tracked files: ${report.trackedFiles}`);
  console.log(`Unclassified: ${report.unclassifiedCount}`);
  console.log(`Explicit full-impact paths: ${report.fullRulePathCount}`);
  console.log('\nRule counts:');
  for (const [rule, count] of Object.entries(report.byRule)) console.log(`  ${rule}: ${count}`);
  if (report.unclassified.length) {
    console.log('\nUnclassified paths (future changes safely fall back to full):');
    for (const file of report.unclassified) console.log(`  ${file}`);
  }
}

if (process.argv.includes('--require-zero-unclassified') && unclassified.length) {
  console.error(
    `\nCI impact inventory has ${unclassified.length} unclassified tracked path(s). `
    + 'Do not enable scoped CI until these are deliberately owned or explicitly accepted as full-impact.',
  );
  process.exitCode = 1;
}
