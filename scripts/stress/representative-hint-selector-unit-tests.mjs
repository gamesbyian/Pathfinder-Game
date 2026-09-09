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
