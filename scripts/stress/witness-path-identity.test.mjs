import { describe, expect, it } from 'vitest';
import {
    buildWitnessIdentity,
    selectReplayWitness,
    witnessPathSha256,
} from './witness-path-identity.mjs';

describe('prune-gap witness identity', () => {
    const pathA = [1, 2, 3, 4];
    const pathB = [1, 9, 3, 4];

    it('hashes exact paths deterministically', () => {
        expect(witnessPathSha256(pathA)).toBe(witnessPathSha256([...pathA]));
        expect(witnessPathSha256(pathA)).not.toBe(witnessPathSha256(pathB));

        expect(buildWitnessIdentity(pathA)).toEqual({
            version: 1,
            algorithm: 'sha256-json-cell-key-path-v1',
            pathSha256: witnessPathSha256(pathA),
            pathLength: pathA.length,
        });
    });

    it('finds the stamped witness even after hint order changes', () => {
        const identityA = buildWitnessIdentity(pathA);
        const result = selectReplayWitness([{ path: pathB }, { path: pathA }], identityA);
        expect(result).toEqual({
            path: pathA,
            verified: true,
            source: 'artifact-witness-identity',
        });
    });

    it('fails closed when the stamped witness no longer exists', () => {
        const identityA = buildWitnessIdentity(pathA);
        expect(() => selectReplayWitness([{ path: pathB }], identityA))
            .toThrow(/no current stored hint matches prune-gap witness/);
    });

    it('fails closed on legacy identity-less artifacts unless explicitly opted in', () => {
        const hints = [{ path: pathB }, { path: pathA }];
        expect(() => selectReplayWitness(hints, null))
            .toThrow(/prune-gap artifact has no witness identity/);

        expect(selectReplayWitness(hints, null, { allowUnverifiedLegacy: true })).toEqual({
            path: pathB,
            verified: false,
            source: 'legacy-first-hint',
        });
    });

    it('rejects unknown witness identity versions', () => {
        const identityA = buildWitnessIdentity(pathA);
        expect(() => selectReplayWitness([{ path: pathA }], { ...identityA, version: 99 }))
            .toThrow(/unsupported prune-gap witness identity version/);
    });
});
