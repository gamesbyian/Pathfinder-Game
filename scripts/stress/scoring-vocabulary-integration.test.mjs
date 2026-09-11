import { describe, expect, it } from 'vitest';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import {
    BASIS_PROFILE_PREFIX,
    SCORING_WEIGHT_FIELDS,
    ZERO_PROFILE_ID,
    basisScoringProfiles,
    reconstructScore,
    scoreVectorFromBasisScores,
    zeroScoringProfile,
} from './scoring-vocabulary-lib.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, getNeighbors } = await import('../../modules/solver/search-state.js');
const { scoreAndSort } = await import('../../modules/solver/scoring.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');

function rankingMap(record, policyId) {
    const ranking = record.rankings.find(row => row.policyId === policyId);
    return new Map(ranking.order.map((candidate, index) => [candidate, ranking.scores[index]]));
}

describe('scoring vocabulary basis against real scoreMove', () => {
    it('reconstructs the active profile exactly on a real sibling set', () => {
        const level = normalizeRawLevel({
            grid: { w: 5, h: 5 },
            gates: [{ x: 1, y: 3 }],
            goal: { x: 5, y: 3 },
            requiredLength: 8,
            requiredIntersections: 0,
            blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
            filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        });
        const prep = prepLevel(level);
        const gate = level.gateKeys[0];
        const state = createState(gate, level, prep);
        const neighbors = getNeighbors(gate, state, level, prep);
        expect(neighbors.length).toBeGreaterThan(1);

        const activeProfile = SCORING_PROFILES.default;
        let observation = null;
        prep._orderingResearchObserver = {
            policies: [
                { id: ZERO_PROFILE_ID, scoringProfile: zeroScoringProfile(), orderingBias: null },
                ...basisScoringProfiles(),
                { id: 'active', scoringProfile: activeProfile, orderingBias: null },
            ],
            observe: record => { observation = record; },
        };
        scoreAndSort(neighbors.slice(), gate, state, level, prep, activeProfile, null);
        expect(observation).not.toBeNull();

        const zeroScores = rankingMap(observation, ZERO_PROFILE_ID);
        const activeScores = rankingMap(observation, 'active');
        const basisMaps = Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [
            field,
            rankingMap(observation, `${BASIS_PROFILE_PREFIX}${field}`),
        ]));

        for (const candidate of neighbors) {
            const vector = scoreVectorFromBasisScores(
                zeroScores.get(candidate),
                Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, basisMaps[field].get(candidate)])),
            );
            expect(reconstructScore(vector, activeProfile)).toBeCloseTo(activeScores.get(candidate), 10);
        }
    });
});
