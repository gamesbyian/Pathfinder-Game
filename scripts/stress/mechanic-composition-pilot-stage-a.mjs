#!/usr/bin/env node
/**
 * Mechanic-composition transfer pilot, Stage A: deterministic parent/edit selection and
 * materialization + static integrity checks. See
 * reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md for the frozen rules this
 * implements verbatim: process the 20 candidate parents (the frozen 21-gain inference pool minus
 * calibration-only R00726) in ascending level-ID order; for each, enumerate static obligation
 * clusters via the existing findStaticObligationClusters helper, order them deterministically,
 * search relocation cells by increasing Manhattan distance from the portal terminal with row/col
 * tie-break, and take the first cluster/relocation pair whose edit removes exactly the targeted
 * cluster and no other. Take the first 5 eligible parents (3 minimum) in level-ID order.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/mechanic-composition-pilot-stage-a.mjs -- \
 *     --out=reports/stress/mechanic-composition-pilot-001/stage-a.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { findStaticObligationClusters } = await import('./lib/joint-obligation-mc-portal.mjs');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const CORPUS_FILE = path.join(root, 'data/stress/stress-levels-random.json');
const outPath = args.get('--out') ? path.join(root, args.get('--out')) : path.join(root, 'reports/stress/mechanic-composition-pilot-001/stage-a.json');

// Frozen 20-parent candidate pool, R00726 (calibration-only) excluded, ascending level-ID order.
// CORRECTED against the actual A/B preflight's own gain list (reports/2026-09-11-joint-obligation-
// mc-portal-ab-001-preflight.md line 56): the design doc's own transcription of this list
// (reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md line 36) does not match the
// preflight it cites — only 4 of its 20 IDs (R01274, R01489, R03336, plus calibration R00726)
// overlap with the preflight's real 21 gains, and 6 of the design doc's IDs (R01046, R01616,
// R01885, R01893, R01919, R03427, R03465) are not in any corpus at all. This uses the preflight's
// verbatim gain list (all 21 confirmed present in corpus2) minus calibration-only R00726, per the
// design's own stated derivation rule ("the other independently referee-valid ... treatment
// gains"), not the design doc's own corrupted transcription.
const CANDIDATE_PARENTS = [
    'R01274', 'R01489', 'R01849', 'R01882', 'R02036', 'R02060', 'R02162', 'R02389', 'R02479',
    'R02546', 'R02654', 'R02707', 'R02823', 'R02832', 'R02864', 'R02932', 'R03097', 'R03106',
    'R03254', 'R03336',
];

const rawFile = JSON.parse(readFileSync(CORPUS_FILE, 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;
const byId = new Map(rawLevels.map((l, idx) => [String(l.id), { raw: l, idx }]));

function unpack(key) { return { x: (key & 0xFFFF) + 1, y: (key >>> 16) + 1 }; } // 0-indexed key -> 1-indexed raw coords

function clusterKeyTriple(c) { return `${c.mcKey}:${c.neighborKey}:${c.axis}`; }

function occupiedCells(raw, excludePortalEndpoint) {
    const cells = new Set();
    const add = (x, y) => cells.add(`${x},${y}`);
    (raw.gates || []).forEach(g => add(g.x, g.y));
    if (raw.goal) add(raw.goal.x, raw.goal.y);
    (raw.falseGoals || []).forEach(g => add(g.x, g.y));
    (raw.blocks || []).forEach(b => add(b.x, b.y));
    (raw.mustPass || []).forEach(m => add(m.x, m.y));
    (raw.mustCross || []).forEach(m => add(m.x, m.y));
    (raw.filters || []).forEach(f => add(f.x, f.y));
    (raw.flippingFilters || []).forEach(f => add(f.x, f.y));
    (raw.geese || []).forEach(g => add(g.x, g.y));
    (raw.landmarks || []).forEach(l => add(l.x, l.y));
    (raw.portals || []).forEach(p => {
        if (!(excludePortalEndpoint && p.x1 === excludePortalEndpoint.x && p.y1 === excludePortalEndpoint.y)) add(p.x1, p.y1);
        if (!(excludePortalEndpoint && p.x2 === excludePortalEndpoint.x && p.y2 === excludePortalEndpoint.y)) add(p.x2, p.y2);
    });
    return cells;
}

function isAdjacentToAnyMustCross(x, y, raw) {
    return (raw.mustCross || []).some(m => Math.abs(m.x - x) + Math.abs(m.y - y) === 1);
}

function tryEdit(raw, level, prep, cluster, oldClusters) {
    const mc = unpack(cluster.mcKey);
    const terminal = unpack(cluster.neighborKey);
    const portalIdx = (raw.portals || []).findIndex(p =>
        (p.x1 === terminal.x && p.y1 === terminal.y) || (p.x2 === terminal.x && p.y2 === terminal.y));
    if (portalIdx < 0) return null;
    const portal = raw.portals[portalIdx];
    const movingIsX1 = portal.x1 === terminal.x && portal.y1 === terminal.y;
    const w = raw.grid?.w || 0, h = raw.grid?.h || 0;
    const occupied = occupiedCells(raw, terminal);
    const oldSet = new Set(oldClusters.map(clusterKeyTriple));
    const expectedSet = new Set([...oldSet].filter(k => k !== clusterKeyTriple(cluster)));

    // Enumerate all in-grid cells, sorted by Manhattan distance from the terminal, then row, then col.
    const candidates = [];
    for (let y = 1; y <= h; y++) {
        for (let x = 1; x <= w; x++) {
            if (x === terminal.x && y === terminal.y) continue;
            candidates.push({ x, y, dist: Math.abs(x - terminal.x) + Math.abs(y - terminal.y) });
        }
    }
    candidates.sort((a, b) => a.dist - b.dist || a.y - b.y || a.x - b.x);

    for (const cand of candidates) {
        const key = `${cand.x},${cand.y}`;
        if (occupied.has(key)) continue;
        if (isAdjacentToAnyMustCross(cand.x, cand.y, raw)) continue;
        if (cand.x === mc.x && cand.y === mc.y) continue;

        const editedRaw = JSON.parse(JSON.stringify(raw));
        const editedPortal = editedRaw.portals[portalIdx];
        if (movingIsX1) { editedPortal.x1 = cand.x; editedPortal.y1 = cand.y; }
        else { editedPortal.x2 = cand.x; editedPortal.y2 = cand.y; }

        let editedLevel, editedPrep;
        try {
            editedLevel = normalizeRawLevel(editedRaw);
            editedPrep = prepLevel(editedLevel);
        } catch { continue; }

        const newClusters = findStaticObligationClusters(editedLevel, editedPrep);
        const newSet = new Set(newClusters.map(clusterKeyTriple));
        if (newSet.size !== expectedSet.size) continue;
        let matches = true;
        for (const k of expectedSet) if (!newSet.has(k)) { matches = false; break; }
        if (!matches) continue;

        return {
            cluster, relocation: { from: terminal, to: { x: cand.x, y: cand.y } },
            pairedTerminal: movingIsX1 ? { x: portal.x2, y: portal.y2 } : { x: portal.x1, y: portal.y1 },
            editedRaw, oldClusterCount: oldClusters.length, newClusterCount: newClusters.length,
        };
    }
    return null;
}

const results = [];
for (const parentId of CANDIDATE_PARENTS) {
    const found = byId.get(parentId);
    if (!found) { results.push({ parentId, eligible: false, reason: 'not found in corpus' }); continue; }
    const raw = found.raw;
    let level, prep;
    try { level = normalizeRawLevel(raw); prep = prepLevel(level); }
    catch (e) { results.push({ parentId, eligible: false, reason: `normalize/prep failed: ${e.message}` }); continue; }

    const clusters = findStaticObligationClusters(level, prep);
    if (clusters.length === 0) { results.push({ parentId, eligible: false, reason: 'no static obligation clusters' }); continue; }

    // Deterministic cluster order: mc row, mc col, axis, terminal row, terminal col.
    const ordered = clusters.map(c => ({ c, mc: unpack(c.mcKey), t: unpack(c.neighborKey) }))
        .sort((a, b) => a.mc.y - b.mc.y || a.mc.x - b.mc.x || a.c.axis.localeCompare(b.c.axis) || a.t.y - b.t.y || a.t.x - b.t.x)
        .map(o => o.c);

    let edit = null;
    for (const cluster of ordered) {
        edit = tryEdit(raw, level, prep, cluster, clusters);
        if (edit) break;
    }
    if (!edit) { results.push({ parentId, eligible: false, reason: `no valid relocation for any of ${ordered.length} clusters` }); continue; }

    results.push({
        parentId, eligible: true,
        clusterCount: clusters.length,
        targetedCluster: { mc: unpack(edit.cluster.mcKey), terminal: edit.relocation.from, axis: edit.cluster.axis },
        relocation: edit.relocation,
        pairedTerminal: edit.pairedTerminal,
        editedRaw: edit.editedRaw,
    });
}

const eligible = results.filter(r => r.eligible);
const cohort = eligible.slice(0, 5);

console.log(`Processed ${CANDIDATE_PARENTS.length} candidate parents; ${eligible.length} structurally eligible.`);
for (const r of results) {
    if (r.eligible) {
        console.log(`  ${r.parentId}: ELIGIBLE — cluster mc=(${r.targetedCluster.mc.x},${r.targetedCluster.mc.y}) axis=${r.targetedCluster.axis} terminal ${JSON.stringify(r.relocation.from)} -> ${JSON.stringify(r.relocation.to)} (${r.clusterCount} clusters total)`);
    } else {
        console.log(`  ${r.parentId}: not eligible (${r.reason})`);
    }
}
console.log(`\nCohort (first ${cohort.length}, ${cohort.length >= 3 ? 'meets' : 'BELOW'} minimum 3): ${cohort.map(r => r.parentId).join(', ')}`);

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ candidateParents: CANDIDATE_PARENTS, results, cohort: cohort.map(r => r.parentId) }, null, 2));
console.log(`\nWrote ${outPath}`);
