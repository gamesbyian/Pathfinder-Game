#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildHistoricalEnrichmentPlan } from './hint-historical-enrichment-plan.mjs';
import { stableStringify } from '../../modules/canonical-json.mjs';
import { createHash } from 'node:crypto';

const pathValue = [1, 2, 3];
const pathHash = createHash('sha256').update(stableStringify(pathValue)).digest('hex');
const event = {
    solver: {
        version: 'a'.repeat(40),
        technique: 'beam',
        gateKey: 7,
        scoringProfileId: 'objectiveFirst',
        orderingBiasId: null,
        beamWidth: 5000,
        mechanicBucketRetention: false,
    },
    search: {
        randomSeed: null,
        seedSalt: null,
        nodesExpanded: 123,
        workSpent: 999,
    },
    occurrences: [],
};
const rescue = {
    kind: 'pathfinder-hint-determinism-collision-authority-rescue',
    runs: [{
        runId: 'run-1',
        runAttempt: '1',
        workflow: 'fixture',
        solverRef: 'a'.repeat(40),
        resultContext: { corpus: 'fixture-corpus.json' },
        affectedSolvedRows: [{
            id: 'L1',
            solutionSha256: pathHash,
            workSpent: 999,
            winningActionKey: 'main-search|beam|score=objectiveFirst|bias=none|width=5000|retention=plain',
            winningAttempts: [{
                stageId: 'main-search',
                gateKey: 7,
                scoringProfileId: 'objectiveFirst',
                orderingBiasId: null,
                beamWidth: 5000,
                mechanicBucketRetention: false,
                nodesExpanded: 123,
                ok: true,
                outcome: 'success',
            }],
        }],
    }],
};
const corpora = new Map([[
    'fixture-corpus.json',
    { levels: [{ id: 'L1', hintRecords: [{ path: pathValue, provenance: [event] }] }] },
]]);
const plan = buildHistoricalEnrichmentPlan(rescue, corpora);
assert.equal(plan.observations, 1);
assert.equal(plan.counts['exact-occurrence-enrichment-candidate'], 1);
assert.deepEqual(plan.rows[0].safeProvedAddition, { runId: 'run-1', runAttempt: '1' });
assert.match(plan.rows[0].deliberatelyUnresolved.solverRequestIdentity, /not reconstructed/);

const already = JSON.parse(JSON.stringify(corpora.get('fixture-corpus.json')));
already.levels[0].hintRecords[0].provenance[0].occurrences = [{ runId: 'run-1', runAttempt: '1' }];
const alreadyPlan = buildHistoricalEnrichmentPlan(rescue, new Map([['fixture-corpus.json', already]]));
assert.equal(alreadyPlan.counts['already-enriched'], 1);

const missing = buildHistoricalEnrichmentPlan(rescue, new Map([['fixture-corpus.json', { levels: [{ id: 'L1', hintRecords: [] }] }]]));
assert.equal(missing.counts['path-not-present-current-store'], 1);

console.log('hint-historical-enrichment-plan-node-test: ok');
