#!/usr/bin/env node
// Completed, idempotent provenance backfill for the published and two stress corpora. Published
// levels use the retired classifier report only when provenance is still missing; stress levels
// derive certain procedural provenance from stressMeta. Existing non-empty provenance is preserved.
import path from 'node:path';
import fs from 'node:fs';
import { stringifyCorpusJson } from './level-json-format.mjs';

const { makeLevelProvenance, makeProvenanceEntry } = await import('../modules/domain/level-provenance-types.js');

const root = new URL('..', import.meta.url).pathname;

const TIER_TO_ACTOR_CONFIDENCE = {
    'certain-human': { actor: 'human', confidence: 'certain' },
    'certain-ai': { actor: 'ai', confidence: 'certain' },
    'uncertain-likely-ai': { actor: 'ai', confidence: 'likely' },
    unknown: { actor: 'unknown', confidence: 'unverified' },
};

function hasProvenance(level) {
    return !!(level.provenance && Array.isArray(level.provenance.history) && level.provenance.history.length > 0);
}

function backfillPublished() {
    const file = path.join(root, 'data', 'levels.json');
    const reportFile = path.join(root, 'reports', 'level-corpus-provenance-latest.json');
    const levels = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (levels.every(hasProvenance)) {
        console.log('published: all levels already have provenance, nothing to do.');
        return;
    }
    if (!fs.existsSync(reportFile)) {
        throw new Error(
            `${reportFile} is gone (retired) but some published levels still lack provenance -- ` +
            'this script can no longer classify them; provenance must be stamped some other way.',
        );
    }
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const byLevelNumber = new Map(report.published.levels.map((l) => [l.levelNumber, l]));

    let changed = 0;
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        if (hasProvenance(level)) continue;
        const levelNumber = i + 1;
        const classification = byLevelNumber.get(levelNumber);
        const tier = classification?.tier ?? 'unknown';
        const { actor, confidence } = TIER_TO_ACTOR_CONFIDENCE[tier] ?? TIER_TO_ACTOR_CONFIDENCE.unknown;
        const entry = makeProvenanceEntry(actor, 'backfilled', {
            method: 'level-corpus-provenance-classifier',
            detail: {
                tier,
                reason: classification?.reason ?? 'no classification available',
                reportGeneratedAt: report.generatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        level.provenance = makeLevelProvenance([entry], confidence);
        changed++;
    }

    fs.writeFileSync(file, stringifyCorpusJson(levels));
    console.log(`published: backfilled ${changed} of ${levels.length} levels`);
}

function backfillStressCorpus(file, label, methodName) {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const levels = data.levels;
    const fileGeneratedAt = data.generatedAt ?? new Date().toISOString();

    let changed = 0;
    for (const level of levels) {
        if (hasProvenance(level)) continue;
        const meta = level.stressMeta ?? {};
        const detail = { ...meta, backfilled: true };
        delete detail.witnessSolution; // large and irrelevant to provenance
        const entry = makeProvenanceEntry('procedural', 'generated', {
            method: methodName,
            detail,
            timestamp: fileGeneratedAt,
        });
        level.provenance = makeLevelProvenance([entry], 'certain');
        changed++;
    }

    fs.writeFileSync(file, stringifyCorpusJson(data));
    console.log(`${label}: backfilled ${changed} of ${levels.length} levels`);
}

backfillPublished();
backfillStressCorpus(
    path.join(root, 'data', 'stress', 'stress-levels.json'),
    'stress-corpus-1',
    'stress-corpus-generator',
);
backfillStressCorpus(
    path.join(root, 'data', 'stress', 'stress-levels-random.json'),
    'stress-corpus-2',
    'stress-corpus-random-generator',
);
