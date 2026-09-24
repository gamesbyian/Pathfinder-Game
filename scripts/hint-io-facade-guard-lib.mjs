/**
 * Maintained-reachability census for the hint/corpus I/O facade boundary.
 *
 * `scripts/level-data-io.mjs` removed `readLevelsWithHints`/`writeLevelsWithHits` in favor of the
 * explicit corpus-document API (`readLevelCorpusDocumentWithHints`/`writeLevelCorpusDocumentWithHints`
 * + `setLevelHintRecords`), but a plain repo-wide grep for the old names is not a safe signal on its
 * own: many hits are dormant historical scripts, not anything a maintained entrypoint can still run.
 * This module builds the same reachability graph the plan's pre-implementation audit used --
 * seed from every file package.json or a GitHub Actions workflow names, then follow relative imports
 * -- so a stale import only counts as a current regression when something maintained can actually
 * reach it. See docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 13.1.A.
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOTS = ['scripts', 'modules', '.github/workflows'];
const SOURCE_EXT_RE = /\.(?:mjs|js|ts|tsx|ya?ml)$/;
// Require call syntax, not a bare identifier: excludes historical/comparison prose in comments and
// string literals (e.g. an error message naming the old writer, or a test asserting a bundle does
// NOT contain the string) while still catching every real import-and-call usage.
const REMOVED_FACADE_RE = /\b(?:readLevelsWithHints|writeLevelsWithHints)\s*\(/;
const IGNORED_DIR_RE = /(?:^|\/)(?:node_modules|dist)\//;

function walkFiles(dir, accept) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walkFiles(p, accept));
        else if (accept(p)) out.push(p);
    }
    return out;
}

function resolveImport(known, from, spec) {
    if (!spec.startsWith('.')) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    const candidates = [
        base, `${base}.mjs`, `${base}.js`, `${base}.ts`, `${base}.tsx`,
        base.replace(/\.js$/u, '.ts'), base.replace(/\.js$/u, '.tsx'),
    ];
    return candidates.find((x) => known.has(x)) || null;
}

/**
 * Returns { sourceTexts, reachable }: every `.mjs/.js/.ts/.tsx/.yml` file under scripts/, modules/,
 * and .github/workflows/ (keyed by repo-relative path), and the subset transitively reachable from a
 * package.json script or a workflow file via relative imports.
 */
export function buildMaintainedReachability(root) {
    const sourceTexts = new Map();
    for (const sourceRoot of SOURCE_ROOTS) {
        for (const file of walkFiles(path.join(root, sourceRoot), (p) => SOURCE_EXT_RE.test(p) && !IGNORED_DIR_RE.test(p))) {
            const rel = path.relative(root, file).replaceAll('\\', '/');
            sourceTexts.set(rel, fs.readFileSync(file, 'utf8'));
        }
    }
    const packageText = fs.existsSync(path.join(root, 'package.json')) ? fs.readFileSync(path.join(root, 'package.json'), 'utf8') : '';
    const workflowText = [...sourceTexts.entries()].filter(([p]) => p.startsWith('.github/workflows/')).map(([, t]) => t).join('\n');
    const known = new Set(sourceTexts.keys());

    const graph = new Map();
    for (const [rel, text] of sourceTexts) {
        const deps = new Set();
        for (const m of text.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)) {
            const dep = resolveImport(known, rel, m[1]);
            if (dep) deps.add(dep);
        }
        graph.set(rel, [...deps]);
    }

    const reachable = new Set();
    const queue = [];
    for (const rel of known) {
        if (packageText.includes(rel) || workflowText.includes(rel)) { reachable.add(rel); queue.push(rel); }
    }
    while (queue.length) {
        const cur = queue.shift();
        for (const dep of graph.get(cur) || []) if (!reachable.has(dep)) { reachable.add(dep); queue.push(dep); }
    }
    return { sourceTexts, reachable };
}

/** Maintained-reachable files that still import the removed corpus/hint facade. Empty = guard passes. */
export function findReachableRemovedFacadeUsers(root) {
    const { sourceTexts, reachable } = buildMaintainedReachability(root);
    const offenders = [];
    for (const rel of reachable) {
        const text = sourceTexts.get(rel);
        if (text && REMOVED_FACADE_RE.test(text)) offenders.push(rel);
    }
    return offenders.sort();
}
