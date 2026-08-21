import path from 'node:path';

/** Resolve canonical family artifact trees without requiring the data checkout to contain code. */
export function familyArtifactRoots(troveRoot = process.cwd()) {
    const root = path.resolve(troveRoot);
    return {
        root,
        families: path.join(root, 'data/families'),
        census: path.join(root, 'logs/family-census'),
        reports: path.join(root, 'reports/families'),
    };
}

export function troveRootArg(argv = process.argv.slice(2)) {
    const value = argv.find(arg => arg.startsWith('--trove-root='))?.slice('--trove-root='.length);
    return value ? path.resolve(value) : process.cwd();
}
