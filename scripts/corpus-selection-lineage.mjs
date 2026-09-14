const RANDOM_CORPUS_NAME = 'random-uniform-v1';

function history(level) {
    return Array.isArray(level?.provenance?.history) ? level.provenance.history : [];
}

function generatedEvents(level) {
    return history(level).filter(event => event?.action === 'generated');
}

function values(level, key) {
    return [...new Set(generatedEvents(level)
        .map(event => event?.detail?.[key])
        .filter(value => value != null && value !== ''))];
}

function generatedAt(level) {
    const times = generatedEvents(level)
        .map(event => Date.parse(event?.timestamp))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    return times.length ? times[0] : null;
}

function stress1Lineage(level) {
    const batch = level?.stressMeta?.generationBatch ?? null;
    const generatorVersions = values(level, 'generatorVersion');
    const corpusNames = values(level, 'corpusName');

    if (batch || generatorVersions.includes('1.0.0')) {
        return {
            stratum: 'c1-af-retained',
            selectionConditioning: ['hypothesis-driven-generation', 'square-grid-retention'],
            generationAncestry: batch ? `batch-${batch}` : 'generator-1.0.0',
            historicalOutcomeConditioning: 'none-known',
        };
    }
    if (corpusNames.includes(RANDOM_CORPUS_NAME) || generatorVersions.includes('1.1.0')) {
        return {
            stratum: 'c1-migrated-random-solver-positive',
            selectionConditioning: ['historical-production-success', 'corpus-migration', 'square-grid-retention'],
            generationAncestry: RANDOM_CORPUS_NAME,
            historicalOutcomeConditioning: 'historical-production-success',
        };
    }
    return {
        stratum: 'c1-unclassified',
        selectionConditioning: ['unknown'],
        generationAncestry: corpusNames[0] ?? generatorVersions[0] ?? null,
        historicalOutcomeConditioning: 'unknown',
    };
}

function stress2Lineage(level, metadata) {
    const generated = generatedAt(level);
    const appendTimes = (metadata?.appendHistory ?? [])
        .map(entry => Date.parse(entry?.appendedAt))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    const replacementStart = appendTimes[0] ?? null;

    if (generated != null && replacementStart != null) {
        if (generated < replacementStart) {
            return {
                stratum: 'c2-original-random-solver-negative-survivor',
                selectionConditioning: ['historical-production-failure', 'square-grid-retention'],
                generationAncestry: RANDOM_CORPUS_NAME,
                historicalOutcomeConditioning: 'historical-production-failure',
            };
        }
        return {
            stratum: 'c2-july11-replacement',
            selectionConditioning: ['replacement-generation-after-square-grid-cleanup'],
            generationAncestry: RANDOM_CORPUS_NAME,
            historicalOutcomeConditioning: 'none-known',
        };
    }

    return {
        stratum: 'c2-unclassified',
        selectionConditioning: ['unknown'],
        generationAncestry: values(level, 'corpusName')[0] ?? RANDOM_CORPUS_NAME,
        historicalOutcomeConditioning: 'unknown',
    };
}

/**
 * Current standing-corpus selection lineage established by the 2026-09-13 reconstruction audit.
 * This is offline evidence metadata only and must never become a cold-solver routing feature.
 */
export function classifyCorpusSelectionLineage(source, level, metadata = null) {
    const key = String(source ?? '').toLowerCase();
    if (key === 'stress1' || key === 'corpus1') return stress1Lineage(level);
    if (key === 'stress2' || key === 'corpus2') return stress2Lineage(level, metadata);
    if (key === 'published') {
        return {
            stratum: 'published-selection-history-mixed',
            selectionConditioning: ['publication/history not reconstructed as one prospective sample'],
            generationAncestry: level?.provenance?.origin ?? null,
            historicalOutcomeConditioning: 'unknown',
        };
    }
    if (key === 'envelope') {
        return {
            stratum: 'envelope-in-envelope-generated',
            selectionConditioning: ['in-envelope challenge generation'],
            generationAncestry: values(level, 'corpusName')[0] ?? level?.stressMeta?.corpusName ?? null,
            historicalOutcomeConditioning: 'none-known',
        };
    }
    return {
        stratum: 'unclassified',
        selectionConditioning: ['unknown'],
        generationAncestry: values(level, 'corpusName')[0] ?? level?.provenance?.origin ?? null,
        historicalOutcomeConditioning: 'unknown',
    };
}

export function generatedTimestamp(level) {
    const value = generatedAt(level);
    return value == null ? null : new Date(value).toISOString();
}
