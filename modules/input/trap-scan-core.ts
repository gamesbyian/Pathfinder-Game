// Pure helpers for the background trap scan (DOM-free, unit-tested).

import { PACK } from '../domain/cell-key.js';
import { getOccupant } from '../editor/editor-occupancy.js';
import { isParityReachableEndpoint } from '../solver/trap-search.js';

/**
 * Cells that could possibly be trap-spot endpoints by the cheap parity test:
 * empty cells (or already-placed false goals) whose parity matches some gate's
 * endpoint parity for the level's reqLen. This is a sound over-approximation of
 * the trap search's spot set — it only rules cells OUT — so the editor can paint
 * it instantly as "not ruled out yet" while the real scan streams confirmations.
 */
export function computeParityCandidates(level: any): Set<number> {
    const out = new Set<number>();
    for (let y = 0; y < level.grid.h; y++) {
        for (let x = 0; x < level.grid.w; x++) {
            const k = PACK(x, y);
            const occ = getOccupant(level, k);
            if (occ && occ.type !== 'falseGoal') continue;
            if (isParityReachableEndpoint(level, k)) out.add(k);
        }
    }
    return out;
}
