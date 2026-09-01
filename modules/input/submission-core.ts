// Pure decision logic extracted from submission-controller (DOM-free, unit-tested).
// The controller is left as thin wiring around these functions; the branchy decisions
// (hint cycling/wrap, validated-hint dedupe, duplicate verdicts, index clamping) live here.
import { pathSignature } from '../solver/diversification.js';

/**
 * Next index when cycling saved hints. If the current hint source is already 'saved',
 * advance one with wraparound; otherwise (re)start at the first hint. Returns 0 for an
 * empty hint list.
 */
export function nextHintCycleIndex(source: string, currentPathIdx: number, hintCount: number): number {
    if (hintCount <= 0) return 0;
    return source === 'saved' ? (currentPathIdx + 1) % hintCount : 0;
}

/**
 * A path-validation result: on success, the canonicalized `path` the referee accepted; on
 * failure, just `ok: false` (a `reason` may also be present — matches the solver's
 * `validateCandidatePath` shape). A discriminated union so narrowing on `ok` yields `path`.
 */
export type HintValidationResult =
    | { ok: true; path: number[] }
    | { ok: false };

/**
 * Run each candidate path through `validate`, keeping only accepted paths and dropping
 * duplicates by their canonical (validated) form. Order is preserved. This is the shared
 * dedupe used by both the submission flow and review re-validation.
 */
export function collectValidatedUniqueHints(
    candidatePaths: number[][],
    validate: (path: number[]) => HintValidationResult | null | undefined,
): number[][] {
    const seen = new Set<string>();
    const out: number[][] = [];
    for (const candidate of candidatePaths) {
        const res = validate(candidate);
        if (!res?.ok) continue;
        const key = JSON.stringify(res.path);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(res.path);
    }
    return out;
}

/** Hint paths in `candidates` whose signature is not already present in `existing`. */
export function selectNovelHints(candidates: number[][], existing: number[][] = []): number[][] {
    const existingSigs = new Set(existing.map(pathSignature));
    return candidates.filter((p) => !existingSigs.has(pathSignature(p)));
}

/** A match against a level already published in the local levels.json corpus (as opposed to a
 *  Firestore published_levels doc) — see modules/persistence/local-level-hints-repository.ts. */
export interface LocalCorpusMatch {
    levelNumber: number;
    levelFingerprint: string;
}

/**
 * Find whether `targetLevelFingerprint` matches any level already published locally. Takes
 * precomputed fingerprints (fingerprinting is async/SHA-256-based — the caller computes them
 * once, this is the pure comparison) rather than the raw levels themselves, so it stays
 * synchronous and trivially testable.
 */
export function findLocalCorpusMatchByLevelFingerprint(
    localLevelFingerprints: readonly { levelNumber: number; fingerprint: string }[],
    targetLevelFingerprint: string | null,
): LocalCorpusMatch | null {
    if (!targetLevelFingerprint) return null;
    const match = localLevelFingerprints.find((lf) => lf.levelFingerprint === targetLevelFingerprint);
    return match ? { levelNumber: match.levelNumber, levelFingerprint: match.levelFingerprint } : null;
}

export interface HintAdditionVerdict {
    /** false → the submission is blocked (a published level already has all these hints). */
    ok: boolean;
    /** the hints to actually submit (novel subset for a hint-addition, else all). */
    hintsToSubmit: number[][];
    /** set when contributing to an existing published level stored in Firestore. */
    targetPublishedLevelId: string | null;
    /** set when contributing to an existing published level stored in the local levels.json
     *  corpus instead — mutually exclusive with targetPublishedLevelId. */
    targetLocalLevelMatch: LocalCorpusMatch | null;
    /** number of novel hints (for messaging). */
    novelCount: number;
}

/**
 * Resolve a deferred "matches an already-published level" duplicate. A hint-addition only
 * clears the block if at least one verified hint isn't already saved on that level. With no
 * addition target, the submission proceeds with all its hints. `localMatch`/`localExistingHints`
 * are independent of `hintAdditionTarget` (the Firestore-published match) — a level can only
 * match one of the two corpora, but the caller decides which check ran.
 */
export function resolveHintAdditionVerdict(
    normalizedHints: number[][],
    hintAdditionTarget: { id?: string; hints?: number[][] } | null,
    localMatch: LocalCorpusMatch | null = null,
    localExistingHints: number[][] = [],
): HintAdditionVerdict {
    if (localMatch) {
        const novelHints = selectNovelHints(normalizedHints, localExistingHints);
        if (novelHints.length === 0) {
            return { ok: false, hintsToSubmit: [], targetPublishedLevelId: null, targetLocalLevelMatch: null, novelCount: 0 };
        }
        return {
            ok: true,
            hintsToSubmit: novelHints,
            targetPublishedLevelId: null,
            targetLocalLevelMatch: localMatch,
            novelCount: novelHints.length,
        };
    }
    if (!hintAdditionTarget) {
        return { ok: true, hintsToSubmit: normalizedHints, targetPublishedLevelId: null, targetLocalLevelMatch: null, novelCount: normalizedHints.length };
    }
    const novelHints = selectNovelHints(normalizedHints, hintAdditionTarget.hints || []);
    if (novelHints.length === 0) {
        return { ok: false, hintsToSubmit: [], targetPublishedLevelId: null, targetLocalLevelMatch: null, novelCount: 0 };
    }
    return {
        ok: true,
        hintsToSubmit: novelHints,
        targetPublishedLevelId: hintAdditionTarget.id ?? null,
        targetLocalLevelMatch: null,
        novelCount: novelHints.length,
    };
}

/**
 * A pending-queue duplicate always hard-blocks (no published level to contribute to yet),
 * but the count of novel hints determines the wording shown to the player.
 */
export function pendingDuplicateNovelCount(
    normalizedHints: number[][],
    pendingDuplicateMatch: { hints?: number[][] } | null,
): number {
    if (!pendingDuplicateMatch) return 0;
    return selectNovelHints(normalizedHints, pendingDuplicateMatch.hints || []).length;
}

/** Clamp a review index to the valid range for a list of `count` submissions. */
export function clampReviewIndex(currentIdx: number, count: number): number {
    return Math.min(currentIdx, Math.max(0, count - 1));
}

export interface DuplicateCheckPresentation {
    levelFingerprint: string | null;
    /** set when the level matches a submission already waiting in the review queue. */
    pendingDuplicateMatch: any | null;
    /** set when the level matches an already-published level (hint-addition path). */
    hintAdditionTarget: any | null;
    step: { state: 'ok' | 'warn'; details: string | string[] };
}

/**
 * Turn a persistence duplicate-check result into the submit-modal step presentation and
 * the deferred match handles. Both match kinds are deferred (novel hints may still be
 * contributed); collections that could not be checked degrade the step to a warning.
 */
export function describeDuplicateCheck(duplicateCheck: {
    levelFingerprint?: string | null;
    duplicate?: { source: string } | null;
    warnings?: string[];
} | null | undefined): DuplicateCheckPresentation {
    const levelFingerprint = duplicateCheck?.levelFingerprint || null;
    if (duplicateCheck?.duplicate) {
        const isPending = duplicateCheck.duplicate.source === 'pending';
        return {
            levelFingerprint,
            pendingDuplicateMatch: isPending ? duplicateCheck.duplicate : null,
            hintAdditionTarget: isPending ? null : duplicateCheck.duplicate,
            step: {
                state: 'warn',
                details: isPending
                    ? 'This grid layout and win requirements are already waiting for review. Checking your hints against that submission…'
                    : 'This grid layout and win requirements match an already-published level. Checking for new hints to contribute…',
            },
        };
    }
    const warningLabels = (duplicateCheck?.warnings || []).map((source) => source === 'approved' ? 'approved levels' : 'pending queue');
    return {
        levelFingerprint,
        pendingDuplicateMatch: null,
        hintAdditionTarget: null,
        step: warningLabels.length
            ? { state: 'warn', details: ['No duplicate found in the collections that could be checked.', `Could not check: ${warningLabels.join(', ')}.`] }
            : { state: 'ok', details: 'No duplicate found in pending or approved levels' },
    };
}
