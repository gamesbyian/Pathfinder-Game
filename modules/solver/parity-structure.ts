import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';

export interface PortalParityPair {
    a: number;
    b: number;
    twist: boolean;
}

export type GateParityDemand = 'no-gates' | 'all-even' | 'all-odd' | 'mixed';

export interface GateRequiredTwistParity {
    gateKey: number;
    requiredTwistParity: 0 | 1;
}

export interface StaticParityStructure {
    portalPairs: PortalParityPair[];
    twistPortalPairs: PortalParityPair[];
    sameParityPortalPairs: PortalParityPair[];
    gateRequiredTwistParity: GateRequiredTwistParity[];
    gateDemand: GateParityDemand;
}

/**
 * Static current-input parity/portal structure shared by production prep and offline research.
 *
 * A portal pair is a "twist" when its endpoints have opposite checkerboard parity. Orthogonal
 * counted moves flip checkerboard parity; a zero-cost twist jump contributes one extra parity flip.
 * Therefore a gate's required twist-jump parity for an exact-length completion is:
 *
 *   parity(gate) XOR parity(goal) XOR (requiredLength mod 2)
 *
 * This module owns only level facts. It does not decide reachability, availability of a future
 * portal jump, or whether a level is solvable.
 */
export function describeStaticParityStructure(level: NormalizedLevel): StaticParityStructure {
    const portalPairs: PortalParityPair[] = [];
    const seen = new Set<string>();
    for (const [a, info] of level.portalMap.entries()) {
        const b = info.dest;
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const id = `${lo}:${hi}`;
        if (seen.has(id)) continue;
        seen.add(id);
        portalPairs.push({ a, b, twist: keyParity(a) !== keyParity(b) });
    }

    const gateRequiredTwistParity: GateRequiredTwistParity[] = level.gateKeys.map(gateKey => ({
        gateKey,
        requiredTwistParity: (keyParity(gateKey) ^ keyParity(level.goalKey) ^ (level.requiredLength & 1)) as 0 | 1,
    }));

    const demands = new Set(gateRequiredTwistParity.map(row => row.requiredTwistParity));
    let gateDemand: GateParityDemand = 'no-gates';
    if (demands.size === 1) gateDemand = demands.has(0) ? 'all-even' : 'all-odd';
    else if (demands.size > 1) gateDemand = 'mixed';

    return {
        portalPairs,
        twistPortalPairs: portalPairs.filter(pair => pair.twist),
        sameParityPortalPairs: portalPairs.filter(pair => !pair.twist),
        gateRequiredTwistParity,
        gateDemand,
    };
}
