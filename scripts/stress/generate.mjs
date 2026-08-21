#!/usr/bin/env node
/**
 * Stress-corpus generator — builds data/stress/stress-levels.json.
 *
 * Run via the esbuild wrapper (imports TS domain modules):
 *   node scripts/run-bundled.mjs scripts/stress/generate.mjs [--count-per-batch=25]
 *       [--master-seed=20260708] [--out=data/stress/stress-levels.json] [--verbose]
 *
 * Every level is provably solvable by construction: a witness path is generated
 * first, the level is derived from it, and each decoration step is kept only if the
 * witness still passes the exact domain referee (validateCandidatePath, PLAY rules).
 * The production solver's SEARCH never participates; the only solver imports are the
 * pure feature classifiers (archetype/density) used for prediction metadata.
 *
 * The corpus is stored outside data/, is never referenced by the app, and therefore
 * can never appear in the normal level selector.
 */
/* global structuredClone */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { stringifyCorpusJson } from '../level-json-format.mjs';

import { PACK, UNPACK, keyParity } from '../../modules/domain/cell-key.js';
import { validateRawLevel } from '../../modules/domain/level-schema.js';
import { validateLevelDetailed } from '../../modules/domain/level-validation.js';
import { normalizeRawLevel } from '../../modules/solver/normalization.js';
import { makeLevelProvenance, makeProvenanceEntry } from '../../modules/domain/level-provenance-types.js';

import {
    mulberry32, hashSeed, randInt, pick,
    generateWitness, witnessToPairs, buildRawLevel, validateWitnessOnRaw, witnessCellData,
} from './witness.mjs';
import {
    levelFeatures, noveltyAgainstPool, structuralComplexity,
    fitRidge, predictRidge, modelVector, packedToPair,
} from './features.mjs';

const GENERATOR_VERSION = '1.0.0';
const ROOT = process.cwd();

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const COUNT_PER_BATCH = Number(args.get('--count-per-batch') || 25);
const MASTER_SEED = Number(args.get('--master-seed') ?? 20260708);
const OUT_FILE = args.get('--out') || 'data/stress/stress-levels.json';
const VERBOSE = args.has('--verbose');

const MIN_NOVELTY = 0.15;
const FALLBACK_NOVELTY = 0.10;
const MAX_ATTEMPTS = 120;

// ─── Published corpus pool + audit-history challenge model ──────────────────

function loadPublishedPool() {
    const levels = JSON.parse(readFileSync(path.join(ROOT, 'data', 'levels.json'), 'utf8'));
    return levels.map((raw, i) => {
        let witness = null;
        const hintFile = path.join(ROOT, 'data', 'hints', `${String(i + 1).padStart(5, '0')}.json`);
        if (existsSync(hintFile)) {
            try {
                const hints = JSON.parse(readFileSync(hintFile, 'utf8'));
                if (Array.isArray(hints) && hints.length > 0) witness = hints[0].map(packedToPair);
            } catch { /* hint corpus is optional for the pool */ }
        }
        return { id: `L${i + 1}`, raw, features: levelFeatures(raw, witness) };
    });
}

function buildChallengeModel(pool) {
    const auditPath = path.join(ROOT, 'logs', 'solver-workflow', 'latest.json');
    const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
    const timeByLevel = new Map();
    for (const row of audit.levels || []) {
        const t = Number(row.totalSolveTimeMs ?? row.timeMs);
        if (Number.isFinite(t)) timeByLevel.set(Number(row.level), t);
    }
    const rows = [], targets = [];
    for (let i = 0; i < pool.length; i++) {
        const t = timeByLevel.get(i + 1);
        if (!Number.isFinite(t)) continue;
        rows.push(modelVector(pool[i].features));
        targets.push(Math.log1p(t));
    }
    const model = fitRidge(rows, targets, 1.0);
    const predictions = rows.map(r => predictRidge(model, r)).sort((a, b) => a - b);
    const maxima = {};
    for (let j = 0; j < rows[0].length; j++)
        maxima[model.featureNames[j]] = Math.max(...rows.map(r => r[j]));
    return { model, predictions, maxima, samples: rows.length };
}

function challengeOf(features, modelBundle) {
    const { model, predictions, maxima } = modelBundle;
    const p = predictRidge(model, modelVector(features));
    let below = 0;
    for (const v of predictions) if (v < p) below++;
    const pct = predictions.length ? below / predictions.length : 0.5;
    let score = 0.10 + 0.60 * pct;
    let extrapolating = false;
    const wd = features.witness;
    if (features.gates >= 3) score += 0.10;
    if (features.portalPairs >= 2) score += 0.06;
    if (features.flippers >= 2 && features.mustCross >= 2) score += 0.10;
    if (features.navDensity >= 0.78 && features.navDensity <= 0.86) score += 0.08;
    if (features.reqInt >= 7) score += 0.08;
    if (features.reqLen >= 70) score += 0.05;
    if (features.archetype === 'high-intersection-burden' && wd && wd.perimeterFrac < 0.2) score += 0.08;
    if (features.archetype === 'near-closure' && wd && wd.closureRatio < 0.12) score += 0.04;
    for (const [name, maxV] of Object.entries(maxima)) {
        if (features[name] !== undefined && features[name] > maxV * 1.25) extrapolating = true;
    }
    return { score: Math.max(0, Math.min(1, Number(score.toFixed(3)))), extrapolating };
}

// ─── Decoration ops (each mutation is referee-checked and reverted on failure) ─

function makeCtx(witness, rng) {
    return {
        witness, rng,
        extras: {
            blocks: [], decoyGates: [], decoyPortals: [], mustPass: [], mustCross: [],
            flippingFilters: [], landmarks: [], geese: [], falseGoals: [], description: '',
        },
        cell: witnessCellData(witness),
    };
}

function tryMutate(ctx, fn) {
    const saved = structuredClone(ctx.extras);
    fn(ctx.extras);
    const ok = validateWitnessOnRaw(buildRawLevel(ctx.witness, ctx.extras), ctx.witness.path).ok;
    if (!ok) ctx.extras = saved;
    return ok;
}

function usedCells(ctx) {
    const used = new Set([ctx.witness.startKey, ctx.witness.goalKey]);
    for (const p of ctx.witness.portalPairs) used.add(p.a).add(p.b);
    const e = ctx.extras;
    for (const k of e.blocks) used.add(k);
    for (const k of e.decoyGates) used.add(k);
    for (const p of e.decoyPortals) used.add(p.a).add(p.b);
    for (const k of e.mustPass) used.add(k);
    for (const k of e.mustCross) used.add(k);
    for (const f of e.flippingFilters) used.add(f.key);
    for (const lm of e.landmarks) used.add(lm.key);
    for (const k of e.geese) used.add(k);
    for (const k of e.falseGoals) used.add(k);
    return used;
}

function shuffled(rng, arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function freeUnvisited(ctx) {
    const used = usedCells(ctx);
    return ctx.cell.unvisited.filter(k => !used.has(k));
}

const witnessAdjacency = (ctx) => {
    const adj = new Set();
    for (const k of ctx.cell.counts.keys()) {
        const p = UNPACK(k);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            adj.add(PACK(p.x + dx, p.y + dy));
    }
    return adj;
};

function opBlocks(ctx, n, style = 'random') {
    let candidates = freeUnvisited(ctx);
    if (style === 'wall-adjacent') {
        const adj = witnessAdjacency(ctx);
        candidates = candidates.filter(k => adj.has(k));
    } else if (style === 'perimeter') {
        const { w, h } = ctx.witness;
        candidates = candidates.filter(k => {
            const p = UNPACK(k);
            return p.x === 0 || p.y === 0 || p.x === w - 1 || p.y === h - 1;
        });
    }
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.blocks.push(k))) placed++;
    }
    return placed;
}

function opDecoyGates(ctx, n) {
    // Parity-feasible decoys: on portal-free levels the solver filters gates by
    // parity(gate) === parity(goal) XOR (reqLen & 1); matching decoys survive the
    // filter and split the per-gate budget.
    const wantParity = keyParity(ctx.witness.goalKey) ^ (ctx.witness.reqLen & 1);
    const candidates = freeUnvisited(ctx).filter(k => keyParity(k) === wantParity);
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.decoyGates.push(k))) placed++;
    }
    return placed;
}

function opDecoyPortals(ctx, nPairs, style = 'far') {
    let placed = 0;
    for (let t = 0; t < nPairs * 8 && placed < nPairs; t++) {
        const free = shuffled(ctx.rng, freeUnvisited(ctx));
        if (free.length < 2) break;
        const a = free[0];
        const pa = UNPACK(a);
        const partner = free.slice(1).find(k => {
            const p = UNPACK(k);
            const man = Math.abs(p.x - pa.x) + Math.abs(p.y - pa.y);
            return style === 'far' ? man >= Math.floor((ctx.witness.w + ctx.witness.h) / 3) : man >= 2;
        });
        if (partner === undefined) continue;
        if (tryMutate(ctx, e => e.decoyPortals.push({ a, b: partner }))) placed++;
    }
    return placed;
}

/** first-visit index of each witness cell (for 'late'/'early' placement styles). */
function firstVisitIndex(ctx) {
    const idx = new Map();
    ctx.witness.path.forEach((k, i) => { if (!idx.has(k)) idx.set(k, i); });
    return idx;
}

function opMustPass(ctx, n, style = 'random') {
    const used = usedCells(ctx);
    let candidates = ctx.cell.visitedOnce.concat(ctx.cell.visitedTwice).filter(k => !used.has(k));
    if (style === 'late') {
        const fv = firstVisitIndex(ctx);
        candidates.sort((a, b) => fv.get(b) - fv.get(a));
        candidates = candidates.slice(0, Math.max(n * 3, 6));
    } else if (style === 'cold') {
        const s = UNPACK(ctx.witness.startKey), g = UNPACK(ctx.witness.goalKey);
        const dist = (k) => {
            const p = UNPACK(k);
            return Math.abs(p.x - s.x) + Math.abs(p.y - s.y) + Math.abs(p.x - g.x) + Math.abs(p.y - g.y);
        };
        candidates.sort((a, b) => dist(b) - dist(a));
        candidates = candidates.slice(0, Math.max(n * 3, 6));
    } else if (style === 'interior') {
        const { w, h } = ctx.witness;
        candidates = candidates.filter(k => {
            const p = UNPACK(k);
            return Math.min(p.x, p.y, w - 1 - p.x, h - 1 - p.y) >= 2;
        });
    }
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.mustPass.push(k))) placed++;
    }
    return placed;
}

function opMustCross(ctx, n) {
    const used = usedCells(ctx);
    const candidates = ctx.cell.visitedTwice.filter(k => !used.has(k));
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.mustCross.push(k))) placed++;
    }
    return placed;
}

function opFlippers(ctx, n, { onPath = true } = {}) {
    const used = usedCells(ctx);
    const candidates = onPath
        ? ctx.cell.straightThrough.filter(k => !used.has(k))
        : freeUnvisited(ctx);
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        // Axis choice is settled by the referee: try both, keep the first that
        // leaves the witness valid (off-path flippers accept either).
        const firstAxis = ctx.rng() < 0.5 ? 1 : 2;
        if (tryMutate(ctx, e => e.flippingFilters.push({ key: k, axis: firstAxis })) ||
            tryMutate(ctx, e => e.flippingFilters.push({ key: k, axis: firstAxis === 1 ? 2 : 1 })))
            placed++;
    }
    return placed;
}

const LM_TYPES = ['park', 'library', 'fountain', 'statue'];

function opSurround(ctx, n) {
    const { w, h } = ctx.witness;
    const blockSet = new Set(ctx.extras.blocks
        .concat(ctx.extras.landmarks.filter(lm => /^(surround|adjacentTurn|decorative)/.test(lm.role)).map(lm => lm.key)));
    const candidates = freeUnvisited(ctx).filter(k => {
        const p = UNPACK(k);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = p.x + dx, ny = p.y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = PACK(nx, ny);
            if (!ctx.cell.counts.has(nk) && !blockSet.has(nk)) return false;
        }
        return true;
    });
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LM_TYPES), role: 'surround' })))
            placed++;
    }
    return placed;
}

function opMustTurn(ctx, n) {
    const used = usedCells(ctx);
    const candidates = [...ctx.cell.turnsAtCell.entries()].filter(([k]) => !used.has(k));
    let placed = 0;
    for (const [k, dir] of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        const turn = dir === 'both' ? pick(ctx.rng, ['cw', 'ccw', 'either']) : (ctx.rng() < 0.5 ? dir : 'either');
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LM_TYPES), role: 'mustTurn', turn })))
            placed++;
    }
    return placed;
}

function opAdjTurn(ctx, n) {
    const candidates = freeUnvisited(ctx).filter(k => {
        const p = UNPACK(k);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (ctx.cell.turnsAtCell.has(PACK(p.x + dx, p.y + dy))) return true;
        }
        return false;
    });
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LM_TYPES), role: 'adjacentTurn', turn: 'either' })))
            placed++;
    }
    return placed;
}

function opGeese(ctx, n) {
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.geese.push(k))) placed++;
    }
    return placed;
}

/** Add geese until navigable density reaches `target` (archetype-threshold gaming). */
function opGeeseToDensity(ctx, target) {
    let added = 0;
    for (let guard = 0; guard < 200; guard++) {
        const raw = buildRawLevel(ctx.witness, ctx.extras);
        const f = levelFeatures(raw, null);
        if (f.navDensity >= target) return { added, reached: true };
        if (opGeese(ctx, 1) === 0) return { added, reached: false };
        added++;
    }
    return { added, reached: false };
}

// ─── Witness spec helpers ────────────────────────────────────────────────────

function startKeyFor(rng, w, h, where) {
    switch (where) {
        case 'corner': return pick(rng, [PACK(0, 0), PACK(w - 1, 0), PACK(0, h - 1), PACK(w - 1, h - 1)]);
        case 'edge': {
            const side = randInt(rng, 0, 3);
            if (side === 0) return PACK(randInt(rng, 0, w - 1), 0);
            if (side === 1) return PACK(randInt(rng, 0, w - 1), h - 1);
            if (side === 2) return PACK(0, randInt(rng, 0, h - 1));
            return PACK(w - 1, randInt(rng, 0, h - 1));
        }
        case 'center': return PACK(randInt(rng, Math.floor(w / 3), Math.floor(2 * w / 3)), randInt(rng, Math.floor(h / 3), Math.floor(2 * h / 3)));
        default: return PACK(randInt(rng, 0, w - 1), randInt(rng, 0, h - 1));
    }
}

const farCornerEnd = (sx, sy, w, h) => (x, y) => (Math.abs(x - sx) + Math.abs(y - sy)) / (w + h);
const nearStartEnd = (sx, sy, maxDist) => (x, y) => {
    const d = Math.abs(x - sx) + Math.abs(y - sy);
    return d <= maxDist ? (maxDist - d) : -Infinity;
};
const interiorEnd = (w, h) => (x, y) => Math.min(x, y, w - 1 - x, h - 1 - y) >= 2 ? 1 : -Infinity;

function baseSpec(rng, o) {
    return {
        w: o.w, h: o.h, startKey: o.startKey,
        targetLen: o.targetLen, targetInt: o.targetInt ?? [0, 99],
        wStraight: o.wStraight ?? 0.4, wPerimeter: o.wPerimeter ?? 0, wInterior: o.wInterior ?? 0,
        wCross: o.wCross ?? 0, wAttract: o.wAttract ?? 0, attractor: o.attractor ?? null,
        returnHome: o.returnHome ?? null, returnPull: o.returnPull ?? 1.2,
        noise: o.noise ?? 1, portalHops: o.portalHops ?? [], hopStyle: o.hopStyle ?? 'any',
        endPref: o.endPref ?? null, restarts: o.restarts ?? 250,
    };
}

// ─── Batch recipes ───────────────────────────────────────────────────────────

const BATCHES = [
    {
        letter: 'A',
        name: 'historical-solver-pain',
        theory: 'Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on logs/solver-workflow/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.',
        confidence: 0.7,
        build(rng, _i, H) {
            const w = randInt(rng, 9, 15); const h = w;
            const area = w * h;
            const density = 0.5 + rng() * 0.3;
            const targetLen = Math.round(area * density);
            const startKey = startKeyFor(rng, w, h, pick(rng, ['corner', 'edge']));
            const s = UNPACK(startKey);
            const witness = generateWitness(baseSpec(rng, {
                w, h, startKey,
                targetLen: [Math.max(12, targetLen - 8), targetLen + 8],
                targetInt: [5, 12],
                wCross: 1.2 + rng() * 1.4, wStraight: 0.3 + rng() * 0.4,
                wPerimeter: rng() < 0.5 ? 0.4 : -0.2,
                endPref: farCornerEnd(s.x, s.y, w, h),
            }), rng);
            if (!witness) return null;
            const ctx = makeCtx(witness, rng);
            opMustCross(ctx, randInt(rng, 2, 4));
            opMustPass(ctx, randInt(rng, 1, 3), pick(rng, ['cold', 'late', 'random']));
            if (rng() < 0.6) opFlippers(ctx, randInt(rng, 1, 3), { onPath: rng() < 0.7 });
            if (rng() < 0.4) opBlocks(ctx, randInt(rng, 1, 4), 'wall-adjacent');
            if (rng() < 0.35) opDecoyGates(ctx, 1);
            return {
                ctx,
                notes: 'Audit-model-guided: high-crossing mid/high-density weave with must-cross + flipper load, the feature regime the ridge model marks as historically slow.',
                accept: (features) => H.challenge(features).score >= 0.55,
            };
        },
    },
    {
        letter: 'B',
        name: 'structural-complexity',
        theory: 'Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.',
        confidence: 0.5,
        build(rng, _i, _H) {
            const w = randInt(rng, 10, 15); const h = w;
            const area = w * h;
            const targetLen = Math.round(area * (0.4 + rng() * 0.25));
            const startKey = startKeyFor(rng, w, h, 'edge');
            const s = UNPACK(startKey);
            const witness = generateWitness(baseSpec(rng, {
                w, h, startKey,
                targetLen: [Math.max(14, targetLen - 10), targetLen + 10],
                targetInt: [2, 8],
                wCross: 0.8 + rng() * 1.2, wStraight: 0.35,
                portalHops: rng() < 0.75 ? [0.3 + rng() * 0.2, 0.6 + rng() * 0.2].slice(0, randInt(rng, 1, 2)) : [],
                hopStyle: pick(rng, ['far', 'any']),
                endPref: farCornerEnd(s.x, s.y, w, h),
            }), rng);
            if (!witness) return null;
            const ctx = makeCtx(witness, rng);
            opMustCross(ctx, randInt(rng, 2, 4));
            opMustPass(ctx, randInt(rng, 2, 4), 'random');
            opFlippers(ctx, randInt(rng, 1, 3), { onPath: true });
            opSurround(ctx, randInt(rng, 0, 2));
            opMustTurn(ctx, randInt(rng, 0, 2));
            opAdjTurn(ctx, randInt(rng, 0, 1));
            if (rng() < 0.5) opDecoyPortals(ctx, 1, 'far');
            opBlocks(ctx, randInt(rng, 2, 6), 'wall-adjacent');
            return {
                ctx,
                notes: 'Mechanic-interaction maximizer: portals, flippers, must-cross, landmarks and blocks packed so their constraint regions overlap along the witness.',
                accept: (features, raw, pairs) => structuralComplexity(raw, pairs) >= 0.5,
            };
        },
    },
    {
        letter: 'C',
        name: 'deceptive-simplicity',
        theory: 'Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.',
        confidence: 0.45,
        build(rng, _i, _H) {
            const w = randInt(rng, 10, 15); const h = w;
            const area = w * h;
            const density = 0.42 + rng() * 0.28;
            const targetLen = Math.round(area * density);
            const startWhere = pick(rng, ['center', 'edge', 'corner']);
            const startKey = startKeyFor(rng, w, h, startWhere);
            const s = UNPACK(startKey);
            const endStyle = pick(rng, ['interior', 'far', 'near']);
            const witness = generateWitness(baseSpec(rng, {
                w, h, startKey,
                targetLen: [Math.max(16, targetLen - 6), targetLen + 6],
                targetInt: [0, 2],
                wStraight: 0.2 + rng() * 0.6,
                wInterior: rng() < 0.6 ? 0.5 : 0,
                wPerimeter: rng() < 0.3 ? 0.4 : -0.1,
                noise: 1.2,
                endPref: endStyle === 'interior' ? interiorEnd(w, h)
                    : endStyle === 'near' ? nearStartEnd(s.x, s.y, Math.floor((w + h) / 3))
                    : farCornerEnd(s.x, s.y, w, h),
            }), rng);
            if (!witness) return null;
            const ctx = makeCtx(witness, rng);
            if (rng() < 0.4) opMustPass(ctx, 1, 'cold');
            if (rng() < 0.25) opBlocks(ctx, randInt(rng, 1, 2), 'random');
            return {
                ctx,
                notes: `Bare geometry trap: open ${w}x${h} grid, ${startWhere} gate, ${endStyle} goal, no mechanic scaffolding — ambiguity comes entirely from route multiplicity at this length/intersection budget.`,
                accept: (features, raw, pairs) => structuralComplexity(raw, pairs) <= 0.3,
            };
        },
    },
    {
        letter: 'D',
        name: 'novel-topology',
        theory: 'Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.',
        confidence: 0.35,
        build(rng, _i, H) {
            const w = randInt(rng, 8, 15); const h = w;
            const area = w * h;
            const styles = [
                { wInterior: 0.9, wPerimeter: -0.6, wStraight: 0.1, noise: 1.4 },   // interior scribble
                { wStraight: 1.4, noise: 0.5, wPerimeter: -0.3 },                    // long-run comb
                { wCross: 1.8, wInterior: 0.5, noise: 0.9 },                         // interior knot
                { wStraight: 0.05, noise: 1.6 },                                     // max-entropy staircase
                { wPerimeter: 0.9, wCross: 1.0, noise: 0.8 },                        // rim weave
            ];
            const style = pick(rng, styles);
            const startKey = startKeyFor(rng, w, h, pick(rng, ['random', 'center', 'edge']));
            const targetLen = Math.round(area * (0.35 + rng() * 0.4));
            // Best-of-M witness by geometry novelty against the published pool.
            let best = null, bestNov = -1;
            for (let m = 0; m < 6; m++) {
                const witness = generateWitness(baseSpec(rng, {
                    w, h, startKey,
                    targetLen: [Math.max(12, targetLen - 10), targetLen + 10],
                    targetInt: [0, 10],
                    ...style,
                    portalHops: rng() < 0.3 ? [0.5] : [],
                }), rng);
                if (!witness) continue;
                const raw = buildRawLevel(witness);
                const nov = H.novelty(levelFeatures(raw, witnessToPairs(witness.path))).noveltyScore;
                if (nov > bestNov) { bestNov = nov; best = witness; }
            }
            if (!best) return null;
            const ctx = makeCtx(best, rng);
            if (rng() < 0.5) opBlocks(ctx, randInt(rng, 1, 4), 'wall-adjacent');
            if (rng() < 0.3) opMustPass(ctx, 1, 'late');
            return {
                ctx,
                notes: 'Topology-first: best-of-6 witness selected purely for geometric distance from the published solution families; decoration kept minimal so shape is the variable.',
                accept: () => true,
            };
        },
    },
    {
        letter: 'E',
        name: 'anti-heuristic',
        theory: 'Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.',
        confidence: 0.55,
        build(rng, i, _H) {
            const recipe = i % 5;
            if (recipe === 0) return buildDelayedClosure(rng);
            if (recipe === 1) return buildInteriorHighInt(rng);
            if (recipe === 2) return buildGateStarvation(rng);
            if (recipe === 3) return buildFlipperLadderBait(rng);
            return buildDensityThresholdGame(rng);
        },
    },
    {
        letter: 'F',
        name: 'wild-witness',
        theory: 'Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (tiny and huge grids, arbitrary mechanic mixes). Every real level is square (no rectangular level has ever shipped), so grid size varies but shape does not. No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.',
        confidence: 0.3,
        build(rng, _i, _H) {
            const sizeRoll = rng();
            let w;
            if (sizeRoll < 0.25) { w = randInt(rng, 3, 5); }
            else if (sizeRoll < 0.5) { w = randInt(rng, 11, 15); }
            else if (sizeRoll < 0.75) { w = randInt(rng, 4, 7); }
            else { w = randInt(rng, 8, 15); }
            const h = w;
            const area = w * h;
            const targetLen = Math.max(6, Math.round(area * (0.2 + rng() * 0.65)));
            const hops = rng() < 0.4 ? Array.from({ length: randInt(rng, 1, 3) }, () => rng()).sort() : [];
            const witness = generateWitness(baseSpec(rng, {
                w, h, startKey: startKeyFor(rng, w, h, 'random'),
                targetLen: [Math.max(4, targetLen - 12), targetLen + 12],
                targetInt: [0, 12],
                wStraight: rng() * 1.5 - 0.3, wPerimeter: rng() * 1.6 - 0.8,
                wInterior: rng() * 1.2 - 0.4, wCross: rng() * 2.2,
                noise: 0.4 + rng() * 1.4,
                portalHops: hops, hopStyle: pick(rng, ['far', 'near', 'any']),
            }), rng);
            if (!witness) return null;
            const ctx = makeCtx(witness, rng);
            if (rng() < 0.5) opBlocks(ctx, randInt(rng, 0, 6), pick(rng, ['random', 'wall-adjacent', 'perimeter']));
            if (rng() < 0.5) opMustPass(ctx, randInt(rng, 0, 3), pick(rng, ['random', 'cold', 'late', 'interior']));
            if (rng() < 0.4) opMustCross(ctx, randInt(rng, 1, 3));
            if (rng() < 0.35) opFlippers(ctx, randInt(rng, 1, 4), { onPath: rng() < 0.5 });
            if (rng() < 0.25) opDecoyPortals(ctx, randInt(rng, 1, 2), pick(rng, ['far', 'near']));
            if (rng() < 0.25) opDecoyGates(ctx, randInt(rng, 1, 2));
            if (rng() < 0.2) opGeese(ctx, randInt(rng, 1, 3));
            if (rng() < 0.2) { opSurround(ctx, 1); opMustTurn(ctx, 1); }
            return {
                ctx,
                notes: `Wild draw: ${w}x${h} grid, unconstrained style weights, arbitrary mechanic mix — intentionally outside authored-level aesthetics.`,
                accept: () => true,
            };
        },
    },
];

// ─── Batch E sub-recipes ─────────────────────────────────────────────────────

function buildDelayedClosure(rng) {
    // Classified near-closure (reqInt<=1, density<0.35) → closure profiles lead; but the
    // only solution wanders away from the goal until the very end.
    const w = randInt(rng, 11, 15); const h = w;
    const area = w * h;
    const startKey = startKeyFor(rng, w, h, 'corner');
    const s = UNPACK(startKey);
    const maxLen = Math.floor((area - 6) * 0.33);
    const attractor = { x: s.x < w / 2 ? w - 1 : 0, y: s.y < h / 2 ? h - 1 : 0 };
    const witness = generateWitness(baseSpec(rng, {
        w, h, startKey,
        targetLen: [Math.max(14, maxLen - 8), maxLen],
        targetInt: [0, 1],
        wStraight: 0.5,
        wAttract: 1.2, attractor,   // phase 1: pull toward the far corner…
        returnHome: 0.55,           // …phase 2: pull back toward the gate to close late
        endPref: nearStartEnd(s.x, s.y, 3),
        restarts: 350,
    }), rng);
    if (!witness) return null;
    const ctx = makeCtx(witness, rng);
    opMustPass(ctx, randInt(rng, 1, 2), 'cold');
    if (rng() < 0.5) opDecoyGates(ctx, 1);
    return {
        ctx,
        notes: 'Anti-heuristic e1 (delayed closure): goal sits beside the gate and density<0.35, so nearClosureRescue/finishFirst lead — but the witness detours across the whole grid before closing.',
        accept: (features) => features.archetype === 'near-closure',
    };
}

function buildInteriorHighInt(rng) {
    // Classified high-intersection-burden → perimeter beams/templates lead; witness and
    // objectives live in the interior, and perimeter cells are partially blocked.
    const w = randInt(rng, 10, 14); const h = w;
    const area = w * h;
    const targetLen = Math.round(area * (0.5 + rng() * 0.2));
    const startKey = startKeyFor(rng, w, h, 'center');
    const witness = generateWitness(baseSpec(rng, {
        w, h, startKey,
        targetLen: [Math.max(20, targetLen - 8), targetLen + 8],
        targetInt: [5, 8],
        wCross: 1.8, wInterior: 0.9, wPerimeter: -0.8,
        endPref: interiorEnd(w, h),
        restarts: 350,
    }), rng);
    if (!witness) return null;
    const ctx = makeCtx(witness, rng);
    opMustPass(ctx, randInt(rng, 2, 3), 'interior');
    opBlocks(ctx, randInt(rng, 3, 6), 'perimeter');
    return {
        ctx,
        notes: 'Anti-heuristic e2 (interior routing): reqInt>=5 at mid density routes the policy to perimeter-first beams, but the witness, its crossings and all objectives are interior and the rim is partially blocked.',
        accept: (features) => features.archetype === 'high-intersection-burden',
    };
}

function buildGateStarvation(rng) {
    // Long path + 4 gates + decoy portals: portals disable the parity gate filter, gates
    // divide the budget, and reqLen stays below the >=90 beam-floor protection.
    const w = 15, h = 15;
    const targetLen = randInt(rng, 62, 84);
    const startKey = startKeyFor(rng, w, h, 'edge');
    const s = UNPACK(startKey);
    const witness = generateWitness(baseSpec(rng, {
        w, h, startKey,
        targetLen: [targetLen - 6, targetLen + 5],
        targetInt: [4, 6],
        wCross: 1.0, wStraight: 0.5, wPerimeter: 0.3,
        endPref: farCornerEnd(s.x, s.y, w, h),
        restarts: 350,
    }), rng);
    if (!witness) return null;
    const ctx = makeCtx(witness, rng);
    opDecoyGates(ctx, 3);
    opDecoyPortals(ctx, randInt(rng, 1, 2), 'far');
    opMustPass(ctx, randInt(rng, 1, 2), 'cold');
    return {
        ctx,
        notes: 'Anti-heuristic e3 (budget starvation): 4 parity-feasible gates x full config ladder with decoy portals disabling the parity filter; reqLen 60-89 deliberately ducks under the long-multi-gate beam-budget floor.',
        accept: (features) => features.gates >= 3,
    };
}

function buildFlipperLadderBait(rng) {
    // must-cross-heavy + >=3 mustPass + >=2 flippers routes to the progressive
    // diverse-beam ladder as the SOLE strategy — on a small level a DFS would solve instantly.
    const w = randInt(rng, 7, 9); const h = w;
    const area = w * h;
    const targetLen = Math.round(area * (0.45 + rng() * 0.2));
    const startKey = startKeyFor(rng, w, h, 'corner');
    const s = UNPACK(startKey);
    const witness = generateWitness(baseSpec(rng, {
        w, h, startKey,
        targetLen: [Math.max(14, targetLen - 6), targetLen + 6],
        targetInt: [2, 5],
        wCross: 1.6, wStraight: 0.4,
        endPref: farCornerEnd(s.x, s.y, w, h),
        restarts: 350,
    }), rng);
    if (!witness) return null;
    const ctx = makeCtx(witness, rng);
    if (opMustCross(ctx, 2) < 2) return null;
    if (opMustPass(ctx, 3, 'random') < 3) return null;
    let flippers = opFlippers(ctx, 2, { onPath: true });
    if (flippers < 2) flippers += opFlippers(ctx, 2 - flippers, { onPath: false });
    if (flippers < 2) return null;
    return {
        ctx,
        notes: 'Anti-heuristic e4 (ladder bait): feature combo (mustCross>=2 + mustPass>=3 + flippers>=2) makes the progressive diverse-beam ladder the sole strategy on a small grid where DFS would finish in milliseconds.',
        accept: (features) => features.archetype === 'must-cross-heavy' && features.flippers >= 2,
    };
}

function buildDensityThresholdGame(rng) {
    // Hazard padding shrinks navigable area so navDensity crosses the 0.82
    // near-Hamiltonian threshold: DFS-perimeter leads, yet the walk is interior-loopy.
    const w = randInt(rng, 9, 12); const h = w;
    const area = w * h;
    const targetLen = Math.round(area * (0.62 + rng() * 0.08));
    const startKey = startKeyFor(rng, w, h, 'edge');
    const witness = generateWitness(baseSpec(rng, {
        w, h, startKey,
        targetLen: [targetLen - 6, targetLen + 6],
        targetInt: [4, 7],
        wCross: 1.5, wInterior: 0.6, wPerimeter: -0.4,
        endPref: interiorEnd(w, h),
        restarts: 350,
    }), rng);
    if (!witness) return null;
    const ctx = makeCtx(witness, rng);
    const { reached } = opGeeseToDensity(ctx, 0.83);
    if (!reached) return null;
    opMustPass(ctx, randInt(rng, 1, 2), 'interior');
    return {
        ctx,
        notes: 'Anti-heuristic e5 (threshold gaming): goose padding pushes navDensity just past the 0.82 near-Hamiltonian cutoff so DFS-perimeter leads, but the true walk is an interior knot the solver must find with its least-suited ordering.',
        accept: (features) => features.navDensity >= 0.82,
    };
}

// ─── Feature tags ────────────────────────────────────────────────────────────

function deriveTags(features, witness, extras) {
    const tags = [features.archetype];
    const wd = features.witness;
    if (features.gates >= 3) tags.push('multi-gate');
    if (extras.decoyPortals.length > 0) tags.push('decoy-portals');
    if (extras.decoyGates.length > 0) tags.push('decoy-gates');
    if (features.flippers >= 2) tags.push('flipper-heavy');
    if (features.portalPairs > 0) tags.push('portals');
    if (features.reqInt >= 5) tags.push('crossing-rich');
    if (features.navDensity < 0.35) tags.push('sparse');
    if (features.navDensity >= 0.82) tags.push('near-hamiltonian');
    else if (features.navDensity >= 0.78) tags.push('threshold-density');
    if (features.reqLen >= 60) tags.push('long-path');
    if (features.area <= 36) tags.push('tiny-grid');
    if (features.area >= 169) tags.push('large-grid');
    if (features.aspect >= 2.2) tags.push('extreme-aspect');
    if (features.surround + features.mustTurn + features.adjTurn > 0) tags.push('landmarks');
    if (features.geese > 0) tags.push('hazard-padding');
    if (wd) {
        if (wd.perimeterFrac < 0.15) tags.push('interior-witness');
        if (wd.perimeterFrac > 0.6) tags.push('perimeter-witness');
        if (wd.jumps > 0 && witness.path.length >= 2) {
            const lastJump = witness.jumps.has(witness.path.length - 1);
            if (lastJump) tags.push('portal-into-goal');
        }
        const s = UNPACK(witness.startKey), g = UNPACK(witness.goalKey);
        const gap = Math.abs(s.x - g.x) + Math.abs(s.y - g.y);
        if (gap <= 3 && features.reqLen >= gap * 4 && features.reqLen >= 12) tags.push('delayed-closure');
    }
    return tags;
}

// ─── Main generation loop ────────────────────────────────────────────────────

function main() {
    console.log(`Stress-corpus generator v${GENERATOR_VERSION} — seed ${MASTER_SEED}, ${COUNT_PER_BATCH}/batch`);
    const pool = loadPublishedPool();
    console.log(`Published pool: ${pool.length} levels (novelty baseline).`);
    const modelBundle = buildChallengeModel(pool);
    const coefByName = Object.fromEntries(
        modelBundle.model.featureNames.map((n, j) => [n, Number(modelBundle.model.coef[j + 1].toFixed(3))]));
    console.log(`Challenge model fitted on ${modelBundle.samples} audit rows; standardized coefficients:`, coefByName);

    const accepted = [];
    const noveltyPool = pool.map(p => ({ id: p.id, features: p.features }));
    const batchStats = {};

    for (const batch of BATCHES) {
        const batchSeed = hashSeed(MASTER_SEED, batch.letter);
        const stats = { attempts: 0, witnessFails: 0, structuralRejects: 0, refereeRejects: 0, noveltyRejects: 0, acceptRejects: 0, fallbacks: 0 };
        batchStats[batch.letter] = stats;
        console.log(`\nBatch ${batch.letter} (${batch.name}) — seed ${batchSeed}`);

        for (let i = 0; i < COUNT_PER_BATCH; i++) {
            let done = false, fallback = null;
            for (let attempt = 0; attempt < MAX_ATTEMPTS && !done; attempt++) {
                stats.attempts++;
                const levelSeed = hashSeed(batchSeed, i, attempt);
                const rng = mulberry32(levelSeed);
                const helpers = {
                    true: true,
                    challenge: (features) => challengeOf(features, modelBundle),
                    novelty: (features) => noveltyAgainstPool(features, noveltyPool),
                };
                let built = null;
                try { built = batch.build(rng, i, helpers); } catch { built = null; }
                if (!built) { stats.witnessFails++; continue; }

                const { ctx, notes, accept } = built;
                const raw = buildRawLevel(ctx.witness, ctx.extras);
                const pairs = witnessToPairs(ctx.witness.path);

                // Validation gate 1: wire schema.
                const schema = validateRawLevel(raw);
                if (!schema.ok) { stats.structuralRejects++; continue; }
                // Validation gate 2: independent structural validator.
                const normalized = normalizeRawLevel(raw, null);
                const structural = validateLevelDetailed(normalized);
                if (!structural.ok) { stats.structuralRejects++; continue; }
                // Validation gate 3: exact witness validation (the referee).
                const referee = validateWitnessOnRaw(raw, ctx.witness.path);
                if (!referee.ok) { stats.refereeRejects++; continue; }

                const features = levelFeatures(raw, pairs);
                if (accept && !accept(features, raw, pairs)) { stats.acceptRejects++; continue; }

                const novelty = noveltyAgainstPool(features, noveltyPool);
                const challenge = challengeOf(features, modelBundle);
                const complexity = structuralComplexity(raw, pairs);
                const candidate = {
                    raw, pairs, features, novelty, challenge, complexity,
                    notes, levelSeed, witness: ctx.witness, extras: ctx.extras,
                };
                if (novelty.noveltyScore < MIN_NOVELTY) {
                    stats.noveltyRejects++;
                    if (!fallback || novelty.noveltyScore > fallback.novelty.noveltyScore) fallback = candidate;
                    continue;
                }
                acceptLevel(batch, i, candidate, accepted, noveltyPool);
                done = true;
            }
            if (!done && fallback && fallback.novelty.noveltyScore >= FALLBACK_NOVELTY) {
                stats.fallbacks++;
                acceptLevel(batch, i, fallback, accepted, noveltyPool);
                done = true;
            }
            if (!done) throw new Error(`Batch ${batch.letter} level ${i}: no valid candidate after ${MAX_ATTEMPTS} attempts`);
        }
        console.log(`  done: ${COUNT_PER_BATCH} accepted; stats: ${JSON.stringify(stats)}`);
    }

    const out = {
        generatedAt: new Date().toISOString(),
        generatorVersion: GENERATOR_VERSION,
        masterSeed: MASTER_SEED,
        description: 'Solver stress-evaluation corpus. NOT for players; never loaded by the app or the level selector. Every level carries a hidden witness solution and was validated with the exact domain referee at generation time. Static filters are intentionally absent (flipping filters only).',
        challengeModel: {
            fittedOn: 'logs/solver-workflow/latest.json',
            samples: modelBundle.samples,
            standardizedCoefficients: coefByName,
        },
        batches: Object.fromEntries(BATCHES.map(b => [b.letter, {
            name: b.name, theory: b.theory, seed: hashSeed(MASTER_SEED, b.letter),
            count: COUNT_PER_BATCH, stats: batchStats[b.letter],
        }])),
        levels: accepted,
    };

    mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
    // One level per line — the enforced format for all 3 local corpora; see
    // stringifyCorpusJson's docstring and scripts/check-corpus-level-formatting.mjs.
    writeFileSync(path.resolve(ROOT, OUT_FILE), stringifyCorpusJson(out));
    console.log(`\n${accepted.length} levels → ${OUT_FILE}`);

    const byBatch = {};
    for (const lvl of accepted) {
        const b = lvl.stressMeta.generationBatch;
        byBatch[b] = byBatch[b] || { n: 0, nov: 0, cx: 0, ch: 0 };
        byBatch[b].n++;
        byBatch[b].nov += lvl.stressMeta.noveltyScore;
        byBatch[b].cx += lvl.stressMeta.structuralComplexity;
        byBatch[b].ch += lvl.stressMeta.predictedSolverChallenge;
    }
    for (const [b, s] of Object.entries(byBatch))
        console.log(`  ${b}: novelty ${(s.nov / s.n).toFixed(3)}  complexity ${(s.cx / s.n).toFixed(3)}  predictedChallenge ${(s.ch / s.n).toFixed(3)}`);
}

function acceptLevel(batch, i, candidate, accepted, noveltyPool) {
    const id = `S${String(accepted.length + 1).padStart(5, '0')}`;
    const { raw, pairs, features, novelty, challenge, complexity, notes, levelSeed, witness, extras } = candidate;
    const confidence = Math.max(0.1, (batch.confidence ?? 0.4) - (challenge.extrapolating ? 0.1 : 0));
    const level = {
        id,
        ...raw,
        provenance: makeLevelProvenance([makeProvenanceEntry('procedural', 'generated', {
            method: 'stress-corpus-generator',
            detail: { generationBatch: batch.letter, batchTheory: batch.theory, generatorVersion: GENERATOR_VERSION, levelSeed },
        })]),
        stressMeta: {
            generated: true,
            stressCorpus: true,
            witnessSolution: pairs,
            featureTags: deriveTags(features, witness, extras),
            generationBatch: batch.letter,
            batchTheory: batch.theory,
            generatorVersion: GENERATOR_VERSION,
            batchSeed: hashSeed(MASTER_SEED, batch.letter),
            levelSeed,
            structuralComplexity: complexity,
            predictedSolverChallenge: challenge.score,
            predictionConfidence: Number(confidence.toFixed(2)),
            noveltyScore: Number(novelty.noveltyScore.toFixed(3)),
            nearestNeighbor: novelty.nearestId,
            archetype: features.archetype,
            navDensity: Number(features.navDensity.toFixed(3)),
            witnessProfile: summarizeWitness(features.witness),
            generatorNotes: notes,
        },
    };
    accepted.push(level);
    noveltyPool.push({ id, features });
    if (VERBOSE) {
        console.log(`  ${id} [${batch.letter}${i}] ${raw.grid.w}x${raw.grid.h} len=${raw.reqLen} int=${raw.reqInt} ` +
            `nov=${novelty.noveltyScore.toFixed(2)} cx=${complexity} ch=${challenge.score}`);
    }
}

function summarizeWitness(wd) {
    if (!wd) return null;
    return {
        coverage: Number(wd.coverage.toFixed(3)),
        perimeterFrac: Number(wd.perimeterFrac.toFixed(3)),
        turnRate: Number(wd.turnRate.toFixed(3)),
        crossTiming: Number(wd.crossTiming.toFixed(3)),
        jumps: wd.jumps,
        closureRatio: Number(wd.closureRatio.toFixed(3)),
    };
}

main();
