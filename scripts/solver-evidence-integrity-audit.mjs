#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildPopulationIntegrity, hashPopulation } from './solver-experiment-contract.mjs';

const OUT = 'reports/stress/solver-evidence-integrity-index.json';
const emptyLimits = { cumulativeNodeCeiling: null, initialWorkAllocation: null, totalWorkCeiling: null, wallSafetyDeadlineMs: null, wallDeadlineBinding: null };
const emptyOutcomes = { solved: null, exhaustedNegative: null, nodeLimited: null, workLimited: null, deadlineTruncated: null, errors: null, malformed: null, missing: null, unknown: null };

function read(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
function ids(document) { return (document.levels ?? []).map(row => String(row.id ?? row.levelId ?? row.level)); }
function record(evidenceId, overrides) {
  return {
    evidenceId, sourcePaths: [], sourceRunIds: [], intendedRef: null, actualSha: null,
    producer: { workflow: null, entrypoint: null, family: null },
    population: { kind: null, identityBasis: null, identityHash: null, expectedCount: null, observedCount: null, missingCount: null, duplicateCount: null, unexpectedCount: null },
    execution: { levelBlind: null, historyAware: null, reproducibilityExpected: null, schedulerMode: null, historicalInputs: [] },
    limits: { ...emptyLimits }, outcomes: { ...emptyOutcomes }, replacementEvidence: [], decisionBearing: null, notes: null,
    ...overrides,
  };
}

function canonicalRecord(corpus, baseline, evidenceId) {
  const expected = ids(read(corpus));
  const report = read(baseline);
  const integrity = buildPopulationIntegrity(expected, report.levels);
  const identity = hashPopulation({ kind: 'whole-corpus', identityBasis: 'canonical-corpus-level-ids', identities: expected, corpusIdentity: corpus });
  return record(evidenceId, {
    sourcePaths: [baseline, corpus], producer: { workflow: 'solver-stress-refresh.yml', entrypoint: 'scripts/stress/compile-baseline.mjs', family: 'cold-capability-refresh' },
    population: { kind: 'whole-corpus', identityBasis: 'canonical-corpus-level-ids', identityHash: identity.identityHash,
      expectedCount: integrity.expectedCount, observedCount: integrity.observedCount, missingCount: integrity.missingIds.length,
      duplicateCount: integrity.duplicateIds.length, unexpectedCount: integrity.unexpectedIds.length },
    execution: { levelBlind: true, historyAware: false, reproducibilityExpected: true, schedulerMode: 'production', historicalInputs: [] },
    outcomes: { ...emptyOutcomes, solved: report.solved, missing: integrity.missingIds.length, malformed: integrity.outcomes.malformed,
      unknown: integrity.expectedCount - report.solved - integrity.missingIds.length },
    reliability: integrity.complete ? 'valid-after-normalization' : 'incomplete', reconstructability: 'partial',
    rerunDisposition: integrity.complete ? 'none-required' : 'gap-fill-candidate', decisionBearing: integrity.complete,
    reasons: [integrity.complete ? 'Exact current corpus ID coverage is present; historical run/SHA provenance is not embedded in the compiled baseline.' : 'Current canonical corpus IDs are not completely represented.'],
  });
}

function historicalCombined(path, evidenceId, corpusLabel) {
  const report = read(path); const rows = report.levels ?? [];
  return record(evidenceId, {
    sourcePaths: [path], actualSha: report.commitSha ?? null,
    producer: { workflow: 'solver-highbudget-unsolved-sweep.yml', entrypoint: 'scripts/combine-solver-sweep-reports.mjs', family: 'history-aware-highbudget' },
    population: { kind: 'historical-frozen-unsolved-cohort', identityBasis: 'observed-level-ids-only',
      identityHash: hashPopulation({ kind: 'observed-cohort', identityBasis: 'stable-level-id', identities: ids(report), corpusIdentity: corpusLabel }).identityHash,
      expectedCount: null, observedCount: rows.length, missingCount: null, duplicateCount: 0, unexpectedCount: null },
    execution: { levelBlind: false, historyAware: true, reproducibilityExpected: null, schedulerMode: null, historicalInputs: ['prior unsolved population', 'saved hints/baseline'] },
    limits: { ...emptyLimits, wallSafetyDeadlineMs: report.budgetMs ?? null },
    outcomes: { ...emptyOutcomes, solved: report.solved ?? null, errors: null, unknown: Math.max(0, rows.length - (report.solved ?? 0)) },
    reliability: 'observational-only', reconstructability: 'partial', rerunDisposition: 'needs-human-review', decisionBearing: false,
    reasons: ['Observed rows and referee-valid solutions survive, but the intended frozen cohort and missing/error/truncation classes cannot be reconstructed from this aggregate.', 'Legacy combiner failed=!ok and errors=0 metadata is not reliable.'],
  });
}

function techniqueCensusRecord(path, runId) {
  const report = read(path);
  const cellIds = report.results.map(row => row.cellId);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of cellIds) seen.has(id) ? duplicates.add(id) : seen.add(id);
  const incomplete = report.missingShards.length > 0 || report.partialShards.length > 0 || duplicates.size > 0;
  return record(`technique-census-${runId}`, {
    sourcePaths: [path], sourceRunIds: [runId],
    producer: { workflow: 'technique-census.yml', entrypoint: 'scripts/combine-technique-census-shards.mjs', family: 'isolated-technique-census' },
    population: { kind: 'technique-census-cells', identityBasis: 'observed-cell-ids',
      identityHash: hashPopulation({ kind: 'observed-technique-census-cells', identityBasis: 'unique-observed-cell-id', identities: [...seen] }).identityHash,
      expectedCount: incomplete ? null : report.totalCells, observedCount: report.results.length, missingCount: incomplete ? null : 0,
      duplicateCount: duplicates.size, unexpectedCount: null },
    execution: { levelBlind: true, historyAware: false, reproducibilityExpected: null, schedulerMode: 'isolated-techniques', historicalInputs: [] },
    outcomes: { ...emptyOutcomes, solved: report.results.filter(row => row.ok).length,
      unknown: report.results.filter(row => !row.ok).length, missing: incomplete ? null : 0, malformed: 0 },
    reliability: incomplete ? 'incomplete' : 'valid-after-normalization', reconstructability: incomplete ? 'partial' : 'complete',
    rerunDisposition: incomplete ? 'needs-human-review' : 'none-required', decisionBearing: !incomplete,
    reasons: [incomplete
      ? `Dedicated combiner reports partial shards (${report.partialShards.join(', ') || 'none'}), missing shards (${report.missingShards.join(', ') || 'none'}), or ${duplicates.size} duplicated cell IDs; observed cells remain useful.`
      : 'Dedicated combiner reports no missing or partial shards and no duplicate cells; outcome terminology still requires normalization.'],
  });
}

export function buildIndex() {
  const records = [
    canonicalRecord('data/stress/stress-levels.json', 'logs/stress-corpus1-baseline.json', 'canonical-stress-refresh-corpus-1'),
    canonicalRecord('data/stress/stress-levels-random.json', 'logs/stress-corpus2-baseline.json', 'canonical-stress-refresh-corpus-2'),
    historicalCombined('reports/stress/highbudget-unsolved-sweep-corpus1-2026-07-24.json', 'highbudget-unsolved-2026-07-24-corpus-1', 'corpus-1'),
    historicalCombined('reports/stress/highbudget-unsolved-sweep-corpus2-2026-07-24.json', 'highbudget-unsolved-2026-07-24-corpus-2', 'corpus-2'),
    record('routing-regime-historical-paired-runs', { sourcePaths: ['.github/workflows/solver-routing-regime-sample-ab.yml'], producer: { workflow: 'solver-routing-regime-sample-ab.yml', entrypoint: 'scripts/stress/select-routing-regime-sample.mjs', family: 'routing-regime-sample-ab' }, reliability: 'invalid', reconstructability: 'unverifiable', rerunDisposition: 'needs-human-review', decisionBearing: false, reasons: ['Historical two-dispatch arms did not persist a shared sealed population hash; a shared seed cannot prove paired identity across revisions.'] }),
    record('production-replay-baseline-history', { sourcePaths: ['.github/workflows/solver-production-replay-baseline.yml'], producer: { workflow: 'solver-production-replay-baseline.yml', entrypoint: 'scripts/portfolio-solve-sweep.mjs', family: 'history-aware-production-replay' }, execution: { levelBlind: false, historyAware: true, reproducibilityExpected: true, schedulerMode: 'production', historicalInputs: ['baseline', 'prime-winner', 'saved hints'] }, reliability: 'observational-only', reconstructability: 'partial', rerunDisposition: 'none-required', decisionBearing: false, reasons: ['This family measures warm/history-aware replay and is not cold capability evidence.'] }),
    record('method-probe-historical-cardinality', { sourcePaths: ['.github/workflows/method-probe-sweep.yml'], producer: { workflow: 'method-probe-sweep.yml', entrypoint: 'scripts/method-probe-sweep.mjs', family: 'isolated-method-probe' }, reliability: 'incomplete', reconstructability: 'unverifiable', rerunDisposition: 'needs-human-review', decisionBearing: false, reasons: ['Historical dispatches relied on caller-maintained total_levels; committed artifacts do not establish dispatched corpus cardinality.'] }),
    techniqueCensusRecord('reports/stress/technique-census/32240161854/combined-cells.json', '32240161854'),
    techniqueCensusRecord('reports/stress/technique-census/33717910218/combined-cells.json', '33717910218'),
  ].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  return { schemaVersion: 1, generatedAt: '2026-09-12T00:00:00.000Z', generator: 'scripts/solver-evidence-integrity-audit.mjs', sourceRevision: null, records };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildIndex();
  fs.writeFileSync(OUT, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${index.records.length} evidence integrity records to ${OUT}`);
}
