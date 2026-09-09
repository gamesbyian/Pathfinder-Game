#!/usr/bin/env node
/**
 * Deterministically rebuild CP-SAT rescue cohorts from the canonical hint store, the current
 * isolated-technique capability map, and a current production report. No solver is dispatched.
 *
 * Every path in data/stress/hints-random is referee-validated by check:level-data-validity before
 * entering the canonical store. This join additionally requires a solved cpsat-full-probe
 * provenance record and asserts all cohort membership/count predicates before writing output.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CAPABILITY = 'reports/stress/technique-niches/2026-09-03/level-capability.json';
const DEFAULT_PRODUCTION = 'reports/stress/solver-corpus2-latest.json';
const DEFAULT_HINTS = 'data/stress/hints-random';
const DEFAULT_OUTPUT = 'reports/stress/cpsat-rescue-cohorts-2026-09-08.json';

function sha256(text) {
    return createHash('sha256').update(text).digest('hex');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function uniqueSorted(values) {
    return [...new Set(values)].sort();
}

function assertUnique(name, values) {
    assert(values.length === new Set(values).size, `${name} contains duplicate IDs`);
}

function parseArgs(argv) {
    const out = new Map();
    for (const raw of argv) {
        const separator = raw.indexOf('=');
        if (separator < 0) throw new Error(`Expected --key=value, received ${raw}`);
        out.set(raw.slice(0, separator), raw.slice(separator + 1));
    }
    return out;
}

export function buildCpsatRescueCohorts({ capability, production, hintsById, sourceIdentity }) {
    assert(Array.isArray(capability.levels), 'Capability artifact must contain levels[]');
    assert(Array.isArray(production.levels), 'Production artifact must contain levels[]');

    const capabilityRows = capability.levels.filter((row) => row.corpus === 'corpus2');
    const capabilityById = new Map(capabilityRows.map((row) => [row.levelId, row]));
    const productionById = new Map(production.levels.map((row) => [row.id, row]));
    assert(capabilityById.size === capabilityRows.length, 'Capability artifact contains duplicate Corpus-2 IDs');
    assert(productionById.size === production.levels.length, 'Production artifact contains duplicate IDs');
    assert(capabilityById.size === productionById.size,
        `Capability/production population mismatch: ${capabilityById.size} vs ${productionById.size}`);

    const capabilityIds = [...capabilityById.keys()].sort();
    const productionIds = [...productionById.keys()].sort();
    assert(JSON.stringify(capabilityIds) === JSON.stringify(productionIds),
        'Capability and production artifacts do not cover the same Corpus-2 IDs');
    assert(hintsById.size === capabilityById.size,
        `Hint-store population mismatch: ${hintsById.size} vs ${capabilityById.size}`);

    const rows = [];
    let cpsatHintCount = 0;
    let cpsatProvenanceCount = 0;
    for (const id of capabilityIds) {
        const hints = hintsById.get(id);
        assert(hints, `Missing hint document for ${id}`);
        assert(Array.isArray(hints.hints), `Hint document for ${id} lacks hints[]`);
        const matchingHints = hints.hints.filter((hint) => (hint.provenance ?? []).some((entry) =>
            entry.solver?.technique === 'cpsat-full-probe'));
        if (!matchingHints.length) continue;

        let provenanceCount = 0;
        for (const hint of matchingHints) {
            assert(Array.isArray(hint.path) && hint.path.length > 0, `${id} has empty CP-SAT hint path`);
            for (const entry of hint.provenance ?? []) {
                if (entry.solver?.technique !== 'cpsat-full-probe') continue;
                assert(entry.search?.termination === 'solved',
                    `${id} has CP-SAT provenance with termination=${entry.search?.termination}`);
                provenanceCount++;
            }
        }
        cpsatHintCount += matchingHints.length;
        cpsatProvenanceCount += provenanceCount;

        const capabilityRow = capabilityById.get(id);
        const productionRow = productionById.get(id);
        rows.push({
            levelId: id,
            cpsatHintCount: matchingHints.length,
            cpsatProvenanceCount: provenanceCount,
            productionSolved: productionRow.ok === true,
            isolatedOracleSolved: capabilityRow.isolatedOracleSolved,
            solverCount: capabilityRow.solverCount,
            frozenT1SupportClass: capabilityRow.frozenT1SupportClass,
            routingRegime: capabilityRow.features?.routingRegime ?? null,
            features: capabilityRow.features ?? null,
            production: {
                status: productionRow.status,
                workSpent: productionRow.workSpent,
                nodesExpanded: productionRow.nodesExpanded,
                attemptCount: productionRow.attemptCount,
            },
        });
    }

    const all = uniqueSorted(rows.map((row) => row.levelId));
    const productionUnsolved = uniqueSorted(rows.filter((row) => !row.productionSolved).map((row) => row.levelId));
    const noIsolatedWinner = uniqueSorted(rows.filter((row) => !row.isolatedOracleSolved).map((row) => row.levelId));
    const productionUnsolvedNoIsolatedWinner = uniqueSorted(rows
        .filter((row) => !row.productionSolved && !row.isolatedOracleSolved)
        .map((row) => row.levelId));

    for (const [name, values] of Object.entries({
        all, productionUnsolved, noIsolatedWinner, productionUnsolvedNoIsolatedWinner,
    })) assertUnique(name, values);

    const rowById = new Map(rows.map((row) => [row.levelId, row]));
    for (const id of all) assert(capabilityById.has(id), `Unknown capability ID ${id}`);
    for (const id of productionUnsolved)
        assert(rowById.get(id).productionSolved === false, `${id} violates production-unsolved predicate`);
    for (const id of noIsolatedWinner)
        assert(rowById.get(id).isolatedOracleSolved === false, `${id} violates no-isolated-winner predicate`);
    for (const id of productionUnsolvedNoIsolatedWinner) {
        const row = rowById.get(id);
        assert(!row.productionSolved && !row.isolatedOracleSolved, `${id} violates combined residual predicate`);
    }

    const productionSolvedCount = production.levels.filter((row) => row.ok === true).length;
    assert(productionSolvedCount === production.solved,
        `Production report solved count mismatch: rows=${productionSolvedCount}, summary=${production.solved}`);

    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development-evidence-repair',
        description: 'Deterministic no-dispatch regeneration of retained referee-valid cpsat-full-probe rescue cohorts.',
        sourceIdentity,
        population: {
            corpus: 'corpus2',
            levels: capabilityIds.length,
            productionSolved: productionSolvedCount,
            productionUnsolved: production.levels.length - productionSolvedCount,
        },
        cpsatEvidence: {
            rescuedLevels: rows.length,
            hintPaths: cpsatHintCount,
            provenanceRecords: cpsatProvenanceCount,
            technique: 'cpsat-full-probe',
            requiredTermination: 'solved',
            refereeValidationContract: 'canonical hint store; verify with npm run check:level-data-validity',
        },
        counts: {
            all: all.length,
            productionUnsolved: productionUnsolved.length,
            noIsolatedWinner: noIsolatedWinner.length,
            productionUnsolvedNoIsolatedWinner: productionUnsolvedNoIsolatedWinner.length,
        },
        cohorts: { all, productionUnsolved, noIsolatedWinner, productionUnsolvedNoIsolatedWinner },
        rowMaterialization: 'Omitted from the committed artifact; rerun this script to rebuild joined per-level rows.',
        assertions: {
            sourcePopulationsMatch: true,
            cohortCountsMatchArrayLengths: true,
            cohortIdsUnique: true,
            allIdsKnownToCapabilityMap: true,
            membershipPredicatesSatisfied: true,
            cpsatProvenanceSolved: true,
            productionSummaryMatchesRows: true,
        },
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const capabilityPath = args.get('--capability') ?? DEFAULT_CAPABILITY;
    const productionPath = args.get('--production') ?? DEFAULT_PRODUCTION;
    const hintsPath = args.get('--hints') ?? DEFAULT_HINTS;
    const outputPath = args.get('--out') ?? DEFAULT_OUTPUT;

    const capabilityText = readFileSync(capabilityPath, 'utf8');
    const productionText = readFileSync(productionPath, 'utf8');
    const capability = JSON.parse(capabilityText);
    const production = JSON.parse(productionText);
    const hintFiles = readdirSync(hintsPath).filter((name) => name.endsWith('.json')).sort();
    const hintsById = new Map();
    const hintHash = createHash('sha256');
    for (const file of hintFiles) {
        const levelId = file.slice(0, -'.json'.length);
        const text = readFileSync(path.join(hintsPath, file), 'utf8');
        hintHash.update(file).update('\0').update(text).update('\0');
        hintsById.set(levelId, JSON.parse(text));
    }

    const result = buildCpsatRescueCohorts({
        capability,
        production,
        hintsById,
        sourceIdentity: {
            capability: { path: capabilityPath, sha256: sha256(capabilityText) },
            production: {
                path: productionPath,
                sha256: sha256(productionText),
                solverCommitSha: production.commitSha ?? null,
                timestamp: production.timestamp ?? null,
            },
            hints: { path: hintsPath, files: hintFiles.length, combinedSha256: hintHash.digest('hex') },
        },
    });

    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outputPath}`);
    console.log(JSON.stringify(result.counts));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
