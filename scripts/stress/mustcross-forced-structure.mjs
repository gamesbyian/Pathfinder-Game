#!/usr/bin/env node
/**
 * Must-cross forced-structure analysis. Read-only, no solving.
 *
 * A must-cross cell is satisfied only by two crossings on OPPOSITE axes, and each crossing is
 * forced to be a STRAIGHT pass (see the derivation in
 * reports/2026-07-31-mustcross-forced-structure.md, which reads it out of search-state.ts's
 * isMoveDynamicallyValid). Three consequences follow, none of which the solver currently derives:
 *
 *   1. IMPLIED FORCED CELLS. All four orthogonal neighbours of every must-cross cell are on the
 *      path, necessarily. The solver reasons about the declared mustPass/mustCross objectives only.
 *   2. FORCED STRAIGHT SEGMENTS. A cell orthogonally adjacent to two must-cross cells has both of
 *      its path edges forced, so no other edge at that cell is available.
 *   3. RESERVED-INTERSECTION ACCOUNTING. Each pending must-cross cell reserves one future
 *      intersection (already the basis of hard-prune-pipeline.ts's PRUNE_MC_CEILING). The FREE
 *      intersection budget is therefore `reqInt - ints - popcount(mustCrossMask)`, and when that is
 *      zero no cell except a pending must-cross cell can ever be revisited — the visited path
 *      becomes a wall. `reqInt <= mustCross count` puts a level in that regime from its first move.
 *
 * This script measures how prevalent each structure is, split by solved/unsolved, and verifies the
 * derivation against every stored solution (generator witnesses + saved hints): every must-cross
 * cell must be visited exactly twice, each visit a straight pass, all four neighbours on the path.
 * A single counterexample would falsify the derivation, so this check is the point of the script,
 * not a formality.
 *
 * Usage:
 *   node scripts/stress/mustcross-forced-structure.mjs \
 *       --corpus=data/stress/stress-levels-random.json \
 *       [--report=reports/stress/typical-budget-corpus2.json] [--hints-dir=data/stress/hints-random]
 *       [--out=<file.json>]
 *
 * `--report` is any benchmark/baseline report carrying per-level `id` + `ok`; without it the
 * solved/unsolved split is omitted and only the derivation check and raw prevalence run.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const CORPUS_FILE = args.get('--corpus');
const REPORT_FILE = args.get('--report');
const HINTS_DIR = args.get('--hints-dir');
const OUT_FILE = args.get('--out');

if (!CORPUS_FILE) {
    console.error('Usage: mustcross-forced-structure.mjs --corpus=<levels.json> [--report=<benchmark.json>] [--hints-dir=<dir>] [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const corpus = readJson(CORPUS_FILE);
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

const okById = new Map();
if (REPORT_FILE) {
    const rep = readJson(REPORT_FILE);
    for (const l of (rep.levels || [])) okById.set(l.id, l.ok);
}

// Wire-format levels are 1-indexed; this whole script stays in wire coordinates.
const K = (x, y) => `${x},${y}`;
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Landmark roles that make a cell impassable (CLAUDE.md's "Landmark Wire Format").
const IMPASSABLE_ROLES = new Set(['surround', 'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative']);

/** Cells the path can never occupy. Deliberately NARROW: gates count as passable because the path
 *  starts on one (and a gate legitimately supplies one side of a crossing — see the 3 published
 *  levels that depend on exactly that), and the goal counts as passable because it terminates the
 *  path rather than being unreachable. Erring toward "passable" keeps every count below a hard
 *  claim rather than above it. */
function blockedCells(level) {
    const blocked = new Set();
    for (const b of (level.blocks || [])) blocked.add(K(b.x, b.y));
    for (const g of (level.geese || [])) blocked.add(K(g.x, g.y));
    for (const lm of (level.landmarks || [])) if (IMPASSABLE_ROLES.has(lm.role)) blocked.add(K(lm.x, lm.y));
    return blocked;
}

function forcedStructure(level) {
    const mcs = level.mustCross || [];
    const { w, h } = level.grid;
    const blocked = blockedCells(level);
    const mcSet = new Set(mcs.map(m => K(m.x, m.y)));
    const gates = new Set((level.gates || []).map(g => K(g.x, g.y)));

    // How many times each cell is required as a neighbour-role by some must-cross cell.
    const roleCount = new Map();
    let neighboursMissing = 0;
    let gateAdjacent = 0;
    for (const m of mcs) {
        for (const [dx, dy] of ORTH) {
            const nx = m.x + dx, ny = m.y + dy;
            if (nx < 1 || ny < 1 || nx > w || ny > h || blocked.has(K(nx, ny))) { neighboursMissing++; continue; }
            const k = K(nx, ny);
            roleCount.set(k, (roleCount.get(k) || 0) + 1);
            if (gates.has(k)) gateAdjacent++;
        }
    }
    const implied = [...roleCount.keys()].filter(k => !mcSet.has(k));
    return {
        mustCross: mcs.length,
        mustPass: (level.mustPass || []).length,
        reqInt: level.reqInt,
        // Free intersection budget at the gate state: reqInt minus one reserved per must-cross cell.
        freeIntBudget: level.reqInt - mcs.length,
        impliedForcedCells: implied.length,
        forcedStraightCells: [...roleCount.entries()].filter(([k, c]) => c >= 2 && !mcSet.has(k)).length,
        overloadedCells: [...roleCount.entries()].filter(([, c]) => c >= 3).length,
        gateAdjacent,
        // Zero on every level in every real corpus — a nonzero value means either the derivation is
        // wrong or the level is infeasible, and either way it wants investigating before anything
        // downstream trusts this analysis.
        neighboursMissing,
    };
}

/** Every stored solution must satisfy the derivation. Paths arrive in two shapes: generator
 *  witnesses as [x,y] pairs in wire (1-indexed) coordinates, saved hints as packed 0-indexed cell
 *  keys — normalised here to wire coordinates so both populations are checked identically. */
function checkPaths(level, paths) {
    const mcs = level.mustCross || [];
    const violations = [];
    for (const { path: pts, source } of paths) {
        const seq = pts.map(p => K(p[0], p[1]));
        for (const m of mcs) {
            const k = K(m.x, m.y);
            const at = [];
            seq.forEach((c, i) => { if (c === k) at.push(i); });
            if (at.length !== 2) { violations.push(`${level.id}/${source}: mustCross (${k}) visited ${at.length}x, expected 2`); continue; }
            for (const i of at) {
                const prev = seq[i - 1], next = seq[i + 1];
                if (prev === undefined || next === undefined) { violations.push(`${level.id}/${source}: mustCross (${k}) visit at path endpoint`); continue; }
                const [px, py] = prev.split(',').map(Number);
                const [nx, ny] = next.split(',').map(Number);
                const straight = (px === nx && Math.abs(py - ny) === 2) || (py === ny && Math.abs(px - nx) === 2);
                if (!straight) violations.push(`${level.id}/${source}: non-straight pass ${prev} -> ${k} -> ${next}`);
            }
            for (const [dx, dy] of ORTH) {
                const nk = K(m.x + dx, m.y + dy);
                if (!seq.includes(nk)) violations.push(`${level.id}/${source}: neighbour ${nk} of mustCross (${k}) never visited`);
            }
        }
    }
    return violations;
}

function storedPaths(level) {
    const out = [];
    const witness = level.stressMeta && level.stressMeta.witnessSolution;
    if (Array.isArray(witness) && witness.length) out.push({ path: witness.map(p => [p[0], p[1]]), source: 'witness' });
    if (HINTS_DIR && level.id) {
        const f = path.resolve(ROOT, HINTS_DIR, `${level.id}.json`);
        if (existsSync(f)) {
            const hints = readJson(path.relative(ROOT, f)).hints || [];
            hints.forEach((hint, i) => {
                const packed = hint.path || hint;
                // Packed keys are 0-indexed internally (PACK(x, y) = (y << 16) | x); +1 back to wire.
                out.push({ path: packed.map(k => [(k & 0xFFFF) + 1, ((k >>> 16) & 0xFFFF) + 1]), source: `hint${i}` });
            });
        }
    }
    return out;
}

const rows = [];
const allViolations = [];
let pathsChecked = 0, mcCellsChecked = 0;
for (const level of levels) {
    if (!(level.mustCross || []).length) continue;
    const s = forcedStructure(level);
    const ok = okById.has(level.id) ? okById.get(level.id) : null;
    rows.push({ id: level.id, ok, portalFree: !(level.portals || []).length, reqLen: level.reqLen, ...s });
    const paths = storedPaths(level);
    pathsChecked += paths.length;
    mcCellsChecked += paths.length * s.mustCross;
    allViolations.push(...checkPaths(level, paths));
}

const median = (arr) => { const v = arr.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function summarise(label, subset) {
    if (!subset.length) return null;
    const s = {
        label, levels: subset.length,
        medianMustCross: median(subset.map(r => r.mustCross)),
        medianDeclaredMustPass: median(subset.map(r => r.mustPass)),
        medianImpliedForcedCells: median(subset.map(r => r.impliedForcedCells)),
        meanImpliedForcedCells: +mean(subset.map(r => r.impliedForcedCells)).toFixed(2),
        levelsWithForcedStraightCell: subset.filter(r => r.forcedStraightCells > 0).length,
        levelsWithOverloadedCell: subset.filter(r => r.overloadedCells > 0).length,
        levelsWithGateAdjacentMustCross: subset.filter(r => r.gateAdjacent > 0).length,
        levelsWithZeroFreeIntBudget: subset.filter(r => r.freeIntBudget <= 0).length,
    };
    console.log(`\n${label} (n=${s.levels})`);
    console.log(`  median mustCross count / declared mustPass : ${s.medianMustCross} / ${s.medianDeclaredMustPass}`);
    console.log(`  median / mean IMPLIED forced cells         : ${s.medianImpliedForcedCells} / ${s.meanImpliedForcedCells}`);
    console.log(`  levels with a forced-straight cell         : ${s.levelsWithForcedStraightCell}`);
    console.log(`  levels with an overloaded (>=3 role) cell  : ${s.levelsWithOverloadedCell}`);
    console.log(`  levels with mustCross adjacent to a gate   : ${s.levelsWithGateAdjacentMustCross}`);
    console.log(`  levels with zero free intersection budget  : ${s.levelsWithZeroFreeIntBudget}`);
    return s;
}

console.log(`Corpus: ${CORPUS_FILE}  (${levels.length} levels, ${rows.length} with must-cross)`);
console.log(`\nDerivation check over stored solutions: ${pathsChecked} paths, ${mcCellsChecked} must-cross cell instances`);
console.log(`  violations: ${allViolations.length}`);
for (const v of allViolations.slice(0, 20)) console.log(`    ${v}`);

const summaries = [summarise('all must-cross levels', rows)];
if (okById.size) {
    summaries.push(summarise('unsolved', rows.filter(r => r.ok === false)));
    summaries.push(summarise('solved', rows.filter(r => r.ok === true)));
}

const missing = rows.reduce((t, r) => t + r.neighboursMissing, 0);
console.log(`\nmust-cross cells with a blocked/off-grid orthogonal neighbour: ${missing}` +
    (missing ? '  <-- INVESTIGATE: derivation says such a level is infeasible' : ''));

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        corpus: CORPUS_FILE, report: REPORT_FILE || null, hintsDir: HINTS_DIR || null,
        derivationCheck: { pathsChecked, mcCellsChecked, violations: allViolations },
        summaries: summaries.filter(Boolean), levels: rows,
    }, null, 2)}\n`);
    console.log(`\nWrote ${OUT_FILE}`);
}
