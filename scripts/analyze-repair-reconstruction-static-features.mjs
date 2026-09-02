#!/usr/bin/env node
/**
 * Repair reachability/reconstructability, next question: does operator-incapability (or, among the
 * reconstructable minority, reconstruction cost) correlate with any legal static level feature?
 * Per docs/solver-optimization-workstreams.md Workstream 6 and
 * reports/2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md's own
 * closing disposition, this is the qualitatively different next step after the recurrence-check
 * line closed at n=28 (6 reconstructable, 22 operator-incapable).
 *
 * Purely offline: joins the already-published classification outcomes (transcribed from the three
 * source reports below, hardcoded as CLASSIFICATIONS — this is development/discovery evidence, not a
 * fresh diagnostic run) against corpus2 static level features via scripts/stress/features.mjs (the
 * same extractor analyze-technique-niches.mjs uses). No solver code touched, no new diagnostic runs.
 *
 * Usage: node scripts/analyze-repair-reconstruction-static-features.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { levelFeatures } from './stress/features.mjs';

// levelId -> { outcome: 'reconstructable' | 'operator-incapable', costMultiple?: number, source }
// Transcribed from:
//  - reports/2026-08-24-repair-reachability-reconstructability-audit.md (R00648, R03176 — original mined pair)
//  - reports/2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md (R00630, R02449)
//  - reports/2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md (batches 1-3, the n=28 recurrence-check population)
// R02919 (CP-SAT abstained, boundary never converged) is intentionally excluded, matching the source report.
export const CLASSIFICATIONS = {
    // Original mined pair (pre-recurrence-check) — kept separate from the n=28 rate population but valid feature-correlation data points.
    R00648: { outcome: 'operator-incapable', source: 'original-mined' },
    R03176: { outcome: 'operator-incapable', source: 'original-mined' },
    R00630: { outcome: 'reconstructable', costMultiple: 3247 / 4000, source: 'original-mined' },
    R02449: { outcome: 'reconstructable', costMultiple: 1268180 / 4000, source: 'original-mined' },
    // Recurrence-check batch 1 (n=6)
    R02257: { outcome: 'reconstructable', costMultiple: 1.17, source: 'batch1' },
    R02426: { outcome: 'reconstructable', costMultiple: 1.27, source: 'batch1' },
    R03097: { outcome: 'operator-incapable', source: 'batch1' },
    R02644: { outcome: 'operator-incapable', source: 'batch1' },
    R02975: { outcome: 'operator-incapable', source: 'batch1' },
    R02575: { outcome: 'operator-incapable', source: 'batch1' },
    // Recurrence-check batch 2 (n=10, all operator-incapable)
    R02271: { outcome: 'operator-incapable', source: 'batch2' },
    R02293: { outcome: 'operator-incapable', source: 'batch2' },
    R02459: { outcome: 'operator-incapable', source: 'batch2' },
    R03297: { outcome: 'operator-incapable', source: 'batch2' },
    R03171: { outcome: 'operator-incapable', source: 'batch2' },
    R03162: { outcome: 'operator-incapable', source: 'batch2' },
    R02596: { outcome: 'operator-incapable', source: 'batch2' },
    R02816: { outcome: 'operator-incapable', source: 'batch2' },
    R00260: { outcome: 'operator-incapable', source: 'batch2' },
    R02075: { outcome: 'operator-incapable', source: 'batch2' },
    // Recurrence-check batch 3 (n=12, 4 reconstructable)
    R02958: { outcome: 'operator-incapable', source: 'batch3' },
    R02134: { outcome: 'reconstructable', costMultiple: 0.22, source: 'batch3' },
    R02344: { outcome: 'reconstructable', costMultiple: 19.76, source: 'batch3' },
    R02413: { outcome: 'operator-incapable', source: 'batch3' },
    R02990: { outcome: 'reconstructable', costMultiple: 115.40, source: 'batch3' },
    R03020: { outcome: 'operator-incapable', source: 'batch3' },
    R03104: { outcome: 'reconstructable', costMultiple: 22.70, source: 'batch3' },
    R00500: { outcome: 'operator-incapable', source: 'batch3' },
    R01936: { outcome: 'operator-incapable', source: 'batch3' },
    R03187: { outcome: 'operator-incapable', source: 'batch3' },
    R00479: { outcome: 'operator-incapable', source: 'batch3' },
    R02265: { outcome: 'operator-incapable', source: 'batch3' },
};

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const stddev = (xs, m) => xs.length ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) : null;

const STATIC_FEATURE_KEYS = ['w', 'h', 'area', 'aspect', 'reqLen', 'reqInt', 'requiredPathCoverageRatio',
    'gates', 'blocks', 'mustPass', 'mustCross', 'portalPairs', 'flippers', 'staticFilters', 'geese',
    'falseGoals', 'surround', 'mustTurn', 'adjTurn'];

function effect(groupA, groupB, key) {
    const a = groupA.map((r) => r.features[key]);
    const b = groupB.map((r) => r.features[key]);
    const ma = mean(a), mb = mean(b);
    const sa = stddev(a, ma), sb = stddev(b, mb);
    const pooled = Math.sqrt(((sa ?? 0) ** 2 + (sb ?? 0) ** 2) / 2);
    return { feature: key, groupAMean: ma, groupBMean: mb, standardizedDifference: pooled ? (mb - ma) / pooled : 0 };
}

/** Spearman rank correlation (ties averaged), for the small reconstructable-cost sub-question. */
function spearman(xs, ys) {
    const rank = (vals) => {
        const idx = vals.map((v, i) => i).sort((i, j) => vals[i] - vals[j]);
        const ranks = new Array(vals.length);
        let i = 0;
        while (i < idx.length) {
            let j = i;
            while (j + 1 < idx.length && vals[idx[j + 1]] === vals[idx[i]]) j++;
            const avgRank = (i + j) / 2 + 1;
            for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
            i = j + 1;
        }
        return ranks;
    };
    const rx = rank(xs), ry = rank(ys);
    const n = xs.length;
    const mx = mean(rx), my = mean(ry);
    let cov = 0, vx = 0, vy = 0;
    for (let i = 0; i < n; i++) { cov += (rx[i] - mx) * (ry[i] - my); vx += (rx[i] - mx) ** 2; vy += (ry[i] - my) ** 2; }
    return (vx && vy) ? cov / Math.sqrt(vx * vy) : 0;
}

export function analyze(rawLevelsById) {
    const rows = Object.entries(CLASSIFICATIONS).map(([levelId, cls]) => {
        const raw = rawLevelsById.get(levelId);
        if (!raw) throw new Error(`analyze-repair-reconstruction-static-features: level ${levelId} not found in corpus`);
        const f = levelFeatures(raw);
        const features = Object.fromEntries(STATIC_FEATURE_KEYS.map((k) => [k, f[k]]));
        return { levelId, ...cls, features };
    });

    const reconstructable = rows.filter((r) => r.outcome === 'reconstructable');
    const operatorIncapable = rows.filter((r) => r.outcome === 'operator-incapable');
    const effects = STATIC_FEATURE_KEYS.map((k) => effect(operatorIncapable, reconstructable, k))
        .sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference));

    const costRows = reconstructable.filter((r) => Number.isFinite(r.costMultiple));
    const costCorrelations = STATIC_FEATURE_KEYS.map((k) => ({
        feature: k,
        spearman: spearman(costRows.map((r) => r.features[k]), costRows.map((r) => Math.log(r.costMultiple))),
    })).sort((a, b) => Math.abs(b.spearman) - Math.abs(a.spearman));

    return {
        schemaVersion: 1,
        evidenceRole: 'discovery',
        n: rows.length,
        reconstructableCount: reconstructable.length,
        operatorIncapableCount: operatorIncapable.length,
        rows,
        operatorIncapableVsReconstructableEffects: effects,
        reconstructableCostLogCorrelations: costCorrelations,
        costSampleSize: costRows.length,
    };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const root = new URL('..', import.meta.url).pathname;
    const corpusPath = path.resolve(root, 'data/stress/stress-levels-random.json');
    const raw = JSON.parse(readFileSync(corpusPath, 'utf8'));
    const levels = Array.isArray(raw) ? raw : raw.levels;
    const byId = new Map(levels.map((l) => [l.id, l]));
    const result = analyze(byId);

    const outFile = path.resolve(root, 'reports/stress/repair-reconstruction/repair-reconstruction-static-features.json');
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
    console.log(`n=${result.n} (${result.reconstructableCount} reconstructable, ${result.operatorIncapableCount} operator-incapable). Top effects:`);
    for (const e of result.operatorIncapableVsReconstructableEffects.slice(0, 8)) {
        console.log(`  ${e.feature}: opIncapMean=${e.groupAMean?.toFixed(3)} reconMean=${e.groupBMean?.toFixed(3)} d=${e.standardizedDifference.toFixed(3)}`);
    }
    console.log(`Cost-log Spearman correlations (n=${result.costSampleSize}), top:`);
    for (const c of result.reconstructableCostLogCorrelations.slice(0, 8)) {
        console.log(`  ${c.feature}: rho=${c.spearman.toFixed(3)}`);
    }
    console.log(`Wrote ${outFile}`);
}
