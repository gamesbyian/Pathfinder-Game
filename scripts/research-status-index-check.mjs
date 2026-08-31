#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, queryResearchStatusIndex } from './research-status-index-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'research-status-'));
mkdirSync(path.join(root, 'reports')); mkdirSync(path.join(root, 'docs'));
writeFileSync(path.join(root, 'docs/topic.md'), '# Topic\n');
writeFileSync(path.join(root, 'docs/solver-optimization-workstreams.md'), `# Solver optimization workstreams
## Active workstreams
| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Current question | **ACTIVE** | Run current gate. |
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
writeFileSync(path.join(root, 'reports/2026-01-01-legacy.md'), `# Legacy report without metadata

## Orientation anomaly
Details live here.

## Repair-probe / early-main-loop node starvation
Historical mechanism evidence used the pre-rename stage vocabulary.
`);
const index = buildResearchStatusIndex(root);
assert.equal(index.queue[0].authorityKind, 'workstreams', 'dated evidence cannot override the current workstreams authority');
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'experiment' }).map(x => x.id), ['FLAG_ONE']);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'held-out' }).map(x => x.id), ['example']);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'orientation anomaly' }).map(x => x.id), ['legacy']);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'early-repair-search' }).map(x => x.id), ['legacy'],
    'canonical stage query must discover reports written only with the historical repair-probe name');
assert.deepEqual(queryResearchStatusIndex(index, { query: 'main-search' }).map(x => x.id), ['legacy'],
    'canonical main-search query must discover reports written only with the historical main-loop name');
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'legacy-evidence' }).map(x => x.report), ['reports/2026-01-01-legacy.md']);
assert.deepEqual(queryResearchStatusIndex(index, { status: 'rejected' }).map(x => x.id), ['FLAG_ONE']);
const compact = compactResearchStatusIndex(index, { query: 'current question' });
assert.equal(compact.count, 1);
assert.equal(compact.entries[0].kind, 'queue');
assert.equal(compact.entries[0].authority, 'docs/solver-optimization-workstreams.md');
assert.equal(compact.entries[0].workstreamId, 2, 'workstream ID is identity, not a priority rank');
await import('./corpus-query-node-test.mjs');
console.log('research status index check passed');
