#!/usr/bin/env node
/**
 * WS1 stage 5: bounded operational first divergence between `plain` and `mechanic-buckets`
 * beam retention, for one exclusive-response sibling per frozen pair. Per
 * reports/2026-09-12-ws1-stage4-solution-space-mediation-result-001.md's own scoping: "report the
 * first differing beam-candidate rank/accept-reject decision and its local mechanic context...
 * not a full trace dump."
 *
 * Key simplification (no new search.ts instrumentation needed): `plain` and `mechanic-buckets`
 * share the IDENTICAL pipeline (hard-prune, coarse-state merge, sort) up to the final retention
 * selection line in beamSearchFromGate; they differ only in which subset of the same sorted `pool`
 * becomes `frontier`. The existing `mechanic-bucket-culled` research stage already emits the FULL
 * sorted pool with ranks/scores (`details.rankedPool`) whenever pool.length > beamWidth; the
 * existing `post-mechanic-bucket-selection` stage emits the actually-retained frontier's paths.
 * So a single mechanic-buckets run's own telemetry already contains both "what plain top-K would
 * have kept" (rankedPool.slice(0, beamWidth)) and "what mechanic-buckets actually kept" (frontier)
 * at every depth — no second run, no new production code, needed to find their first difference.
 * This holds only up to and including the first differing depth: after that, a real second plain
 * run would explore a different population, which this script does not claim to characterize.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/ws1-stage5-first-divergence.mjs -- \
 *     --families=/path/to/variant-worktree/data/families/corpus2 --out=tmp/ws1-stage5.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { beamSearchFromGate } = await import('../../modules/solver/search.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const familiesDir = args.get('--families');
if (!familiesDir) throw new Error('--families=<dir> is required');
const outPath = args.get('--out') ?? null;
const nodeBudget = Number(args.get('--node-budget') ?? 500000);
const budgetMs = Number(args.get('--budget-ms') ?? 120000);

// Frozen candidates: one exclusive-response (buckets-only) sibling per pair, per the stage-4
// report's own suggestion (R02094/cs/idx0; an R02687 swap sibling using a purely positional/
// self-intersection definition since R02687's whole family has zero must-cross cells).
const CANDIDATES = [
    { parent: 'R02687', mode: 'swap', variantIdx: 0, config: 'objectiveFirst', profileId: 'objectiveFirst', gateKey: 589830 },
    { parent: 'R02094', mode: 'cs', variantIdx: 0, config: 'intersectionHarvest', profileId: 'intersectionHarvest', gateKey: 262151 },
];

function loadVariant(parent, mode, idx) {
    const fp = path.join(familiesDir, `family-${parent}-${mode}.json`);
    const raw = JSON.parse(readFileSync(fp, 'utf8'));
    return raw[idx];
}

/** Local mechanic context for a candidate path up to (and including) `depth`: the nearest
 *  preceding M(must-cross)/P(portal)/X(self-intersection) event, computed the same way
 *  ws1-stage4-mediation-analysis.mjs's mechanicEvents() does, but against a candidate's own
 *  in-progress path rather than a final solved path. */
function nearestMechanicEvent(pathKeys, level) {
    const seenAny = new Set();
    let lastEvent = null;
    let lastWasPortalJump = false;
    for (let i = 0; i < pathKeys.length; i++) {
        const key = pathKeys[i];
        if (i > 0) {
            const prevKey = pathKeys[i - 1];
            const portal = level.portalMap.get(prevKey);
            const isJump = !!(portal && !lastWasPortalJump && portal.dest === key);
            if (isJump) lastEvent = { type: 'P', idx: i };
            lastWasPortalJump = isJump;
        }
        if (level.mustCrossKeys.includes(key)) lastEvent = { type: 'M', idx: i };
        if (seenAny.has(key)) lastEvent = { type: 'X', idx: i };
        seenAny.add(key);
    }
    return lastEvent;
}

const report = { nodeBudget, budgetMs, candidates: [] };

for (const cand of CANDIDATES) {
    const raw = loadVariant(cand.parent, cand.mode, cand.variantIdx);
    const level = normalizeRawLevel(raw);
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };

    const byDepth = new Map();
    const observer = {
        observe(record) {
            let bucket = byDepth.get(record.depth);
            if (!bucket) { bucket = {}; byDepth.set(record.depth, bucket); }
            if (record.stage === 'mechanic-bucket-culled' && record.details?.rankedPool) {
                bucket.rankedPool = record.details.rankedPool.map(r => ({ path: r.path, rank: r.rank, score: r.score }));
            }
            if (record.stage === 'post-mechanic-bucket-selection') {
                bucket.retained = record.paths;
            }
        },
    };
    prep._beamResearchObserver = observer;

    const keyOf = pathKeys => pathKeys.join(',');
    const started = Date.now();
    const solved = await beamSearchFromGate(cand.gateKey, level, prep, SCORING_PROFILES[cand.profileId],
        budgetMs, started, null, 5000, null, true /* mechanicBucketRetention */, {}, nodeBudget);

    let firstDivergence = null;
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    for (const depth of depths) {
        const bucket = byDepth.get(depth);
        if (!bucket.rankedPool || !bucket.retained) continue; // no culling at this depth: identical by construction
        const plainWouldKeep = new Set(bucket.rankedPool.slice(0, 5000).map(r => keyOf(r.path)));
        const actuallyKept = new Set(bucket.retained.map(keyOf));
        if (plainWouldKeep.size === actuallyKept.size && [...plainWouldKeep].every(k => actuallyKept.has(k))) continue;
        // First real membership divergence.
        const onlyPlain = [...plainWouldKeep].filter(k => !actuallyKept.has(k));
        const onlyBuckets = [...actuallyKept].filter(k => !plainWouldKeep.has(k));
        const exampleBucketsPath = bucket.retained.find(p => onlyBuckets.includes(keyOf(p)));
        const examplePlainPath = bucket.rankedPool.find(r => onlyPlain.includes(keyOf(r.path)))?.path ?? null;
        firstDivergence = {
            depth,
            poolSize: bucket.rankedPool.length,
            candidatesOnlyInPlainTopK: onlyPlain.length,
            candidatesOnlyInBucketSelection: onlyBuckets.length,
            exampleRetainedByBucketsOnly: exampleBucketsPath ? {
                path: exampleBucketsPath, rank: bucket.rankedPool.find(r => keyOf(r.path) === keyOf(exampleBucketsPath))?.rank ?? null,
                nearestMechanicEvent: nearestMechanicEvent(exampleBucketsPath, level),
            } : null,
            exampleCulledByBucketsOnly: examplePlainPath ? {
                path: examplePlainPath, rank: bucket.rankedPool.find(r => keyOf(r.path) === keyOf(examplePlainPath))?.rank ?? null,
                nearestMechanicEvent: nearestMechanicEvent(examplePlainPath, level),
            } : null,
        };
        break;
    }

    report.candidates.push({
        ...cand, levelId: raw.id, solved: !!solved, nodesExpanded: prep._metrics.nodesExpanded,
        depthsObserved: depths.length, depthsWithCulling: depths.filter(d => byDepth.get(d).rankedPool).length,
        firstDivergence,
    });
    console.log(`${cand.parent}/${cand.mode}/${cand.variantIdx}: solved=${!!solved} nodes=${prep._metrics.nodesExpanded} ` +
        `firstDivergenceDepth=${firstDivergence?.depth ?? 'none observed'}`);
}

if (outPath) {
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Wrote ${outPath}`);
}
