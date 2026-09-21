import { UNPACK } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';

export interface SignedGeometrySummary {
    observations: number;
    left: number;
    right: number;
    onAxis: number;
    sideBalance: number;
    signedMoment: number;
    absoluteMoment: number;
}

export interface StaticOrientationStructure {
    gateCount: number;
    gateGoalDxMean: number;
    gateGoalDyMean: number;
    gateGoalCenterSideBalance: number;
    blocks: SignedGeometrySummary;
    mustPass: SignedGeometrySummary;
    mustCross: SignedGeometrySummary;
    portalTerminals: SignedGeometrySummary;
    flippers: SignedGeometrySummary;
    constrained: SignedGeometrySummary;
}

const emptySummary = (): SignedGeometrySummary => ({
    observations: 0,
    left: 0,
    right: 0,
    onAxis: 0,
    sideBalance: 0,
    signedMoment: 0,
    absoluteMoment: 0,
});

function summarizeRelativeToGateGoal(
    gateKeys: number[],
    goalKey: number,
    pointKeys: Iterable<number>,
    width: number,
    height: number,
): SignedGeometrySummary {
    const points = [...pointKeys];
    if (!gateKeys.length || !points.length) return emptySummary();

    let observations = 0;
    let left = 0;
    let right = 0;
    let onAxis = 0;
    let crossSum = 0;
    let absCrossSum = 0;
    const scale = Math.max(1, width * height);

    const goal = UNPACK(goalKey);
    for (const gateKey of gateKeys) {
        const gate = UNPACK(gateKey);
        const dx = goal.x - gate.x;
        const dy = goal.y - gate.y;
        for (const pointKey of points) {
            const point = UNPACK(pointKey);
            const px = point.x - gate.x;
            const py = point.y - gate.y;
            const cross = dx * py - dy * px;
            observations++;
            crossSum += cross;
            absCrossSum += Math.abs(cross);
            if (cross > 0) left++;
            else if (cross < 0) right++;
            else onAxis++;
        }
    }

    return {
        observations,
        left,
        right,
        onAxis,
        sideBalance: observations ? (left - right) / observations : 0,
        signedMoment: observations ? crossSum / (observations * scale) : 0,
        absoluteMoment: observations ? absCrossSum / (observations * scale) : 0,
    };
}

function portalTerminalKeys(level: NormalizedLevel): number[] {
    return [...level.portalMap.keys()].sort((a, b) => a - b);
}

/**
 * Static transformation-aware geometry relative to directed Gate→Goal axes.
 *
 * The signed quantities are pseudoscalars: an orientation-reversing reflection flips their sign
 * when the corresponding level objects are reflected, while rotations preserve the sign.
 * Absolute moments are reflection-invariant. These are legal current-input descriptors only;
 * they make no feasibility, difficulty, or routing claim.
 */
export function describeStaticOrientationStructure(level: NormalizedLevel): StaticOrientationStructure {
    const gates = level.gateKeys;
    const goal = UNPACK(level.goalKey);
    const gateVectors = gates.map(key => {
        const gate = UNPACK(key);
        return { dx: goal.x - gate.x, dy: goal.y - gate.y };
    });
    const centerX2 = level.grid.w - 1;
    const centerY2 = level.grid.h - 1;

    let centerLeft = 0;
    let centerRight = 0;
    for (const gateKey of gates) {
        const gate = UNPACK(gateKey);
        const dx2 = 2 * (goal.x - gate.x);
        const dy2 = 2 * (goal.y - gate.y);
        const px2 = centerX2 - 2 * gate.x;
        const py2 = centerY2 - 2 * gate.y;
        const cross = dx2 * py2 - dy2 * px2;
        if (cross > 0) centerLeft++;
        else if (cross < 0) centerRight++;
    }

    const portals = portalTerminalKeys(level);
    const flippers = [...level.flippingFilterMap.keys()];
    const constrained = new Set<number>([
        ...level.mustPassKeys,
        ...level.mustCrossKeys,
        ...portals,
        ...flippers,
        ...(level.surroundKeys ?? []),
        ...(level.adjacentTurnKeys ?? []),
    ]);

    return {
        gateCount: gates.length,
        gateGoalDxMean: gateVectors.length
            ? gateVectors.reduce((sum, row) => sum + row.dx, 0) / gateVectors.length
            : 0,
        gateGoalDyMean: gateVectors.length
            ? gateVectors.reduce((sum, row) => sum + row.dy, 0) / gateVectors.length
            : 0,
        gateGoalCenterSideBalance: gates.length ? (centerLeft - centerRight) / gates.length : 0,
        blocks: summarizeRelativeToGateGoal(gates, level.goalKey, level.blockSet, level.grid.w, level.grid.h),
        mustPass: summarizeRelativeToGateGoal(gates, level.goalKey, level.mustPassKeys, level.grid.w, level.grid.h),
        mustCross: summarizeRelativeToGateGoal(gates, level.goalKey, level.mustCrossKeys, level.grid.w, level.grid.h),
        portalTerminals: summarizeRelativeToGateGoal(gates, level.goalKey, portals, level.grid.w, level.grid.h),
        flippers: summarizeRelativeToGateGoal(gates, level.goalKey, flippers, level.grid.w, level.grid.h),
        constrained: summarizeRelativeToGateGoal(gates, level.goalKey, constrained, level.grid.w, level.grid.h),
    };
}
