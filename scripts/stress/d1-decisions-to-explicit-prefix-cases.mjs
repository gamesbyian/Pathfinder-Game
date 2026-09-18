#!/usr/bin/env node
/**
 * Convert one or more frozen D1 production-inert decision captures (from
 * capture-d1-production-decisions.mjs) into the generic `cases` document that
 * cpsat-explicit-prefix-reference.yml already knows how to shard across many Actions
 * runners. This does not run any exact query itself.
 *
 * Local per-decision annotation (annotate-d1-production-decisions.mjs) queries a candidate's
 * revisit cells serially with an early break on the first live/referee-valid witness. That is a
 * runtime optimization, not a semantic difference: classifyD1CandidateQueryResults only checks
 * "any live+refereeValid" / "all dead", so querying every cell independently and in parallel
 * (this script's approach, meant for GHA) yields an identical classification once recombined by
 * reconcile-d1-explicit-prefix-cases.mjs -- at the cost of some redundant queries past what a
 * serial early break would have skipped, traded for wall-clock throughput.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/d1-decisions-to-explicit-prefix-cases.mjs -- \
 *     --capture=reports/stress/d1-production-inert-observation/2026-09-18-stage2-pilot-capture/pilot-capture-R02270.json \
 *     --capture=... (repeatable) \
 *     --out=reports/stress/d1-production-inert-observation/2026-09-18-stage2-pilot-cases.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { candidateRevisitCells } from './d1-production-observation-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const captureFiles = argv.filter(a => a.startsWith('--capture=')).map(a => a.slice('--capture='.length));
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const outFile = arg('out', null);
if (!captureFiles.length) throw new Error('at least one --capture=<path> is required');
if (!outFile) throw new Error('--out is required');

installBrowserStubs();
const Solver = createSolver();
const { prepLevel } = SOLVER_TESTING_API;

const unpack = key => [((key & 0xffff) + 1), (((key >>> 16) & 0xffff) + 1)];

const corpusRowsByFile = new Map();
function corpusRows(corpusFile) {
    if (!corpusRowsByFile.has(corpusFile)) {
        const doc = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
        const rows = Array.isArray(doc) ? doc : doc.levels;
        if (!Array.isArray(rows)) throw new Error(`corpus must be an array or {levels:[...]}: ${corpusFile}`);
        corpusRowsByFile.set(corpusFile, new Map(rows.map(row => [String(row.id), row])));
    }
    return corpusRowsByFile.get(corpusFile);
}

const levelCache = new Map();
function getLevel(corpusFile, parentId) {
    const key = `${corpusFile}::${parentId}`;
    if (levelCache.has(key)) return levelCache.get(key);
    const raw = corpusRows(corpusFile).get(String(parentId));
    if (!raw) throw new Error(`parent ${parentId} missing from ${corpusFile}`);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    const pair = { level, prep };
    levelCache.set(key, pair);
    return pair;
}

const cases = [];
let eligibleDecisions = 0;
let eligibleCandidates = 0;
const sourceCaptures = [];

for (const captureFile of captureFiles) {
    const capture = JSON.parse(readFileSync(path.resolve(ROOT, captureFile), 'utf8'));
    sourceCaptures.push({
        path: captureFile,
        corpus: capture.corpus,
        populationIdentity: capture.populationIdentity ?? null,
        researchBlock: capture.researchBlock ?? null,
        evidenceRole: capture.evidenceRole,
    });
    for (const decision of capture.decisions ?? []) {
        const eligibility = decision.context?.d1Eligibility;
        if (!eligibility?.eligible) continue;
        eligibleDecisions++;
        const { level, prep } = getLevel(capture.corpus, decision.parentId);
        const eligibleIds = eligibility.eligibleCandidateIds ?? [];
        eligibleIds.forEach((candidateId, candidateIndex) => {
            eligibleCandidates++;
            const path_ = JSON.parse(candidateId);
            const revisitCells = candidateRevisitCells(path_, level, prep);
            const rawPrefix = path_.map(unpack);
            revisitCells.forEach((cell, cellIndex) => {
                cases.push({
                    id: `${decision.parentId}:${decision.decisionId}:c${candidateIndex}:r${cellIndex}`,
                    levelId: decision.parentId,
                    corpus: capture.corpus,
                    prefix: rawPrefix,
                    pinRevisit: [unpack(cell)],
                    // Reconciliation keys, ignored by cpsat-explicit-prefix-reference.mjs itself.
                    d1: {
                        sourceCapture: captureFile,
                        decisionId: decision.decisionId,
                        candidateId,
                        candidateIndex,
                        cellIndex,
                        revisitCandidateCount: revisitCells.length,
                    },
                });
            });
        });
    }
}

if (!cases.length) throw new Error('no eligible D1 decisions/candidates found across supplied captures');

const document = {
    schemaVersion: 1,
    kind: 'd1-explicit-prefix-cases',
    generatedAt: new Date().toISOString(),
    sourceCaptures,
    summary: { eligibleDecisions, eligibleCandidates, cases: cases.length },
    corpus: sourceCaptures[0]?.corpus ?? null,
    cases,
};

const absolute = path.resolve(ROOT, outFile);
mkdirSync(path.dirname(absolute), { recursive: true });
writeFileSync(absolute, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ out: outFile, ...document.summary }, null, 2));
