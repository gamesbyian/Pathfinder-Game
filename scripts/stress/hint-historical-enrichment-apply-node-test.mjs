#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyHistoricalEnrichment } from './hint-historical-enrichment-apply.mjs';
import { stableStringify } from '../../modules/canonical-json.mjs';

function fixture() {
    const pathValue = [1, 2, 3];
    const pathHash = createHash('sha256').update(stableStringify(pathValue)).digest('hex');
    const event = {
        solver: {
            version: 'a'.repeat(40), technique: 'beam', gateKey: 7,
            scoringProfileId: 'objectiveFirst', orderingBiasId: null, beamWidth: 5000, mechanicBucketRetention: false,
        },
        search: { randomSeed: null, seedSalt: null, nodesExpanded: 123, workSpent: 999 },
        context: { usedExistingHints: false, hintGuided: false, levelRevision: 'v1', isolatedTechnique: false, techniqueCensusCell: null },
        foundAt: '2026-01-01T00:00:00.000Z',
    };
    const rescue = {
        kind: 'pathfinder-hint-determinism-collision-authority-rescue',
        runs: [{
            runId: 'run-1', runAttempt: '1', workflow: 'fixture', solverRef: 'a'.repeat(40),
            resultContext: { corpus: 'fixture-corpus.json', timestamp: '2026-09-09T07:24:05.656Z' },
            affectedSolvedRows: [{
                id: 'L1', solutionSha256: pathHash, workSpent: 999,
                winningActionKey: 'main-search|beam|score=objectiveFirst|bias=none|width=5000|retention=plain',
                winningAttempts: [{
                    stageId: 'main-search', gateKey: 7, scoringProfileId: 'objectiveFirst', orderingBiasId: null,
                    beamWidth: 5000, mechanicBucketRetention: false, nodesExpanded: 123, ok: true, outcome: 'success',
                }],
            }],
        }],
    };
    const level = { id: 'L1', hintRecords: [{ path: pathValue, provenance: [structuredClone(event)] }] };
    const corpusDocuments = new Map([['fixture-corpus.json', { levels: [level] }]]);
    return { rescue, corpusDocuments, level };
}

// Dry run: reports the candidate but mutates nothing.
{
    const { rescue, corpusDocuments, level } = fixture();
    const { summary } = applyHistoricalEnrichment(rescue, corpusDocuments, { apply: false });
    assert.equal(summary.mode, 'dry-run');
    assert.equal(summary.candidatesFound, 1);
    assert.equal(summary.applied, 0);
    assert.equal(level.hintRecords[0].provenance[0].occurrences, undefined, 'dry run must not mutate the in-memory hint');
}

// Apply: adds exactly one real occurrence with the real historical observedAt, never fabricating
// solver-request/protocol/stage identity.
{
    const { rescue, corpusDocuments, level } = fixture();
    const { summary, changedLevelsByCorpus } = applyHistoricalEnrichment(rescue, corpusDocuments, { apply: true });
    assert.equal(summary.mode, 'applied');
    assert.equal(summary.applied, 1);
    assert.equal(changedLevelsByCorpus.get('fixture-corpus.json').size, 1);
    const entry = level.hintRecords[0].provenance[0];
    assert.equal(entry.occurrences.length, 1);
    assert.equal(entry.occurrences[0].runId, 'run-1');
    assert.equal(entry.occurrences[0].runAttempt, '1');
    assert.equal(entry.occurrences[0].observedAt, '2026-09-09T07:24:05.656Z', 'must use the real historical observation time, not "now"');
    assert.equal(entry.occurrences[0].contractRef, null, 'no experiment contract exists for this rescue run; must not be fabricated');
    // Every other field must be untouched.
    assert.equal(entry.solver.technique, 'beam');
    assert.equal(entry.foundAt, '2026-01-01T00:00:00.000Z');
}

// Idempotency: applying twice must not duplicate the occurrence.
{
    const { rescue, corpusDocuments, level } = fixture();
    applyHistoricalEnrichment(rescue, corpusDocuments, { apply: true });
    const { summary: second } = applyHistoricalEnrichment(rescue, corpusDocuments, { apply: true });
    assert.equal(second.applied, 0);
    assert.equal(second.counts['already-enriched'], 1);
    assert.equal(level.hintRecords[0].provenance[0].occurrences.length, 1, 'reapplying must not duplicate the occurrence');
}

// A rescued observation with no matching path in the current store is reported, never fabricated.
{
    const { rescue } = fixture();
    const emptyCorpora = new Map([['fixture-corpus.json', { levels: [{ id: 'L1', hintRecords: [] }] }]]);
    const { summary } = applyHistoricalEnrichment(rescue, emptyCorpora, { apply: true });
    assert.equal(summary.applied, 0);
    assert.equal(summary.counts['path-not-present-current-store'], 1);
}

console.log('hint-historical-enrichment-apply-node-test: ok');
