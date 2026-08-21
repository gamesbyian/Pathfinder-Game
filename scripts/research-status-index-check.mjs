#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, queryResearchStatusIndex } from './research-status-index-lib.mjs';

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
assert.equal(index.queue[0].authorityKind, 'current-queue', 'dated evidence cannot override the current queue authority');
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'experiment' }).map(x => x.id), ['FLAG_ONE']);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'held-out' }).map(x => x.id), ['example']);
assert.deepEqual(queryResearchStatusIndex(index, { status: 'rejected' }).map(x => x.id), ['FLAG_ONE']);
const compact = compactResearchStatusIndex(index, { query: 'current question' });
assert.equal(compact.count, 1);
assert.equal(compact.entries[0].kind, 'queue');
assert.equal(compact.entries[0].authority, 'docs/solver-optimization-current-queue.md');
await import('./corpus-query-node-test.mjs');
console.log('research status index check passed');
