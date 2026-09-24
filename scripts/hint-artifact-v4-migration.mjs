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
import { decodeHintArtifact, encodeHintArtifact } from '../modules/domain/hint-runtime.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';
import { stringifyCorpusJson } from './level-json-format.mjs';

const DEFAULT_DIRS = [
    'data/hints',
    'data/stress/hints',
    'data/stress/hints-random',
];

export function measureV4ArtifactText(rawText) {
    const parsed = JSON.parse(rawText);
    const decoded = decodeHintArtifact(parsed);
    const encoded = encodeHintArtifact(decoded);
    const roundTrip = decodeHintArtifact(encoded);
    if (stableStringify(roundTrip) !== stableStringify(decoded)) {
        throw new Error('schema v4 semantic round-trip mismatch');
    }
    const targetText = stringifyCorpusJson(encoded, 'hints');
    return {
        decoded,
        encoded,
        targetText,
        representation: encoded.representation,
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
