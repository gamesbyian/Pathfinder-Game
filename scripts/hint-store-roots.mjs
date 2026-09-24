import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const CANONICAL_TRACKED_HINT_STORE_DIRS = Object.freeze([
    'data/families/hints',
    'data/families/phaseB/hints',
    'data/hints',
    'data/stress/hints',
    'data/stress/hints-envelope',
    'data/stress/hints-random',
]);

export function assertCompleteHintStoreDirs(dirs, context = 'full Hint-store operation') {
    const actual = [...dirs].sort();
    const expected = [...CANONICAL_TRACKED_HINT_STORE_DIRS];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${context}: canonical Hint-store population incomplete or changed; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    return actual;
}

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
    const canonical = {
        'data/hints': 'published',
        'data/stress/hints': 'stress1',
        'data/stress/hints-random': 'stress2',
        'data/stress/hints-envelope': 'envelope',
    };
    return canonical[relativeDir] ?? relativeDir.replace(/^data\//u, '').replaceAll('/', ':');
}
