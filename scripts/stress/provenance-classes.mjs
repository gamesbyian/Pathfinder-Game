// Canonical provenance-class predicates for hint capability analysis.
//
// WHY THIS EXISTS: "is this hint evidence that the solver can find the level cold?" has been
// re-derived by hand at least twice, and got a different (wrong) answer each time — most recently
// by counting `hintGuided === false` alone as cold, which overstated corpus 1's cold share by 13
// points because a further 36,381 entries set `usedExistingHints` without `hintGuided`. The
// predicate is subtle enough, and load-bearing enough (CLAUDE.md's Provenance section forbids
// using the corpus as a capability measure without it), that it belongs in one tested place.
//
// This module is deliberately NOT a second classifier. `classifyProvenanceSource`
// (solution-profile-lib.mjs) answers "which discovery technique produced this entry" over seven
// buckets; this answers the narrower admissibility question from
// reports/2026-08-13-existing-solve-data-tuning-opportunities.md's Finding 5, which is a
// three-way split. Both read the same stored fields and neither adds schema.
//
// The two flags mean different things (see HintContextProvenance in modules/domain/hint-types.ts):
//   usedExistingHints — other hints were known to the RUN, available for seeding/comparison,
//                       regardless of whether this candidate used one;
//   hintGuided        — THIS candidate's search was seeded/steered from an existing hint.
// So there are two defensible readings of "cold", and picking one silently is what caused the
// earlier error. Both are exported by name; STRICT is the default because it is the standard
// Finding 5 sets for decision-bearing capability claims.
import { WITNESS_GENERATOR_ID, HUMAN_PLAYER_ID } from '../../modules/domain/hint-types.ts';

/** Finding 5's three admissibility classes, plus `unknown` for entry-free hints. */
export const PROVENANCE_CLASSES = ['cold-capability', 'hint-guided', 'inherited-witness', 'unknown'];

/**
 * STRICT (default): the run had no hint contamination available at all. Required for
 * decision-bearing capability claims — solver-capability benchmarking, "is this level
 * solver-solvable", regression baselines.
 *
 * NARROW: this candidate was not itself seeded from a hint, but the run may have had hints
 * available for dedup/comparison. Admissible for questions about a single candidate's derivation,
 * NOT for population capability claims.
 */
export const COLD_EVIDENCE_STANDARDS = ['strict', 'narrow'];

const isInheritedWitness = entry =>
    entry?.solver?.id === WITNESS_GENERATOR_ID || entry?.solver?.id === HUMAN_PLAYER_ID;

/**
 * One provenance entry → one admissibility class. Precedence matters and mirrors
 * classifyProvenanceSource's: an inherited witness/human solve is not a solver technique at all,
 * so its technique-specific flags are meaningless and must not be consulted first.
 */
export function classifyProvenanceClass(entry, { standard = 'strict' } = {}) {
    if (!entry) return 'unknown';
    if (!COLD_EVIDENCE_STANDARDS.includes(standard)) throw new Error(`unknown cold-evidence standard: ${standard}`);
    if (isInheritedWitness(entry)) return 'inherited-witness';
    const context = entry.context ?? {};
    if (context.hintGuided === true) return 'hint-guided';
    if (standard === 'strict' && context.usedExistingHints === true) return 'hint-guided';
    return 'cold-capability';
}

/** True iff this single entry is admissible as cold capability evidence. */
export function isColdCapabilityEvidence(entry, options) {
    return classifyProvenanceClass(entry, options) === 'cold-capability';
}

/**
 * A hint's classes across all of its entries. A hint independently rediscovered cold AND by a
 * guided technique belongs to both — the entries are per discovery event, so collapsing them to a
 * single label would discard exactly the cross-validation the append-only schema exists to keep.
 */
export function hintProvenanceClasses(hint, options) {
    const entries = hint?.provenance ?? [];
    if (entries.length === 0) return new Set(['unknown']);
    return new Set(entries.map(entry => classifyProvenanceClass(entry, options)));
}

/** True iff at least one of the hint's discovery events was cold. */
export function hasColdCapabilityEvidence(hint, options) {
    return (hint?.provenance ?? []).some(entry => isColdCapabilityEvidence(entry, options));
}

/**
 * Population summary for one corpus. `coldHints` is the figure to quote for capability claims;
 * `noProvenanceHints` is its blind spot and must be reported alongside it rather than folded into
 * the denominator silently.
 */
export function summarizeProvenanceClasses(hints, options) {
    const summary = {
        hints: 0, entries: 0, noProvenanceHints: 0, coldHints: 0, hintGuidedHints: 0,
        inheritedWitnessHints: 0, coldEntries: 0,
    };
    for (const hint of hints) {
        summary.hints++;
        const entries = hint?.provenance ?? [];
        summary.entries += entries.length;
        if (entries.length === 0) { summary.noProvenanceHints++; continue; }
        const classes = hintProvenanceClasses(hint, options);
        if (classes.has('cold-capability')) summary.coldHints++;
        if (classes.has('hint-guided')) summary.hintGuidedHints++;
        if (classes.has('inherited-witness')) summary.inheritedWitnessHints++;
        summary.coldEntries += entries.filter(entry => isColdCapabilityEvidence(entry, options)).length;
    }
    return summary;
}
