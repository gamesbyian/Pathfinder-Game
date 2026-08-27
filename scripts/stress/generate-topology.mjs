#!/usr/bin/env node
/**
 * Topology-composition stress generator.
 *
 * Purpose: provide a solver-blind generated distribution whose witness geometry does NOT come
 * from witness.mjs's stochastic walk used by Corpus 1 and Corpus 2. This generator first builds
 * a randomized perfect maze on a coarse 4x4 or 5x5 macro grid, takes the maze diameter, and
 * compiles that macro route into independent 3x3 path modules. Turn modules may use a compact
 * exact self-crossing gadget, so intersections remain available without invoking any global
 * solver. Off-route macro structure also nominates block cells, giving the construction scaffold
 * a visible effect on the final level.
 *
 * Solvability remains by construction: every assembled witness and every decoration mutation is
 * checked with the canonical Pathfinder referee. The production solver does not participate in
 * generation, scoring, filtering, or labeling.
 *
 * Deliberate v0.1 scope:
 *   - square 12x12 or 15x15 grids (4x4 / 5x5 macro grids of 3x3 modules);
 *   - blocks, MustPass, MustCross, flipping filters, must-turn landmarks, geese, false goals;
 *   - no portals, static filters, surround, adjacent-turn, or multi-gate levels yet.
 *
 * The default output is tmp/, not a standing corpus. Promote a generated population into
 * data/stress only through an explicit research decision.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/generate-topology.mjs -- \
 *     [--count=100] [--master-seed=20260827] [--out=tmp/stress-levels-topology.json]
 *     [--id-prefix=T] [--verbose]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { stringifyCorpusJson } from '../level-json-format.mjs';
import { PACK, UNPACK } from '../../modules/domain/cell-key.js';
import { validateRawLevel } from '../../modules/domain/level-schema.js';
import { validateLevelDetailed } from '../../modules/domain/level-validation.js';
import { getLevelFingerprintSource } from '../../modules/domain/level-fingerprint.js';
import { normalizeRawLevel } from '../../modules/solver/normalization.js';
import { makeLevelProvenance, makeProvenanceEntry } from '../../modules/domain/level-provenance-types.js';

import {
    mulberry32, hashSeed, randInt, pick,
    witnessToPairs, buildRawLevel, validateWitnessOnRaw, witnessCellData,
} from './witness.mjs';
import { levelFeatures, structuralComplexity } from './features.mjs';

const GENERATOR_VERSION = '0.1.0';
const CORPUS_NAME = 'topology-composition-v1';
const ROOT = process.cwd();

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const COUNT = Number(args.get('--count') || 100);
const MASTER_SEED = Number(args.get('--master-seed') ?? 20260827);
const OUT_FILE = args.get('--out') || 'tmp/stress-levels-topology.json';
const ID_PREFIX = args.get('--id-prefix') || 'T';
const VERBOSE = args.has('--verbose');
const MAX_ATTEMPTS = 80;

if (!Number.isInteger(COUNT) || COUNT < 1) throw new Error('--count must be a positive integer');
if (!Number.isFinite(MASTER_SEED)) throw new Error('--master-seed must be numeric');
if (!/^[A-Za-z]+$/.test(ID_PREFIX)) throw new Error('--id-prefix must contain letters only');

const SIDES = [
    { name: 'N', dx: 0, dy: -1 },
    { name: 'E', dx: 1, dy: 0 },
    { name: 'S', dx: 0, dy: 1 },
    { name: 'W', dx: -1, dy: 0 },
];
const LANDMARK_TYPES = ['park', 'market', 'library', 'fountain', 'lamppost', 'statue'];
const MECH_CAPS = {
    mustCross: 4,
    mustPass: 4,
    flippers: 4,
    mustTurn: 4,
    geese: 4,
    falseGoals: 4,
};

function shuffled(rng, arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function nodeXY(index, macroW) {
    return { x: index % macroW, y: Math.floor(index / macroW) };
}

function nodeIndex(x, y, macroW) {
    return y * macroW + x;
}

function geometricNeighbors(index, macroW, macroH) {
    const p = nodeXY(index, macroW);
    const out = [];
    for (const side of SIDES) {
        const x = p.x + side.dx;
        const y = p.y + side.dy;
        if (x < 0 || y < 0 || x >= macroW || y >= macroH) continue;
        out.push({ index: nodeIndex(x, y, macroW), side });
    }
    return out;
}

/** Randomized depth-first spanning tree. The topology exists before any Pathfinder path does. */
function carvePerfectMaze(macroW, macroH, rng) {
    const n = macroW * macroH;
    const adjacency = Array.from({ length: n }, () => []);
    const seen = new Uint8Array(n);
    const start = randInt(rng, 0, n - 1);
    const stack = [start];
    seen[start] = 1;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const options = geometricNeighbors(current, macroW, macroH)
            .filter(nbr => !seen[nbr.index]);
        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const next = pick(rng, options).index;
        adjacency[current].push(next);
        adjacency[next].push(current);
        seen[next] = 1;
        stack.push(next);
    }
    return adjacency;
}

function farthestInTree(adjacency, start) {
    const dist = new Int32Array(adjacency.length);
    dist.fill(-1);
    const parent = new Int32Array(adjacency.length);
    parent.fill(-1);
    const queue = [start];
    dist[start] = 0;
    let farthest = start;

    for (let q = 0; q < queue.length; q++) {
        const current = queue[q];
        if (dist[current] > dist[farthest]) farthest = current;
        for (const next of adjacency[current]) {
            if (dist[next] !== -1) continue;
            dist[next] = dist[current] + 1;
            parent[next] = current;
            queue.push(next);
        }
    }
    return { farthest, parent, dist };
}

function treeDiameterPath(adjacency) {
    const first = farthestInTree(adjacency, 0).farthest;
    const secondRun = farthestInTree(adjacency, first);
    const last = secondRun.farthest;
    const reversed = [];
    for (let cur = last; cur !== -1; cur = secondRun.parent[cur]) {
        reversed.push(cur);
        if (cur === first) break;
    }
    return reversed.reverse();
}

function sideBetween(fromIndex, toIndex, macroW) {
    const a = nodeXY(fromIndex, macroW);
    const b = nodeXY(toIndex, macroW);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const side = SIDES.find(s => s.dx === dx && s.dy === dy);
    if (!side) throw new Error('macro route contains a non-adjacent step');
    return side;
}

function tileCenter(index, macroW) {
    const p = nodeXY(index, macroW);
    return { x: p.x * 3 + 1, y: p.y * 3 + 1 };
}

function pointPlus(p, side) {
    return { x: p.x + side.dx, y: p.y + side.dy };
}

function opposite(side) {
    return { dx: -side.dx, dy: -side.dy };
}

function isTurn(inSide, outSide) {
    return (inSide.dx * outSide.dx + inSide.dy * outSide.dy) === 0;
}

/**
 * Compile one 3x3 macro tile.
 *
 * Normal tiles are simply port -> center -> port. A crossing turn takes:
 *   entry -> center -> opposite(entry) -> corner -> opposite(exit) -> center -> exit
 * so the center is traversed once on each axis with no reused edge.
 */
function tilePath(center, inSide, outSide, crossing) {
    if (!inSide && !outSide) return [center];
    if (!inSide) return [center, pointPlus(center, outSide)];
    if (!outSide) return [pointPlus(center, inSide), center];

    const entry = pointPlus(center, inSide);
    const exit = pointPlus(center, outSide);
    if (!crossing) return [entry, center, exit];
    if (!isTurn(inSide, outSide)) throw new Error('crossing module requires a turn');

    const oppIn = opposite(inSide);
    const oppOut = opposite(outSide);
    return [
        entry,
        center,
        pointPlus(center, oppIn),
        { x: center.x + oppIn.dx + oppOut.dx, y: center.y + oppIn.dy + oppOut.dy },
        pointPlus(center, oppOut),
        center,
        exit,
    ];
}

function compileWitness(macroW, macroH, adjacency, macroPath, rng, intersectionProfile) {
    if (macroPath.length < 4) return null;

    const turnIndices = [];
    for (let i = 1; i < macroPath.length - 1; i++) {
        const inSide = sideBetween(macroPath[i], macroPath[i - 1], macroW);
        const outSide = sideBetween(macroPath[i], macroPath[i + 1], macroW);
        if (isTurn(inSide, outSide)) turnIndices.push(i);
    }

    const crossingTiles = new Set();
    if (intersectionProfile === 'some') {
        if (turnIndices.length === 0) return null;
        const count = randInt(rng, 1, Math.min(4, turnIndices.length));
        for (const i of shuffled(rng, turnIndices).slice(0, count)) crossingTiles.add(i);
    }

    const pathKeys = [];
    for (let i = 0; i < macroPath.length; i++) {
        const current = macroPath[i];
        const inSide = i > 0 ? sideBetween(current, macroPath[i - 1], macroW) : null;
        const outSide = i + 1 < macroPath.length ? sideBetween(current, macroPath[i + 1], macroW) : null;
        const local = tilePath(tileCenter(current, macroW), inSide, outSide, crossingTiles.has(i));

        if (i === 0) {
            for (const p of local) pathKeys.push(PACK(p.x, p.y));
        } else {
            const first = PACK(local[0].x, local[0].y);
            const prev = UNPACK(pathKeys[pathKeys.length - 1]);
            const fp = UNPACK(first);
            if (Math.abs(prev.x - fp.x) + Math.abs(prev.y - fp.y) !== 1) return null;
            pathKeys.push(first);
            for (let j = 1; j < local.length; j++) pathKeys.push(PACK(local[j].x, local[j].y));
        }
    }

    const counts = new Map();
    let reqInt = 0;
    for (const key of pathKeys) {
        const prior = counts.get(key) || 0;
        if (prior > 0) reqInt++;
        const next = prior + 1;
        if (next > 2) return null;
        counts.set(key, next);
    }

    if (intersectionProfile === 'none' && reqInt !== 0) return null;
    if (intersectionProfile === 'some' && reqInt < 1) return null;

    const witness = {
        path: pathKeys,
        jumps: new Set(),
        portalPairs: [],
        reqLen: pathKeys.length - 1,
        reqInt,
        startKey: pathKeys[0],
        goalKey: pathKeys[pathKeys.length - 1],
        w: macroW * 3,
        h: macroH * 3,
    };
    if (!validateWitnessOnRaw(buildRawLevel(witness), witness.path).ok) return null;

    return {
        witness,
        macroW,
        macroH,
        adjacency,
        macroPath,
        crossingTiles: [...crossingTiles],
        intersectionProfile,
    };
}

function makeCtx(witness, rng) {
    return {
        witness,
        rng,
        extras: {
            blocks: [],
            mustPass: [],
            mustCross: [],
            flippingFilters: [],
            landmarks: [],
            geese: [],
            falseGoals: [],
        },
        cell: witnessCellData(witness),
    };
}

function usedCells(ctx) {
    const used = new Set([ctx.witness.startKey, ctx.witness.goalKey]);
    for (const k of ctx.extras.blocks) used.add(k);
    for (const k of ctx.extras.mustPass) used.add(k);
    for (const k of ctx.extras.mustCross) used.add(k);
    for (const f of ctx.extras.flippingFilters) used.add(f.key);
    for (const lm of ctx.extras.landmarks) used.add(lm.key);
    for (const k of ctx.extras.geese) used.add(k);
    for (const k of ctx.extras.falseGoals) used.add(k);
    return used;
}

function tryMutate(ctx, mutator) {
    const saved = structuredClone(ctx.extras);
    mutator(ctx.extras);
    const result = validateWitnessOnRaw(buildRawLevel(ctx.witness, ctx.extras), ctx.witness.path);
    if (!result.ok) ctx.extras = saved;
    return result.ok;
}

function freeUnvisited(ctx) {
    const used = usedCells(ctx);
    return ctx.cell.unvisited.filter(k => !used.has(k));
}

function sampleCount(rng, available, cap, presence = 0.55) {
    if (available <= 0 || rng() >= presence) return 0;
    return randInt(rng, 1, Math.min(available, cap));
}

function placeMustCross(ctx, wanted) {
    const used = usedCells(ctx);
    let placed = 0;
    for (const key of shuffled(ctx.rng, ctx.cell.visitedTwice.filter(k => !used.has(k)))) {
        if (placed >= wanted) break;
        if (tryMutate(ctx, e => e.mustCross.push(key))) placed++;
    }
    return placed;
}

function placeMustPass(ctx, wanted) {
    let placed = 0;
    for (const key of shuffled(ctx.rng, ctx.cell.visitedOnce)) {
        if (placed >= wanted) break;
        if (usedCells(ctx).has(key)) continue;
        if (tryMutate(ctx, e => e.mustPass.push(key))) placed++;
    }
    return placed;
}

function placeMustTurn(ctx, wanted) {
    let placed = 0;
    const candidates = [...ctx.cell.turnsAtCell.entries()];
    for (const [key, dir] of shuffled(ctx.rng, candidates)) {
        if (placed >= wanted) break;
        if (usedCells(ctx).has(key)) continue;
        const turn = dir === 'both' ? 'either' : dir;
        if (tryMutate(ctx, e => e.landmarks.push({
            key,
            objectType: pick(ctx.rng, LANDMARK_TYPES),
            role: 'mustTurn',
            turn,
        }))) placed++;
    }
    return placed;
}

function placeFlippers(ctx, wanted) {
    let placed = 0;
    const pool = shuffled(ctx.rng, [...ctx.cell.straightThrough, ...ctx.cell.unvisited]);
    for (const key of pool) {
        if (placed >= wanted) break;
        if (usedCells(ctx).has(key)) continue;
        const firstAxis = ctx.rng() < 0.5 ? 1 : 2;
        if (
            tryMutate(ctx, e => e.flippingFilters.push({ key, axis: firstAxis })) ||
            tryMutate(ctx, e => e.flippingFilters.push({ key, axis: firstAxis === 1 ? 2 : 1 }))
        ) placed++;
    }
    return placed;
}

/** Cells reflecting absent/off-route macro structure; used before generic random block candidates. */
function topologyBlockCandidates(topology) {
    const witnessSet = new Set(topology.witness.path);
    const pathNodes = new Set(topology.macroPath);
    const candidates = new Set();

    for (let node = 0; node < topology.adjacency.length; node++) {
        const center = tileCenter(node, topology.macroW);
        const centerKey = PACK(center.x, center.y);
        if (!pathNodes.has(node) && !witnessSet.has(centerKey)) candidates.add(centerKey);

        for (const nbr of geometricNeighbors(node, topology.macroW, topology.macroH)) {
            if (topology.adjacency[node].includes(nbr.index)) continue;
            const port = pointPlus(center, nbr.side);
            const key = PACK(port.x, port.y);
            if (!witnessSet.has(key)) candidates.add(key);
        }
    }
    return [...candidates];
}

function placeBlocks(ctx, topologyCandidates, wanted) {
    let placed = 0;
    const preferred = shuffled(ctx.rng, topologyCandidates);
    const preferredSet = new Set(preferred);
    const generic = shuffled(ctx.rng, freeUnvisited(ctx).filter(k => !preferredSet.has(k)));
    for (const key of [...preferred, ...generic]) {
        if (placed >= wanted) break;
        if (usedCells(ctx).has(key)) continue;
        if (tryMutate(ctx, e => e.blocks.push(key))) placed++;
    }
    return placed;
}

function placeOffPath(ctx, wanted, field) {
    let placed = 0;
    for (const key of shuffled(ctx.rng, freeUnvisited(ctx))) {
        if (placed >= wanted) break;
        if (tryMutate(ctx, e => e[field].push(key))) placed++;
    }
    return placed;
}

function buildLevel(levelSeed, intersectionProfile) {
    const rng = mulberry32(levelSeed);
    const macroW = rng() < 0.5 ? 4 : 5;
    const macroH = macroW;
    const adjacency = carvePerfectMaze(macroW, macroH, rng);
    const macroPath = treeDiameterPath(adjacency);
    const topology = compileWitness(
        macroW, macroH, adjacency, macroPath, rng, intersectionProfile
    );
    if (!topology) return null;

    const ctx = makeCtx(topology.witness, rng);
    const wanted = {
        mustCross: sampleCount(rng, ctx.cell.visitedTwice.length, MECH_CAPS.mustCross, 0.6),
        mustPass: sampleCount(rng, ctx.cell.visitedOnce.length, MECH_CAPS.mustPass, 0.55),
        mustTurn: sampleCount(rng, ctx.cell.turnsAtCell.size, MECH_CAPS.mustTurn, 0.5),
        flippers: sampleCount(
            rng,
            ctx.cell.straightThrough.length + ctx.cell.unvisited.length,
            MECH_CAPS.flippers,
            0.5
        ),
        geese: sampleCount(rng, ctx.cell.unvisited.length, MECH_CAPS.geese, 0.35),
        falseGoals: sampleCount(rng, ctx.cell.unvisited.length, MECH_CAPS.falseGoals, 0.35),
    };

    const placed = {
        mustCross: placeMustCross(ctx, wanted.mustCross),
        mustTurn: placeMustTurn(ctx, wanted.mustTurn),
        mustPass: placeMustPass(ctx, wanted.mustPass),
        flippers: placeFlippers(ctx, wanted.flippers),
    };

    const area = topology.witness.w * topology.witness.h;
    const blockCandidates = topologyBlockCandidates(topology);
    const minBlocks = Math.max(2, Math.floor(area * 0.04));
    const maxBlocks = Math.max(minBlocks, Math.floor(area * 0.12));
    const wantedBlocks = Math.min(ctx.cell.unvisited.length, randInt(rng, minBlocks, maxBlocks));
    placed.blocks = placeBlocks(ctx, blockCandidates, wantedBlocks);

    placed.geese = placeOffPath(ctx, wanted.geese, 'geese');
    placed.falseGoals = placeOffPath(ctx, wanted.falseGoals, 'falseGoals');

    return {
        topology,
        extras: ctx.extras,
        placed,
        topologyBlockCandidateCount: blockCandidates.length,
    };
}

function loadKnownFingerprints() {
    const files = [
        'data/levels.json',
        'data/stress/stress-levels.json',
        'data/stress/stress-levels-random.json',
        'data/stress/stress-levels-envelope.json',
    ];
    const set = new Set();
    let rows = 0;
    for (const rel of files) {
        const abs = path.join(ROOT, rel);
        if (!existsSync(abs)) continue;
        const parsed = JSON.parse(readFileSync(abs, 'utf8'));
        const levels = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.levels) ? parsed.levels : []);
        for (const level of levels) {
            set.add(getLevelFingerprintSource(level));
            rows++;
        }
    }
    return { set, rows };
}

function deriveTags(raw) {
    const tags = ['topology-composition', 'macro-maze'];
    if (raw.reqInt === 0) tags.push('zero-intersection');
    else tags.push('self-crossing');
    if (raw.mustCross.length) tags.push('must-cross');
    if (raw.mustPass.length) tags.push('must-pass');
    if (raw.flippingFilters.length) tags.push('flippers');
    if ((raw.landmarks || []).some(lm => lm.role === 'mustTurn')) tags.push('must-turn');
    if (raw.blocks.length) tags.push('blocked');
    if (raw.geese.length) tags.push('geese');
    if (raw.falseGoals.length) tags.push('false-goals');
    return tags;
}

function acceptLevel(i, built, levelSeed, raw, generatedAt) {
    const id = ID_PREFIX + String(i + 1).padStart(5, '0');
    const witnessPairs = witnessToPairs(built.topology.witness.path);
    const features = levelFeatures(raw, witnessPairs);
    return {
        id,
        ...raw,
        provenance: makeLevelProvenance([makeProvenanceEntry('procedural', 'generated', {
            method: 'stress-topology-composition-generator',
            timestamp: generatedAt,
            detail: {
                corpusName: CORPUS_NAME,
                generatorVersion: GENERATOR_VERSION,
                levelSeed,
                construction: 'perfect-maze-diameter-to-3x3-modules',
            },
        })]),
        stressMeta: {
            generated: true,
            stressCorpus: true,
            corpusName: CORPUS_NAME,
            generatorFamily: 'topology-composition',
            topologyKind: 'perfect-maze-diameter',
            witnessSolution: witnessPairs,
            featureTags: deriveTags(raw),
            generatorVersion: GENERATOR_VERSION,
            levelSeed,
            intersectionProfile: built.topology.intersectionProfile,
            macroGrid: { w: built.topology.macroW, h: built.topology.macroH },
            macroPathLength: built.topology.macroPath.length,
            crossingModules: built.topology.crossingTiles.length,
            topologyBlockCandidates: built.topologyBlockCandidateCount,
            structuralComplexity: structuralComplexity(raw, witnessPairs),
            navDensity: Number(features.navDensity.toFixed(3)),
            mechanicCounts: built.placed,
        },
    };
}

function main() {
    const generatedAt = new Date().toISOString();
    const known = loadKnownFingerprints();
    const fingerprints = known.set;
    const levels = [];
    const stats = {
        attempts: 0,
        constructionRejects: 0,
        structuralRejects: 0,
        refereeRejects: 0,
        duplicateRejects: 0,
    };

    console.log(
        'Topology-composition stress generator v' + GENERATOR_VERSION +
        ' — seed ' + MASTER_SEED + ', count=' + COUNT
    );
    console.log('Known-structure duplicate pool: ' + known.rows + ' level(s).');

    for (let i = 0; i < COUNT; i++) {
        // Fixed solver-blind mixture: one quarter exact-zero-intersection, three quarters with
        // >=1 crossing module. This prevents a random small pilot from accidentally containing
        // only one regime while keeping the actual geometry random within each stratum.
        const intersectionProfile = (i % 4 === 0) ? 'none' : 'some';
        let accepted = null;

        for (let attempt = 0; attempt < MAX_ATTEMPTS && !accepted; attempt++) {
            stats.attempts++;
            const levelSeed = hashSeed(MASTER_SEED, i, attempt, CORPUS_NAME);
            let built;
            try {
                built = buildLevel(levelSeed, intersectionProfile);
            } catch {
                built = null;
            }
            if (!built) {
                stats.constructionRejects++;
                continue;
            }

            const raw = buildRawLevel(built.topology.witness, built.extras);
            const schema = validateRawLevel(raw);
            if (!schema.ok) {
                stats.structuralRejects++;
                continue;
            }

            let normalized;
            try {
                normalized = normalizeRawLevel(raw, null);
            } catch {
                stats.structuralRejects++;
                continue;
            }
            const structural = validateLevelDetailed(normalized);
            if (!structural.ok) {
                stats.structuralRejects++;
                continue;
            }

            const referee = validateWitnessOnRaw(raw, built.topology.witness.path);
            if (!referee.ok) {
                stats.refereeRejects++;
                continue;
            }

            const fingerprint = getLevelFingerprintSource(raw);
            if (fingerprints.has(fingerprint)) {
                stats.duplicateRejects++;
                continue;
            }

            fingerprints.add(fingerprint);
            accepted = acceptLevel(i, built, levelSeed, raw, generatedAt);
        }

        if (!accepted) {
            throw new Error(
                'Level ' + i + ': no valid topology-composition candidate after ' +
                MAX_ATTEMPTS + ' attempts'
            );
        }
        levels.push(accepted);

        if (VERBOSE) {
            const m = accepted.stressMeta;
            console.log(
                '  ' + accepted.id +
                ' grid=' + accepted.grid.w + 'x' + accepted.grid.h +
                ' macroPath=' + m.macroPathLength +
                ' len=' + accepted.reqLen +
                ' int=' + accepted.reqInt +
                ' crossingModules=' + m.crossingModules +
                ' blocks=' + accepted.blocks.length
            );
        }
    }

    const out = {
        generatedAt,
        generatorVersion: GENERATOR_VERSION,
        masterSeed: MASTER_SEED,
        corpusName: CORPUS_NAME,
        description:
            'Solver-blind topology-composition stress population. A randomized perfect maze is ' +
            'generated first on a coarse 4x4 or 5x5 grid; its diameter is then compiled into ' +
            'independent 3x3 Pathfinder path modules, including exact crossing modules on a ' +
            'prespecified mixture of rows. This generator deliberately does not use the stochastic ' +
            'witness walk shared by Corpus 1 and Corpus 2, and the production solver never ' +
            'participates. Every retained level carries a hidden witness and passes schema, ' +
            'structural, and canonical-referee validation. v0.1 supports blocks, MustPass, ' +
            'MustCross, flipping filters, must-turn landmarks, geese, and false goals; portals, ' +
            'static filters, surround, adjacent-turn, and multi-gate are intentionally absent.',
        gridSizes: [12, 15],
        mechanicCaps: MECH_CAPS,
        generationStats: stats,
        levels,
    };

    const absOut = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(absOut), { recursive: true });
    writeFileSync(absOut, stringifyCorpusJson(out));

    const zero = levels.filter(l => l.reqInt === 0).length;
    const crossing = levels.length - zero;
    console.log(
        '\n' + levels.length + ' level(s) -> ' + OUT_FILE +
        ' (' + zero + ' zero-intersection, ' + crossing + ' crossing)'
    );
    console.log('Generation stats: ' + JSON.stringify(stats));
}

main();
