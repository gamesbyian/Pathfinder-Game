#!/usr/bin/env node
/**
 * Read-only bridge from replayable search-loss capsules to the persisted hint atlas.
 *
 * This produces one-sided positive support only. NOT_OBSERVED means that no stored accepted path
 * shares the reconstructed prefix; it must never be interpreted as DEAD/UNSAT or all-basin loss.
 *
 * Usage:
 *   node scripts/search-loss-known-support.mjs \
 *     --capture=reports/stress/search-loss-evidence/.../capture.json \
 *     [--levels=data/levels.json] [--parent=P00001] [--out=tmp/known-support.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLevelsWithHints } from './level-data-io.mjs';
import { mustCrossKeysOf } from '../modules/domain/hint-novelty.ts';
import { structuralSolutionFamilySignature } from '../modules/domain/path-features.ts';
import { reconstructSearchLossPath, validateSearchLossCapture } from './solver-search-loss-evidence-lib.mjs';
import { joinSearchLossToKnownHintSupport } from './search-loss-known-support-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));

const captureFile = args.get('capture');
const levelsFile = args.get('levels') ?? 'data/levels.json';
const parentFilter = args.get('parent') ?? null;
const outFile = args.get('out') ?? null;

if (!captureFile) {
    console.error('Usage: node scripts/run-bundled.mjs scripts/search-loss-known-support.mjs -- --capture=<capture.json> [--levels=<levels.json>] [--parent=<id>] [--out=<json>]');
    process.exit(2);
}

const capture = validateSearchLossCapture(JSON.parse(readFileSync(captureFile, 'utf8')));
const filteredCapture = parentFilter
    ? { ...capture, capsules: capture.capsules.filter(row => String(row.parentId) === parentFilter) }
    : capture;

const levels = readLevelsWithHints(levelsFile);
const levelByKey = new Map();
levels.forEach((level, index) => {
    const key = String((typeof level?.id === 'string' && level.id) ? level.id : index + 1);
    levelByKey.set(key, level);
});
function levelFor(parentId) {
    return levelByKey.get(String(parentId)) ?? null;
}
function hintsFor(parentId) {
    return levelFor(parentId)?.hintRecords ?? [];
}
function familySignatureFor(parentId) {
    const level = levelFor(parentId);
    if (!level) return null;
    const mcKeys = mustCrossKeysOf(level);
    return path => structuralSolutionFamilySignature(path, mcKeys);
}

const joined = joinSearchLossToKnownHintSupport(filteredCapture, {
    resolvePrefix(capsule) {
        try {
            if (capsule?.reconstructability?.kind !== 'inline-exact-prefix') return null;
            return reconstructSearchLossPath(capsule);
        } catch {
            return null;
        }
    },
    resolveHints: hintsFor,
    resolveFamilySignature: familySignatureFor,
});

const report = {
    schemaVersion: 1,
    kind: 'pathfinder-search-loss-known-hint-support',
    sourceCapture: captureFile,
    levels: levelsFile,
    populationIdentity: capture.population?.populationIdentity ?? null,
    semantics: {
        present: 'stored referee-valid hint path shares this exact prefix',
        notObserved: 'no stored hint shares this prefix; NOT evidence of DEAD or complete basin loss',
        independentUnit: 'parent level',
        structuralFamily: 'canonical structuralSolutionFamilySignature(path, mustCrossKeysOf(level)); sampled atlas families, not exhaustive latent basins',
    },
    ...joined,
};

const json = JSON.stringify(report, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`search-loss-known-support: wrote ${report.rows.length} capsule row(s) to ${outFile}`);
} else {
    process.stdout.write(json);
}
