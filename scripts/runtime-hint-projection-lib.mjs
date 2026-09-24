import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { decodeHintArtifact, hintPaths } from '../modules/domain/hint-runtime.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';

export const RUNTIME_HINT_PROJECTION_VERSION = 1;

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

/**
 * Convert one canonical/historical hint artifact into the player-runtime path-only projection.
 * The projection remains bound to both the exact source bytes and the decoded semantic Hint[]
 * so agents/build diagnostics can prove which canonical evidence produced it.
 *
 * @param {string|Buffer} raw
 */
export function projectRuntimeHintArtifact(raw) {
    const rawBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const parsed = JSON.parse(rawBuffer.toString('utf8'));
    const decoded = decodeHintArtifact(parsed);
    const paths = hintPaths(decoded);
    const projected = {
        runtimeProjectionVersion: RUNTIME_HINT_PROJECTION_VERSION,
        sourceContentSha256: sha256(rawBuffer),
        sourceSemanticSha256: sha256(stableStringify(decoded)),
        hints: paths,
    };

    // Fail at construction time if the generated document does not round-trip through the same
    // browser/Node decoder to the exact ordered path sequence.
    const decodedProjection = decodeHintArtifact(projected);
    if (stableStringify(hintPaths(decodedProjection)) !== stableStringify(paths)) {
        throw new Error('runtime hint projection path round-trip mismatch');
    }
    return projected;
}

/**
 * Generate one runtime hint directory from a canonical source directory.
 * Existing target files are overwritten; callers are expected to generate into a fresh build tree.
 *
 * @param {string} sourceDir
 * @param {string} targetDir
 */
export function projectRuntimeHintDirectory(sourceDir, targetDir) {
    mkdirSync(targetDir, { recursive: true });
    const files = readdirSync(sourceDir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => entry.name)
        .sort();

    let sourceBytes = 0;
    let runtimeBytes = 0;
    let hints = 0;
    const manifestFiles = [];

    for (const name of files) {
        const sourcePath = path.join(sourceDir, name);
        const raw = readFileSync(sourcePath);
        const projected = projectRuntimeHintArtifact(raw);
        const output = `${JSON.stringify(projected)}\n`;
        const targetPath = path.join(targetDir, name);
        writeFileSync(targetPath, output);

        sourceBytes += raw.byteLength;
        runtimeBytes += Buffer.byteLength(output);
        hints += projected.hints.length;
        manifestFiles.push({
            file: name,
            hints: projected.hints.length,
            sourceContentSha256: projected.sourceContentSha256,
            sourceSemanticSha256: projected.sourceSemanticSha256,
        });
    }

    const manifest = {
        schemaVersion: 1,
        kind: 'pathfinder-runtime-hint-projection-manifest',
        projectionVersion: RUNTIME_HINT_PROJECTION_VERSION,
        files: manifestFiles,
        summary: {
            files: files.length,
            hints,
            sourceBytes,
            runtimeBytes,
            byteReduction: sourceBytes > 0 ? 1 - runtimeBytes / sourceBytes : 0,
        },
    };
    writeFileSync(path.join(targetDir, '_projection-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
}
