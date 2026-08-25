#!/usr/bin/env node
/** Merge hint files captured by solver-workflow artifacts into the checked-out canonical store.
 *
 * Solver jobs may run on any ref. This script is run later from a checkout of main. Incoming files
 * are merged by path, provenance is deduplicated by the repo's canonical discovery-event identity,
 * and every incoming path is referee-validated before any file is written. This keeps evidence
 * retention independent from the ref that produced it and avoids last-writer-wins loss when several
 * shards/runs rediscover one level.
 *
 * Usage: node scripts/run-bundled.mjs scripts/merge-hint-artifacts.mjs -- \
 *   --staging-dir=artifact-staging
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseHintFileContents, stringifyHints } from './level-data-io.mjs';
import { mergeHints } from '../modules/domain/hint-types.ts';
import { provenanceEventIdentity } from './hint-provenance-identity.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [key, ...rest] = a.split('=');
    return [key, rest.join('=')];
}));
const root = path.resolve(new URL('..', import.meta.url).pathname);
const stagingDir = path.resolve(args.get('--staging-dir') || 'artifact-staging');
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const CORPORA = new Map([
    ['hints', path.join(root, 'data/stress/stress-levels.json')],
    ['hints-random', path.join(root, 'data/stress/stress-levels-random.json')],
]);

const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}
function dedupeSemantic(hints) {
    return hints.map(hint => {
        const seen = new Set();
        const provenance = [];
        for (const event of hint.provenance || []) {
            const key = provenanceEventIdentity(event);
            if (seen.has(key)) continue;
            seen.add(key);
            provenance.push(event);
        }
        return { path: hint.path, provenance };
    });
}
function corpusIndex(corpusPath) {
    const raw = JSON.parse(readFileSync(corpusPath, 'utf8'));
    const levels = Array.isArray(raw) ? raw : raw.levels;
    if (!Array.isArray(levels)) throw new Error(`${corpusPath}: expected levels array`);
    return new Map(levels.map((level, i) => [String(level.id || i + 1), { raw: level, index: i }]));
}
const indexes = new Map([...CORPORA].map(([dir, corpus]) => [dir, corpusIndex(corpus)]));

const incomingByTarget = new Map();
for (const file of walk(stagingDir)) {
    const normalized = file.split(path.sep).join('/');
    const match = normalized.match(/\/data\/stress\/(hints(?:-random)?)\/([^/]+\.json)$/u);
    if (!match || !CORPORA.has(match[1])) continue;
    const key = `${match[1]}/${match[2]}`;
    const list = incomingByTarget.get(key) || [];
    list.push(file);
    incomingByTarget.set(key, list);
}

let filesChanged = 0;
let incomingFiles = 0;
let incomingPaths = 0;
let incomingProvenance = 0;
for (const [key, sources] of [...incomingByTarget.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [hintDir, fileName] = key.split('/');
    const levelKey = fileName.slice(0, -5);
    const levelEntry = indexes.get(hintDir).get(levelKey);
    if (!levelEntry) throw new Error(`${key}: no matching level in ${CORPORA.get(hintDir)}`);
    const level = parseRawLevel(levelEntry.raw, levelEntry.index);
    if (!level) throw new Error(`${key}: canonical level cannot be parsed`);

    let mergedIncoming = [];
    for (const source of sources.sort()) {
        const parsed = JSON.parse(readFileSync(source, 'utf8'));
        const hints = parseHintFileContents(parsed, source);
        incomingFiles += 1;
        incomingPaths += hints.length;
        incomingProvenance += hints.reduce((sum, h) => sum + (h.provenance?.length || 0), 0);
        for (const hint of hints) {
            const verdict = validateCandidatePath(level, hint.path);
            if (!verdict.ok) throw new Error(`${source}: referee rejected ${levelKey}: ${verdict.reason}`);
        }
        mergedIncoming = dedupeSemantic(mergeHints(mergedIncoming, hints));
    }

    const target = path.join(root, 'data/stress', hintDir, fileName);
    const existing = existsSync(target)
        ? parseHintFileContents(JSON.parse(readFileSync(target, 'utf8')), target)
        : [];
    const merged = dedupeSemantic(mergeHints(existing, mergedIncoming));
    const next = stringifyHints(merged);
    const prev = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (next !== prev) {
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, next);
        filesChanged += 1;
    }
}

console.log(`Hint artifact merge: ${incomingFiles} captured file(s), ${incomingPaths} path record(s), ${incomingProvenance} provenance event(s), ${filesChanged} canonical file(s) changed.`);
