#!/usr/bin/env node
/**
 * Derived, freshness-bound index over canonical Hint artifacts.
 *
 * The index is intentionally not an evidence authority. Every row binds to the physical source
 * content hash and expanded semantic hash, while summaries are computed through the shared Hint
 * decoder/query/reconstructability owners. Routine queries may read this compact index; any
 * decision that needs full provenance can follow artifactPath back to canonical evidence.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { decodeHintArtifact } from '../modules/domain/hint-runtime.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';
import { summarizeReconstructability } from './stress/hint-reconstructability-report.mjs';
import { assertCompleteHintStoreDirs, discoverHintStoreDirs, hintStoreLabel } from './hint-store-roots.mjs';

function stores(root) {
    return discoverHintStoreDirs(root).map(dir => ({ corpus: hintStoreLabel(dir), dir }));
}

function sha256(value) {
    return 'sha256:' + createHash('sha256').update(value).digest('hex');
}

function physicalSchema(parsed) {
    if (Array.isArray(parsed)) return { schemaVersion: 1, representation: 'legacy-array' };
    return {
        schemaVersion: Number.isInteger(parsed?.schemaVersion) ? parsed.schemaVersion : null,
        representation: typeof parsed?.representation === 'string' ? parsed.representation : null,
    };
}

function filesUnder(root, relDir) {
    const dir = path.join(root, relDir);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
    return readdirSync(dir).filter(name => name.endsWith('.json') && !name.startsWith('_')).sort();
}

function rowForArtifact(root, store, name) {
    const artifactPath = path.posix.join(store.dir, name);
    const raw = readFileSync(path.join(root, artifactPath), 'utf8');
    const parsed = JSON.parse(raw);
    const hints = decodeHintArtifact(parsed);
    const reconstructability = summarizeReconstructability(hints);
    const physical = physicalSchema(parsed);
    const provenanceEntries = hints.flatMap(hint => hint?.provenance ?? []);
    const provenanceEvents = provenanceEntries.length;
    const solverIds = [...new Set(provenanceEntries.map(entry => entry?.solver?.id).filter(Boolean))].sort();
    const techniques = [...new Set(provenanceEntries.map(entry => entry?.solver?.technique).filter(Boolean))].sort();
    const retryTiers = [...new Set(provenanceEntries.map(entry => entry?.solver?.forcing?.retryTier).filter(Boolean))].sort();
    return {
        corpus: store.corpus,
        levelKey: name.slice(0, -5),
        artifactPath,
        contentSha256: sha256(raw),
        semanticSha256: sha256(stableStringify(hints)),
        bytes: Buffer.byteLength(raw),
        schemaVersion: physical.schemaVersion,
        representation: physical.representation,
        hints: hints.length,
        provenanceEvents,
        solverIds,
        techniques,
        retryTiers,
        effectiveInputReconstructable: reconstructability.effectiveInputReconstructable,
        effectiveInputNotReconstructable: reconstructability.effectiveInputNotReconstructable,
        eventsWithExecution: reconstructability.eventsWithExecution,
        eventsWithOccurrences: reconstructability.eventsWithOccurrences,
        occurrenceRecords: reconstructability.occurrenceRecords,
        missingDimensions: reconstructability.missingDimensions,
    };
}

export function buildHintStoreIndex(root = process.cwd()) {
    const rows = stores(root).flatMap(store => filesUnder(root, store.dir).map(name => rowForArtifact(root, store, name)));
    const sourceBindings = rows.map(row => [row.artifactPath, row.contentSha256]);
    const totals = rows.reduce((acc, row) => {
        acc.artifacts += 1;
        acc.bytes += row.bytes;
        acc.hints += row.hints;
        acc.provenanceEvents += row.provenanceEvents;
        acc.effectiveInputReconstructable += row.effectiveInputReconstructable;
        acc.effectiveInputNotReconstructable += row.effectiveInputNotReconstructable;
        acc.occurrenceRecords += row.occurrenceRecords;
        return acc;
    }, {
        artifacts: 0,
        bytes: 0,
        hints: 0,
        provenanceEvents: 0,
        effectiveInputReconstructable: 0,
        effectiveInputNotReconstructable: 0,
        occurrenceRecords: 0,
    });
    return {
        schemaVersion: 1,
        kind: 'pathfinder-hint-store-index',
        authority: 'derived-from-canonical-hint-artifacts',
        sourceSetSha256: sha256(stableStringify(sourceBindings)),
        totals,
        rows,
    };
}

export function verifyHintStoreIndex(index, root = process.cwd()) {
    const current = buildHintStoreIndex(root);
    return {
        fresh: stableStringify(index) === stableStringify(current),
        expectedSourceSetSha256: index?.sourceSetSha256 ?? null,
        actualSourceSetSha256: current.sourceSetSha256,
        current,
    };
}

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

function main() {
    const root = path.resolve(arg('root') || '.');
    assertCompleteHintStoreDirs(discoverHintStoreDirs(root), 'full Hint-store index');
    const verifyPath = arg('verify');
    if (verifyPath) {
        const index = JSON.parse(readFileSync(path.resolve(verifyPath), 'utf8'));
        const result = verifyHintStoreIndex(index, root);
        if (!result.fresh) {
            console.error(`Hint-store index is stale: expected ${result.expectedSourceSetSha256}, current ${result.actualSourceSetSha256}`);
            process.exit(1);
        }
        console.log(`Hint-store index fresh: ${result.actualSourceSetSha256}`);
        return;
    }
    const index = buildHintStoreIndex(root);
    const json = JSON.stringify(index, null, 2) + '\n';
    const out = arg('out');
    if (out) writeFileSync(path.resolve(out), json);
    else process.stdout.write(json);
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) main();
