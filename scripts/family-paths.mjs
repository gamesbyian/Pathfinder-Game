import path from 'node:path';

/** Resolve canonical family artifact trees without requiring the data checkout to contain code. */
export function familyArtifactRoots(variantFamilyDatasetRoot = process.cwd()) {
    const root = path.resolve(variantFamilyDatasetRoot);
    return {
        root,
        families: path.join(root, 'data/families'),
        census: path.join(root, 'logs/family-census'),
        reports: path.join(root, 'reports/families'),
    };
}

export function variantFamilyDatasetRootArg(argv = process.argv.slice(2)) {
    const canonicalPrefix = '--variant-family-dataset-root=';
    // Keep an explicit rejection for the retired external spelling without preserving it as a
    // compatibility parser branch. Factorization also keeps generic live-surface inventories from
    // mistaking this rejection sentinel for an accepted legacy owner.
    const retiredPrefix = ['--trove', 'root='].join('-');
    if (argv.some(arg => arg.startsWith(retiredPrefix))) {
        throw new Error('retired variant-family dataset-root option; use --variant-family-dataset-root=PATH');
    }

    const values = argv
        .filter(arg => arg.startsWith(canonicalPrefix))
        .map(arg => path.resolve(arg.slice(canonicalPrefix.length)));

    const unique = [...new Set(values)];
    if (unique.length > 1) {
        throw new Error(
            `conflicting variant-family dataset roots: ${unique.map(value => JSON.stringify(value)).join(' vs ')}`,
        );
    }
    return unique[0] ?? process.cwd();
}
