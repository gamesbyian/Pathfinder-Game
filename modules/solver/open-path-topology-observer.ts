/**
 * Research-only Class-5 open-path topology observer. This module does not route search.
 * It integrates d(arg) along the prefix itself; it never invents an endpoint-to-start closure and
 * never rounds an open-path phase to an integer winding number.
 */
import type { NormalizedLevel } from '../domain/types.js';
import { prepLevel } from './prep.js';

const TAU = 2 * Math.PI;
export interface OpenPathPhaseCoordinate {
    punctureKey: number;
    /** Continuous integral along the open prefix, in turns. Deliberately non-integer. */
    phaseTurns: number;
    /** Lifted start/end arguments under the declared branch convention, in turns. */
    liftedStartTurns: number;
    liftedEndTurns: number;
}
export interface OpenPathTopologyObservation {
    schemaVersion: 1;
    endpointKey: number;
    endpointGeometryKey: string;
    referenceSetIdentity: string;
    branchCutTurns: number;
    phases: OpenPathPhaseCoordinate[];
    portalExcluded: boolean;
}

function angleOnBranch(angle: number, branchCutRadians: number): number {
    let lifted = angle;
    while (lifted < branchCutRadians) lifted += TAU;
    while (lifted >= branchCutRadians + TAU) lifted -= TAU;
    return lifted;
}

function point(key: number): readonly [number, number] {
    return [(key & 0xffff) + 0.5, (key >>> 16) + 0.5];
}

/** Board-derived punctures only: permanently unavailable block/goose/dead-flipper cells. */
export function deterministicTopologyPunctures(level: NormalizedLevel): number[] {
    const deadFlipperKeys = prepLevel(level).deadFlipperKeys;
    return [...new Set([...level.blockSet, ...level.gooseSet, ...deadFlipperKeys])].sort((a, b) => a - b);
}

function isPortalJump(level: NormalizedLevel, from: number, to: number): boolean {
    return level.portalMap.get(from)?.dest === to || level.portalMap.get(to)?.dest === from;
}

/**
 * Observe a current path using only board geometry and the path supplied by the current state.
 * `branchCutTurns` exists to test/declare gauge behavior; production observers use the deterministic
 * zero convention. It changes lifted absolute coordinates only, never the integrated phase.
 */
function observeWithBranch(
    level: NormalizedLevel,
    path: readonly number[],
    branchCutTurns = 0,
): OpenPathTopologyObservation {
    if (path.length === 0) throw new Error('open-path topology requires a non-empty current path');
    if (!Number.isFinite(branchCutTurns)) throw new Error('branch cut must be finite');
    const punctures = deterministicTopologyPunctures(level);
    const portalExcluded = path.slice(1).some((key, index) => isPortalJump(level, path[index], key));
    const endpointKey = path.at(-1)!;
    const endpoint = point(endpointKey);
    const referenceSetIdentity = `board-obstacles-v1:${punctures.join(',')}`;
    const endpointGeometryKey = `${endpointKey}|${punctures.map(key => {
        const p = point(key); return `${endpoint[0] - p[0]},${endpoint[1] - p[1]}`;
    }).join(';')}`;
    if (portalExcluded) return { schemaVersion: 1, endpointKey, endpointGeometryKey, referenceSetIdentity, branchCutTurns, phases: [], portalExcluded };
    const branch = branchCutTurns * TAU;
    const phases = punctures.map((punctureKey): OpenPathPhaseCoordinate => {
        const puncture = point(punctureKey);
        const start = point(path[0]);
        const startAngle = Math.atan2(start[1] - puncture[1], start[0] - puncture[0]);
        let angularChange = 0;
        for (let index = 1; index < path.length; index++) {
            const a = point(path[index - 1]);
            const b = point(path[index]);
            const ax = a[0] - puncture[0], ay = a[1] - puncture[1];
            const bx = b[0] - puncture[0], by = b[1] - puncture[1];
            if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) throw new Error(`path intersects topology puncture ${punctureKey}`);
            angularChange += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        }
        const liftedStart = angleOnBranch(startAngle, branch);
        return {
            punctureKey,
            phaseTurns: angularChange / TAU,
            liftedStartTurns: liftedStart / TAU,
            liftedEndTurns: (liftedStart + angularChange) / TAU,
        };
    });
    return { schemaVersion: 1, endpointKey, endpointGeometryKey, referenceSetIdentity, branchCutTurns, phases, portalExcluded };
}

/** Runtime-safe entry: the branch convention is fixed and contains no caller/history input. */
export function observeOpenPathTopology(level: NormalizedLevel, path: readonly number[]): OpenPathTopologyObservation {
    return observeWithBranch(level, path, 0);
}

/** Test/research comparison only: demonstrates the declared gauge transformation. Never routing. */
export function observeOpenPathTopologyGaugeFixture(level: NormalizedLevel, path: readonly number[], branchCutTurns: number): OpenPathTopologyObservation {
    return observeWithBranch(level, path, branchCutTurns);
}
