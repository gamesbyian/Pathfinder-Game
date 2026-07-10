/**
 * Machine-readable level corpus provenance (docs/level-corpus-provenance.md's "Machine-readable
 * phase"). Read that doc before using this for anything solver-heuristic-related — it explains
 * *why* these facts matter for overfitting risk; this module only encodes the facts themselves,
 * as pure, side-effect-free classification functions over data the caller already has in hand
 * (this module does no I/O — see scripts/level-provenance-report.mjs for the reporting CLI that
 * reads the actual corpus/ratings files and calls into these).
 *
 * @typedef {'certain-human'|'certain-ai'|'unknown'|'uncertain-likely-ai'} PublishedProvenanceTier
 * @typedef {'solver-aware'|'solver-blind'|'unknown'} AdversarialIntent
 * @typedef {'high'|'medium'|'low'|'unknown'} OverfitRisk
 */

// ─── Published corpus (data/levels.json) ────────────────────────────────────

export const PUBLISHED_HUMAN_THRESHOLD_LEVEL = 130;

/**
 * Classifies a published-corpus level's authorship confidence from its level number and rating
 * tags. Precedence (most to least certain claim): `great` tag -> certain-human; `common` tag ->
 * certain-ai; level number above the threshold -> certain-human, UNLESS `garbage`-tagged (an
 * explicit exception — authorship is not asserted for those); otherwise -> uncertain, ~80%
 * confidence AI-generated (one of 5 models, sporadic batches over ~8 months, no reconstructable
 * per-level attribution beyond that).
 *
 * @param {number} levelNumber
 * @param {string[]} [tags] - lowercased rating tags (predefined + custom) for this level; pass []
 *   or omit for a level with no known ratings.
 * @returns {{ tier: PublishedProvenanceTier, confidence: number|null, reason: string }}
 */
export function classifyPublishedLevelProvenance(levelNumber, tags = []) {
    const lower = tags.map(t => String(t).toLowerCase());
    const has = tag => lower.includes(tag);

    if (has('great')) return { tier: 'certain-human', confidence: 1, reason: "rated 'great'" };
    if (has('common')) return { tier: 'certain-ai', confidence: 1, reason: "rated 'common'" };

    if (levelNumber > PUBLISHED_HUMAN_THRESHOLD_LEVEL) {
        if (has('garbage')) {
            return {
                tier: 'unknown', confidence: null,
                reason: `level > ${PUBLISHED_HUMAN_THRESHOLD_LEVEL} but rated 'garbage' — the human-authorship default has an explicit exception for garbage-tagged levels`,
            };
        }
        return { tier: 'certain-human', confidence: 1, reason: `level > ${PUBLISHED_HUMAN_THRESHOLD_LEVEL}` };
    }

    return {
        tier: 'uncertain-likely-ai', confidence: 0.8,
        reason: `level <= ${PUBLISHED_HUMAN_THRESHOLD_LEVEL}, no certainty tag — ~80% confidence AI-generated (one of 5 models, sporadic batches over ~8 months; no reconstructable per-level model/batch attribution)`,
    };
}

// ─── Stress corpora (data/stress/stress-levels.json, data/stress/stress-levels-random.json) ──

// The one mechanic genuinely excluded from generation in BOTH stress corpora, per explicit
// instruction both times (see data/stress/README.md's "Guarantees").
export const STRESS_CORPUS_COVERAGE_GAPS = Object.freeze(['static-filters']);

// The solver-blind random corpus (and its 300 levels migrated into corpus 1) additionally never
// generated below 11x11, never used multiple gates, and skewed every present mechanic's count to
// the upper ~45% of its range — see data/stress/README.md's "Second corpus" section. These are
// real generation biases, not incidental gaps, so "solver-blind" here does not mean "unbiased."
export const RANDOM_CORPUS_COVERAGE_GAPS = Object.freeze([
    ...STRESS_CORPUS_COVERAGE_GAPS,
    'multi-gate',
    'grids-below-11x11',
    'low-object-density',
]);

/**
 * The six hypothesis-driven batches (docs/level-corpus-provenance.md §2 / data/stress/README.md's
 * "Batches" table). `overfitRisk` is this doc's own risk-tier judgment, not a field the generator
 * itself recorded: A and E were built by directly reading the solver's own weaknesses/policy, so
 * reusing them to validate a change after those specific mechanisms are refactored risks measuring
 * staleness, not robustness.
 * @type {Record<string, { theory: string, adversarialIntent: AdversarialIntent, overfitRisk: OverfitRisk }>}
 */
export const STRESS_BATCH_PROVENANCE = Object.freeze({
    A: { theory: 'historical-solver-pain', adversarialIntent: 'solver-aware', overfitRisk: 'high' },
    B: { theory: 'structural-complexity', adversarialIntent: 'solver-blind', overfitRisk: 'low' },
    C: { theory: 'deceptive-simplicity', adversarialIntent: 'solver-blind', overfitRisk: 'low' },
    D: { theory: 'novel-topology', adversarialIntent: 'solver-blind', overfitRisk: 'low' },
    E: { theory: 'anti-heuristic', adversarialIntent: 'solver-aware', overfitRisk: 'high' },
    F: { theory: 'wild-witness', adversarialIntent: 'solver-blind', overfitRisk: 'low' },
});

export const RANDOM_CORPUS_NAME = 'random-uniform-v1';

/**
 * Classifies a stress-corpus level's provenance from its `stressMeta`, joining
 * `generationBatch` (the six hypothesis-driven batches — present only on corpus 1's original 150)
 * or `corpusName` (the solver-blind random corpus — present on corpus 1's 300 migrated levels and
 * every corpus-2 level) against the lookup tables above. Read-only: never mutates `stressMeta`.
 *
 * @param {{ generationBatch?: string|null, corpusName?: string }|null|undefined} stressMeta
 * @returns {{
 *   source: 'stress-corpus-1-hypothesis'|'stress-corpus-random'|'unknown',
 *   batch: string|null, theory: string|null,
 *   adversarialIntent: AdversarialIntent, overfitRisk: OverfitRisk,
 *   coverageGaps: readonly string[],
 * }}
 */
export function classifyStressLevelProvenance(stressMeta) {
    const batch = stressMeta?.generationBatch;
    if (batch && STRESS_BATCH_PROVENANCE[batch]) {
        const { theory, adversarialIntent, overfitRisk } = STRESS_BATCH_PROVENANCE[batch];
        return { source: 'stress-corpus-1-hypothesis', batch, theory, adversarialIntent, overfitRisk, coverageGaps: STRESS_CORPUS_COVERAGE_GAPS };
    }
    if (stressMeta?.corpusName === RANDOM_CORPUS_NAME) {
        return { source: 'stress-corpus-random', batch: null, theory: null, adversarialIntent: 'solver-blind', overfitRisk: 'low', coverageGaps: RANDOM_CORPUS_COVERAGE_GAPS };
    }
    return { source: 'unknown', batch: null, theory: null, adversarialIntent: 'unknown', overfitRisk: 'unknown', coverageGaps: [] };
}
