/**
 * Derive Lane A's exact C0 query population from retained frozen crossing rows + interface geometry.
 *
 * This replaces reliance on a separately committed/generated 581-case file. The derivation is
 * deterministic: group by true geometric cut identity, dedupe the same frontier prefix across
 * target labels sharing that cut, keep groups with >= minGroupSize, and flatten in source order.
 * Historical exact-label projections seal this order with caseOrderHash.
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
