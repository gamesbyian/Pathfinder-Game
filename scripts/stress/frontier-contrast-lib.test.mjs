import { describe, expect, it } from 'vitest';

import { binaryContrast, buildFrontierContrast, numericEffect } from './frontier-contrast-lib.mjs';

function row({ area, portals = 0, mustCross = 0, routingRegime = 'general', work = 0, bucket = null, technique = null }) {
    return {
        routingRegime,
        staticFeatures: {
            w: 10,
            h: 10,
            area,
            aspect: 1,
            reqLen: 20,
            reqInt: 2,
            requiredPathCoverageRatio: 0.2,
            gates: 1,
            blocks: 0,
            mustPass: 0,
            mustCross,
            portalPairs: portals,
            flippers: 0,
            staticFilters: 0,
            geese: 0,
            falseGoals: 0,
            surround: 0,
            mustTurn: 0,
            adjTurn: 0,
        },
        productionNodes: work * 10,
        productionWork: work,
        productionAttemptCount: 2,
        bucket,
        bestBadnessTechnique: technique,
    };
}

describe('frontier contrast helpers', () => {
    it('reports numeric effects in frontier-minus-control direction', () => {
        const effect = numericEffect([{ x: 1 }, { x: 3 }], [{ x: 5 }, { x: 7 }], item => item.x, 'x');
        expect(effect.controlMean).toBe(2);
        expect(effect.frontierMean).toBe(6);
        expect(effect.standardizedDifference).toBeGreaterThan(0);
    });

    it('reports binary rate differences and continuity-corrected odds ratios', () => {
        const effect = binaryContrast(
            [{ yes: true }, { yes: false }],
            [{ yes: true }, { yes: true }],
            item => item.yes,
            'yes',
        );
        expect(effect.controlRate).toBe(0.5);
        expect(effect.frontierRate).toBe(1);
        expect(effect.rateDifference).toBe(0.5);
        expect(effect.continuityCorrected).toBe(true);
        expect(Number.isFinite(effect.oddsRatioFrontierVsControl)).toBe(true);
        expect(effect.oddsRatioFrontierVsControl).toBeGreaterThan(1);
    });

    it('builds static, routing, telemetry, and category outputs', () => {
        const control = [
            row({ area: 100, portals: 1, mustCross: 1, routingRegime: 'multi-portal', work: 10, bucket: 'a', technique: 'repair' }),
            row({ area: 120, portals: 1, routingRegime: 'intersection-heavy', work: 20, bucket: 'a', technique: 'beam' }),
        ];
        const frontier = [
            row({ area: 160, portals: 0, mustCross: 1, routingRegime: 'intersection-heavy', work: 30, bucket: 'b', technique: 'beam' }),
            row({ area: 180, portals: 0, routingRegime: 'intersection-heavy', work: 40, bucket: 'b', technique: 'beam' }),
        ];
        const result = buildFrontierContrast(control, frontier, 'class 4');

        expect(result.controlN).toBe(2);
        expect(result.frontierN).toBe(2);
        expect(result.staticNumericEffects.find(effect => effect.feature === 'area').standardizedDifference).toBeGreaterThan(0);
        expect(result.staticPresenceContrasts.find(effect => effect.feature === 'portalBearing').rateDifference).toBe(-1);
        expect(result.routingRegimeContrasts.find(effect => effect.feature === 'intersection-heavy').rateDifference).toBe(0.5);
        expect(result.productionTelemetryEffects.find(effect => effect.feature === 'productionWork').standardizedDifference).toBeGreaterThan(0);
        expect(result.lifecycleBucketCounts).toEqual({ control: { a: 2 }, frontier: { b: 2 } });
        expect(result.bestBadnessTechniqueCounts).toEqual({ control: { beam: 1, repair: 1 }, frontier: { beam: 2 } });
    });
});
