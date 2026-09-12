#!/usr/bin/env node
/**
 * Recover the actual census-cell context behind stored `isolatedTechnique` hint provenance.
 *
 * Technique-census hint capture stores the winning attempt identity, but historically does not
 * preserve whether that attempt came from a base T1 cell, a promoted T1 variant/ablation, or a T3
 * pair. This join matches exact stored solution paths back to successful cells from ONE frozen
 * census run so a bare isolated-technique provenance row is not mistaken for base-T1 capability.
 *
 * Usage:
 *   node scripts/stress/reconcile-isolated-hint-census-context.mjs \
 *     --atlas=tmp/post-1048-residual-atlas-fixed.json \
 *     --census=reports/stress/technique-census/33717910218/combined-cells.json \
 *     --hints-dir=data/stress/hints-random \
 *     --solver-version=277ca21be521bb7e03c268666ad868ad963f2cb5 \
 *     --out=tmp/class5-isolated-hint-census-context.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatAttemptIdentityKey, normalizeAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`missing ${key}`);
    return value;
};
const atlasFile = required('--atlas');
const censusFile = required('--census');
const solverVersion = required('--solver-version');
const hintsDir = args.get('--hints-dir') ?? 'data/stress/hints-random';
const outFile = args.get('--out') ?? 'tmp/class5-isolated-hint-census-context.json';
const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const atlas = readJson(atlasFile);
const census = readJson(censusFile);
const class5 = new Set((atlas.rows ?? []).filter(row => Number(row.primaryClass) === 5).map(row => String(row.id)));

const pathKey = values => JSON.stringify(values ?? []);
const provenanceIdentity = provenance => {
    const solver = provenance?.solver ?? {};
    const forcing = solver.forcing ?? {};
    try {
        if (solver.technique === 'repair' || solver.scoringProfileId === 'repair') {
            return formatAttemptIdentityKey({
                scoringProfileId: 'repair', orderingBiasId: null, repair: true,
                repairMustTurnBiased: forcing.repairMustTurnBiased === true,
                repairTurnBiased: forcing.repairTurnBiased === true,
            });
        }
        if (String(solver.technique ?? '').startsWith('admissible-order')) {
            const scoringProfileId = solver.scoringProfileId ?? 'none';
            return formatAttemptIdentityKey({
                scoringProfileId, orderingBiasId: null, admissibleOrder: true,
                admissibleOrderNoTieBreak: scoringProfileId === 'none',
                admissibleOrderLds: solver.admissibleOrderLds === true || forcing.admissibleOrderLds === true,
            });
        }
        if (solver.beamWidth != null) {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId ?? 'default',
                orderingBiasId: solver.orderingBiasId ?? null,
                beamWidth: Number(solver.beamWidth),
                mechanicBucketRetention: solver.mechanicBucketRetention === true,
            });
        }
        if (solver.technique === 'dfs') {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId ?? 'default',
                orderingBiasId: solver.orderingBiasId ?? null,
            });
        }
    } catch { return null; }
    return null;
};
const classifyCell = row => {
    const inferredVariant = row.variantLabel || row.flagExperiment || row.ablation;
    if (row.tier === 'T3' || row.pairLabel || (row.techniqueKeys?.length ?? 0) > 1) return 't3-pair';
    if (row.tier === 'T4' || row.flagExperiment) return 't4-flag';
    if (row.tier === 'T1' && inferredVariant) return 't1-variant';
    if (row.tier === 'T1' && (row.techniqueKeys?.length ?? 0) === 1) return 'base-t1';
    return 'other';
};
const canonical = value => {
    if (!value) return null;
    try { return normalizeAttemptIdentityKey(value); } catch { return value; }
};

const successfulByLevelPath = new Map();
for (const row of census.results ?? []) {
    if (!row.ok || !Array.isArray(row.solution) || !row.levelId) continue;
    const key = `${row.levelId}\u0000${pathKey(row.solution)}`;
    if (!successfulByLevelPath.has(key)) successfulByLevelPath.set(key, []);
    successfulByLevelPath.get(key).push(row);
}

const provenanceRows = [];
for (const levelId of [...class5].sort()) {
    const file = path.join(hintsDir, `${levelId}.json`);
    if (!existsSync(file)) continue;
    const doc = readJson(file);
    for (let hintIndex = 0; hintIndex < (doc.hints ?? []).length; hintIndex++) {
        const hint = doc.hints[hintIndex];
        for (const provenance of hint.provenance ?? []) {
            const context = provenance.context ?? {};
            const solver = provenance.solver ?? {};
            if (solver.id !== 'pathfinder-solver' || solver.version !== solverVersion || context.isolatedTechnique !== true
                || context.usedExistingHints !== false || context.hintGuided !== false) continue;
            const identity = provenanceIdentity(provenance);
            const sources = (successfulByLevelPath.get(`${levelId}\u0000${pathKey(hint.path)}`) ?? [])
                .filter(row => !identity || canonical(row.winningConfigKey) === canonical(identity))
                .map(row => ({
                    cellId: row.cellId ?? null,
                    classification: classifyCell(row),
                    tier: row.tier ?? null,
                    variantLabel: row.variantLabel ?? null,
                    pairLabel: row.pairLabel ?? null,
                    flagExperiment: row.flagExperiment ?? null,
                    ablation: row.ablation ?? null,
                    techniqueKeys: row.techniqueKeys ?? [],
                    winningConfigKey: canonical(row.winningConfigKey),
                    winningGate: row.winningGate ?? null,
                    nodesExpanded: row.nodesExpanded ?? null,
                    status: row.status ?? null,
                }))
                .sort((a, b) => String(a.classification).localeCompare(String(b.classification)) || String(a.cellId).localeCompare(String(b.cellId)));
            const classes = [...new Set(sources.map(source => source.classification))].sort();
            provenanceRows.push({
                levelId, hintIndex, foundAt: provenance.foundAt ?? null,
                attemptIdentity: identity,
                provenanceGateKey: solver.gateKey ?? null,
                provenanceNodesExpanded: provenance.search?.nodesExpanded ?? null,
                sourceMatchCount: sources.length,
                sourceClassifications: classes,
                hasBaseT1Source: classes.includes('base-t1'),
                sources,
            });
        }
    }
}

const byLevel = new Map();
for (const row of provenanceRows) {
    if (!byLevel.has(row.levelId)) byLevel.set(row.levelId, []);
    byLevel.get(row.levelId).push(row);
}
const classificationCounts = new Map();
for (const row of provenanceRows) for (const label of row.sourceClassifications) {
    classificationCounts.set(label, (classificationCounts.get(label) ?? 0) + 1);
}
const summary = {
    solverVersion,
    primaryClass5Rows: class5.size,
    matchingProvenanceRows: provenanceRows.length,
    matchingLevels: byLevel.size,
    provenanceRowsWithBaseT1Source: provenanceRows.filter(row => row.hasBaseT1Source).length,
    provenanceRowsWithoutBaseT1Source: provenanceRows.filter(row => !row.hasBaseT1Source).length,
    unmatchedProvenanceRows: provenanceRows.filter(row => row.sourceMatchCount === 0).length,
    sourceClassificationPresenceCounts: Object.fromEntries([...classificationCounts].sort()),
    levels: [...byLevel.keys()].sort(),
    interpretation: 'Exact-path/context recovery for one frozen census run. A stored isolatedTechnique row without a base-t1 source must not be treated as evidence that the bare T1 action solved that level.',
};
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), atlasFile, censusFile, hintsDir, summary, provenanceRows };
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
for (const row of provenanceRows) console.log(`${row.levelId} ${row.attemptIdentity ?? '(unknown)'} => ${row.sourceClassifications.join('+') || 'UNMATCHED'}`);
console.log(`Wrote ${outFile}`);
