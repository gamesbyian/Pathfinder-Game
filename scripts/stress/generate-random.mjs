#!/usr/bin/env node
/**
 * Uniform-random stress corpus generator — builds data/stress/stress-levels-random.json.
 *
 * DIFFERENT PHILOSOPHY from generate.mjs's batches A-F: that corpus was deliberately
 * hypothesis-driven (witness geometry and mechanic placement chosen to target specific
 * solver archetypes/policy thresholds). This one is deliberately NOT — it exists to
 * evaluate the solver without having been shaped by knowledge of its current strengths
 * or weaknesses, so it can't overfit to today's solver the way a hypothesis-driven
 * corpus structurally can. Concretely, that means:
 *   - the witness walk uses ZERO scoring bias (every legal step is equally likely —
 *     see the all-zero weights in `buildLevel()` below); no perimeter/interior/
 *     delayed-closure/anti-heuristic shaping of any kind.
 *   - mechanic placement is a uniform random draw over legal candidate cells — no
 *     "cold cell", "late", "interior", or "on-path-only" targeting. EVERY mechanic the
 *     game has (except static filters — see below) gets the same treatment: a coin-flip
 *     presence check, then (when present) a count drawn from the upper half of its range.
 *     None are deliberately left out or under-weighted relative to the others.
 *   - no imports from modules/solver/attempts.ts, policy.ts, archetype.ts, or any other
 *     solver-STRATEGY module, and no audit-history-fitted model. The only solver-adjacent
 *     import is normalizeRawLevel (pure wire-format normalization, required by the
 *     referee) — the solver's SEARCH never runs during generation, same as before, but
 *     here nothing about the solver's decision-making is read at all, not even for
 *     labeling.
 *   - no batches, no theories, no per-level "predicted challenge" score.
 *
 * Witness-first construction is still a practical necessity (the only way to guarantee
 * "provably solvable by construction" without invoking the solver's search) — it is not
 * a difficulty-targeting device here, just the generation mechanism. Two mechanics can't
 * be validated this way even in principle — see "Geese and false goals" below — those are
 * placed randomly on cells the witness never enters, which is sufficient by construction
 * (the referee never evaluates hazard/decoy rules against a cell that's never visited).
 *
 * Per the requester: object caps are raised +4 over the documented per-level maxima
 * (CLAUDE.md "Level Stats": mustPass 4, mustCross 4, portals 3 pairs, flippingFilters 4)
 * for the mechanics that HAD a documented max; mechanics with no prior documented max
 * (must-turn/surround/adjacent-turn landmarks, geese, false goals) get the same cap (8)
 * as the raised ones, for equal representation. Portal pairs are capped at 7 (+4 over 3).
 * Grids are 11x11-15x15 (15x15 is the documented max, 11x11 the requested min).
 *
 * Verified safe against solver-side assumptions before raising any cap: `MAX_MST_K = 16`
 * in lower-bounds.ts is sized for "up to MAX_MST_K remaining objectives" and must-turn
 * landmarks fold into the SAME `mustPassKeys` array as plain must-pass cells
 * (`domain/landmark-rules.ts`'s `applyLandmark`), so raw-mustPass(8) + mustTurn(8) = 16
 * is the realistic worst case for that array — landing exactly on, not past, the
 * documented ceiling (see the `_MAX_MST_EDGES` comment in lower-bounds.ts: it's sized
 * for exactly k=16, not "6 plus a margin," which is what made the *previous* max-6
 * hardcoding a real bug). mustCross/portals/flippers/surround/adjacentTurn each have
 * their own independent mask or plain-Map storage (no shared array with anything else),
 * so raising them has no analogous interaction to check.
 *
 * Run via the esbuild wrapper (imports TS domain modules):
 *   node scripts/run-bundled.mjs scripts/stress/generate-random.mjs [--count=2000]
 *       [--master-seed=20260709] [--out=data/stress/stress-levels-random.json] [--verbose]
 */
/* global structuredClone */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { PACK, UNPACK } from '../../modules/domain/cell-key.js';
import { validateRawLevel } from '../../modules/domain/level-schema.js';
import { validateLevelDetailed } from '../../modules/domain/level-validation.js';
import { normalizeRawLevel } from '../../modules/solver/normalization.js';
import { makeLevelProvenance, makeProvenanceEntry } from '../../modules/domain/level-provenance-types.js';

import {
    mulberry32, hashSeed, randInt, pick,
    generateWitness, witnessToPairs, buildRawLevel, validateWitnessOnRaw, witnessCellData,
} from './witness.mjs';
import { levelFeatures, noveltyAgainstPool, structuralComplexity, packedToPair } from './features.mjs';

const GENERATOR_VERSION = '1.1.0';
const ROOT = process.cwd();

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const COUNT = Number(args.get('--count') || 2000);
const MASTER_SEED = Number(args.get('--master-seed') || 20260709);
const OUT_FILE = args.get('--out') || 'data/stress/stress-levels-random.json';
const VERBOSE = args.has('--verbose');

const MIN_GRID = 11, MAX_GRID = 15;
const MIN_NOVELTY = 0.08;   // lower bar than the hypothesis-driven corpus — duplicate REJECTION
const FALLBACK_NOVELTY = 0.04; // only, never a novelty TARGET (see noveltyAgainstPool usage below)
const MAX_ATTEMPTS = 60;

/** Every mechanic gets the same shape of treatment: presence probability, then (when
 *  present) a count drawn from the top of its range ("favour larger numbers"). Portal
 *  pairs keep their own 7-pair cap (+4 over the documented 3); everything else that had a
 *  documented max is now 8 (+4 over 4); mechanics with no prior documented max (landmarks,
 *  geese, false goals) get the same 8, for equal representation — see the file header for
 *  why 8 is safe even for must-turn (which shares an array with must-pass). */
const MECH = {
    mustCross:    { max: 8, presence: 0.55, minFrac: 0.55 },
    mustPass:     { max: 8, presence: 0.55, minFrac: 0.55 },
    portalPairs:  { max: 7, presence: 0.55, minFrac: 0.55 },
    flippers:     { max: 8, presence: 0.55, minFrac: 0.55 },
    mustTurn:     { max: 8, presence: 0.55, minFrac: 0.55 },
    surround:     { max: 8, presence: 0.55, minFrac: 0.55 },
    adjacentTurn: { max: 8, presence: 0.55, minFrac: 0.55 },
    decorative:   { max: 8, presence: 0.55, minFrac: 0.55 },
    geese:        { max: 8, presence: 0.55, minFrac: 0.55 },
    falseGoals:   { max: 8, presence: 0.55, minFrac: 0.55 },
};

const LANDMARK_TYPES = ['park', 'market', 'library', 'fountain', 'lamppost', 'statue'];

// ─── Published-corpus pool (novelty/duplicate check only — never a generation target) ──

function loadPublishedPool() {
    const levels = JSON.parse(readFileSync(path.join(ROOT, 'data', 'levels.json'), 'utf8'));
    return levels.map((raw, i) => {
        let witness = null;
        const hintFile = path.join(ROOT, 'data', 'hints', `${String(i + 1).padStart(3, '0')}.json`);
        if (existsSync(hintFile)) {
            try {
                const hints = JSON.parse(readFileSync(hintFile, 'utf8'));
                if (Array.isArray(hints) && hints.length > 0) witness = hints[0].map(packedToPair);
            } catch { /* witness geometry is optional for the pool */ }
        }
        return { id: `L${i + 1}`, features: levelFeatures(raw, witness) };
    });
}

function loadFirstStressPool() {
    const file = path.join(ROOT, 'data', 'stress', 'stress-levels.json');
    if (!existsSync(file)) return [];
    const corpus = JSON.parse(readFileSync(file, 'utf8'));
    return corpus.levels.map(l => ({
        id: l.id,
        features: levelFeatures(l, l.stressMeta?.witnessSolution ?? null),
    }));
}

// ─── Uniform decoration ops (no style/targeting parameter — plain random draw) ──────

function makeCtx(witness, rng) {
    return {
        witness, rng,
        extras: { blocks: [], mustPass: [], mustCross: [], flippingFilters: [], landmarks: [], geese: [], falseGoals: [] },
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

const freeUnvisited = (ctx) => {
    const used = usedCells(ctx);
    return ctx.cell.unvisited.filter(k => !used.has(k));
};

/** Impassable landmarks/blocks placed so far — used by surround's neighbor-eligibility check. */
const impassableSoFar = (ctx) => new Set([
    ...ctx.extras.blocks,
    ...ctx.extras.landmarks.filter(lm => lm.role === 'surround' || lm.role === 'adjacentTurn' || lm.role === 'decorative').map(lm => lm.key),
]);

/** Uniform draw from all free (block-eligible) cells; no adjacency/perimeter preference. */
function opBlocksUniform(ctx, n) {
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.blocks.push(k))) placed++;
    }
    return placed;
}

/** Uniform draw from every witness-visited cell (once or twice); no lateness/coldness bias. */
function opMustPassUniform(ctx, n) {
    const used = usedCells(ctx);
    const candidates = ctx.cell.visitedOnce.concat(ctx.cell.visitedTwice).filter(k => !used.has(k));
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.mustPass.push(k))) placed++;
    }
    return placed;
}

/** Uniform draw from the witness's genuine self-crossing cells (visited exactly twice). */
function opMustCrossUniform(ctx, n) {
    const used = usedCells(ctx);
    const candidates = ctx.cell.visitedTwice.filter(k => !used.has(k));
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.mustCross.push(k))) placed++;
    }
    return placed;
}

/** Uniform draw across straight-through witness cells AND free off-path cells alike. */
function opFlippersUniform(ctx, n) {
    const used = usedCells(ctx);
    const onPathCandidates = ctx.cell.straightThrough.filter(k => !used.has(k));
    const offPathCandidates = freeUnvisited(ctx);
    const pool = shuffled(ctx.rng, [
        ...onPathCandidates.map(k => ({ k, onPath: true })),
        ...offPathCandidates.map(k => ({ k, onPath: false })),
    ]);
    let placed = 0;
    for (const { k } of pool) {
        if (placed >= n) break;
        const firstAxis = ctx.rng() < 0.5 ? 1 : 2;
        if (tryMutate(ctx, e => e.flippingFilters.push({ key: k, axis: firstAxis })) ||
            tryMutate(ctx, e => e.flippingFilters.push({ key: k, axis: firstAxis === 1 ? 2 : 1 })))
            placed++;
    }
    return placed;
}

/** Uniform draw from cells where the witness genuinely turns (passable landmark). */
function opMustTurnUniform(ctx, n) {
    const used = usedCells(ctx);
    const candidates = [...ctx.cell.turnsAtCell.entries()].filter(([k]) => !used.has(k));
    let placed = 0;
    for (const [k, dir] of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        const turn = dir === 'both' ? pick(ctx.rng, ['cw', 'ccw', 'either']) : (ctx.rng() < 0.5 ? dir : 'either');
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LANDMARK_TYPES), role: 'mustTurn', turn })))
            placed++;
    }
    return placed;
}

/** Uniform draw from free cells whose every valid 8-neighbor is already visited or
 *  impassable (the referee requires all of them visited by the end of the path). */
function opSurroundUniform(ctx, n) {
    const { w, h } = ctx.witness;
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        const impassable = impassableSoFar(ctx);
        const p = UNPACK(k);
        let eligible = true;
        for (let dy = -1; dy <= 1 && eligible; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = p.x + dx, ny = p.y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = PACK(nx, ny);
                if (!ctx.cell.counts.has(nk) && !impassable.has(nk)) { eligible = false; break; }
            }
        }
        if (!eligible) continue;
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LANDMARK_TYPES), role: 'surround' })))
            placed++;
    }
    return placed;
}

/** Uniform draw from free cells with >=1 witness-turn cell in their 8-neighborhood
 *  (impassable landmark; 'either' always satisfiable whenever such a neighbor exists). */
function opAdjacentTurnUniform(ctx, n) {
    const candidates = freeUnvisited(ctx).filter(k => {
        const p = UNPACK(k);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (ctx.cell.turnsAtCell.has(PACK(p.x + dx, p.y + dy))) return true;
            }
        }
        return false;
    });
    let placed = 0;
    for (const k of shuffled(ctx.rng, candidates)) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LANDMARK_TYPES), role: 'adjacentTurn', turn: 'either' })))
            placed++;
    }
    return placed;
}

/** Uniform draw from free cells; purely visual, no path constraint at all. */
function opDecorativeUniform(ctx, n) {
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.landmarks.push({ key: k, objectType: pick(ctx.rng, LANDMARK_TYPES), role: 'decorative' })))
            placed++;
    }
    return placed;
}

/** Geese and false goals: PLAY-mode-only mechanics the referee itself never lets a
 *  witness step onto (isValidMove rejects entering an armed false-goal-locked cell or,
 *  under hazard checks, a goose cell) — so "provably solvable by construction" for these
 *  two means placing them only on cells the witness never visits, which uniform-random
 *  selection from freeUnvisited already guarantees; there's no placement quality beyond
 *  that for the referee (or the solver, which ignores both via MoveContext.SOLVER) to
 *  judge, hence "placed randomly" is not a shortcut here, it's the correct and only
 *  construction-time check available. */
function opGeeseUniform(ctx, n) {
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.geese.push(k))) placed++;
    }
    return placed;
}

function opFalseGoalsUniform(ctx, n) {
    let placed = 0;
    for (const k of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= n) break;
        if (tryMutate(ctx, e => e.falseGoals.push(k))) placed++;
    }
    return placed;
}

// ─── Per-level generation ────────────────────────────────────────────────────

/** Sample a count for a "favour larger numbers when present" mechanic, or 0. */
function sampleMechCount(rng, cfg) {
    if (rng() >= cfg.presence) return 0;
    const lo = Math.max(1, Math.ceil(cfg.max * cfg.minFrac));
    return randInt(rng, lo, cfg.max);
}

/** Sorted, spaced hop fractions for `n` portal pairs across the walk. */
function hopFractions(rng, n) {
    if (n === 0) return [];
    const fracs = [];
    let cursor = rng() * (1 / (n + 1));
    for (let i = 0; i < n; i++) {
        fracs.push(Math.min(0.95, cursor + rng() * 0.03));
        cursor += 1 / (n + 1);
    }
    return fracs;
}

function buildLevel(levelSeed) {
    const rng = mulberry32(levelSeed);
    const w = randInt(rng, MIN_GRID, MAX_GRID);
    const h = randInt(rng, MIN_GRID, MAX_GRID);
    const area = w * h;
    const startKey = PACK(randInt(rng, 0, w - 1), randInt(rng, 0, h - 1));

    const portalPairs = sampleMechCount(rng, MECH.portalPairs);
    // Dense but not maximal: a random walk that fills nearly the whole grid runs out of
    // legal (non-edge-reused) moves before reaching very high fractions; 0.55-0.9 is
    // comfortably achievable and still "dense" per the brief.
    const targetFrac = 0.55 + rng() * 0.35;
    const targetLen = Math.max(MIN_GRID, Math.round(area * targetFrac));

    const witness = generateWitness({
        w, h, startKey,
        targetLen: [Math.max(10, Math.round(targetLen * 0.85)), targetLen],
        targetInt: [0, 60],
        // All-zero shaping weights: every legal next cell is equally likely (see file header).
        wStraight: 0, wPerimeter: 0, wInterior: 0, wCross: 0, wAttract: 0, attractor: null,
        noise: 1,
        portalHops: hopFractions(rng, portalPairs), hopStyle: 'any',
        endPref: null, restarts: 400,
    }, rng);
    if (!witness) return null;

    const ctx = makeCtx(witness, rng);
    const wanted = {
        mustCross: sampleMechCount(rng, MECH.mustCross),
        mustPass: sampleMechCount(rng, MECH.mustPass),
        flippers: sampleMechCount(rng, MECH.flippers),
        mustTurn: sampleMechCount(rng, MECH.mustTurn),
        surround: sampleMechCount(rng, MECH.surround),
        adjacentTurn: sampleMechCount(rng, MECH.adjacentTurn),
        decorative: sampleMechCount(rng, MECH.decorative),
        geese: sampleMechCount(rng, MECH.geese),
        falseGoals: sampleMechCount(rng, MECH.falseGoals),
        portalPairs,
    };
    // Dense construction: blocks are near-default, favoring a healthy chunk of remaining
    // free cells (drawn uniformly at random, no wall-adjacency/perimeter preference).
    const freeCount = ctx.cell.unvisited.length;
    wanted.blocks = rng() < 0.85 ? randInt(rng, Math.floor(freeCount * 0.15), Math.floor(freeCount * 0.4)) : 0;

    // Order: witness-bound objectives first (most candidate-constrained), then landmarks
    // that depend on witness-turn geometry, then generic free-cell placements last (so
    // earlier, more-constrained ops get first pick of eligible cells).
    const placed = {
        mustCross: opMustCrossUniform(ctx, wanted.mustCross),
        mustPass: opMustPassUniform(ctx, wanted.mustPass),
        flippers: opFlippersUniform(ctx, wanted.flippers),
        mustTurn: opMustTurnUniform(ctx, wanted.mustTurn),
        surround: opSurroundUniform(ctx, wanted.surround),
        adjacentTurn: opAdjacentTurnUniform(ctx, wanted.adjacentTurn),
        decorative: opDecorativeUniform(ctx, wanted.decorative),
        blocks: opBlocksUniform(ctx, wanted.blocks),
        geese: opGeeseUniform(ctx, wanted.geese),
        falseGoals: opFalseGoalsUniform(ctx, wanted.falseGoals),
        portalPairs: witness.portalPairs.length,
    };

    return { witness, extras: ctx.extras, w, h, wanted, placed };
}

function deriveTags(raw, features) {
    const tags = [];
    if (raw.grid.w === MAX_GRID && raw.grid.h === MAX_GRID) tags.push('max-grid');
    if (raw.mustCross.length > 0) tags.push(`mustCross-${raw.mustCross.length}`);
    if (raw.mustPass.length > 0) tags.push(`mustPass-${raw.mustPass.length}`);
    if (raw.portals.length > 0) tags.push(`portals-${raw.portals.length}`);
    if (raw.flippingFilters.length > 0) tags.push(`flippers-${raw.flippingFilters.length}`);
    if (raw.blocks.length > 0) tags.push('blocked');
    const lmCount = (role) => (raw.landmarks || []).filter(lm => lm.role === role).length;
    if (lmCount('mustTurn') > 0) tags.push(`mustTurn-${lmCount('mustTurn')}`);
    if (lmCount('surround') > 0) tags.push(`surround-${lmCount('surround')}`);
    if (lmCount('adjacentTurn') > 0) tags.push(`adjacentTurn-${lmCount('adjacentTurn')}`);
    if (lmCount('decorative') > 0) tags.push('decorated');
    if (raw.geese.length > 0) tags.push(`geese-${raw.geese.length}`);
    if (raw.falseGoals.length > 0) tags.push(`falseGoals-${raw.falseGoals.length}`);
    if (features.navDensity >= 0.9) tags.push('very-dense');
    else if (features.navDensity >= 0.7) tags.push('dense');
    if (features.reqInt >= 10) tags.push('high-reqInt');
    return tags;
}

// ─── Main generation loop ────────────────────────────────────────────────────

const MECH_KEYS = ['mustCross', 'mustPass', 'portalPairs', 'flippers', 'mustTurn', 'surround', 'adjacentTurn', 'decorative', 'geese', 'falseGoals', 'blocks'];

function main() {
    console.log(`Uniform-random stress corpus generator v${GENERATOR_VERSION} — seed ${MASTER_SEED}, count=${COUNT}`);
    const publishedPool = loadPublishedPool();
    const firstStressPool = loadFirstStressPool();
    const noveltyPool = [...publishedPool, ...firstStressPool];
    console.log(`Novelty/duplicate-rejection pool: ${publishedPool.length} published + ${firstStressPool.length} first-stress-corpus levels.`);

    const accepted = [];
    const stats = { attempts: 0, witnessFails: 0, structuralRejects: 0, refereeRejects: 0, noveltyRejects: 0, fallbacks: 0 };
    const mechCounts = Object.fromEntries(MECH_KEYS.map(k => [k, []]));
    const gridSizes = new Map();

    for (let i = 0; i < COUNT; i++) {
        let done = false, fallback = null;
        for (let attempt = 0; attempt < MAX_ATTEMPTS && !done; attempt++) {
            stats.attempts++;
            const levelSeed = hashSeed(MASTER_SEED, i, attempt);
            let built = null;
            try { built = buildLevel(levelSeed); } catch { built = null; }
            if (!built) { stats.witnessFails++; continue; }

            const raw = buildRawLevel(built.witness, built.extras);
            const pairs = witnessToPairs(built.witness.path);

            const schema = validateRawLevel(raw);
            if (!schema.ok) { stats.structuralRejects++; continue; }
            const normalized = normalizeRawLevel(raw, null);
            const structural = validateLevelDetailed(normalized);
            if (!structural.ok) { stats.structuralRejects++; continue; }
            const referee = validateWitnessOnRaw(raw, built.witness.path);
            if (!referee.ok) { stats.refereeRejects++; continue; }

            const features = levelFeatures(raw, pairs);
            const novelty = noveltyAgainstPool(features, noveltyPool);
            const complexity = structuralComplexity(raw, pairs);
            const candidate = { raw, pairs, features, novelty, complexity, levelSeed, placed: built.placed };

            if (novelty.noveltyScore < MIN_NOVELTY) {
                stats.noveltyRejects++;
                if (!fallback || novelty.noveltyScore > fallback.novelty.noveltyScore) fallback = candidate;
                continue;
            }
            acceptLevel(i, candidate, accepted, noveltyPool, mechCounts, gridSizes);
            done = true;
        }
        if (!done && fallback && fallback.novelty.noveltyScore >= FALLBACK_NOVELTY) {
            stats.fallbacks++;
            acceptLevel(i, fallback, accepted, noveltyPool, mechCounts, gridSizes);
            done = true;
        }
        if (!done) throw new Error(`Level ${i}: no valid candidate after ${MAX_ATTEMPTS} attempts`);
        if (VERBOSE && (i + 1) % 100 === 0) console.log(`  ${i + 1}/${COUNT} generated...`);
    }

    const mean = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '0';
    const presenceRate = (arr) => `${Math.round((arr.filter(v => v > 0).length / arr.length) * 100)}%`;

    const out = {
        generatedAt: new Date().toISOString(),
        generatorVersion: GENERATOR_VERSION,
        masterSeed: MASTER_SEED,
        description: 'Uniform-random solver stress corpus. NOT hypothesis-driven (unlike stress-levels.json\'s batches A-F): witness paths are unbiased random walks and mechanic placement is uniform-random over legal cells, so this corpus was not shaped by any knowledge of the solver\'s current behavior. NOT player content; never loaded by the app. Object caps: mustPass/mustCross/flippingFilters/mustTurn/surround/adjacentTurn/geese/falseGoals up to 8, portal pairs up to 7; grids are 11x11-15x15; no static filters (flipping filters only), no multi-gate levels. Every mechanic the game has (other than static filters) is represented with equal treatment (a presence check, then a favour-larger-numbers-when-present count) -- none are deliberately left out. Every level carries a hidden witness solution and was validated with the exact domain referee at generation time. The production solver did not participate in generation in any form (not even for archetype/challenge labeling) and has NOT been run against this corpus yet.',
        gridSizeRange: [MIN_GRID, MAX_GRID],
        mechanicCaps: Object.fromEntries(Object.entries(MECH).map(([k, v]) => [k, v.max])),
        generationStats: stats,
        levels: accepted,
    };

    mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(out, null, 1));

    console.log(`\n${accepted.length} levels → ${OUT_FILE}`);
    console.log(`Generation stats: ${JSON.stringify(stats)}`);
    console.log(`Grid sizes: ${[...gridSizes.entries()].map(([k, v]) => `${k}:${v}`).join(' ')}`);
    for (const key of MECH_KEYS) {
        const arr = mechCounts[key];
        const present = arr.filter(v => v > 0);
        console.log(`${key.padEnd(13)} present ${presenceRate(arr)}, mean when present ${mean(present)}, max ${arr.length ? Math.max(...arr) : 0}`);
    }
}

function acceptLevel(i, candidate, accepted, noveltyPool, mechCounts, gridSizes) {
    const id = `R${String(accepted.length + 1).padStart(4, '0')}`;
    const { raw, pairs, features, novelty, complexity, levelSeed, placed } = candidate;
    const level = {
        id,
        ...raw,
        provenance: makeLevelProvenance([makeProvenanceEntry('procedural', 'generated', {
            method: 'stress-corpus-random-generator',
            detail: { corpusName: 'random-uniform-v1', generatorVersion: GENERATOR_VERSION, levelSeed },
        })]),
        stressMeta: {
            generated: true,
            stressCorpus: true,
            corpusName: 'random-uniform-v1',
            witnessSolution: pairs,
            featureTags: deriveTags(raw, features),
            generatorVersion: GENERATOR_VERSION,
            levelSeed,
            structuralComplexity: complexity,
            noveltyScore: Number(novelty.noveltyScore.toFixed(3)),
            nearestNeighbor: novelty.nearestId,
            navDensity: Number(features.navDensity.toFixed(3)),
            mechanicCounts: placed,
        },
    };
    accepted.push(level);
    noveltyPool.push({ id, features });
    for (const key of MECH_KEYS) mechCounts[key].push(placed[key]);
    const gk = `${raw.grid.w}x${raw.grid.h}`;
    gridSizes.set(gk, (gridSizes.get(gk) || 0) + 1);
    if (VERBOSE) {
        console.log(`  ${id} [${i}] ${raw.grid.w}x${raw.grid.h} len=${raw.reqLen} int=${raw.reqInt} ` +
            `mc=${placed.mustCross} mp=${placed.mustPass} pp=${placed.portalPairs} ff=${placed.flippers} ` +
            `mt=${placed.mustTurn} sr=${placed.surround} at=${placed.adjacentTurn} dc=${placed.decorative} ` +
            `gs=${placed.geese} fg=${placed.falseGoals} bl=${placed.blocks} nov=${novelty.noveltyScore.toFixed(2)}`);
    }
}

main();
