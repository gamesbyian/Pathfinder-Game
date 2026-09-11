import { describe, expect, it } from 'vitest';
import {
    analyzeDifficultyStratifiedRelativeAdvantage,
    assignDifficultyStrata,
} from './analyze-difficulty-stratified-relative-advantage.mjs';

const features = (x) => ({
    constrainedObjects: x,
    turnConstraintLoad: x,
    constrainedObjectDensity: x,
    requiredPathLength: x,
    portals: x,
    requiredPathCoverageRatio: x,
    mustTurn: x,
    surround: x,
    blocks: x,
    diagnostic: x % 2,
});

function row(id, x, solvingActions = []) {
    return { id, features: features(x), solvingActions };
}

describe('difficulty-stratified relative advantage', () => {
    it('assigns every row to one ordered burden stratum', () => {
        const rows = Array.from({ length: 20 }, (_, i) => row(`R${i}`, i));
        const strata = assignDifficultyStrata(rows, 4);
        expect(strata.map((s) => s.rows.length)).toEqual([5, 5, 5, 5]);
        expect(strata[0].maxScore).toBeLessThan(strata[3].minScore);
    });

    it('supports a reduced burden feature set for sensitivity checks', () => {
        const rows = Array.from({ length: 20 }, (_, i) => row(`R${i}`, i));
        const strata = assignDifficultyStrata(rows, 4, ['constrainedObjects', 'portals']);
        expect(strata.map((s) => s.rows.length)).toEqual([5, 5, 5, 5]);
    });

    it('recomputes frozen pair analyses and reports multiplicity context', () => {
        const left = 'admissible-order|tieBreak=default|lds=off';
        const right = 'admissible-order|tieBreak=mustCrossFirst|lds=off';
        const unrelated = 'dfs|score=default|bias=none';
        const rows = [];
        for (let i = 0; i < 40; i++) {
            const actions = i % 4 < 2 ? [left] : [right, unrelated];
            rows.push(row(`R${i}`, i, actions));
        }
        const base = { schemaVersion: 2, levels: rows };
        const result = analyzeDifficultyStratifiedRelativeAdvantage(base, {
            stratumCount: 2,
            difficultyFeatures: ['constrainedObjects', 'portals'],
            minExclusivePerSide: 2,
        });
        expect(result.stratumCount).toBe(2);
        expect(result.pairs).toHaveLength(8);
        expect(result.pairs[0].eligibleStrata).toBe(2);
        expect(result.burdenScore.features).toEqual(['constrainedObjects', 'portals']);
        expect(result.pairs[0].multiplicityContext.leftOnly.meanSolverCount).toBe(1);
        expect(result.pairs[0].multiplicityContext.rightOnly.meanSolverCount).toBe(2);
    });
});
