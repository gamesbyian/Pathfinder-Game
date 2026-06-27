// Pure decision logic extracted from review-controller (DOM-free, unit-tested).
import { collectValidatedUniqueHints } from './submission-core.js';
import type { HintValidationResult } from './submission-core.js';

export { collectValidatedUniqueHints };
export type { HintValidationResult };

/** A submission record (subset the approval flow inspects). */
export interface ApprovalSubmission {
    type?: string;
    targetPublishedLevelId?: string;
}

/** A submission is a hint-addition iff it is typed as such AND names a published target. */
export function classifyApproval(sub: ApprovalSubmission): { isHintAddition: boolean } {
    return { isHintAddition: sub.type === 'hintAddition' && !!sub.targetPublishedLevelId };
}

/** The action to take when a submission has no valid hints left after the solver ran. */
export type ApprovalFallback = 'use-solution' | 'reject-recommended' | 'confirm-publish';

/**
 * Decide what to do when no valid hints remain on an approval:
 *  - a solver solution was found → publish using it;
 *  - none found, and this is a hint-addition → recommend rejecting (no fallback publish path);
 *  - none found, plain submission → ask the reviewer to confirm publishing without a hint.
 */
export function decideApprovalFallback(isHintAddition: boolean, hasSolution: boolean): ApprovalFallback {
    if (hasSolution) return 'use-solution';
    return isHintAddition ? 'reject-recommended' : 'confirm-publish';
}

/**
 * Re-validate a working level's saved hints against current metrics, returning the still-valid,
 * de-duplicated paths. Thin wrapper over the shared collector so the controller stays wiring.
 */
export function revalidateWorkingHints(
    hints: number[][] | undefined | null,
    validate: (path: number[]) => HintValidationResult | null | undefined,
): number[][] {
    if (!Array.isArray(hints) || hints.length === 0) return [];
    return collectValidatedUniqueHints(hints, validate);
}
