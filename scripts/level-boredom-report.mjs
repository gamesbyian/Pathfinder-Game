#!/usr/bin/env node
/**
 * Ranks levels by a heuristic "boredom score" to surface redesign candidates —
 * levels that are mechanically thin and could be rebuilt around the landmark
 * objects (mustTurn / adjacentTurn / surround) introduced alongside levels
 * 148-150.
 *
 * This is a triage heuristic, not a solvability or quality judgement (same
 * spirit as level-heatmap-report.mjs's dead-square/grid-trim checks). It
 * combines five signals, each min-max normalized across the candidate range
 * before weighting:
 *
 *   1. mechanicCount      (inverse) — distinct constraint types present
 *      (mustPass, mustCross, portal, filter, flippingFilter, goose, falseGoal,
 *      multiGate, reqInt>0, surround, mustTurn, adjacentTurn). Fewer types of
 *      mechanic in play is the strongest signal: a level with none of these is
 *      just "walk from gate to goal at an exact length".
 *   2. forcedMoveRatio    — fraction of hint-path steps where the static
 *      neighbor degree (excluding the cell just came from) is <=1, i.e. the
 *      path is a corridor with no real branching choice at that step.
 *   3. turnDensity        (inverse) — fraction of interior hint-path steps
 *      that change direction. Long straight runs read as tedious walking.
 *   4. deadSquareRatio    — fraction of grid cells no hint ever visits and
 *      that hold no object (reused from generate-level-heatmaps.mjs's
 *      collectObjectCells). Wasted grid space, a related but distinct
 *      "design waste" signal.
 *   5. solveMsPerCell      (inverse) — solver elapsedMs / navigable area from a
 *      fresh full solver run (audits/local-v2/boredom-baseline-156.json by
 *      default). A level the solver solves almost instantly relative to its
 *      size is structurally constrained. (CLAUDE.md documents a per-level
 *      nodesExpanded field for this audit format, but run-solverv2-direct.mjs
 *      doesn't actually serialize it — elapsedMs is what's available, so it's
 *      used here despite being noisier (JIT warmup, timer granularity).)
 *      Weighted lightly — it's the most indirect signal, and is skipped
 *      entirely if the audit file is missing or doesn't cover a level.
 *
 * hintOverlap (average pairwise Jaccard overlap between a level's saved hint
 * paths) is still computed and included in the output per level, but does NOT
 * contribute to the score. It was originally weighted as a "low route variety"
 * signal, but real-world review of the first report flagged L122/L143/L107 —
 * all deliberately-designed, mechanically rich (3-6 mechanic types each), and
 * confirmed satisfying to play — as the *most* boring levels, almost entirely
 * on the strength of 88-96% hint overlap. That's backwards: on a level built
 * from several intertwined constraints, a forced near-unique solution usually
 * means the constraints are doing their job (a tight, elegant puzzle), not
 * that the level lacks content. hintOverlap can't tell "thin and trivial"
 * apart from "rich but tightly constrained," so it's no longer trusted as a
 * boredom signal — it's kept in the output purely as context for human review.
 *
 * Usage:
 *   node scripts/level-boredom-report.mjs
 *   node scripts/level-boredom-report.mjs --json
 *   node scripts/level-boredom-report.mjs --top=50 --range=11-156
 *   node scripts/level-boredom-report.mjs --audit=audits/local-v2/boredom-baseline-156.json
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { collectObjectCells } from './generate-level-heatmaps.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

// SolverV2's modules reference these globals for diagnostics/timing even when
// run headless under Node (same stubs run-solverv2-direct.mjs installs).
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') {
    globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
}
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { SOLVER_TESTING_API } = await import('../modules/SolverV2.js');

const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >>> 16 });

function loadJson(relPath) {
    return JSON.parse(readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function parseRange(spec, max) {
    if (!spec) return { from: 1, to: max };
    const [from, to] = spec.split('-').map(Number);
    return { from: Number.isFinite(from) ? from : 1, to: Number.isFinite(to) ? to : max };
}

// ─── Per-level metric extraction ───────────────────────────────────────────

function mechanicCategories(raw) {
    const cats = [];
    if ((raw.mustPass || []).length) cats.push('mustPass');
    if ((raw.mustCross || []).length) cats.push('mustCross');
    if ((raw.portals || []).length) cats.push('portal');
    if ((raw.filters || []).length) cats.push('filter');
    if ((raw.flippingFilters || []).length) cats.push('flippingFilter');
    if ((raw.geese || []).length) cats.push('goose');
    if ((raw.falseGoals || []).length) cats.push('falseGoal');
    if ((raw.gates || []).length > 1) cats.push('multiGate');
    if (raw.reqInt > 0) cats.push('intersections');
    const roles = new Set((raw.landmarks || []).map(l => l.role));
    if (roles.has('surround')) cats.push('surround');
    if ([...roles].some(r => r.startsWith('mustTurn'))) cats.push('mustTurn');
    if ([...roles].some(r => r.startsWith('adjacentTurn'))) cats.push('adjacentTurn');
    return cats;
}

// Fraction of hint-path steps with <=1 viable forward move (excluding the
// cell just arrived from), and fraction of interior steps that turn.
// Steps spanning a portal jump (non-unit Manhattan distance) are excluded
// from turn-direction comparison since "direction" is meaningless across a
// teleport.
function computeForcedAndTurnMetrics(prep, hints) {
    let forcedSteps = 0, totalSteps = 0, turnSteps = 0, turnEligible = 0;
    for (const hint of hints) {
        for (let i = 0; i < hint.length - 1; i++) {
            const k = hint[i];
            const prevKey = i > 0 ? hint[i - 1] : null;
            const neighbors = prep.staticNeighbors.get(k);
            let forwardDegree = 0;
            if (neighbors) {
                for (let j = 0; j < neighbors.length; j += 2) {
                    if (neighbors[j] !== prevKey) forwardDegree++;
                }
            }
            totalSteps++;
            if (forwardDegree <= 1) forcedSteps++;

            if (i > 0) {
                const p = UNPACK(hint[i - 1]), c = UNPACK(k), n = UNPACK(hint[i + 1]);
                const leg1 = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
                const leg2 = Math.abs(n.x - c.x) + Math.abs(n.y - c.y);
                if (leg1 === 1 && leg2 === 1) {
                    turnEligible++;
                    const dir1x = c.x - p.x, dir1y = c.y - p.y;
                    const dir2x = n.x - c.x, dir2y = n.y - c.y;
                    if (dir1x !== dir2x || dir1y !== dir2y) turnSteps++;
                }
            }
        }
    }
    return {
        forcedMoveRatio: totalSteps ? forcedSteps / totalSteps : null,
        turnDensity: turnEligible ? turnSteps / turnEligible : null,
    };
}

// Average pairwise Jaccard overlap between hint paths' visited-cell sets.
// 1 = every hint visits exactly the same cells; 0 = no overlap at all.
function computeHintOverlap(hints) {
    if (hints.length < 2) return null;
    const sets = hints.map(h => new Set(h));
    let total = 0, pairs = 0;
    for (let i = 0; i < sets.length; i++) {
        for (let j = i + 1; j < sets.length; j++) {
            const a = sets[i], b = sets[j];
            let inter = 0;
            for (const k of a) if (b.has(k)) inter++;
            const union = a.size + b.size - inter;
            total += union ? inter / union : 1;
            pairs++;
        }
    }
    return pairs ? total / pairs : null;
}

function analyzeLevel(raw, levelNumber, heatmapEntry, auditByLevel) {
    const { w, h } = raw.grid;
    const gridArea = w * h;
    const objectCells = collectObjectCells(raw);
    const navArea = gridArea - objectCells.size;

    const deadSquares = [];
    for (let y = 1; y <= h; y++) {
        for (let x = 1; x <= w; x++) {
            if (heatmapEntry.heatmap[y - 1][x - 1] === 0 && !objectCells.has(`${x},${y}`)) deadSquares.push({ x, y });
        }
    }

    const level = SOLVER_TESTING_API.normalizeRawLevel(raw, levelNumber);
    const prep = SOLVER_TESTING_API.prepLevel(level);
    const hints = level.hints || [];
    const { forcedMoveRatio, turnDensity } = computeForcedAndTurnMetrics(prep, hints);
    const hintOverlap = computeHintOverlap(hints);

    const audit = auditByLevel.get(levelNumber);
    const solveMsPerCell = audit ? audit.elapsedMs / Math.max(1, navArea) : null;

    return {
        level: levelNumber,
        grid: { w, h },
        mechanics: mechanicCategories(raw),
        hintCount: hints.length,
        deadSquareRatio: deadSquares.length / gridArea,
        forcedMoveRatio,
        turnDensity,
        hintOverlap,
        solveMsPerCell,
    };
}

// ─── Normalization + scoring ───────────────────────────────────────────────

function minMax(values) {
    const finite = values.filter(v => v !== null && Number.isFinite(v));
    if (finite.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...finite), max: Math.max(...finite) };
}

function normalize(value, { min, max }) {
    if (value === null || !Number.isFinite(value)) return null;
    if (max === min) return 0.5;
    return (value - min) / (max - min);
}

// weight, direction ('high' = high raw value is more boring, 'low' = low raw value is more boring)
const METRICS = [
    { key: 'mechanicScore', weight: 2.0, direction: 'low', reason: (v, r) => r.mechanics.length <= 1 ? `only ${r.mechanics.length} mechanic type(s) in play (${r.mechanics.join(', ') || 'none'})` : null },
    { key: 'forcedMoveRatio', weight: 2.0, direction: 'high', reason: (v, r) => v >= 0.75 ? `${Math.round(r.forcedMoveRatio * 100)}% of hint-path steps have no real branching choice` : null },
    { key: 'turnDensity', weight: 1.5, direction: 'low', reason: (v, r) => v <= 0.2 ? `path is mostly straight runs (${Math.round((r.turnDensity ?? 0) * 100)}% of steps turn)` : null },
    { key: 'deadSquareRatio', weight: 1.0, direction: 'high', reason: (v, r) => v >= 0.3 ? `${Math.round(r.deadSquareRatio * 100)}% of the grid is unused (no hint visits it, no object sits there)` : null },
    { key: 'solveMsPerCell', weight: 0.5, direction: 'low', reason: (v, r) => v !== null && v <= 0.03 ? `solver solves it almost instantly relative to its size (${r.solveMsPerCell.toFixed(3)}ms/navigable cell)` : null },
];

const pct = (v) => v === null || !Number.isFinite(v) ? 'n/a' : `${Math.round(v * 100)}%`;

function scoreLevels(rows) {
    // mechanicScore = mechanics.length, fed through the same normalize() pipeline as everything else.
    for (const r of rows) r.mechanicScore = r.mechanics.length;

    const ranges = {};
    for (const m of METRICS) ranges[m.key] = minMax(rows.map(r => r[m.key]));

    for (const r of rows) {
        let weightedSum = 0, weightUsed = 0;
        const reasons = [];
        for (const m of METRICS) {
            const norm = normalize(r[m.key], ranges[m.key]);
            if (norm === null) continue;
            const boredomContribution = m.direction === 'high' ? norm : (1 - norm);
            weightedSum += m.weight * boredomContribution;
            weightUsed += m.weight;
            const reason = m.reason(r[m.key], r);
            if (reason) reasons.push(reason);
        }
        r.boredomScore = weightUsed ? Math.round((weightedSum / weightUsed) * 1000) / 10 : 0;
        if (reasons.length === 0) {
            reasons.push(`no single dominant factor — moderately weak across several signals (forced-move ${pct(r.forcedMoveRatio)}, turns ${pct(r.turnDensity)}, dead-grid ${pct(r.deadSquareRatio)})`);
        }
        r.reasons = reasons;
    }
    return rows;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const asJson = args.includes('--json');
    const top = Number(argMap.get('--top') || 50);
    const auditPath = argMap.get('--audit') || 'audits/local-v2/boredom-baseline-156.json';

    const rawLevels = loadJson('data/levels.json');
    const heatmaps = loadJson('data/level-heatmaps.json');
    const { from, to } = parseRange(argMap.get('--range') || '11-156', rawLevels.length);

    let auditByLevel = new Map();
    try {
        const audit = loadJson(auditPath);
        auditByLevel = new Map(audit.levels.map(l => [l.level, l]));
    } catch {
        // Solver-effort signal is optional — proceed without it if the audit file is missing.
    }

    const rows = [];
    for (let levelNumber = from; levelNumber <= to; levelNumber++) {
        const raw = rawLevels[levelNumber - 1];
        const heatmapEntry = heatmaps.levels[levelNumber - 1];
        rows.push(analyzeLevel(raw, levelNumber, heatmapEntry, auditByLevel));
    }

    scoreLevels(rows);
    rows.sort((a, b) => b.boredomScore - a.boredomScore);
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
    const top50 = ranked.slice(0, top);

    if (asJson) {
        console.log(JSON.stringify({ range: { from, to }, candidateCount: ranked.length, top, levels: ranked }, null, 2));
        return;
    }

    console.log(`\n=== Boredom report: levels ${from}-${to}, top ${top} of ${ranked.length} candidates ===`);
    console.log('Higher score = more boring. Heuristic triage tool, not a solvability judgement.\n');
    for (const r of top50) {
        console.log(`#${r.rank} L${r.level} [${r.grid.w}x${r.grid.h}, score ${r.boredomScore}] mechanics: ${r.mechanics.join(', ') || 'none'}, hints: ${r.hintCount}`);
        for (const reason of r.reasons) console.log(`    - ${reason}`);
    }
}

main();
