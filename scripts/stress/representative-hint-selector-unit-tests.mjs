import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PACK } from '../../modules/domain/cell-key.ts';
import { selectRepresentativeHints } from './representative-hint-selector.mjs';

const p = (x, y) => PACK(x, y);
const solverEvent = (overrides = {}) => ({
    solver: {
        id: 'pathfinder-solver',
        technique: 'dfs',
        version: 'v1',
        forcing: null,
        ...overrides.solver,
    },
    search: {
        termination: 'solved',
        randomSeed: null,
        ...overrides.search,
    },
    context: {
        hintGuided: false,
        usedExistingHints: false,
        isolatedTechnique: false,
        ...overrides.context,
    },
});

const hint = (path, provenance = [solverEvent()]) => ({ path, provenance });

test('first representative prefers cross-origin and cross-technique evidence breadth', () => {
    const ordinary = hint([p(0, 0), p(1, 0), p(2, 0)]);
    const broad = hint([p(0, 0), p(0, 1), p(0, 2)], [
        solverEvent({ solver: { technique: 'beam', version: 'v1' } }),
        { solver: { id: 'external-constraint-solver', technique: 'cp-sat', version: 'ext1' }, search: {}, context: {} },
    ]);
    assert.equal(selectRepresentativeHints([ordinary, broad], { limit: 1 })[0], broad);
});

test('later representatives prefer a different structural solution family', () => {
    const a = hint([p(0, 0), p(1, 0), p(2, 0), p(2, 1)]);
    const sameFamilyDetour = hint([p(0, 0), p(0, 1), p(1, 1), p(1, 0), p(2, 0), p(2, 1)]);
    const portalFamily = hint([p(0, 0), p(1, 0), p(4, 4), p(4, 3)]);
    const selected = selectRepresentativeHints([a, sameFamilyDetour, portalFamily], { limit: 2 });
    assert.equal(selected.includes(portalFamily), true);
});

test('exact duplicate paths are collapsed before selection', () => {
    const path = [p(0, 0), p(1, 0), p(2, 0)];
    const thin = hint(path, [solverEvent()]);
    const rich = hint(path, [solverEvent(), solverEvent({ solver: { technique: 'beam', version: 'v2' } })]);
    const selected = selectRepresentativeHints([thin, rich], { limit: 5 });
    assert.equal(selected.length, 1);
    assert.equal(selected[0], rich);
});

test('zero limit and pathless records produce no representatives', () => {
    assert.deepEqual(selectRepresentativeHints([hint([p(0, 0), p(1, 0)])], { limit: 0 }), []);
    assert.deepEqual(selectRepresentativeHints([{ provenance: [solverEvent()] }], { limit: 3 }), []);
});

test('dependent replay clouds do not outrank independent evidence for capability questions', () => {
    const replay = i => ({
        solver: { id: 'variant-corpus-diagnostic', technique: `variant-parent-replay:F:P:V${i}`, version: 'v1' },
        search: {}, context: {},
    });
    const replayCloud = hint([p(0, 0), p(1, 0), p(2, 0)], Array.from({ length: 20 }, (_, i) => replay(i)));
    const cold = hint([p(0, 0), p(0, 1), p(0, 2)], [solverEvent({ solver: { version: 'v1' } })]);
    assert.equal(selectRepresentativeHints([replayCloud, cold], {
        limit: 1,
        evidencePurpose: 'current-production-capability',
        currentSolverVersion: 'v1',
    })[0], cold);
});

test('an unattributed valid path remains applicable for atlas selection', () => {
    const unattributed = hint([p(0, 0), p(1, 0), p(2, 0)], []);
    const described = selectRepresentativeHints([unattributed], {
        limit: 1, evidencePurpose: 'solution-atlas',
    });
    assert.deepEqual(described, [unattributed]);
});

test('decision-bearing selection returns no representative when no event is admissible', () => {
    const replayOnly = hint([p(0, 0), p(1, 0), p(2, 0)], [{
        solver: { id: 'variant-corpus-diagnostic', technique: 'variant-parent-replay:F:P:V1', version: 'v1' },
        search: {}, context: {},
    }]);
    assert.deepEqual(selectRepresentativeHints([replayOnly], {
        limit: 2,
        evidencePurpose: 'current-production-capability',
        comparableSolverVersions: ['v1'],
    }), []);
    assert.deepEqual(selectRepresentativeHints([hint([p(0, 0), p(0, 1)], [solverEvent({
        solver: { version: 'v1' }, context: { isolatedTechnique: true },
    })])], {
        limit: 1,
        evidencePurpose: 'technique-performance',
        comparableSolverVersions: ['v1'],
    }), [], 'positive-only isolated successes cannot become performance representatives');
});
