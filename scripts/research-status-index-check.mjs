#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildResearchStatusIndex } from './research-status-index-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'research-status-'));
mkdirSync(path.join(root, 'reports')); mkdirSync(path.join(root, 'docs'));
writeFileSync(path.join(root, 'docs/topic.md'), '# Topic\n');
writeFileSync(path.join(root, 'reports/2026-08-21-example.md'), `# Example investigation

> **Status:** active
> **Last evidence:** 2026-08-21 — Synthetic fixture passed.
> **Decision:** Continue measurement.
> **Remaining gate:** Run the held-out corpus.

Authority: [topic](../docs/topic.md). Artifact: \`logs/example/run.json\`.
`);
writeFileSync(path.join(root, 'reports/2026-01-01-legacy.md'), '# Legacy report without metadata\n');
assert.deepEqual(buildResearchStatusIndex(root), { schemaVersion: 1, scope: 'structured-investigation-reports', topics: [{
    topicId: 'example', status: 'active', title: 'Example investigation', authorities: ['docs/topic.md'],
    latestEvidence: { date: '2026-08-21', summary: 'Synthetic fixture passed.', report: 'reports/2026-08-21-example.md' },
    decision: 'Continue measurement.', remainingGate: 'Run the held-out corpus.', artifacts: ['logs/example/run.json'],
}] });
console.log('research status index check passed');
