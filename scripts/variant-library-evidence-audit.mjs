#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFamilyIndex } from './family-index-lib.mjs';
import { familyArtifactRoots, variantFamilyDatasetRootArg } from './family-paths.mjs';

function filesBelow(root, accept) {
    if (!existsSync(root)) return [];
    const found = [];
    const visit = dir => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const target = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(target);
            else if (accept(target)) found.push(target);
        }
    };
    visit(root);
    return found.sort();
}

function bounded(values, limit = 20) {
    return values.slice(0, limit);
}

function groupBy(rows, keyOf) {
    const groups = new Map();
    for (const row of rows) {
        const key = keyOf(row);
        if (key == null) continue;
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
    }
    return groups;
}

function distinct(values) {
    return [...new Set(values)];
}

function familyManifestRows(root) {
    const roots = familyArtifactRoots(root);
    const familyRows = [];
    const variantRows = [];
    const parseFailures = [];
    const ignoredManifests = [];
    for (const file of filesBelow(roots.families, candidate => candidate.endsWith('-manifest.json'))) {
        const manifestPath = path.relative(roots.root, file).split(path.sep).join('/');
        let manifest;
        try { manifest = JSON.parse(readFileSync(file, 'utf8')); } catch (error) {
            parseFailures.push({ manifestPath, error: String(error.message) });
            continue;
        }
        if (!manifest || Array.isArray(manifest) || !manifest.parentLevelId || !Array.isArray(manifest.variants)) {
            ignoredManifests.push(manifestPath);
            continue;
        }
        const corpusDir = path.relative(roots.families, file).split(path.sep).slice(0, -1).join('/');
        const corpus = corpusDir || manifest.parentCorpus || 'root';
        const parentIdentity = `${corpus}\0${manifest.parentLevelId}`;
        const familyIdentity = `${parentIdentity}\0${manifest.familyMode ?? ''}\0${manifest.familyId ?? ''}`;
        familyRows.push({
            corpus,
            parentId: manifest.parentLevelId,
            parentCorpus: manifest.parentCorpus ?? null,
            parentIdentity,
            familyId: manifest.familyId ?? null,
            familyMode: manifest.familyMode ?? null,
            familyIdentity,
            parentContentHash: manifest.parentContentHash ?? null,
            manifestPath,
        });
        for (const variant of manifest.variants) {
            variantRows.push({
                corpus,
                parentId: manifest.parentLevelId,
                parentIdentity,
                familyId: manifest.familyId ?? null,
                familyMode: manifest.familyMode ?? null,
                familyIdentity,
                variantId: variant.variantId ?? null,
                variantIdentity: variant.variantId ? `${corpus}\0${manifest.parentLevelId}\0${manifest.familyMode ?? ''}\0${variant.variantId}` : null,
                relation: variant.relation ?? null,
                operator: variant.mutationManifest?.operation ?? variant.mutationManifest?.objectType ?? null,
                objectType: variant.mutationManifest?.objectType ?? null,
                parentContentHash: manifest.parentContentHash ?? null,
                variantContentHash: variant.variantContentHash ?? null,
                manifestPath,
            });
        }
    }
    return { familyRows, variantRows, parseFailures, ignoredManifests };
}

function evidencePurposePolicy() {
    return {
        'generation-lineage': 'generation manifest directly admissible when parent/variant identity and relation are explicit',
        'structure-relation': 'directly admissible only when the claimed transform can be reconstructed or content-checked; label alone is nomination evidence',
        'historical-solver-capability': 'evaluation evidence admissible for the recorded solver context; missing context remains unknown',
        'current-solver-capability': 'historical solve outcomes are nomination evidence until rechecked on current code',
        'within-parent-causal-nomination': 'admissible with transformation semantics and confound review; siblings are correlated observations',
        'cross-parent-generalization': 'requires whole-parent inference and campaign/selection conditioning',
        'prevalence-estimation': 'requires an explicit eligible-parent denominator and selection model; row prevalence is insufficient',
        'scheduler-discovery': 'development use is admissible with whole-parent grouping and fixed-work comparison; family identity/outcomes cannot become runtime features',
        'confirmatory-holdout': 'requires untouched whole-parent holdout units and decision-frozen treatment',
        'transfer-generalization': 'requires unrelated parent/source/construction distribution beyond the development family pool',
        'solution-transfer': 'requires referee validation on the target puzzle; replay provenance is derivative evidence rather than an independent discovery event',
    };
}

export function auditVariantLibrary(root) {
    const { familyRows, variantRows, parseFailures, ignoredManifests } = familyManifestRows(root);
    const index = buildFamilyIndex(root);

    const parentHashGroups = groupBy(familyRows, row => row.parentContentHash);
    const variantHashGroups = groupBy(variantRows, row => row.variantContentHash);
    const logicalVariantGroups = groupBy(variantRows, row => row.variantIdentity);
    const familyIdGroups = groupBy(familyRows, row => row.familyId);

    const parentHashIdentityCollisions = [...parentHashGroups.entries()]
        .map(([contentHash, rows]) => ({ contentHash, parentIdentities: distinct(rows.map(row => row.parentIdentity)).sort(),
            examples: bounded(rows.map(row => ({ parentIdentity: row.parentIdentity, manifestPath: row.manifestPath }))) }))
        .filter(row => row.parentIdentities.length > 1);
    const variantHashIdentityCollisions = [...variantHashGroups.entries()]
        .map(([contentHash, rows]) => ({ contentHash, variantIdentities: distinct(rows.map(row => row.variantIdentity)).sort(),
            examples: bounded(rows.map(row => ({ variantIdentity: row.variantIdentity, relation: row.relation, manifestPath: row.manifestPath }))) }))
        .filter(row => row.variantIdentities.length > 1);
    const noOpVariants = variantRows.filter(row => row.parentContentHash && row.variantContentHash && row.parentContentHash === row.variantContentHash);
    const duplicateLogicalVariants = [...logicalVariantGroups.entries()]
        .map(([variantIdentity, rows]) => ({ variantIdentity, rows: rows.length,
            contentHashes: distinct(rows.map(row => row.variantContentHash).filter(Boolean)).sort(),
            manifestPaths: distinct(rows.map(row => row.manifestPath)).sort() }))
        .filter(row => row.rows > 1);
    const conflictingLogicalVariants = duplicateLogicalVariants.filter(row => row.contentHashes.length > 1);
    const familyIdCollisions = [...familyIdGroups.entries()]
        .map(([familyId, rows]) => ({ familyId, familyIdentities: distinct(rows.map(row => row.familyIdentity)).sort(),
            manifestPaths: distinct(rows.map(row => row.manifestPath)).sort() }))
        .filter(row => row.familyIdentities.length > 1);

    const evidenceRows = index.variants.flatMap(variant => variant.evidence ?? []);
    const evidenceWithSolverCommit = evidenceRows.filter(row => row.solverCommit).length;
    const evidenceWithRunId = evidenceRows.filter(row => row.runId).length;
    const evidenceWithBudget = evidenceRows.filter(row => row.budget != null || row.nodeBudget != null || row.wallDeadlineMs != null).length;
    const conflictingAttemptRows = index.diagnostics?.familyAttemptAggregates?.historicalConflictingRowsPreserved ?? 0;

    const modes = [...groupBy(variantRows, row => row.familyMode).entries()]
        .map(([mode, rows]) => ({ mode, variants: rows.length, parents: distinct(rows.map(row => row.parentIdentity)).length }))
        .sort((a, b) => String(a.mode).localeCompare(String(b.mode)));

    return {
        schemaVersion: 1,
        datasetRoot: path.resolve(root),
        counts: {
            familyManifests: familyRows.length,
            variantRows: variantRows.length,
            uniqueParentIdentities: distinct(familyRows.map(row => row.parentIdentity)).length,
            uniqueLogicalVariantIdentities: distinct(variantRows.map(row => row.variantIdentity).filter(Boolean)).length,
            ignoredNonFamilyManifests: ignoredManifests.length,
            manifestParseFailures: parseFailures.length,
            evidenceRows: evidenceRows.length,
        },
        evidencePurposes: evidencePurposePolicy(),
        contentIdentity: {
            parentsMissingContentHash: familyRows.filter(row => !row.parentContentHash).length,
            variantsMissingContentHash: variantRows.filter(row => !row.variantContentHash).length,
            exactParentHashIdentityCollisions: parentHashIdentityCollisions.length,
            exactVariantHashIdentityCollisions: variantHashIdentityCollisions.length,
            exactNoOpVariants: noOpVariants.length,
            duplicateLogicalVariants: duplicateLogicalVariants.length,
            conflictingLogicalVariants: conflictingLogicalVariants.length,
            familyIdCollisions: familyIdCollisions.length,
            examples: {
                parentHashIdentityCollisions: bounded(parentHashIdentityCollisions),
                variantHashIdentityCollisions: bounded(variantHashIdentityCollisions),
                noOpVariants: bounded(noOpVariants.map(row => ({ variantIdentity: row.variantIdentity, relation: row.relation, manifestPath: row.manifestPath }))),
                duplicateLogicalVariants: bounded(duplicateLogicalVariants),
                conflictingLogicalVariants: bounded(conflictingLogicalVariants),
                familyIdCollisions: bounded(familyIdCollisions),
            },
        },
        evaluationEvidence: {
            rows: evidenceRows.length,
            withSolverCommit: evidenceWithSolverCommit,
            missingSolverCommit: evidenceRows.length - evidenceWithSolverCommit,
            withRunId: evidenceWithRunId,
            missingRunId: evidenceRows.length - evidenceWithRunId,
            withRecordedBudgetContext: evidenceWithBudget,
            missingRecordedBudgetContext: evidenceRows.length - evidenceWithBudget,
            mixedEraConflictingRowsPreserved: conflictingAttemptRows,
            normalizedRuns: index.runs.length,
            completeNormalizedRuns: index.runs.filter(run => run.complete).length,
        },
        populationShape: { modes },
        diagnostics: {
            parseFailures: bounded(parseFailures),
            ignoredManifests: bounded(ignoredManifests),
            familyIndex: index.diagnostics,
        },
        interpretation: {
            exactHashCollision: 'candidate shared puzzle identity or legitimate convergent transform; classify semantics before calling it an error',
            exactNoOpVariant: 'candidate ineffective transform or symmetry fixed point; inspect transformation semantics before deciding whether it is invalid',
            conflictingEvaluation: 'distinct observations must remain visible; use solver/run/budget context before treating disagreement as instability',
            missingHistoricalContext: 'unknown, not implicitly equivalent to current/default solver context',
        },
    };
}

function main() {
    const root = variantFamilyDatasetRootArg();
    const audit = auditVariantLibrary(root);
    const pretty = process.argv.includes('--pretty');
    process.stdout.write(`${JSON.stringify(audit, null, pretty ? 2 : 0)}\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
