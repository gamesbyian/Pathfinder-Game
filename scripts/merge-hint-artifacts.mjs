#!/usr/bin/env node
/** Merge hint files captured by solver-workflow artifacts into the checked-out canonical store.
 *
 * Solver jobs may run on any ref. This script is run later from a checkout of main. Incoming files
 * are merged by path, provenance is deduplicated by the repo's canonical discovery-event identity,
 * and every incoming path is referee-validated before it enters the canonical store. Evidence that
 * cannot be matched safely to current main is quarantined under reports/stress/pending-solver-evidence
 * instead of aborting the harvest or being silently discarded.
 *
 * Usage: node scripts/run-bundled.mjs scripts/merge-hint-artifacts.mjs -- \
 *   --staging-dir=artifact-staging --source-run-id=123 --source-workflow='Solver ...'
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
const sourceRunId = args.get('--source-run-id') || 'unknown';
const sourceWorkflow = args.get('--source-workflow') || 'unknown';
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const STORES = new Map([
    ['data/hints', { corpus: path.join(root, 'data/levels.json'), targetDir: path.join(root, 'data/hints') }],
    ['data/stress/hints', { corpus: path.join(root, 'data/stress/stress-levels.json'), targetDir: path.join(root, 'data/stress/hints') }],
    ['data/stress/hints-random', { corpus: path.join(root, 'data/stress/stress-levels-random.json'), targetDir: path.join(root, 'data/stress/hints-random') }],
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
const indexes = new Map([...STORES].map(([store, info]) => [store, corpusIndex(info.corpus)]));

const incomingByTarget = new Map();
for (const file of walk(stagingDir)) {
    const normalized = file.split(path.sep).join('/');
    const match = normalized.match(/\/(data\/hints|data\/stress\/hints(?:-random)?)\/([^/]+\.json)$/u);
    if (!match || !STORES.has(match[1])) continue;
    const key = `${match[1]}\0${match[2]}`;
    const list = incomingByTarget.get(key) || [];
    list.push(file);
    incomingByTarget.set(key, list);
}

let filesChanged = 0;
let incomingFiles = 0;
let incomingPaths = 0;
let incomingProvenance = 0;
const pending = [];
for (const [key, sources] of [...incomingByTarget.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [store, fileName] = key.split('\0');
    const levelKey = fileName.slice(0, -5);
    const storeInfo = STORES.get(store);
    const levelEntry = indexes.get(store).get(levelKey);
    if (!levelEntry) {
        for (const source of sources) pending.push({
            target: `${store}/${fileName}`,
            sourceFile: path.relative(stagingDir, source),
            reason: 'level-not-found-on-main',
            rawHintFile: JSON.parse(readFileSync(source, 'utf8')),
        });
        continue;
    }
    const level = parseRawLevel(levelEntry.raw, levelEntry.index);
    if (!level) {
        for (const source of sources) pending.push({
            target: `${store}/${fileName}`,
            sourceFile: path.relative(stagingDir, source),
            reason: 'canonical-level-parse-failed',
            rawHintFile: JSON.parse(readFileSync(source, 'utf8')),
        });
        continue;
    }

    let mergedIncoming = [];
    for (const source of sources.sort()) {
        let parsed;
        let hints;
        try {
            parsed = JSON.parse(readFileSync(source, 'utf8'));
            hints = parseHintFileContents(parsed, source);
        } catch (error) {
            pending.push({
                target: `${store}/${fileName}`,
                sourceFile: path.relative(stagingDir, source),
                reason: `hint-file-parse-failed:${error?.message ?? error}`,
                rawText: readFileSync(source, 'utf8'),
            });
            continue;
        }
        incomingFiles += 1;
        incomingPaths += hints.length;
        incomingProvenance += hints.reduce((sum, h) => sum + (h.provenance?.length || 0), 0);
        const accepted = [];
        for (const hint of hints) {
            const verdict = validateCandidatePath(level, hint.path);
            if (!verdict.ok) {
                pending.push({
                    target: `${store}/${fileName}`,
                    sourceFile: path.relative(stagingDir, source),
                    reason: `main-referee-rejected:${verdict.reason}`,
                    hint,
                });
            } else accepted.push(hint);
        }
        mergedIncoming = dedupeSemantic(mergeHints(mergedIncoming, accepted));
    }
    if (!mergedIncoming.length) continue;

    const target = path.join(storeInfo.targetDir, fileName);
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

if (pending.length) {
    const pendingDir = path.join(root, 'reports/stress/pending-solver-evidence');
    mkdirSync(pendingDir, { recursive: true });
    const out = path.join(pendingDir, `run-${sourceRunId}-hint-artifacts.json`);
    writeFileSync(out, `${JSON.stringify({ schemaVersion: 1, sourceRunId, sourceWorkflow, pending }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} unmergeable captured hint record(s) to ${path.relative(root, out)}.`);
}

console.log(`Hint artifact merge: ${incomingFiles} captured file(s), ${incomingPaths} path record(s), ${incomingProvenance} provenance event(s), ${filesChanged} canonical file(s) changed, ${pending.length} pending record(s).`);
