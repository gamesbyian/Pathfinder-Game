import { createHash } from 'node:crypto';

export const PRUNE_GAP_WITNESS_IDENTITY_VERSION = 1;

export function witnessPathSha256(path) {
    if (!Array.isArray(path) || path.length === 0) {
        throw new Error('witness path must be a non-empty array');
    }
    return createHash('sha256').update(JSON.stringify(path)).digest('hex');
}

export function buildWitnessIdentity(path) {
    return {
        version: PRUNE_GAP_WITNESS_IDENTITY_VERSION,
        algorithm: 'sha256-json-cell-key-path-v1',
        pathSha256: witnessPathSha256(path),
        pathLength: path.length,
    };
}

export function selectReplayWitness(hintRecords, witnessIdentity, { allowUnverifiedLegacy = false } = {}) {
    const candidates = (hintRecords || []).filter(record => Array.isArray(record?.path) && record.path.length > 0);
    if (candidates.length === 0) throw new Error('no stored hint path is available for replay');

    if (!witnessIdentity?.pathSha256) {
        if (!allowUnverifiedLegacy) {
            throw new Error(
                'prune-gap artifact has no witness identity; regenerate it, or pass --allow-unverified-legacy-witness to accept the historical first-hint assumption explicitly',
            );
        }
        return { path: candidates[0].path, verified: false, source: 'legacy-first-hint' };
    }

    if (witnessIdentity.version !== PRUNE_GAP_WITNESS_IDENTITY_VERSION) {
        throw new Error(`unsupported prune-gap witness identity version: ${witnessIdentity.version}`);
    }

    const match = candidates.find(record => witnessPathSha256(record.path) === witnessIdentity.pathSha256);
    if (!match) {
        throw new Error(
            `no current stored hint matches prune-gap witness ${witnessIdentity.pathSha256}; labels cannot be replayed against a different path`,
        );
    }
    if (witnessIdentity.pathLength !== undefined && match.path.length !== witnessIdentity.pathLength) {
        throw new Error(
            `matched witness hash but path length differs (${match.path.length} vs ${witnessIdentity.pathLength}); refusing replay`,
        );
    }

    return { path: match.path, verified: true, source: 'artifact-witness-identity' };
}
