#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readLevelsWithHints } from './level-data-io.mjs';
import { loadCorpus } from './corpus-query-lib.mjs';
import { buildFamilyIndex } from './family-index-lib.mjs';
import { auditTrackedProfileLibrary } from './cross-resource-profile-integrity.mjs';
import {
    analyzeLevelObservability,
    familyCoverageFromIndex,
    summarizeCrossResourceObservability,
} from './cross-resource-observability-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = process.cwd();
const corpusSpecs = [
    { source: 'published', file: 'data/levels.json', profile: 'reports/stress/solution-profile-published.json' },
    { source: 'stress1', file: 'data/stress/stress-levels.json', profile: 'reports/stress/solution-profile-corpus1.json' },
    { source: 'stress2', file: 'data/stress/stress-levels-random.json', profile: null },
];

const loaded = corpusSpecs.map(spec => {
    const corpus = loadCorpus(root, spec.source);
    const levels = readLevelsWithHints(path.resolve(root, spec.file));
    const profileLibrary = spec.profile
        ? JSON.parse(readFileSync(path.resolve(root, spec.profile), 'utf8'))
        : null;
    return { ...spec, metadata: corpus.metadata, levels, profileLibrary };
});

const currentLevelIds = loaded.flatMap(corpus => corpus.levels.map(level => level.id));
const collisions = currentLevelIds.filter((id, index) => currentLevelIds.indexOf(id) !== index);
if (collisions.length) throw new Error(`cross-resource join requires globally unique current level ids; duplicates: ${[...new Set(collisions)].join(', ')}`);

const profileIntegrity = Object.fromEntries(loaded
    .filter(corpus => corpus.profileLibrary)
    .map(corpus => [corpus.source, auditTrackedProfileLibrary(corpus.profileLibrary, corpus.levels, {
        sourcePath: corpus.file,
    })]));

const familyRootArg = value('variant-family-dataset-root');
let familyIndex = null;
let familyIndexMeta = { loaded: false, reason: 'variant-family-dataset-root-not-supplied' };
if (familyRootArg) {
    const familyRoot = path.resolve(familyRootArg);
    const familyDir = path.join(familyRoot, 'data', 'families');
    if (!existsSync(familyDir)) throw new Error(`variant-family dataset root has no data/families: ${familyRoot}`);
    familyIndex = buildFamilyIndex(familyRoot);
    familyIndexMeta = {
        loaded: true,
        root: familyRoot,
        counts: familyIndex.counts,
        evaluationEvidenceLoaded: (familyIndex.counts?.evidenceArtifacts ?? 0) > 0,
        note: (familyIndex.counts?.evidenceArtifacts ?? 0) > 0
            ? 'family generation and evaluation evidence indexed'
            : 'family manifests indexed; evaluation evidence unavailable in this checkout',
    };
}

const familyCoverage = familyCoverageFromIndex(familyIndex, currentLevelIds);
const rows = loaded.flatMap(corpus => corpus.levels.map(level => analyzeLevelObservability({
    source: corpus.source,
    level,
    metadata: corpus.metadata,
    familyCoverage,
})));
const summary = summarizeCrossResourceObservability(rows, familyIndexMeta, Number(value('case-limit') ?? 25));
summary.generatedAt = new Date().toISOString();
summary.profileIntegrity = profileIntegrity;
summary.population = Object.fromEntries(loaded.map(corpus => [corpus.source, {
    file: corpus.file,
    levels: corpus.levels.length,
    trackedProfile: corpus.profile,
    generationMetadata: corpus.metadata ? {
        generatedAt: corpus.metadata.generatedAt ?? null,
        generatorVersion: corpus.metadata.generatorVersion ?? null,
        appendHistory: corpus.metadata.appendHistory ?? null,
    } : null,
} ]));
summary.method = {
    corpusSelection: 'scripts/corpus-selection-lineage.mjs',
    hintProvenance: 'scripts/stress/provenance-source-taxonomy.mjs',
    familyIndex: 'scripts/family-index-lib.mjs',
    profileIntegrity: 'scripts/cross-resource-profile-integrity.mjs',
    profileInterpretation: 'support shape is derived from the same stored hint sample consumed by Solution Profiles; tracked published/C1 profile rows are independently checked against current hint/path/chronology support; no latent whole-space completeness claim',
};

function writeJson(target, data) {
    const resolved = path.resolve(target);
    mkdirSync(path.dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`);
    return resolved;
}

const out = value('out');
const rowsOut = value('rows-out');
if (out) summary.output = writeJson(out, summary);
if (rowsOut) summary.rowsOutput = writeJson(rowsOut, { schemaVersion: 1, generatedAt: summary.generatedAt, rows });
console.log(JSON.stringify(summary, null, 2));
