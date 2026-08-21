import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { WITNESS_GENERATOR_ID, HUMAN_PLAYER_ID, SOLVER_ID } from '../../modules/domain/hint-types.ts';
import {
    classifyProvenanceClass, isColdCapabilityEvidence, hintProvenanceClasses,
    hasColdCapabilityEvidence, summarizeProvenanceClasses, PROVENANCE_CLASSES,
} from './provenance-classes.mjs';

const entry = (context = {}, solver = { id: SOLVER_ID }) => ({ solver, context });

describe('classifyProvenanceClass', () => {
    test('a clean solver find is cold under both standards', () => {
        const e = entry({ hintGuided: false, usedExistingHints: false });
        assert.equal(classifyProvenanceClass(e), 'cold-capability');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'cold-capability');
    });

    test('hintGuided is guided under both standards', () => {
        const e = entry({ hintGuided: true, usedExistingHints: true });
        assert.equal(classifyProvenanceClass(e), 'hint-guided');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'hint-guided');
    });

    // The regression this module exists for: 36,381 real entries have this exact shape, and
    // treating them as cold overstated corpus 1's cold share by 13 points.
    test('usedExistingHints without hintGuided splits the two standards', () => {
        const e = entry({ hintGuided: false, usedExistingHints: true });
        assert.equal(classifyProvenanceClass(e), 'hint-guided');
        assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'cold-capability');
    });

    test('inherited witness and human solves outrank the technique flags', () => {
        for (const id of [WITNESS_GENERATOR_ID, HUMAN_PLAYER_ID]) {
            const e = entry({ hintGuided: false, usedExistingHints: false }, { id });
            assert.equal(classifyProvenanceClass(e), 'inherited-witness');
            assert.equal(classifyProvenanceClass(e, { standard: 'narrow' }), 'inherited-witness');
        }
    });

    test('a missing entry is unknown, and every result is a declared class', () => {
        assert.equal(classifyProvenanceClass(null), 'unknown');
        assert.equal(classifyProvenanceClass(undefined), 'unknown');
        for (const e of [entry(), entry({ hintGuided: true }), entry({}, { id: WITNESS_GENERATOR_ID })]) {
            assert.ok(PROVENANCE_CLASSES.includes(classifyProvenanceClass(e)));
        }
    });

    test('absent flags are treated as false, not as contamination', () => {
        assert.equal(classifyProvenanceClass(entry({})), 'cold-capability');
    });

    test('an unknown standard is rejected rather than silently defaulting', () => {
        assert.throws(() => classifyProvenanceClass(entry(), { standard: 'loose' }), /unknown cold-evidence standard/);
    });
});

// isColdCapabilityEvidence is the name CLAUDE.md directs callers to, so it is covered directly
// rather than only through the aggregate helpers.
describe('isColdCapabilityEvidence', () => {
    test('admits only clean solver finds under the strict standard', () => {
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: false, usedExistingHints: false })), true);
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: true })), false);
        assert.equal(isColdCapabilityEvidence(entry({ usedExistingHints: true })), false);
        assert.equal(isColdCapabilityEvidence(entry({}, { id: WITNESS_GENERATOR_ID })), false);
        assert.equal(isColdCapabilityEvidence(null), false);
    });

    test('the narrow standard admits usedExistingHints-only entries', () => {
        assert.equal(isColdCapabilityEvidence(entry({ usedExistingHints: true }), { standard: 'narrow' }), true);
        assert.equal(isColdCapabilityEvidence(entry({ hintGuided: true }), { standard: 'narrow' }), false);
    });
});

describe('hint-level aggregation', () => {
    test('a hint rediscovered cold and guided belongs to both classes', () => {
        const hint = { provenance: [entry({ hintGuided: true }), entry({ hintGuided: false, usedExistingHints: false })] };
        assert.deepEqual(hintProvenanceClasses(hint), new Set(['hint-guided', 'cold-capability']));
        assert.equal(hasColdCapabilityEvidence(hint), true);
    });

    test('a hint with no provenance is unknown, not cold', () => {
        assert.deepEqual(hintProvenanceClasses({ provenance: [] }), new Set(['unknown']));
        assert.equal(hasColdCapabilityEvidence({ provenance: [] }), false);
        assert.equal(hasColdCapabilityEvidence({}), false);
    });

    test('one guided entry does not disqualify a hint that also has a cold one', () => {
        const hint = { provenance: [entry({ hintGuided: true }), entry({ usedExistingHints: true }), entry({})] };
        assert.equal(hasColdCapabilityEvidence(hint), true);
    });
});

describe('summarizeProvenanceClasses', () => {
    test('counts hints and entries, keeping the no-provenance blind spot separate', () => {
        const hints = [
            { provenance: [entry({})] },                                          // cold
            { provenance: [entry({ hintGuided: true })] },                         // guided
            { provenance: [entry({ usedExistingHints: true })] },                  // guided (strict)
            { provenance: [entry({}, { id: WITNESS_GENERATOR_ID })] },             // witness
            { provenance: [] },                                                    // unknown
        ];
        assert.deepEqual(summarizeProvenanceClasses(hints), {
            hints: 5, entries: 4, noProvenanceHints: 1, coldHints: 1, hintGuidedHints: 2,
            inheritedWitnessHints: 1, coldEntries: 1,
        });
    });

    test('the narrow standard reclassifies usedExistingHints-only hints as cold', () => {
        const hints = [{ provenance: [entry({ usedExistingHints: true })] }];
        assert.equal(summarizeProvenanceClasses(hints).coldHints, 0);
        assert.equal(summarizeProvenanceClasses(hints, { standard: 'narrow' }).coldHints, 1);
    });

    test('no-provenance hints are excluded from every class count, not defaulted into one', () => {
        const summary = summarizeProvenanceClasses([{ provenance: [] }, { provenance: [] }]);
        assert.equal(summary.noProvenanceHints, 2);
        assert.equal(summary.coldHints + summary.hintGuidedHints + summary.inheritedWitnessHints, 0);
    });
});
