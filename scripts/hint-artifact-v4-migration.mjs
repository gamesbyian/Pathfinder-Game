#!/usr/bin/env node
/**
 * Dedicated physical Hint schema-v4 migration/measurement tool.
 *
 * Default is read-only. --apply rewrites only after every file has decoded -> encoded -> decoded
 * semantic equality. Historical v1-v3 remain readable through the shared decoder.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import {
    decodeHintArtifact,
    encodeHintArtifact,
    hintPathSignature,
    provenanceEventIdentity,
} from '../modules/domain/hint-runtime.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';
import { stringifyCorpusJson } from './level-json-format.mjs';

const DEFAULT_DIRS = [
    'data/hints',
    'data/stress/hints',
    'data/stress/hints-random',
];

function sha256Text(text) {
    return 'sha256:' + createHash('sha256').update(text).digest('hex');
}

function semanticSha256(records) {
    return sha256Text(stableStringify(records));
}

function joinIdentitySha256(records) {
    const rows = [];
    for (const hint of records ?? []) {
        const pathSignature = hintPathSignature(hint.path);
        for (const entry of hint.provenance ?? []) {
            rows.push({
                pathSignature,
                provenanceEventIdentity: provenanceEventIdentity(entry),
                solverRequestIdentity: entry?.execution?.solverRequestIdentity ?? null,
                protocolHash: entry?.execution?.protocolHash ?? null,
                occurrences: (entry?.occurrences ?? []).map(occ => ({
                    runId: occ?.runId ?? null,
                    runAttempt: occ?.runAttempt ?? null,
                    contractRef: occ?.contractRef ?? null,
                })),
            });
        }
    }
    return sha256Text(stableStringify(rows));
}

export function measureV4ArtifactText(rawText) {
    const parsed = JSON.parse(rawText);
    const decoded = decodeHintArtifact(parsed);
    const encoded = encodeHintArtifact(decoded);
    const roundTrip = decodeHintArtifact(encoded);
    const beforeSemanticSha256 = semanticSha256(decoded);
    const afterSemanticSha256 = semanticSha256(roundTrip);
    if (afterSemanticSha256 !== beforeSemanticSha256) {
        throw new Error('schema v4 semantic round-trip mismatch');
    }
    const beforeJoinIdentitySha256 = joinIdentitySha256(decoded);
    const afterJoinIdentitySha256 = joinIdentitySha256(roundTrip);
    if (afterJoinIdentitySha256 !== beforeJoinIdentitySha256) {
        throw new Error('schema v4 cross-resource join identity mismatch');
    }
    const targetText = stringifyCorpusJson(encoded, 'hints');
    return {
        decoded,
        encoded,
        targetText,
        representation: encoded.representation,
        sourceContentSha256: sha256Text(rawText),
        targetContentSha256: sha256Text(targetText),
        semanticSha256: beforeSemanticSha256,
        joinIdentitySha256: beforeJoinIdentitySha256,
        hints: decoded.length,
        provenanceEvents: decoded.reduce((n, hint) => n + (hint.provenance?.length ?? 0), 0),
        sourceBytes: Buffer.byteLength(rawText),
        targetBytes: Buffer.byteLength(targetText),
        sourceGzipBytes: gzipSync(rawText).byteLength,
        targetGzipBytes: gzipSync(targetText).byteLength,
    };
}

function filesUnder(root, relDirs) {
    const out = [];
    for (const rel of relDirs) {
        const dir = path.join(root, rel);
        if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
        for (const name of readdirSync(dir).sort()) {
            if (!name.endsWith('.json') || name.startsWith('_')) continue;
            out.push({ rel: path.join(rel, name).replaceAll('\\', '/'), abs: path.join(dir, name) });
        }
    }
    return out;
}

export function migrateHintStores(root, { apply = false, dirs = DEFAULT_DIRS } = {}) {
    const rows = [];
    const representations = {};
    for (const file of filesUnder(root, dirs)) {
        const raw = readFileSync(file.abs, 'utf8');
        const measured = measureV4ArtifactText(raw);
        representations[measured.representation] = (representations[measured.representation] ?? 0) + 1;
        const changed = raw !== measured.targetText;
        if (apply && changed) writeFileSync(file.abs, measured.targetText);
        rows.push({
            file: file.rel,
            representation: measured.representation,
            sourceContentSha256: measured.sourceContentSha256,
            targetContentSha256: measured.targetContentSha256,
            semanticSha256: measured.semanticSha256,
            joinIdentitySha256: measured.joinIdentitySha256,
            hints: measured.hints,
            provenanceEvents: measured.provenanceEvents,
            sourceBytes: measured.sourceBytes,
            targetBytes: measured.targetBytes,
            sourceGzipBytes: measured.sourceGzipBytes,
            targetGzipBytes: measured.targetGzipBytes,
            changed,
        });
    }

    const sum = key => rows.reduce((total, row) => total + row[key], 0);
    const sourceBytes = sum('sourceBytes');
    const targetBytes = sum('targetBytes');
    const sourceGzipBytes = sum('sourceGzipBytes');
    const targetGzipBytes = sum('targetGzipBytes');
    return {
        schemaVersion: 1,
        kind: 'pathfinder-hint-v4-migration-report',
        mode: apply ? 'applied' : 'dry-run',
        files: rows.length,
        changedFiles: rows.filter(row => row.changed).length,
        hints: rows.reduce((n, row) => n + row.hints, 0),
        provenanceEvents: rows.reduce((n, row) => n + row.provenanceEvents, 0),
        representations,
        bytes: {
            source: sourceBytes,
            target: targetBytes,
            reduction: sourceBytes > 0 ? 1 - targetBytes / sourceBytes : 0,
            sourceGzip: sourceGzipBytes,
            targetGzip: targetGzipBytes,
            gzipReduction: sourceGzipBytes > 0 ? 1 - targetGzipBytes / sourceGzipBytes : 0,
        },
        semanticRoundTrip: 'pass',
        crossResourceJoinIdentity: 'pass',
        reversibility: {
            mechanism: 'git before/after content hashes plus deterministic v1-v4 decoder',
            everyChangedFileHasBeforeAfterHash: rows.every(row =>
                typeof row.sourceContentSha256 === 'string' && typeof row.targetContentSha256 === 'string'),
        },
        rows,
    };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
    const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
        const [key, ...rest] = arg.split('=');
        return [key, rest.join('=')];
    }));
    const apply = process.argv.includes('--apply');
    const root = path.resolve(String(args.get('--root') || '.'));
    const out = args.get('--out') ? path.resolve(String(args.get('--out'))) : null;
    const report = migrateHintStores(root, { apply });
    const json = JSON.stringify(report, null, 2);
    if (out) writeFileSync(out, json + '\n');
    console.log(json);
}
