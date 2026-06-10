// Canonical fingerprinting for level deduplication.
// Fingerprints are version-stable: the same level structure always produces
// the same fingerprint regardless of field insertion order or hints content.

function normalizeFingerprintCoord(coord) {
    return { x: Number(coord?.x || 0), y: Number(coord?.y || 0) };
}

function compareCoords(a, b) {
    return (a.y - b.y) || (a.x - b.x);
}

function sortFingerprintCoords(coords) {
    return (Array.isArray(coords) ? coords : [])
        .map(normalizeFingerprintCoord)
        .sort(compareCoords);
}

function sortFingerprintAxisCoords(coords) {
    return (Array.isArray(coords) ? coords : [])
        .map(item => ({ ...normalizeFingerprintCoord(item), axis: String(item?.axis || '') }))
        .sort((a, b) => compareCoords(a, b) || a.axis.localeCompare(b.axis));
}

function sortFingerprintPortals(portals) {
    return (Array.isArray(portals) ? portals : [])
        .map(portal => {
            const a = normalizeFingerprintCoord({ x: portal?.x1, y: portal?.y1 });
            const b = normalizeFingerprintCoord({ x: portal?.x2, y: portal?.y2 });
            const pair = compareCoords(a, b) <= 0 ? [a, b] : [b, a];
            return { x1: pair[0].x, y1: pair[0].y, x2: pair[1].x, y2: pair[1].y };
        })
        .sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1) || (a.y2 - b.y2) || (a.x2 - b.x2));
}

function fallbackHashString(source) {
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

export function canonicalLevelFingerprintPayload(levelData) {
    return {
        version: 1,
        grid: {
            w: Number(levelData?.grid?.w || 0),
            h: Number(levelData?.grid?.h || 0)
        },
        reqLen:          Number(levelData?.reqLen || 0),
        reqInt:          Number(levelData?.reqInt || 0),
        gates:           sortFingerprintCoords(levelData?.gates),
        goal:            levelData?.goal ? normalizeFingerprintCoord(levelData.goal) : null,
        falseGoals:      sortFingerprintCoords(levelData?.falseGoals),
        blocks:          sortFingerprintCoords(levelData?.blocks),
        mustPass:        sortFingerprintCoords(levelData?.mustPass),
        mustCross:       sortFingerprintCoords(levelData?.mustCross),
        filters:         sortFingerprintAxisCoords(levelData?.filters),
        flippingFilters: sortFingerprintAxisCoords(levelData?.flippingFilters),
        portals:         sortFingerprintPortals(levelData?.portals),
        geese:           sortFingerprintCoords(levelData?.geese)
    };
}

export function getLevelFingerprintSource(levelData) {
    return JSON.stringify(canonicalLevelFingerprintPayload(levelData));
}

export async function getLevelFingerprint(levelData) {
    const source = getLevelFingerprintSource(levelData);
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
        const data = new TextEncoder().encode(source);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
        return `v1:${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }
    return `v1:fallback:${fallbackHashString(source)}`;
}

export function isSameLevelStructure(a, b) {
    return getLevelFingerprintSource(a) === getLevelFingerprintSource(b);
}
