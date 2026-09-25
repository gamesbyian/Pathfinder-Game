import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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


/**
 * Reconcile a cached runtime projection after a known source-file delta.
 * Unchanged projection files are reused byte-for-byte; changed/missing files are regenerated.
 *
 * @param {string} sourceDir
 * @param {string} targetDir
 * @param {{ changedFiles?: string[], deletedFiles?: string[] }} delta
 */
export function reconcileRuntimeHintDirectory(
    sourceDir,
    targetDir,
    { changedFiles = [], deletedFiles = [] } = {},
) {
    const manifestPath = path.join(targetDir, '_projection-manifest.json');
    if (!existsSync(manifestPath)) return projectRuntimeHintDirectory(sourceDir, targetDir);

    let previous;
    try {
        previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
        return projectRuntimeHintDirectory(sourceDir, targetDir);
    }
    if (previous?.projectionVersion !== RUNTIME_HINT_PROJECTION_VERSION
        || previous?.kind !== 'pathfinder-runtime-hint-projection-manifest'
        || !Array.isArray(previous?.files)) {
        return projectRuntimeHintDirectory(sourceDir, targetDir);
    }

    mkdirSync(targetDir, { recursive: true });
    const files = readdirSync(sourceDir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => entry.name)
        .sort();
    const current = new Set(files);
    const changed = new Set(changedFiles);
    const previousRows = new Map(previous.files.map(row => [row.file, row]));

    for (const name of deletedFiles) {
        rmSync(path.join(targetDir, name), { force: true });
    }
    for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === '_projection-manifest.json') continue;
        if (!current.has(entry.name)) rmSync(path.join(targetDir, entry.name), { force: true });
    }

    let sourceBytes = 0;
    let runtimeBytes = 0;
    let hints = 0;
    let regenerated = 0;
    const manifestFiles = [];

    for (const name of files) {
        const sourcePath = path.join(sourceDir, name);
        const targetPath = path.join(targetDir, name);
        let row = previousRows.get(name);
        const mustRegenerate = changed.has(name) || !row || !existsSync(targetPath);

        if (mustRegenerate) {
            const raw = readFileSync(sourcePath);
            const projected = projectRuntimeHintArtifact(raw);
            const output = `${JSON.stringify(projected)}\n`;
            writeFileSync(targetPath, output);
            row = {
                file: name,
                hints: projected.hints.length,
                sourceContentSha256: projected.sourceContentSha256,
                sourceSemanticSha256: projected.sourceSemanticSha256,
            };
            regenerated++;
        }

        sourceBytes += statSync(sourcePath).size;
        runtimeBytes += statSync(targetPath).size;
        hints += row.hints;
        manifestFiles.push(row);
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
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Runtime hint projection overlay: ${regenerated} regenerated, ${deletedFiles.length} deleted in ${sourceDir}.`);
    return manifest;
}
