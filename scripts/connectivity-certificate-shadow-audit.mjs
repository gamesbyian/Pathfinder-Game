#!/usr/bin/env node
/**
 * Computational-work-elimination audit: portal-free connectivity goal-cut certificate shadow.
 * Runs the ordinary solver under a strict whole-solve work cap. The shadow never prunes.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_SPEC = args.get('--levels') || 'pos:81-104';
const BASE_WORK_BUDGET = Number(args.get('--work-budget') || 500000);
const TIME_BUDGET_MS = Number(args.get('--time-budget-ms') || 30000);
const MAX_CERTIFICATES = Number(args.get('--max-certificates') || 64);
const OUT_FILE = args.get('--out') || 'reports/stress/connectivity-certificate-shadow-audit.json';
const SUMMARY_OUT_FILE = args.get('--summary-out') || OUT_FILE.replace(/\.json$/u, '-summary.md');

function selectLevelsBySpec(levels, spec) {
    const tokens = String(spec || '').split(',').map(t => t.trim()).filter(Boolean);
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

function percentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function makeLevelStats(levelId, levelPos) {
    return {
        levelId, levelPos,
        certificatesProduced: 0, certificatesDuplicated: 0, certificatesDropped: 0, boundarySizes: [],
        certificateSignatureCounts: new Map(), retainedCertificatesById: new Map(), hitCountsBySignature: new Map(),
        scheduledProbeCalls: 0, certificatesScanned: 0, positionEligibleCertificates: 0, boundaryCellChecks: 0,
        shadowHits: 0, crossExactStateHits: 0, confirmedGoalUnreachableHits: 0,
        falsePositiveHits: 0, hitSourceAgeWork: [], hitBoundarySizes: [],
        unscheduledProbeCalls: 0, unscheduledCertificatesScanned: 0,
        unscheduledPositionEligibleCertificates: 0, unscheduledBoundaryCellChecks: 0,
        unscheduledHits: 0, unscheduledCrossExactStateHits: 0, unscheduledHitSourceAgeWork: [],
        unscheduledByCaller: new Map(),
    };
}

function attributionBucket(map, caller) {
    const key = caller ?? 'unknown';
    let bucket = map.get(key);
    if (!bucket) {
        bucket = {
            probes: 0, certificateCandidates: 0, boundaryCellChecks: 0, hits: 0, crossExactStateHits: 0,
            hitSourceAgeWork: [], hitRemainingSteps: [], schedulePhases: new Map(),
        };
        map.set(key, bucket);
    }
    return bucket;
}

const callerAggregate = new Map();

const corpusDoc = JSON.parse(readFileSync(path.resolve(CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const sample = selectLevelsBySpec(corpusLevels, LEVEL_SPEC);
console.log('connectivity-certificate-shadow-audit: ' + sample.length + ' level(s), work=' + BASE_WORK_BUDGET + ', cap=' + MAX_CERTIFICATES);

const levels = [];
for (const { entry, pos } of sample) {
    const { id, stressMeta: _stressMeta, ...rawLevel } = entry;
    const levelId = id ?? ('pos:' + pos);
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const stats = makeLevelStats(levelId, pos);
    const observer = {
        maxCertificates: MAX_CERTIFICATES,
        observeUnscheduled: true,
        observe(record) {
            if (record.kind === 'certificate' || record.kind === 'certificate-duplicate' || record.kind === 'certificate-dropped') {
                if (record.certificateSignature) {
                    stats.certificateSignatureCounts.set(
                        record.certificateSignature,
                        (stats.certificateSignatureCounts.get(record.certificateSignature) ?? 0) + 1,
                    );
                }
                if (Number.isFinite(record.boundarySize)) stats.boundarySizes.push(record.boundarySize);
                if (record.kind === 'certificate') {
                    stats.certificatesProduced++;
                    if (record.certificateId !== undefined) {
                        stats.retainedCertificatesById.set(record.certificateId, {
                            signature: record.certificateSignature ?? null,
                            boundarySize: record.boundarySize ?? null,
                        });
                    }
                } else if (record.kind === 'certificate-duplicate') {
                    stats.certificatesDuplicated++;
                } else {
                    stats.certificatesDropped++;
                }
                return;
            }
            if (record.kind === 'unscheduled-probe') {
                stats.unscheduledProbeCalls++;
                stats.unscheduledCertificatesScanned += record.certificatesScanned ?? 0;
                stats.unscheduledPositionEligibleCertificates += record.positionEligibleCertificates ?? 0;
                stats.unscheduledBoundaryCellChecks += record.boundaryCellChecks ?? 0;

                const local = attributionBucket(stats.unscheduledByCaller, record.researchCaller);
                const global = attributionBucket(callerAggregate, record.researchCaller);
                for (const bucket of [local, global]) {
                    bucket.probes++;
                    bucket.certificateCandidates += record.certificatesScanned ?? 0;
                    bucket.boundaryCellChecks += record.boundaryCellChecks ?? 0;
                    if (record.researchSchedulePhase != null) {
                        const phase = String(record.researchSchedulePhase);
                        bucket.schedulePhases.set(phase, (bucket.schedulePhases.get(phase) ?? 0) + 1);
                    }
                }

                if (record.hitCertificateId === undefined) return;
                stats.unscheduledHits++;
                if (record.crossExactState) stats.unscheduledCrossExactStateHits++;
                const age = Number.isFinite(record.hitSourceWork) ? Math.max(0, record.work - record.hitSourceWork) : null;
                if (age != null) stats.unscheduledHitSourceAgeWork.push(age);
                for (const bucket of [local, global]) {
                    bucket.hits++;
                    if (record.crossExactState) bucket.crossExactStateHits++;
                    if (age != null) bucket.hitSourceAgeWork.push(age);
                    if (Number.isFinite(record.researchRemainingSteps)) {
                        bucket.hitRemainingSteps.push(record.researchRemainingSteps);
                    }
                }
                return;
            }
            if (record.kind !== 'probe') return;
            stats.scheduledProbeCalls++;
            stats.certificatesScanned += record.certificatesScanned ?? 0;
            stats.positionEligibleCertificates += record.positionEligibleCertificates ?? 0;
            stats.boundaryCellChecks += record.boundaryCellChecks ?? 0;
            if (record.hitCertificateId === undefined) return;
            stats.shadowHits++;
            if (record.crossExactState) stats.crossExactStateHits++;
            if (record.confirmedGoalUnreachable) stats.confirmedGoalUnreachableHits++;
            else stats.falsePositiveHits++;
            if (Number.isFinite(record.hitSourceWork)) stats.hitSourceAgeWork.push(Math.max(0, record.work - record.hitSourceWork));
            const retained = stats.retainedCertificatesById.get(record.hitCertificateId);
            if (retained?.signature) {
                stats.hitCountsBySignature.set(retained.signature, (stats.hitCountsBySignature.get(retained.signature) ?? 0) + 1);
            }
            if (Number.isFinite(retained?.boundarySize)) stats.hitBoundarySizes.push(retained.boundarySize);
        },
    };

    const t0 = Date.now();
    let result;
    try {
        result = await Solver.solveLevel(level, {
            baseWorkBudget: BASE_WORK_BUDGET,
            strictTotalWorkBudget: true,
            timeBudgetMs: TIME_BUDGET_MS,
            connectivityCertificateShadowObserver: observer,
        });
    } catch (err) {
        levels.push({ ...stats, error: String(err?.message ?? err), elapsedMs: Date.now() - t0 });
        console.log('  [' + pos + '] ' + levelId + ' ERROR ' + (err?.message ?? err));
        continue;
    }

    const certificateOccurrences = [...stats.certificateSignatureCounts.values()].reduce((sum, count) => sum + count, 0);
    const repeatedCertificateOccurrences = [...stats.certificateSignatureCounts.values()]
        .reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const topHitCounts = [...stats.hitCountsBySignature.values()].sort((a, b) => b - a).slice(0, 8);
    const unscheduledByCaller = Object.fromEntries([...stats.unscheduledByCaller].map(([caller, bucket]) => [caller, {
        probes: bucket.probes,
        certificateCandidates: bucket.certificateCandidates,
        boundaryCellChecks: bucket.boundaryCellChecks,
        hits: bucket.hits,
        crossExactStateHits: bucket.crossExactStateHits,
        hitSourceAgeWorkP50: percentile(bucket.hitSourceAgeWork, 0.5),
        hitRemainingStepsP50: percentile(bucket.hitRemainingSteps, 0.5),
        schedulePhaseCounts: Object.fromEntries([...bucket.schedulePhases].sort((a, b) => Number(a[0]) - Number(b[0]))),
    }]));
    levels.push({
        ...stats,
        certificateSignatureCounts: undefined,
        retainedCertificatesById: undefined,
        hitCountsBySignature: undefined,
        boundarySizes: undefined,
        hitSourceAgeWork: undefined,
        hitBoundarySizes: undefined,
        unscheduledHitSourceAgeWork: undefined,
        unscheduledByCaller,
        certificateOccurrences,
        uniqueCertificateSignatures: stats.certificateSignatureCounts.size,
        repeatedCertificateOccurrences,
        signaturesWithHits: stats.hitCountsBySignature.size,
        maxHitsPerSignature: topHitCounts[0] ?? 0,
        topHitCounts,
        boundarySizeP50: percentile(stats.boundarySizes, 0.5),
        boundarySizeP90: percentile(stats.boundarySizes, 0.9),
        hitBoundarySizeP50: percentile(stats.hitBoundarySizes, 0.5),
        hitBoundarySizeP90: percentile(stats.hitBoundarySizes, 0.9),
        hitSourceAgeWorkP50: percentile(stats.hitSourceAgeWork, 0.5),
        unscheduledHitSourceAgeWorkP50: percentile(stats.unscheduledHitSourceAgeWork, 0.5),
        ok: !!result?.ok,
        status: result?.status ?? null,
        nodesExpanded: result?.nodesExpanded ?? null,
        workSpent: result?.workSpent ?? null,
        elapsedMs: Date.now() - t0,
    });
    console.log('  [' + pos + '] ' + levelId + ' hits=' + stats.shadowHits + ' cross-state=' + stats.crossExactStateHits + ' false=' + stats.falsePositiveHits);
}

const sum = key => levels.reduce((n, row) => n + (Number(row[key]) || 0), 0);
const summary = {
    schemaVersion: 1,
    kind: 'pathfinder-connectivity-goal-cut-certificate-shadow',
    evidenceRole: 'development',
    scope: 'portal-free goal-unreachability; scheduled connectivity replacement opportunity only',
    population: {
        corpus: CORPUS_FILE, levelSpec: LEVEL_SPEC, sampledLevels: sample.length, completedRows: levels.length,
        baseWorkBudget: BASE_WORK_BUDGET, strictTotalWorkBudget: true,
        timeBudgetMs: TIME_BUDGET_MS, maxCertificates: MAX_CERTIFICATES,
    },
    certificatesProduced: sum('certificatesProduced'),
    certificatesDuplicated: sum('certificatesDuplicated'),
    certificatesDropped: sum('certificatesDropped'),
    certificateOccurrences: sum('certificateOccurrences'),
    uniqueCertificateSignatures: sum('uniqueCertificateSignatures'),
    repeatedCertificateOccurrences: sum('repeatedCertificateOccurrences'),
    signaturesWithHits: sum('signaturesWithHits'),
    scheduledProbeCalls: sum('scheduledProbeCalls'),
    certificatesScanned: sum('certificatesScanned'),
    positionEligibleCertificates: sum('positionEligibleCertificates'),
    boundaryCellChecks: sum('boundaryCellChecks'),
    shadowHits: sum('shadowHits'),
    crossExactStateHits: sum('crossExactStateHits'),
    confirmedGoalUnreachableHits: sum('confirmedGoalUnreachableHits'),
    falsePositiveHits: sum('falsePositiveHits'),
    unscheduledProbeCalls: sum('unscheduledProbeCalls'),
    unscheduledCertificatesScanned: sum('unscheduledCertificatesScanned'),
    unscheduledPositionEligibleCertificates: sum('unscheduledPositionEligibleCertificates'),
    unscheduledBoundaryCellChecks: sum('unscheduledBoundaryCellChecks'),
    unscheduledHits: sum('unscheduledHits'),
    unscheduledCrossExactStateHits: sum('unscheduledCrossExactStateHits'),
    levelsWithUnscheduledHits: levels.filter(row => row.unscheduledHits > 0).length,
    levelsWithHits: levels.filter(row => row.shadowHits > 0).length,
    levelsWithCrossExactStateHits: levels.filter(row => row.crossExactStateHits > 0).length,
    levelsWithFalsePositives: levels.filter(row => row.falsePositiveHits > 0).length,
    potentiallyReplaceableConnectivityCalls: sum('confirmedGoalUnreachableHits'),
    potentiallyReplaceableConnectivityCallRate: sum('scheduledProbeCalls') ? sum('confirmedGoalUnreachableHits') / sum('scheduledProbeCalls') : null,
    totalSolveWork: sum('workSpent'),
};
summary.repeatedCertificateOccurrenceRate = summary.certificateOccurrences
    ? summary.repeatedCertificateOccurrences / summary.certificateOccurrences
    : null;
summary.positionEligibilityRate = summary.certificatesScanned
    ? summary.positionEligibleCertificates / summary.certificatesScanned
    : null;
summary.positionIndexScanReductionUpperBound = summary.certificatesScanned
    ? 1 - summary.positionEligibleCertificates / summary.certificatesScanned
    : null;
summary.unscheduledHitRate = summary.unscheduledProbeCalls
    ? summary.unscheduledHits / summary.unscheduledProbeCalls
    : null;
summary.unscheduledAveragePositionCandidates = summary.unscheduledProbeCalls
    ? summary.unscheduledPositionEligibleCertificates / summary.unscheduledProbeCalls
    : null;
summary.unscheduledByCaller = Object.fromEntries([...callerAggregate].map(([caller, bucket]) => [caller, {
    probes: bucket.probes,
    certificateCandidates: bucket.certificateCandidates,
    boundaryCellChecks: bucket.boundaryCellChecks,
    hits: bucket.hits,
    hitRate: bucket.probes ? bucket.hits / bucket.probes : null,
    crossExactStateHits: bucket.crossExactStateHits,
    parentsWithHits: levels.filter(row => (row.unscheduledByCaller?.[caller]?.hits ?? 0) > 0).length,
    hitSourceAgeWorkP50: percentile(bucket.hitSourceAgeWork, 0.5),
    hitRemainingStepsP50: percentile(bucket.hitRemainingSteps, 0.5),
    schedulePhaseCounts: Object.fromEntries([...bucket.schedulePhases].sort((a, b) => Number(a[0]) - Number(b[0]))),
}]));

mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(OUT_FILE), JSON.stringify({ summary, levels }, null, 2) + '\n');

const rate = summary.potentiallyReplaceableConnectivityCallRate == null
    ? 'n/a'
    : (100 * summary.potentiallyReplaceableConnectivityCallRate).toFixed(2) + '%';
const md = [
    '# Connectivity goal-cut certificate shadow audit',
    '',
    'Population: ' + sample.length + ' levels from ' + CORPUS_FILE + ' (' + LEVEL_SPEC + '); strict base work budget ' + BASE_WORK_BUDGET.toLocaleString() + ' per level; certificate cap ' + MAX_CERTIFICATES + '.',
    '',
    '## Result',
    '',
    '- Certificates retained: ' + summary.certificatesProduced + '; exact duplicates suppressed: ' + summary.certificatesDuplicated + '; dropped at capacity: ' + summary.certificatesDropped + '.',
    '- Derived proof occurrences: ' + summary.certificateOccurrences + '; unique per-level signatures: ' + summary.uniqueCertificateSignatures + '; repeated occurrences: ' + summary.repeatedCertificateOccurrences + '.',
    '- Scheduled connectivity points with retained certificates: ' + summary.scheduledProbeCalls + '.',
    '- Certificate scans: ' + summary.certificatesScanned + '; current-position-eligible certificates: ' + summary.positionEligibleCertificates + '; boundary-cell checks: ' + summary.boundaryCellChecks + '.',
    '- Shadow hits: ' + summary.shadowHits + ' on ' + summary.levelsWithHits + ' level(s).',
    '- Cross-exact-state hits: ' + summary.crossExactStateHits + ' on ' + summary.levelsWithCrossExactStateHits + ' level(s).',
    '- Confirmed goal-unreachable hits: ' + summary.confirmedGoalUnreachableHits + '.',
    '- False positives: ' + summary.falsePositiveHits + ' on ' + summary.levelsWithFalsePositives + ' level(s).',
    '- Potentially replaceable scheduled connectivity calls: ' + summary.potentiallyReplaceableConnectivityCalls + ' (' + rate + ' of probed scheduled calls).',
    '- Unscheduled hard-prune candidates probed: ' + summary.unscheduledProbeCalls + '; cut hits: ' + summary.unscheduledHits + ' across ' + summary.levelsWithUnscheduledHits + ' level(s).',
    '- Unscheduled indexed candidate checks: ' + summary.unscheduledCertificatesScanned + '; boundary-cell checks: ' + summary.unscheduledBoundaryCellChecks + '.',
    '- Unscheduled caller attribution: ' + JSON.stringify(summary.unscheduledByCaller) + '.',
    '',
    'The shadow never prunes. Every hit is checked against the ordinary flood fill on the same call. Canonical replacement economics must combine these counts with the solver work model and a separate observer-overhead comparison before any behavioral consumer is considered.',
    '',
].join('\n');
writeFileSync(path.resolve(SUMMARY_OUT_FILE), md);
console.log('wrote ' + OUT_FILE);
console.log('wrote ' + SUMMARY_OUT_FILE);
console.log(JSON.stringify(summary, null, 2));
