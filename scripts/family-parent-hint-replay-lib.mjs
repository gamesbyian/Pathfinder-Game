import { inverseTransformPoint } from '../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../modules/domain/cell-key.ts';
import { makeProvenanceEntry, mergeHints, toHint } from '../modules/domain/hint-types.ts';

export function inverseSymmetryPath(path, variant, w, h) {
    if (!Number.isInteger(variant) || variant < 0 || variant > 7) throw new Error(`invalid symmetry transform variant: ${variant}`);
    return path.map(key => {
        const { x, y } = UNPACK(key);
        const point = inverseTransformPoint(x, y, variant, w, h);
        return PACK(point.x, point.y);
    });
}
export function replayVariantPath({ parentLevel, variantPath, edge, validate }) {
    if (!Array.isArray(variantPath)) return { accepted: false, error: 'variant path is missing', parentPath: null };
    const symmetry = edge?.mutationManifest?.operation === 'transform' || edge?.relation === 'symmetry';
    const variant = Number(edge?.mutationManifest?.variant);
    if (symmetry && (!Number.isInteger(variant) || variant < 0 || variant > 7)) {
        return { accepted: false, error: `invalid symmetry transform variant: ${edge?.mutationManifest?.variant ?? 'missing'}`, parentPath: null };
    }
    if (!symmetry && edge?.witnessRelation && edge.witnessRelation !== 'exact-coordinate') {
        return { accepted: false, error: `coordinate replay is not meaningful for witness relation ${edge.witnessRelation}`, parentPath: null };
    }
    const parentPath = symmetry ? inverseSymmetryPath(variantPath, variant, parentLevel.grid.w, parentLevel.grid.h) : [...variantPath];
    const verdict = validate(parentLevel, parentPath);
    return {
        accepted: verdict?.ok === true,
        relation: edge?.relation ?? null,
        transformVariant: symmetry ? variant : null,
        parentPath,
        verdict,
        error: verdict?.ok ? null : symmetry
            ? `SYMMETRY INVARIANT FAILURE: ${verdict?.reason ?? 'validator rejected inverse path'}`
            : verdict?.reason ?? 'validator rejected path',
    };
}
export function mergeVariantDerivedHint(existing, path, { variantId, parentId, familyId, levelRevision = null, foundAt } = {}) {
    const provenance = makeProvenanceEntry(`variant-parent-replay:${familyId ?? 'unknown'}:${parentId ?? 'unknown'}:${variantId ?? 'unknown'}`, {
        solverId: 'variant-corpus-diagnostic', solverVersion: null, termination: 'referee-accepted', levelRevision, foundAt,
        usedExistingHints: false, hintGuided: false,
    });
    return mergeHints(existing ?? [], [toHint(path, [provenance])]);
}
