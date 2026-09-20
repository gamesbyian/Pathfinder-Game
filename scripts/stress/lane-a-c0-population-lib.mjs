import { createHash } from 'node:crypto';

/**
 * Derive Lane A's exact C0 query population from retained frozen crossing rows + interface geometry.
 *
 * This replaces reliance on a separately committed/generated 581-case file. The derivation is
 * deterministic: group by true geometric cut identity, dedupe the same frontier prefix across
 * target labels sharing that cut, keep groups with >= minGroupSize, and flatten in source order.
 * Exact-label projections separately record this canonical order and the shard-major order in
 * which the reference workflow combined rows. Do not align compact labels by array index without
 * applying that recorded label-order transform.
 */
export function deriveLaneAC0Cases(population, geometry, { minGroupSize = 2 } = {}) {
    if (!Array.isArray(population?.crossingRows)) throw new Error('Lane A frozen population has no crossingRows');
    if (!Array.isArray(geometry?.levels)) throw new Error('Lane A geometry has no levels');

    const geometryByLevel = new Map(geometry.levels.map(level => [String(level.id), level]));
    const groupsByCutSignature = new Map();

    for (const row of population.crossingRows) {
        const level = geometryByLevel.get(String(row.levelId));
        if (!level) throw new Error(`missing Lane A geometry for level ${row.levelId}`);
        const iface = (level.interfaces ?? []).find(candidate =>
            candidate.target === row.interfaceTarget &&
            Number(candidate.targetKey) === Number(row.interfaceTargetKey));
        if (!iface) throw new Error(`missing Lane A interface ${row.interfaceTarget}/${row.interfaceTargetKey} for level ${row.levelId}`);

        const cutSignature = `${row.levelId}:${[...(iface.cutCells ?? [])].sort((a, b) => a - b).join(',')}`;
        if (!groupsByCutSignature.has(cutSignature)) groupsByCutSignature.set(cutSignature, new Map());
        // Map.set preserves the first insertion position while updating the value. If one sampled
        // prefix is associated with multiple target labels sharing the same true cut, this keeps
        // exactly one case while retaining one valid interface descriptor for later C1 lookup.
        groupsByCutSignature.get(cutSignature).set(String(row.caseId), {
            ...row,
            source: {
                cutSignature,
                interfaceTarget: row.interfaceTarget,
                interfaceTargetKey: row.interfaceTargetKey,
            },
        });
    }

    const cases = [];
    for (const [cutSignature, rowsByCase] of groupsByCutSignature) {
        const rows = [...rowsByCase.values()];
        if (rows.length < minGroupSize) continue;
        for (const row of rows) {
            cases.push({
                id: `${cutSignature}::${row.caseId}`,
                levelId: row.levelId,
                prefix: row.prefix,
                source: row.source,
            });
        }
    }

    return {
        schemaVersion: 1,
        kind: 'lane-a-c0-derived-cases',
        corpus: population?.summary?.corpus ?? population?.corpus ?? null,
        minGroupSize,
        cases,
    };
}


export function laneACaseOrderHash(cases) {
    if (!Array.isArray(cases)) throw new Error('Lane A cases must be an array');
    const text = `${cases.map(row => String(row.id)).join('\n')}\n`;
    return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

/**
 * Resolve the compact exact-label projection's row order against the canonical derived case order.
 *
 * The reference workflow sharded cases round-robin, then concatenated shard outputs. Its combined
 * artifact is therefore shard-major rather than canonical-case-major. Schema-v2 projections make
 * both orders explicit so labels cannot silently attach to the wrong prefix.
 */
export function laneAProjectionOrderedCases(projection, canonicalCases) {
    if (!projection || projection.kind !== 'lane-a-exact-label-projection') {
        throw new Error('expected lane-a-exact-label-projection');
    }
    if (!Array.isArray(canonicalCases) || canonicalCases.length === 0) {
        throw new Error('Lane A canonical cases are required');
    }
    if (!Number.isInteger(projection.rowCount) || projection.rowCount !== canonicalCases.length) {
        throw new Error(`label projection rowCount disagrees with canonical cases: ${projection.rowCount} != ${canonicalCases.length}`);
    }

    const order = projection.labelOrder;
    if (!order || order.kind !== 'round-robin-shards-concatenated') {
        // Schema-v1 projections were ambiguous. Refuse to guess whether their labels were in
        // canonical or combined-workflow order.
        throw new Error('Lane A exact-label projection lacks explicit shard-major labelOrder metadata');
    }
    if (!Number.isInteger(order.shardCount) || order.shardCount < 1) {
        throw new Error(`invalid Lane A projection shardCount: ${order.shardCount}`);
    }

    const canonicalHash = laneACaseOrderHash(canonicalCases);
    if (order.canonicalCaseOrderHash !== canonicalHash) {
        throw new Error(`Lane A canonical case-order hash mismatch: ${order.canonicalCaseOrderHash} != ${canonicalHash}`);
    }

    const ordered = [];
    for (let shardIndex = 0; shardIndex < order.shardCount; shardIndex++) {
        for (let index = shardIndex; index < canonicalCases.length; index += order.shardCount) {
            ordered.push(canonicalCases[index]);
        }
    }
    if (ordered.length !== canonicalCases.length) {
        throw new Error(`Lane A projection ordering lost cases: ${ordered.length} != ${canonicalCases.length}`);
    }
    const sourceRowHash = laneACaseOrderHash(ordered);
    const expectedSourceHash = order.sourceRowCaseOrderHash ?? projection.caseOrderHash;
    if (expectedSourceHash !== sourceRowHash || projection.caseOrderHash !== sourceRowHash) {
        throw new Error(`Lane A source-row case-order hash mismatch: ${expectedSourceHash}/${projection.caseOrderHash} != ${sourceRowHash}`);
    }
    return ordered;
}

export function laneAProjectionRows(projection, casesDocument) {
    if (!Array.isArray(casesDocument?.cases) || casesDocument.cases.length === 0) {
        throw new Error('Lane A cases document has no cases');
    }
    if (typeof projection.labels !== 'string' || projection.labels.length !== projection.rowCount) {
        throw new Error('Lane A label projection labels length disagrees with rowCount');
    }
    const orderedCases = laneAProjectionOrderedCases(projection, casesDocument.cases);
    const encoding = projection.labelEncoding ?? {};
    return orderedCases.map((frozenCase, index) => {
        const referenceLabel = encoding[projection.labels[index]];
        if (!referenceLabel) {
            throw new Error(`unknown Lane A label projection token at index ${index}: ${projection.labels[index]}`);
        }
        return {
            schemaVersion: 1,
            caseId: frozenCase.id,
            levelId: frozenCase.levelId,
            corpus: casesDocument.corpus,
            prefix: frozenCase.prefix,
            referenceLabel,
            referenceReason: 'retained-projection',
        };
    });
}
