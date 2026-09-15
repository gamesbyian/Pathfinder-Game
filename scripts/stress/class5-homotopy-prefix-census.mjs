#!/usr/bin/env node
/**
 * Read-only Class-5 homotopy census over current exact-labelled extinction prefixes.
 *
 * First gate is deliberately rigorous and narrow: compare exact LIVE/DEAD prefixes only when they
 * share level, start gate, and endpoint. Their concatenation A + reverse(B) is then a genuine
 * closed loop. Portal-bearing prefixes abstain because a teleport is not a planar line segment.
 *
 * Robustness versus the historical centroid probe: every actual cell center in each connected
 * static obstacle component is used as a puncture. A component is accepted only if every puncture
 * yields the same integer winding number.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { class5B2ExactLabel } from './class5-b2-exact-prefix-labels.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [k, ...v] = x.split('='); return [k, v.join('=')];
}));
const CASES = args.get('--cases') ?? 'reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json';
const OUT = args.get('--out') ?? 'tmp/class5-homotopy-prefix-census.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const { PACK } = api;

function roleOf(c) {
    if (c.source?.role) return c.source.role;
    const id = String(c.id);
    if (id.includes('culled-supported')) return 'witness-culled';
    if (id.includes('top-rank1')) return 'top-rank1';
    if (id.includes('retained-near-cutoff')) return 'cutoff-survivor';
    return 'other';
}
function exactLabel(c) { return class5B2ExactLabel(c.levelId, roleOf(c)); }
function xyOfPacked(k) { return [k & 0xFFFF, (k >>> 16) & 0xFFFF]; }
function packedPrefix(prefix) {
    return Array.isArray(prefix[0]) ? prefix.map(([x, y]) => PACK(x - 1, y - 1)) : prefix.map(Number);
}
function pointPrefix(prefix) {
    return packedPrefix(prefix).map(k => xyOfPacked(k).map(v => v + 0.5));
}
function hasPortalJump(keys, level) {
    for (let i = 1; i < keys.length; i++) {
        const from = keys[i - 1], next = keys[i];
        if (level.portalMap.get(from)?.dest === next) return true;
    }
    return false;
}
function obstacleComponents(level, prep) {
    const obstacles = new Set([...level.blockSet, ...level.gooseSet, ...prep.deadFlipperKeys]);
    const seen = new Set(), components = [];
    const { w, h } = level.grid;
    for (const start of obstacles) {
        if (seen.has(start)) continue;
        const stack = [start], cells = []; seen.add(start);
        while (stack.length) {
            const k = stack.pop(); cells.push(k);
            const [x, y] = xyOfPacked(k);
            for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = PACK(nx, ny);
                if (obstacles.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
            }
        }
        cells.sort((a, b) => a - b);
        components.push(cells);
    }
    return components;
}
function isLeft(a, b, p) {
    return (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]);
}
// Standard winding-number algorithm; valid for self-intersecting closed polygons.
function windingNumber(loop, p) {
    let wn = 0;
    for (let i = 0; i < loop.length - 1; i++) {
        const a = loop[i], b = loop[i + 1];
        if (a[1] <= p[1]) {
            if (b[1] > p[1] && isLeft(a, b, p) > 0) wn++;
        } else if (b[1] <= p[1] && isLeft(a, b, p) < 0) wn--;
    }
    return wn;
}
function robustWindingVector(aPoints, bPoints, components) {
    const loop = [...aPoints, ...[...bPoints].reverse()];
    const first = loop[0], last = loop.at(-1);
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('comparison loop is not closed');
    const vector = [], unstable = [];
    components.forEach((cells, index) => {
        const values = [...new Set(cells.map(k => windingNumber(loop, xyOfPacked(k).map(v => v + 0.5))))];
        if (values.length !== 1) unstable.push({ component: index, values, cells: cells.length });
        vector.push(values.length === 1 ? values[0] : null);
    });
    return { vector, unstable, nonzero: vector.some(v => v !== null && v !== 0) };
}

const caseDoc = JSON.parse(readFileSync(path.resolve(CASES), 'utf8'));
const levels = readLevelsWithHints(caseDoc.corpus);
const byId = new Map(levels.map(row => [String(row.id), row]));
const prepared = new Map();
function preparedLevel(levelId) {
    if (!prepared.has(levelId)) {
        const raw = byId.get(String(levelId));
        if (!raw) throw new Error(`${levelId} missing from ${caseDoc.corpus}`);
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level); prep._cfg = null;
        prepared.set(levelId, { level, prep, components: obstacleComponents(level, prep) });
    }
    return prepared.get(levelId);
}

const cases = caseDoc.cases.filter(c => exactLabel(c)).map(c => {
    const keys = packedPrefix(c.prefix), { level, components } = preparedLevel(c.levelId);
    return {
        id: c.id, levelId: c.levelId, role: roleOf(c), exact: exactLabel(c),
        start: keys[0], endpoint: keys.at(-1), pathLength: keys.length,
        portalJump: hasPortalJump(keys, level), obstacleComponents: components.length,
        keys, points: pointPrefix(c.prefix),
    };
});
const groupMap = new Map();
for (const c of cases) {
    const key = `${c.levelId}|${c.start}|${c.endpoint}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(c);
}
const groups = [], contrasts = [];
for (const [key, rows] of groupMap) {
    const live = rows.filter(r => r.exact === 'live'), dead = rows.filter(r => r.exact === 'dead');
    groups.push({ key, levelId: rows[0].levelId, rows: rows.map(r => ({ id: r.id, role: r.role, exact: r.exact, pathLength: r.pathLength, portalJump: r.portalJump })), hasContrast: live.length > 0 && dead.length > 0 });
    for (const l of live) for (const d of dead) {
        const { components } = preparedLevel(l.levelId);
        const portalExcluded = l.portalJump || d.portalJump;
        const winding = portalExcluded ? null : robustWindingVector(l.points, d.points, components);
        contrasts.push({
            levelId: l.levelId, liveCase: l.id, deadCase: d.id,
            start: l.start, endpoint: l.endpoint,
            portalExcluded,
            obstacleComponents: components.length,
            winding,
        });
    }
}
const eligible = contrasts.filter(c => !c.portalExcluded && c.winding && c.winding.unstable.length === 0);
const different = eligible.filter(c => c.winding.nonzero);
const summary = {
    sourceCases: CASES,
    exactLabelledCases: cases.length,
    levels: new Set(cases.map(c => c.levelId)).size,
    fixedEndpointGroups: groups.length,
    contrastGroups: groups.filter(g => g.hasContrast).length,
    liveDeadContrasts: contrasts.length,
    portalExcludedContrasts: contrasts.filter(c => c.portalExcluded).length,
    unstableContrasts: contrasts.filter(c => c.winding?.unstable?.length).length,
    eligibleContrasts: eligible.length,
    eligibleLevels: [...new Set(eligible.map(c => c.levelId))],
    differentWindingContrasts: different.length,
    differentWindingLevels: [...new Set(different.map(c => c.levelId))],
    advancement: [...new Set(eligible.map(c => c.levelId))].length >= 2 && [...new Set(different.map(c => c.levelId))].length >= 2,
};
const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA ?? null,
    obstacleBasis: 'blockSet + gooseSet + statically-dead flippers; gates excluded',
    punctureRule: 'every actual obstacle-cell center; component must have unanimous winding',
    fixedEndpointRule: 'same level + same start gate + same endpoint',
    portalRule: 'abstain if either prefix contains a portal jump',
    summary,
    cases: cases.map(({ keys: _k, points: _p, ...rest }) => ({ ...rest, startXY: xyOfPacked(rest.start), endpointXY: xyOfPacked(rest.endpoint) })),
    groups,
    contrasts,
};
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
