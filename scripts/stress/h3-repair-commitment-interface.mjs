#!/usr/bin/env node
/**
 * H3 -- dependency-defined repair commitment interface, per reports/2026-09-16-class5-cross-
 * resource-hypothesis-harvest-001.md's frozen "smallest falsifying observer": "On already exact-
 * labelled repair-retreat or seeded-reachability cases, compare a dead elite/current continuation
 * with a rescuing feasible continuation and record only future-relevant commitment differences...
 * Ask whether a substantially smaller commitment set than positional rollback distance recurs
 * across unrelated levels and whether reconstructable vs non-reconstructable cases differ in that
 * interface."
 *
 * Reuses Card-E's already-committed 156-row population (reports/stress/card-e-sizing-cross-tab-
 * 001.json / -retreat-file-001.json) rather than generating new data: 17 rows are RECONSTRUCTABLE
 * (searchCompletionFromPartialPath rescued them from the beam-cull-depth state) and 139 are NOT
 * (same operator exhausted a 2M-node ceiling from the same kind of state). This is exactly the
 * "dead vs rescuing" comparison H3 asks for, with the rescuability label already earned and
 * referee/replay-validated by Card-E -- no new labelling, no new solver compute.
 *
 * For each row, replays the retreat-file's elite path up to its recorded beam-cull depth through
 * the native solver's own createState/applyMove primitives and extracts only commitment-interface
 * facts (must-cross/must-pass progress, portal/flipper usage, intersection and length budget) --
 * never a solver outcome or exact label, since Card-E's own bucket assignment is the dependent
 * variable being explained, not an input to this extraction.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const crossTabFile = args.get('--cross-tab') ?? 'reports/stress/card-e-sizing-cross-tab-001.json';
const retreatFile = args.get('--retreat-file') ?? 'reports/stress/card-e-sizing-retreat-file-001.json';
const corpus = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const outFile = args.get('--out') ?? 'reports/stress/h3-repair-commitment-interface-results.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();

const crossTab = JSON.parse(readFileSync(crossTabFile, 'utf8'));
const retreat = JSON.parse(readFileSync(retreatFile, 'utf8'));
const rawDoc = JSON.parse(readFileSync(corpus, 'utf8'));
const rawLevels = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;
const rawById = new Map(rawLevels.map(l => [String(l.id), l]));

const preparedCache = new Map();
function prepared(levelId) {
    if (!preparedCache.has(levelId)) {
        const raw = rawById.get(levelId);
        if (!raw) throw new Error(`${levelId} not found in ${corpus}`);
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level);
        preparedCache.set(levelId, { raw, level, prep });
    }
    return preparedCache.get(levelId);
}

function popcount(n) { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; }

const rows = [];
for (const row of crossTab.rows) {
    const entry = retreat.results[row.id];
    if (!entry) throw new Error(`no retreat-file entry for ${row.id}`);
    const { level, prep } = prepared(row.levelId ?? entry.elite.levelId);
    const cutIndex = row.cullDepth; // inclusive index into elite.path, per Card-E's own retreat-file construction (low: cullDepth)
    const pathKeys = entry.elite.path.slice(0, cutIndex + 1);
    if (pathKeys.length === 0) throw new Error(`${row.id}: empty prefix at cullDepth ${cutIndex}`);

    const state = api.createState(pathKeys[0], level, prep);
    for (let i = 1; i < pathKeys.length; i++) {
        const from = state.path.at(-1);
        const portal = level.portalMap.get(from);
        api.applyMove(pathKeys[i], state, level, prep, !!(portal && portal.dest === pathKeys[i]));
    }

    const mustCrossTotal = level.mustCrossKeys.length;
    const mustCrossPending = level.mustCrossKeys.filter((_, i) => (state.mustCrossMask & (1 << i)) !== 0).length;
    const mustCrossPartial = Array.from(state.crossCounts).filter(c => c === 1).length;
    const mustPassTotal = level.mustPassKeys.length;
    const mustPassPending = level.mustPassKeys.filter((_, i) => (state.mpVisitedMask & (1 << i)) === 0).length;
    const flipperTotal = (prep.flipperKeys ?? []).length;
    const flipperUsed = popcount(state.flipperUsedMask);
    const portalTotal = (rawById.get(row.levelId ?? entry.elite.levelId).portals ?? []).length;
    const stepsTaken = pathKeys.length - 1;
    const nonPortalStepsTaken = stepsTaken - state.portalJumps;
    const lengthRemaining = level.requiredLength - nonPortalStepsTaken;
    const intsRemaining = (level.requiredIntersections ?? 0) - state.ints;

    rows.push({
        id: row.id, levelId: row.levelId ?? entry.elite.levelId, bucket: row.bucket, reconstructable: row.reconstructable,
        cullDepth: cutIndex, primaryClass: row.primaryClass, routingRegime: row.routingRegime,
        commitment: {
            mustCrossTotal, mustCrossPending, mustCrossPartial,
            mustPassTotal, mustPassPending,
            flipperTotal, flipperUsed, flipperPendingFraction: flipperTotal ? 1 - flipperUsed / flipperTotal : null,
            portalTotal, portalJumpsUsed: state.portalJumps,
            ints: state.ints, intsRemaining,
            lengthRemaining, requiredLength: level.requiredLength,
        },
    });
}

function stats(values) {
    const v = values.filter(x => x != null && Number.isFinite(x));
    if (v.length === 0) return null;
    const sorted = [...v].sort((a, b) => a - b);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    return { n: v.length, mean: Number(mean.toFixed(3)), median, min: sorted[0], max: sorted.at(-1) };
}

const reconstructable = rows.filter(r => r.reconstructable);
const nonReconstructable = rows.filter(r => !r.reconstructable);
const featureNames = Object.keys(rows[0].commitment);
const comparison = Object.fromEntries(featureNames.map(f => [f, {
    reconstructable: stats(reconstructable.map(r => r.commitment[f])),
    nonReconstructable: stats(nonReconstructable.map(r => r.commitment[f])),
}]));

const document = {
    schemaVersion: 1, kind: 'h3-repair-commitment-interface', generatedAt: new Date().toISOString(),
    hypothesis: 'reports/2026-09-16-class5-cross-resource-hypothesis-harvest-001.md#H3',
    sourcePopulation: { crossTabFile, retreatFile, note: 'Card-E 156-row population, reused unmodified; reconstructable/non-reconstructable labels already earned and referee/replay-validated by Card-E.' },
    counts: { total: rows.length, reconstructable: reconstructable.length, nonReconstructable: nonReconstructable.length },
    comparison,
    rows,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ counts: document.counts, comparison }, null, 2));
