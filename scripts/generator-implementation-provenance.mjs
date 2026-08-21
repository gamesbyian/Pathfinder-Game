import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function generatorImplementationProvenance(root = process.cwd(), source = 'scripts/family-generate.mjs') {
    const sourcePath = path.resolve(root, source);
    const result = { sourcePath: source.split(path.sep).join('/') };
    if (existsSync(sourcePath)) result.sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
    try {
        result.gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        result.gitRef = execFileSync('git', ['symbolic-ref', '--short', '-q', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
        result.gitDirty = execFileSync('git', ['status', '--porcelain', '--', source], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== '';
    } catch {
        // Exported trees remain valid generators; their source hash is the durable identity.
    }
    return result;
}
