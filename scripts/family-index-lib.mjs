import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { familyArtifactRoots } from './family-paths.mjs';
import { validateFamilyEvaluationRunManifest } from './experiment-manifest-lib.mjs';

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

const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');

const MODE_ABBREVIATIONS = { sym: 'symmetry', lm: 'local-mutant', swap: 'swap', gr: 'group-reshuffle', cs: 'constrained-shuffle', ds: 'density-sweep', re: 're-embed' };

function artifactContext(source) {
    const solve = source.match(/^logs\/family-census\/(?:([^/]+)\/)?solve-([A-Za-z]\d+)-([a-z]+)\.json$/);
    if (solve) return { corpus: solve[1] ?? null, parentId: solve[2], mode: MODE_ABBREVIATIONS[solve[3]] ?? solve[3] };
    const attempts = source.match(/wide-trove-attempts-([A-Za-z0-9_-]+)-part\d+\.json$/);
    return attempts ? { corpus: attempts[1] } : {};
}

function evidenceRows(value, source, run = {}) {
    const rows = [];
    const visit = item => {
        if (!item || typeof item !== 'object') return;
        if (Array.isArray(item)) { for (const child of item) visit(child); return; }
        const variantId = item.variantId ?? item.levelId ?? item.id;
        if (variantId && ('solved' in item || 'ok' in item || 'winningConfig' in item || 'workSpent' in item)) {
            rows.push({
                variantId: String(variantId), parentId: item.parentId ?? item.parentLevelId ?? run.parentId,
                corpus: item.corpus ?? item.parentCorpus ?? run.corpus, mode: item.mode ?? run.mode ?? null,
                solved: item.solved ?? item.ok ?? null,
                winningTechnique: item.winningTechnique ?? item.technique ?? null,
                winningConfig: item.winningConfig ?? item.config ?? null,
                work: item.workSpent ?? item.work ?? item.nodesExpanded ?? null,
                budget: item.workBudget ?? item.budget ?? run.workBudget ?? null,
                runId: item.runId ?? run.runId ?? null, solverCommit: item.solverCommit ?? run.solverCommit ?? null,
                nodeBudget: item.nodeBudget ?? run.nodeBudget ?? null,
                wallDeadlineMs: item.wallDeadlineMs ?? run.wallDeadlineMs ?? null,
                strictTotalWorkBudget: item.strictTotalWorkBudget ?? run.strictTotalWorkBudget ?? null,
                runManifestPath: item.runManifestPath ?? run.runManifestPath ?? null,
                shard: item.shard ?? run.shard ?? null,
                evidencePath: source,
            });
        }
        for (const [key, child] of Object.entries(item)) {
            if (['path', 'solution', 'hints', 'attempts'].includes(key)) continue;
            if (child && typeof child === 'object') visit(child);
        }
    };
    visit(value);
    return rows;
}

function readEvidence(file, source, normalizedRun = null) {
    try {
        const text = readFileSync(file, 'utf8');
        const context = artifactContext(source);
        if (file.endsWith('.jsonl')) return text.split(/\r?\n/).filter(Boolean)
            .flatMap(line => evidenceRows(JSON.parse(line), source, { ...context, ...(normalizedRun ?? {}) }));
        const parsed = JSON.parse(text);
        return evidenceRows(parsed, source, { ...context, ...parsed, ...(normalizedRun ?? {}) });
    } catch (error) {
        return [{ parseError: String(error.message), evidencePath: source }];
    }
}

function variantFamilyDatasetRunIdentity(dataset) {
    if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) return dataset;
    const { shardFile: _shardFile, ...runIdentity } = dataset;
    return runIdentity;
}

function variantFamilyDatasetShardFile(dataset) {
    return typeof dataset?.shardFile === 'string' && dataset.shardFile ? dataset.shardFile : null;
}

function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function buildFamilyIndex(variantFamilyDatasetRoot) {
    const roots = familyArtifactRoots(variantFamilyDatasetRoot);
    const manifests = filesBelow(roots.families, file => file.endsWith('-manifest.json'));
    const families = [];
    const variants = [];
    const manifestDiagnostics = [];
    for (const file of manifests) {
        let manifest;
        const manifestPath = relative(roots.root, file);
        try { manifest = JSON.parse(readFileSync(file, 'utf8')); } catch (error) {
            manifestDiagnostics.push({ path: manifestPath, reason: 'parse-failure', error: String(error.message) });
            continue;
        }
        if (!manifest || Array.isArray(manifest) || !Array.isArray(manifest.variants) || !manifest.parentLevelId) {
            // Campaign-selection manifests share the suffix but are not family manifests. Record
            // that classification so a surprising omission is inspectable rather than silent.
            manifestDiagnostics.push({ path: manifestPath, reason: 'not-a-family-manifest' });
            continue;
        }
        const familyJsonFile = file.replace(/-manifest\.json$/, '.json');
        const corpusDir = relative(roots.families, file).split('/').slice(0, -1).join('/');
        const corpus = corpusDir || manifest.parentCorpus || 'root';
        const generationRuns = Array.isArray(manifest.generationRuns) ? manifest.generationRuns : [];
        const latestGeneration = generationRuns.at(-1)?.generatorImplementation ?? manifest.generatorImplementation;
        families.push({
            familyId: manifest.familyId, parentId: manifest.parentLevelId, corpus,
            parentCorpus: manifest.parentCorpus ?? null, mode: manifest.familyMode ?? null,
            variantCount: manifest.variants.length, manifestPath,
            familyPath: existsSync(familyJsonFile) ? relative(roots.root, familyJsonFile) : null,
            generation: { schemaVersion: manifest.schemaVersion ?? 1, generatorVersion: manifest.generatorVersion ?? null,
                gitCommit: latestGeneration?.gitCommit ?? null,
                implementationHash: latestGeneration?.sourceSha256 ?? null },
        });
        for (const variant of manifest.variants) variants.push({
            parentId: manifest.parentLevelId, parentCorpus: manifest.parentCorpus ?? null,
            familyId: manifest.familyId, corpus,
            variantId: variant.variantId, mode: manifest.familyMode ?? null,
            relation: variant.relation ?? null,
            operator: variant.mutationManifest?.operation ?? variant.mutationManifest?.objectType ?? null,
            objectType: variant.mutationManifest?.objectType ?? null,
            manifestPath,
        });
    }
    const runManifestFiles = filesBelow(roots.census, file => path.basename(file) === 'manifest.json');
    const runManifestDiagnostics = [];
    const runShards = [];
    for (const file of runManifestFiles) {
        const manifestPath = relative(roots.root, file);
        try {
            const parsed = JSON.parse(readFileSync(file, 'utf8'));
            // Pre-schema historical run notes are evidence with unknown fields, not malformed
            // instances of the new contract.
            if (!('schemaVersion' in parsed)) continue;
            const manifest = validateFamilyEvaluationRunManifest(parsed);
            runShards.push({ ...manifest, manifestPath });
        } catch (error) {
            runManifestDiagnostics.push({ path: manifestPath, reason: 'invalid-run-manifest', error: String(error.message) });
        }
    }
    const runsById = new Map();
    const invariantFields = ['schemaVersion', 'solver', 'invocation', 'selection', 'solverPolicy', 'budgets', 'seeds'];
    for (const shard of runShards) {
        const row = runsById.get(shard.runId) ?? { runId: shard.runId, schemaVersion: shard.schemaVersion,
            solver: shard.solver, invocation: shard.invocation, selection: shard.selection,
            variantFamilyDataset: variantFamilyDatasetRunIdentity(shard.variantFamilyDataset),
            variantFamilyDatasetShardFiles: [],
            solverPolicy: shard.solverPolicy, budgets: shard.budgets, seeds: shard.seeds,
            shardCount: shard.shard.count, shards: [], startedAt: shard.startedAt, completedAt: shard.completedAt,
            outputArtifacts: [], sourceGenerationArtifacts: [], manifestPaths: [], valid: true };
        const conflictingFields = invariantFields.filter(field => stableJson(row[field]) !== stableJson(shard[field]));
        if (stableJson(row.variantFamilyDataset) !== stableJson(variantFamilyDatasetRunIdentity(shard.variantFamilyDataset))) {
            conflictingFields.push('variantFamilyDataset');
        }
        if (row.shardCount !== shard.shard.count) conflictingFields.push('shard.count');
        if (conflictingFields.length) {
            row.valid = false;
            runManifestDiagnostics.push({ path: shard.manifestPath, reason: 'inconsistent-run-shard',
                runId: shard.runId, fields: conflictingFields });
        }
        if (row.shards.includes(shard.shard.index)) {
            row.valid = false;
            runManifestDiagnostics.push({ path: shard.manifestPath, reason: 'duplicate-run-shard',
                runId: shard.runId, shardIndex: shard.shard.index });
        }
        row.shards.push(shard.shard.index); row.outputArtifacts.push(...shard.outputArtifacts);
        const datasetShardFile = variantFamilyDatasetShardFile(shard.variantFamilyDataset);
        if (datasetShardFile) row.variantFamilyDatasetShardFiles.push(datasetShardFile);
        row.sourceGenerationArtifacts.push(...shard.sourceGenerationArtifacts); row.manifestPaths.push(shard.manifestPath);
        if (Date.parse(shard.startedAt) < Date.parse(row.startedAt)) row.startedAt = shard.startedAt;
        if (Date.parse(shard.completedAt) > Date.parse(row.completedAt)) row.completedAt = shard.completedAt;
        runsById.set(shard.runId, row);
    }
    const runs = [...runsById.values()].map(run => ({ ...run, shards: [...new Set(run.shards)].sort((a, b) => a - b),
        variantFamilyDatasetShardFiles: [...new Set(run.variantFamilyDatasetShardFiles)].sort(),
        outputArtifacts: [...new Set(run.outputArtifacts)].sort(), sourceGenerationArtifacts: [...new Set(run.sourceGenerationArtifacts)].sort(),
        manifestPaths: run.manifestPaths.sort(), complete: run.valid && new Set(run.shards).size === run.shardCount })).sort((a, b) => a.runId.localeCompare(b.runId));
    const runByOutput = new Map();
    for (const shard of runShards) {
        const run = runsById.get(shard.runId);
        if (!run?.valid) continue;
        for (const output of shard.outputArtifacts) {
            const normalized = path.posix.normalize(output);
            if (runByOutput.has(normalized)) {
                run.valid = false;
                const indexedRun = runs.find(candidate => candidate.runId === shard.runId);
                if (indexedRun) { indexedRun.valid = false; indexedRun.complete = false; }
                runManifestDiagnostics.push({ path: shard.manifestPath, reason: 'duplicate-output-artifact',
                    output: normalized, runId: shard.runId });
                runByOutput.delete(normalized);
                continue;
            }
            runByOutput.set(normalized, { runId: shard.runId, solverCommit: shard.solver.commit,
                workBudget: shard.budgets.workUnits, nodeBudget: shard.budgets.nodeCeiling,
                wallDeadlineMs: shard.budgets.wallDeadlineMs, strictTotalWorkBudget: shard.solverPolicy.strictTotalWorkBudget,
                runManifestPath: shard.manifestPath, shard: shard.shard });
        }
    }
    const evidenceCandidates = [
        ...filesBelow(roots.census, file => /\.(json|jsonl)$/.test(file)),
        ...filesBelow(roots.reports, file => /wide-trove-attempts-.+\.json$/.test(path.basename(file))),
    ];
    const maximumEvidenceBytes = 512 * 1024 * 1024;
    const evidenceFiles = evidenceCandidates.filter(file => statSync(file).size <= maximumEvidenceBytes);
    const skippedEvidenceArtifacts = evidenceCandidates.filter(file => statSync(file).size > maximumEvidenceBytes)
        .map(file => ({ path: relative(roots.root, file), bytes: statSync(file).size, reason: 'exceeds-parser-limit' }));
    const parsedEvidence = evidenceFiles.filter(file => path.basename(file) !== 'manifest.json').flatMap(file => {
        const source = relative(roots.root, file);
        return readEvidence(file, source, runByOutput.get(source));
    });
    const parseFailures = parsedEvidence.filter(row => row.parseError).map(row => ({ path: row.evidencePath, error: row.parseError }));
    const evidence = parsedEvidence.filter(row => !row.parseError);
    const identitiesByVariantId = new Map();
    for (const variant of variants) {
        const identities = identitiesByVariantId.get(variant.variantId) ?? [];
        identities.push(variant); identitiesByVariantId.set(variant.variantId, identities);
    }
    const evidenceByVariant = new Map();
    for (const row of evidence) {
        const candidates = (identitiesByVariantId.get(row.variantId) ?? []).filter(variant =>
            (!row.parentId || row.parentId === variant.parentId) &&
            (!row.corpus || row.corpus === variant.corpus || row.corpus === variant.parentCorpus));
        // Never guess across duplicate bare IDs. Full evidence identity disambiguates; otherwise a
        // bare ID is joinable only when it names one generated variant in the indexed population.
        if (candidates.length !== 1) continue;
        const key = `${candidates[0].corpus}\0${candidates[0].parentId}\0${candidates[0].variantId}`;
        const list = evidenceByVariant.get(key) ?? [];
        list.push(row); evidenceByVariant.set(key, list);
    }
    for (const variant of variants) {
        const key = `${variant.corpus}\0${variant.parentId}\0${variant.variantId}`;
        variant.evidence = evidenceByVariant.get(key) ?? [];
        variant.evaluated = variant.evidence.length > 0;
        variant.solved = variant.evidence.some(row => row.solved === true);
    }
    return {
        // Deliberately exclude timestamps and absolute roots so equal canonical inputs produce a
        // byte-identical disposable index in different worktrees.
        schemaVersion: 4,
        counts: { families: families.length, variants: variants.length,
            parents: new Set(families.map(f => `${f.parentCorpus ?? f.corpus}\0${f.parentId}`)).size,
            variantsWithEvidence: variants.filter(v => v.evaluated).length,
            evidenceArtifacts: evidenceFiles.length, evidenceParseFailures: parseFailures.length,
            skippedEvidenceArtifacts: skippedEvidenceArtifacts.length,
            manifestDiagnostics: manifestDiagnostics.length, normalizedRuns: runs.length,
            runManifestDiagnostics: runManifestDiagnostics.length },
        diagnostics: { manifests: manifestDiagnostics, runManifests: runManifestDiagnostics, evidenceParseFailures: parseFailures, skippedEvidenceArtifacts },
        runs, families, variants,
    };
}

export function writeFamilyIndex(index, output) {
    writeFileSync(output, `${JSON.stringify(index)}\n`);
}

export function queryFamilyIndex(index, filters = {}) {
    const matches = value => Object.entries(filters).every(([key, expected]) => expected == null || String(value[key]) === String(expected));
    const families = index.families.filter(matches);
    const variants = index.variants.filter(matches);
    return {
        counts: { families: families.length, variants: variants.length,
            parents: new Set([...families, ...variants].map(row => `${row.parentCorpus ?? row.corpus}\0${row.parentId}`)).size,
            variantsWithEvidence: variants.filter(variant => variant.evaluated).length },
        families, variants,
    };
}

export function coverageByParent(index, filters = {}) {
    const selected = queryFamilyIndex(index, filters).variants;
    const parents = new Map();
    for (const variant of selected) {
        const key = `${variant.corpus}\0${variant.parentId}`;
        const row = parents.get(key) ?? { corpus: variant.corpus, parentId: variant.parentId, families: new Set(), variants: 0, evaluated: 0, solved: 0 };
        row.families.add(variant.familyId); row.variants++;
        if (variant.evaluated) row.evaluated++;
        if (variant.solved) row.solved++;
        parents.set(key, row);
    }
    return [...parents.values()].map(row => ({ ...row, families: row.families.size, unevaluated: row.variants - row.evaluated }));
}
