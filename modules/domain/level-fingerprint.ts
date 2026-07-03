// Canonical fingerprinting for level deduplication.
// Fingerprints are version-stable: the same level structure always produces
// the same fingerprint regardless of field insertion order or hints content.

import { baseLandmarkRole, resolveLandmarkTurn } from './landmark-rules.js';

export const LEVEL_FINGERPRINT_VERSION = 2;

interface Coord { x: number; y: number; }

type FingerprintLandmark = Coord & { objectType: string; role: string; turn?: string };

function normalizeFingerprintCoord(coord: any): Coord {
    return { x: Number(coord?.x || 0), y: Number(coord?.y || 0) };
}

function coordKey(coord: Coord): string {
    return `${coord.x},${coord.y}`;
}

function compareCoords(a: Coord, b: Coord): number {
    return (a.y - b.y) || (a.x - b.x);
}

function sortFingerprintCoords(coords: any): Coord[] {
    return (Array.isArray(coords) ? coords : [])
        .map(normalizeFingerprintCoord)
        .sort(compareCoords);
}

function sortFingerprintAxisCoords(coords: any): (Coord & { axis: string })[] {
    return (Array.isArray(coords) ? coords : [])
        .map((item: any) => ({ ...normalizeFingerprintCoord(item), axis: String(item?.axis || '') }))
        .sort((a, b) => compareCoords(a, b) || a.axis.localeCompare(b.axis));
}

function sortFingerprintPortals(portals: any): { x1: number; y1: number; x2: number; y2: number }[] {
    return (Array.isArray(portals) ? portals : [])
        .map((portal: any) => {
            const a = normalizeFingerprintCoord({ x: portal?.x1, y: portal?.y1 });
            const b = normalizeFingerprintCoord({ x: portal?.x2, y: portal?.y2 });
            const pair = compareCoords(a, b) <= 0 ? [a, b] : [b, a];
            return { x1: pair[0].x, y1: pair[0].y, x2: pair[1].x, y2: pair[1].y };
        })
        .sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1) || (a.y2 - b.y2) || (a.x2 - b.x2));
}

function normalizeFingerprintLandmark(item: any): FingerprintLandmark | null {
    if (!item || !item.role) return null;
    const role = baseLandmarkRole(String(item.role));
    const out: FingerprintLandmark = {
        ...normalizeFingerprintCoord(item),
        objectType: String(item.objectType || ''),
        role,
    };
    if (role === 'mustTurn' || role === 'adjacentTurn') {
        const turn = resolveLandmarkTurn(String(item.role), item.turn);
        if (turn) out.turn = turn;
    }
    return out;
}

function sortFingerprintLandmarks(items: any): FingerprintLandmark[] {
    return (Array.isArray(items) ? items : [])
        .map(normalizeFingerprintLandmark)
        .filter((item): item is FingerprintLandmark => !!item)
        .sort((a, b) =>
            compareCoords(a, b) ||
            a.objectType.localeCompare(b.objectType) ||
            a.role.localeCompare(b.role) ||
            String(a.turn || '').localeCompare(String(b.turn || ''))
        );
}

function landmarkDerivedCoordSets(landmarks: FingerprintLandmark[]): { blocks: Set<string>; mustPass: Set<string> } {
    const blocks = new Set<string>();
    const mustPass = new Set<string>();
    for (const lm of landmarks) {
        if (lm.role === 'mustPass' || lm.role === 'mustTurn') mustPass.add(coordKey(lm));
        else blocks.add(coordKey(lm));
    }
    return { blocks, mustPass };
}

function sortCoordsIgnoring(coords: any, ignored: Set<string>): Coord[] {
    return sortFingerprintCoords(coords).filter(coord => !ignored.has(coordKey(coord)));
}

function fallbackHashString(source: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < source.length; i++) {
        const ch = source.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const high = (h2 >>> 0).toString(16).padStart(8, '0');
    const low  = (h1 >>> 0).toString(16).padStart(8, '0');
    return `${high}${low}`;
}

export function canonicalLevelFingerprintPayload(levelData: any): object {
    const landmarks = sortFingerprintLandmarks(levelData?.landmarks);
    const derived = landmarkDerivedCoordSets(landmarks);
    return {
        version: LEVEL_FINGERPRINT_VERSION,
        grid: {
            w: Number(levelData?.grid?.w || 0),
            h: Number(levelData?.grid?.h || 0),
        },
        reqLen:          Number(levelData?.reqLen || 0),
        reqInt:          Number(levelData?.reqInt || 0),
        gates:           sortFingerprintCoords(levelData?.gates),
        goal:            levelData?.goal ? normalizeFingerprintCoord(levelData.goal) : null,
        falseGoals:      sortFingerprintCoords(levelData?.falseGoals),
        blocks:          sortCoordsIgnoring(levelData?.blocks, derived.blocks),
        mustPass:        sortCoordsIgnoring(levelData?.mustPass, derived.mustPass),
        mustCross:       sortFingerprintCoords(levelData?.mustCross),
        filters:         sortFingerprintAxisCoords(levelData?.filters),
        flippingFilters: sortFingerprintAxisCoords(levelData?.flippingFilters),
        portals:         sortFingerprintPortals(levelData?.portals),
        geese:           sortFingerprintCoords(levelData?.geese),
        landmarks,
    };
}

export function getLevelFingerprintSource(levelData: any): string {
    return JSON.stringify(canonicalLevelFingerprintPayload(levelData));
}

export async function getLevelFingerprint(levelData: any): Promise<string> {
    const source = getLevelFingerprintSource(levelData);
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
        const data = new TextEncoder().encode(source);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
        return `v${LEVEL_FINGERPRINT_VERSION}:${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }
    return `v${LEVEL_FINGERPRINT_VERSION}:fallback:${fallbackHashString(source)}`;
}

export function isSameLevelStructure(a: any, b: any): boolean {
    return getLevelFingerprintSource(a) === getLevelFingerprintSource(b);
}
