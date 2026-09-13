#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLevelFingerprintSource, LEVEL_FINGERPRINT_VERSION } from '../../modules/domain/level-fingerprint.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = [
    { key: 'published', file: 'data/levels.json' },
    { key: 'stress1', file: 'data/stress/stress-levels.json' },
    { key: 'stress2', file: 'data/stress/stress-levels-random.json' },
    { key: 'envelope', file: 'data/stress/stress-levels-envelope.json' },
];

function loadCorpus(spec) {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, spec.file), 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(levels)) throw new Error(`${spec.file}: missing levels array`);
    return { ...spec, parsed, levels };
}

function inc(obj, key) {
    const k = key == null || key === '' ? '(missing)' : String(key);
    obj[k] = (obj[k] || 0) + 1;
}

function sortedCounts(obj) {
    return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function summarizeProvenance(levels) {
    const origins = {}, methods = {}, generatorVersions = {}, corpusNames = {}, batches = {}, historyActions = {};
    let missingProvenance = 0;
    let missingHistory = 0;
    let missingId = 0;
    for (const level of levels) {
        if (typeof level?.id !== 'string' || level.id.length === 0) missingId++;
        const provenance = level?.provenance;
        if (!provenance) {
            missingProvenance++;
            continue;
        }
        inc(origins, provenance.origin);
        if (!Array.isArray(provenance.history) || provenance.history.length === 0) {
            missingHistory++;
            continue;
        }
        for (const event of provenance.history) {
            inc(methods, event?.method);
            inc(historyActions, event?.action);
            inc(generatorVersions, event?.detail?.generatorVersion);
            inc(corpusNames, event?.detail?.corpusName);
        }
        inc(batches, level?.stressMeta?.generationBatch);
    }
    return {
        missingId,
        missingProvenance,
        missingHistory,
        origins: sortedCounts(origins),
        methods: sortedCounts(methods),
        generatorVersions: sortedCounts(generatorVersions),
        corpusNames: sortedCounts(corpusNames),
        generationBatches: sortedCounts(batches),
        historyActions: sortedCounts(historyActions),
    };
}

function summarizeHeader(parsed) {
    if (Array.isArray(parsed)) return { representation: 'bare-array' };
    const pick = ['corpusId', 'corpusName', 'generatorVersion', 'generatedAt', 'masterSeed', 'description'];
    const out = { representation: 'object-with-levels' };
    for (const key of pick) if (parsed[key] !== undefined) out[key] = parsed[key];
    if (Array.isArray(parsed.appendHistory)) out.appendHistory = parsed.appendHistory;
    if (Array.isArray(parsed.batches)) out.batches = parsed.batches;
    if (parsed.design) out.design = parsed.design;
    return out;
}

const corpora = CORPORA.map(loadCorpus);
const idOwners = new Map();
const idCollisions = [];
const fingerprintOwners = new Map();

for (const corpus of corpora) {
    for (let index = 0; index < corpus.levels.length; index++) {
        const level = corpus.levels[index];
        const row = { corpus: corpus.key, index: index + 1, id: level?.id || null };
        if (row.id) {
            const key = row.id.toUpperCase();
            if (!idOwners.has(key)) idOwners.set(key, []);
            idOwners.get(key).push(row);
        }
        const fingerprint = getLevelFingerprintSource(level);
        if (!fingerprintOwners.has(fingerprint)) fingerprintOwners.set(fingerprint, []);
        fingerprintOwners.get(fingerprint).push(row);
    }
}

for (const owners of idOwners.values()) if (owners.length > 1) idCollisions.push(owners);
const duplicateGroups = [...fingerprintOwners.values()].filter(rows => rows.length > 1);
const crossCorpusDuplicateGroups = duplicateGroups.filter(rows => new Set(rows.map(r => r.corpus)).size > 1);
const withinCorpusDuplicateGroups = duplicateGroups.filter(rows => new Set(rows.map(r => r.corpus)).size === 1);

function duplicateSummary(groups) {
    const rows = groups.flat();
    const byCorpus = {};
    for (const row of rows) inc(byCorpus, row.corpus);
    return {
        groups: groups.length,
        rows: rows.length,
        byCorpus: sortedCounts(byCorpus),
        examples: groups.slice(0, 25),
    };
}

const output = {
    generatedAt: new Date().toISOString(),
    fingerprintVersion: LEVEL_FINGERPRINT_VERSION,
    totalRows: corpora.reduce((sum, c) => sum + c.levels.length, 0),
    corpora: Object.fromEntries(corpora.map(c => [c.key, {
        file: c.file,
        rows: c.levels.length,
        header: summarizeHeader(c.parsed),
        provenance: summarizeProvenance(c.levels),
    }])),
    identity: {
        idCollisionGroups: idCollisions.length,
        idCollisionRows: idCollisions.flat().length,
        idCollisionExamples: idCollisions.slice(0, 25),
    },
    exactStructure: {
        duplicateGroups: duplicateSummary(duplicateGroups),
        crossCorpus: duplicateSummary(crossCorpusDuplicateGroups),
        withinCorpus: duplicateSummary(withinCorpusDuplicateGroups),
    },
};

console.log(JSON.stringify(output, null, 2));
