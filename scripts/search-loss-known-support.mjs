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

import { readLevelHints } from './level-data-io.mjs';
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
    console.error('Usage: node scripts/search-loss-known-support.mjs --capture=<capture.json> [--levels=<levels.json>] [--parent=<id>] [--out=<json>]');
    process.exit(2);
}

const capture = validateSearchLossCapture(JSON.parse(readFileSync(captureFile, 'utf8')));
const filteredCapture = parentFilter
    ? { ...capture, capsules: capture.capsules.filter(row => String(row.parentId) === parentFilter) }
    : capture;

const hintCache = new Map();
function hintsFor(parentId) {
    const key = String(parentId);
    if (!hintCache.has(key)) hintCache.set(key, readLevelHints(levelsFile, key));
    return hintCache.get(key);
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
