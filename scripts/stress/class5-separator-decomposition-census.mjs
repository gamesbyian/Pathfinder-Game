#!/usr/bin/env node
/**
 * Separator/decomposition census — measures the frozen preflight's static, mechanic-aware, and
 * portal-mediated separator families on the current Class-5 residual (see
 * docs/solver-separator-decomposition-census-preflight.md). Path-history-conditioned separators
 * (family 3) need a frozen legal prefix population and are deliberately NOT computed here — that
 * family is deferred to run against the fresh exact LIVE/DEAD sibling harvest (the next queue
 * item), which produces exactly the frozen prefixes this family requires.
 *
 * METHOD (generic current-input only; no known solution, no historical identity):
 *   - the free-space graph at the level's INITIAL state (start gate, no moves made) — the same
 *     `prep.reachBlockedArr` notion of reachability the production connectivity prune uses;
 *   - family 1 (static): exhaustive width-1 articulation-cut census over that graph
 *     (`articulation-census.mjs`), PLUS a bounded width-k probe: minimum vertex cut (Menger,
 *     `vertex-mincut.mjs`) from each gate to the goal and to every must-pass/must-cross cell
 *     (obligation-relevant targets — these are exactly the interfaces a decomposition would need
 *     to reason about, not an arbitrary pair);
 *   - family 2 (mechanic-aware): for each measured interface, whether the cut cells themselves, or
 *     either separated side, carry must-cross/must-pass/portal/filter/flippingFilter obligations;
 *   - family 4 (portal-mediated): the same gate->target min-cuts recomputed on a graph augmented
 *     with portal teleport edges; a target unreachable (or with wider cut) in the plain graph that
 *     becomes reachable (or narrower) with portal edges is a portal-mediated interface.
 *
 * Selection: the population is exactly the current Class-5 residual row list from the frozen
 * production-boundary atlas (docs/solver-optimization-workstreams.md's run 35066677597), recorded
 * verbatim before any decomposition feature is computed — see --population-out.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-separator-decomposition-census.mjs -- \
 *     --atlas=tmp/post-1029-residual-atlas-current.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --population-out=reports/stress/class5-separator-census-population-2026-09-17.json \
 *     --out=reports/stress/class5-separator-decomposition-census-2026-09-17.json \
 *     --summary-out=reports/stress/class5-separator-decomposition-census-2026-09-17-summary.md
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { UNPACK, PACK } from '../../modules/domain/cell-key.js';
import { computeArticulationCuts } from './lib/articulation-census.mjs';
import { minVertexCut } from './lib/vertex-mincut.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const ATLAS_FILE = arg('atlas', 'tmp/post-1029-residual-atlas-current.json');
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const POPULATION_OUT = arg('population-out', null);
const OUT_FILE = arg('out', null);
const SUMMARY_OUT_FILE = arg('summary-out', null);
const LEVEL_LIMIT = Number(arg('limit', Infinity));
const OBLIGATION_TARGET_CAP = Number(arg('obligation-target-cap', 8));
// Additive, opt-in: serializes the raw cut-cell keys and side-cell membership (already computed by
// minVertexCut, previously discarded before output) for interfaces whose smaller side is >=10% of
// the board's free-space cells -- the "balanced" subpopulation the Lane-A dynamic-interface-contract
// preflight (docs/solver-separator-dynamic-interface-contract-preflight.md) needs to identify which
// frozen production-frontier states actually cross a candidate interface. Zero new solver compute:
// same minVertexCut calls, just retaining fields the original census intentionally dropped. Off by
// default so the original 2026-09-17 census artifact's exact shape stays reproducible.
const EMIT_CUT_GEOMETRY = arg('emit-cut-geometry', 'false') === 'true';
const BALANCED_FRACTION = Number(arg('balanced-fraction', 0.1));

installBrowserStubs();
const Solver = createSolver();
const { prepLevel } = SOLVER_TESTING_API;

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));

const atlas = readJson(ATLAS_FILE);
const class5Rows = atlas.rows.filter((r) => r.primaryClass === 5);
const class5Ids = new Set(class5Rows.map((r) => r.id));

const corpusDoc = readJson(CORPUS_FILE);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const corpusById = new Map(corpusRows.map((row) => [row.id, row]));

// Freeze the exact population before any decomposition feature is computed, per the preflight's
// selection contract (no selection on promising-looking geometry).
const populationRecord = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'separator/decomposition census frozen population',
    productionRun: '35066677597',
    atlasSource: ATLAS_FILE,
    atlasGeneratedAt: atlas.generatedAt ?? null,
    corpus: CORPUS_FILE,
    primaryClass: 5,
    count: class5Rows.length,
    ids: [...class5Ids].sort(),
};
if (POPULATION_OUT) {
    const abs = path.resolve(ROOT, POPULATION_OUT);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(populationRecord, null, 2));
    console.log(`Wrote frozen population (${populationRecord.count} rows) to ${POPULATION_OUT}`);
}

function neighbors4(k, W, H) {
    const p = UNPACK(k);
    const out = [];
    if (p.x + 1 < W) out.push(PACK(p.x + 1, p.y));
    if (p.x - 1 >= 0) out.push(PACK(p.x - 1, p.y));
    if (p.y + 1 < H) out.push(PACK(p.x, p.y + 1));
    if (p.y - 1 >= 0) out.push(PACK(p.x, p.y - 1));
    return out;
}

function mechanicTagsFor(cellKey, level) {
    const tags = [];
    if (level.mustCrossKeys?.includes(cellKey)) tags.push('mustCross');
    if (level.mustPassKeys?.includes(cellKey)) tags.push('mustPass');
    if (level.portalMap?.has(cellKey)) tags.push('portal');
    if (level.filterMap?.has(cellKey)) tags.push('filter');
    if (level.flippingFilterMap?.has(cellKey)) tags.push('flippingFilter');
    if (level.gateKeys?.includes(cellKey)) tags.push('gate');
    if (cellKey === level.goalKey) tags.push('goal');
    return tags;
}

function measureLevel(id) {
    const t0 = Date.now();
    const raw = corpusById.get(id);
    if (!raw) return { id, error: 'missing-from-corpus' };
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;

    const W = level.grid.w, H = level.grid.h;
    const cellKeys = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = PACK(x, y);
        if (prep.reachBlockedArr[k] !== 1) cellKeys.push(k);
    }
    // Gates are marked "blocked-for-reentry" in reachBlockedArr (see prep.ts) since a gate closes
    // behind you; they are still legal graph nodes as the ENTRY point, so add them back explicitly.
    const gateKeys = level.gateKeys ?? [];
    const cellSet = new Set([...cellKeys, ...gateKeys, level.goalKey]);
    const allCells = [...cellSet];

    const plainEdges = [];
    for (const k of allCells) {
        for (const n of neighbors4(k, W, H)) {
            if (cellSet.has(n) && n > k) plainEdges.push([k, n]);
        }
    }
    const portalEdges = [];
    if (level.portalMap) {
        for (const [entry, exit] of level.portalMap.entries()) {
            if (exit.dest >= 0 && cellSet.has(entry) && cellSet.has(exit.dest)) portalEdges.push([entry, exit.dest]);
        }
    }
    const augmentedEdges = [...plainEdges, ...portalEdges];

    // Family 1: exhaustive width-1 static separators.
    const articulationCuts = computeArticulationCuts({ cellKeys: allCells, edges: plainEdges });
    const nonTrivialArticulation = articulationCuts.filter((c) => Math.min(...c.componentSizes) >= 2);

    // Bounded width-k probes: gate(s) -> goal, and gate(s) -> each must-pass/must-cross cell
    // (obligation-relevant targets), capped to keep per-level cost bounded on obligation-dense rows.
    const obligationTargets = [
        { label: 'goal', key: level.goalKey },
        ...(level.mustPassKeys ?? []).map((k) => ({ label: 'mustPass', key: k })),
        ...(level.mustCrossKeys ?? []).map((k) => ({ label: 'mustCross', key: k })),
    ].filter((t) => cellSet.has(t.key)).slice(0, OBLIGATION_TARGET_CAP);

    const interfaces = [];
    for (const t of obligationTargets) {
        const plain = minVertexCut({ cellKeys: allCells, edges: plainEdges, sources: gateKeys, target: t.key });
        const withPortals = portalEdges.length > 0
            ? minVertexCut({ cellKeys: allCells, edges: augmentedEdges, sources: gateKeys, target: t.key })
            : plain;

        const cutTags = plain.cutCells.map((c) => mechanicTagsFor(c, level));
        const mechanicAware = cutTags.some((tags) => tags.length > 0);
        // Portal-mediated: reachability or cut width materially improves once portal teleport
        // edges are added — unreachable-without-portals (width 0 -> positive), a strictly narrower
        // cut, or the portal making source/target directly adjacent (width -> Infinity, the
        // "uncuttable" best case) are all ways a portal can matter structurally.
        const portalMediated = portalEdges.length > 0 && (
            (plain.width === 0 && withPortals.width > 0)
            || (withPortals.width === Infinity && plain.width !== Infinity)
            || (Number.isFinite(plain.width) && Number.isFinite(withPortals.width) && withPortals.width < plain.width)
        );

        const sideCounts = Number.isFinite(plain.width)
            ? { gateSide: plain.reachableSide.length, remainderSide: plain.otherSide.length }
            : null;
        // "Balanced" mirrors the report's own retained threshold: the smaller side is >=10% of the
        // board's free-space cells (a real bisection, not a last-mile cul-de-sac cut).
        const balanced = sideCounts != null
            && Math.min(sideCounts.gateSide, sideCounts.remainderSide) >= BALANCED_FRACTION * allCells.length;

        interfaces.push({
            target: t.label,
            targetKey: t.key,
            width: plain.width,
            widthWithPortals: portalEdges.length > 0 ? withPortals.width : null,
            cutCellCount: plain.cutCells.length,
            cutMechanicTags: cutTags,
            mechanicAware,
            portalMediated,
            // `gateSide` is the max-flow source partition (contains the gate; may be a small foyer
            // if the cut sits immediately in front of it), `remainderSide` is everything else,
            // including the target itself (excluded from both counts).
            sideCounts,
            balanced,
            ...(EMIT_CUT_GEOMETRY && balanced
                ? { cutCells: plain.cutCells, gateSideCells: plain.reachableSide, remainderSideCells: plain.otherSide }
                : {}),
        });
    }

    const constructionMs = Date.now() - t0;
    return {
        id,
        boardCells: allCells.length,
        gates: gateKeys.length,
        portals: portalEdges.length,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        filters: level.filterMap?.size ?? 0,
        flippingFilters: level.flippingFilterMap?.size ?? 0,
        articulation: {
            totalCutVertices: articulationCuts.length,
            nonTrivialCutVertices: nonTrivialArticulation.length,
            componentSizeSamples: nonTrivialArticulation.slice(0, 5).map((c) => c.componentSizes),
        },
        interfaces,
        constructionMs,
    };
}

const perLevel = [];
const ids = populationRecord.ids.slice(0, LEVEL_LIMIT);
console.log(`class5-separator-decomposition-census: ${ids.length} level(s)`);
for (let i = 0; i < ids.length; i++) {
    const result = measureLevel(ids[i]);
    perLevel.push(result);
    if ((i + 1) % 25 === 0 || i === ids.length - 1) console.log(`  [${i + 1}/${ids.length}] ${ids[i]}`);
}

// Aggregate.
const withArticulation = perLevel.filter((r) => !r.error && r.articulation.nonTrivialCutVertices > 0);
const allInterfaces = perLevel.filter((r) => !r.error).flatMap((r) => r.interfaces.map((f) => ({ id: r.id, ...f })));
const finiteWidths = allInterfaces.filter((f) => Number.isFinite(f.width) && f.width > 0);
const zeroWidth = allInterfaces.filter((f) => f.width === 0); // no static route at all
const infiniteWidth = allInterfaces.filter((f) => f.width === Infinity && f.cutCellCount === 0 && f.sideCounts === null);
const widthHistogram = {};
for (const f of finiteWidths) widthHistogram[f.width] = (widthHistogram[f.width] || 0) + 1;
const mechanicAwareCount = allInterfaces.filter((f) => f.mechanicAware).length;
const portalMediatedCount = allInterfaces.filter((f) => f.portalMediated).length;
const balancedInterfaces = allInterfaces.filter((f) => f.balanced);
const levelsWithBalancedInterface = new Set(balancedInterfaces.map((f) => f.id));

const totalConstructionMs = perLevel.reduce((a, r) => a + (r.constructionMs || 0), 0);

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'separator/decomposition census',
    population: populationRecord,
    levelsMeasured: perLevel.length,
    levelsWithErrors: perLevel.filter((r) => r.error).length,
    family1Static: {
        levelsWithNonTrivialArticulation: withArticulation.length,
        rate: withArticulation.length / perLevel.length,
    },
    boundedWidthProbes: {
        totalInterfacesMeasured: allInterfaces.length,
        zeroWidthNoStaticRoute: zeroWidth.length,
        directlyAdjacentUncuttable: infiniteWidth.length,
        widthHistogram,
    },
    family2MechanicAware: {
        interfacesWithMechanicCutCell: mechanicAwareCount,
        rate: allInterfaces.length ? mechanicAwareCount / allInterfaces.length : null,
    },
    family4PortalMediated: {
        interfacesPortalMediated: portalMediatedCount,
        rate: allInterfaces.length ? portalMediatedCount / allInterfaces.length : null,
    },
    balancedInterfaces: {
        threshold: BALANCED_FRACTION,
        interfaceCount: balancedInterfaces.length,
        levelCount: levelsWithBalancedInterface.size,
        cutGeometryEmitted: EMIT_CUT_GEOMETRY,
    },
    family3PathHistoryConditioned: 'DEFERRED — requires the fresh exact LIVE/DEAD sibling harvest\'s frozen legal prefixes; not computed by this pass.',
    totalConstructionMs,
};

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ summary, levels: perLevel }, null, 1));
    console.log(`Wrote ${OUT_FILE}`);
}
if (SUMMARY_OUT_FILE) {
    const pct = (r) => r === null ? 'n/a' : (100 * r).toFixed(1) + '%';
    const lines = [
        '# Separator/decomposition census — summary', '',
        `Population: current Class-5 residual, ${summary.levelsMeasured} levels (production run ${populationRecord.productionRun}).`,
        `Construction cost: ${totalConstructionMs}ms total (${(totalConstructionMs / perLevel.length).toFixed(2)}ms/level avg).`,
        '',
        '## Family 1 — static (exhaustive width-1 articulation census)',
        `Levels with >=1 non-trivial (both sides >=2 cells) articulation cut: ${withArticulation.length}/${perLevel.length} (${pct(summary.family1Static.rate)}).`,
        '',
        '## Bounded width-k probes (gate -> goal / must-pass / must-cross, capped)',
        `Total interfaces measured: ${allInterfaces.length}.`,
        `Zero-width (no static route at all — mechanic/portal-dependent): ${zeroWidth.length}.`,
        `Directly-adjacent (uncuttable by any finite vertex set): ${infiniteWidth.length}.`,
        `Width histogram (finite, >0): ${JSON.stringify(widthHistogram)}`,
        '',
        '## Family 2 — mechanic-aware',
        `Interfaces whose min-cut set includes a mechanic cell (mustCross/mustPass/portal/filter/flippingFilter/gate/goal): ${mechanicAwareCount}/${allInterfaces.length} (${pct(summary.family2MechanicAware.rate)}).`,
        '',
        '## Family 4 — portal-mediated',
        `Interfaces where portal edges materially change reachability or narrow the cut: ${portalMediatedCount}/${allInterfaces.length} (${pct(summary.family4PortalMediated.rate)}).`,
        '',
        '## Family 3 — path-history-conditioned',
        summary.family3PathHistoryConditioned,
    ];
    const abs2 = path.resolve(ROOT, SUMMARY_OUT_FILE);
    mkdirSync(path.dirname(abs2), { recursive: true });
    writeFileSync(abs2, lines.join('\n') + '\n');
    console.log(`Wrote ${SUMMARY_OUT_FILE}`);
}

console.log(`Done. Family1 non-trivial articulation: ${withArticulation.length}/${perLevel.length}. Zero-width interfaces: ${zeroWidth.length}/${allInterfaces.length}.`);
