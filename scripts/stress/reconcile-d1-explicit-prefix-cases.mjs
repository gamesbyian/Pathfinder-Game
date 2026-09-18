#!/usr/bin/env node
/**
 * Recombine a completed cpsat-explicit-prefix-reference GHA run's per-cell results back into the
 * same D1 decision-level annotation shape annotate-d1-production-decisions.mjs produces, so
 * downstream tooling (summarizeD1AnnotatedDecisions, research:relations, reports) does not need a
 * second code path for GHA-derived versus locally-derived D1 annotation.
 *
 * Classification is order-independent (classifyD1CandidateQueryResults only checks "any
 * live+refereeValid" / "all dead"), so recombining cells that were queried independently and in
 * parallel yields the same verdict a serial early-break query would have reached.
 *
 * Usage:
 *   node scripts/stress/reconcile-d1-explicit-prefix-cases.mjs \
 *     --cases=<cases.json from d1-decisions-to-explicit-prefix-cases.mjs> \
 *     --result=<combined cpsat-explicit-prefix-reference-<run>.json> \
 *     --capture=<original D1 capture, repeatable, matching --capture inputs used for --cases> \
 *     --out-dir=<directory to write one reconciled annotation file per capture>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { classifyD1CandidateQueryResults, summarizeD1AnnotatedDecisions } from './d1-production-observation-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const captureFiles = argv.filter(a => a.startsWith('--capture=')).map(a => a.slice('--capture='.length));
const casesFile = arg('cases', null);
const resultFile = arg('result', null);
const outDir = arg('out-dir', null);
if (!casesFile) throw new Error('--cases is required');
if (!resultFile) throw new Error('--result is required');
if (!captureFiles.length) throw new Error('at least one --capture=<path> is required');
if (!outDir) throw new Error('--out-dir is required');

const casesDoc = JSON.parse(readFileSync(path.resolve(ROOT, casesFile), 'utf8'));
const resultDoc = JSON.parse(readFileSync(path.resolve(ROOT, resultFile), 'utf8'));
const rowsById = new Map((resultDoc.rows ?? []).map(row => [row.caseId, row]));

const missing = casesDoc.cases.filter(c => !rowsById.has(c.id));
if (missing.length) {
    throw new Error(`${missing.length}/${casesDoc.cases.length} case(s) missing from result (e.g. ${missing[0].id}); result is incomplete`);
}

// Group cases by (sourceCapture, decisionId, candidateIndex) so every one of a candidate's
// revisit-cell queries can be classified together.
const byCandidate = new Map();
for (const c of casesDoc.cases) {
    const key = `${c.d1.sourceCapture}::${c.d1.decisionId}::${c.d1.candidateIndex}`;
    if (!byCandidate.has(key)) byCandidate.set(key, []);
    byCandidate.get(key).push(c);
}

for (const captureFile of captureFiles) {
    const capture = JSON.parse(readFileSync(path.resolve(ROOT, captureFile), 'utf8'));
    const annotated = [];
    for (const decision of capture.decisions ?? []) {
        const eligibility = decision.context?.d1Eligibility;
        if (!eligibility?.eligible) {
            annotated.push(decision);
            continue;
        }
        const eligibleIds = eligibility.eligibleCandidateIds ?? [];
        const candidateResults = eligibleIds.map((candidateId, candidateIndex) => {
            const key = `${captureFile}::${decision.decisionId}::${candidateIndex}`;
            if (!byCandidate.has(key)) {
                throw new Error(`${key}: eligible candidate has no cases in ${casesFile} -- cases document is incomplete for this capture, not just this result`);
            }
            const cellCases = byCandidate.get(key).sort((a, b) => a.d1.cellIndex - b.d1.cellIndex);
            const outcomes = cellCases.map(c => {
                const row = rowsById.get(c.id);
                return {
                    cell: c.pinRevisit[0], pin: c.pinRevisit[0],
                    label: row.referenceLabel, refereeValid: row.refereeValid ?? null,
                    reason: row.referenceReason ?? null,
                };
            });
            const informationCostMs = cellCases.reduce((sum, c) => sum + (Number(rowsById.get(c.id)?.informationCostMs) || 0), 0);
            const classified = classifyD1CandidateQueryResults({
                candidateCount: cellCases.length,
                outcomes: outcomes.map(o => ({ label: o.label, refereeValid: o.refereeValid })),
            });
            const eligRow = eligibility.candidates?.find(row => row.candidateId === candidateId);
            return {
                candidateId, rank: eligRow?.rank ?? null, retained: eligRow?.retained ?? null,
                revisitCandidateCount: cellCases.length, ...classified, informationCostMs, outcomes,
            };
        });
        const support = candidateResults.every(row => row.support === 'SUPPORTED') ? 'SUPPORTED' : 'UNKNOWN';
        annotated.push({
            ...decision,
            observerCost: candidateResults.reduce((sum, row) => sum + row.informationCostMs, 0),
            annotation: {
                support,
                d1: {
                    semantics: 'NONZERO means at least one individually pinned revisit remains exactly feasible; ZERO means every eligible pinned revisit is exactly infeasible; UNKNOWN is neutral',
                    candidateResults,
                },
            },
        });
    }

    const result = {
        schemaVersion: 1,
        kind: 'd1-production-inert-decision-annotation',
        generatedAt: new Date().toISOString(),
        sourceCapture: captureFile,
        sourceResult: resultFile,
        populationIdentity: capture.populationIdentity ?? null,
        researchBlock: capture.researchBlock ?? null,
        evidenceRole: capture.evidenceRole,
        independentUnit: capture.independentUnit,
        annotationBoundary: 'exact D1 queries run only after production decisions and D1 eligibility were frozen; executed independently per revisit-cell via GHA-sharded cpsat-explicit-prefix-reference, then recombined offline',
        decisions: annotated,
        summary: summarizeD1AnnotatedDecisions(annotated),
    };
    const base = path.basename(captureFile).replace(/\.json$/, '');
    const outFile = path.join(outDir, `${base}-annotated.json`);
    mkdirSync(path.resolve(ROOT, outDir), { recursive: true });
    writeFileSync(path.resolve(ROOT, outFile), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ out: outFile, ...result.summary }, null, 2));
}
