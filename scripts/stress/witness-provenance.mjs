// Provenance helpers for witness paths carried over into generated sibling/cousin level
// variants — see docs/sibling-cousin-system.md section 11a. A preserved witness is neither
// found by search (SOLVER_ID) nor freshly random-walked (WITNESS_GENERATOR_ID); it's proven
// valid purely by construction — the parent's own already-validated witness is re-checked
// against the domain referee after every mutation.
import { makeProvenanceEntry, toHint, INHERITED_WITNESS_ID, TRANSFORMED_WITNESS_ID } from '../../modules/domain/hint-types.js';

function witnessProvenanceEntry(solverId, levelRevision) {
    return makeProvenanceEntry('witness', {
        solverId,
        termination: 'witness',
        levelRevision,
        hintGuided: false,
        usedExistingHints: false,
    });
}

/** Build the HintProvenanceEntry for a witness path preserved UNCHANGED (byte-identical
 *  coordinates) from a parent level into a generated variant — local-mutant and density-sweep
 *  siblings, which move/add/remove other objects but never touch the witness itself.
 *  `levelRevision` should be the VARIANT's own canonical fingerprint (domain/level-fingerprint.ts),
 *  not the parent's — the two are expected to differ. */
export function inheritedWitnessProvenanceEntry(levelRevision = null) {
    return witnessProvenanceEntry(INHERITED_WITNESS_ID, levelRevision);
}

/** Wrap a preserved (unchanged-coordinate) witness path + its provenance entry into a Hint. */
export function inheritedWitnessHint(path, levelRevision = null) {
    return toHint(path, [inheritedWitnessProvenanceEntry(levelRevision)]);
}

/** Build the HintProvenanceEntry for a witness path carried over via a KNOWN coordinate
 *  transform (rotation/reflection/translation) — symmetry siblings and re-embedded-witness
 *  cousins, whose witness coordinates differ from the parent's by construction, not search. */
export function transformedWitnessProvenanceEntry(levelRevision = null) {
    return witnessProvenanceEntry(TRANSFORMED_WITNESS_ID, levelRevision);
}

/** Wrap a transformed witness path + its provenance entry into a canonical Hint. */
export function transformedWitnessHint(path, levelRevision = null) {
    return toHint(path, [transformedWitnessProvenanceEntry(levelRevision)]);
}
