// Shared dedupe -> validate -> canonicalize -> policy-decide sequence for hint candidate
// acceptance (Component 12 of the hint-workbench plan, docs/hint-workbench-implementation-plan.md).
//
// Both scripts/hint-workbench.mjs's acceptCandidate() and scripts/hint-corpus-expand.mjs's
// consider() independently re-implemented this exact sequence around the same underlying
// primitives (validateCandidatePath, decideCandidateAcceptance, pathSignature) — sharing the
// primitives but not the sequence meant the two call sites could silently diverge in ordering
// or edge-case handling over time. This module is the single sequence both now call; each
// caller keeps its own bookkeeping (accepted-list shape, rejection-reason tallying, provenance,
// stagnation counters, policyReports, etc.) around the returned outcome, since those differ
// legitimately between the two tools' report formats.
//
// Design note: rejects a candidate at the EARLIEST stage that already disqualifies it (exact
// duplicate before validation, invalid before canonical-duplicate, canonical-duplicate before
// policy) — this mirrors both prior implementations and avoids wasted validation/policy work on
// a candidate that's already known to be unusable.
import { validateCandidatePath } from './path-validator.js';
import { pathSignature } from './hint-novelty.js';
import type { NormalizedLevel } from './types.js';
import type { HintNoveltyLevel } from './hint-novelty.js';

export interface AcceptancePolicyDecision {
    accept: boolean;
    reason: string;
    evaluation?: unknown;
}

/** A policy is any function from (level-with-candidate-pool, canonicalized-path) to a decision —
 *  e.g. a `decideCandidateAcceptance(...)` wrapper, or a trivial save-all `{ accept: true, ... }`. */
export type AcceptancePolicy = (
    levelForPolicy: HintNoveltyLevel,
    canonicalPath: number[],
) => AcceptancePolicyDecision;

export type AcceptanceStage = 'exact-duplicate' | 'invalid' | 'canonical-duplicate' | 'policy';

export interface AcceptanceOutcome {
    stage: AcceptanceStage;
    accept: boolean;
    /** 'exact-duplicate' | `invalid:${reason}` | 'canonical-duplicate' | the policy's own reason string. */
    reason: string;
    /** Signature of the candidate as given (pre-canonicalization) — always present. */
    inputPathSignature: string;
    /** Canonicalized path and its signature — present once validation succeeds (stage is
     *  'canonical-duplicate' or 'policy'). Absent for 'exact-duplicate'/'invalid' stages. */
    path?: number[];
    pathSignature?: string;
    evaluation?: unknown;
}

/**
 * Runs the shared exact-duplicate -> validate -> canonical-duplicate -> policy sequence for one
 * candidate path. Does not mutate `poolSigs` or any pool array — on `accept: true`, the caller is
 * responsible for adding `outcome.path`/`outcome.pathSignature` to its own pool/poolSigs and
 * recording whatever accepted-entry shape its report format uses.
 */
export function evaluateCandidateAcceptance(
    normalizedLevel: NormalizedLevel,
    levelForPolicy: HintNoveltyLevel,
    candidatePath: number[],
    poolSigs: ReadonlySet<string>,
    policy: AcceptancePolicy,
): AcceptanceOutcome {
    const inputPathSignature = pathSignature(candidatePath);
    if (poolSigs.has(inputPathSignature)) {
        return { stage: 'exact-duplicate', accept: false, reason: 'exact-duplicate', inputPathSignature };
    }

    const validation = validateCandidatePath(normalizedLevel, candidatePath);
    if (!validation.ok) {
        return { stage: 'invalid', accept: false, reason: `invalid:${validation.reason}`, inputPathSignature };
    }

    const canonicalSig = pathSignature(validation.path);
    if (poolSigs.has(canonicalSig)) {
        return {
            stage: 'canonical-duplicate', accept: false, reason: 'canonical-duplicate',
            inputPathSignature, path: validation.path, pathSignature: canonicalSig,
        };
    }

    const decision = policy(levelForPolicy, validation.path);
    return {
        stage: 'policy', accept: decision.accept, reason: decision.reason,
        inputPathSignature, path: validation.path, pathSignature: canonicalSig, evaluation: decision.evaluation,
    };
}
