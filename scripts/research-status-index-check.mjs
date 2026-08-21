#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildResearchStatusIndex } from './research-status-index-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'research-status-'));
mkdirSync(path.join(root, 'reports')); mkdirSync(path.join(root, 'docs'));
writeFileSync(path.join(root, 'docs/topic.md'), '# Topic\n');
writeFileSync(path.join(root, 'docs/solver-optimization-current-queue.md'), `# Queue
## Ranked queue
| Priority | Opportunity | State | Next decision-bearing step |
|---:|---|---|---|
| 0 | Current question | **ACTIVE** | Run current gate. |
`);
writeFileSync(path.join(root, 'docs/solver-opt-in-experiment-ledger.md'), `# Ledger
## Current production-default-OFF flags
| Flag | Disposition | Decision-bearing evidence / reopen condition |
|---|---|---|
| \`FLAG_ONE\` | **CLOSED NEGATIVE** | Historical test rejected it. |
`);
writeFileSync(path.join(root, 'reports/2026-08-21-example.md'), `# Example investigation

> **Status:** active
> **Last evidence:** 2026-08-21 — Synthetic fixture passed.
> **Decision:** Continue measurement.
> **Remaining gate:** Run the held-out corpus.

Authority: [topic](../docs/topic.md). Artifact: \`logs/example/run.json\`.
`);
writeFileSync(path.join(root, 'reports/2026-01-01-legacy.md'), '# Legacy report without metadata\n');
const index = buildResearchStatusIndex(root);
assert.deepEqual(index, { schemaVersion: 2, scope: 'current-authority-and-structured-evidence',
    authorityOrder: ['current-queue', 'opt-in-ledger', 'structured-report'],
    queue: [{ topicId: 'queue-0', priority: 0, question: 'Current question', status: 'active',
        authority: 'docs/solver-optimization-current-queue.md', authorityKind: 'current-queue',
        state: '**ACTIVE**', remainingGate: 'Run current gate.' }],
    experiments: [{ experimentId: 'FLAG_ONE', status: 'rejected', disposition: '**CLOSED NEGATIVE**',
        latestEvidenceOrGate: 'Historical test rejected it.', authority: 'docs/solver-opt-in-experiment-ledger.md',
        authorityKind: 'opt-in-ledger' }], evidence: [{
    topicId: 'example', status: 'active', title: 'Example investigation', authorities: ['docs/topic.md'],
    latestEvidence: { date: '2026-08-21', summary: 'Synthetic fixture passed.', report: 'reports/2026-08-21-example.md' },
    decision: 'Continue measurement.', remainingGate: 'Run the held-out corpus.', artifacts: ['logs/example/run.json'],
}] });
assert.equal(index.queue[0].authorityKind, 'current-queue',
    'dated evidence cannot override the current queue authority');
console.log('research status index check passed');
