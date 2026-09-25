#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const measured = new Map([
  ['modules/solver/repair-search.test.ts', 5.460],
  ['modules/solver/diversification.test.ts', 2.845],
  ['modules/solver/orchestration-early-repair.test.ts', 2.459],
  ['modules/solver/beam-resumability-pilot.test.ts', 1.824],
  ['modules/solver/restart-continuation-harness.test.ts', 1.545],
  ['modules/solver/orchestration-late-repair-retry.test.ts', 1.209],
  ['modules/solver/hint-ablation-generator.test.ts', 0.990],
  ['modules/solver/attempt-dispatch.test.ts', 0.888],
  ['modules/solver/search.test.ts', 0.721],
  ['modules/solver/orchestration-retry-tiers.test.ts', 0.522],
  ['modules/solver/topology.test.ts', 0.506],
  ['modules/solver/lower-bounds.test.ts', 0.341],
  ['modules/solver/orchestration-main-search-reserves.test.ts', 0.330],
  ['modules/solver/hint-enumeration.test.ts', 0.322],
  ['modules/solver/orchestration-core.test.ts', 0.278],
  ['modules/domain/level-codec-roundtrip.test.ts', 0.270],
  ['modules/solver/orchestration-static-portfolio.test.ts', 0.261],
  ['modules/solver/orchestration-work-budget.test.ts', 0.241],
  ['modules/solver/admissible-order-search.test.ts', 0.183],
  ['scripts/audit-output-unit-tests.mjs', 0.148],
]);

const args = new Map(process.argv.slice(2).map(arg => {
  const [key, value] = arg.split('=', 2);
  return [key, value];
}));
const shard = Number(args.get('--shard'));
if (shard !== 1 && shard !== 2) throw new Error('--shard must be 1 or 2');

const raw = execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'list', '--filesOnly'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
const files = [...new Set(raw.split(/\r?\n/u).map(x => x.trim()).filter(Boolean))]
  .map(file => file.replace(/^\.\//u, ''))
  .sort();

const stale = [...measured.keys()].filter(file => !files.includes(file));
if (stale.length) {
  throw new Error('coverage timing seed contains stale files: ' + JSON.stringify(stale));
}

const bins = [
  { seconds: 0, files: [] },
  { seconds: 0, files: [] },
];
for (const file of [...files].sort((a, b) =>
  (measured.get(b) ?? 0) - (measured.get(a) ?? 0) || a.localeCompare(b))) {
  bins.sort((a, b) => a.seconds - b.seconds || a.files.length - b.files.length);
  bins[0].files.push(file);
  bins[0].seconds += measured.get(file) ?? 0;
}
const chosen = bins[shard - 1];
console.error(JSON.stringify({
  shard,
  files: chosen.files.length,
  totalFiles: files.length,
  predictedMeasuredSeconds: +chosen.seconds.toFixed(3),
  unmeasuredFiles: files.filter(file => !measured.has(file)).length,
  bothBins: bins.map(bin => ({ files: bin.files.length, predictedMeasuredSeconds: +bin.seconds.toFixed(3) })),
}));
for (const file of chosen.files) console.log(file);
