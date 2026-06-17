// Pure landmark mechanics shared by raw-level normalization (level-codec.js,
// solver/normalization.js) and the editor's occupancy model
// (editor/editor-occupancy.js). A landmark is just another grid object;
// this is the single place that resolves its wire-format spelling
// (role suffix vs. separate `turn` field) into normalized level fields.

// Per-objectType display color, shared by the canvas renderer
// (render/draw-assets.js) and the editor palette (input/editor-toolbar-controller.js)
// so a landmark's color is consistent everywhere it appears.
export const LANDMARK_COLORS = {
    park:     '#15803d',
    market:   '#c2410c',
    library:  '#1d4ed8',
    fountain: '#0e7490',
    lamppost: '#a16207',
    statue:   '#52525b',
};

export function resolveLandmarkTurn(role, turn) {
    if (role === 'mustTurnLeft' || role === 'adjacentTurnLeft') return 'left';
    if (role === 'mustTurnRight' || role === 'adjacentTurnRight') return 'right';
    if (turn === 'left' || turn === 'right') return turn;
    return 'either';
}

export function baseLandmarkRole(role) {
    if (role === 'mustTurnLeft' || role === 'mustTurnRight') return 'mustTurn';
    if (role === 'adjacentTurnLeft' || role === 'adjacentTurnRight') return 'adjacentTurn';
    return role;
}

/**
 * Mutates `level` in place, applying one landmark's mechanical effect.
 * `level` must already have blockSet/mustPassKeys/mustPassTurnDirs/
 * surroundKeys/adjacentTurnKeys/adjacentTurnDirs/landmarkMeta initialized.
 */
export function applyLandmark(level, key, objectType, rawRole, turn) {
    const role = baseLandmarkRole(rawRole);
    const turnDir = resolveLandmarkTurn(rawRole, turn);
    level.landmarkMeta.set(key, { objectType, role });
    switch (role) {
        case 'surround':
            level.surroundKeys.push(key);
            level.blockSet.add(key);
            break;
        case 'mustPass':
            if (!level.mustPassKeys.includes(key)) level.mustPassKeys.push(key);
            break;
        case 'mustTurn':
            if (!level.mustPassKeys.includes(key)) level.mustPassKeys.push(key);
            level.mustPassTurnDirs.set(key, turnDir);
            break;
        case 'adjacentTurn':
            level.adjacentTurnKeys.push(key);
            level.adjacentTurnDirs.push(turnDir);
            level.blockSet.add(key);
            break;
        case 'decorative':
        default:
            level.blockSet.add(key);
            break;
    }
}

/**
 * Inverse of applyLandmark. Returns false if `key` has no landmark.
 */
export function removeLandmark(level, key) {
    if (!level.landmarkMeta?.has(key)) return false;
    level.landmarkMeta.delete(key);
    level.blockSet.delete(key);
    level.surroundKeys = (level.surroundKeys || []).filter(k => k !== key);
    const atIdx = (level.adjacentTurnKeys || []).indexOf(key);
    if (atIdx !== -1) {
        level.adjacentTurnKeys = level.adjacentTurnKeys.filter((_, i) => i !== atIdx);
        level.adjacentTurnDirs = (level.adjacentTurnDirs || []).filter((_, i) => i !== atIdx);
    }
    level.mustPassKeys = (level.mustPassKeys || []).filter(k => k !== key);
    level.mustPassTurnDirs?.delete(key);
    return true;
}
