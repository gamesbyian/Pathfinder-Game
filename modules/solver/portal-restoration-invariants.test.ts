import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { PACK } from './encoding.js';
import { evaluatePrunedMove } from './hard-prune-pipeline.js';
import type { PruneDiagnostics } from './hard-prune-pipeline.js';
import { isParityCompatibleEndpoint } from './false-goal-trigger-search.js';
import { getActiveGates } from './orchestration.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors } from './search-state.js';
import { getRealLengthFromState } from './solution.js';

function makePortalLevel(twist = false): NormalizedLevel {
    const portalA = PACK(1, 1);
    const portalB = twist ? PACK(2, 1) : PACK(3, 1);
    return {
        grid: { w: 4, h: 3 },
        gateKeys: [PACK(0, 1)],
        goalKey: PACK(3, 2),
        requiredLength: 5,
        requiredIntersections: 2,
        blockSet: new Set(),
        portalMap: new Map([
            [portalA, { dest: portalB, color: '#fff' }],
            [portalB, { dest: portalA, color: '#fff' }],
        ]),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('visited portal terminals cannot be re-entered by ordinary move generation', () => {
    const level = makePortalLevel(false);
    const prep = prepLevel(level);
    const gate = level.gateKeys[0];
    const portalA = PACK(1, 1);
    const state = createState(gate, level, prep);
    state.visited[portalA] = 1;

    assert.equal(getNeighbors(gate, state, level, prep).includes(portalA), false);
});

test('applyMove charges a visited target on a portal jump to the intersection budget', () => {
    const level = makePortalLevel(false);
    const prep = prepLevel(level);
    const portalA = PACK(1, 1);
    const portalB = PACK(3, 1);
    const state = createState(portalA, level, prep);
    state.visited[portalB] = 1;

    applyMove(portalB, state, level, prep, true);

    assert.equal(state.portalJumps, 1);
    assert.equal(state.ints, 1, 'portal-jump revisits use the same visited-cell intersection accounting');
});

test('prep records no twist portals when every portal pair preserves cell parity', () => {
    const sameParity = makePortalLevel(false);
    const twist = makePortalLevel(true);

    assert.equal(prepLevel(sameParity).parityPortalDistMaps?.length ?? 0, 0);
    assert.equal(prepLevel(twist).parityPortalDistMaps?.length ?? 0, 1);
});

test('false-goal endpoint parity already applies the ordinary invariant through same-parity portals', () => {
    const sameParity = makePortalLevel(false);
    sameParity.requiredLength = 2;
    sameParity.gateKeys = [PACK(0, 0)];
    const incompatible = PACK(1, 0); // gate parity 0 + even counted length requires endpoint parity 0
    assert.equal(isParityCompatibleEndpoint(sameParity, incompatible), false);

    const twist = makePortalLevel(true);
    twist.requiredLength = 2;
    twist.gateKeys = [PACK(0, 0)];
    assert.equal(isParityCompatibleEndpoint(twist, incompatible), true,
        'a twist portal conservatively leaves both endpoint parities possible');
});

// Same fixture/numbers as the false-goal endpoint-parity test above: gate parity 0, requiredLength
// 2 (even), so a first move to PACK(1, 0) (parity 1) is incompatible for a portal-free level, and
// per reports/2026-09-09-portal-restoration-evidence-hardening-001.md section 4 the SAME invariant
// is unweakened on a zero-twist-pair portal level (every jump there contributes zero parity flips).
test('PRUNE_PARITY applies unweakened on a same-parity portal level (zero twist pairs)', () => {
    const level = makePortalLevel(false);
    level.requiredLength = 2;
    level.gateKeys = [PACK(0, 0)];
    const prep = prepLevel(level);
    const next = PACK(1, 0);
    const state = createState(level.gateKeys[0], level, prep);
    applyMove(next, state, level, prep, false);
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    const verdict = evaluatePrunedMove(
        next, getRealLengthFromState(state), state, level, prep, { PRUNE_PARITY: true }, false, { diagnostics },
    );
    assert.equal(verdict, 'reject');
    assert.equal(diagnostics.rejected.PRUNE_PARITY, 1);
});

test('PRUNE_PARITY stays deferred (never reached) on a twist portal level, preserving the pre-restoration conservative behavior', () => {
    const level = makePortalLevel(true);
    level.requiredLength = 2;
    level.gateKeys = [PACK(0, 0)];
    const prep = prepLevel(level);
    const next = PACK(1, 0);
    const state = createState(level.gateKeys[0], level, prep);
    applyMove(next, state, level, prep, false);
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    evaluatePrunedMove(next, getRealLengthFromState(state), state, level, prep, { PRUNE_PARITY: true }, false, { diagnostics });
    assert.equal(diagnostics.reached.PRUNE_PARITY, undefined,
        'ordinary parity must not evaluate at all on a twist-portal level — only the opt-in envelope check may');
});

// goalKey PACK(3, 2) has parity 1; requiredLength 2 is even, so getActiveGates's own formula
// (keyParity(gate) ^ goalParity ^ (requiredLength & 1) === 0) requires gate parity 1 to be feasible.
test('getActiveGates parity-filters gates on a same-parity portal level exactly like a portal-free level, when given prep', () => {
    const level = makePortalLevel(false);
    level.requiredLength = 2;
    const feasibleGate = PACK(1, 0);   // parity 1 — feasible
    const infeasibleGate = PACK(0, 0); // parity 0 — infeasible
    const prep = prepLevel(level);
    assert.deepEqual(getActiveGates(level, [feasibleGate, infeasibleGate], null, prep), [feasibleGate]);
});

test('getActiveGates does not filter a twist portal level even when given prep (conservative, matches the pre-restoration behavior)', () => {
    const level = makePortalLevel(true);
    level.requiredLength = 2;
    const feasibleGate = PACK(1, 0);
    const infeasibleGate = PACK(0, 0);
    const prep = prepLevel(level);
    assert.deepEqual(getActiveGates(level, [feasibleGate, infeasibleGate], null, prep), [feasibleGate, infeasibleGate]);
});

test('getActiveGates does not filter a same-parity portal level when prep is omitted (callers without a prepared level keep the old unfiltered-on-portals behavior)', () => {
    const level = makePortalLevel(false);
    level.requiredLength = 2;
    const feasibleGate = PACK(1, 0);
    const infeasibleGate = PACK(0, 0);
    assert.deepEqual(getActiveGates(level, [feasibleGate, infeasibleGate], null), [feasibleGate, infeasibleGate]);
});
