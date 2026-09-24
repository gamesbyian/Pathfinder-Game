/**
 * Canonical execution-reproducibility mode classification
 * (docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 3.3/K).
 *
 * Answers "what reproducibility contract does this execution promise?" -- a different question from
 * the canonical solver-request projection ("were these solver requests equal?") and from per-attempt
 * effective-input identity ("which exact attempt/seed produced this path?"). Two executions under the
 * SAME reproducibility mode may still be pathwise different for reasons that mode's own contract
 * allows -- first-success-race's scheduling-dependent winner being the clearest case. The #1996
 * determinism audit's point is that a path difference is only suspicious when the compared
 * reproducibility mode promises path stability under the compared input identity; this classification
 * is what lets that audit ask the right question per execution instead of one blanket assumption.
 *
 * `backend` is a real, load-bearing input, not decoration: `first-success-race` and
 * `externally-determined` cannot be derived from `schedulerMode` alone (race.mjs only ever races the
 * 'production' scheduler ladder -- see toRaceLevelOpts's own schedulerMode guard -- so a raced
 * execution and an ordinary sequential 'production' execution are otherwise indistinguishable by
 * schedulerMode). No current producer threads a `backend` value through yet; that wiring is later,
 * smaller, per-producer work. This module only owns the classification rule itself, so that wiring
 * has one place to call instead of reinventing the rule per producer.
 */

/** @type {readonly ['direct', 'webWorker', 'raced', 'external']} */
export const EXECUTION_BACKENDS = Object.freeze(['direct', 'webWorker', 'raced', 'external']);

/** @type {readonly ['deterministic-work', 'first-success-race', 'historical-wall-clock-sensitive', 'externally-determined', 'unknown']} */
export const REPRODUCIBILITY_MODES = Object.freeze([
    'deterministic-work',
    'first-success-race',
    'historical-wall-clock-sensitive',
    'externally-determined',
    'unknown',
]);

/**
 * @param {{schedulerMode?: string | null, backend?: string | null}} [input]
 * @returns {typeof REPRODUCIBILITY_MODES[number]}
 */
export function classifyReproducibilityMode({ schedulerMode = null, backend = null } = {}) {
    // External/non-native solver evidence (e.g. CP-SAT) is never determined by this repository's own
    // scheduler at all, regardless of any schedulerMode label an adapter might carry alongside it.
    if (backend === 'external') return 'externally-determined';

    // race.mjs's first-success-wins pool: documented as never promising stable winner identity, and
    // this is a wall-clock/scheduling property of the BACKEND, not of schedulerMode (which race.mjs
    // requires to be 'production' anyway) -- checked before schedulerMode for that reason.
    if (backend === 'raced') return 'first-success-race';

    // The historical multi-pass wall-clock-budgeted scheduler: plan section K's own named example of a
    // reproducibility contract distinct from ordinary node/work-budgeted determinism.
    if (schedulerMode === 'legacy-latency-portfolio-experiment') return 'historical-wall-clock-sensitive';

    // Direct on-thread execution and the Web Worker transport run the identical solveLevel()
    // orchestration (structured-clone only relocates it to another thread; see
    // modules/solver/solver-worker-client.ts), so both promise the same node/work-budgeted
    // determinism under the 'production'/'static-portfolio' schedulers.
    if ((schedulerMode === 'production' || schedulerMode === 'static-portfolio')
        && (backend === 'direct' || backend === 'webWorker')) {
        return 'deterministic-work';
    }

    // No known producer currently threads `backend` through at all -- absence is a genuine unknown,
    // not a default to assume, per this plan's historical-missingness doctrine (section 10.2): a
    // brand-new dimension with zero historical producers recording it must not be silently guessed at.
    return 'unknown';
}
