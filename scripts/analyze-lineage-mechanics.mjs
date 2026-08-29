#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
const lineageFile = args.get('--lineage');
const levelsFile = args.get('--levels');
const out = args.get('--out');
if (!lineageFile || !levelsFile || !out) {
    throw new Error('usage: --lineage=<json> --levels=<json> --out=<json>');
}

const lineageBytes = readFileSync(lineageFile);
const levelBytes = readFileSync(levelsFile);
const lineage = JSON.parse(lineageBytes);
const levelDocument = JSON.parse(levelBytes);
const levels = Array.isArray(levelDocument) ? levelDocument : levelDocument.levels;
const byId = new Map(levels.map(level => [String(level.id), level]));
const median = values => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const featureOf = level => ({
    reqLen: Number(level.reqLen ?? 0),
    reqInt: Number(level.reqInt ?? 0),
    mustPassCount: level.mustPass?.length ?? 0,
    mustCrossCount: level.mustCross?.length ?? 0,
    flippingFilterCount: level.flippingFilters?.length ?? 0,
    portalCount: level.portals?.length ?? 0,
    blockCount: level.blocks?.length ?? 0,
    gooseCount: level.geese?.length ?? 0,
    falseGoalCount: level.falseGoals?.length ?? 0,
    navDensity: Number(level.stressMeta?.requiredPathCoverageRatio ?? level.stressMeta?.navDensity ?? NaN),
    predictedChallenge: Number(level.stressMeta?.predictedSolverChallenge ?? NaN),
});
const rows = lineage.scoreWidthForensics.map(row => {
    const level = byId.get(String(row.levelId));
    if (!level) throw new Error(`missing level ${row.levelId}`);
    return {
        levelId: row.levelId,
        classification: row.classification,
        group: String(row.classification).startsWith('A-') ? 'clearly-mis-ranked' : 'other-score-width',
        solved: row.solved,
        scoreMarginToCutoff: row.scoreMarginToCutoff,
        candidatePoolSize: row.candidatePoolSize,
        normalizedDepth: row.normalizedDepth,
        featureTags: [...(level.stressMeta?.featureTags ?? [])].sort(),
        features: featureOf(level),
    };
});
const duplicates = rows.map(row => row.levelId).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicates.length) throw new Error(`duplicate forensic IDs: ${[...new Set(duplicates)].join(',')}`);

const featureNames = Object.keys(rows[0]?.features ?? {});
const groups = Object.fromEntries(['clearly-mis-ranked', 'other-score-width'].map(name => {
    const selected = rows.filter(row => row.group === name);
    return [name, {
        levels: selected.length,
        solved: selected.filter(row => row.solved).length,
        medianScoreMargin: median(selected.map(row => row.scoreMarginToCutoff)),
        medianCandidatePool: median(selected.map(row => row.candidatePoolSize)),
        medianNormalizedDepth: median(selected.map(row => row.normalizedDepth)),
        featureMedians: Object.fromEntries(featureNames.map(feature =>
            [feature, median(selected.map(row => row.features[feature]))])),
    }];
}));
const tags = [...new Set(rows.flatMap(row => row.featureTags))].sort().map(tag => {
    const clearlyMisRanked = rows.filter(row => row.group === 'clearly-mis-ranked');
    const other = rows.filter(row => row.group === 'other-score-width');
    const clearlyCount = clearlyMisRanked.filter(row => row.featureTags.includes(tag)).length;
    const otherCount = other.filter(row => row.featureTags.includes(tag)).length;
    const clearlyPrevalence = clearlyCount / clearlyMisRanked.length;
    const otherPrevalence = otherCount / other.length;
    return {
        tag,
        clearlyMisRanked: { count: clearlyCount, total: clearlyMisRanked.length, prevalence: clearlyPrevalence },
        other: { count: otherCount, total: other.length, prevalence: otherPrevalence },
        prevalenceRatio: otherPrevalence === 0 ? (clearlyPrevalence > 0 ? null : 1) : clearlyPrevalence / otherPrevalence,
        nominated: clearlyCount >= 3 && otherCount >= 3
            && (clearlyPrevalence >= 2 * otherPrevalence || otherPrevalence >= 2 * clearlyPrevalence),
    };
});
const result = {
    schemaVersion: 1,
    evidenceClass: 'offline-observational',
    inputs: {
        lineageFile,
        lineageSha256: createHash('sha256').update(lineageBytes).digest('hex'),
        levelsFile,
        levelsSha256: createHash('sha256').update(levelBytes).digest('hex'),
    },
    denominators: {
        forensicRows: rows.length,
        uniqueLevelIds: new Set(rows.map(row => row.levelId)).size,
        parentFamilyIdentityAvailable: false,
    },
    groups,
    tags,
    nominatedTags: tags.filter(tag => tag.nominated).map(tag => tag.tag),
    limitations: [
        'Stored winning labels are survivorship-biased and incomplete.',
        'No parent-family identity is present in the lineage artifact, so rows cannot be family-clustered.',
        'Association cannot establish a production routing rule or a causal score defect.',
    ],
    rows,
};
writeFileSync(out, `${JSON.stringify(result)}\n`);
console.log(`Analyzed ${rows.length} forensic rows; nominated tags=${result.nominatedTags.join(',') || '(none)'}`);
