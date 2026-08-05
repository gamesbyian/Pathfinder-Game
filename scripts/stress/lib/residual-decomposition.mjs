/**
 * Residual block-cut decomposition — shared primitive behind the "separator-state resource
 * spectrum" prototype (docs/solver-next-frontier-multilingual-research-update-2026-08-02.md
 * section 3) and the residual-separator census (that doc's Stage 3 / Tier-1 prerequisite).
 *
 * SCOPE. Deliberately narrow, matching the sibling oracle-comparison probes
 * (axis-reach-probe.mjs, backward-exact-probe.mjs, pocket-bridge-probe.mjs): no portals, filters,
 * flipping filters, must-cross, or turn-obligation cells inside a reported chamber. Impassable
 * landmarks (surround/adjacentTurn/decorative) are already excluded via blockSet/reachBlockedArr,
 * same as everywhere else in the solver. A chamber containing the goal or a gate is never reported
 * (see computeResidualChambers' outOfScopeKeys) — those aren't bounded excursions, they're the
 * continuation of the puzzle itself.
 *
 * WHAT A "CHAMBER" IS. A maximal set of residual (unblocked, not-yet-fully-used) cells reachable
 * from the current head position ONLY through one gateway cell — i.e. a pendant subtree of the
 * block-cut tree rooted at the current position. Removing the gateway disconnects the chamber from
 * the rest of the residual graph, so any path that visits the chamber must enter and leave through
 * that one cell.
 *
 * ROOT SPECIAL CASE. The classic articulation-point condition (`low[child] >= disc[u]`) is
 * vacuously true at the DFS root (disc[root] = 0), so every direct branch off the current position
 * would otherwise be misreported as its own "chamber" even when there's only one way out. The
 * standard fix applies: the root only splits into separate chambers when it has 2+ DFS children.
 */
import { UNPACK } from '../../../modules/domain/cell-key.ts';
import { getNeighbors, applyMove, undoMove } from '../../../modules/solver/search-state.ts';
import { getRealLengthFromState } from '../../../modules/solver/solution.ts';

function outOfScopeKeys(level) {
    const s = new Set();
    if (level.goalKey >= 0) s.add(level.goalKey);
    for (const k of level.gateKeys || []) s.add(k);
    for (const k of level.mustCrossKeys || []) s.add(k);
    for (const k of (level.portalMap ? level.portalMap.keys() : [])) s.add(k);
    for (const p of (level.portalMap ? level.portalMap.values() : [])) if (p.dest >= 0) s.add(p.dest);
    for (const k of (level.filterMap ? level.filterMap.keys() : [])) s.add(k);
    for (const k of (level.flippingFilterMap ? level.flippingFilterMap.keys() : [])) s.add(k);
    if (level.mustPassTurnDirs) for (const k of level.mustPassTurnDirs.keys()) s.add(k);
    return s;
}

function neighbors4(k, W, H) {
    const p = UNPACK(k);
    const out = [];
    if (p.x + 1 < W) out.push(((p.y << 16) | (p.x + 1)) >>> 0);
    if (p.x - 1 >= 0) out.push(((p.y << 16) | (p.x - 1)) >>> 0);
    if (p.y + 1 < H) out.push((((p.y + 1) << 16) | p.x) >>> 0);
    if (p.y - 1 >= 0) out.push((((p.y - 1) << 16) | p.x) >>> 0);
    return out;
}

/**
 * Finds pendant chambers hanging off the residual graph reachable from `pos`, restricted to ones
 * that (a) stay fully in-scope (see file doc), (b) are at most `maxChamberSize` cells, and (c)
 * contain at least one still-pending must-pass obligation (a chamber with nothing mandatory inside
 * isn't a constraint on anything and is silently dropped — the path is free to skip it).
 *
 * Returns `[{ gateway, cells: Set<key>, mustPassIdxs: number[] }, ...]`. `cells` is the chamber's
 * INTERIOR only (excludes the gateway itself), matching how the block-cut tree names components.
 */
export function computeResidualChambers({ pos, level, prep, state, maxChamberSize = 10 }) {
    const W = level.grid.w, H = level.grid.h;
    const outOfScope = outOfScopeKeys(level);
    const enterable = (k) => {
        if (prep.reachBlockedArr[k] === 1) return false;
        if (state.visited[k] > 0 && state.edgeUsage[k] === 3) return false;
        return true;
    };

    const disc = new Map(), low = new Map();
    let timer = 0;
    const chambers = [];

    function dfsChild(u, parent) {
        disc.set(u, timer); low.set(u, timer); timer++;
        const subtree = new Set([u]);
        for (const v of neighbors4(u, W, H)) {
            if (!enterable(v) || v === parent) continue;
            if (!disc.has(v)) {
                const childSubtree = dfsChild(v, u);
                for (const c of childSubtree) subtree.add(c);
                low.set(u, Math.min(low.get(u), low.get(v)));
                if (low.get(v) >= disc.get(u)) chambers.push({ gateway: u, cells: childSubtree });
            } else {
                low.set(u, Math.min(low.get(u), disc.get(v)));
            }
        }
        return subtree;
    }

    disc.set(pos, timer); low.set(pos, timer); timer++;
    const rootChildSubtrees = [];
    for (const v of neighbors4(pos, W, H)) {
        if (!enterable(v) || disc.has(v)) continue;
        const childSubtree = dfsChild(v, pos);
        rootChildSubtrees.push(childSubtree);
        low.set(pos, Math.min(low.get(pos), low.get(v)));
    }
    if (rootChildSubtrees.length >= 2) {
        for (const childSubtree of rootChildSubtrees) chambers.push({ gateway: pos, cells: childSubtree });
    }

    const result = [];
    for (const { gateway, cells } of chambers) {
        if (cells.size > maxChamberSize) continue;
        let inScope = true;
        const mustPassIdxs = [];
        for (const k of cells) {
            if (outOfScope.has(k)) { inScope = false; break; }
            const idx = level.mustPassKeys.indexOf(k);
            if (idx >= 0 && ((state.mustMask >> idx) & 1)) mustPassIdxs.push(idx);
        }
        if (!inScope || mustPassIdxs.length === 0) continue;
        result.push({ gateway, cells, mustPassIdxs });
    }
    return result;
}

const encode = (steps, ints) => steps * 4096 + ints;
export const decodeSpectrumEntry = (e) => ({ steps: Math.floor(e / 4096), ints: e % 4096 });

/**
 * Exhaustively enumerates every closed excursion from `chamber.gateway` back to itself that stays
 * within the chamber's interior, using the REAL search-state primitives (getNeighbors/applyMove/
 * undoMove) so edge-usage/turn/intersection legality exactly matches production — this is why the
 * function mutates and restores `state` in place rather than reimplementing move rules (see
 * CLAUDE.md's "leaving along a used axis is legal when going straight" gotcha for why hand-rolling
 * this kind of check is the single most repeat-offending trap in this codebase).
 *
 * Only records an excursion once EVERY must-pass cell that was pending in the chamber at entry has
 * been visited (see file doc's "single covering excursion" simplification: a chamber that needs
 * two separate dips to cover all its obligations is out of scope for this prototype — see the
 * design doc's soundness note on why that's a coverage gap, not an unsoundness).
 *
 * `truncated: true` means the node/step caps were hit before enumeration completed — the caller
 * MUST treat this chamber's spectrum as unknown (abstain), not as the complete achievable set,
 * or a reject built on it could be unsound.
 */
export function enumerateChamberSpectrum({ chamber, level, prep, state, maxSteps, nodeCap = 50000 }) {
    const { gateway, cells, mustPassIdxs } = chamber;
    const mandatoryMask = mustPassIdxs.reduce((m, i) => m | (1 << i), 0);
    const allowedSet = new Set(cells);
    allowedSet.add(gateway);

    const startLen = getRealLengthFromState(state);
    const startInts = state.ints;
    const startPendingMandatory = state.mustMask & mandatoryMask;

    const spectrum = new Set();
    let truncated = false;
    let nodeCount = 0;

    function visit(cur, depthSteps) {
        if (truncated) return;
        nodeCount++;
        if (nodeCount > nodeCap) { truncated = true; return; }
        if (cur === gateway && depthSteps > 0) {
            const stillPending = state.mustMask & mandatoryMask;
            if (stillPending === 0) {
                spectrum.add(encode(getRealLengthFromState(state) - startLen, state.ints - startInts));
            }
        }
        if (depthSteps >= maxSteps) return;
        const candidates = getNeighbors(cur, state, level, prep).filter((k) => allowedSet.has(k));
        for (const next of candidates) {
            const undo = applyMove(next, state, level, prep, false);
            visit(next, depthSteps + 1);
            undoMove(undo, state);
            if (truncated) return;
        }
    }

    if (startPendingMandatory !== 0) visit(gateway, 0);
    return { spectrum, truncated, gateway, mandatoryMask };
}

/**
 * Bitset convolution (Pathfinder's resource dimensions are small enough that a Set works fine)
 * combining several chambers' "must cover this chamber's obligations in one excursion" spectra
 * into the set of achievable (total steps, total intersections) pairs across ALL of them —
 * i.e. one entry per chamber is mandatory-consumed exactly once (see design doc for why multiple
 * excursions into the same chamber are out of scope here).
 */
export function convolveSpectra(spectra) {
    let combined = new Set([encode(0, 0)]);
    for (const spec of spectra) {
        const next = new Set();
        for (const e1 of combined) {
            const a = decodeSpectrumEntry(e1);
            for (const e2 of spec) {
                const b = decodeSpectrumEntry(e2);
                next.add(encode(a.steps + b.steps, a.ints + b.ints));
            }
        }
        combined = next;
    }
    return combined;
}
