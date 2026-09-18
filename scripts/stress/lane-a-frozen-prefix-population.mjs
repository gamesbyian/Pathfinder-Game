#!/usr/bin/env node
/**
 * Lane A Stage 0/1: freezes a legal production-search prefix population that actually crosses a
 * candidate balanced interface (docs/solver-separator-dynamic-interface-contract-preflight.md),
 * before any exact label or C0-C4 signature is inspected.
 *
 * METHOD. For each level with >=1 balanced interface (from the geometry-extended census, see
 * class5-separator-decomposition-census.mjs --emit-cut-geometry), shells out to the existing
 * production-search-frontier-sampler.mjs (generic, reusable, unmodified) to freeze several distinct
 * legal beam-frontier prefixes at a fixed depth fraction, then checks each prefix against every one
 * of that level's balanced interfaces for a genuine side crossing.
 *
 * CROSSING DEFINITION. A prefix "crosses" an interface if it visits at least one cell recorded in
 * that interface's `gateSideCells` AND at least one cell in `remainderSideCells` (in either order).
 * This is more robust than checking for an explicit visit to a `cutCells` member: beam-frontier
 * prefixes record one waypoint per search *move*, and a move can be a multi-cell run whose
 * intermediate cells (which may include the literal cut cell) are never recorded as a separate
 * waypoint -- confirmed empirically (R00046: 4/5 sampled prefixes cross a non-mechanic, non-portal
 * interface via a side-membership transition despite never visiting either of that interface's two
 * recorded cutCells). A vertex min-cut on the plain graph makes any gate-side -> remainder-side
 * transition necessarily pass through a cut cell in reality; the touchesBothSides check just does
 * not require that cell to be one of the sampler's own recorded waypoints. `firstCutIndex` is kept
 * as a secondary field for cases where a waypoint does happen to land exactly on a cut cell.
 *
 * This produces population-construction evidence only: no exact LIVE/DEAD label, no C0-C4 signature
 * beyond identity, no solver treatment. Selection is on frozen board/search structure, not any
 * inspected label.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/lane-a-frozen-prefix-population.mjs -- \
 *     --geometry=reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --depth-fraction=0.3 --picks=5 --seed=lane-a-stage1-canary-v1 \
 *     --out=reports/stress/lane-a-frozen-prefix-population-2026-09-18.json
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const GEOMETRY_FILE = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const DEPTH_FRACTION = arg('depth-fraction', '0.3');
const PICKS = arg('picks', '5');
const SEED = arg('seed', 'lane-a-stage1-canary-v1');
const OUT_FILE = arg('out', null);
const LEVEL_LIMIT = Number(arg('limit', Infinity));

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));

const geometry = readJson(GEOMETRY_FILE);
const levelsWithBalanced = geometry.levels
    .filter((l) => !l.error && l.interfaces.some((i) => i.balanced))
    .slice(0, LEVEL_LIMIT);

function detectCrossing(prefix, iface) {
    const cutSet = new Set(iface.cutCells);
    const gateSet = new Set(iface.gateSideCells);
    const remSet = new Set(iface.remainderSideCells);
    let firstCutIndex = -1, firstGateIndex = -1, firstRemIndex = -1;
    for (let i = 0; i < prefix.length; i++) {
        const c = prefix[i];
        if (firstCutIndex === -1 && cutSet.has(c)) firstCutIndex = i;
        if (firstGateIndex === -1 && gateSet.has(c)) firstGateIndex = i;
        if (firstRemIndex === -1 && remSet.has(c)) firstRemIndex = i;
    }
    const touchesBothSides = firstGateIndex !== -1 && firstRemIndex !== -1;
    return { crosses: firstCutIndex !== -1 || touchesBothSides, firstCutIndex, firstGateIndex, firstRemIndex };
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'lane-a-frontier-'));
const perLevelStatus = [];
const crossingRows = [];

console.log(`lane-a-frozen-prefix-population: ${levelsWithBalanced.length} balanced-interface level(s), depth-fraction=${DEPTH_FRACTION}, picks=${PICKS}`);
for (let i = 0; i < levelsWithBalanced.length; i++) {
    const lvl = levelsWithBalanced[i];
    const balancedInterfaces = lvl.interfaces.filter((f) => f.balanced);
    const casesOut = path.join(tmpDir, `${lvl.id}.json`);
    let sampled;
    try {
        execFileSync(process.execPath, [
            path.join(ROOT, 'scripts/run-bundled.mjs'),
            path.join(ROOT, 'scripts/stress/production-search-frontier-sampler.mjs'), '--',
            `--corpus=${CORPUS_FILE}`, `--levels=${lvl.id}`,
            `--depth-fraction=${DEPTH_FRACTION}`, `--picks=${PICKS}`, `--seed=${SEED}:${lvl.id}`,
            `--cases-out=${casesOut}`,
        ], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
        sampled = readJson(casesOut);
    } catch (err) {
        perLevelStatus.push({ id: lvl.id, status: 'sampler-error', error: String(err.message).slice(0, 200) });
        continue;
    }
    if (!sampled.cases || sampled.cases.length === 0) {
        perLevelStatus.push({ id: lvl.id, status: 'no-cases-before-checkpoint', balancedInterfaceCount: balancedInterfaces.length });
        continue;
    }
    let crossingsForLevel = 0;
    for (const c of sampled.cases) {
        for (const iface of balancedInterfaces) {
            const result = detectCrossing(c.prefix, iface);
            if (result.crosses) {
                crossingsForLevel++;
                crossingRows.push({
                    levelId: lvl.id,
                    caseId: c.id,
                    interfaceTarget: iface.target,
                    interfaceTargetKey: iface.targetKey,
                    interfaceWidth: iface.width,
                    mechanicAware: iface.mechanicAware,
                    portalMediated: iface.portalMediated,
                    prefixLength: c.prefix.length,
                    firstCutIndex: result.firstCutIndex,
                    firstGateIndex: result.firstGateIndex,
                    firstRemIndex: result.firstRemIndex,
                    prefix: c.prefix,
                });
            }
        }
    }
    perLevelStatus.push({
        id: lvl.id, status: 'sampled', casesSampled: sampled.cases.length,
        balancedInterfaceCount: balancedInterfaces.length, crossings: crossingsForLevel,
    });
    if ((i + 1) % 20 === 0 || i === levelsWithBalanced.length - 1) console.log(`  [${i + 1}/${levelsWithBalanced.length}] ${lvl.id}`);
}
rmSync(tmpDir, { recursive: true, force: true });

const sampledLevels = perLevelStatus.filter((r) => r.status === 'sampled');
const levelsWithCrossing = new Set(crossingRows.map((r) => r.levelId));
const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane A frozen legal-prefix population (Stage 0/1 canary); no exact label, no C0-C4 signature beyond identity',
    geometrySource: GEOMETRY_FILE,
    corpus: CORPUS_FILE,
    sampler: { depthFraction: Number(DEPTH_FRACTION), picks: Number(PICKS), seed: SEED },
    levelsWithBalancedInterface: levelsWithBalanced.length,
    levelsSampled: sampledLevels.length,
    levelsNoCasesBeforeCheckpoint: perLevelStatus.filter((r) => r.status === 'no-cases-before-checkpoint').length,
    levelsSamplerError: perLevelStatus.filter((r) => r.status === 'sampler-error').length,
    levelsWithAtLeastOneCrossing: levelsWithCrossing.size,
    totalCrossingRows: crossingRows.length,
};
console.log(JSON.stringify(summary, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ summary, perLevelStatus, crossingRows }, null, 1));
    console.log(`Wrote ${OUT_FILE}`);
}
