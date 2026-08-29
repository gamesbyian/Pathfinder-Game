// Solution-space fingerprint primitives for the known-solvable corpora (published + stress-corpus-1).
//
// A "fingerprint" here is an aggregate description of how a level's ACCEPTED solutions behave —
// not the level's shape (that's domain/level-fingerprint.ts, a structural dedup hash) and not a
// solver-determinism hash (that's scripts/solver-fingerprint.mjs). Purpose: turn a solvable level
// into a reference specimen other levels (esp. the 1,700-level unsolved stress corpus) can be
// compared against — see docs/solution-profile.md.
//
// Reuses the existing per-path/per-level primitives rather than re-deriving them:
//   - domain/path-features.ts   → edge/crossing/portal-signature/must-cross-order per path
//   - domain/hint-novelty.ts    → per-path cell extraction, entropy/percentile, must-cross keys
//   - domain/geometry.ts        → turnDirection (pure 3-point cross product)
//   - domain/landmark-rules.ts  → role/turn-direction resolution for mustTurn/adjacentTurn
//   - domain/hint-types.ts      → provenance shape + WITNESS_GENERATOR_ID/SOLVER_ID
// This module only adds what those don't already compute: turn distributions, objective-
// satisfaction depth, prefix diversity, pairwise-distinctiveness summary stats, provenance-source
// bucketing, and the discovery-saturation curve.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';
import {
    edgeSet, crossingSet, portalSignature, mustCrossOrders, buildPathFeatures, featureDistance,
    jaccardDistance, pathSignature, isDrawnStep, NEAR_HAMILTONIAN_COVERAGE_THRESHOLD,
} from '../../modules/domain/path-features.ts';
import { turnDirection } from '../../modules/domain/geometry.ts';
import { resolveLandmarkTurn, baseLandmarkRole } from '../../modules/domain/landmark-rules.ts';
import {
    buildHintEdgeCounts, pathVisitCells, mustCrossKeysOf, requiredPathCoverageRatio, entropy, percentile,
} from '../../modules/domain/hint-novelty.ts';
import { WITNESS_GENERATOR_ID, SOLVER_ID, HUMAN_PLAYER_ID } from '../../modules/domain/hint-types.ts';
import { readLevelsWithHints, parseLevelSelector } from '../level-data-io.mjs';

// ─── Provenance-source classification ────────────────────────────────────────
//
// Maps the existing HintProvenanceEntry shape onto source categories WITHOUT any new schema for
// this module — every field read here already exists on every stored hint (isolatedTechnique was
// added directly to HintContextProvenance for exactly this consumer, see its own doc comment).
// Precedence matters: checked top to bottom, first match wins. A hint found independently by two
// techniques belongs to BOTH buckets (see sourcesForHint) — that's the point: structure appearing
// in both is more likely level-forced than generator-tic. `human-solved` sits above every
// algorithmic category (alongside `witness`, for the same reason: neither is a solver "technique",
// so the technique-specific fields below — termination/hintGuided/randomSeed — are meaningless for
// them and must not be consulted first) — a human independently solving a level, with zero
// connection to any solver heuristic, is the single strongest cross-validation signal this
// bucketing scheme has: stronger than two algorithmic techniques agreeing, since neither is running
// the solver's search at all.
//
// `isolated-technique` sits directly above `production-solver`, checked last among the
// non-`other` categories: an isolated single-technique run (e.g. technique-census tooling) still
// carries `solver.id === SOLVER_ID` (the same search code ran), so without this check it would
// silently fall into `production-solver` — the exact contamination
// docs/solver-optimization-workstreams.md's Priority 0 traced (e.g. R02900: a technique-census
// win persisted and later misread as evidence the real competitively-budgeted ladder can solve the
// level, when `Solver.solve(level,{})` still failed after hundreds of millions of nodes).

export const PROVENANCE_SOURCES = [
    'witness', 'human-solved', 'complete-enumeration', 'prefix-anchored-completion',
    'randomized-enumeration', 'isolated-technique', 'production-solver', 'other',
];

/** One provenance entry → one source category. See module doc for the precedence rationale. */
export function classifyProvenanceSource(entry) {
    if (!entry) return 'other';
    if (entry.solver?.id === WITNESS_GENERATOR_ID) return 'witness';
    if (entry.solver?.id === HUMAN_PLAYER_ID) return 'human-solved';
    if (entry.search?.termination === 'exhaustive') return 'complete-enumeration';
    if (entry.context?.hintGuided) return 'prefix-anchored-completion';
    if (entry.search?.randomSeed !== null && entry.search?.randomSeed !== undefined) return 'randomized-enumeration';
    if (entry.context?.isolatedTechnique === true) return 'isolated-technique';
    if (entry.solver?.id === SOLVER_ID) return 'production-solver';
    return 'other';
}

/** All source categories a Hint qualifies for, across every independent find recorded on it. */
export function sourcesForHint(hint) {
    const sources = new Set();
    for (const entry of hint.provenance || []) sources.add(classifyProvenanceSource(entry));
    if (sources.size === 0) sources.add('other');
    return sources;
}

/** Buckets Hint[] by source; a hint rediscovered by multiple techniques appears in each bucket. */
export function bucketHintsBySource(hints) {
    const buckets = new Map(PROVENANCE_SOURCES.map(s => [s, []]));
    for (const hint of hints) for (const src of sourcesForHint(hint)) buckets.get(src).push(hint);
    return buckets;
}

// ─── Objective extraction + satisfaction depth ───────────────────────────────
//
// "Depth" = fractional path index (0 at gate, 1 at goal) where an obligation first becomes
// satisfied. Every stored hint is already a validated win, so every objective IS satisfied by
// path end — depth answers "how early," not "whether."

/** The level's win-condition obligations as {type, key, turnDir?} — 0-indexed packed keys. Reads
 *  raw wire-format fields directly (1-indexed x/y), same convention as hint-novelty.ts. */
export function extractObjectives(level) {
    const objectives = [];
    // buildWireLevelData's wire output deliberately re-declares a mustPass/mustTurn-role
    // landmark's own cell in `mustPass` alongside its `landmarks` entry (same cell, one
    // conceptual object — see level-schema.ts's occupancy-check comments). Walking both arrays
    // unconditionally would push two objectives for that one cell; skip the raw `mustPass` echo
    // for any cell a landmark already covers below.
    const landmarkMustPassKeys = new Set();
    for (const lm of level.landmarks || []) {
        const role = baseLandmarkRole(lm.role || '');
        if (role === 'mustPass' || role === 'mustTurn') landmarkMustPassKeys.add(PACK(lm.x - 1, lm.y - 1));
    }
    for (const m of level.mustPass || []) {
        const key = PACK(m.x - 1, m.y - 1);
        if (landmarkMustPassKeys.has(key)) continue;
        objectives.push({ type: 'mustPass', key });
    }
    for (const m of level.mustCross || []) objectives.push({ type: 'mustCross', key: PACK(m.x - 1, m.y - 1) });
    for (const lm of level.landmarks || []) {
        const key = PACK(lm.x - 1, lm.y - 1);
        const role = baseLandmarkRole(lm.role || '');
        if (role === 'mustPass') objectives.push({ type: 'mustPass', key });
        else if (role === 'mustTurn') objectives.push({ type: 'mustTurn', key, turnDir: resolveLandmarkTurn(lm.role, lm.turn) });
        else if (role === 'adjacentTurn') objectives.push({ type: 'adjacentTurn', key, turnDir: resolveLandmarkTurn(lm.role, lm.turn) });
        else if (role === 'surround') objectives.push({ type: 'surround', key });
    }
    return objectives;
}

/** Turn events along one path: {key, idx, dir} for each interior vertex where the path actually
 *  turns (both the step in and the step out are drawn moves — a turn straddling a portal jump
 *  isn't a turn, the entry direction is undefined, mirroring solver/search-state.ts's own guard). */
export function turnEvents(path) {
    const events = [];
    for (let i = 1; i < path.length - 1; i++) {
        if (!isDrawnStep(path[i - 1], path[i]) || !isDrawnStep(path[i], path[i + 1])) continue;
        const dir = turnDirection(path[i - 1], path[i], path[i + 1]);
        if (dir) events.push({ key: path[i], idx: i, dir });
    }
    return events;
}

/** Per-objective satisfaction depth for one path. `depth: null` means this path's win didn't rely
 *  on this specific objective having a discoverable "first satisfied" moment (shouldn't happen for
 *  a validated win path, but degrades gracefully rather than crashing on unexpected shapes).
 *  Surround's neighbor set is treated as "every 8-adjacent in-bounds cell the path actually
 *  visits" — an approximation of "every REACHABLE neighbor" that's exact for accepted solutions
 *  (a truly-required-but-unreachable neighbor would make the level unsolvable, contradicting the
 *  path being a validated win) but doesn't independently verify reachability via blockSet. */
export function objectiveSatisfactionDepths(path, objectives, grid) {
    const denom = Math.max(1, path.length - 1);
    const turnAt = new Map();
    for (const e of turnEvents(path)) turnAt.set(e.idx, e.dir);
    const visitsByKey = new Map();
    path.forEach((k, i) => { const a = visitsByKey.get(k); if (a) a.push(i); else visitsByKey.set(k, [i]); });

    const inBounds = (x, y) => x >= 0 && y >= 0 && (!grid || (x < grid.w && y < grid.h));
    const neighborsOf = (key) => {
        const { x, y } = UNPACK(key);
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (inBounds(x + dx, y + dy)) out.push(PACK(x + dx, y + dy));
        }
        return out;
    };

    return objectives.map((obj) => {
        const visits = visitsByKey.get(obj.key) || [];
        let depth = null;
        if (obj.type === 'mustPass') {
            if (visits.length) depth = visits[0] / denom;
        } else if (obj.type === 'mustCross') {
            const idx = visits.length >= 2 ? visits[1] : visits[0];
            if (idx !== undefined) depth = idx / denom;
        } else if (obj.type === 'mustTurn') {
            const idx = visits.find(i => turnAt.has(i) && (obj.turnDir === 'either' || turnAt.get(i) === obj.turnDir));
            if (idx !== undefined) depth = idx / denom;
        } else if (obj.type === 'adjacentTurn') {
            let best = null;
            for (const nk of neighborsOf(obj.key)) {
                for (const i of visitsByKey.get(nk) || []) {
                    if (turnAt.has(i) && (obj.turnDir === 'either' || turnAt.get(i) === obj.turnDir)) {
                        if (best === null || i < best) best = i;
                    }
                }
            }
            if (best !== null) depth = best / denom;
        } else if (obj.type === 'surround') {
            let maxFirst = -1;
            for (const nk of neighborsOf(obj.key)) {
                const v = visitsByKey.get(nk);
                if (v && v.length) maxFirst = Math.max(maxFirst, v[0]);
            }
            if (maxFirst >= 0) depth = maxFirst / denom;
        }
        return { type: obj.type, key: obj.key, depth };
    });
}

// ─── Aggregation over a bucket of paths ──────────────────────────────────────

function rankedCounts(counts) {
    return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/** Caps a ranked list to its top N entries. Applied to every per-level frequency table stored in
 *  the persisted fingerprint — this artifact is a corpus-comparison tool, not a full per-cell
 *  heatmap (that already exists as its own artifact: data/level-heatmaps.json, generated by
 *  `npm run levels:generate-heatmaps`). Re-persisting every cell/edge count here at full
 *  resolution would duplicate that data and, at 606-level × 6-bucket scale, bloats the file by
 *  orders of magnitude for information the distance/summary functions never read past the top few
 *  entries anyway (cross-level comparison uses normalizedFootprint, not these raw tables). */
const TOP_N_TABLE_CAP = 20;
function topRanked(counts) {
    return rankedCounts(counts).slice(0, TOP_N_TABLE_CAP);
}

const OCC = 6;
/** Normalized OCC×OCC occupancy bucket set for cell keys — mirrors stress/features.mjs's
 *  occupancyGrid so cell footprints are comparable ACROSS differently-shaped levels (raw packed
 *  keys are meaningless cross-level; relative grid position is). */
export function normalizedFootprint(cellKeys, grid) {
    const s = new Set();
    for (const key of cellKeys) {
        const { x, y } = UNPACK(key);
        const gx = Math.min(OCC - 1, Math.floor((x / Math.max(1, grid.w)) * OCC));
        const gy = Math.min(OCC - 1, Math.floor((y / Math.max(1, grid.h)) * OCC));
        s.add(gy * OCC + gx);
    }
    return [...s].sort((a, b) => a - b);
}

export function cellVisitCounts(paths, grid) {
    const counts = new Map();
    for (const path of paths) for (const cell of pathVisitCells(path, grid)) counts.set(cell, (counts.get(cell) || 0) + 1);
    return counts;
}

export function intersectionCellCounts(paths) {
    const counts = new Map();
    for (const path of paths) for (const cell of crossingSet(path)) counts.set(cell, (counts.get(cell) || 0) + 1);
    return counts;
}

export function portalUsageStats(paths) {
    const signatureCounts = new Map();
    const jumpCounts = new Map();
    let pathsUsingPortals = 0;
    for (const path of paths) {
        const sig = portalSignature(path);
        signatureCounts.set(sig, (signatureCounts.get(sig) || 0) + 1);
        if (sig) {
            pathsUsingPortals++;
            for (const jump of sig.split(',')) jumpCounts.set(jump, (jumpCounts.get(jump) || 0) + 1);
        }
    }
    signatureCounts.delete('');
    return {
        pathsTotal: paths.length,
        pathsUsingPortals,
        distinctSignatures: signatureCounts.size,
        signatureFrequency: topRanked(signatureCounts).map(({ key, count }) => ({ signature: key, count })),
        directedJumpFrequency: topRanked(jumpCounts).map(({ key, count }) => ({ jump: key, count })),
    };
}

export function mustCrossOrderStats(paths, mcKeys) {
    if (mcKeys.length < 2) return null;
    const firstOrderCounts = new Map(), fullOrderCounts = new Map();
    for (const path of paths) {
        const { first, full } = mustCrossOrders(path, mcKeys);
        const fk = first.join('>'), fuk = full.join('>');
        firstOrderCounts.set(fk, (firstOrderCounts.get(fk) || 0) + 1);
        fullOrderCounts.set(fuk, (fullOrderCounts.get(fuk) || 0) + 1);
    }
    return {
        distinctFirstEntryOrders: firstOrderCounts.size,
        distinctCompletionOrders: fullOrderCounts.size,
        firstEntryOrderFrequency: topRanked(firstOrderCounts).map(({ key, count }) => ({ order: key, count })),
        completionOrderFrequency: topRanked(fullOrderCounts).map(({ key, count }) => ({ order: key, count })),
        // "Rigid" = every accepted solution used the same entry/completion order — a genuinely
        // level-forced constraint rather than an artifact of how solutions happened to be found.
        rigid: firstOrderCounts.size === 1 && fullOrderCounts.size === 1,
    };
}

export function turnLocationStats(paths) {
    const cellCounts = new Map();
    let totalCw = 0, totalCcw = 0, turnRateSum = 0;
    for (const path of paths) {
        const events = turnEvents(path);
        turnRateSum += events.length / Math.max(1, path.length - 1);
        for (const e of events) {
            const c = cellCounts.get(e.key) || { cw: 0, ccw: 0 };
            c[e.dir]++;
            cellCounts.set(e.key, c);
            if (e.dir === 'cw') totalCw++; else totalCcw++;
        }
    }
    return {
        turnRateMean: paths.length ? Number((turnRateSum / paths.length).toFixed(4)) : 0,
        cwFraction: (totalCw + totalCcw) ? Number((totalCw / (totalCw + totalCcw)).toFixed(4)) : 0,
        distinctTurnCells: cellCounts.size,
        turnCellFrequency: [...cellCounts.entries()]
            .map(([key, c]) => ({ key, cw: c.cw, ccw: c.ccw, total: c.cw + c.ccw }))
            .sort((a, b) => b.total - a.total)
            .slice(0, TOP_N_TABLE_CAP),
    };
}

function sharedPrefixLen(a, b) {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i;
}

/** Deterministic Fisher-Yates using mulberry32 — same PRNG family the hint-discovery scripts use,
 *  so a fixed seed reproduces the exact same sample across runs. */
function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function sampleArray(arr, n, seed) {
    if (arr.length <= n) return arr;
    const rng = mulberry32(seed);
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

/** How much of each accepted path's length is shared (as a common prefix) with the sibling
 *  path it most overlaps with — low values = solutions fan out immediately from the gate; high
 *  values = solutions stay bunched before diverging late. Sampled (seeded, deterministic) above
 *  PREFIX_SAMPLE_CAP to keep the O(n^2) comparison bounded on large hint sets. */
const PREFIX_SAMPLE_CAP = 200;
export function prefixDiversityStats(paths, seed = 20260703) {
    if (paths.length < 2) return { pathsSampled: paths.length, meanSharedPrefixFrac: 0, medianSharedPrefixFrac: 0, p90SharedPrefixFrac: 0 };
    const sample = sampleArray(paths, PREFIX_SAMPLE_CAP, seed);
    const fracs = sample.map((path, i) => {
        let best = 0;
        for (let j = 0; j < sample.length; j++) {
            if (i === j) continue;
            best = Math.max(best, sharedPrefixLen(path, sample[j]));
        }
        return best / Math.max(1, path.length);
    }).sort((a, b) => a - b);
    return {
        pathsSampled: sample.length,
        meanSharedPrefixFrac: Number((fracs.reduce((a, b) => a + b, 0) / fracs.length).toFixed(4)),
        medianSharedPrefixFrac: Number(percentile(fracs, 0.5).toFixed(4)),
        p90SharedPrefixFrac: Number(percentile(fracs, 0.9).toFixed(4)),
    };
}

/** Pairwise distinctiveness under the SAME metric the in-game hint curator uses
 *  (path-features.ts's featureDistance), summarized rather than pointwise — corpus-level answer
 *  to "how different are this level's accepted solutions from each other, on average." Sampled
 *  (seeded, deterministic) above DISTINCTIVENESS_SAMPLE_CAP paths. */
const DISTINCTIVENESS_SAMPLE_CAP = 120;
export function pairwiseDistinctivenessStats(paths, mcKeys, useCrossings, seed = 20260703, diversityFloor = 0.65) {
    const sample = sampleArray(paths, DISTINCTIVENESS_SAMPLE_CAP, seed);
    const feats = sample.map(p => buildPathFeatures(p, mcKeys));
    const distances = [];
    for (let i = 0; i < feats.length; i++)
        for (let j = i + 1; j < feats.length; j++)
            distances.push(featureDistance(feats[i], feats[j], useCrossings));
    distances.sort((a, b) => a - b);
    const aboveFloor = distances.filter(d => d >= diversityFloor).length;
    return {
        pathsSampled: sample.length,
        pairsCompared: distances.length,
        meanDistance: distances.length ? Number((distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(4)) : 0,
        medianDistance: Number(percentile(distances, 0.5).toFixed(4)),
        p10Distance: Number(percentile(distances, 0.1).toFixed(4)),
        p90Distance: Number(percentile(distances, 0.9).toFixed(4)),
        fractionAboveDiversityFloor: distances.length ? Number((aboveFloor / distances.length).toFixed(4)) : 0,
    };
}

function earliestFoundAt(hint) {
    const times = (hint.provenance || []).map(p => Date.parse(p.foundAt)).filter(Number.isFinite);
    return times.length ? Math.min(...times) : Infinity;
}

const CURVE_DOWNSAMPLE_CAP = 60;
function downsampleCurve(curve) {
    if (curve.length <= CURVE_DOWNSAMPLE_CAP) return curve;
    const step = curve.length / CURVE_DOWNSAMPLE_CAP;
    const out = [];
    for (let i = 0; i < CURVE_DOWNSAMPLE_CAP; i++) out.push(curve[Math.floor(i * step)]);
    if (out[out.length - 1] !== curve[curve.length - 1]) out.push(curve[curve.length - 1]);
    return out;
}

/**
 * How quickly new structural variety (edges / visited cells / portal signatures / must-cross
 * entry orders) stops appearing as more accepted solutions are found, walked in DISCOVERY order
 * (each hint's earliest recorded `foundAt`). `plateauStartIndex`/`plateauFraction` are a HEURISTIC
 * (first point after which a trailing window contributes zero new edges/cells) — NOT a claim the
 * search is exhaustive. `provablyExhaustive` (computed by the caller from provenance) is the only
 * legitimate "this library is complete" signal; see docs/solution-profile.md's caution.
 */
export function discoverySaturationCurve(hints, mcKeys, grid) {
    const ordered = [...hints].sort((a, b) => earliestFoundAt(a) - earliestFoundAt(b));
    const seenEdges = new Set(), seenCells = new Set(), seenPortalSigs = new Set(), seenMcOrders = new Set();
    const curve = ordered.map((hint, i) => {
        const path = hint.path;
        let newEdges = 0, newCells = 0;
        for (const e of edgeSet(path)) if (!seenEdges.has(e)) { seenEdges.add(e); newEdges++; }
        for (const c of pathVisitCells(path, grid)) if (!seenCells.has(c)) { seenCells.add(c); newCells++; }
        const psig = portalSignature(path);
        const newPortalSignatures = (psig && !seenPortalSigs.has(psig)) ? (seenPortalSigs.add(psig), 1) : 0;
        let newMustCrossOrders = 0;
        if (mcKeys.length >= 2) {
            const key = mustCrossOrders(path, mcKeys).first.join('>');
            if (key && !seenMcOrders.has(key)) { seenMcOrders.add(key); newMustCrossOrders = 1; }
        }
        return {
            n: i + 1, newEdges, newCells, newPortalSignatures, newMustCrossOrders,
            cumulativeEdges: seenEdges.size, cumulativeCells: seenCells.size,
        };
    });
    const window = Math.max(5, Math.ceil(curve.length * 0.15));
    let plateauStartIndex = null;
    for (let i = 0; i < curve.length; i++) {
        const tail = curve.slice(i);
        if (tail.length >= window && tail.every(c => c.newEdges === 0 && c.newCells === 0)) { plateauStartIndex = i; break; }
    }
    return {
        totalHints: curve.length,
        curve: downsampleCurve(curve),
        plateauStartIndex,
        plateauFraction: plateauStartIndex === null ? null : Number((plateauStartIndex / curve.length).toFixed(4)),
    };
}

// ─── Per-bucket / per-level profile assembly ─────────────────────────────────

/** Builds one bucket's (combined- or source-specific) fingerprint from its Hint[]. Returns null
 *  for an empty bucket. `objectives`/`mcKeys`/`useCrossings` are precomputed once per level by the
 *  caller and threaded through so every bucket of the same level agrees on them. */
export function buildBucketProfile(hints, level, objectives, mcKeys, useCrossings, seed = 20260703) {
    if (!hints.length) return null;
    const paths = hints.map(h => h.path);

    const cellCounts = cellVisitCounts(paths, level.grid);
    const edgeCounts = buildHintEdgeCounts(paths);
    const crossCounts = intersectionCellCounts(paths);
    const cellValues = [...cellCounts.values()].sort((a, b) => a - b);
    const edgeValues = [...edgeCounts.values()].sort((a, b) => a - b);

    const objectiveDepthAgg = new Map();
    for (const path of paths) {
        for (const r of objectiveSatisfactionDepths(path, objectives, level.grid)) {
            if (r.depth === null) continue;
            const k = `${r.type}:${r.key}`;
            const agg = objectiveDepthAgg.get(k) || { type: r.type, key: r.key, depths: [] };
            agg.depths.push(r.depth);
            objectiveDepthAgg.set(k, agg);
        }
    }
    const objectiveSatisfaction = [...objectiveDepthAgg.values()].map(({ type, key, depths }) => ({
        type, key, samples: depths.length,
        meanDepth: Number((depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(4)),
        minDepth: Number(Math.min(...depths).toFixed(4)),
        maxDepth: Number(Math.max(...depths).toFixed(4)),
    }));

    return {
        pathCount: paths.length,
        distinctPathCount: new Set(paths.map(pathSignature)).size,
        cellVisitFrequency: {
            touchedCells: cellCounts.size,
            entropy: Number(entropy(cellValues).toFixed(3)),
            coldThreshold: percentile(cellValues, 0.25),
            // Top-N only — the full per-cell heatmap already exists at data/level-heatmaps.json.
            topCells: topRanked(cellCounts),
            normalizedFootprint: normalizedFootprint(cellCounts.keys(), level.grid),
        },
        edgeUsageFrequency: {
            touchedEdges: edgeCounts.size,
            entropy: Number(entropy(edgeValues).toFixed(3)),
            topEdges: topRanked(edgeCounts),
        },
        intersectionCellFrequency: {
            distinctCrossingCells: crossCounts.size,
            topCells: topRanked(crossCounts),
        },
        portalUsage: portalUsageStats(paths),
        mustCrossOrder: mustCrossOrderStats(paths, mcKeys),
        objectiveSatisfaction,
        turnDistribution: turnLocationStats(paths),
        prefixDiversity: prefixDiversityStats(paths, seed),
        pairwiseDistinctiveness: pairwiseDistinctivenessStats(paths, mcKeys, useCrossings, seed),
        discoverySaturation: discoverySaturationCurve(hints, mcKeys, level.grid),
        provablyExhaustive: hints.some(h => (h.provenance || []).some(p => p.search?.termination === 'exhaustive')),
    };
}

/** Full per-level solution-space fingerprint: combined bucket + one bucket per provenance source
 *  that clears `minHintsPerSource` (default 3 — below that, per-source stats are too thin to be
 *  meaningful; the bucket is still reported with `insufficientData: true` so callers know the
 *  source contributed nothing, not that it's silently missing). */
export function buildLevelSolutionProfile(level, levelId, opts = {}) {
    const minHintsPerSource = opts.minHintsPerSource ?? 3;
    const seed = opts.seed ?? 20260703;
    const hints = level.hintRecords || [];
    if (!hints.length) return { level: levelId, grid: level.grid, hintCount: 0, insufficientData: true };

    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    const buckets = bucketHintsBySource(hints);

    const bySource = {};
    for (const [source, bucketHints] of buckets) {
        if (bucketHints.length < minHintsPerSource) {
            bySource[source] = { pathCount: bucketHints.length, insufficientData: true };
        } else if (bucketHints.length === hints.length) {
            // Every hint fell into this one source (e.g. legacy hints with no recorded provenance
            // all land in 'other') — a full second copy would be byte-for-byte the combined bucket
            // under a different name, not a genuine source-specific comparison. Point at it instead
            // of recomputing/restoring the same data twice.
            bySource[source] = { pathCount: bucketHints.length, sameAsCombined: true };
        } else {
            bySource[source] = buildBucketProfile(bucketHints, level, objectives, mcKeys, useCrossings, seed);
        }
    }

    return {
        level: levelId,
        grid: level.grid,
        hintCount: hints.length,
        sourceCounts: Object.fromEntries([...buckets].map(([s, hs]) => [s, hs.length])),
        combined: buildBucketProfile(hints, level, objectives, mcKeys, useCrossings, seed),
        bySource,
    };
}

/** A degenerate single-path "profile" (n=1) for a level that has only a hidden witness, not a
 *  mined hint corpus — used by solution-profile-compare.mjs to profile an unsolved-corpus target
 *  against the fingerprint library. Every distribution-shaped stat degenerates gracefully (0
 *  pairs compared, etc.) rather than needing separate code paths. */
export function buildSinglePathProfile(path, level, seed = 20260703) {
    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    return buildBucketProfile([{ path, provenance: [] }], level, objectives, mcKeys, useCrossings, seed);
}

// ─── Cross-level distance ─────────────────────────────────────────────────────
//
// Raw cell/edge keys are packed coordinates — meaningless to compare across two levels with
// different grids. Everything below either compares position-INDEPENDENT scalars (rates,
// entropy, rigidity) or the position-NORMALIZED footprint (see normalizedFootprint above).

function mustCrossOrderDist(a, b) {
    if (!a || !b) return null;
    return a.rigid === b.rigid ? 0 : 1;
}

function portalPatternDist(a, b) {
    if (!a || !b || !a.pathsTotal || !b.pathsTotal) return null;
    return Math.abs((a.pathsUsingPortals / a.pathsTotal) - (b.pathsUsingPortals / b.pathsTotal));
}

function objectiveDepthDist(a, b) {
    if (!a?.length || !b?.length) return null;
    const meanByType = (list) => {
        const m = new Map();
        for (const o of list) { const arr = m.get(o.type) || []; arr.push(o.meanDepth); m.set(o.type, arr); }
        return new Map([...m].map(([t, arr]) => [t, arr.reduce((s, v) => s + v, 0) / arr.length]));
    };
    const ma = meanByType(a), mb = meanByType(b);
    let sum = 0, n = 0;
    for (const t of ma.keys()) {
        if (!mb.has(t)) continue;
        sum += Math.abs(ma.get(t) - mb.get(t)); n++;
    }
    return n ? sum / n : null;
}

const footprintSet = (fp) => new Set(fp || []);

/** Named per-axis distance contributions between two bucket profiles, each in [0,1] or `null`
 *  when the axis isn't comparable (a mechanic absent on one or both sides). Exposed separately
 *  from profileDistance so a caller (solution-profile-compare.mjs) can show WHICH axes drove a
 *  match, not just the blended score — e.g. "same corridor, different obligation order." */
export const PROFILE_DISTANCE_WEIGHTS = {
    cellFootprint: 1.4, turnRate: 0.6, turnChirality: 0.4, mustCrossRigidity: 0.8,
    portalUsageRate: 0.6, objectiveDepth: 0.6, cellEntropy: 0.5, prefixDiversity: 0.4,
    pairwiseDistinctiveness: 0.4, discoverySaturation: 0.3,
};

export function profileDistanceTerms(a, b) {
    return {
        cellFootprint: jaccardDistance(footprintSet(a.cellVisitFrequency?.normalizedFootprint), footprintSet(b.cellVisitFrequency?.normalizedFootprint)),
        turnRate: Math.abs((a.turnDistribution?.turnRateMean ?? 0) - (b.turnDistribution?.turnRateMean ?? 0)),
        turnChirality: Math.abs((a.turnDistribution?.cwFraction ?? 0.5) - (b.turnDistribution?.cwFraction ?? 0.5)),
        mustCrossRigidity: mustCrossOrderDist(a.mustCrossOrder, b.mustCrossOrder),
        portalUsageRate: portalPatternDist(a.portalUsage, b.portalUsage),
        objectiveDepth: objectiveDepthDist(a.objectiveSatisfaction, b.objectiveSatisfaction),
        cellEntropy: Math.abs((a.cellVisitFrequency?.entropy ?? 0) - (b.cellVisitFrequency?.entropy ?? 0)) / 6,
        prefixDiversity: Math.abs((a.prefixDiversity?.meanSharedPrefixFrac ?? 0) - (b.prefixDiversity?.meanSharedPrefixFrac ?? 0)),
        pairwiseDistinctiveness: Math.abs((a.pairwiseDistinctiveness?.meanDistance ?? 0) - (b.pairwiseDistinctiveness?.meanDistance ?? 0)),
        discoverySaturation: Math.abs((a.discoverySaturation?.plateauFraction ?? 1) - (b.discoverySaturation?.plateauFraction ?? 1)),
    };
}

/**
 * Distance in [0,1] between two bucket profiles (from possibly different levels/grids). Skips
 * axes that are null/undefined on either side rather than treating a missing mechanic as maximally
 * different (a level with no must-cross squares isn't "far" from one that has them along THAT
 * axis — it's simply not comparable on it).
 */
export function profileDistance(a, b) {
    const terms = profileDistanceTerms(a, b);
    let d = 0, wsum = 0;
    for (const [name, value] of Object.entries(terms)) {
        if (value === null || value === undefined || Number.isNaN(value)) continue;
        d += PROFILE_DISTANCE_WEIGHTS[name] * Math.min(1, value);
        wsum += PROFILE_DISTANCE_WEIGHTS[name];
    }
    return wsum ? d / wsum : 1;
}

/** Min distance of `candidate` (a bucket profile) to a pool of {id, profile} entries, with the
 *  named per-axis breakdown attached to each result. */
export function nearestProfiles(candidate, pool, topK = 5) {
    return pool
        .map(entry => ({
            id: entry.id,
            distance: Number(profileDistance(candidate, entry.profile).toFixed(4)),
            terms: Object.fromEntries(
                Object.entries(profileDistanceTerms(candidate, entry.profile))
                    .map(([name, value]) => [name, value === null || value === undefined ? null : Number(value.toFixed(4))]),
            ),
        }))
        .sort((x, y) => x.distance - y.distance)
        .slice(0, topK);
}

// ─── Corpus-level summary ─────────────────────────────────────────────────────

function mean(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Aggregates a run's per-level profiles (as produced by buildLevelSolutionProfile) into a
 *  corpus-wide summary — counts, central tendencies, and the "how many levels does each
 *  provenance source contribute usefully to" coverage table. Never claims corpus-wide exhaustion;
 *  it only reports what fraction of levels have at least one hint whose OWN termination was
 *  'exhaustive' (provablyExhaustive), which is a per-level fact, not an inference. */
export function summarizeCorpusProfiles(levelProfiles) {
    const withHints = levelProfiles.filter(p => !p.insufficientData);
    const combined = withHints.map(p => p.combined).filter(Boolean);
    const withMustCrossOrder = combined.filter(c => c.mustCrossOrder);
    const withSaturation = combined.filter(c => c.discoverySaturation?.plateauFraction !== null);

    const sourceCoverage = {};
    for (const source of PROVENANCE_SOURCES) {
        sourceCoverage[source] = withHints.filter(p => !p.bySource?.[source]?.insufficientData).length;
    }

    return {
        levelsTotal: levelProfiles.length,
        levelsWithHints: withHints.length,
        levelsInsufficientData: levelProfiles.length - withHints.length,
        levelsProvablyExhaustive: combined.filter(c => c.provablyExhaustive).length,
        meanHintCount: Number(mean(withHints.map(p => p.hintCount)).toFixed(2)),
        meanPathwiseDistinctiveness: Number(mean(combined.map(c => c.pairwiseDistinctiveness.meanDistance)).toFixed(4)),
        meanTurnRate: Number(mean(combined.map(c => c.turnDistribution.turnRateMean)).toFixed(4)),
        meanCwFraction: Number(mean(combined.map(c => c.turnDistribution.cwFraction)).toFixed(4)),
        levelsWithMustCrossOrder: withMustCrossOrder.length,
        levelsWithRigidMustCrossOrder: withMustCrossOrder.filter(c => c.mustCrossOrder.rigid).length,
        meanDiscoverySaturationPlateauFraction: withSaturation.length
            ? Number(mean(withSaturation.map(c => c.discoverySaturation.plateauFraction)).toFixed(4)) : null,
        sourceCoverage,
    };
}

// ─── Freshness (see docs/solution-profile.md's Freshness section) ───────────
//
// A fingerprint library file is a snapshot of the hint corpus at generation time. It goes stale
// the moment more hints are found for its source corpus (hint-discovery tooling never touches
// these files, and mustn't — see docs/solution-profile.md's rationale for why regen is NOT wired
// into the hint-writing path). Instead, freshness is checked and repaired lazily at the one place
// these libraries are actually READ: solution-profile-compare.mjs, right before every comparison.

/** Deterministic signature of a corpus's saved-hint content — hint count + total provenance-entry
 *  count per level, hashed. Cheap enough to compute on every compare run (it reuses the same
 *  readLevelsWithHints() call the comparison needs anyway), and sensitive to any hint
 *  addition/removal or provenance append (e.g. a rediscovery) without hashing full path contents. */
export function computeHintSignature(levels, levelNumbers = null) {
    const wanted = levelNumbers || levels.map((_, i) => i + 1);
    let totalHints = 0, totalProvenance = 0;
    const perLevel = wanted.map((n) => {
        const level = levels[n - 1];
        const hintCount = level?.hints?.length || 0;
        const provenanceCount = (level?.hintRecords || []).reduce((sum, h) => sum + (h.provenance?.length || 0), 0);
        totalHints += hintCount;
        totalProvenance += provenanceCount;
        return `${hintCount}:${provenanceCount}`;
    });
    const hash = createHash('sha1').update(perLevel.join('|')).digest('hex').slice(0, 16);
    return { totalHints, totalProvenance, hash };
}


function renderSummaryMd(summary, corpusTag, levelsJsonLabel) {
    const lines = [
        `# Solution-space fingerprint summary — ${corpusTag}`,
        '',
        `Generated from \`${levelsJsonLabel}\` by \`npm run stress:solution-profile\` (or auto-refreshed ` +
        'by solution-profile-compare.mjs when stale). See ' +
        '[`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and ' +
        'the "saturated, not complete" caution.',
        '',
        `- Levels: **${summary.levelsTotal}** total, **${summary.levelsWithHints}** with hints, ` +
        `**${summary.levelsInsufficientData}** with none.`,
        `- **${summary.levelsProvablyExhaustive}** levels have at least one hint whose own search ` +
        'terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).',
        `- Mean hints/level: **${summary.meanHintCount}**. Mean pairwise distinctiveness: ` +
        `**${summary.meanPathwiseDistinctiveness}**. Mean turn rate: **${summary.meanTurnRate}** ` +
        `(cw fraction **${summary.meanCwFraction}**).`,
        `- Must-cross order: **${summary.levelsWithRigidMustCrossOrder}** / ` +
        `${summary.levelsWithMustCrossOrder} multi-must-cross levels show a single rigid entry+completion order.`,
        summary.meanDiscoverySaturationPlateauFraction === null
            ? '- Discovery-saturation plateau: n/a (no level had enough hints to detect one).'
            : `- Mean discovery-saturation plateau point: **${summary.meanDiscoverySaturationPlateauFraction}** ` +
              'of a level\'s hint corpus (heuristic — see doc; not proof of exhaustion).',
        '',
        '## Provenance-source coverage',
        '',
        '| Source | Levels with ≥ min-hints-per-source |',
        '|---|---|',
        ...PROVENANCE_SOURCES.map(s => `| ${s} | ${summary.sourceCoverage[s]} |`),
        '',
    ];
    return lines.join('\n');
}

/** Builds AND WRITES the full solution-space fingerprint library for one corpus — the single
 *  shared core behind both `npm run stress:solution-profile` (explicit CLI regen) and
 *  solution-profile-compare.mjs's automatic staleness repair, so the two can never diverge in
 *  what "fresh" means. `levelsJsonLabel` is the corpus path as it should be recorded in the output
 *  (relative to repo root, e.g. "data/levels.json") — kept separate from the absolute path used to
 *  actually read the file so re-running against a checkout at a different location still produces
 *  byte-identical `source`/`hintSignature` provenance. */
export function regenerateCorpusProfile({ levelsJsonAbsPath, levelsJsonLabel, outAbsPath, levelSpec = 'all', minHintsPerSource = 3, seed = 20260703 }) {
    const levels = readLevelsWithHints(levelsJsonAbsPath);
    const wanted = [...parseLevelSelector(levels, levelSpec)].sort((a, b) => a - b);
    const levelProfiles = wanted.map((levelNumber) => {
        const level = levels[levelNumber - 1];
        return buildLevelSolutionProfile(level, levelNumber, { minHintsPerSource, seed });
    });
    const summary = summarizeCorpusProfiles(levelProfiles);
    const corpusTag = path.basename(levelsJsonLabel, '.json') === 'levels' ? 'published' : path.basename(levelsJsonLabel, '.json');
    const output = {
        generatedAt: new Date().toISOString(),
        source: levelsJsonLabel,
        description: 'Per-level solution-space fingerprints (combined + per-provenance-source) for a '
            + 'known-solvable corpus — see docs/solution-profile.md.',
        minHintsPerSource,
        seed,
        levelSpec,
        hintSignature: computeHintSignature(levels, wanted),
        corpusSummary: summary,
        levels: levelProfiles,
    };

    mkdirSync(path.dirname(outAbsPath), { recursive: true });
    // Compact, not pretty-printed: this is a machine-readable fingerprint library, not a
    // hand-diffed doc (that's what the accompanying -summary.md is for) — at corpus-scale ×
    // multi-bucket scale, indent(1) alone multiplies file size several-fold for no benefit.
    writeFileSync(outAbsPath, `${JSON.stringify(output)}\n`);
    const mdPath = outAbsPath.replace(/\.json$/, '-summary.md');
    writeFileSync(mdPath, renderSummaryMd(summary, corpusTag, levelsJsonLabel));

    return { output, outAbsPath, mdPath };
}
