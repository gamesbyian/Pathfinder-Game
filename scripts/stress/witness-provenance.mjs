// Provenance helper for witness paths carried over into generated sibling/cousin level
// variants — see docs/sibling-cousin-system.md section 11a. A preserved witness is neither
// found by search (SOLVER_ID) nor freshly random-walked (WITNESS_GENERATOR_ID); it's proven
// valid purely by construction — the parent's own already-validated witness is re-checked
// against the domain referee after every object-placement mutation.
import { makeProvenanceEntry, toHint, INHERITED_WITNESS_ID } from '../../modules/domain/hint-types.js';

/** Build the HintProvenanceEntry for a witness path preserved unchanged from a parent level
 *  into a generated variant. `levelRevision` should be the VARIANT's own canonical fingerprint
 *  (domain/level-fingerprint.ts), not the parent's — the two are expected to differ. */
export function inheritedWitnessProvenanceEntry(levelRevision = null) {
    return makeProvenanceEntry('witness', {
        solverId: INHERITED_WITNESS_ID,
        termination: 'witness',
        levelRevision,
        hintGuided: false,
        usedExistingHints: false,
    });
}

/** Wrap a preserved witness path + its provenance entry into a canonical Hint. */
export function inheritedWitnessHint(path, levelRevision = null) {
    return toHint(path, [inheritedWitnessProvenanceEntry(levelRevision)]);
}
