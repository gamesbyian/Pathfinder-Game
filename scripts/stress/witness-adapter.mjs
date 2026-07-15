// Adapts an EXISTING level's already-known witness path (a hint or a stress level's
// stressMeta.witnessSolution) into the witness-object shape scripts/stress/witness.mjs's
// buildRawLevel/validateWitnessOnRaw/witnessCellData expect ({path, jumps, portalPairs, reqLen,
// reqInt, startKey, goalKey, w, h}). witness.mjs itself only builds this shape from a fresh
// random walk (generateWitness) — this is the missing "existing level + path -> witness object"
// direction, needed so the sibling/cousin generator can preserve a REAL witness instead of
// inventing a new one.
import { PACK, UNPACK } from '../../modules/domain/cell-key.js';

function isGridAdjacent(aKey, bKey) {
    const a = UNPACK(aKey), b = UNPACK(bKey);
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * @param rawLevel  1-based wire-format level (the parent level, unmodified).
 * @param path      packed-key path (0-indexed), e.g. a stored hint's `.path` or a stress level's
 *                  `stressMeta.witnessSolution` converted to packed keys.
 * Returns a witness object, or throws if `path` contains a step that's neither grid-adjacent nor
 * a portal jump the level's own `portals` array actually supports (a malformed/foreign path).
 * reqLen/reqInt are taken directly from `rawLevel` rather than re-derived from the path, since an
 * exact-witness sibling's whole point is to preserve them unchanged — recomputing them here would
 * risk re-deriving the game's intersection-counting rule (a documented source of past bugs)
 * instead of trusting the value the parent level already carries and was validated against.
 */
export function witnessFromLevelAndPath(rawLevel, path) {
    if (!Array.isArray(path) || path.length < 2) {
        throw new Error('witnessFromLevelAndPath: path must have at least 2 nodes');
    }
    const w = rawLevel.grid.w, h = rawLevel.grid.h;
    const startKey = path[0];
    const goalKey = path[path.length - 1];

    const portalLookup = new Map(); // fromKey -> toKey, both directions
    for (const p of (rawLevel.portals || [])) {
        const a = PACK(p.x1 - 1, p.y1 - 1);
        const b = PACK(p.x2 - 1, p.y2 - 1);
        portalLookup.set(a, b);
        portalLookup.set(b, a);
    }

    const jumps = new Set();
    const portalPairs = [];
    const seenPairs = new Set();
    for (let i = 1; i < path.length; i++) {
        const from = path[i - 1], to = path[i];
        if (isGridAdjacent(from, to)) continue;
        if (portalLookup.get(from) !== to) {
            throw new Error(
                `witnessFromLevelAndPath: step ${i - 1}->${i} (${from}->${to}) is neither ` +
                'grid-adjacent nor a known portal jump on this level'
            );
        }
        jumps.add(i);
        const pairKey = from < to ? `${from}:${to}` : `${to}:${from}`;
        if (!seenPairs.has(pairKey)) { seenPairs.add(pairKey); portalPairs.push({ a: from, b: to }); }
    }

    return { path, jumps, portalPairs, reqLen: rawLevel.reqLen, reqInt: rawLevel.reqInt, startKey, goalKey, w, h };
}
