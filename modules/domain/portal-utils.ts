import { UNPACK } from './cell-key.js';
import type { NormalizedLevel, PortalExit } from './types.js';

const PORTAL_PAIR_PALETTE = [
    '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4',
    '#84cc16', '#f43f5e', '#14b8a6', '#eab308', '#6366f1', '#ec4899',
];

export const resolvePortal = (level: NormalizedLevel | undefined, key: number): PortalExit | null =>
    level?.portalMap?.has(key) ? (level.portalMap.get(key) ?? null) : null;

/** @returns pair index or -1 */
export const getPortalPairIndex = (level: NormalizedLevel | undefined, key: number): number => {
    if (!level?.portalVisuals?.length) return -1;
    return level.portalVisuals.findIndex(pv => pv.k1 === key || pv.k2 === key);
};

export const getPortalDisplayColor = (level: NormalizedLevel | undefined, key: number, fallback = '#d946ef'): string => {
    const idx = getPortalPairIndex(level, key);
    if (idx < 0) return fallback;
    return PORTAL_PAIR_PALETTE[idx % PORTAL_PAIR_PALETTE.length];
};

export const expCoords = (items: Iterable<number> | number[]): { x: number; y: number }[] =>
    (Array.isArray(items) ? items : Array.from(items))
        .map(k => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; });

export const hasParitySwitchingPortal = (level: NormalizedLevel | undefined): boolean =>
    Array.isArray(level?.portalVisuals) &&
    level.portalVisuals.some(pv => {
        const p1 = UNPACK(pv.k1), p2 = UNPACK(pv.k2);
        return ((p1.x + p1.y) % 2) !== ((p2.x + p2.y) % 2);
    });

export const getParityInvalidKeys = (
    level: NormalizedLevel | undefined,
    reqLenOverride: number | null = null,
): { gates: Set<number>; portals: Set<number>; hasParitySwitch: boolean; targetParity: number | null } => {
    const out = {
        gates: new Set<number>(),
        portals: new Set<number>(),
        hasParitySwitch: hasParitySwitchingPortal(level),
        targetParity: null as number | null,
    };
    if (!level || level.goalKey === -1 || level.goalKey === undefined) return out;
    const requiredLength = (reqLenOverride === null || reqLenOverride === undefined)
        ? Number(level.requiredLength || 0)
        : Number(reqLenOverride || 0);
    if (!requiredLength || out.hasParitySwitch) return out;
    const gp = UNPACK(level.goalKey);
    out.targetParity = (gp.x + gp.y + requiredLength) % 2;
    (level.gateKeys || []).forEach(k => {
        const p = UNPACK(k);
        if ((p.x + p.y) % 2 !== out.targetParity) out.gates.add(k);
    });
    (level.portalVisuals || []).forEach(pv =>
        [pv.k1, pv.k2].forEach(k => {
            const p = UNPACK(k);
            if ((p.x + p.y) % 2 !== out.targetParity) out.portals.add(k);
        }),
    );
    return out;
};
