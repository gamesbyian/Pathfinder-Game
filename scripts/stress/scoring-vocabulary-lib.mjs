export const SCORING_WEIGHT_FIELDS = Object.freeze([
    'goalAttractionWeight',
    'objectiveAttractionWeight',
    'finishCommitmentWeight',
    'perimeterBiasWeight',
    'mustPassUrgencyWeight',
    'mustCrossUrgencyWeight',
    'mustTurnUrgencyWeight',
    'mustTurnExitGuidanceWeight',
    'portalParityGuidanceWeight',
    'intersectionSetupWeight',
    'antiDitherWeight',
    'revisitPenaltyWeight',
]);

export const ZERO_PROFILE_ID = '__score-vocabulary-zero__';
export const BASIS_PROFILE_PREFIX = '__score-vocabulary-basis__:';

export function zeroScoringProfile() {
    return Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, 0]));
}

export function basisScoringProfiles() {
    const zero = zeroScoringProfile();
    return SCORING_WEIGHT_FIELDS.map(field => ({
        id: `${BASIS_PROFILE_PREFIX}${field}`,
        field,
        scoringProfile: { ...zero, [field]: 1 },
        orderingBias: null,
    }));
}

export function scoreVectorFromBasisScores(zeroScore, basisScores) {
    const components = {};
    for (const field of SCORING_WEIGHT_FIELDS) {
        if (!Object.hasOwn(basisScores, field)) throw new Error(`missing basis score for ${field}`);
        components[field] = basisScores[field] - zeroScore;
    }
    return { intercept: zeroScore, components };
}

export function resolvedProfileWeight(profile, field) {
    return profile?.[field] ?? 1;
}

export function reconstructScore(vector, profile) {
    let score = vector.intercept;
    for (const field of SCORING_WEIGHT_FIELDS) {
        score += resolvedProfileWeight(profile, field) * vector.components[field];
    }
    return score;
}

export function maxWeightedComponentDelta(a, b) {
    let delta = 0;
    for (const field of SCORING_WEIGHT_FIELDS) {
        delta = Math.max(delta, Math.abs(a.components[field] - b.components[field]));
    }
    return delta;
}

export function maxVectorDelta(a, b) {
    return Math.max(Math.abs(a.intercept - b.intercept), maxWeightedComponentDelta(a, b));
}

export function vectorsEqual(a, b, epsilon = 1e-9) {
    return maxVectorDelta(a, b) <= epsilon;
}

/**
 * Analyze one sibling set. `candidateVectors` is a Map(candidateKey -> score vector) and
 * `knownContinuationChildren` is an iterable of candidates known to lie on at least one valid
 * stored solution. Other legal children are deliberately *unlabelled*: a collision with one is
 * evidence that the scorer vocabulary cannot distinguish the alternatives, not evidence that the
 * alternative is dead.
 *
 * A weight-invariant pair has identical values for all twelve tunable components. Its pairwise
 * score margin is therefore the intercept margin under *every* possible reweighting of those
 * twelve fields. The intercept includes profile-independent scoreMove contributions (for example
 * fixed flipping-filter approach urgency) because the basis uses a true all-zero profile.
 */
export function analyzeVocabularyDecision(candidateVectors, knownContinuationChildren, epsilon = 1e-9) {
    const known = [...knownContinuationChildren].filter(key => candidateVectors.has(key));
    const knownSet = new Set(known);
    const alternatives = [...candidateVectors.keys()].filter(key => !knownSet.has(key));
    const collisions = [];
    const weightInvariantPairs = [];
    let bestKnownSeparation = Infinity;
    let bestKnownWeightedSeparation = Infinity;

    for (const knownKey of known) {
        for (const alternativeKey of alternatives) {
            const knownVector = candidateVectors.get(knownKey);
            const alternativeVector = candidateVectors.get(alternativeKey);
            const weightedDelta = maxWeightedComponentDelta(knownVector, alternativeVector);
            const interceptMargin = knownVector.intercept - alternativeVector.intercept;
            const fullDelta = Math.max(Math.abs(interceptMargin), weightedDelta);
            bestKnownSeparation = Math.min(bestKnownSeparation, fullDelta);
            bestKnownWeightedSeparation = Math.min(bestKnownWeightedSeparation, weightedDelta);

            if (weightedDelta <= epsilon) {
                const relation = Math.abs(interceptMargin) <= epsilon
                    ? 'tie'
                    : interceptMargin > 0 ? 'known-preferred' : 'alternative-preferred';
                weightInvariantPairs.push({
                    knownKey,
                    alternativeKey,
                    maxWeightedComponentDelta: weightedDelta,
                    interceptMargin,
                    relation,
                });
                if (relation === 'tie') {
                    collisions.push({
                        knownKey,
                        alternativeKey,
                        maxComponentDelta: fullDelta,
                    });
                }
            }
        }
    }

    const alternativePreferredPairs = weightInvariantPairs.filter(row => row.relation === 'alternative-preferred');
    return {
        knownContinuationCount: known.length,
        alternativeCount: alternatives.length,
        exactVocabularyCollision: collisions.length > 0,
        collisions,
        weightInvariant: weightInvariantPairs.length > 0,
        weightInvariantPairs,
        weightInvariantAlternativePreferred: alternativePreferredPairs.length > 0,
        weightInvariantAlternativePreferredPairs: alternativePreferredPairs,
        minKnownAlternativeVectorDelta: Number.isFinite(bestKnownSeparation) ? bestKnownSeparation : null,
        minKnownAlternativeWeightedComponentDelta: Number.isFinite(bestKnownWeightedSeparation) ? bestKnownWeightedSeparation : null,
    };
}

/**
 * Descriptive class join for a completed scorer-vocabulary run. Decision rows within a level are
 * correlated, so this deliberately reports coverage and both level/decision rates without turning
 * either into a significance test. Class membership comes from the residual atlas, never from the
 * diagnostic itself.
 */
export function summarizeVocabularyByAtlasClass(levelRows, atlasRows, requestedClasses = [4, 5]) {
    const wanted = new Set(requestedClasses.map(Number));
    const atlasClassById = new Map((atlasRows ?? []).map(row => [String(row.id), Number(row.primaryClass)]));
    const summaries = {};
    for (const classId of wanted) {
        summaries[classId] = {
            primaryClass: classId,
            atlasLevels: 0,
            scoredLevels: 0,
            levelsWithCollision: 0,
            levelsWithWeightInvariantPair: 0,
            levelsWithWeightInvariantAlternativePreferred: 0,
            decisionsVisited: 0,
            branchingDecisions: 0,
            collisionDecisions: 0,
            collisionPairs: 0,
            weightInvariantDecisions: 0,
            weightInvariantPairs: 0,
            weightInvariantAlternativePreferredDecisions: 0,
            weightInvariantAlternativePreferredPairs: 0,
            absentKnownContinuation: 0,
        };
    }
    for (const row of atlasRows ?? []) {
        const classId = Number(row.primaryClass);
        if (wanted.has(classId)) summaries[classId].atlasLevels++;
    }
    for (const row of levelRows ?? []) {
        const classId = atlasClassById.get(String(row.id));
        if (!wanted.has(classId)) continue;
        const summary = summaries[classId];
        summary.scoredLevels++;
        if ((row.exactVocabularyCollisionDecisions ?? 0) > 0) summary.levelsWithCollision++;
        if ((row.weightInvariantDecisions ?? 0) > 0) summary.levelsWithWeightInvariantPair++;
        if ((row.weightInvariantAlternativePreferredDecisions ?? 0) > 0) summary.levelsWithWeightInvariantAlternativePreferred++;
        summary.decisionsVisited += row.decisionsVisited ?? 0;
        summary.branchingDecisions += row.branchingDecisions ?? 0;
        summary.collisionDecisions += row.exactVocabularyCollisionDecisions ?? 0;
        summary.collisionPairs += row.exactVocabularyCollisionPairs ?? 0;
        summary.weightInvariantDecisions += row.weightInvariantDecisions ?? 0;
        summary.weightInvariantPairs += row.weightInvariantPairs ?? 0;
        summary.weightInvariantAlternativePreferredDecisions += row.weightInvariantAlternativePreferredDecisions ?? 0;
        summary.weightInvariantAlternativePreferredPairs += row.weightInvariantAlternativePreferredPairs ?? 0;
        summary.absentKnownContinuation += row.absentKnownContinuation ?? 0;
    }
    for (const summary of Object.values(summaries)) {
        summary.levelCoverage = summary.atlasLevels ? summary.scoredLevels / summary.atlasLevels : null;
        summary.levelCollisionRate = summary.scoredLevels ? summary.levelsWithCollision / summary.scoredLevels : null;
        summary.decisionCollisionRate = summary.branchingDecisions ? summary.collisionDecisions / summary.branchingDecisions : null;
        summary.levelWeightInvariantAlternativePreferredRate = summary.scoredLevels
            ? summary.levelsWithWeightInvariantAlternativePreferred / summary.scoredLevels : null;
        summary.decisionWeightInvariantAlternativePreferredRate = summary.branchingDecisions
            ? summary.weightInvariantAlternativePreferredDecisions / summary.branchingDecisions : null;
    }
    const control = summaries[4];
    const frontier = summaries[5];
    return {
        classes: summaries,
        class5MinusClass4: control && frontier ? {
            levelCollisionRateDifference: control.levelCollisionRate == null || frontier.levelCollisionRate == null
                ? null : frontier.levelCollisionRate - control.levelCollisionRate,
            decisionCollisionRateDifference: control.decisionCollisionRate == null || frontier.decisionCollisionRate == null
                ? null : frontier.decisionCollisionRate - control.decisionCollisionRate,
            levelWeightInvariantAlternativePreferredRateDifference:
                control.levelWeightInvariantAlternativePreferredRate == null || frontier.levelWeightInvariantAlternativePreferredRate == null
                    ? null : frontier.levelWeightInvariantAlternativePreferredRate - control.levelWeightInvariantAlternativePreferredRate,
            decisionWeightInvariantAlternativePreferredRateDifference:
                control.decisionWeightInvariantAlternativePreferredRate == null || frontier.decisionWeightInvariantAlternativePreferredRate == null
                    ? null : frontier.decisionWeightInvariantAlternativePreferredRate - control.decisionWeightInvariantAlternativePreferredRate,
        } : null,
        interpretation: 'descriptive only; decisions are correlated within levels and stored-solution coverage can differ by class',
    };
}
