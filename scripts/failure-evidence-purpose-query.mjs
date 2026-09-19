#!/usr/bin/env node
/**
 * Query compact failure-response records by explicit evidence purpose.
 *
 * This is intentionally a thin epistemic layer over the existing compact schema/query tooling.
 * It does not replace failure-response-query.mjs and does not assign causal failure classes.
 *
 * Usage:
 *   node scripts/failure-evidence-purpose-query.mjs --in=a.json[,b.json] --purpose=forensic
 *     [--applicability=admissible|context-bound|inadmissible]
 *     [--comparable-protocol=HASH[,HASH...]]
 *     [--comparable-solver-ref=REF[,REF...]]
 *     [--population-sampling-declared=true|false]
 */
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';
import {
    FAILURE_EVIDENCE_APPLICABILITY,
    FAILURE_EVIDENCE_PURPOSES,
    classifyFailureEvidenceApplicability,
    failureEvidenceDependencyStratum,
} from './failure-evidence-semantics-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));

const inputFiles = (args.get('in') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const purpose = args.get('purpose');
const applicabilityFilter = args.get('applicability') ?? null;
if (!inputFiles.length || !purpose) {
    console.error('Usage: node scripts/failure-evidence-purpose-query.mjs --in=a.json[,b.json] --purpose=<purpose> [filters]');
    process.exit(2);
}
if (!FAILURE_EVIDENCE_PURPOSES.includes(purpose)) {
    throw new Error(`--purpose must be one of: ${FAILURE_EVIDENCE_PURPOSES.join(', ')}`);
}
if (applicabilityFilter && !FAILURE_EVIDENCE_APPLICABILITY.includes(applicabilityFilter)) {
    throw new Error(`--applicability must be one of: ${FAILURE_EVIDENCE_APPLICABILITY.join(', ')}`);
}
const missing = inputFiles.filter(file => !existsSync(file));
if (missing.length) throw new Error(`missing compact failure-response input(s): ${missing.join(', ')}`);

function listArg(name) {
    return (args.get(name) ?? '').split(',').map(value => value.trim()).filter(Boolean);
}
function boolArg(name) {
    if (!args.has(name)) return false;
    const value = args.get(name);
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`--${name} must be true or false`);
}

const options = {
    comparableProtocolHashes: listArg('comparable-protocol'),
    comparableSolverRefs: listArg('comparable-solver-ref'),
    populationSamplingDeclared: boolArg('population-sampling-declared'),
};

const rows = [];
const counts = Object.fromEntries(FAILURE_EVIDENCE_APPLICABILITY.map(value => [value, 0]));
const reasons = new Map();
const admissibleStrata = new Set();

for (const file of inputFiles) {
    const document = validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8')));
    for (const row of document.records) {
        const classification = classifyFailureEvidenceApplicability(document, row, purpose, options);
        counts[classification.applicability] += 1;
        reasons.set(classification.reason, (reasons.get(classification.reason) ?? 0) + 1);
        const dependencyStratum = failureEvidenceDependencyStratum(document, row);
        if (classification.applicability === 'admissible') admissibleStrata.add(dependencyStratum);
        if (applicabilityFilter && classification.applicability !== applicabilityFilter) continue;
        rows.push({
            sourceFile: file,
            identity: row.identity,
            parentId: row.parentId,
            outcome: row.outcome,
            runId: row.runId,
            protocolHash: row.protocolHash ?? document.protocolHash ?? null,
            solverRef: row.solverRef ?? document.solverRef ?? null,
            actionKey: row.actionKey,
            stageId: row.stageId,
            applicability: classification.applicability,
            reason: classification.reason,
            dependencyStratum,
        });
    }
}

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-failure-evidence-purpose-query',
    purpose,
    options,
    inputFiles,
    summary: {
        recordsObserved: Object.values(counts).reduce((sum, value) => sum + value, 0),
        recordsReturned: rows.length,
        applicabilityCounts: counts,
        independentAdmissibleSupportStrata: admissibleStrata.size,
        reasons: Object.fromEntries([...reasons.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        note: 'Applicability is query-dependent. Parent-level dependency strata prevent repeated records/runs from becoming extra independent support.',
    },
    rows,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
