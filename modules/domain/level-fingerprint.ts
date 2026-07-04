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

// ─── Legacy fingerprint algorithms (frozen; read-only migration support) ───────────────────
//
// Any document keyed by a fingerprint computed under an OLDER LEVEL_FINGERPRINT_VERSION
// (e.g. a dev-mode level rating saved before a fingerprint-algorithm change) becomes
// permanently unreachable the moment the running code only ever computes the CURRENT
// version's key. These frozen functions let a caller reconstruct an older version's key to
// look up — and migrate forward — data written under it.
//
// Each block below is a self-contained snapshot: it does NOT call the "live" helpers above
// (normalizeFingerprintCoord/sortFingerprintCoords/etc.), even though those happen to compute
// the same thing today. That isolation is deliberate — a future edit to a live helper (made
// to support a v3 payload's needs) must never have the side effect of silently changing what
// an OLDER version computes, or its persisted keys stop resolving.
//
// On every future LEVEL_FINGERPRINT_VERSION bump: (1) leave every block below untouched: (2)
// snapshot the CURRENT (about-to-be-superseded) live payload/hash logic into a new frozen
// `*V{N}` block here; (3) add its calculator to LEGACY_FINGERPRINT_CALCULATORS. Never edit an
// existing frozen block after it ships — that is the one mistake that makes its keys unrecoverable.

// v1 — the fingerprint algorithm before the 2026-07-03 landmark-aware fingerprinting change
// (see docs/landmark-submission-serialization-plan.md): no `landmarks` field, and blocks/
// mustPass were not filtered against landmark-derived coordinates.
function legacyCoordV1(coord: any): Coord {
    return { x: Number(coord?.x || 0), y: Number(coord?.y || 0) };
}
function legacyCompareCoordsV1(a: Coord, b: Coord): number {
    return (a.y - b.y) || (a.x - b.x);
}
function legacySortCoordsV1(coords: any): Coord[] {
    return (Array.isArray(coords) ? coords : []).map(legacyCoordV1).sort(legacyCompareCoordsV1);
}
function legacySortAxisCoordsV1(coords: any): (Coord & { axis: string })[] {
    return (Array.isArray(coords) ? coords : [])
        .map((item: any) => ({ ...legacyCoordV1(item), axis: String(item?.axis || '') }))
        .sort((a, b) => legacyCompareCoordsV1(a, b) || a.axis.localeCompare(b.axis));
}
function legacySortPortalsV1(portals: any): { x1: number; y1: number; x2: number; y2: number }[] {
    return (Array.isArray(portals) ? portals : [])
        .map((portal: any) => {
            const a = legacyCoordV1({ x: portal?.x1, y: portal?.y1 });
            const b = legacyCoordV1({ x: portal?.x2, y: portal?.y2 });
            const pair = legacyCompareCoordsV1(a, b) <= 0 ? [a, b] : [b, a];
            return { x1: pair[0].x, y1: pair[0].y, x2: pair[1].x, y2: pair[1].y };
        })
        .sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1) || (a.y2 - b.y2) || (a.x2 - b.x2));
}
function legacyFallbackHashV1(source: string): string {
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
function canonicalLevelFingerprintPayloadV1(levelData: any): object {
    return {
        version: 1,
        grid: { w: Number(levelData?.grid?.w || 0), h: Number(levelData?.grid?.h || 0) },
        reqLen:          Number(levelData?.reqLen || 0),
        reqInt:          Number(levelData?.reqInt || 0),
        gates:           legacySortCoordsV1(levelData?.gates),
        goal:            levelData?.goal ? legacyCoordV1(levelData.goal) : null,
        falseGoals:      legacySortCoordsV1(levelData?.falseGoals),
        blocks:          legacySortCoordsV1(levelData?.blocks),
        mustPass:        legacySortCoordsV1(levelData?.mustPass),
        mustCross:       legacySortCoordsV1(levelData?.mustCross),
        filters:         legacySortAxisCoordsV1(levelData?.filters),
        flippingFilters: legacySortAxisCoordsV1(levelData?.flippingFilters),
        portals:         legacySortPortalsV1(levelData?.portals),
        geese:           legacySortCoordsV1(levelData?.geese),
    };
}
async function getLevelFingerprintV1(levelData: any): Promise<string> {
    const source = JSON.stringify(canonicalLevelFingerprintPayloadV1(levelData));
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
        const data = new TextEncoder().encode(source);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
        return `v1:${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }
    return `v1:fallback:${legacyFallbackHashV1(source)}`;
}

// Ordered oldest→newest, EXCLUDING the current version (callers already have that key from
// getLevelFingerprint). Add the next entry here — never edit an existing one — on each future
// LEVEL_FINGERPRINT_VERSION bump.
const LEGACY_FINGERPRINT_CALCULATORS: ReadonlyArray<(levelData: any) => Promise<string>> = [
    getLevelFingerprintV1,
];

/**
 * All fingerprint keys a level could have been persisted under by an OLDER version of the
 * app, oldest first. Only meaningful as a fallback: try the CURRENT fingerprint
 * (getLevelFingerprint) first, and only consult this when that lookup misses.
 */
export async function getLegacyLevelFingerprints(levelData: any): Promise<string[]> {
    return Promise.all(LEGACY_FINGERPRINT_CALCULATORS.map((fn) => fn(levelData)));
}
