// Pure landmark mechanics shared by raw-level normalization (level-codec.ts,
// solver/normalization.js) and the editor's occupancy model
// (editor/editor-occupancy.js). A landmark is just another grid object;
// this is the single place that resolves its wire-format spelling
// (role suffix vs. separate `turn` field) into normalized level fields.

import type { TurnDir } from './level-schema.js';

/** The mutable subset of a level being built that landmark mechanics read/write. */
export interface LandmarkBuildLevel {
    blockSet: Set<number>;
    mustPassKeys: number[];
    mustPassTurnDirs: Map<number, TurnDir>;
    surroundKeys: number[];
    adjacentTurnKeys: number[];
    adjacentTurnDirs: TurnDir[];
    landmarkMeta: Map<number, { objectType: string; role: string }>;
}

// Per-objectType theme.colors key, shared by the canvas renderer (render/draw-assets.js,
// via the theme.colors object passed at render time) and the editor palette
// (input/editor-toolbar-controller.js, via the matching --theme-landmark-* CSS custom
// property) so a landmark's color is consistent everywhere it appears, and adapts to the
// active theme (see theme-engine.ts's deriveTokens) instead of being a fixed hex.
export const LANDMARK_COLOR_KEYS: Record<string, string> = {
    park:     'landmarkPark',
    market:   'landmarkMarket',
    library:  'landmarkLibrary',
    fountain: 'landmarkFountain',
    lamppost: 'landmarkLamppost',
    statue:   'landmarkStatue',
};

export function resolveLandmarkTurn(role: string, turn?: string): TurnDir {
    if (role === 'mustTurnCcw' || role === 'adjacentTurnCcw') return 'ccw';
    if (role === 'mustTurnCw' || role === 'adjacentTurnCw') return 'cw';
    if (turn === 'cw' || turn === 'ccw') return turn;
    return 'either';
}

export function baseLandmarkRole(role: string): string {
    if (role === 'mustTurnCw' || role === 'mustTurnCcw') return 'mustTurn';
    if (role === 'adjacentTurnCw' || role === 'adjacentTurnCcw') return 'adjacentTurn';
    return role;
}

/**
 * Flips a turn direction's chirality: 'cw' ↔ 'ccw', 'either' unchanged. A grid reflection
 * (mirror) reverses handedness, so any stored turn-direction requirement must flip when the
 * coordinate transform applied to a level is a reflection — a pure rotation preserves chirality
 * and must NOT flip it. Used by level-codec's remapLevelKeys (editor Rotate/Mirror, permanent)
 * and domain/geometry's transformTurnDir (play-mode orientation display, render-only).
 */
export function flipTurnDir(dir: TurnDir): TurnDir {
    return dir === 'cw' ? 'ccw' : dir === 'ccw' ? 'cw' : dir;
}

/**
 * Mutates `level` in place, applying one landmark's mechanical effect.
 * `level` must already have blockSet/mustPassKeys/mustPassTurnDirs/
 * surroundKeys/adjacentTurnKeys/adjacentTurnDirs/landmarkMeta initialized.
 */
export function applyLandmark(level: LandmarkBuildLevel, key: number, objectType: string, rawRole: string, turn?: string): void {
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

/** Inverse of applyLandmark. Returns false if `key` has no landmark. */
export function removeLandmark(level: LandmarkBuildLevel, key: number): boolean {
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
