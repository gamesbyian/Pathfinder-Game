// Residual block-cut decomposition for separator/chamber probes.
// A chamber is a pendant residual component reachable through one gateway. Report only small
// chambers containing pending must-pass obligations and no goal/gate/portal/filter/flipper/
// must-cross/turn-obligation cells. The DFS root is an articulation split only with 2+ children.
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

/** Find in-scope pendant chambers up to `maxChamberSize`; `cells` excludes the gateway. */
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

/** Enumerate closed gateway-to-gateway excursions with real move state. Record only excursions
 * covering all chamber must-pass obligations. `truncated` means the spectrum is incomplete and
 * callers must abstain from rejection. */
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

/** Convolve mandatory one-excursion-per-chamber spectra into achievable total (steps, ints) pairs. */
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
