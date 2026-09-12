import assert from 'node:assert/strict';
import { test } from 'vitest';

import { provenanceFromSolveResult } from './hint-provenance.js';
import { canonicalizeTechniqueCensusResult } from '../../scripts/technique-census-result-lib.mjs';

test('technique-census result normalization carries source cell into hint provenance without bloating result JSON', () => {
    const normalized = canonicalizeTechniqueCensusResult({
        cellId: 'T1:R03229:coarse-off',
        tier: 'T1',
        levelId: 'R03229',
        techniqueKeys: ['objectiveFirst|beam=2000'],
        ablation: { enable: [], disable: ['STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION'] },
        attempts: [{
            scoringProfileId: 'objectiveFirst',
            beamWidth: 2000,
            ok: true,
            outcome: 'success',
            nodesExpanded: 1234,
        }],
    });

    const carrier = normalized.attempts[0].techniqueCensusCell;
    assert.ok(carrier, 'winning attempt should carry the in-memory census source cell');
    assert.equal(carrier.cellId, 'T1:R03229:coarse-off');
    assert.equal(carrier.tier, 'T1');
    assert.match(carrier.variantLabel, /coarse-state-near-tie-retention-off$/);
    assert.deepEqual(carrier.ablation, { enable: [], disable: ['STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION'] });

    const serialized = JSON.stringify(normalized);
    assert.equal(serialized.includes('techniqueCensusCell'), false,
        'source-cell carrier must stay out of combined-cells JSON; the row already persists those fields');

    const provenance = provenanceFromSolveResult({
        status: 'success',
        attempts: normalized.attempts,
        nodesExpanded: 1234,
    }, { isolatedTechnique: true, solverVersion: 'test-sha' });

    assert.equal(provenance.context.isolatedTechnique, true);
    assert.deepEqual(provenance.context.techniqueCensusCell, carrier,
        'persisted hint provenance must distinguish the exact census cell that produced the solve');
});

test('ordinary solve provenance has no technique-census source cell', () => {
    const provenance = provenanceFromSolveResult({
        status: 'success',
        attempts: [{ scoringProfileId: 'objectiveFirst', beamWidth: 2000, ok: true }],
    });
    assert.equal(provenance.context.techniqueCensusCell, null);
});
