import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Discover tracked canonical Hint-store directories from the repository data tree.
 *
 * A Hint store is a directory named hints or hints-* containing JSON artifacts directly.
 * This deliberately discovers rather than enumerates stores so a new tracked corpus/family cannot
 * silently fall outside whole-store migration, codec benchmarking, indexing or audit coverage.
 */
export function discoverHintStoreDirs(root = process.cwd()) {
    const dataRoot = path.join(root, 'data');
    if (!existsSync(dataRoot) || !statSync(dataRoot).isDirectory()) return [];
    const out = [];
    const visit = abs => {
        for (const entry of readdirSync(abs, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const child = path.join(abs, entry.name);
            if (/^hints(?:-.+)?$/u.test(entry.name)) {
                const hasJson = readdirSync(child, { withFileTypes: true })
                    .some(item => item.isFile() && item.name.endsWith('.json') && !item.name.startsWith('_'));
                if (hasJson) out.push(path.relative(root, child).replaceAll('\\', '/'));
            }
            visit(child);
        }
    };
    visit(dataRoot);
    return [...new Set(out)].sort();
}

export function hintStoreLabel(relativeDir) {
    return relativeDir.replace(/^data\//u, '').replaceAll('/', ':');
}
