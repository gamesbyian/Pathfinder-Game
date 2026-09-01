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
    const legacyPrefix = '--trove-root=';
    const values = argv
        .filter(arg => arg.startsWith(canonicalPrefix) || arg.startsWith(legacyPrefix))
        .map(arg => path.resolve(arg.startsWith(canonicalPrefix)
            ? arg.slice(canonicalPrefix.length)
            : arg.slice(legacyPrefix.length)));

    const unique = [...new Set(values)];
    if (unique.length > 1) {
        throw new Error(
            `conflicting variant-family dataset roots: ${unique.map(value => JSON.stringify(value)).join(' vs ')}`,
        );
    }
    return unique[0] ?? process.cwd();
}
