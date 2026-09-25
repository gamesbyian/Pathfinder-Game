#!/usr/bin/env node
/**
 * Combines N compatible portfolio-solve-sweep.mjs shard reports into one canonical
 * {summary, levels} sweep envelope. Corpus-2 GH Actions batches are one maintained producer,
 * but the combiner is corpus-generic and can also combine Corpus 1, custom, or explicitly mixed inputs.
 *
 * Why this is needed at all: portfolio-solve-sweep.mjs's own per-level row already carries every
 * field those three tools read (ok/id/status/elapsedMs/nodesExpanded/attemptCount/attempts/
 * failedStrategies/refereeValid — see portfolio-solve-sweep-lib.mjs's buildRow(), which mirrors
 * scripts/stress/benchmark.mjs's solveEntry() row-for-row since both call the identical
 * Solver.solve()). The only real mismatch is the top-level WRAPPER: portfolio-solve-sweep writes
 * `{summary: {budgetMs, ...}, levels: [...]}`, while the three consumer tools read `budgetMs` and
 * `levels` at the top level directly (stress:measure-solver's own shape). This tool flattens that
 * wrapper and concatenates `levels` across input files. It also preserves decision-bearing execution
 * configuration when the producer records it, and refuses to combine shards that disagree on that
 * configuration. A combined artifact must not erase which treatment actually ran.
 *
 * Usage:
 *   node scripts/combine-solver-sweep-reports.mjs \
 *       --in=logs/solver-corpus2-batches/batch-01.json,logs/solver-corpus2-batches/batch-02.json,... \
 *       --out=reports/stress/solver-corpus2-latest.json
 *   # or, to pick up every batch-*.json in a directory at once:
 *   node scripts/combine-solver-sweep-reports.mjs --in-dir=logs/solver-corpus2-batches --out=reports/stress/solver-corpus2-latest.json
 *
 * An input may also be a historical flattened report, as when reconciling older sibling dispatches.
 * Both shapes cross one explicit ingress adapter (solver-sweep-report-input.mjs) and become the same
 * internal {summary, levels} contract
 * before any scientific validation/merge logic runs. The adapter does not mutate source documents.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { buildPopulationIntegrity, hashConfiguration, hashPopulation, isImmutableCommitSha, parseIdentityLines } from './solver-experiment-contract.mjs';
import { encodeResearchScopedIdentity } from './research-population-identity-lib.mjs';
import { normalizeSolverSweepReportInput } from './solver-sweep-report-input.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';
import { solverRequestIdentityAvailability } from './solver-request-identity-compat.mjs';

const EXECUTION_CONFIG_FIELDS = [
    'levelBlind',
    'historicalInputs',
    'solverInputFields',
    'workers',
    'enableFlags',
    'disableFlags',
    'strictTotalWorkBudget',
    'attemptBudgetTelemetry',
    'lifecycleTelemetry',
    'mainSearchLateReserveFraction',
    'mainSearchLateReserveConfigCount',
    'admissibleOrderNodeReserveFraction',
    'admissibleOrderNonDefaultRetryBudgetFraction',
    'earlyRepairSearchAdaptiveBadnessGate',
    'earlyRepairSearchAdaptiveMinScale',
    'repairLateProbeNodeBudget',
    'repairLateProbeMultiSeedRetrySeedCount',
];

function canonicalConfigValue(field, value) {
    if ((field === 'enableFlags' || field === 'disableFlags') && Array.isArray(value)) return [...value].sort();
    return value;
}

function rawEffectiveConfigDigest(value) {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

// Canonical solver-request identity (docs/hint-evidence-execution-identity-storage-consolidation-
// plan.md section 3.2) is preferred over legacy effectiveConfig for CROSS-REPORT agreement when every
// report being combined carries one: mechanical-migration-audit's disposition for this file is
// "prefer canonical request identity when present... and reject mixed disagreement", stronger than
// check-effective-config-agreement.mjs's diagnostic-only treatment, because this is a WRITE path --
// the combined artifact becomes the record other tools read. `invalid-canonical` (malformed, not
// merely absent) always fails loud rather than being treated as "no canonical identity".
function validatedSolverRequestIdentity(reports) {
    const availabilities = reports.map(report => ({ report, availability: solverRequestIdentityAvailability(report.summary) }));
    const invalid = availabilities.find(a => a.availability.status === 'invalid-canonical');
    if (invalid) {
        throw new Error(`${invalid.report.path}: invalid canonical solver-request identity (${invalid.availability.reason}).`);
    }
    const canonicalCount = availabilities.filter(a => a.availability.status === 'canonical').length;
    if (canonicalCount === 0) return { solverRequestProjection: null, solverRequestIdentity: null };
    if (canonicalCount !== reports.length) {
        const missing = availabilities.filter(a => a.availability.status !== 'canonical').map(a => a.report.path);
        throw new Error(`Mismatched canonical solver-request identity: some source reports record it (${canonicalCount}/${reports.length}) and others do not (${missing.join(', ')}).`);
    }
    const [first, ...rest] = availabilities;
    for (const other of rest) {
        if (other.availability.solverRequestIdentity !== first.availability.solverRequestIdentity) {
            throw new Error(`Mismatched canonical solver-request identity: ${reports[0].path} and ${other.report.path} did not run the same solver request `
                + '(legacy effectiveConfig may still agree if the difference is confined to population/protocol dimensions the canonical projection excludes).');
        }
    }
    return {
        solverRequestProjection: first.availability.solverRequestProjection,
        solverRequestIdentity: first.availability.solverRequestIdentity,
    };
}

function validatedEffectiveConfig(reports) {
    const firstConfig = reports[0].summary.effectiveConfig;
    const firstCanonical = stableStringify(firstConfig);
    for (const report of reports) {
        const canonical = stableStringify(report.summary.effectiveConfig);
        if (canonical !== firstCanonical) {
            throw new Error(`Mismatched effectiveConfig: ${reports[0].path} and ${report.path} did not execute the same solver configuration.`);
        }
        const recorded = report.summary.effectiveConfigDigest;
        if (recorded != null && recorded !== rawEffectiveConfigDigest(report.summary.effectiveConfig)) {
            throw new Error(`${report.path}: effectiveConfigDigest does not match effectiveConfig.`);
        }
    }
    return { effectiveConfig: firstConfig, ...validatedSolverRequestIdentity(reports) };
}

function collectEffectiveConfig(reports, { allowMixedCorpora = false } = {}) {
    const withConfig = reports.filter(report => report.summary?.effectiveConfig && typeof report.summary.effectiveConfig === 'object');
    if (withConfig.length === 0) return null;
    if (withConfig.length !== reports.length) {
        throw new Error('Mismatched effectiveConfig: some source reports record observed solver execution identity and others omit it.');
    }

    let value;
    let canonical = { solverRequestProjection: null, solverRequestIdentity: null };
    if (!allowMixedCorpora) {
        const validated = validatedEffectiveConfig(withConfig);
        value = validated.effectiveConfig;
        canonical = { solverRequestProjection: validated.solverRequestProjection, solverRequestIdentity: validated.solverRequestIdentity };
    } else {
        const groups = new Map();
        for (const report of withConfig) {
            const corpusKey = stableStringify(report.summary.corpus);
            if (!groups.has(corpusKey)) groups.set(corpusKey, []);
            groups.get(corpusKey).push(report);
        }
        if (groups.size === 1) {
            const validated = validatedEffectiveConfig(withConfig);
            value = validated.effectiveConfig;
            canonical = { solverRequestProjection: validated.solverRequestProjection, solverRequestIdentity: validated.solverRequestIdentity };
        } else {
            // Different corpus groups are legitimately different populations/arms and need not share
            // ANY identity, canonical included -- only intra-group agreement is required (still
            // enforced, since validatedEffectiveConfig runs per-group). Cross-group canonical identity
            // is deliberately not propagated into the top-level summary for this rarer, opt-in path;
            // each group's own effectiveConfig is still available under byCorpus for that purpose.
            const byCorpus = {};
            for (const corpusKey of [...groups.keys()].sort()) {
                byCorpus[corpusKey] = validatedEffectiveConfig(groups.get(corpusKey)).effectiveConfig;
            }
            value = { byCorpus };
        }
    }
    return { value, digest: rawEffectiveConfigDigest(value), ...canonical };
}

function collectExecutionConfig(reports) {
    const config = {};
    for (const field of EXECUTION_CONFIG_FIELDS) {
        const observations = reports.map(report => ({
            path: report.path,
            present: Object.prototype.hasOwnProperty.call(report.summary, field),
            value: canonicalConfigValue(field, report.summary[field]),
        }));
        if (!observations.some(x => x.present)) continue;
        if (observations.some(x => !x.present)) {
            throw new Error(`Mismatched execution config ${field}: some shards record it and others omit it.`);
        }
        const first = JSON.stringify(observations[0].value);
        const mismatch = observations.find(x => JSON.stringify(x.value) !== first);
        if (mismatch) {
            throw new Error(`Mismatched execution config ${field}: ${observations[0].path} used ${first}, ${mismatch.path} used ${JSON.stringify(mismatch.value)}.`);
        }
        config[field] = observations[0].value;
    }
    return config;
}

function consistentMetadata(reports, fields) {
    const result = {};
    for (const field of fields) {
        const values = reports.map(r => r.summary[field] ?? r[field]).filter(v => v != null);
        if (!values.length) continue;
        const first = JSON.stringify(values[0]);
        if (values.some(value => JSON.stringify(value) !== first)) {
            throw new Error(`Mismatched ${field}: source reports do not describe one coherent experiment.`);
        }
        result[field] = values[0];
    }
    return result;
}

export function combineSolverSweepReports(argv = process.argv.slice(2), { root = process.cwd() } = {}) {
    const ROOT = root;
    const args = new Map(argv.filter(a => a.startsWith('--')).map(a => {
        const [k, ...v] = a.split('=');
        return [k, v.join('=')];
    }));

    const inDir = args.get('--in-dir');
    const inList = args.get('--in');
    const outFile = args.get('--out');
    const expectedIdsFile = args.get('--expected-ids');
    const allowMixedCorpora = args.has('--allow-mixed-corpora');
    if ((!inDir && !inList) || !outFile) {
        console.error('Usage: node scripts/combine-solver-sweep-reports.mjs (--in=<file1>,<file2>,... | --in-dir=<dir>) --out=<combined.json>');
        process.exit(2);
    }

    const inputPaths = inDir
        ? readdirSync(path.resolve(ROOT, inDir)).filter(n => n.endsWith('.json')).map(n => path.join(inDir, n)).sort()
        : inList.split(',').map(s => s.trim()).filter(Boolean);

    if (inputPaths.length === 0) {
        console.error('No input files found.');
        process.exit(2);
    }

    const reports = inputPaths.map(p => {
        const abs = path.resolve(ROOT, p);
        const parsed = JSON.parse(readFileSync(abs, 'utf8'));
        return { path: p, ...normalizeSolverSweepReportInput(parsed, p) };
    });

    // An immutable revision is fresh scientific identity, not an optional decoration. If only
    // some inputs carry one, the combine must not stamp their SHA onto legacy/unknown rows and
    // thereby upgrade those rows into apparently same-revision evidence.
    const immutableRevisionPresence = reports.map(report => isImmutableCommitSha(report.summary.commit));
    if (immutableRevisionPresence.some(Boolean) && !immutableRevisionPresence.every(Boolean)) {
        throw new Error('Mismatched commit provenance: some source reports carry an immutable execution revision and others omit or weaken it.');
    }

    // budgetMs/corpus/schedulerMode must agree across all batches, or downstream badness/stability
    // ratios (which divide by a single budgetMs) would silently mix apples and oranges.
    const first = reports[0].summary;
    for (const r of reports.slice(1)) {
        if (r.summary.budgetMs !== first.budgetMs) {
            throw new Error(`Mismatched budgetMs: ${reports[0].path} used ${first.budgetMs}ms, ${r.path} used ${r.summary.budgetMs}ms.`);
        }
        if (!allowMixedCorpora && r.summary.corpus !== first.corpus) {
            throw new Error(`Mismatched corpus: ${reports[0].path} used ${first.corpus}, ${r.path} used ${r.summary.corpus}.`);
        }
        if (r.summary.schedulerMode !== first.schedulerMode) {
            throw new Error(`Mismatched schedulerMode: ${reports[0].path} used ${first.schedulerMode}, ${r.path} used ${r.summary.schedulerMode}.`);
        }
        // Every shard combined here is expected to have checked out the SAME immutable ref -- a
        // disagreement means a mutable ref (a branch name/github.ref rather than github.sha) moved
        // mid-dispatch and different shards silently ran different code, corrupting this as one
        // coherent experiment. 'local'/'unknown' (no git available, e.g. a local dev invocation)
        // are exempted since they carry no real provenance to disagree on.
        const comparableCommit = value => value && value !== 'local' && value !== 'unknown';
        if (comparableCommit(r.summary.commit) && comparableCommit(first.commit) && r.summary.commit !== first.commit) {
            throw new Error(`Mismatched commit (wrong-ref exposure): ${reports[0].path} ran at ${first.commit}, ${r.path} ran at ${r.summary.commit}. A mutable ref moved mid-dispatch; re-run pinned to one immutable SHA.`);
        }
    }
    const executionConfig = collectExecutionConfig(reports);
    const effectiveConfig = collectEffectiveConfig(reports, { allowMixedCorpora });
    const producerMetadata = consistentMetadata(reports, ['producer', 'entrypoint', 'workflowFamily', 'levelBlind', 'historyAware', 'schedulerMode']);

    const scopedIdentity = (corpus, subjectId) => allowMixedCorpora
        ? encodeResearchScopedIdentity(String(corpus), String(subjectId))
        : String(subjectId);
    const seenIds = new Map();
    const seenPositions = new Map();
    const levels = [];
    for (const r of reports) {
        for (const lv of r.levels) {
            const idKey = lv.id != null ? scopedIdentity(r.summary.corpus, lv.id) : null;
            const positionKey = Number.isFinite(lv.level) ? scopedIdentity(r.summary.corpus, lv.level) : null;
            if (idKey && seenIds.has(idKey)) {
                throw new Error(`Duplicate level id ${lv.id} in both ${seenIds.get(idKey)} and ${r.path}; batch ranges or inputs overlap.`);
            }
            if (positionKey && seenPositions.has(positionKey)) {
                throw new Error(`Duplicate level position ${lv.level} in both ${seenPositions.get(positionKey)} and ${r.path}; batch ranges or inputs overlap.`);
            }
            if (idKey) seenIds.set(idKey, r.path);
            if (positionKey) seenPositions.set(positionKey, r.path);
            levels.push(allowMixedCorpora ? { corpus: r.summary.corpus, ...lv } : lv);
        }
    }

    const solved = levels.filter(l => l.ok).length;
    const totalMs = levels.reduce((sum, l) => sum + (l.totalMs ?? l.elapsedMs ?? 0), 0);
    const levelIds = levels.map(l => scopedIdentity(
        allowMixedCorpora ? l.corpus : first.corpus,
        l.id ?? l.levelId ?? l.level,
    ));
    const expectedIds = expectedIdsFile
        ? parseIdentityLines(readFileSync(path.resolve(ROOT, expectedIdsFile), 'utf8'))
        : reports.flatMap(r => (r.summary.expectedIds ?? r.population?.expectedIds ?? [])
            .map(id => scopedIdentity(r.summary.corpus, id)));
    if (expectedIdsFile && allowMixedCorpora) {
        for (const id of expectedIds) {
            let tuple;
            try { tuple = JSON.parse(id); } catch { tuple = null; }
            if (!Array.isArray(tuple) || tuple.length !== 2 || tuple.some(value => typeof value !== 'string' || !value)) {
                throw new Error('--expected-ids with --allow-mixed-corpora requires one json-tuple-v1 [corpus,id] identity per line');
            }
        }
    }
    const intendedPopulationKnown = expectedIds.length > 0;
    const populationIdentities = intendedPopulationKnown ? expectedIds : levelIds;
    const populationDescriptor = hashPopulation({
        kind: intendedPopulationKnown ? 'intended-level-ids' : 'observed-level-ids',
        identityBasis: allowMixedCorpora ? 'corpus-and-level-id' : 'stable-level-id',
        identityCodec: allowMixedCorpora ? 'json-tuple-v1' : null,
        identities: populationIdentities,
        corpusIdentity: allowMixedCorpora ? [...new Set(reports.map(r => r.summary.corpus))].sort() : first.corpus,
    });
    const integrityRows = allowMixedCorpora
        ? levels.map(level => ({ ...level, id: scopedIdentity(level.corpus, level.id ?? level.levelId ?? level.level) }))
        : levels;
    const integrity = intendedPopulationKnown
        ? buildPopulationIntegrity(expectedIds, integrityRows)
        : { ...buildPopulationIntegrity(levelIds, integrityRows), coverageComplete: false,
            decisionValidComplete: false, expectedCount: null, missingIds: [], intendedPopulationKnown: false };
    integrity.populationIdentityHash = populationDescriptor.identityHash;
    if (intendedPopulationKnown) integrity.expectedIds = populationDescriptor.identities;

    // Carry the NODE-budget context through. Every shard report records nodeBudget/
    // repairBudgetFraction/adaptiveBudget, but the combined report -- which is what becomes an
    // official baseline `source` and what every later analysis actually reads -- used to drop all
    // three, keeping only budgetMs. A combined report's per-attempt nodesExpanded was therefore
    // uninterpretable: no way to tell whether an attempt exhausted its allowance or was nowhere near
    // it, and no way to compare two sweeps' costs. Unlike budgetMs this is NOT a hard mismatch
    // error: solver-highbudget-unsolved-sweep.yml deliberately shards with weighted per-shard node
    // budgets, so disagreement is legitimate -- record the distinct values instead of collapsing to
    // the first shard's (which would misreport the other 239).
    const distinct = (field) => [...new Set(reports.map(r => r.summary[field]).filter(v => v !== undefined && v !== null))];
    const nodeBudgets = distinct('nodeBudget');
    // Same treatment for the WORK budget, which is the machine-independent one: two sweeps' costs
    // are only comparable when this matches. Recorded, not enforced, for the same weighted-shard
    // reason as nodeBudget above.
    const workBudgets = distinct('workBudget');
    const repairFractions = distinct('repairBudgetFraction');
    const adaptive = reports.map(r => r.summary.adaptiveBudget).filter(Boolean);

    // Current sweep artifacts use one envelope: { summary, levels, ...scientific attachments }.
    // Historical benchmark-flat reports remain readable only through normalizeSolverSweepReportInput().
    const summary = {
        generatedAt: new Date().toISOString(),
        commit: reports.map(r => r.summary.commit).find(Boolean) ?? 'unknown',
        corpus: allowMixedCorpora ? [...new Set(reports.map(r => r.summary.corpus))] : first.corpus,
        budgetMs: first.budgetMs,
        nodeBudget: nodeBudgets.length === 1 ? nodeBudgets[0] : (nodeBudgets.length === 0 ? null : nodeBudgets),
        workBudget: workBudgets.length === 1 ? workBudgets[0] : (workBudgets.length === 0 ? null : workBudgets),
        ...(repairFractions.length ? { repairBudgetFraction: repairFractions.length === 1 ? repairFractions[0] : repairFractions } : {}),
        ...(adaptive.length ? { adaptiveBudget: adaptive[0], adaptiveBudgetShards: adaptive.length } : {}),
        ...executionConfig,
        ...(effectiveConfig ? {
            effectiveConfig: effectiveConfig.value,
            effectiveConfigDigest: effectiveConfig.digest,
            ...(effectiveConfig.solverRequestProjection ? {
                solverRequestProjection: effectiveConfig.solverRequestProjection,
                solverRequestIdentity: effectiveConfig.solverRequestIdentity,
            } : {}),
        } : {}),
        ...(producerMetadata.entrypoint ? { entrypoint: producerMetadata.entrypoint } : {}),
        ...(producerMetadata.producer ? { producer: producerMetadata.producer } : {}),
        ...(producerMetadata.workflowFamily ? { workflowFamily: producerMetadata.workflowFamily } : {}),
        sourceReports: inputPaths,
        sourceRuns: reports.flatMap(r => r.sourceRuns ?? r.summary.sourceRuns ?? []).filter((value, index, all) => all.indexOf(value) === index),
        solved,
        outcomes: integrity.outcomes,
        observedCount: integrity.observedCount,
        expectedCount: integrity.expectedCount,
        completed: integrity.observedCount,
        total: integrity.expectedCount,
        levelBlind: producerMetadata.levelBlind ?? executionConfig.levelBlind ?? null,
        historyAware: producerMetadata.historyAware ?? null,
        schedulerMode: producerMetadata.schedulerMode ?? first.schedulerMode ?? null,
        configurationHash: effectiveConfig
            ? hashConfiguration(effectiveConfig.value)
            : hashConfiguration({ budgetMs: first.budgetMs, nodeBudget: nodeBudgets, workBudget: workBudgets, repairFractions, executionConfig }),
        totalMs,
    };
    const combined = {
        summary,
        populationIntegrity: integrity,
        population: {
            kind: intendedPopulationKnown ? 'intended-level-ids' : 'observed-level-ids',
            identityBasis: allowMixedCorpora ? 'corpus-and-level-id' : 'stable-level-id',
            ...(allowMixedCorpora ? { identityCodec: 'json-tuple-v1' } : {}),
            identityHash: populationDescriptor.identityHash,
        },
        levels,
    };

    writeFileSync(path.resolve(ROOT, outFile), JSON.stringify(combined, null, 1));
    console.log(`Combined ${reports.length} report(s), ${levels.length} level(s) (${solved} solved) → ${outFile}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    combineSolverSweepReports();
}
