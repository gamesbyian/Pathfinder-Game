#!/usr/bin/env node
/**
 * Learned-failure Stage A: rejection-population audit (docs/solver-optimization-current-queue.md
 * item #0, reports/2026-08-24-learned-failure-certificate-audit.md).
 *
 * Runs the real production solver ladder (Solver.solve, unmodified budgets/policy) over a level
 * sample with modules/solver/topology.ts's isConnected() rejection observer attached
 * (SolveOpts.connectivityRejectionObserver), collecting every already-computed connectivity
 * rejection this search performs. Purely observational: the observer changes no pruning/ordering/
 * budget decision (see topology.ts's own comment; verified byte-identical against solver:bench
 * --check with and without the observer attached).
 *
 * Answers Stage A's four questions:
 *   1. Which connectivity failure subtype actually consumes the failure population?
 *   2. How much EXACT-STATE recurrence exists within each subtype?
 *   3. Do coarse existing state/resource tuples recur across DIFFERENT exact histories/levels, or
 *      is the population already nearly unique before geometry is represented?
 *   4. At what work/depth do these failures occur?
 *
 * Usage:
 *   node scripts/connectivity-rejection-audit.mjs --corpus=data/stress/stress-levels-random.json \
 *     --levels=pos:1-40 --work-budget=500000 --out=reports/stress/connectivity-rejection-audit.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const flags = new Set(argv.filter(a => a.startsWith('--') && !a.includes('=')));

const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_SPEC = args.get('--levels') || 'pos:1-40';
// strictTotalWorkBudget, not a bare nodeBudget/timeBudgetMs: without it, production's ms-derived
// additive fallback tiers (repair fallback, admissible-order, etc. — see docs/solver-budget-
// determinism.md's "remaining ms-shaped allocation debt") can each add their OWN fresh work/time
// beyond the nominal budget, so a single hard level's real cost is not actually bounded by
// timeBudgetMs alone. A true whole-solve work cap keeps this tool's per-level cost predictable
// regardless of how many additive tiers a given level's attempts reach.
const WORK_BUDGET = Number(args.get('--work-budget') || 500_000);
const TIME_BUDGET_MS = Number(args.get('--time-budget-ms') || 30_000);
const OUT_FILE = args.get('--out') || 'reports/stress/connectivity-rejection-audit.json';
const SUMMARY_OUT_FILE = args.get('--summary-out') || OUT_FILE.replace(/\.json$/u, '-summary.md');
// Stage B (--boundary-sketch): also computes each rejection's reached-set fingerprint and boundary-
// blocker sketch (modules/solver/types.ts's ConnectivityBoundarySketch). Real but bounded extra
// cost per rejection (a grid-sized scan, never a second flood fill) -- left off by default so a
// plain Stage A run stays as cheap as before this flag existed.
const BOUNDARY_SKETCH = flags.has('--boundary-sketch');

function selectLevelsBySpec(levels, spec) {
    if (!spec) return levels.map((entry, i) => ({ entry, pos: i + 1 }));
    const tokens = spec.split(',').map(t => t.trim()).filter(Boolean);
    const out = [];
    for (const token of tokens) {
        const body = token.startsWith('pos:') ? token.slice(4) : token;
        const range = body.match(/^(\d+)-(\d+)$/);
        if (range) {
            const start = Number(range[1]), end = Number(range[2]);
            for (let p = start; p <= end; p++) out.push({ entry: levels[p - 1], pos: p });
        } else {
            const p = Number(body);
            out.push({ entry: levels[p - 1], pos: p });
        }
    }
    return out.filter(({ entry }) => entry != null);
}

const corpus = JSON.parse(readFileSync(path.resolve(CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const sample = selectLevelsBySpec(corpusLevels, LEVEL_SPEC);

console.log(`connectivity-rejection-audit: ${sample.length} level(s) from ${CORPUS_FILE}, work-budget=${WORK_BUDGET}, time-budget-ms=${TIME_BUDGET_MS}`);

const allRecords = [];
const levelSummaries = [];

for (const { entry, pos } of sample) {
    const { id, stressMeta: _sm, ...rawLevel } = entry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const records = [];
    const observer = { observe: (record) => records.push(record), includeBoundarySketch: BOUNDARY_SKETCH };
    let result;
    const t0 = Date.now();
    try {
        result = await Solver.solve(level, {
            workBudget: WORK_BUDGET,
            strictTotalWorkBudget: true,
            timeBudgetMs: TIME_BUDGET_MS,
            connectivityRejectionObserver: observer,
        });
    } catch (err) {
        console.log(`  [${pos}] ${id ?? 'unknown'} ERROR ${err?.message ?? err}`);
        continue;
    }
    const elapsedMs = Date.now() - t0;
    for (const r of records) allRecords.push({ ...r, levelId: id ?? null, levelPos: pos });
    levelSummaries.push({
        levelId: id ?? null, levelPos: pos, ok: !!result?.ok, status: result?.status ?? null,
        nodesExpanded: result?.nodesExpanded ?? null, workSpent: result?.workSpent ?? null,
        elapsedMs, rejectionCount: records.length,
    });
    console.log(`  [${pos}] ${id ?? 'unknown'} ${result?.ok ? 'SOLVED' : (result?.status ?? 'unsolved')} rejections=${records.length} ${elapsedMs}ms`);
}

// ─── Aggregation ────────────────────────────────────────────────────────────────────────────────

function coarseKey(r) {
    return `${r.subtype}|${r.objectiveIndex ?? ''}|${r.mpVisitedMask}|${r.mustCrossMask}|${r.reservedWallActive}`;
}

const subtypeCounts = {};
for (const r of allRecords) subtypeCounts[r.subtype] = (subtypeCounts[r.subtype] || 0) + 1;

// Q2: exact-state recurrence -- how many records share a stateFingerprint with at least one other
// record (within this whole collection, i.e. across all sampled levels/attempts)?
const fingerprintCounts = new Map();
for (const r of allRecords) fingerprintCounts.set(r.stateFingerprint, (fingerprintCounts.get(r.stateFingerprint) || 0) + 1);
const exactDuplicateRecords = allRecords.filter(r => fingerprintCounts.get(r.stateFingerprint) > 1).length;
const distinctFingerprints = fingerprintCounts.size;

// Q3: coarse-context recurrence ACROSS DIFFERENT exact states/levels -- for each coarse key, how
// many distinct exact-state fingerprints and how many distinct levels does it span?
const coarseToFingerprints = new Map();
const coarseToLevels = new Map();
for (const r of allRecords) {
    const key = coarseKey(r);
    if (!coarseToFingerprints.has(key)) coarseToFingerprints.set(key, new Set());
    coarseToFingerprints.get(key).add(r.stateFingerprint);
    if (!coarseToLevels.has(key)) coarseToLevels.set(key, new Set());
    coarseToLevels.get(key).add(r.levelPos);
}
const coarseKeysWithCrossStateRecurrence = [...coarseToFingerprints.values()].filter(set => set.size > 1).length;
const coarseKeysWithCrossLevelRecurrence = [...coarseToLevels.values()].filter(set => set.size > 1).length;
const distinctCoarseKeys = coarseToFingerprints.size;

// Stage B (--boundary-sketch only): within the dominant coarse cluster (goal subtype, no pending
// must-pass/must-cross obligation, no reserved wall -- the cluster the Stage A report identified as
// the one worth checking), do two DIFFERENT exact states (same coarse key, different
// stateFingerprint) also share the SAME reached-set fingerprint or the SAME normalized boundary-
// blocker set? That recurrence -- not the coarse key alone -- is what would make the boundary sketch
// a genuinely sufficient learned-failure certificate rather than just another coarse label.
let boundarySketchStage = null;
if (BOUNDARY_SKETCH) {
    const normalizedBlockerSet = sketch => sketch.boundaryBlockers.map(b => `${b.cell}:${b.reason}`).sort().join(',');
    const dominantRecords = allRecords.filter(r => r.subtype === 'goal' && r.mpVisitedMask === 0
        && r.mustCrossMask === 0 && !r.reservedWallActive && r.boundarySketch);
    const fingerprintToStates = new Map();
    const blockerSetToStates = new Map();
    for (const r of dominantRecords) {
        const fp = r.boundarySketch.reachedFingerprint;
        if (!fingerprintToStates.has(fp)) fingerprintToStates.set(fp, new Set());
        fingerprintToStates.get(fp).add(r.stateFingerprint);
        const bs = normalizedBlockerSet(r.boundarySketch);
        if (!blockerSetToStates.has(bs)) blockerSetToStates.set(bs, new Set());
        blockerSetToStates.get(bs).add(r.stateFingerprint);
    }
    const distinctReachedFingerprints = fingerprintToStates.size;
    const reachedFingerprintsWithCrossStateRecurrence = [...fingerprintToStates.values()].filter(set => set.size > 1).length;
    const distinctBlockerSets = blockerSetToStates.size;
    const blockerSetsWithCrossStateRecurrence = [...blockerSetToStates.values()].filter(set => set.size > 1).length;
    boundarySketchStage = {
        dominantClusterRecords: dominantRecords.length,
        distinctReachedFingerprints,
        reachedFingerprintsWithCrossStateRecurrence,
        reachedFingerprintsWithCrossStateRecurrenceRate: distinctReachedFingerprints
            ? +(100 * reachedFingerprintsWithCrossStateRecurrence / distinctReachedFingerprints).toFixed(1) : 0,
        distinctBlockerSets,
        blockerSetsWithCrossStateRecurrence,
        blockerSetsWithCrossStateRecurrenceRate: distinctBlockerSets
            ? +(100 * blockerSetsWithCrossStateRecurrence / distinctBlockerSets).toFixed(1) : 0,
    };
}

// Q4: work-point distribution.
function percentile(sorted, p) {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return sorted[idx];
}
const workBySubtype = {};
for (const subtype of Object.keys(subtypeCounts)) {
    const values = allRecords.filter(r => r.subtype === subtype).map(r => r.work).sort((a, b) => a - b);
    workBySubtype[subtype] = {
        min: values[0] ?? null, p50: percentile(values, 0.5), p90: percentile(values, 0.9), max: values.at(-1) ?? null,
    };
}

const summary = {
    population: { levels: sample.length, corpus: CORPUS_FILE, levelSpec: LEVEL_SPEC, workBudget: WORK_BUDGET, timeBudgetMs: TIME_BUDGET_MS },
    totalRejections: allRecords.length,
    subtypeCounts,
    subtypeShare: Object.fromEntries(Object.entries(subtypeCounts).map(([k, v]) => [k, allRecords.length ? +(100 * v / allRecords.length).toFixed(1) : 0])),
    exactStateRecurrence: {
        totalRecords: allRecords.length, distinctFingerprints,
        exactDuplicateRecords, exactDuplicateRate: allRecords.length ? +(100 * exactDuplicateRecords / allRecords.length).toFixed(2) : 0,
    },
    coarseContextRecurrence: {
        distinctCoarseKeys,
        coarseKeysWithCrossStateRecurrence, coarseKeysWithCrossStateRecurrenceRate: distinctCoarseKeys ? +(100 * coarseKeysWithCrossStateRecurrence / distinctCoarseKeys).toFixed(1) : 0,
        coarseKeysWithCrossLevelRecurrence, coarseKeysWithCrossLevelRecurrenceRate: distinctCoarseKeys ? +(100 * coarseKeysWithCrossLevelRecurrence / distinctCoarseKeys).toFixed(1) : 0,
    },
    workBySubtype,
    levelsWithZeroRejections: levelSummaries.filter(l => l.rejectionCount === 0).length,
    ...(boundarySketchStage ? { boundarySketchStage } : {}),
};

console.log('\n=== Stage A summary ===');
console.log(JSON.stringify(summary, null, 2));

// Each --boundary-sketch record adds a per-row reachedFingerprint plus a boundaryBlockers array,
// which roughly doubled raw output size on the 80-level/12,905-dominant-cluster corpus2 sample (the
// committed reports/stress/connectivity-rejection-audit-corpus2-stageb.json is ~90MB, close to
// GitHub's 100MB hard push limit). A larger --boundary-sketch sample should drop the raw `records`
// payload (or gzip it) rather than committing it as-is.
mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(OUT_FILE), JSON.stringify({ summary, levelSummaries, records: allRecords }));
console.log(`\nWrote ${OUT_FILE} (${allRecords.length} records, ${levelSummaries.length} levels)`);

const summaryMd = `# Connectivity rejection audit (Stage A)

Population: ${sample.length} levels from \`${CORPUS_FILE}\` (${LEVEL_SPEC}), work budget ${WORK_BUDGET.toLocaleString()}, time budget ${TIME_BUDGET_MS}ms.

Total rejections observed: ${allRecords.length}.

## Subtype prevalence

${Object.entries(subtypeCounts).map(([k, v]) => `- ${k}: ${v} (${summary.subtypeShare[k]}%)`).join('\n')}

## Exact-state recurrence

${exactDuplicateRecords}/${allRecords.length} records (${summary.exactStateRecurrence.exactDuplicateRate}%) share an exact-state fingerprint with at least one other record. ${distinctFingerprints} distinct fingerprints.

## Coarse-context recurrence

${distinctCoarseKeys} distinct coarse (subtype, objective, pending-mask, reserved-wall) keys. ${coarseKeysWithCrossStateRecurrence} (${summary.coarseContextRecurrence.coarseKeysWithCrossStateRecurrenceRate}%) recur across more than one exact state; ${coarseKeysWithCrossLevelRecurrence} (${summary.coarseContextRecurrence.coarseKeysWithCrossLevelRecurrenceRate}%) recur across more than one level.

## Work-point distribution by subtype

${Object.entries(workBySubtype).map(([k, v]) => `- ${k}: min=${v.min}, p50=${v.p50}, p90=${v.p90}, max=${v.max}`).join('\n')}
${boundarySketchStage ? `
## Stage B: boundary-sketch recurrence (dominant cluster: goal, no pending obligation, no reserved wall)

${boundarySketchStage.dominantClusterRecords} records in the dominant cluster. ${boundarySketchStage.distinctReachedFingerprints} distinct reached-set fingerprints, of which ${boundarySketchStage.reachedFingerprintsWithCrossStateRecurrence} (${boundarySketchStage.reachedFingerprintsWithCrossStateRecurrenceRate}%) recur across more than one exact state. ${boundarySketchStage.distinctBlockerSets} distinct normalized boundary-blocker sets, of which ${boundarySketchStage.blockerSetsWithCrossStateRecurrence} (${boundarySketchStage.blockerSetsWithCrossStateRecurrenceRate}%) recur across more than one exact state.
` : ''}`;
writeFileSync(path.resolve(SUMMARY_OUT_FILE), summaryMd);
console.log(`Wrote ${SUMMARY_OUT_FILE}`);
