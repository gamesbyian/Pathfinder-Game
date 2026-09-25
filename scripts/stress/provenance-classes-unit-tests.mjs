import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import {
    WITNESS_GENERATOR_ID,
    HUMAN_PLAYER_ID,
    INHERITED_WITNESS_ID,
    TRANSFORMED_WITNESS_ID,
    EXTERNAL_SOLVER_ID,
    SOLVER_ID,
} from '../../modules/domain/hint-types.ts';
import {
    classifyProvenanceClass, isColdCapabilityEvidence, hintProvenanceClasses,
    hasColdCapabilityEvidence, summarizeProvenanceClasses, PROVENANCE_CLASSES,
} from './provenance-classes.mjs';

const entry = (context = {}, solver = { id: SOLVER_ID }) => ({ solver, context });

describe('classifyProvenanceClass', () => {
    test('a clean production-solver find is cold under both standards', () => {
        const e = entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false });
        assert.equal(classifyProvenanceClass(e), 'cold-capability');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'cold-capability');
    });

    test('hintGuided is guided under both standards', () => {
        const e = entry({ hintGuided: true, usedExistingHints: true, isolatedTechnique: false });
        assert.equal(classifyProvenanceClass(e), 'hint-guided');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'hint-guided');
    });

    // The regression this module exists for: 36,381 real entries have this exact shape, and
    // treating them as cold overstated corpus 1's cold share by 13 points.
    test('usedExistingHints without hintGuided splits the two standards', () => {
        const e = entry({ hintGuided: false, usedExistingHints: true, isolatedTechnique: false });
        assert.equal(classifyProvenanceClass(e), 'hint-guided');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'cold-capability');
    });

    test('witness, human, inherited and transformed witness origins are never cold', () => {
        for (const id of [WITNESS_GENERATOR_ID, HUMAN_PLAYER_ID, INHERITED_WITNESS_ID, TRANSFORMED_WITNESS_ID]) {
            const e = entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false }, { id });
            assert.equal(classifyProvenanceClass(e), 'inherited-witness');
            assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'inherited-witness');
            assert.equal(isColdCapabilityEvidence(e), false);
        }
    });

    test('external, variant-replay, and unrecognized producers are unknown for production capability', () => {
        for (const id of [EXTERNAL_SOLVER_ID, 'variant-corpus-diagnostic', 'future-non-production-producer']) {
            const e = entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false }, { id });
            assert.equal(classifyProvenanceClass(e), 'unknown');
            assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'unknown');
            assert.equal(isColdCapabilityEvidence(e), false);
        }
    });

    test('a missing entry or missing producer id is unknown, and every result is a declared class', () => {
        assert.equal(classifyProvenanceClass(null), 'unknown');
        assert.equal(classifyProvenanceClass(undefined), 'unknown');
        assert.equal(classifyProvenanceClass(entry({}, {})), 'unknown');
        for (const e of [entry(), entry({ hintGuided: true }), entry({}, { id: WITNESS_GENERATOR_ID })]) {
            assert.ok(PROVENANCE_CLASSES.includes(classifyProvenanceClass(e)));
        }
    });

    test('absent legacy capability flags remain unknown rather than becoming clean cold evidence', () => {
        assert.equal(classifyProvenanceClass(entry({})), 'unknown');
        assert.equal(classifyProvenanceClass(entry({ hintGuided: false, isolatedTechnique: false })), 'unknown');
        assert.equal(classifyProvenanceClass(entry({ hintGuided: false, isolatedTechnique: false }), { standard: 'narrow' }), 'cold-capability');
    });

    test('an unknown standard is rejected rather than silently defaulting', () => {
        assert.throws(() => classifyProvenanceClass(entry(), { standard: 'loose' }), /unknown cold-evidence standard/);
    });

    test('an isolated-technique run is never cold-capability evidence, even if also hint-guided', () => {
        assert.equal(classifyProvenanceClass(entry({ isolatedTechnique: true, hintGuided: false, usedExistingHints: false })), 'isolated-technique');
        assert.equal(classifyProvenanceClass(entry({ isolatedTechnique: true, hintGuided: true })), 'isolated-technique');
        assert.equal(isColdCapabilityEvidence(entry({ isolatedTechnique: true })), false);
    });
});

describe('isColdCapabilityEvidence', () => {
    test('admits only clean production-solver finds under the strict standard', () => {
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false })), true);
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: true, isolatedTechnique: false })), false);
        assert.equal(isColdCapabilityEvidence(entry({ usedExistingHints: true })), false);
        assert.equal(isColdCapabilityEvidence(entry({}, { id: WITNESS_GENERATOR_ID })), false);
        assert.equal(isColdCapabilityEvidence(entry({}, { id: EXTERNAL_SOLVER_ID })), false);
        assert.equal(isColdCapabilityEvidence(null), false);
    });

    test('the narrow standard admits usedExistingHints-only production events', () => {
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: false, isolatedTechnique: false, usedExistingHints: true }), { standard: 'narrow' }), true);
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: true, isolatedTechnique: false }), { standard: 'narrow' }), false);
    });
});

describe('hint-level aggregation', () => {
    test('a hint rediscovered cold and guided belongs to both classes', () => {
        const hint = { provenance: [entry({ hintGuided: true, isolatedTechnique: false }), entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false })] };
        assert.deepEqual(hintProvenanceClasses(hint), new Set(['hint-guided', 'cold-capability']));
        assert.equal(hasColdCapabilityEvidence(hint), true);
    });

    test('a hint with no provenance is unknown, not cold', () => {
        assert.deepEqual(hintProvenanceClasses({ provenance: [] }), new Set(['unknown']));
        assert.equal(hasColdCapabilityEvidence({ provenance: [] }), false);
        assert.equal(hasColdCapabilityEvidence({}), false);
    });

    test('one guided entry does not disqualify a hint that also has a cold one', () => {
        const hint = { provenance: [
            entry({ hintGuided: true, isolatedTechnique: false }),
            entry({ hintGuided: false, usedExistingHints: true, isolatedTechnique: false }),
            entry({}),
            entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false }),
        ] };
        assert.equal(hasColdCapabilityEvidence(hint), true);
    });

    test('an external rediscovery does not create cold capability without a production event', () => {
        const external = entry({}, { id: EXTERNAL_SOLVER_ID });
        assert.deepEqual(hintProvenanceClasses({ provenance: [external] }), new Set(['unknown']));
        assert.equal(hasColdCapabilityEvidence({ provenance: [external] }), false);
    });
});

describe('summarizeProvenanceClasses', () => {
    test('counts hints and entries, keeping the no-provenance blind spot separate', () => {
        const hints = [
            { provenance: [entry({ hintGuided: false, usedExistingHints: false, isolatedTechnique: false })] },
            { provenance: [entry({ hintGuided: true, isolatedTechnique: false })] },
            { provenance: [entry({ hintGuided: false, usedExistingHints: true, isolatedTechnique: false })] },
            { provenance: [entry({}, { id: WITNESS_GENERATOR_ID })] },
            { provenance: [] },
        ];
        assert.deepEqual(summarizeProvenanceClasses(hints), {
            hints: 5, entries: 4, noProvenanceHints: 1, coldHints: 1, hintGuidedHints: 2,
            inheritedWitnessHints: 1, isolatedTechniqueHints: 0, coldEntries: 1,
        });
    });

    test('the narrow standard reclassifies usedExistingHints-only production hints as cold', () => {
        const hints = [{ provenance: [entry({ hintGuided: false, usedExistingHints: true, isolatedTechnique: false })] }];
        assert.equal(summarizeProvenanceClasses(hints).coldHints, 0);
        assert.equal(summarizeProvenanceClasses(hints, { standard: 'narrow' }).coldHints, 1);
    });

    test('no-provenance and non-production hints are excluded from production capability counts', () => {
        const summary = summarizeProvenanceClasses([
            { provenance: [] },
            { provenance: [entry({}, { id: EXTERNAL_SOLVER_ID })] },
        ]);
        assert.equal(summary.noProvenanceHints, 1);
        assert.equal(summary.coldHints + summary.hintGuidedHints + summary.inheritedWitnessHints, 0);
        assert.equal(summary.coldEntries, 0);
    });
});
